export interface Tag {
  id: number;
  name: string;
}

export interface Segment {
  id: number;
  name: string;
}

export interface Leader {
  id: string;
  fullName: string;
  email?: string;
}

export interface Prospect {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  documentNumber?: string;
  voteConfirmed?: boolean;
  
  // Relaciones Anidadas
  leader?: Leader | null;    // Importante para la columna de Líder
  segment?: Segment | null;  // Importante para la columna de Segmento
  tags?: Tag[];              // Importante para la columna de Intereses
  
  municipality?: {
      id: number;
      name: string;
  };

  occupation?: {
      id: number;
      name: string;
  } | null;

  createdAt: string;
  status?: string;
}