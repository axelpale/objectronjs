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

    that.topSubsetTolerated = function (hashes, tolerance) {
      // Similar to topTolerated but only with given hashes.

      var i,
          p,
          h,
          probs,
          max,
          minProb,
          toleratedHashes,
          toleratedProbs;

      // Collect probabilities and find the largest
      probs = [];
      max = 0;
      for (i = 0; i < hashes.length; i += 1) {
        p = this.prob(hashes[i]); // zero for non-existing
        probs.push(p);
        if (p > max) {
          max = p;
        }
      }
      minProb = max - max * tolerance;

      // Filter out the intolerated
      toleratedHashes = [];
      toleratedProbs = {};
      for (i = 0; i < hashes.length; i += 1) {
        p = probs[i];
        h = hashes[i];
        if (p >= minProb) {
          // Equivalent probability also 
          toleratedHashes.push(h);
          toleratedProbs[h] = p;
        }
      }

      // Sort the tolerated by probability, highest first
      toleratedHashes.sort(function (a, b) {
        var pa = toleratedProbs[a];
        var pb = toleratedProbs[b];
        // higher the probability, lower the index
        if (pa > pb) {
          return -1; // pa greater, pa should have lower index
        } // else
        return 1;
      });

      return toleratedHashes;
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
