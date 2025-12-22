export type UserRole = 
  | 'SUPER_ADMIN' 
  | 'ADMIN' 
  | 'SECRETARY' 
  | 'LEADER' 
  | 'LAWYER' 
  | 'CITIZEN';
  
export interface User {
  id: string;
  fullName: string;
  documentNumber: string; 
  phone: string;         
  locality: any;
  email: string;
  isActive: boolean;
  requestsGoal: number;
  createdAt: string;
  role: { // Objeto anidado
    id: number;
    name: string;
    code: UserRole; // Asegura que los códigos sean conocidos
  };
}