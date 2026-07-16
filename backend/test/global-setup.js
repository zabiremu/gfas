// Jest `globalSetup`: runs once, in a separate process, before any test
// files run. Applies pending migrations to the test DB so every e2e run
// starts from a fully migrated schema (never `synchronize`) — matches how
// production is provisioned.
require('dotenv').config({
  path: require('path').resolve(__dirname, '../.env.test'),
});
// transpile-only: full type-checking isn't needed to run migrations, and
// avoids a ts-node/tsconfig "module: nodenext" incompatibility in full mode.
require('ts-node/register/transpile-only');

module.exports = async () => {
  const { default: AppDataSource } = require('../src/data-source');
  await AppDataSource.initialize();
  await AppDataSource.runMigrations();
  await AppDataSource.destroy();
};
