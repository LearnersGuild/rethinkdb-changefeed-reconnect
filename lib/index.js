'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

/* eslint-disable max-params */
var _processChangeFeed = function () {
  var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee(getFeed, onFeedItem, onError, options, attempts) {
    var logger, cursor;
    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            logger = _getLogger(options);
            _context.prev = 1;
            _context.next = 4;
            return getFeed();

          case 4:
            cursor = _context.sent;

            logger.info('Successfully obtained connection to changefeed.');
            cursor.each(function (err, result) {
              if (err) {
                if (_isConnectionError(err)) {
                  // if we get here, we've connected successfully _at least_ once, so we
                  // reset our number of `attempts` to 0
                  return _processChangeFeedWithAutoReconnect(getFeed, onFeedItem, onError, options, 0, err);
                }
                logger.error(err.stack);
                return onError(err);
              }
              onFeedItem(result);
            });
            _context.next = 15;
            break;

          case 9:
            _context.prev = 9;
            _context.t0 = _context['catch'](1);

            if (!_isConnectionError(_context.t0)) {
              _context.next = 13;
              break;
            }

            return _context.abrupt('return', _processChangeFeedWithAutoReconnect(getFeed, onFeedItem, onError, options, attempts + 1, _context.t0));

          case 13:
            logger.error(_context.t0.stack);
            return _context.abrupt('return', onError(_context.t0));

          case 15:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this, [[1, 9]]);
  }));

  return function _processChangeFeed(_x4, _x5, _x6, _x7, _x8) {
    return _ref.apply(this, arguments);
  };
}();

exports.default = processChangeFeedWithAutoReconnect;

var _error = require('rethinkdbdash/lib/error');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function processChangeFeedWithAutoReconnect(getFeed, onFeedItem, onError) {
  var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

  options = (0, _assign2.default)({}, _defaultOptions(), options);
  _processChangeFeedWithAutoReconnect(getFeed, onFeedItem, onError, options);
}

/* eslint-disable max-params */
function _processChangeFeedWithAutoReconnect(getFeed, onFeedItem, onError, options) {
  var attempts = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 0;
  var err = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : null;
  var maxAttempts = options.maxAttempts,
      attemptDelay = options.attemptDelay;

  var logger = _getLogger(options);

  if (attempts >= maxAttempts) {
    logger.error('Attempted ' + attempts + ' times to obtain connection to changefeed without success. Giving up.', err.stack);
    return onError(err);
  } else if (attempts > 0) {
    logger.warn('Attempted ' + attempts + ' times to obtain connection to changefeed, but haven\'t yet succeeded; trying again.');
  }
  setTimeout(function () {
    _processChangeFeed(getFeed, onFeedItem, onError, options, attempts);
  }, attempts * attemptDelay); // linear back-off (0s, 10s, 20s, 30s, 40s ...)
}

function _getLogger(options) {
  var changefeedName = options.changefeedName,
      silent = options.silent,
      logger = options.logger;

  if (silent) {
    return {
      log: function log() {
        return null;
      },
      info: function info() {
        return null;
      },
      warn: function warn() {
        return null;
      },
      error: function error() {
        return null;
      }
    };
  }
  return {
    log: function log() {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      return logger.log.apply(logger, [changefeedName + ':'].concat(args));
    },
    info: function info() {
      for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      return logger.info.apply(logger, [changefeedName + ':'].concat(args));
    },
    warn: function warn() {
      for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
        args[_key3] = arguments[_key3];
      }

      return logger.warn.apply(logger, [changefeedName + ':'].concat(args));
    },
    error: function error() {
      for (var _len4 = arguments.length, args = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
        args[_key4] = arguments[_key4];
      }

      return logger.error.apply(logger, [changefeedName + ':'].concat(args));
    }
  };
}

function _defaultOptions() {
  return {
    maxAttempts: 10,
    attemptDelay: 10000,
    changefeedName: 'changefeed-' + Date.now(),
    silent: false,
    logger: global.console
  };
}

function _isConnectionError(err) {
  return err instanceof _error.ReqlServerError || err instanceof _error.ReqlDriverError;
}
module.exports = exports['default'];