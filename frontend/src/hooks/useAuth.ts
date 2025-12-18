import { useState, useEffect } from 'react';
import { authService, LoginCredentials, AuthResponse } from '@/services/auth';
import { useToast } from '@/hooks/use-toast';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

/**
 * Hook personalizado para gestión de autenticación
 */
export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthResponse['user'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Verificar autenticación al montar el componente
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);

    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (error) {
        // Si hay error al parsear, limpiar el storage
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
    
    setIsLoading(false);
  }, []);

  /**
   * Iniciar sesión
   */
  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const response = await authService.login(credentials);
      
      // Guardar token y usuario
      localStorage.setItem(TOKEN_KEY, response.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));
      
      setUser(response.user);
      setIsAuthenticated(true);
      
      toast({
        title: 'Inicio de sesión exitoso',
        description: `Bienvenido, ${response.user.name}`,
        className: 'floating-notification border-l-4 border-l-app-success',
      });

      return response;
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error de autenticación',
        description: error instanceof Error ? error.message : 'Credenciales incorrectas',
        className: 'floating-notification border-l-4 border-l-app-error',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Cerrar sesión
   */
  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      
      // Limpiar storage
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      
      setUser(null);
      setIsAuthenticated(false);
      
      toast({
        title: 'Sesión cerrada',
        description: 'Has cerrado sesión exitosamente',
        className: 'floating-notification border-l-4 border-l-app-warning',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error al cerrar sesión',
        className: 'floating-notification border-l-4 border-l-app-error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Obtener token actual
   */
  const getToken = () => {
    return localStorage.getItem(TOKEN_KEY);
  };

  return {
    isAuthenticated,
    user,
    isLoading,
    login,
    logout,
    getToken,
  };
};