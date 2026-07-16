// Jest `setupFiles` entry: runs in-process, before each test file's module
// imports, so `process.env.DATABASE_URL` etc. point at the test DB before
// any test file imports AppModule (which reads them at import time).
require('dotenv').config({
  path: require('path').resolve(__dirname, '../.env.test'),
});
