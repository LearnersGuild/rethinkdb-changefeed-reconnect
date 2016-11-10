import test from 'blue-tape'
import {ReqlDriverError} from 'rethinkdbdash/lib/error'

import processChangeFeedWithAutoReconnect from '../index'

test('processChangeFeedWithAutoReconnect', t => {
  let loggedArgs = null
  const logger = {
    log: (...args) => {
      loggedArgs = args
    },
    info: (...args) => {
      loggedArgs = args
    },
    warn: (...args) => {
      loggedArgs = args
    },
    error: (...args) => {
      loggedArgs = args
    },
  }

  const getOptions = opts => ({
    maxAttempts: 2,
    silent: true,
    attemptDelay: 10,
    changefeedName: 'test feed',
    logger,
    ...opts,
  })

  const noOp = () => null

  let onErrorCalled = false
  const onError = err => {
    if (err.message.includes('simulated')) {
      onErrorCalled = true
    }
  }

  let onFeedItemCalled = false
  const onFeedItem = item => {
    if (item.the === 'item') {
      onFeedItemCalled = true
    }
  }

  const successfulGetFeed = () => {
    return Promise.resolve({
      each: onCursorEach => {
        onCursorEach(null, {the: 'item'})
      }
    })
  }

  const nonConnectionErrorOnCursorGetFeed = () => {
    return Promise.resolve({
      each: onCursorEach => {
        onCursorEach(new Error('simulated'))
      }
    })
  }

  const nonConnectionErrorOnGetFeed = () => {
    return Promise.reject(new Error('simulated'))
  }

  let connectionErrorOnCursorGetFeedAttempts = 0
  const connectionErrorOnCursorGetFeed = () => {
    connectionErrorOnCursorGetFeedAttempts += 1
    if (connectionErrorOnCursorGetFeedAttempts === 1) {
      return Promise.resolve({
        each: onCursorEach => {
          onCursorEach(new ReqlDriverError('simulated'))
        }
      })
    }
    return Promise.reject(new ReqlDriverError('simulated'))
  }

  let connectionErrorOnGetFeedAttempts = 0
  const connectionErrorOnGetFeed = () => {
    connectionErrorOnGetFeedAttempts += 1
    return Promise.reject(new ReqlDriverError('simulated'))
  }

  const timeoutPromise = (setup, runTests, timeoutMillis = 200) => {
    return new Promise((resolve, reject) => {
      setup()
      setTimeout(() => {
        try {
          runTests()
          resolve()
        } catch (err) {
          reject(err)
        }
      }, timeoutMillis)
    })
  }

  t.test('option: maxAttempts', tt => {
    tt.test('attempts to reconnect `maxAttempts` times when connection-related errors occur', ttt => {
      ttt.plan(2)

      ttt.test('when trying to process the cursor', tttt => {
        const options = getOptions()
        connectionErrorOnCursorGetFeedAttempts = 0
        return timeoutPromise(
          () => processChangeFeedWithAutoReconnect(connectionErrorOnCursorGetFeed, noOp, noOp, options),
          () => {
            // maxAttempts + 1 because the first attempt will rightfully succeed
            tttt.equal(connectionErrorOnCursorGetFeedAttempts, options.maxAttempts + 1, 'attempts !== maxAttempts')
          }
        )
      })

      ttt.test('when trying to get the feed itself', tttt => {
        const options = getOptions()
        connectionErrorOnGetFeedAttempts = 0
        return timeoutPromise(
          () => processChangeFeedWithAutoReconnect(connectionErrorOnGetFeed, noOp, noOp, options),
          () => tttt.equal(connectionErrorOnGetFeedAttempts, options.maxAttempts, 'attempts !== maxAttempts')
        )
      })
    })

    tt.test('invokes onError when maximum number of attempts has been exceeded', ttt => {
      onErrorCalled = false
      return timeoutPromise(
        () => processChangeFeedWithAutoReconnect(connectionErrorOnGetFeed, noOp, onError, getOptions()),
        () => ttt.equal(onErrorCalled, true, 'onError not called after exceeding maxAttempts')
      )
    })
  })

  t.test('option: attemptDelay', tt => {
    tt.test('waits at least `attemptDelay` ms between each attempt', ttt => {
      connectionErrorOnGetFeedAttempts = 0
      return timeoutPromise(
        () => {
          const options = getOptions({attemptDelay: 300, maxAttempts: 2})
          processChangeFeedWithAutoReconnect(connectionErrorOnGetFeed, noOp, noOp, options)
        },
        () => ttt.equal(connectionErrorOnGetFeedAttempts, 1, 'did not wait at least `attemptDelay` ms between each attempt'),
      )
    })
  })

  t.test('option: silent', tt => {
    tt.plan(2)

    tt.test('when true', ttt => {
      loggedArgs = null
      return timeoutPromise(
        () => processChangeFeedWithAutoReconnect(successfulGetFeed, noOp, noOp, {silent: true, logger}),
        () => ttt.equal(loggedArgs, null, 'logging was called when silent === true')
      )
    })

    tt.test('when false', ttt => {
      loggedArgs = null
      return timeoutPromise(
        () => processChangeFeedWithAutoReconnect(successfulGetFeed, noOp, noOp, {silent: false, logger}),
        () => ttt.equal(loggedArgs.length > 0, true, 'logging was not called when silent === false')
      )
    })
  })

  t.test('onError: invoked when non-connection-related errors occur', tt => {
    tt.plan(2)

    tt.test('when trying to process the cursor', ttt => {
      onErrorCalled = false
      return timeoutPromise(
        () => processChangeFeedWithAutoReconnect(nonConnectionErrorOnCursorGetFeed, noOp, onError, getOptions()),
        () => ttt.equal(onErrorCalled, true, 'onError not called for non-connection-related error')
      )
    })

    tt.test('when trying to get the feed itself', ttt => {
      onErrorCalled = false
      return timeoutPromise(
        () => processChangeFeedWithAutoReconnect(nonConnectionErrorOnGetFeed, noOp, onError, getOptions()),
        () => ttt.equal(onErrorCalled, true, 'onError not called for non-connection-related error')
      )
    })
  })

  t.test('onFeedItem: invoked for each new feed item in the cursor', tt => {
    onFeedItemCalled = false
    return timeoutPromise(
      () => processChangeFeedWithAutoReconnect(successfulGetFeed, onFeedItem, noOp, getOptions()),
      () => tt.equal(onFeedItemCalled, true, 'onFeedItem was not called')
    )
  })
})
