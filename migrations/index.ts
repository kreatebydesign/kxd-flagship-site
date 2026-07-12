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
import * as migration_20260710_phase8b_launch_qa from './20260710_phase8b_launch_qa';
import * as migration_20260711_phase8c_client_communications from './20260711_phase8c_client_communications';
import * as migration_20260712_phase8e_client_actions from './20260712_phase8e_client_actions';
import * as migration_20260713_phase9a_executive_proposals from './20260713_phase9a_executive_proposals';
import * as migration_20260714_phase9c_proposal_conversion_contracts from './20260714_phase9c_proposal_conversion_contracts';
import * as migration_20260715_phase9d_financial_command_center from './20260715_phase9d_financial_command_center';
import * as migration_20260716_phase10a_performance_reports from './20260716_phase10a_performance_reports';
import * as migration_20260717_phase12a2_work_items from './20260717_phase12a2_work_items';
import * as migration_20260718_phase12a_ces_experience_profiles from './20260718_phase12a_ces_experience_profiles';
import * as migration_20260719_phase12a_ces_enabled_modules_json from './20260719_phase12a_ces_enabled_modules_json';
import * as migration_20260720_phase12a5_website_review_requests from './20260720_phase12a5_website_review_requests';
import * as migration_20260721_phase12c_website_review_v2 from './20260721_phase12c_website_review_v2';
import * as migration_20260722_phase12d_website_review_schema_ensure from './20260722_phase12d_website_review_schema_ensure';
import * as migration_20260723_phase12h_portal_welcome from './20260723_phase12h_portal_welcome';
import * as migration_20260724_phase13a_portal_users_active from './20260724_phase13a_portal_users_active';
import * as migration_20260725_phase14b_work_engine from './20260725_phase14b_work_engine';
import * as migration_20260726_phase18g_client_review_media_storage from './20260726_phase18g_client_review_media_storage';
import * as migration_20260727_phase20a_work_engine_foundation from './20260727_phase20a_work_engine_foundation';
import * as migration_20260728_phase20e_activity_engine from './20260728_phase20e_activity_engine';
import * as migration_20260729_phase20f_training_enablement from './20260729_phase20f_training_enablement';
import * as migration_20260730_phase20g_operations_experience from './20260730_phase20g_operations_experience';
import * as migration_20260731_phase24a_work_planned_for_date from './20260731_phase24a_work_planned_for_date';
import * as migration_20260801_phase25b_scheduling_domain from './20260801_phase25b_scheduling_domain';
import * as migration_20260802_phase26b1_active_proposal_integrity from './20260802_phase26b1_active_proposal_integrity';
import * as migration_20260803_phase26b1_active_unique_index from './20260803_phase26b1_active_unique_index';

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
  {
    up: migration_20260710_phase8b_launch_qa.up,
    down: migration_20260710_phase8b_launch_qa.down,
    name: '20260710_phase8b_launch_qa',
  },
  {
    up: migration_20260711_phase8c_client_communications.up,
    down: migration_20260711_phase8c_client_communications.down,
    name: '20260711_phase8c_client_communications',
  },
  {
    up: migration_20260712_phase8e_client_actions.up,
    down: migration_20260712_phase8e_client_actions.down,
    name: '20260712_phase8e_client_actions',
  },
  {
    up: migration_20260713_phase9a_executive_proposals.up,
    down: migration_20260713_phase9a_executive_proposals.down,
    name: '20260713_phase9a_executive_proposals',
  },
  {
    up: migration_20260714_phase9c_proposal_conversion_contracts.up,
    down: migration_20260714_phase9c_proposal_conversion_contracts.down,
    name: '20260714_phase9c_proposal_conversion_contracts',
  },
  {
    up: migration_20260715_phase9d_financial_command_center.up,
    down: migration_20260715_phase9d_financial_command_center.down,
    name: '20260715_phase9d_financial_command_center',
  },
  {
    up: migration_20260716_phase10a_performance_reports.up,
    down: migration_20260716_phase10a_performance_reports.down,
    name: '20260716_phase10a_performance_reports',
  },
  {
    up: migration_20260717_phase12a2_work_items.up,
    down: migration_20260717_phase12a2_work_items.down,
    name: '20260717_phase12a2_work_items',
  },
  {
    up: migration_20260718_phase12a_ces_experience_profiles.up,
    down: migration_20260718_phase12a_ces_experience_profiles.down,
    name: '20260718_phase12a_ces_experience_profiles',
  },
  {
    up: migration_20260719_phase12a_ces_enabled_modules_json.up,
    down: migration_20260719_phase12a_ces_enabled_modules_json.down,
    name: '20260719_phase12a_ces_enabled_modules_json',
  },
  {
    up: migration_20260720_phase12a5_website_review_requests.up,
    down: migration_20260720_phase12a5_website_review_requests.down,
    name: '20260720_phase12a5_website_review_requests',
  },
  {
    up: migration_20260721_phase12c_website_review_v2.up,
    down: migration_20260721_phase12c_website_review_v2.down,
    name: '20260721_phase12c_website_review_v2',
  },
  {
    up: migration_20260722_phase12d_website_review_schema_ensure.up,
    down: migration_20260722_phase12d_website_review_schema_ensure.down,
    name: '20260722_phase12d_website_review_schema_ensure',
  },
  {
    up: migration_20260723_phase12h_portal_welcome.up,
    down: migration_20260723_phase12h_portal_welcome.down,
    name: '20260723_phase12h_portal_welcome',
  },
  {
    up: migration_20260724_phase13a_portal_users_active.up,
    down: migration_20260724_phase13a_portal_users_active.down,
    name: '20260724_phase13a_portal_users_active',
  },
  {
    up: migration_20260725_phase14b_work_engine.up,
    down: migration_20260725_phase14b_work_engine.down,
    name: '20260725_phase14b_work_engine',
  },
  {
    up: migration_20260726_phase18g_client_review_media_storage.up,
    down: migration_20260726_phase18g_client_review_media_storage.down,
    name: '20260726_phase18g_client_review_media_storage',
  },
  {
    up: migration_20260727_phase20a_work_engine_foundation.up,
    down: migration_20260727_phase20a_work_engine_foundation.down,
    name: '20260727_phase20a_work_engine_foundation',
  },
  {
    up: migration_20260728_phase20e_activity_engine.up,
    down: migration_20260728_phase20e_activity_engine.down,
    name: '20260728_phase20e_activity_engine',
  },
  {
    up: migration_20260729_phase20f_training_enablement.up,
    down: migration_20260729_phase20f_training_enablement.down,
    name: '20260729_phase20f_training_enablement',
  },
  {
    up: migration_20260730_phase20g_operations_experience.up,
    down: migration_20260730_phase20g_operations_experience.down,
    name: '20260730_phase20g_operations_experience',
  },
  {
    up: migration_20260731_phase24a_work_planned_for_date.up,
    down: migration_20260731_phase24a_work_planned_for_date.down,
    name: '20260731_phase24a_work_planned_for_date',
  },
  {
    up: migration_20260801_phase25b_scheduling_domain.up,
    down: migration_20260801_phase25b_scheduling_domain.down,
    name: '20260801_phase25b_scheduling_domain',
  },
  {
    up: migration_20260802_phase26b1_active_proposal_integrity.up,
    down: migration_20260802_phase26b1_active_proposal_integrity.down,
    name: '20260802_phase26b1_active_proposal_integrity',
  },
  {
    up: migration_20260803_phase26b1_active_unique_index.up,
    down: migration_20260803_phase26b1_active_unique_index.down,
    name: '20260803_phase26b1_active_unique_index',
  },
];
