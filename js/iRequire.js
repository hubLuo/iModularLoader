/*
 *作者：luo
 *时间：2018/12/7 0007
 *Email：hubluo@gmail.com
 *功能：
 */
(function( root ){
    var modMap = {};   //缓存  模块的名称   依赖   接口对象
    //初始化
    var requireUse = function( deps, callback ){
        if( deps.length === 0 ){callback();}
        var depsLen = deps.length;
        var params = [];
        for(var i=0; i<depsLen; i++ ){
            (function(j){
                loadMod(deps[j],function(options){
                    depsLen--;
                    params[j] = options;   //接口对象
                    if(depsLen === 0 ){
                        callback.apply(null,params);
                    }
                });
            })(i);
        }
    }
    var loadMod = function( name, callback ){
        if( !modMap[name] ){  //如果在缓存中没有当前这个模块
            modMap[name] = {
                status: "loading"
            }
            //加载模块
            loadScript(name, function(){
                requireUse(modMap[name].deps, function(){
                    //获取接口对象
                    execMod(name, callback);
                });
            });
        }
    }
    //注入script
    var loadScript = function( name, callback ){
        var doc = document;
        var node = doc.createElement("script");
        node.src = name+".js";   //路径处理
        doc.body.appendChild(node);
        node.onload = function(){
            callback();
        }
    }
    var execMod = function(name, callback ){
        var options =  modMap[name].callback();
        modMap[name].exports = options;
        callback(options);
    }
    //定义模块
    var define = function(name, deps, callback ){
        modMap[name] = modMap[name] ||{};   //{a:{deps:[],...}}
        modMap[name].deps = deps;
        modMap[name].status = "loaded";
        modMap[name].callback = callback;   //{a:{deps:[],callback:callback}}
        //modMap[name].callback()   接口对象

    }

    root.requireUse = requireUse;
    root.define = define;


})( this );