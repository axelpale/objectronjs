/*

Benchmarking sampling algorithms

Results
  1. number of samples does not affect to which one is faster
  2. number of categories does affect. It seems that when there are
     22 or more categories than 

*/
var objectron = require('../objectron');
var acd = objectron.adaptingCategoricalDistribution;

// Distribution, 35 categories
var d = acd.create();
d.learn(['a', 'a', 'b', 'c', 'd', 'e', 'f', 'g',
              'h', 'i', 'j', 'k', 'l', 'm', 'n',
              'o', 'p', 'q', 'r', 's', 't', 'u',
              'v', 'w', 'x', 'y', 'z', '-', '_',
              '1', '2', '3', '4', '5', '6', '7']);

// Number of samples
var n = 1000000;

module.exports = {
  name: 'sample() algorithm test',
  tests: {
    'sample()': function () {
      d.sample(n);
    },
    'sampleQuick()': function () {
      d.sampleQuick(n);
    }
  }
};