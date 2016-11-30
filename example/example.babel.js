/* eslint-disable no-console, camelcase */
import rethinkdbdash from 'rethinkdbdash'

import processChangefeed from '../lib'

const TMP_DB_NAME_PREFIX = '_changefeedReconnectTest_'
const tmpDbName = `${TMP_DB_NAME_PREFIX}${Date.now()}`
const tableName = 'changefeedItems'
const r = rethinkdbdash({servers: [{host: 'localhost', port: 28015}], silent: true})

export default async function go() {
  try {
    // ignore this setup / helper stuff
    await _cleanupOldTestDatabases()
    await _createTestDatabaseAndTable()

    // this is the example of how to set up your changefeed with auto-reconnect
    processChangefeed(getFeed, handleFeedItem, handleError, {
      changefeedName: `${tmpDbName}-${tableName} feed`,
      attemptDelay: 3000,
      maxAttempts: 30,
      silent: false,
    })
  } catch (err) {
    handleError(err)
  }
}

function getFeed() {
  return r
    .db(tmpDbName)
    .table(tableName)
    .orderBy({index: r.desc('updatedAt')})
    .limit(3)
    .changes()
    .filter(r.row('old_val').eq(null))
}

function handleFeedItem({new_val: feedItem}) {
  console.log({feedItem})
}

function handleError(err) {
  console.error(err.stack)
}

// -- helpers for this example

async function _cleanupOldTestDatabases() {
  const dbList = await r.dbList()
  const drops = dbList
    .filter(name => name.startsWith(TMP_DB_NAME_PREFIX))
    .map(dbName => r.dbDrop(dbName))
  await Promise.all(drops)
}

async function _createTestDatabaseAndTable() {
  await r.dbCreate(tmpDbName)
  await r.db(tmpDbName).tableCreate(tableName) // add {replicas: XX} if on a cluster
  await r.db(tmpDbName).table(tableName).indexCreate('updatedAt')
  await r.db(tmpDbName).table(tableName).indexWait()
}
