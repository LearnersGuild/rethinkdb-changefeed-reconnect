/* eslint-disable import/no-unassigned-import */
require('babel-core/register')
require('babel-polyfill')

if (!module.parent) {
  require('./example')()
    .catch(err => console.error(err))
}
