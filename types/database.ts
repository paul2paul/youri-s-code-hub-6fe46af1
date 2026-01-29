export type StakeholderRole = 'PRESIDENT' | 'SHAREHOLDER' | 'ACCOUNTANT';
export type DocumentType = 'STATUTS' | 'PACTE' | 'PRIOR_PV' | 'ACCOUNTS' | 'CAPTABLE' | 'OTHER';
export type TaskType = 'COLLECT_YEAR_INPUTS' | 'COLLECT_ACCOUNTS' | 'DRAFT_AGM_PACK' | 'SEND_CONVOCATIONS' | 'HOLD_AGM' | 'FILE_ACCOUNTS' | 'ARCHIVE';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED' | 'LATE';
export type OwnerRole = 'PRESIDENT' | 'ACCOUNTANT';
export type NudgeChannel = 'SLACK' | 'EMAIL';
export type GovernanceBodyType = 'PRESIDENT' | 'DIRECTEUR_GENERAL' | 'DIRECTEUR_GENERAL_DELEGUE' | 'COMITE_DIRECTION' | 'CONSEIL_SURVEILLANCE' | 'COMITE_STRATEGIQUE' | 'OTHER';

export interface Company {
  id: string;
  user_id: string;
  name: string;
  siren?: string;
  legal_form: string;
  jurisdiction: string;
  fiscal_year_end: string;
  timezone: string;
  president_name: string;
  president_email: string;
  created_at: string;
  updated_at: string;
}

export interface Stakeholder {
  id: string;
  company_id: string;
  role: StakeholderRole;
  name: string;
  email: string;
  share_percentage?: number;
  created_at: string;
}

export interface Document {
  id: string;
  company_id: string;
  type: DocumentType;
  file_path: string;
  file_name: string;
  uploaded_at: string;
  version_label?: string;
}

export interface GovernanceProfile {
  id: string;
  company_id: string;
  notice_period_days?: number | null;
  approval_deadline_days?: number | null;
  quorum_rules_summary?: string | null;
  majority_rules_summary?: string | null;
  who_can_convene?: string | null;
  meeting_modality_rules: unknown;
  annual_obligations: unknown;
  special_clauses_flags: unknown;
  open_questions: unknown;
  created_at: string;
}

export interface GovernanceBody {
  id: string;
  company_id: string;
  body_type: GovernanceBodyType;
  name: string;
  holder_name?: string | null;
  powers_summary?: string | null;
  appointment_rules?: string | null;
  term_duration?: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  company_id: string;
  cycle_year: number;
  type: TaskType;
  title: string;
  due_date: string;
  owner_role: OwnerRole;
  status: TaskStatus;
  depends_on_task?: string | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
}

export interface YearContext {
  id: string;
  company_id: string;
  cycle_year: number;
  events_summary?: string;
  capital_change: boolean;
  governance_change: boolean;
  dividends: boolean;
  exceptions?: string;
  confirmed_by_president_at?: string;
  created_at: string;
}

export interface TaskNudge {
  id: string;
  task_id: string;
  channel: NudgeChannel;
  sent_at: string;
  payload: Record<string, unknown>;
}

export interface CompanySetupForm {
  name: string;
  fiscal_year_end: string;
  president_name: string;
  president_email: string;
  siren?: string;
}

export interface YearInputForm {
  capital_change: boolean;
  governance_change: boolean;
  dividends: boolean;
  events_summary: string;
  exceptions?: string;
}
