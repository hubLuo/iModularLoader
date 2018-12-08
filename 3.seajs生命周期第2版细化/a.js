/*
* @Author: Max
* @Date:   2018-12-03 22:15:23
* @Last Modified by:   Max
* @Last Modified time: 2018-12-06 22:24:25
*/
//推崇  require   引入模块  exports  接口对象   module  模块本身
define(function(require, exports, module) {
  //静态的模块地址检测  引包  c
  var b = require("./b");
  console.log(b.name)
  exports.Hello = function() {   //接口对象
    console.log("hello work")
  };

  //return {}
});        //   a的依赖项c