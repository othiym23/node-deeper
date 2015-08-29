# deeper
`deeper` is a library for structurally comparing the equality of JavaScript values. It supports recursive / cyclical data structures, is written to avoid try / catch / throw (for speed), and has no dependencies by default.

If you install [Ben Noordhuis](http://github.com/bnoordhuis)'s [buffertools](https://github.com/bnoordhuis/node-buffertools) into a project using `deeper`, it will use that to speed up comparison of Buffers. This used to be installed as an optional dependency, but it gets in the way of browserification and also makes using `deeper` in your own projects harder, so I changed it to just try to use it if it's there.

It has some optimizations, but stresses correctness over raw speed (unless you're testing objects with lots of Buffers attached to them, in which case it plus `buffertools` is likely to be the fastest general-purpose deep-comparison tool available).

The core algorithm is based on those used by Node's assertion library and the implementation of cycle detection in [isEqual](http://underscorejs.org/#isEqual) in [Underscore.js](http://underscorejs.org/).

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
```

## license
BSD. Go nuts.
