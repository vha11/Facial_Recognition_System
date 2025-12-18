import { useState, useEffect } from 'react';
import { 
  employeesService, 
  Employee, 
  CreateEmployeeData, 
  UpdateEmployeeData 
} from '@/services/employees';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook personalizado para gestión de empleados
 */
export const useEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  /**
   * Cargar lista de empleados
   */
  const loadEmployees = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await employeesService.getEmployees();
      setEmployees(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar empleados';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
        className: 'floating-notification border-l-4 border-l-app-error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Crear nuevo empleado (solo crea usuario + sube imágenes)
   * La generación de embeddings ahora se hace en el backend
   * vía POST /api/employees/:id/generate-embeddings
   */
  const createEmployee = async (data: CreateEmployeeData) => {
    setIsLoading(true);
    try {
      // 1. Crear empleado y subir imágenes al backend
      const newEmployee = await employeesService.createEmployee(data);
      
      // 2. Actualizar lista de empleados
      setEmployees(prev => [...prev, newEmployee]);
      
      toast({
        title: 'Empleado creado',
        description: `${data.nombre} ha sido registrado exitosamente`,
        className: 'floating-notification border-l-4 border-l-app-success',
      });
      
      return newEmployee;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al crear empleado';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
        className: 'floating-notification border-l-4 border-l-app-error',
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Actualizar empleado existente
   * (la generación de embeddings de nuevas imágenes se hace en backend)
   */
  const updateEmployee = async (id: string, data: UpdateEmployeeData) => {
    setIsLoading(true);
    try {
      const updatedEmployee = await employeesService.updateEmployee(id, data);

      setEmployees(prev => 
        prev.map(emp => emp.id === id ? updatedEmployee : emp)
      );
      
      toast({
        title: 'Empleado actualizado',
        description: `Los datos han sido actualizados`,
        className: 'floating-notification border-l-4 border-l-app-success',
      });
      
      return updatedEmployee;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar empleado';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
        className: 'floating-notification border-l-4 border-l-app-error',
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Eliminar empleado
   */
  const deleteEmployee = async (id: string) => {
    setIsLoading(true);
    try {
      await employeesService.deleteEmployee(id);
      setEmployees(prev => prev.filter(emp => emp.id !== id));
      
      toast({
        title: 'Empleado eliminado',
        description: 'El empleado ha sido eliminado',
        className: 'floating-notification border-l-4 border-l-app-warning',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar empleado';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
        className: 'floating-notification border-l-4 border-l-app-error',
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Cambiar estado de empleado (activo/inactivo)
   */
  const toggleEmployeeStatus = async (id: string) => {
    setIsLoading(true);
    try {
      const updatedEmployee = await employeesService.toggleEmployeeStatus(id);
      setEmployees(prev => 
        prev.map(emp => emp.id === id ? updatedEmployee : emp)
      );
      
      const employee = employees.find(emp => emp.id === id);
      if (employee) {
        toast({
          title: employee.activo ? 'Empleado desactivado' : 'Empleado activado',
          description: `${employee.nombre} ha sido ${employee.activo ? 'desactivado' : 'activado'}`,
          className: 'floating-notification border-l-4 border-l-app-warning',
        });
      }
      
      return updatedEmployee;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cambiar estado';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
        className: 'floating-notification border-l-4 border-l-app-error',
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar empleados al montar el componente
  useEffect(() => {
    loadEmployees();
  }, []);

  return {
    employees,
    isLoading,
    error,
    loadEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    toggleEmployeeStatus,
  };
};
