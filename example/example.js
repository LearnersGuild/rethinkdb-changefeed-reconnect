'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

// -- helpers for this example

var _cleanupOldTestDatabases = function () {
  var _ref3 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2() {
    var dbList, drops;
    return _regenerator2.default.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return r.dbList();

          case 2:
            dbList = _context2.sent;
            drops = dbList.filter(function (name) {
              return name.startsWith(TMP_DB_NAME_PREFIX);
            }).map(function (dbName) {
              return r.dbDrop(dbName);
            });
            _context2.next = 6;
            return _promise2.default.all(drops);

          case 6:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function _cleanupOldTestDatabases() {
    return _ref3.apply(this, arguments);
  };
}();

var _createTestDatabaseAndTable = function () {
  var _ref4 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee3() {
    return _regenerator2.default.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _context3.next = 2;
            return r.dbCreate(tmpDbName);

          case 2:
            _context3.next = 4;
            return r.db(tmpDbName).tableCreate(tableName);

          case 4:
            _context3.next = 6;
            return r.db(tmpDbName).table(tableName).indexCreate('updatedAt');

          case 6:
            _context3.next = 8;
            return r.db(tmpDbName).table(tableName).indexWait();

          case 8:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }));

  return function _createTestDatabaseAndTable() {
    return _ref4.apply(this, arguments);
  };
}();

var _rethinkdbdash = require('rethinkdbdash');

var _rethinkdbdash2 = _interopRequireDefault(_rethinkdbdash);

var _lib = require('../lib');

var _lib2 = _interopRequireDefault(_lib);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint-disable no-console, camelcase */
var TMP_DB_NAME_PREFIX = '_changefeedReconnectTest_';
var tmpDbName = '' + TMP_DB_NAME_PREFIX + Date.now();
var tableName = 'changefeedItems';
var r = (0, _rethinkdbdash2.default)({ servers: [{ host: 'localhost', port: 28015 }], silent: true });

exports.default = function () {
  var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee() {
    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.prev = 0;
            _context.next = 3;
            return _cleanupOldTestDatabases();

          case 3:
            _context.next = 5;
            return _createTestDatabaseAndTable();

          case 5:

            // this is the example of how to set up your changefeed with auto-reconnect
            (0, _lib2.default)(getFeed, handleFeedItem, handleError, {
              changefeedName: tmpDbName + '-' + tableName + ' feed',
              attemptDelay: 3000,
              maxAttempts: 30,
              silent: false
            });
            _context.next = 11;
            break;

          case 8:
            _context.prev = 8;
            _context.t0 = _context['catch'](0);

            handleError(_context.t0);

          case 11:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this, [[0, 8]]);
  }));

  function go() {
    return _ref.apply(this, arguments);
  }

  return go;
}();

function getFeed() {
  return r.db(tmpDbName).table(tableName).orderBy({ index: r.desc('updatedAt') }).limit(3).changes().filter(r.row('old_val').eq(null));
}

function handleFeedItem(_ref2) {
  var feedItem = _ref2.new_val;

  console.log({ feedItem: feedItem });
}

function handleError(err) {
  console.error(err.stack);
}module.exports = exports['default'];

