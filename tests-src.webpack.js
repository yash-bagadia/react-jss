/* eslint-disable no-var */
// This file for local tests runner.
var context = require.context('./src', true, /\.test\.js$/)
context.keys().forEach(context)
