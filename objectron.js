/*! objectron - v0.0.1 - 2014-03-27
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

var toArray = function (value) {
  // Turn a value to an array.
  //   2       -> [2]
  //   'a'     -> ['a']
  //   [2]     -> [2]
  //   other   -> []
  if (typeof value === 'string' || typeof value === 'number') {
    return [value];
  }

  if (isArray(value)) {
    return value;
  } // else
  return [];
};

var randomFromInterval = function (min, max) {
  // Return a number for range [min,max)
  // http://stackoverflow.com/a/7228322/638546
  return Math.random() * (max - min) + min;
};

var randomOrderedSetFromInterval = function (n, min, max) {
  // N random numbers in order
  // 
  // Complexity
  //   O(n)
  // 
  // See http://www.mathpages.com/home/kmath452.htm
  var i,
      prev,
      normalized,
      x = [];

  if (typeof n !== 'number') {
    n = 1;
  }
  if (n < 1) {
    return x; // empty array
  }

  // Inverse cumulative distribution function for x[i]
  // invcdf(x, i) = 1 - (1 - x)^(1 / (n - i)) 

  // x[0]
  x.push(1 - Math.pow(Math.random(), 1 / n));

  // x[1] .. x[n - 1] 
  for (i = 1; i < n; i += 1) {
    prev = x[x.length - 1];
    normalized = 1 - Math.pow(Math.random(), 1 / (n - i));
    x.push(prev + (1 - prev) * normalized);
  }

  // Transfer to interval
  for (i = 0; i < n; i += 1) {
    x[i] = min + (max - min) * x[i];
  }

  return x;
};

var shuffle = function (array) {
  // Shuffle the array randomly using Fisher-Yates shuffle algorithm.
  // See http://stackoverflow.com/a/6274398/638546

  var counter = array.length, temp, index;

  // While there are elements in the array
  while (counter > 0) {
    // Pick a random index
    index = Math.floor(Math.random() * counter);

    // Decrease counter by 1
    counter -= 1;

    // And swap the last element with it
    temp = array[counter];
    array[counter] = array[index];
    array[index] = temp;
  }

  return array;
};

// The following lines are needed to test the util functions from outside.
objectron.util = {
  isArray: isArray,
  toArray: toArray,
  randomFromInterval: randomFromInterval,
  randomOrderedSetFromInterval: randomOrderedSetFromInterval
};

/*

Adapting Categorical Distribution

In this distribution every category has its own integer counter. When
an event belonging to a category is taught to the distribution the counter of
the category is increased by one. The events in the category with the biggest
counter are the most probable ones. Probability of an event is the proportion
of the counter of its category to the sum of all the distribution's counters.

To avoid categories growing limitlessy and allow the distribution to adapt to
change, there must be limits for the number of categories and the number in
counters. Limiting the number of categories affects to the computation time
positively. Limiting the counters speeds up adaptation but decreases noise
resistance and therefore stability.

Let the two dimensions be maxCategorySize and maxNumCategories. These form
a dependent dimension maxSize = maxCategorySize * maxNumCategories. Here
maxSize equals to the maximum number of counters in the distribution.

For this distribution maxSize is selected to be the only input parameter.
Only the sum of the counters is important. Therefore no hard limits are set
for maxCategorySize and maxNumCategories even though they are still limited
by maxSize but in more dynamical manner. For example with maxSize = 8 there
could be two categories with 2 and 6 in their counters or four categories
with 1, 3, 2 and 2.

If the limit is exceeded a forgetting algorithm must be applied. There are
multiple options for such algorithm (n = number of categories):
- Random: decrease a randomly selected counter. O(1)
- Normalized Random: decrease a sampled counter.
- Divide: multiply counters by number smaller than 1 to meet the limit. O(n)
- Subtract: subtract counters by 1 / numCategories. O(n)
- FIFO: First in first out. Decrease the counter of the oldest event. O(n)
- LRU: Decrease the counter of least recently increased (used) category. O(?)
- Round-robin: Each category is decreased in their turns. O(1)

Random algorithm would be nice because implementation easiness and quickness.
Its non-deterministicity makes it harder to test and thats why Random is not
the way to go. Round-robin has similar effect as the Random but is
deterministic. Round-robin loops through the list of categories ordered by
probability and starts from the least probable. A problem of Round-robin is
complex implementation because decreasing affects round order.

Normalized Random is selected because implementation easiness (one-liner!).
Normalized Random decreased a random category. Most probable categories have
largest probability to become decreased. In large scale the algorithm has
a flattening effect to the distribution similar to Divide algorithm. Non-
deterministicity makes Normalized Random hard to test.

Related
- unigram
- http://en.wikipedia.org/wiki/Bag_of_words_model
- http://en.wikipedia.org/wiki/Categorical_distribution

TODO
- use term category where the categories are meant instead of event.
- Decide the forgetting algorithm

*/

objectron.adaptingCategoricalDistribution = (function () {
  var exports = {};
  /////////////////

  
  var sortOne = function (acd, category) {
    // Move event category to its position in a manner similar to
    // insertion sort.
    // 
    // Precondition
    //   $category is only out of order category in $order.
    //   $category exists in $counters, $indices and in $order.
    var s, i, c, backwards, isLast, isFirst, tempCat;

    s = acd.state;
    i = s.indices[category];
    c = s.counters[category];

    // Recognize direction
    isLast = (i === s.order.length - 1);
    isFirst = (i === 0);
    if (isLast) {
      backwards = true;
    } else if (isFirst) {
      backwards = false;
    } else {
      // assert: at least one before and at least one after.
      if (s.counters[s.order[i - 1]] < c) {
        backwards = true;
      } else {
        backwards = false;
      }
    }

    // Move until category in its place.
    // Place most recent as front as possible.
    if (backwards) {
      while (i !== 0 && s.counters[s.order[i - 1]] <= c) {
        // Swap towards head
        tempCat = s.order[i - 1];
        s.order[i] = tempCat;
        s.order[i - 1] = category;
        s.indices[tempCat] = i;
        i -= 1;
      }
    } else {
      while (i !== s.order.length - 1 && s.counters[s.order[i + 1]] > c) {
        // Swap towards tail
        tempCat = s.order[i + 1];
        s.order[i] = tempCat;
        s.order[i + 1] = category;
        s.indices[tempCat] = i;
        i += 1;
      }
    }

    // Update category index
    s.indices[category] = i;
  };

  var sampleSimple = function (acd, n) {
    // Take N samples randomly.
    // Complexity O(n * m) where m is num of categories. This because
    // cumulative distribution function is recalculated for every sample.
    var x, i, j, cumulativeSum,
        result = [],
        s = acd.state;

    if (s.order.length === 0 || n <= 0) {
      return result;
    } // else

    for (i = 0; i < n; i += 1) {
      x = randomFromInterval(0, s.countersSum);
      cumulativeSum = 0;
      for (j = 0; j < s.order.length; j += 1) {
        // Add to cumulative sum until greater.
        // Because random max is exclusive, counter sum
        // will be greater at the last event at the latest.
        cumulativeSum += s.counters[s.order[j]];
        if (x < cumulativeSum) {
          result.push(s.order[j]);
          break;
        }
      }
    }

    return result;
  };

  var sampleOrdered = function (acd, n) {
    // Take N samples randomly but return them in probability order.
    // Calculates cumulative density function only once.
    // Complexity O(n + m) but has quite large overhead compared to.
    // sampleSimple. Good performance when there is large number of
    // categories (about 30 or more) even if the results need to be
    // shuffled.

    var rands, cat, cumulativeSum, i, r,
        result = [],
        s = acd.state;

    if (s.order.length === 0 || n <= 0) {
      return result; // empty array
    } // else

    rands = randomOrderedSetFromInterval(n, 0, s.countersSum);

    cat = 0;
    cumulativeSum = s.counters[s.order[cat]];

    for (i = 0; i < n; i += 1) {
      r = rands[i];

      // Use < instead of <= because inclusive head, exclusive tail.
      if (r < cumulativeSum) {
        result.push(s.order[cat]);
      } else {
        do {
          // Add to cumulative sum until it becomes greater than $r.
          // Because the interval tail is exclusive, $cumulativeSum
          // will become greater than $r at least in the end.
          cat += 1;
          cumulativeSum += s.counters[s.order[cat]];
        } while (cumulativeSum <= r);

        result.push(s.order[cat]);
      }
    }

    // Results in probability order.
    return result;
  };

  

  // Constructor

  var ACD = function (maxSize) {
    // Parameter
    //   maxSize (optional, default 0)
    //     positive integer
    //       0: unlimited size

    // Normalize params
    if (typeof maxSize !== 'number') { maxSize = 0; }

    this.state = {
      counters: {}, // Counter for each category
      countersSum: 0, // Sum of $counters
      maxSize: maxSize, // maxCountersSum
      order: [], // Ordered most probable category first.
      indices: {} // Category indices in $order array
    };
  };

  exports.create = function (param) {
    return new ACD(param);
  };
    


  // Accessors

  ACD.prototype.prob = function (events) {
    // Probabilities of given events
    // 
    // Return array of numbers.

    var result = [],
        i, ev, p;
 
    for (i = 0; i < events.length; i += 1) {
      ev = events[i];
      if (this.state.counters.hasOwnProperty(ev)) {
        p = this.state.counters[ev] / this.state.countersSum;
        result.push(p);
      } else {
        result.push(0);
      }
    }

    return result;
  };
  
  ACD.prototype.head = function (n) {
    // N most probable event categories
    // 
    // Parameter
    //   n (optional, default 0)
    //     0 to return all categories in probability order.
    // 
    // Return array of event categories
    var s = this.state;
    if (typeof n !== 'number') {
      n = 0;
    }

    n = Math.min(n, s.order.length);
    if (n > 0) {
      return s.order.slice(0, n);
    } // else
    if (n === 0) {
      return s.order.slice(0); // copy
    } // else
    return [];
  };

  ACD.prototype.peak = function (deviationTolerance) {
    // Return most probable category (probability X) and all those categories
    // whose probability differs from X by not more than
    // deviationTolerance * 100 percent.
    //
    // Parameter
    //   deviationTolerance
    //     number in closed interval [0, 1]
    // 
    // Return array of categories

    var i, headLikelihood, minLikelihood,
        s = this.state;

    if (s.order.length === 0) {
      return [];
    } // else len > 0

    headLikelihood = s.counters[s.order[0]];
    minLikelihood = headLikelihood - headLikelihood * deviationTolerance;

    for (i = 1; i < s.order.length; i += 1) {
      if (minLikelihood > s.counters[s.order[i]]) {
        break;
      } // else include i:th category
    }

    // Do not include i:th category.
    return s.order.slice(0,i);
  };

  ACD.prototype.subset = function (categories) {
    // Return new adaptingCategoricalDistribution that has only the specified
    // event categories. Counters stay the same, probabilities may change but
    // the ratios between probabilities stay the same. Value of maxSize stays
    // the same because there seems to be no good reason to select otherwise.
    //
    // Precondition
    //   Given categories are mutually exclusive i.e. no duplicates.
    // 
    // Complexity
    //   O(n*log(m) + m*log(n))
    //     where n = number of given categories and m = this.numCategories

    var i, cat,
        s = this.state,
        acd, acds;

    acd = new ACD(s.maxSize);
    acds = acd.state;

    // Counters
    for (i = 0; i < categories.length; i += 1) {
      cat = categories[i];
      if (s.counters.hasOwnProperty(cat)) {
        acds.counters[cat] = s.counters[cat];
        acds.countersSum += s.counters[cat];
      }
    }

    // Order
    for (i = 0; i < s.order.length; i += 1) {
      cat = s.order[i];
      if (acds.counters.hasOwnProperty(cat)) {
        acds.order.push(cat);
        acds.indices[cat] = acds.order.length - 1;
      }
    }

    return acd;
  };

  ACD.prototype.rank = function (events) {
    // Order of the given events in the list of most probable categories.
    // Most probable category has rank 0.
    // 
    // Return array of integers.
    var result = [],
        i, ev, p,
        s = this.state;
 
    for (i = 0; i < events.length; i += 1) {
      ev = events[i];
      if (s.indices.hasOwnProperty(ev)) {
        result.push(s.indices[ev]);
      } else {
        result.push(Infinity);
      }
    }

    return result;
  };

  ACD.prototype.sample = function (n, isOrdered) {
    // Draw n samples from the distribution.
    // 
    // Parameter
    //   n (optional, default 1)
    //     How many samples
    //   isOrdered (optional, default false)
    //     If true, results are ordered most probable samples first.
    //     This can be done without additional penalty to efficiency.
    //
    // Return
    //   array of events. Empty array if no data or if n = 0
    //
    // Complexity
    //   Mixed O(n*m) and O(n+m) where m is number of categories

    var manyCategories, r,
        s = this.state;

    // Normalize params
    if (typeof n !== 'number') { n = 1; }
    if (typeof isOrdered !== 'boolean') { isOrdered = false; }

    // Two algorithms to choose from
    if (isOrdered) {
      r = sampleOrdered(this, n);
    } else {

      manyCategories = s.order.length > 30;
      if (manyCategories) {
        r = shuffle(sampleOrdered(this, n));
      } else {
        r = sampleSimple(this, n);
      }
    }
    return r;
  };

  ACD.prototype.size = function () {
    // Sum of the counters.
    // 
    // Return positive integer.
    return this.state.countersSum;
  };

  ACD.prototype.numCategories = function () {
    // Return number of categories in memory.
    return this.state.order.length;
  };

  ACD.prototype.dump = function () {
    // Serialize to a shallow array.
    // See also load()
    var i, cat, count,
        s = this.state,
        d = [];

    // Categories and counters
    for (i = 0; i < s.order.length; i += 1) {
      cat = s.order[i];
      count = s.counters[cat];
      d.push(cat);
      d.push(count);
    }

    // Max size
    d.push(s.maxSize);

    return d;
  };

  ACD.prototype.copy = function () {
    // Return a copy of this distribution.
    var c = new ACD();
    c.load(this.dump());
    return c;
  };


  
  // Mutators

  ACD.prototype.learn = function (events) {
    // Increase the counters of the categories of the events
    // 
    // Parameter
    //   events
    //     an array of events
    // 
    // Return this for chaining

    var i, ev, nextRobin,
        s = this.state;

    // Increase counter
    for (i = 0; i < events.length; i += 1) {

      if (s.maxSize > 0 && s.countersSum + 1 > s.maxSize) {
        // Decrease using algorithm Normalized Random.
        // Assert: s.countersSum > 0
        // Assert: s.order.length > 0
        this.unlearn(this.sample());
      }

      ev = events[i];
      if (s.counters.hasOwnProperty(ev)) {
        s.counters[ev] += 1;
      } else {
        s.counters[ev] = 1;
        s.order.push(ev);
        s.indices[ev] = s.order.length - 1;
      }

      // Update the sum
      s.countersSum += 1;

      // Move the category to its place.
      sortOne(this, ev);
    }

    return this;
  };
    
  ACD.prototype.unlearn = function (events) {
    // Decrease the counters of these events
    // Parameter
    //   events
    //     an array of events
    // 
    // Return this for chaining

    var i, cat,
        s = this.state;

    // Decrease counter
    for (i = 0; i < events.length; i += 1) {
      cat = events[i];

      if (s.counters.hasOwnProperty(cat)) {
        s.counters[cat] -= 1;

        // Update the sum
        s.countersSum -= 1;

        // Move the category to its place.
        sortOne(this, cat);

        // Remove empty category. It's the last in order if there is one.
        if (s.counters[cat] <= 0) {
          s.order.pop();
          delete s.counters[cat];
          delete s.indices[cat];
        }
      } // else do nothing

    }

    return this;
  };

  ACD.prototype.maxSize = function (newMaxSize) {
    // Get or set maxSize.
    var delta, i;

    if (typeof newMaxSize !== 'number') {
      return this.state.maxSize;
    } // else

    delta = this.state.countersSum - newMaxSize;

    if (delta > 0) {
      // Need to decrease.
      // Decreasing floor(delta) is not enough because sum will stay higher
      // than maxSize. We must decrease by ceil(delta) times.
      for (i = 0; i < Math.ceil(delta); i += 1) {
        // We cannot use 
        // this.unlearn(this.sample(Math.ceil(delta)));
        // because unlearn affects to the samples.
        this.unlearn(this.sample());
      }
    }
    // Assert: countersSum <= newMaxSize
    this.state.maxSize = newMaxSize;
  };

  ACD.prototype.load = function (dumpedData) {
    // Load everything from a serialized array.
    // 
    // Precondition
    //   dumped contains counters in probability order, most probable first.
    // 
    // Return this for chaining.

    var i, cat, count, s;

    // Init
    s = {
      counters: {},
      countersSum: 0,
      maxSize: 0,
      order: [],
      indices: {}
    };

    // Pairs
    for (i = 0; i + 1 < dumpedData.length; i += 2) {
      cat = dumpedData[i];
      count = dumpedData[i + 1];
      s.counters[cat] = count;
      s.countersSum += count;
      s.order.push(cat);
      s.indices[cat] = s.order.length - 1;
    }

    // Last value is maxSize
    s.maxSize = dumpedData[i];

    this.state = s;
    return this;
  };
  


  ///////////////
  return exports;

}());


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

    that.sample = function () {
      // Random sample from the distribution
      // Complexity O(n)
      // Could be made O(log(n)) by storing the CDF.
      // If there is no data, return null.

      var x, i, cumulativeSum;
      x = randomFromInterval(0, countersSum);
      cumulativeSum = 0;
      for (i = 0; i < order.length; i += 1) {
        // Add to cumulative sum until greater.
        // Because random max is exclusive, counter sum
        // will be greater at the last event at the latest.
        cumulativeSum += counters[order[i]];
        if (x < cumulativeSum) {
          return order[i];
        }
      }

      // Order is empty
      return null;
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
TODO: hash -> event
*/

objectron.ngramnode = (function () {
  var exports = {};
  /////////////////

  

  var createNgramnode = function () {
     
    var that = {};

    var histogram = objectron.unigram.create();
    var children = {};

    that.prob = function (hashSequence) {
      
      hashSequence = toArray(hashSequence);

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

      hashSequence = toArray(hashSequence);

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

      hashSequence = toArray(hashSequence);

      if (hashSequence.length <= 0) {
        return histogram.top(n);
      } // else continue recursion

      var first = hashSequence[0];
      var rest = hashSequence.slice(1);

      if (!children.hasOwnProperty(first)) {
        // No such branch, therefore histogram is empty.
        return [];
      } // else
      return children[first].top(rest, n);
    };

    that.topTolerated = function (hashSequence, tolerance) {
      // A set of most probable successors for the given sequence,
      // ordered by probability, most probable first.
      // The set contains those hashes with probability at least
      // the greatest probability * (1 - tolerance).
      hashSequence = toArray(hashSequence);

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

    that.topSubsetTolerated = function (given, subset, tolerance) {
      // After the given sequence there is a set of options for
      // the next event. Limit this set to the subset. In this subset
      // there is zero to one most probable events. Filter out all events
      // those probability differs from the most probable event at least
      // 100 * tolerance percents.
      given  = toArray(given );
      subset = toArray(subset);

      if (given.length <= 0) {
        return histogram.topSubsetTolerated(subset, tolerance);
      } // else continue recursion

      var first = given[0];
      var rest = given.slice(1);

      if (!children.hasOwnProperty(first)) {
        // No such branch, therefore histogram is empty.
        return [];
      } // else
      return children[first].topSubsetTolerated(rest, subset, tolerance);
    };

    that.add = function (hashSequence) {
      hashSequence = toArray(hashSequence);

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
      hashSequence = toArray(hashSequence);

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

  Tron.prototype.top = function (n, sequenceLength) {
    // n most probable event sequences for the next event.
    // Each sequence contains sequenceLength events. 

    throw 'not implemented';
  };

  Tron.prototype.topSingle = function () {
    // Alias to top(1,1). Returns array of size 1 or 0.
    // Easier to design.

    var i, h, p,
        alternatives;

    var tolerance = 0.2;

    // For each slice of previous history until single answer is found.
    // history = ['a', 'b', 'c'];
    // i = 0: h = ['a', 'b', 'c'];
    // i = 1: h = ['b', 'c'];
    // i = 2: h = ['c'];
    // i = 3: h = [];
    alternatives = null;
    for (i = 0; i <= this.history.length; i += 1) {
      h = this.history.slice(i);
      p = this.root.given(h);
      if (alternatives === null) {
        alternatives = p.topTolerated([], tolerance);
      } else {
        alternatives = p.topSubsetTolerated([], alternatives, tolerance);
      }

      if (alternatives.length === 1) {
        return alternatives.slice(0, 1); // No need to copy;not used elsewhere
      } // else

      if (alternatives.length === 0) {
        // No data. Continue iteration to find more data.
        alternatives = null;
      } // else

      // still more than one alternative
    }
    // If algorithm arrives here, there are still two or more alternatives
    // or no data at all.

    var noData = (alternatives === null);

    if (noData) {
      return [];
    } // else

    // Return the most probable
    return alternatives.slice(0, 1);
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
