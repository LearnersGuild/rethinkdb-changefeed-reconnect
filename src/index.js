import {ReqlDriverError, ReqlServerError} from 'rethinkdbdash/lib/error'

export default function processChangeFeedWithAutoReconnect(getFeed, onFeedItem, onError, options = {}) {
  options = Object.assign({}, _defaultOptions(), options)
  _processChangeFeedWithAutoReconnect(getFeed, onFeedItem, onError, options)
}

/* eslint-disable max-params */
function _processChangeFeedWithAutoReconnect(getFeed, onFeedItem, onError, options, attempts = 0, err = null) {
  const {
    maxAttempts,
    attemptDelay,
  } = options
  const logger = _getLogger(options)

  if (attempts >= maxAttempts) {
    logger.error(`Attempted ${attempts} times to obtain connection to changefeed without success. Giving up.`, err.stack)
    return onError(err)
  } else if (attempts > 0) {
    logger.warn(`Attempted ${attempts} times to obtain connection to changefeed, but haven't yet succeeded; trying again.`)
  }
  setTimeout(() => {
    _processChangeFeed(getFeed, onFeedItem, onError, options, attempts)
  }, attempts * attemptDelay) // linear back-off (0s, 10s, 20s, 30s, 40s ...)
}

/* eslint-disable max-params */
async function _processChangeFeed(getFeed, onFeedItem, onError, options, attempts) {
  const logger = _getLogger(options)
  try {
    const cursor = await getFeed()
    logger.info('Successfully obtained connection to changefeed.')
    cursor.each((err, result) => {
      if (err) {
        if (_isConnectionError(err)) {
          // if we get here, we've connected successfully _at least_ once, so we
          // reset our number of `attempts` to 0
          return _processChangeFeedWithAutoReconnect(getFeed, onFeedItem, onError, options, 0, err)
        }
        logger.error(err.stack)
        return onError(err)
      }
      onFeedItem(result)
    })
  } catch (err) {
    if (_isConnectionError(err)) {
      return _processChangeFeedWithAutoReconnect(getFeed, onFeedItem, onError, options, attempts + 1, err)
    }
    logger.error(err.stack)
    return onError(err)
  }
}

function _getLogger(options) {
  const {changefeedName, silent, logger} = options
  if (silent) {
    return {
      log: () => null,
      info: () => null,
      warn: () => null,
      error: () => null,
    }
  }
  return {
    log: (...args) => logger.log(`${changefeedName}:`, ...args),
    info: (...args) => logger.info(`${changefeedName}:`, ...args),
    warn: (...args) => logger.warn(`${changefeedName}:`, ...args),
    error: (...args) => logger.error(`${changefeedName}:`, ...args),
  }
}

function _defaultOptions() {
  return {
    maxAttempts: 10,
    attemptDelay: 10000,
    changefeedName: `changefeed-${Date.now()}`,
    silent: false,
    logger: global.console,
  }
}

function _isConnectionError(err) {
  // FIXME: I'm not terribly happy about this particular logic, but
  // unfortunately, rethinkdbdash doesn't provide a consistent error type (or
  // even message) when it's having trouble connecting to a changefeed,
  // particularly if it is connecting via a rethinkdb proxy server.
  return (err instanceof ReqlServerError) ||
    (err instanceof ReqlDriverError) ||
    (err.msg && err.msg.match(/Changefeed\saborted/)) ||
    (err.msg && err.msg.match(/primary\sreplica.*not\savailable/))
}
