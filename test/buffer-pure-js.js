var tap = require('tap')
var test = tap.test
var same = require('../')

// force it to use the pure JS version
delete same.fastEqual

test('should match empty Buffers', function (t) {
  t.ok(same(new Buffer([]), new Buffer([])))
  t.end()
})

test('should match similar Buffers', function (t) {
  t.ok(same(
    new Buffer([0]),
    new Buffer([0])
  ))
  t.ok(same(
    new Buffer([0, 1, 3]),
    new Buffer([0, 1, 3])
  ))
  t.end()
})

test('should notice different Buffers', function (t) {
  t.notOk(same(
    new Buffer([0, 1, 2]),
    new Buffer([0, 1, 23])
  ))
  t.notOk(same(
    new Buffer([0, 1]),
    new Buffer([0, 1, 23])
  ))
  t.end()
})
