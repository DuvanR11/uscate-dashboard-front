// src/types/request.ts
import { RequestType, Priority, RequestStatus } from '@prisma/client'; // Importa los Enums de Prisma
import { Prospect } from './prospect';

// Define el tipo para el objeto asignado
interface SimpleUser {
    id: string;
    fullName: string;
}

// Define el tipo para el prospecto asociado (si existe)
interface SimpleProspect {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
}

export interface RequestItem {
    id: number;
    type: RequestType; // Ej: 'SECURITY_APP', 'LEGISLATIVE', 'INTERNAL'
    subject: string;
    description: string;
    status: RequestStatus; // Ej: 'PENDING', 'IN_PROGRESS', 'COMPLETED'
    priority: Priority; // Ej: 'HIGH', 'MEDIUM', 'CRITICAL'
    createdAt: string;

    createdBy: any;
    
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
    locality: any;
    publicCode: string | null;
    accessKey: string | null;
    externalCode: string | null; // Como 'RAD-2025-888'
}