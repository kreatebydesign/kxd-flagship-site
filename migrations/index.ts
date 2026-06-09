import * as migration_20260609_172230_init from './20260609_172230_init';

export const migrations = [
  {
    up: migration_20260609_172230_init.up,
    down: migration_20260609_172230_init.down,
    name: '20260609_172230_init'
  },
];
