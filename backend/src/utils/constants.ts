/**
 * Constantes y tipos para validación
 * (SQLite no soporta enums nativos)
 */

export const Rol = {
  ADMIN: 'ADMIN',
  EMPLEADO: 'EMPLEADO',
} as const;

export type RolType = typeof Rol[keyof typeof Rol];

export const AsistenciaTipo = {
  ENTRADA: 'ENTRADA',
  SALIDA: 'SALIDA',
} as const;

export type AsistenciaTipoType = typeof AsistenciaTipo[keyof typeof AsistenciaTipo];

export const ExcepcionTipo = {
  VACACION: 'VACACION',
  INCAPACIDAD: 'INCAPACIDAD',
  PERMISO: 'PERMISO',
} as const;

export type ExcepcionTipoType = typeof ExcepcionTipo[keyof typeof ExcepcionTipo];

// Funciones de validación
export function isValidRol(value: string): value is RolType {
  return Object.values(Rol).includes(value as RolType);
}

export function isValidAsistenciaTipo(value: string): value is AsistenciaTipoType {
  return Object.values(AsistenciaTipo).includes(value as AsistenciaTipoType);
}

export function isValidExcepcionTipo(value: string): value is ExcepcionTipoType {
  return Object.values(ExcepcionTipo).includes(value as ExcepcionTipoType);
}