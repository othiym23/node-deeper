`deeper` is a library for structurally comparing the equality of JavaScript
values. It supports recursive / cyclical data structures, is written to avoid
try / catch / throw (for speed), and uses
[Ben Nordhuuis](http://github.com/bnoordhuis)'s
[buffertools](https://github.com/bnoordhuis/node-buffertools) when it can to
speed up Buffer comparison.

It has some optimizations but stresses correctness over raw speed (unless
you're testing objects with lots of Buffers attached to them, in which case
it's likely to be the fastest general-purpose deep-comparison tool available).
Note that some of these optimization choices (i.e. buffertools) make this
module unsuitable for use in the browser, even using tools like
[Browserify](https://github.com/substack/node-browserify). Use substack's
[deep-equal](https://github.com/substack/node-deep-equal) if Browserify
compatibility is important to you.

`deeper` also comes with shims for use with my three favorite assertion libraries:

* [Chai](http://chaijs.com/)
* [node-tap](https://github.com/isaacs/node-tap)
* Node's own [assert](http://nodejs.org/api/assert.html)

See the usage instructions for details on how to enable the shims.

The core algorithm is based on those used by Node's assertion library and the
implementation of cycle detection in
[isEqual](http://underscorejs.org/#isEqual) in
[Underscore.js](http://underscorejs.org/).

I like to think the documentation is pretty OK.

## installation

```
npm install deeper
```

## usage

```javascript
// vanilla
var deepEqual = require('deeper')

if (!deepEqual(obj1, obj2)) console.log("yay! diversity!");

// to install the shim against require('assert').deepEqual
require('deeper').patchAssert();

// to patch Chai's eql / deep.equal / et al
require('deeper').patchChai();

// to patch node-tap's ridiculous array of synonyms for deepEqual
require('deeper').patchTap();
```

## caveats

Right now, a lot of the tests rely upon [Node bug #4523](https://github.com/joyent/node/issues/4523)
not being fixed. When / if somebody (possibly me) gets around to fixing it and
the fix propagates out to substack's deep-equal and the copypasta of it in
Chai, I'll have to come up with some new tests to verify that the shims still
work. There are worse problems to have.

## license

BSD. Go nuts.
