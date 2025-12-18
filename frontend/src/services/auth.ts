import { api } from '@/lib/api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

/**
 * Servicio de autenticación
 */
export const authService = {
  /**
   * Iniciar sesión con credenciales
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    return api.post<AuthResponse>('/api/auth/login', credentials);
  },

  /**
   * Cerrar sesión
   */
  logout: async (): Promise<void> => {
    return api.post<void>('/api/auth/logout');
  },

  /**
   * Verificar token actual
   */
  verifyToken: async (): Promise<AuthResponse['user']> => {
    return api.get<AuthResponse['user']>('/api/auth/verify');
  },
};