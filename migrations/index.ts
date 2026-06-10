import * as migration_20260609_172230_init from './20260609_172230_init';
import * as migration_20260609_services_expand from './20260609_services_expand';
import * as migration_20260609_projects_expand from './20260609_projects_expand';
import * as migration_20260609_project_inquiries from './20260609_project_inquiries';
import * as migration_20260609_insights_expand from './20260609_insights_expand';
import * as migration_20260609_project_inquiries_status_expand from './20260609_project_inquiries_status_expand';
import * as migration_20260609_kxd_os_phase2a from './20260609_kxd_os_phase2a';
import * as migration_20260609_retainers_enhance from './20260609_retainers_enhance';
import * as migration_20260610_kxd_creative_engine from './20260610_kxd_creative_engine';

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
  {
    up: migration_20260609_project_inquiries_status_expand.up,
    down: migration_20260609_project_inquiries_status_expand.down,
    name: '20260609_project_inquiries_status_expand',
  },
  {
    up: migration_20260609_kxd_os_phase2a.up,
    down: migration_20260609_kxd_os_phase2a.down,
    name: '20260609_kxd_os_phase2a',
  },
  {
    up: migration_20260609_retainers_enhance.up,
    down: migration_20260609_retainers_enhance.down,
    name: '20260609_retainers_enhance',
  },
  {
    up: migration_20260610_kxd_creative_engine.up,
    down: migration_20260610_kxd_creative_engine.down,
    name: '20260610_kxd_creative_engine',
  },
];
