export type ComplaintType = 'DENUNCIA' | 'DEMANDA';
export type ComplaintStatus = 'RECEIVED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESPONDED' | 'CLOSED';
export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ComplaintAttachment {
  id: number;
  url: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  source: 'CITIZEN' | 'STAFF';
  uploadedByUserId?: string | null;
  createdAt: string;
}

export interface ComplaintTimelineEvent {
  id: number;
  status: ComplaintStatus;
  note: string | null;
  createdByUserId?: string | null;
  createdAt: string;
}

interface SimpleUser {
  id: string;
  fullName: string;
  email?: string;
}

interface SimpleProspect {
  id: string;
  firstName: string;
  lastName: string;
  documentNumber: string | null;
  phone: string | null;
  email: string | null;
}

export interface ComplaintItem {
  id: number;
  type: ComplaintType;
  subject: string;
  description: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  publicCode: string;
  accessKey: string;

  prospect: SimpleProspect | null;
  assignedUser: SimpleUser | null;
  assignedByUser: SimpleUser | null;

  responseText: string | null;
  respondedAt: string | null;
  resolutionNotes: string | null;
  closedAt: string | null;

  attachments: ComplaintAttachment[];
  timeline: ComplaintTimelineEvent[];

  createdAt: string;
  updatedAt: string;
}
