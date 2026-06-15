import * as migration_20260609_172230_init from './20260609_172230_init';
import * as migration_20260609_services_expand from './20260609_services_expand';
import * as migration_20260609_projects_expand from './20260609_projects_expand';
import * as migration_20260609_project_inquiries from './20260609_project_inquiries';
import * as migration_20260609_insights_expand from './20260609_insights_expand';
import * as migration_20260609_project_inquiries_status_expand from './20260609_project_inquiries_status_expand';
import * as migration_20260609_kxd_os_phase2a from './20260609_kxd_os_phase2a';
import * as migration_20260609_retainers_enhance from './20260609_retainers_enhance';
import * as migration_20260610_kxd_creative_engine from './20260610_kxd_creative_engine';
import * as migration_20260614_payload_locked_documents_expand from './20260614_payload_locked_documents_expand';
import * as migration_20260615_phase4a_creative_generation from './20260615_phase4a_creative_generation';
import * as migration_20260615_phase5a_promo_video_reels from './20260615_phase5a_promo_video_reels';
import * as migration_20260614_phase5b_reel_renderer from './20260614_phase5b_reel_renderer';

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
  {
    up: migration_20260614_payload_locked_documents_expand.up,
    down: migration_20260614_payload_locked_documents_expand.down,
    name: '20260614_payload_locked_documents_expand',
  },
  {
    up: migration_20260615_phase4a_creative_generation.up,
    down: migration_20260615_phase4a_creative_generation.down,
    name: '20260615_phase4a_creative_generation',
  },
  {
    up: migration_20260615_phase5a_promo_video_reels.up,
    down: migration_20260615_phase5a_promo_video_reels.down,
    name: '20260615_phase5a_promo_video_reels',
  },
  {
    up: migration_20260614_phase5b_reel_renderer.up,
    down: migration_20260614_phase5b_reel_renderer.down,
    name: '20260614_phase5b_reel_renderer',
  },
];
