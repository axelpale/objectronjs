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
