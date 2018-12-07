/*
* @Author: Max
* @Date:   2018-12-03 22:15:23
* @Last Modified by:   Max
* @Last Modified time: 2018-12-04 22:36:23
*/
//推崇  require   引入模块  exports  接口对象   module  模块本身
define(function(require, exports, module) {
	//require   静态的模块地址检测
  exports.Hello = function() {   //接口对象
    console.log("hello work")
  };

  //return {}
});    //toString()   "./b.js"   依赖  引包 依赖