import * as migration_20260609_172230_init from './20260609_172230_init';
import * as migration_20260609_insights_expand from './20260609_insights_expand';
import * as migration_20260609_kxd_os_phase2a from './20260609_kxd_os_phase2a';
import * as migration_20260609_project_inquiries from './20260609_project_inquiries';
import * as migration_20260609_project_inquiries_status_expand from './20260609_project_inquiries_status_expand';
import * as migration_20260609_projects_expand from './20260609_projects_expand';
import * as migration_20260609_retainers_enhance from './20260609_retainers_enhance';
import * as migration_20260609_services_expand from './20260609_services_expand';
import * as migration_20260610_kxd_creative_engine from './20260610_kxd_creative_engine';
import * as migration_20260614_payload_locked_documents_expand from './20260614_payload_locked_documents_expand';
import * as migration_20260614_phase5b_reel_renderer from './20260614_phase5b_reel_renderer';
import * as migration_20260615_phase4a_creative_generation from './20260615_phase4a_creative_generation';
import * as migration_20260615_phase5a_promo_video_reels from './20260615_phase5a_promo_video_reels';
import * as migration_20260619_phase4a_client_onboarding from './20260619_phase4a_client_onboarding';
import * as migration_20260620_phase5a_client_portal from './20260620_phase5a_client_portal';
import * as migration_20260621_phase6a_website_auditor from './20260621_phase6a_website_auditor';
import * as migration_20260622_phase1_research_leads from './20260622_phase1_research_leads';
import * as migration_20260623_phase2a_junior_creators from './20260623_phase2a_junior_creators';
import * as migration_20260623_phase2a_payload_preferences_rels from './20260623_phase2a_payload_preferences_rels';
import * as migration_20260624_phase2b_junior_creator_shifts from './20260624_phase2b_junior_creator_shifts';
import * as migration_20260625_website_audit_abuse_protection from './20260625_website_audit_abuse_protection';
import * as migration_20260626_phase1_executive_client_profiles from './20260626_phase1_executive_client_profiles';
import * as migration_20260627_client_launch_timeline from './20260627_client_launch_timeline';
import * as migration_20260628_phase5b_infrastructure_manager from './20260628_phase5b_infrastructure_manager';
import * as migration_20260629_phase5d_executive_timeline from './20260629_phase5d_executive_timeline';
import * as migration_20260630_phase5e_automation_engine from './20260630_phase5e_automation_engine';
import * as migration_20260701_phase6a_sales_engine from './20260701_phase6a_sales_engine';
import * as migration_20260702_phase6b_client_acquisition from './20260702_phase6b_client_acquisition';
import * as migration_20260703_phase6c_executive_reporting from './20260703_phase6c_executive_reporting';
import * as migration_20260704_phase6e_executive_notes from './20260704_phase6e_executive_notes';
import * as migration_20260705_phase7a_kxd_brain from './20260705_phase7a_kxd_brain';
import * as migration_20260706_phase7e_playbooks_sop_engine from './20260706_phase7e_playbooks_sop_engine';
import * as migration_20260707_phase7f_client_success_engine from './20260707_phase7f_client_success_engine';
import * as migration_20260708_phase7h_client_work_manager from './20260708_phase7h_client_work_manager';
import * as migration_20260709_phase8a_kxd_genesis from './20260709_phase8a_kxd_genesis';

export const migrations = [
  {
    up: migration_20260609_172230_init.up,
    down: migration_20260609_172230_init.down,
    name: '20260609_172230_init',
  },
  {
    up: migration_20260609_insights_expand.up,
    down: migration_20260609_insights_expand.down,
    name: '20260609_insights_expand',
  },
  {
    up: migration_20260609_kxd_os_phase2a.up,
    down: migration_20260609_kxd_os_phase2a.down,
    name: '20260609_kxd_os_phase2a',
  },
  {
    up: migration_20260609_project_inquiries.up,
    down: migration_20260609_project_inquiries.down,
    name: '20260609_project_inquiries',
  },
  {
    up: migration_20260609_project_inquiries_status_expand.up,
    down: migration_20260609_project_inquiries_status_expand.down,
    name: '20260609_project_inquiries_status_expand',
  },
  {
    up: migration_20260609_projects_expand.up,
    down: migration_20260609_projects_expand.down,
    name: '20260609_projects_expand',
  },
  {
    up: migration_20260609_retainers_enhance.up,
    down: migration_20260609_retainers_enhance.down,
    name: '20260609_retainers_enhance',
  },
  {
    up: migration_20260609_services_expand.up,
    down: migration_20260609_services_expand.down,
    name: '20260609_services_expand',
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
    up: migration_20260614_phase5b_reel_renderer.up,
    down: migration_20260614_phase5b_reel_renderer.down,
    name: '20260614_phase5b_reel_renderer',
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
    up: migration_20260619_phase4a_client_onboarding.up,
    down: migration_20260619_phase4a_client_onboarding.down,
    name: '20260619_phase4a_client_onboarding',
  },
  {
    up: migration_20260620_phase5a_client_portal.up,
    down: migration_20260620_phase5a_client_portal.down,
    name: '20260620_phase5a_client_portal',
  },
  {
    up: migration_20260621_phase6a_website_auditor.up,
    down: migration_20260621_phase6a_website_auditor.down,
    name: '20260621_phase6a_website_auditor',
  },
  {
    up: migration_20260622_phase1_research_leads.up,
    down: migration_20260622_phase1_research_leads.down,
    name: '20260622_phase1_research_leads',
  },
  {
    up: migration_20260623_phase2a_junior_creators.up,
    down: migration_20260623_phase2a_junior_creators.down,
    name: '20260623_phase2a_junior_creators',
  },
  {
    up: migration_20260623_phase2a_payload_preferences_rels.up,
    down: migration_20260623_phase2a_payload_preferences_rels.down,
    name: '20260623_phase2a_payload_preferences_rels',
  },
  {
    up: migration_20260624_phase2b_junior_creator_shifts.up,
    down: migration_20260624_phase2b_junior_creator_shifts.down,
    name: '20260624_phase2b_junior_creator_shifts',
  },
  {
    up: migration_20260625_website_audit_abuse_protection.up,
    down: migration_20260625_website_audit_abuse_protection.down,
    name: '20260625_website_audit_abuse_protection',
  },
  {
    up: migration_20260626_phase1_executive_client_profiles.up,
    down: migration_20260626_phase1_executive_client_profiles.down,
    name: '20260626_phase1_executive_client_profiles',
  },
  {
    up: migration_20260627_client_launch_timeline.up,
    down: migration_20260627_client_launch_timeline.down,
    name: '20260627_client_launch_timeline',
  },
  {
    up: migration_20260628_phase5b_infrastructure_manager.up,
    down: migration_20260628_phase5b_infrastructure_manager.down,
    name: '20260628_phase5b_infrastructure_manager',
  },
  {
    up: migration_20260629_phase5d_executive_timeline.up,
    down: migration_20260629_phase5d_executive_timeline.down,
    name: '20260629_phase5d_executive_timeline',
  },
  {
    up: migration_20260630_phase5e_automation_engine.up,
    down: migration_20260630_phase5e_automation_engine.down,
    name: '20260630_phase5e_automation_engine',
  },
  {
    up: migration_20260701_phase6a_sales_engine.up,
    down: migration_20260701_phase6a_sales_engine.down,
    name: '20260701_phase6a_sales_engine',
  },
  {
    up: migration_20260702_phase6b_client_acquisition.up,
    down: migration_20260702_phase6b_client_acquisition.down,
    name: '20260702_phase6b_client_acquisition',
  },
  {
    up: migration_20260703_phase6c_executive_reporting.up,
    down: migration_20260703_phase6c_executive_reporting.down,
    name: '20260703_phase6c_executive_reporting',
  },
  {
    up: migration_20260704_phase6e_executive_notes.up,
    down: migration_20260704_phase6e_executive_notes.down,
    name: '20260704_phase6e_executive_notes',
  },
  {
    up: migration_20260705_phase7a_kxd_brain.up,
    down: migration_20260705_phase7a_kxd_brain.down,
    name: '20260705_phase7a_kxd_brain',
  },
  {
    up: migration_20260706_phase7e_playbooks_sop_engine.up,
    down: migration_20260706_phase7e_playbooks_sop_engine.down,
    name: '20260706_phase7e_playbooks_sop_engine',
  },
  {
    up: migration_20260707_phase7f_client_success_engine.up,
    down: migration_20260707_phase7f_client_success_engine.down,
    name: '20260707_phase7f_client_success_engine',
  },
  {
    up: migration_20260708_phase7h_client_work_manager.up,
    down: migration_20260708_phase7h_client_work_manager.down,
    name: '20260708_phase7h_client_work_manager',
  },
  {
    up: migration_20260709_phase8a_kxd_genesis.up,
    down: migration_20260709_phase8a_kxd_genesis.down,
    name: '20260709_phase8a_kxd_genesis',
  },
];
