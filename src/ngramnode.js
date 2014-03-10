/*
ngram node

TODO: hashSequence -> sequence
TODO: hash -> key
*/

objectron.ngramnode = (function () {
  var exports = {};
  /////////////////

  

  var createNgramnode = function () {
     
    var that = {};

    var histogram = objectron.unigram.create();
    var children = {};

    that.prob = function (hashSequence) {
      
      if (typeof hashSequence === 'string') {
        hashSequence = [hashSequence];
      }

      if (!isArray(hashSequence)) {
        throw 'error'; // TODO better error
      } // else

      if (hashSequence.length <= 0) {
        return 1; // ends recursion
      } // else
      
      var first = hashSequence[0];
      var rest = hashSequence.slice(1);

      if (!children.hasOwnProperty(first)) {
        // No such branch
        return 0;
      } // else
      return histogram.prob(first) * children[first].prob(rest);
    };

    that.given = function (hashSequence) {
      // ngramnode after hashSequence
      // TODO: change from mutator to accessor

      if (typeof hashSequence === 'string') {
        hashSequence = [hashSequence];
      }

      if (!isArray(hashSequence)) {
        throw 'error'; // TODO better error
      } // else

      if (hashSequence.length <= 0) {
        return this; // end recursion
      } // else
      var first = hashSequence[0];
      var rest = hashSequence.slice(1);

      if (!children.hasOwnProperty(first)) {
        // No such branch
        children[first] = createNgramnode();
      } // else

      return children[first].given(rest);
    };

    that.topTolerated = function (hashSequence, tolerance) {
      // A set of most probable successors for the given sequence,
      // ordered by probability, most probable first.
      // The set contains those hashes with probability at least
      // the greatest probability * (1 - tolerance).
      if (typeof hashSequence === 'string') {
        hashSequence = [hashSequence];
      }

      if (typeof hashSequence === 'undefined') {
        hashSequence = [];
      }

      if (!isArray(hashSequence)) {
        throw 'error'; // TODO better error
      } // else

      if (hashSequence.length <= 0) {
        return histogram.topTolerated(tolerance);
      } // else continue recursion

      var first = hashSequence[0];
      var rest = hashSequence.slice(1);

      if (!children.hasOwnProperty(first)) {
        // No such branch, therefore histogram is empty.
        return [];
      } // else
      return children[first].topTolerated(rest, tolerance);
    };

    that.top = function (hashSequence, n) {
      // n most probable successors for the sequence,
      // ordered by probability, most probable first.
      // 
      // Parameters
      //   hashSequence (optional, default [])
      //     array
      //   n (optional, default 0)
      //     integer
      
      if (typeof n !== 'number') {
        n = 0;
      }

      if (typeof hashSequence === 'string') {
        hashSequence = [hashSequence];
      }

      if (typeof hashSequence === 'undefined') {
        hashSequence = [];
      }

      if (!isArray(hashSequence)) {
        throw 'error'; // TODO better error
      } // else

      if (hashSequence.length <= 0) {
        return histogram.top(n);
      } // else

      var first = hashSequence[0];
      var rest = hashSequence.slice(1);

      if (!children.hasOwnProperty(first)) {
        // No such branch, therefore histogram is empty.
        return [];
      } // else
      return children[first].top(rest, n);
    };

    that.add = function (hashSequence) {
      if (typeof hashSequence === 'string') {
        hashSequence = [hashSequence];
      }

      if (!isArray(hashSequence)) {
        throw 'error'; // TODO better error
      } // else

      if (hashSequence.length <= 0) {
        return;
      } // else
      var first = hashSequence[0];
      var rest = hashSequence.slice(1);

      histogram.add(first);

      if (!children.hasOwnProperty(first)) {
        children[first] = createNgramnode();
      }
      children[first].add(rest);
    };

    that.subtract = function (hashSequence) {
      // Parameter
      //   hashSequence
      //     
      if (typeof hashSequence === 'string') {
        hashSequence = [hashSequence];
      }

      if (!isArray(hashSequence)) {
        throw 'error'; // TODO better error
      } // else

      if (hashSequence.length <= 0) {
        return;
      } // else
      var first = hashSequence[0];
      var rest = hashSequence.slice(1);

      histogram.subtract(first);

      // not needed because child should exist already
      if (!children.hasOwnProperty(first)) {
        children[first] = createNgramnode();
      }
      children[first].subtract(rest);
    };
    
    that.dump = function () {

      // Map children to their dumps.
      var child;
      var dumpedChildren = {};
      for (child in children) {
        if (children.hasOwnProperty(child)) {
          dumpedChildren[child] = children[child].dump(); // recursion
        }
      }

      return {
        histogram: histogram.dump(),
        children: dumpedChildren
      };
    };

    that.load = function (dump) {
      var child;

      histogram.load(dump.histogram);

      for (child in dump.children) {
        if (dump.children.hasOwnProperty(child)) {
          children[child] = createNgramnode();
          children[child].load(dump.children[child]); // recursion
        }
      }
    };


    return that;
  };
  


  exports.create = function () {
    return createNgramnode();
  };



  ///////////////
  return exports;

}());
