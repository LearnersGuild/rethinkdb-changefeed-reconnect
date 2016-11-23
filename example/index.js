if (!module.parent) {
  require('./example')()
    .catch(err => console.error(err))
}
