  
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
