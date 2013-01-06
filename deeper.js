'use strict';

function isArguments(object) {
  return Object.prototype.toString.call(object) === '[object Arguments]';
}

var fastEqual;
try {
  require('buffertools');
  fastEqual = Buffer.equals;
}
catch (e) {
  // whoops, weren't able to install node-buffertools
}

/**
 * This is a node-specific version of a structural equality test, modeled on
 * bits and pieces of loads of other implementations of this algorithm, most
 * notably the one in the Node.js source and the Underscore library. It doesn't
 * throw and handles cycles.
 *
 * Everybody who writes one of these functions puts the documentation
 * inline, which makes it incredibly hard to follow. Here's what this version
 * of the algorithm does, in order:
 *
 * 1. === only tests objects and and functions by reference. Null is an object.
 *    Any pairs of identical entities failing this test are therefore objects
 *    (including null), which need to be recursed into and compared attribute by
 *    attribute.
 * 2. Since the only matching entities to get to this test must be objects, if
 *    a or b is not an object, they're clearly not the same. All unfiltered a
 *    and b getting are objects (including null).
 * 3. null is an object, but null === null. All unfiltered a and b are non-null
 *    objects.
 * 4. Buffers need to be special-cased because they live partially on the wrong
 *    side of the C++ / JavaScript barrier. Still, calling this on structures
 *    that can contain Buffers is a bad idea, because they can contain
 *    multiple megabytes of data and comparing them byte-by-byte is hella
 *    expensive.
 * 5. It's much faster to compare dates by numeric value than by lexical value.
 * 6. Same goes for Regexps.
 * 7. The parts of an arguments list most people care about are the arguments
 *    themselves, not the callee, which you shouldn't be looking at anyway.
 * 8. Objects are more complex:
 *    a. ensure that a and b are on the same constructor chain
 *    b. ensure that a and b have the same number of own properties (which is
 *       what Object.keys returns).
 *    c. ensure that cyclical references don't blow up the stack.
 *    d. ensure that all the key names match (faster)
 *    e. esnure that all of the associated values match, recursively (slower)
 *
 * (SOMEWHAT UNTESTED) ASSUMPTIONS:
 *
 * o Functions are only considered identical if they unify to the same
 *   reference. To anything else is to invite the wrath of the halting problem.
 * o V8 is smart enough to optimize treating an Array like any other kind of
 *   object.
 * o Users of this function are cool with mutually recursive data structures
 *   that are otherwise identical being treated as the same.
 */
function deeper(a, b, ca, cb) {
  if (a === b) {
    return true;
  }
  else if (typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }
  else if (a === null || b === null) {
    return false;
  }
  else if (Buffer.isBuffer(a) && Buffer.isBuffer(b)) {
    if (fastEqual) {
      return fastEqual.call(a, b);
    }
    else {
      if (a.length !== b.length) return false;

      for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;

      return true;
    }
  }
  else if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  else if (a instanceof RegExp && b instanceof RegExp) {
    return a.source     === b.source &&
           a.global     === b.global &&
           a.multiline  === b.multiline &&
           a.lastIndex  === b.lastIndex &&
           a.ignoreCase === b.ignoreCase;
  }
  else if (isArguments(a) || isArguments(b)) {
    if (!(isArguments(a) && isArguments(b))) return false;

    var slice = Array.prototype.slice;
    return deeper(slice.call(a), slice.call(b), ca, cb);
  }
  else {
    if (a.constructor !== b.constructor) return false;

    var ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;

    var cal = ca.length;
    while (cal--) if (ca[cal] === a) return cb[cal] === b;
    ca.push(a); cb.push(b);

    ka.sort(); kb.sort();
    for (var j = ka.length - 1; j >= 0; j--) if (ka[j] !== kb[j]) return false;

    var key;
    for (var k = ka.length - 1; k >= 0; k--) {
      key = ka[k];
      if (!deeper(a[key], b[key], ca, cb)) return false;
    }

    ca.pop(); cb.pop();

    return true;
  }
}

function wrapper(a, b) {
  return deeper(a, b, [], []);
}

wrapper.patchAssert = function () {
  var assert = require('assert');
  assert.deepEqual = function deepEqual(actual, expected, message) {
    if (!wrapper(actual, expected)) {
      assert.fail(actual, expected, message, 'deepEqual', assert.deepEqual);
    }
  };
};

wrapper.patchChai = function () {
  var chai = require('chai');
  chai.Assertion.overwriteMethod('eql', function () {
    return function eql(obj, msg) {
      this.assert(wrapper(this._obj, obj),
                  "expected #{this} to deeply equal #{exp}",
                  "expected #{this} to not deeply equal #{exp}",
                  obj,
                  this._obj,
                  true);
    };
  });
};

/**
 * Isaac and James, I thought you were my friends. :(
 *
 * This is some super-burly monkeypatching here, done more out of determination
 * to figure out how to do it than good sense. Still, it works and is only as
 * fragile as node-tap is mutable.
 */
wrapper.patchTap = function () {
  var tap      = require('tap')
    , inherits = require('inherits')
    ;

  // copied straight from tap-test.js
  function assertParasite(fn) {
    return function _deeperAssert() {
      if (this._bailedOut) return;

      var res = fn.apply(tap.assert, arguments);
      this.result(res);
      return res;
    };
  }

  // methods and synonyms that will use deeper under the covers
  var omg = [
    "equivalent",
    "isEquivalent",
    "looseEqual",
    "looseEquals",
    "isDeeply",
    "same",
    "deepEqual",
    "deepEquals",
    "notEquivalent",
    "notDeepEqual",
    "notDeeply",
    "notSame",
    "isNotDeepEqual",
    "isNotDeeply",
    "isNotEquivalent",
    "isInequivalent",
    "inequivalent"
  ];

  var oldAssert = tap.assert;
  // ditch assert's properties by hiding them behind a proxy
  tap.assert = oldAssert.bind(null);
  tap.assert.ok = tap.assert;
  Object.getOwnPropertyNames(oldAssert).forEach(function (name) {
    if (tap.assert.hasOwnProperty(name) || name === 'prototype') return;

    if (omg.indexOf(name) >= 0) return;

    var descriptor = Object.getOwnPropertyDescriptor(oldAssert, name);
    Object.defineProperty(tap.assert, name, descriptor);
  });

  var newTestProto = {};
  Object.getOwnPropertyNames(tap.Test.prototype).forEach(function (name) {
    if (omg.indexOf(name) >= 0) return;

    var descriptor = Object.getOwnPropertyDescriptor(tap.Test.prototype, name);
    Object.defineProperty(newTestProto, name, descriptor);
  });
  tap.Test.prototype = newTestProto;
  // have to reset the prototype after wantonly abusing it
  inherits(tap.Test, tap.Test.super);

  function equivalent(a, b, message, extra) {
    if (extra && extra.skip) return tap.assert.skip(message, extra);

    extra        = extra   || {};
    message      = message || "should be equivalent";
    extra.found  = a;
    extra.wanted = b;

    return tap.assert(wrapper(a, b), message, extra);
  }
  tap.assert.equivalent = equivalent;
  tap.Test.prototype.equivalent = equivalent;

  [
    "isEquivalent",
    "looseEqual",
    "looseEquals",
    "isDeeply",
    "same",
    "deepEqual",
    "deepEquals"
  ].forEach(function (alias) {
    Object.defineProperty(tap.assert, alias, {
      value      : equivalent,
      enumerable : false
    });

    var descriptor = Object.getOwnPropertyDescriptor(tap.assert, alias)
      , value = descriptor.value
      ;

    if (!value) return;

    descriptor.value = assertParasite(value);
    Object.defineProperty(tap.Test.prototype, alias, descriptor);
  });

  function inequivalent(a, b, message, extra) {
    if (extra && extra.skip) return tap.assert.skip(message, extra);

    extra           = extra   || {};
    message         = message || "should not be equivalent";
    extra.found     = a;
    extra.doNotWant = b;

    return tap.assert(!wrapper(a, b), message, extra);
  }
  tap.assert.inequivalent = inequivalent;
  tap.Test.prototype.inequivalent = inequivalent;

  [
    "notEquivalent",
    "notDeepEqual",
    "notDeeply",
    "notSame",
    "isNotDeepEqual",
    "isNotDeeply",
    "isNotEquivalent",
    "isInequivalent",
  ].forEach(function (alias) {
    Object.defineProperty(tap.assert, alias, {
      value      : inequivalent,
      enumerable : false
    });

    var descriptor = Object.getOwnPropertyDescriptor(tap.assert, alias)
      , value      = descriptor.value
      ;

    if (!value) return;

    descriptor.value = assertParasite(value);
    Object.defineProperty(tap.Test.prototype, alias, descriptor);
  });
};

module.exports = wrapper;
