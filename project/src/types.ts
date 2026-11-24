export type MachineStatus = 'normal' | 'warning' | 'critical';

export interface MachineTelemetry {
  time: string;
  temperature: number;
  vibration: number;
  power: number;
}

export interface ShapContribution {
  feature: string;
  label: string;
  impact: number;
  value: string;
}

export interface MachineMLInsights {
  failureProbability: number;
  anomalyScore: number;
  driftLevel: 'Low' | 'Moderate' | 'Severe';
  rulHours: number;
  shapWaterfall: ShapContribution[];
  primaryDiagnosis: string;
  decisionRule: string;
}

export interface Machine {
  id: string;
  name: string;
  type: string;
  station: string;
  status: MachineStatus;
  temperature: number;
  tempBearing?: number;
  tempMotor?: number;
  vibration: number;
  power: number;
  healthScore: number;
  /** Live backend failure risk percentage when available. */
  failureRisk?: number;
  rupeesAtRisk?: number;
  downtimeHours: number;
  downtimeEvents: number;
  thresholds: {
    tempWarn: number;
    tempCritical: number;
    vibWarn: number;
    vibCritical: number;
    powerWarn: number;
    powerCritical: number;
  };
  issues: string[];
  primaryIssue?: { label: string; category: IssueCategory };
  recommendedAction: string;
  priority: 'Low' | 'Medium' | 'High';
  addressed: boolean;
  telemetry: MachineTelemetry[];
  mlInsights?: MachineMLInsights;
}

export interface ProductionStation {
  id: string;
  name: string;
  throughput: number;
  units: string;
}

export interface EnergyReading {
  machineId: string;
  machineName: string;
  powerDraw: number;
  referencePower: number;
  operatingHours: number;
  status: MachineStatus;
  idlePower?: number;
}

export type IssueCategory = 'mechanical' | 'electrical' | 'production';

export interface CriticalIssue {
  id: string;
  source: 'machine' | 'station' | 'energy';
  machineId?: string;
  stationId?: string;
  title: string;
  detail: string;
  action: string;
  page: PageId;
  severity: 'warning' | 'critical';
  category: IssueCategory;
}

export type ManagerPageId =
  | 'overview'
  | 'machines'
  | 'business'
  | 'workorders'
  | 'inventory'
  | 'team'
  | 'notices';

export type WorkerPageId = 'tasks' | 'history' | 'knowledge';
export type PageId = ManagerPageId;

export type Role = 'admin' | 'supervisor' | 'worker' | 'manager';

export interface Worker {
  id: string;
  name: string;
  username?: string;
  email: string;
  jobTitle: string;
  skills: IssueCategory[];
  specialization?: string;
  shift?: 'Morning' | 'Evening' | 'Night';
  available: boolean;
  stationId?: string;
  supervisorId?: string;
}

export interface Manager {
  id: string;
  name: string;
  username?: string;
  email: string;
  jobTitle: string;
}

export interface Supervisor {
  id: string;
  name: string;
  username?: string;
  email: string;
  jobTitle: string;
  stationId: string;
  stationName: string;
}

export interface Session {
  userId: string;
  role: Role;
  username?: string;
  name?: string;
  stationId?: string;
  supervisorId?: string;
  specialization?: string;
  available?: boolean;
}

export type Priority = 'Low' | 'Medium' | 'High';

export type WorkOrderStatus =
  | 'pending_admin'
  | 'assigned_to_supervisor'
  | 'assigned_to_worker'
  | 'accepted'
  | 'in_progress'
  | 'blocked'
  | 'awaiting_verification'
  | 'closed'
  | 'cancelled'
  | 'assigned'
  | 'awaiting_confirmation'
  | 'resolved';

export interface WorkOrderEvent {
  at: string;
  by: string;
  byName: string;
  kind:
    | 'created'
    | 'assigned'
    | 'assigned_supervisor'
    | 'assigned_worker'
    | 'accepted'
    | 'rejected'
    | 'reassigned'
    | 'started'
    | 'blocked'
    | 'note'
    | 'solved'
    | 'confirmed'
    | 'verified_closed'
    | 'verification_rejected'
    | 'reopened';
  message: string;
}

export interface WorkOrderChecklist {
  lockoutTagout: boolean;
  inspectionDone: boolean;
  clearanceLogged: string;
  lubricationTopped: boolean;
}

export interface WorkOrder {
  id: string;
  issueKey: string;
  source: CriticalIssue['source'];
  machineId?: string;
  stationId?: string;
  title: string;
  detail: string;
  action: string;
  severity: 'warning' | 'critical';
  priority: Priority;
  specializationRequired?: string;
  spareParts?: string;
  safetyInstructions?: string;
  assigneeId?: string;
  assignedById: string;
  supervisorId?: string;
  managerNote: string;
  workerNotes?: string;
  blockedReason?: string;
  verificationNotes?: string;
  status: WorkOrderStatus;
  createdAt: string;
  dueAt: string;
  resolvedAt?: string;
  impactINR?: number;
  timeline: WorkOrderEvent[];
  checklist?: WorkOrderChecklist;
}

export interface Notice {
  id: string;
  workOrderId: string;
  kind: WorkOrderEvent['kind'] | string;
  workerId: string;
  workerName: string;
  targetRole?: string;
  stationId?: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}


export interface ShapFeature {
  feature: string;
  label: string;
  value: number;
  shap_impact: number;
  contribution_pct: number;
}

export interface ShapExplanation {
  modelType: string;
  anomalyScore: number;
  isAnomaly: boolean;
  failureRiskPct: number;
  diagnosisSummary: string;
  topFeatures: ShapFeature[];
}

export interface OEEData {
  overallOEE: number;
  availability: number;
  performance: number;
  quality: number;
  benchmark: number;
  status: string;
}

export interface StationBuffer {
  id: string;
  fromStation: string;
  toStation: string;
  currentWIP: number;
  maxCapacity: number;
  status: 'normal' | 'congested' | 'starved';
  description: string;
}

export interface RetrofitROI {
  sensorKitCostINR: number;
  installationCostINR: number;
  monthlySavingsINR: number;
  paybackMonths: number;
  firstYearNetGainINR: number;
}
