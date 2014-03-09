/*
ngram, not a ngram distribution but a dynamic one

*/

objectron.ngram = (function () {
  var exports = {};
  /////////////////

  

  var createNgram = function (n) {
     
    var that = {};

    var root = objectron.ngramnode.create();
    
    var history = [];

    that.push = function (hash) {
      history.push(hash);
      if (history.length > n) {
        history.shift();
      }

      if (history.length === n) {
        root.add(history);
      }
    };

    that.top = function (m) {
      if (history.length === n && n > 0) {
        return root.top(history.slice(1), m);
      } // else
      return [];
    };

    that.prob = function (hashSequence) {
      return root.prob(hashSequence);
    };
    
    return that;
  };
  


  exports.create = function (n) {
    return createNgram(n);
  };



  ///////////////
  return exports;

}());
