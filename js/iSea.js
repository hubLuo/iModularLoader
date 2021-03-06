/*
 *作者：luo
 *时间：2018/12/7 0007
 *Email：hubluo@gmail.com
 *功能：
 */
~function(root,factory){
    var seajs=factory(root)
    root.seajs=seajs;
    root.define=seajs.define;
}(this,function(root){
    //主模块管理接口
    var seajs={
        version:"1.0.0",
        preload:[],
        _cid:0,
        cid:function(){
            return this._cid++;
        },
        cwd:document.URL.match(/[^?]*\//)[0],
        getMainModuleId:function(){
            return this.cwd+"_use_"+this.cid();
        },
        //类型判断
        isArray:function(obj){
            return toString.call(obj) === "[object Array]";
        },
        isFunction:function(obj){
            return toString.call(obj) === "[object Function]";
        },
        isString:function(obj){
            return toString.call(obj) === "[object String]";
        },
        //接口
        use:function(ids, callback){
            Module.preload(function(){
                Module.use(ids, callback, seajs.getMainModuleId() );   //虚拟的根目录
            });
        },
        define:function(factory){
            Module.define(factory);
        },
        //异步脚本加载
        request:function( url, callback ){
            var node = document.createElement("script");
            node.src = url;
            document.body.appendChild(node);
            node.onload = function(){
                node.onload = null;
                document.body.removeChild(node);   //定义a模块  callback怎么获取
                callback();
            }
        },
        //用于资源定位的短名称配置
        history:{},
        config:function(options){
            var curr;
            for( var key in options ){
                curr =  options[key];
                //记录配置
                seajs.history[key] = seajs.history[key] || [];
                seajs.history[key].push(curr);

                seajs[key] = curr;   //seajs.alias  seajs.paths
            }
        },
        //解析路径（定义时候的名称，uri 根目录）获取对应模块的绝对路径地址
        resolve: function( id, uri ){
            if(!id)return "";
            //是否是个别名
            id = resolve.parseAlias(id);    //检测是否有别名
            id = resolve.parsePaths(id);    // 检测是否有路径别名 依赖模块中引包的模块路径地址 require("app/c");
            id = resolve.normalize(id);     //检测是否添加后缀
            return resolve.addBase(id, uri);   //添加根目录
        }
    };
    //模块缓存
    var cacheMods = {},moduleFactory;
    //定义模块的生命周期
    var status = {
        FETCHED: 1,   //获取依赖模块
        SAVED: 2,    // 元数据存储在缓存中
        LOADING: 3,   //加载模块的依赖项
        LOADED: 4,   //执行主模块回调从而触发执行依赖项模块回调
        EXECUTING: 5,  //正在执行  加载模块
        EXECUTED: 6,    // 返回接口对象
    };

    //模块构造函数
    var Module=function(uri, deps){
        this.uri = uri;
        this.deps = deps||[];
        this.exports = null;   //接口对象
        this.status = 0;
        this._waitings = {};  //记录当前模块所对应主模块，该主模块等待执行回调。
        this._remain = 0;   // 当前（主）模块所依赖的但未完成加载的子模块数量。
    };
    //1.定义接口：定义模块，注入使用模块回调
    ~function(Module){
        //预加载接口
        Module.preload = function(callback){
            var len = seajs.preload.length;
            if(!len){callback()}
            //先加载预先设定模块
        };
        //使用模块接口
        Module.use = function( deps, callback, uri ){
            //1.注册/读取主模块
            var mod = Module.get(uri, seajs.isArray(deps) ? deps: [deps] );
            //2.定义依赖项模块都加载完毕时所要执行的回调
            mod.callback = function(){
                mod.status = status.EXECUTING;  //5
                var exports = [];   //所以依赖项模块的接口对象
                var uris = mod.resolve(); //获取依赖模块的绝对路径
                for(var i=0; i<uris.length; i++ ){
                    exports[i] = cacheMods[uris[i]].exec(); //接口对象
                }
                if(callback){
                    callback.apply(root, exports);
                    mod.status = status.EXECUTED;  //5
                }
            }
            //3.开启运行模块的生命周期
            mod.load();
        }
        //定义模块接口：当前加载文件完成后定义为模块。
        Module.define = function(factory){
            //Module.prototype.factory = factory;//引用地址存储回调地址
            //值存储回调地址
            //moduleFactory=factory;
            var deps;
            if(seajs.isFunction(factory)){
                //调用toString方法，正则解析依赖项
                //deps = [];   //["./c,"./d"]
                deps =parseDependencies(factory.toString());   //静态分析
            }
            //存储当前模块的信息
            var meta = {
                id:"",
                uri:"",
                deps:deps,
                factory:factory
            }
            moduleFactory = meta;
        }

        //注册或读取模块：主模块和子（依赖）模块
        Module.get = function(uri, deps ){
            //{"file:///C:/Users/Max/Desktop/seajs/_use_0":Module实例对象}
            return cacheMods[uri] ||(cacheMods[uri] = new Module(uri, deps));
        }
    }(Module);

    //2.进入生命周期
    ~function(Module){
        //生命周期-loading：遍历主模块依赖的子模块，并准备加载。
        Module.prototype.load = function(){
            var mod = this;   // 携带了主模块中deps 依赖
            mod.status = status.LOADING;
            var uris = mod.resolve(); //获取依赖模块的绝对路径
            var len =mod._remain= uris.length,requestCache = {};
            for(var i=0; i<len; i++ ){
                var m = Module.get(uris[i]); //在缓存中注册/读取主模块依赖的子模块
                if(m.status < status.FETCHED){
                    m.fetch(requestCache);
                }
                if(m.status < status.LOADED ){
                    //记录当前模块所对应主模块，该主模块等待执行回调。
                    m._waitings[mod.uri] = m._waitings[mod.uri] || 1;
                }else{
                    mod._remain--;
                }
            }
            if(mod._remain == 0){
                //所有依赖加载完成后，执行onload
                mod.onload();
            }else{
                //执行加载依赖项
                for( var uri in requestCache){
                    requestCache[uri]();
                }
            };
        }
        //生命周期fetched：加载依赖模块
        Module.prototype.fetch = function(requestCache){
            var mod = this;  //a b
            mod.status = status.FETCHED;
            var uri = mod.uri;
            requestCache[uri] = sendRequest;   //发送请求  注入script

            function sendRequest(){
                seajs.request(uri, onRequest);
            }

            function onRequest(){    //当前模块的  deps 依赖项
                if(moduleFactory){
                    mod.save(uri,  moduleFactory);   //更改数据
                }
                mod.load();    //递归   根目录下的依赖项(a b)   (a b)是否还有依赖项  deps
            }
        };
        //生命周期saved：修改模块信息
        Module.prototype.save = function(uri, meta ){
            var mod =  Module.get(uri);
            mod.id = uri;
            mod.deps = meta.deps || [];
            mod.factory = meta.factory;
            mod.status = status.SAVED;
        };
        //生命周期loaded：执行主模块回调
        Module.prototype.onload = function(){
            var mod = this;
            var uris = mod.resolve(); //获取依赖模块的绝对路径
            var len = uris.length;
            mod.status = status.LOADED;
            if(mod.callback){
                //子模块中没有callback回调，它只存在于主模块中
                mod.callback();
            }

            //伪递归
            _waitings = mod._waitings;
            var uri, m ;
            for( uri in _waitings){
                //获得该子模块对应的主模块
                m = cacheMods[uri];
                //主模块待加载依赖数减一
                m._remain -= _waitings[uri];
                //加载完毕，执行主模块回调mod.callback()
                if(m._remain == 0){ m.onload()};   //依赖项模块数据已经更新完毕 deps   factory
            }

        };

        //获取主模块下依赖模块的绝对路径
        Module.prototype.resolve = function(refresh){
            var mod = this,ids = mod.deps,refresh=refresh||false;
            var depUris=mod.depUris;  //依赖模块的绝对路径 (地址)
            if(depUris&&depUris.length>0&&!refresh){
                return depUris;
            }else if(!depUris){
                depUris=mod.depUris=[];
            }
            for(var i = 0; i<ids.length; i++){
                depUris[i] = Module.resolve( ids[i], mod.uri );    //生成地址
            }
            //console.log(uris)
            return depUris;
        }

        Module.resolve = function( id, refUri ){
            var emitDate = {id:id, refUri:refUri};
            //emitDate.uri  模块的地址(绝对路径)
            return  seajs.resolve(emitDate.id, refUri );
        }
    }(Module);


    //3.生命周期：执行使用模块回调
    ~function(Module){
        Module.prototype.exec = function(){
            var mod = this;
            //防止重复执行
            if( mod.status >= status.EXECUTING ){
                return mod.exports;
            }
            mod.status = status.EXECUTING;  //5
            var uri = mod.uri;
            function require(id){
                // 寻址
                return Module.get(require.resolve(id)).exec();   //获取接口对象
            }

            require.resolve = function(id){
                return  Module.resolve(id,uri);
            }

            var factory = mod.factory;
            var exports = seajs.isFunction(factory) ? factory(require, mod.exports = {}, mod) : factory;

            if(exports === undefined){
                //当回调不返回值时
                exports = mod.exports;
            }
            mod.exports = exports;
            mod.status = status.EXECUTED;  //6
            return exports;
        }
    }(Module);

    //seajs依赖加载静态分析方法；
    var parseDependencies=function(){
        var REQUIRE_RE = /"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|\/\*[\S\s]*?\*\/|\/(?:\\\/|[^\/\r\n])+\/(?=[^\/])|\/\/.*|\.\s*require|(?:^|[^$])\brequire\s*\(\s*(["'])(.+?)\1\s*\)/g
        var SLASH_RE = /\\\\/g

        function parseDependencies(code) {
            var ret = []

            code.replace(SLASH_RE, "")
                .replace(REQUIRE_RE, function(m, m1, m2) {
                    if (m2) {
                        ret.push(m2)
                    }
                })

            return ret
        }
        return parseDependencies;
    }();

    //资源定位：路径/模块短名称配置
    var resolve=function(){
        //是否使用了别名
        function parseAlias(id){  //a  b
            var alias = seajs.alias;  //配置
            return alias && seajs.isString(alias[id]) ? alias[id] : id;
        }

        //不能以"/" ":"开头  结尾必须是一个"/" 后面跟随任意字符至少一个
        var PATHS_RE = /^([^\/:]+)(\/.+)$/;   //([^\/:]+)   路径的短名称配置
        // 是否有路径短名称
        function parsePaths( id ){   //
            var paths = seajs.paths,m;  //配置
            if(paths && (m = id.match(PATHS_RE)) && seajs.isString(paths[m[1]])){
                id = paths[m[1]] + m[2]
            }
            return id;
        }

        function normalize(path){
            var last = path.length-1;
            var lastC = path.charAt(last);
            //".js" 6-4
            return (lastC === "/" || path.substring(last-2) === ".js") ? path : path+".js";

        }

        function addBase( id, uri ){
            //? ./  ../    app/c   match(/[^?]*\//)[0];
            var result;
            if(id.charAt(0) === "."){
                result = realpath((uri ? uri.match(/[^?]*\//)[0] : seajs.cwd)+id);
            }else{
                result = seajs.cwd+id;
            }
            return result;
        }

        var DOT_RE = /\/.\//g;   // "/./" => "/"
        var DOUBLE_DOT_RE = /\/[^/]+\/\.\.\//;
        var DOUBLE_SLASH_RE = /([^:/])\/\//g;
        //规范路径
        function realpath(path){

            // /a/b/./c/./d ==> /a/b/c/d
            path = path.replace(DOT_RE, "/")

            // a/b/c/../../d  ==>  a/b/../d  ==>  a/d
            while (path.match(DOUBLE_DOT_RE)) {
                path = path.replace(DOUBLE_DOT_RE, "/")
            }

            // a//b/c  ==>  a/b/c
            path = path.replace(DOUBLE_SLASH_RE, "$1/")

            return path;
        }

        return {
            parseAlias:parseAlias,    //检测是否有别名
            parsePaths:parsePaths,    // 检测是否有路径别名 依赖模块中引包的模块路径地址 require("app/c");
            normalize:normalize,     //检测是否添加后缀
            addBase:addBase
        }
    }();

    return seajs;
});