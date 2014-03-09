/*! objectron - v0.0.1 - 2014-03-09
 * https://github.com/axelpale/objectronjs
 *
 * Copyright (c) 2014 Akseli Palen <akseli.palen@gmail.com>;
 * Licensed under the MIT license */

(function (window, undefined) {
  'use strict';
  
  
  // Module name
  var objectron = {};
  
  
  
  // ten lines to ease counting and finding the lines in test output.


// Some convenient general purpose methods.

var isArray = function (possibleArray) {
  return Object.prototype.toString.call(possibleArray) === '[object Array]';
};

/*
Unigram
  a.k.a. 1-gram
  histogram

http://en.wikipedia.org/wiki/Bag_of_words_model
http://en.wikipedia.org/wiki/Categorical_distribution

*/

objectron.unigram = (function () {
  var exports = {};
  /////////////////

  

  var createUnigram = function () {
    var counters = {};
    var countersSum = 0;
    var index = {};
    var order = [];
     
    var that = {};

    var sort = function (hash, direction) {
      // Parameter
      //   hash
      //     hash to be moved to right place in $order.
      //   direction
      //     -1 = towards the highest (head)
      //      1 = towards the lowest (tail)
      // 
      // Precondition
      //   $hash exists in $counters, $index and in $order.
      var nextIndex,
          nextHash,
          nextCounter,
          currCounter;

      var toHead = -1;
      var toTail =  1;

      if (direction !== toHead && direction !== toTail) {
        direction = toHead;
        // TODO: automatic direction recognition by using comparison
      }

      // Sort $order. Insertion sort for one element.
      // Complexity O(n), could be O(log(n))?.
      // Array.sort is not used because the indices are needed and
      // Array.sort is O(nlog(n))
      while (true) {
        nextIndex = index[hash] + direction;
        if (nextIndex >= 0 && nextIndex < order.length) {
          nextHash = order[nextIndex];
          nextCounter = counters[nextHash];
          currCounter = counters[hash];
          if ((direction === toHead && nextCounter > currCounter) ||
              (direction ===  toTail && currCounter >= nextCounter)) {
            // Current hash already at right place.
            // For toHead >  instead of >= and
            // for toTail >= instead of > to respect the most recent.
            break;
          } // else
          
          // Swap
          order[nextIndex] = hash;
          index[hash] = nextIndex;
          order[nextIndex - direction] = nextHash;
          index[nextHash] = nextIndex - direction;
        } else {
          // Element at the first of the order array.
          break;
        }
      }
    };
    
    that.add = function (hash) {

      // if new entry
      if (!counters.hasOwnProperty(hash)) {
        counters[hash] = 1;
        order.push(hash);
        index[hash] = order.length - 1;
      } else {
        counters[hash] += 1;
      }
      countersSum += 1;
      
      sort(hash, -1);
    };
    
    that.subtract = function (hash) {
      if (!counters.hasOwnProperty(hash)) {
        return;
      }

      if (counters[hash] <= 0) {
        return;
      }

      counters[hash] -= 1;
      countersSum -= 1;

      sort(hash, 1);
    };
    
    that.prob = function (hash) {
      if (counters.hasOwnProperty(hash)) {
        return counters[hash] / countersSum;
      } // else
      return 0;
    };

    that.topTolerated = function (tolerance) {
      // Similart to top(n) but instead n results, only
      // those hashes are included that are almost as probable
      // as the most probable one. Tolerance tells how much smaller
      // the probability of the included can be in relation to the
      // most probable. Tolerance = 0.1 means that when the most probable
      // has probability of 0.3 then the minimum allowed probability
      // will be 0.3 - 0.3 * 0.1 = 0.27. Therefore tolerance must be
      // a number in closed interval [0..1]

      var i, topProbHash, topProb, minProb;

      if (order.length === 0) {
        return [];
      } // else len > 0

      if (order.length === 1) {
        return order.slice(0); // copy
      } // else len > 1

      topProbHash = order[0];
      topProb = this.prob(topProbHash);
      minProb = topProb - topProb * tolerance;

      i = 1;
      while (i < order.length && minProb <= this.prob(order[i])) {
        i += 1;
      }

      return order.slice(0,i);
    };
    
    that.top = function (n) {
      // n highest ranked in ordered array.
      // Parameter
      //   n (optional, default 0)
      //     0
      //       Return all
      //     1
      //       Return array [mostProbableHash]
      if (typeof n !== 'number') {
        n = 0;
      }

      n = Math.min(n, order.length);
      if (n > 0) {
        return order.slice(0, n);
      } // else
      if (n === 0) {
        return order.slice(0); // copy
      } // else
      return [];
    };

    that.rank = function (hash) {
      // Index in the top array.
      // Rank Infinity if does not exist.
      // Rank 0 if the first.
      if (index.hasOwnProperty(hash)) {
        return index[hash];
      } // else
      return Infinity;
    };

    that.size = function () {
      // Number of different hashes
      return order.length;
    };

    that.dump = function () {
      // Return
      //   State as plain object to be for example stored
      //   to database.
      // 
      // See also load()
      return counters;
    };

    that.load = function (dumpedData) {
      // See dump()
      var hash;

      // Reset
      counters = {};
      order = [];
      index = {};
      countersSum = 0;

      // TODO: O(n^2) -> O(nlog(n))
      for (hash in dumpedData) {
        if (dumpedData.hasOwnProperty(hash)) {
          counters[hash] = dumpedData[hash];
          countersSum += dumpedData[hash];
          order.push(hash);
          index[hash] = order.length - 1;
          sort(hash, -1);
        }
      }
    };


    
    return that;
  };
  


  exports.create = function () {
    return createUnigram();
  };



  ///////////////
  return exports;

}());


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


/*
Objectron
  or Eventron
  or finnish: Tapahtumaatti

TODO: root -> tree
*/

objectron.objectron = (function () {
  var exports = {};
  /////////////////
  


  var Tron;

  // Max integer of JavaScript is 2^53. In the worst case
  // we need to sum two integers. Max size limit
  // comes then to 2^52. Add some margin: 2^50;
  var maxSizeLimit = Math.pow(2,50);


  
  // Constructor
  
  Tron = function (shortTermMemorySize) {
    // Create new objectron.
    
    if (typeof shortTermMemorySize !== 'number') {
      shortTermMemorySize = maxSizeLimit;
    }
    this.historySize = shortTermMemorySize;

    this.root = objectron.ngramnode.create();
    
    this.history = [];
    
  };
  
  exports.create = function (shortTermMemorySize) {
    return new Tron(shortTermMemorySize);
  };
  
  

  // Accessors

  Tron.prototype.prob = function (sequence, givenSequence) {
    // Probability of a sequence given another sequence.
    // 
    // Parameter
    //   sequence (optional)
    //     array or single value. If omitted, result is 1.
    //   givenSequence (optional, default [])
    //     Condition for probability. Array or single value.

    // Normalize params

    if (typeof sequence === 'string') {
      sequence = [sequence];
    } else if (typeof sequence === 'undefined') {
      sequence = [];
    } // else assume array

    if (typeof givenSequence === 'string') {
      givenSequence = [givenSequence];
    } else if (typeof givenSequence === 'undefined') {
      givenSequence = [];
    } // else assume array

    return this.root.given(givenSequence).prob(sequence);
  };

  /*
  Tron.prototype.next = function () {
    // For each slice of previous history until single answer is found.
    // history = ['a', 'b', 'c'];
    // i = 0: h = ['a', 'b', 'c'];
    // i = 1: h = ['b', 'c'];
    // i = 2: h = ['c'];
    // i = 3: h = [];
    var i, j, h, p, top,
        probabilities,
        first, firstProb,
        secondary, secondaryProb,
        possibilities = [];

    for (i = 0; i <= this.history.length; i += 1) {
      h = this.history.slice(i);
      p = this.root.given(h);
      
      if (possibilities.length === 1) {
        return possibilities[0];
      } // else

      if (possibilities.length === 0) {
        top = p.top(); // ordered by probability
      } else {
        // not first round, there is possibilities that
        // makes the set of possible hashes narrower.

        // map possibilities to their probabilities
        probabilities = {};
        for (j = 0; j < possibilities.length; j += 1) {
          probabilities[pos] = p.prob(possibilities[j]);
        }

        // sort

      }

      if (top.length === 0) {
        continue;
      } // else

      if (top.length === 1) {
        return top[0];
      } // else top.length > 1

      first = top[0];
      firstProb = p.prob(first);
      possibilities = [first];

      var threshold = 0.01; // epsilon
      // Select an improper subset of top where probabilities do not
      // differ more than $threshold
      for (j = 1; j < top.length; j += 1) {
        secondary = top[j];
        secondaryProb = p.prob[secondary];

        if (firstProb < secondaryProb + threshold) {
          possibilities.push(secondary);
        } else {
          break;
        }
      }


      // Compare the probabilities of possibilities
      // with shortened history (less conditions).

    }

    this.root.given()
  };
  */

  Tron.prototype.dump = function () {
    // Return
    //   State of objectron in single array to be for example stored
    //   to database.
    // 
    // See also load()
    return {
      historySize: this.historySize,
      history: this.history,
      root: this.root.dump()
    };
  };


  
  // Mutators

  Tron.prototype.push = function (hash) {
    // Increase conditional probability.
    
    // Handle arrays recursively.
    var head, last;
    if (isArray(hash)) {
      // Ends recursion
      if (hash.length <= 0) {
        return;
      } // else hash.length > 0

      // Recursively one hash per time
      head = hash.slice(0, -1);
      last = hash[hash.length - 1];

      this.push(head);
      hash = last;
    }

    // For each slice of previous history
    // history = ['a', 'b', 'c'];
    // i = 0: h = ['a', 'b', 'c'];
    // i = 1: h = ['b', 'c'];
    // i = 2: h = ['c'];
    // i = 3: h = [];
    var i, h;
    for (i = 0; i <= this.history.length; i += 1) {
      h = this.history.slice(i);
      this.root.given(h).add(hash);
    }

    // Becomes a history
    if (this.history.length >= this.historySize) {
      this.history.shift();
    }
    this.history.push(hash);
  };

  Tron.prototype.load = function (dumpedData) {
    // See dump()
    this.historySize = dumpedData.historySize;
    this.history = dumpedData.history;
    this.root.load(dumpedData.root);
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
