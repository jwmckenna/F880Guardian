
export enum AuditStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}

export enum ComplianceRating {
  RED = 'RED',       // < 80%
  YELLOW = 'YELLOW', // 80% - 94%
  GREEN = 'GREEN'    // 95%+
}

export interface AuditQuestion {
  id: string;
  category: string;
  text: string;
}

export interface AuditResponse {
  questionId: string;
  status: 'pass' | 'fail' | 'na';
  comment?: string;
  imageUri?: string; // Base64 string
}

export interface AuditRecord {
  id: string;
  facilityName: string; // Added for multi-location support
  timestamp: number;
  auditorName: string;
  location: string;
  responses: AuditResponse[];
  status: AuditStatus;
  overallScore: number; // 0-100
  aiAnalysis?: string; // QAPI summary from Gemini
}

export interface LocationOption {
  id: string;
  name: string;
}

// Standard F880 Surveillance Categories
export const AUDIT_CATEGORIES = [
  "Hand Hygiene",
  "PPE Usage",
  "Environmental Cleaning",
  "Isolation Precautions",
  "Resident Care Equipment"
];
