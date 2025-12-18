/**
 * Cliente HTTP centralizado para peticiones al backend
 * Lee automáticamente el token de localStorage
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const TOKEN_KEY = 'auth_token';

interface FetchOptions extends RequestInit {
  token?: string;
}

/**
 * Obtiene el token de autenticación
 */
function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Función helper para realizar peticiones HTTP
 */
async function fetchAPI<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  // Usar token proporcionado o leer de localStorage
  const authToken = token || getAuthToken();
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: 'Error en la petición',
    }));
    throw new Error(error.message || `HTTP Error: ${response.status}`);
  }

  return response.json();
}

/**
 * Métodos HTTP principales
 */
export const api = {
  get: <T>(endpoint: string, options?: FetchOptions) =>
    fetchAPI<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, data?: unknown, options?: FetchOptions) =>
    fetchAPI<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    }),

  put: <T>(endpoint: string, data?: unknown, options?: FetchOptions) =>
    fetchAPI<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  patch: <T>(endpoint: string, data?: unknown, options?: FetchOptions) =>
    fetchAPI<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: <T>(endpoint: string, options?: FetchOptions) =>
    fetchAPI<T>(endpoint, { ...options, method: 'DELETE' }),

  // Método especial para subir archivos
  uploadFile: async <T>(
    endpoint: string,
    formData: FormData,
    options?: FetchOptions
  ): Promise<T> => {
    const { token, ...fetchOptions } = options || {};

    const headers: HeadersInit = {
      ...fetchOptions.headers,
      // NO incluir Content-Type para FormData, el navegador lo pone automáticamente
    };

    // Usar token proporcionado o leer de localStorage
    const authToken = token || getAuthToken();
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...fetchOptions,
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: 'Error al subir archivo',
      }));
      throw new Error(error.message || `HTTP Error: ${response.status}`);
    }

    return response.json();
  },
};

export default api;