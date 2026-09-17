import { Prospect } from './prospect';

// Define el tipo para el objeto asignado — `createdBy` real trae además
// email/phone (verificado real contra `requests.service.ts#findOne()`,
// `select: { id, fullName, email, phone }`); `assignedUser` no trae
// `phone` pero al ser opcionales ambos comparten el mismo tipo sin problema.
interface SimpleUser {
    id: string;
    fullName: string;
    email?: string;
    phone?: string;
}

// Deuda técnica menor (2026-09-16) — enums reales, verificados contra
// `columns.tsx` (statusStyles/statusLabels/priorityConfig) y
// `MODULE_BY_TYPE`, único lugar donde ya se declaraban estos valores
// literales sin un tipo compartido.
export type RequestType = 'SECURITY_APP' | 'LEGISLATIVE' | 'INTERNAL';
export type RequestStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type RequestPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface RequestItem {
    id: number;
    type: RequestType;
    subject: string;
    description: string;
    status: RequestStatus;
    priority: RequestPriority;
    createdAt: string;

    createdBy: SimpleUser | null;

    lat: number;
    lng: number;

    // Relaciones (opcionales)
    assignedUserId: string | null;
    prospectId: string | null;

    // Objetos anidados
    assignedUser: SimpleUser | null;
    prospect: Prospect | null;

    // Campos adicionales
    imageUrl: string | null;
    documentUrl?: string | null;
    responseComments?: string | null;
    locality: { id: number; name: string } | null;
    publicCode: string | null;
    accessKey: string | null;
    externalCode: string | null; // Como 'RAD-2025-888'
}