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
