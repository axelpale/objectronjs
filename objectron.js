/*! objectron - v0.0.1 - 2014-03-06
 * https://github.com/axelpale/objectronjs
 *
 * Copyright (c) 2014 Akseli Palen <akseli.palen@gmail.com>;
 * Licensed under the MIT license */

(function (window, undefined) {
  'use strict';
  
  
  
  
  
  
  
  // ten lines to ease counting and finding the lines in test output.


/*
Objectron

*/

var objectron = (function () {
  var exports = {};
  /////////////////
  


  var Tron;

  // Max integer of JavaScript is 2^53. In the worst case
  // we need to sum two integers. Max size limit
  // comes then to 2^52. Add some margin: 2^50;
  var maxSizeLimit = Math.pow(2,50);


  
  // Constructor
  
  Tron = function () {
    // Create new objectron.
    // 
    
  };
  
  exports.create = function () {
    return new Tron();
  };
  
  

  // Accessors

  Tron.prototype.dump = function () {
    // Return
    //   State of objectron in single array to be for example stored
    //   to database.
    // 
    // See also load()
    return {};
  };


  
  // Mutators

  Tron.prototype.load = function (dumpedData) {
    // See save()
  };
  


  // Extendability

  // Usage: objectron.extension.myFunction = function (...) {...};
  exports.extension = Tron.prototype;
  

  
  ///////////////
  return exports;
}());


  // Version
  objectron.version = '0.0.1';


  
  // Modules
  if(typeof module === 'object' && typeof module.exports === 'object') {
    // Common JS
    // http://wiki.commonjs.org/wiki/Modules/1.1
    module.exports = objectron;
  } else {
    // Browsers
    window.objectron = objectron;
  }
})(this);
