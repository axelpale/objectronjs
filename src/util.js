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