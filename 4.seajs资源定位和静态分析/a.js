/*
* @Author: Max
* @Date:   2018-12-03 22:15:23
* @Last Modified by:   Max
* @Last Modified time: 2018-12-11 22:32:10
*/
//推崇  require   引入模块  exports  接口对象   module  模块本身
define(function(require, exports, module) {
  //静态的模块地址检测  引包  c
  var c = require("app/c");    //静态分析  依赖 加载  deps[]  依赖项
  console.log(c.age);   //{age : 30} 
  exports.Hello = function() {   //接口对象
    console.log("hello work")
  };

});       