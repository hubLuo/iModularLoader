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
        use:function(ids, callback){
            Module.preload(function(){
                Module.use(ids, callback, seajs.getMainModuleId() );   //虚拟的根目录
            });
        },
        define:function(factory){
            Module.define(factory);
        }
    };
    //模块缓存
    var cacheMods = {},moduleFactory;
    //定义模块的生命周期
    var status = {
        FETCHED: 1,   //获取模块的uri
        SAVED: 2,    // 元数据存储在缓存中
        LOADING: 3,   //加载模块的依赖项
        LOADED: 4,   //准备执行依赖项模块
        EXECUTING: 5,  //正在执行  加载模块
        EXECUTED: 6,    // 返回接口对象
    };
    //类型判断
    var isArray = function(obj){
        return toString.call(obj) === "[object Array]";
    }
    var isFunction = function(obj){
        return toString.call(obj) === "[object Function]";
    }

    //模块构造函数
    var Module=function(uri, deps){
        this.uri = uri;
        this.deps = deps||[];
        this.exports = null;   //接口对象
        this.status = 0;
        this._waitings = {};  //我有几个依赖项
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
            var mod = Module.get(uri, isArray(deps) ? deps: [deps] );
            //2.定义依赖项模块都加载完毕时所要执行的回调
            mod.callback = function(){
                var exports = [];   //所以依赖项模块的接口对象
                var uris = mod.resolve(); //获取依赖模块的绝对路径
                for(var i=0; i<uris.length; i++ ){
                    exports[i] = cacheMods[uris[i]].exec(); //接口对象
                }
                if(callback){
                    callback.apply(root, exports);
                }
            }
            //3.开启运行模块的生命周期
            mod.load();
        }
        //定义模块接口：当前加载文件完成后定义为模块。
        Module.define = function(factory){
            //Module.prototype.factory = factory;//引用地址存储回调地址
            //值存储回调地址
            moduleFactory=factory;
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
            var len = uris.length;
            var m;
            for(var i=0; i<len; i++ ){
                m = Module.get(uris[i]); //主模块下的子模块存储在缓存中
                if(m.status < status.LOADING ){
                    m._waitings[uris[i]] = m._waitings[uris[i]] || 0;
                }
            }
            //准备执行依赖项模块
            mod.onload();
        }

        //生命周期loaded：执行子模块define，获取子模块向外提供接口的回调；
        Module.prototype.onload = function(){
            var mod = this;
            var uris = mod.resolve(); //获取主模块下依赖模块的绝对路径获
            var len = uris.length,loadedCount=0;
            mod.status = status.LOADED;
            for(var i=0; i<len; i++ ){
                (function(j){
                    var node = document.createElement("script");
                    node.src = uris[j];
                    document.body.appendChild(node);
                    node.onload = function(){
                        //生命周期loaded：执行子模块define，获取子模块向外提供接口的回调；
                        loadedCount++;
                        //记录每个子模块回调factory
                        cacheMods[uris[j]].factory=moduleFactory;
                        if(mod.callback&&loadedCount==len){
                            mod.callback();
                        }
                    }
                })(i);
            };
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


    //3.执行使用模块回调
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
            var exports = isFunction(factory) ? factory(require, mod.exports = {}, mod) : factory;

            if(exports === undefined){
                //当回调不返回值时
                exports = mod.exports;
            }
            mod.exports = exports;
            mod.status = status.EXECUTED;  //6
            return exports;
        }
    }(Module);

    return seajs;
});