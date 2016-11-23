'use strict';

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _blueTape = require('blue-tape');

var _blueTape2 = _interopRequireDefault(_blueTape);

var _error = require('rethinkdbdash/lib/error');

var _index = require('../index');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _blueTape2.default)('processChangeFeedWithAutoReconnect', function (t) {
  var loggedArgs = null;
  var logger = {
    log: function log() {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      loggedArgs = args;
    },
    info: function info() {
      for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      loggedArgs = args;
    },
    warn: function warn() {
      for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
        args[_key3] = arguments[_key3];
      }

      loggedArgs = args;
    },
    error: function error() {
      for (var _len4 = arguments.length, args = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
        args[_key4] = arguments[_key4];
      }

      loggedArgs = args;
    }
  };

  var getOptions = function getOptions(opts) {
    return (0, _extends3.default)({
      maxAttempts: 2,
      silent: true,
      attemptDelay: 10,
      changefeedName: 'test feed',
      logger: logger
    }, opts);
  };

  var noOp = function noOp() {
    return null;
  };

  var onErrorCalled = false;
  var onError = function onError(err) {
    if (err.message.includes('simulated')) {
      onErrorCalled = true;
    }
  };

  var onFeedItemCalled = false;
  var onFeedItem = function onFeedItem(item) {
    if (item.the === 'item') {
      onFeedItemCalled = true;
    }
  };

  var successfulGetFeed = function successfulGetFeed() {
    return _promise2.default.resolve({
      each: function each(onCursorEach) {
        onCursorEach(null, { the: 'item' });
      }
    });
  };

  var nonConnectionErrorOnCursorGetFeed = function nonConnectionErrorOnCursorGetFeed() {
    return _promise2.default.resolve({
      each: function each(onCursorEach) {
        onCursorEach(new Error('simulated'));
      }
    });
  };

  var nonConnectionErrorOnGetFeed = function nonConnectionErrorOnGetFeed() {
    return _promise2.default.reject(new Error('simulated'));
  };

  var connectionErrorOnCursorGetFeedAttempts = 0;
  var connectionErrorOnCursorGetFeed = function connectionErrorOnCursorGetFeed() {
    connectionErrorOnCursorGetFeedAttempts += 1;
    if (connectionErrorOnCursorGetFeedAttempts === 1) {
      return _promise2.default.resolve({
        each: function each(onCursorEach) {
          onCursorEach(new _error.ReqlDriverError('simulated'));
        }
      });
    }
    return _promise2.default.reject(new _error.ReqlDriverError('simulated'));
  };

  var connectionErrorOnGetFeedAttempts = 0;
  var connectionErrorOnGetFeed = function connectionErrorOnGetFeed() {
    connectionErrorOnGetFeedAttempts += 1;
    return _promise2.default.reject(new _error.ReqlDriverError('simulated'));
  };

  var timeoutPromise = function timeoutPromise(setup, runTests) {
    var timeoutMillis = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 200;

    return new _promise2.default(function (resolve, reject) {
      setup();
      setTimeout(function () {
        try {
          runTests();
          resolve();
        } catch (err) {
          reject(err);
        }
      }, timeoutMillis);
    });
  };

  t.test('option: maxAttempts', function (tt) {
    tt.test('attempts to reconnect `maxAttempts` times when connection-related errors occur', function (ttt) {
      ttt.plan(2);

      ttt.test('when trying to process the cursor', function (tttt) {
        var options = getOptions();
        connectionErrorOnCursorGetFeedAttempts = 0;
        return timeoutPromise(function () {
          return (0, _index2.default)(connectionErrorOnCursorGetFeed, noOp, noOp, options);
        }, function () {
          // maxAttempts + 1 because the first attempt will rightfully succeed
          tttt.equal(connectionErrorOnCursorGetFeedAttempts, options.maxAttempts + 1, 'attempts !== maxAttempts');
        });
      });

      ttt.test('when trying to get the feed itself', function (tttt) {
        var options = getOptions();
        connectionErrorOnGetFeedAttempts = 0;
        return timeoutPromise(function () {
          return (0, _index2.default)(connectionErrorOnGetFeed, noOp, noOp, options);
        }, function () {
          return tttt.equal(connectionErrorOnGetFeedAttempts, options.maxAttempts, 'attempts !== maxAttempts');
        });
      });
    });

    tt.test('invokes onError when maximum number of attempts has been exceeded', function (ttt) {
      onErrorCalled = false;
      return timeoutPromise(function () {
        return (0, _index2.default)(connectionErrorOnGetFeed, noOp, onError, getOptions());
      }, function () {
        return ttt.equal(onErrorCalled, true, 'onError not called after exceeding maxAttempts');
      });
    });
  });

  t.test('option: attemptDelay', function (tt) {
    tt.test('waits at least `attemptDelay` ms between each attempt', function (ttt) {
      connectionErrorOnGetFeedAttempts = 0;
      return timeoutPromise(function () {
        var options = getOptions({ attemptDelay: 300, maxAttempts: 2 });
        (0, _index2.default)(connectionErrorOnGetFeed, noOp, noOp, options);
      }, function () {
        return ttt.equal(connectionErrorOnGetFeedAttempts, 1, 'did not wait at least `attemptDelay` ms between each attempt');
      });
    });
  });

  t.test('option: silent', function (tt) {
    tt.plan(2);

    tt.test('when true', function (ttt) {
      loggedArgs = null;
      return timeoutPromise(function () {
        return (0, _index2.default)(successfulGetFeed, noOp, noOp, { silent: true, logger: logger });
      }, function () {
        return ttt.equal(loggedArgs, null, 'logging was called when silent === true');
      });
    });

    tt.test('when false', function (ttt) {
      loggedArgs = null;
      return timeoutPromise(function () {
        return (0, _index2.default)(successfulGetFeed, noOp, noOp, { silent: false, logger: logger });
      }, function () {
        return ttt.equal(loggedArgs.length > 0, true, 'logging was not called when silent === false');
      });
    });
  });

  t.test('onError: invoked when non-connection-related errors occur', function (tt) {
    tt.plan(2);

    tt.test('when trying to process the cursor', function (ttt) {
      onErrorCalled = false;
      return timeoutPromise(function () {
        return (0, _index2.default)(nonConnectionErrorOnCursorGetFeed, noOp, onError, getOptions());
      }, function () {
        return ttt.equal(onErrorCalled, true, 'onError not called for non-connection-related error');
      });
    });

    tt.test('when trying to get the feed itself', function (ttt) {
      onErrorCalled = false;
      return timeoutPromise(function () {
        return (0, _index2.default)(nonConnectionErrorOnGetFeed, noOp, onError, getOptions());
      }, function () {
        return ttt.equal(onErrorCalled, true, 'onError not called for non-connection-related error');
      });
    });
  });

  t.test('onFeedItem: invoked for each new feed item in the cursor', function (tt) {
    onFeedItemCalled = false;
    return timeoutPromise(function () {
      return (0, _index2.default)(successfulGetFeed, onFeedItem, noOp, getOptions());
    }, function () {
      return tt.equal(onFeedItemCalled, true, 'onFeedItem was not called');
    });
  });
});