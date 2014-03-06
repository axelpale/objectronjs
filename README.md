# objectron.js<sup>v0.0.1</sup>

Compatible with browsers and Node.js.


## Basic example

    > var b = objectron.create();

## Install

Node.js: `npm install objectron` and `var objectron = require('objectron');`

Browsers: download and `<script src="objectron.js"></script>`

## API

### objectron.create()

    > var b = objectron.create();


### b.save()

    > b.save();

Exports the state of objectron for example to be stored in database. See [_b.load()_](#bload).

### b.load()

    > b.load(...);
    undefined

Resets objectron back to the saved state. See [_b.save()_](#bsave).


## Customize objectron

Customize objectron instance by:

    objectron.extension.myFunction = function (...) {...};

After that you can:

    var b = objectron.create();
    b.myFunction();

## Under the hood



## History

The development of objectron.js started in 2013 as an experiment about how machine learning can be used in user interfaces.

## License

[MIT License](../blob/master/LICENSE)
