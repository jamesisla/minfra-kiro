/**
 * Tipos de entidades del dominio, espejo de los schemas Pydantic
 * en apps/api/app/schemas/. Mantener sincronizados manualmente o
 * generar automáticamente (ver docs/architecture/README.md).
 */

export interface User {
  id: string; // UUID
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
}

export interface UserCreate {
  email: string;
  full_name: string;
  password: string;
}

export interface UserUpdate {
  email?: string;
  full_name?: string;
  is_active?: boolean;
}
