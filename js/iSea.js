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
    var cacheMods = {};
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
    //定义接口
    ~function(Module){
        //预加载接口
        Module.preload = function(callback){
            var len = seajs.preload.length;
            if(!len){callback()}
            //先加载预先设定模块
        };
        //使用模块接口
        Module.use = function( deps, callback, uri ){
            var mod = Module.get(uri, isArray(deps) ? deps: [deps] );
            console.log(mod);
        }
        //定义模块接口：当前加载文件完成后定义为模块。
        Module.define = function(factory){
            Module.prototype.factory = factory;
        }

    }(Module);

    //注册或读取模块
    ~function(Module){
        //模块：主模块和子（依赖）模块
        Module.get = function(uri, deps ){
            //{"file:///C:/Users/Max/Desktop/seajs/_use_0":Module实例对象}
            return cacheMods[uri] ||(cacheMods[uri] = new Module(uri, deps));
        }
    }(Module);


    return seajs;
});