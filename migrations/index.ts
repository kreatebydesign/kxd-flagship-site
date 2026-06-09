import * as migration_20260609_172230_init from './20260609_172230_init';
import * as migration_20260609_services_expand from './20260609_services_expand';
import * as migration_20260609_projects_expand from './20260609_projects_expand';
import * as migration_20260609_project_inquiries from './20260609_project_inquiries';
import * as migration_20260609_insights_expand from './20260609_insights_expand';

export const migrations = [
  {
    up: migration_20260609_172230_init.up,
    down: migration_20260609_172230_init.down,
    name: '20260609_172230_init',
  },
  {
    up: migration_20260609_services_expand.up,
    down: migration_20260609_services_expand.down,
    name: '20260609_services_expand',
  },
  {
    up: migration_20260609_projects_expand.up,
    down: migration_20260609_projects_expand.down,
    name: '20260609_projects_expand',
  },
  {
    up: migration_20260609_project_inquiries.up,
    down: migration_20260609_project_inquiries.down,
    name: '20260609_project_inquiries',
  },
  {
    up: migration_20260609_insights_expand.up,
    down: migration_20260609_insights_expand.down,
    name: '20260609_insights_expand',
  },
];
