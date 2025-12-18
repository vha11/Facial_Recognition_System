import { api } from '@/lib/api';

export interface Employee {
  id: string;
  nombre: string;
  telefono?: string;
  puesto?: string;
  area?: string;
  activo: boolean;
  imageCount: number;
  fechaAlta: Date;
  imagenes?: Array<{ id: string; uri: string }>;
}

export interface CreateEmployeeData {
  nombre: string;
  telefono?: string;
  puesto?: string;
  area?: string;
  activo: boolean;
  images: File[];
}

export interface UpdateEmployeeData {
  nombre?: string;
  telefono?: string;
  puesto?: string;
  area?: string;
  activo?: boolean;
  images?: File[];
}

/**
 * Servicio para gestión de empleados
 */
export const employeesService = {
  /**
   * Obtener todos los empleados
   */
  getEmployees: async (): Promise<Employee[]> => {
    const data = await api.get<Employee[]>('/api/employees');
    return data.map(emp => ({
      ...emp,
      fechaAlta: new Date(emp.fechaAlta),
    }));
  },

  /**
   * Obtener un empleado por ID
   */
  getEmployeeById: async (id: string): Promise<Employee> => {
    const data = await api.get<Employee>(`/api/employees/${id}`);
    return {
      ...data,
      fechaAlta: new Date(data.fechaAlta),
    };
  },

  /**
   * Crear un nuevo empleado
   */
  createEmployee: async (data: CreateEmployeeData): Promise<Employee> => {
    const formData = new FormData();
    
    formData.append('nombre', data.nombre);
    if (data.telefono) formData.append('telefono', data.telefono);
    if (data.puesto) formData.append('puesto', data.puesto);
    if (data.area) formData.append('area', data.area);
    formData.append('activo', String(data.activo));
    
    // Agregar todas las imágenes
    data.images.forEach((image) => {
      formData.append('images', image);
    });

    const employee = await api.uploadFile<Employee>('/api/employees', formData);
    return {
      ...employee,
      fechaAlta: new Date(employee.fechaAlta),
    };
  },

  /**
   * Actualizar un empleado existente
   */
  updateEmployee: async (
    id: string,
    data: UpdateEmployeeData
  ): Promise<Employee> => {
    // Si hay imágenes, usar FormData
    if (data.images && data.images.length > 0) {
      const formData = new FormData();
      
      if (data.nombre) formData.append('nombre', data.nombre);
      if (data.telefono) formData.append('telefono', data.telefono);
      if (data.puesto) formData.append('puesto', data.puesto);
      if (data.area) formData.append('area', data.area);
      if (data.activo !== undefined) formData.append('activo', String(data.activo));
      
      data.images.forEach((image) => {
        formData.append('images', image);
      });

      const employee = await api.uploadFile<Employee>(`/api/employees/${id}`, formData);
      return {
        ...employee,
        fechaAlta: new Date(employee.fechaAlta),
      };
    }

    // Si no hay imágenes, usar PUT normal
    const employee = await api.put<Employee>(`/api/employees/${id}`, data);
    return {
      ...employee,
      fechaAlta: new Date(employee.fechaAlta),
    };
  },

  /**
   * Eliminar un empleado
   */
  deleteEmployee: async (id: string): Promise<void> => {
    await api.delete(`/api/employees/${id}`);
  },

  /**
   * Cambiar el estado activo/inactivo de un empleado
   */
  toggleEmployeeStatus: async (id: string): Promise<Employee> => {
    const employee = await api.patch<Employee>(`/api/employees/${id}/toggle-status`);
    return {
      ...employee,
      fechaAlta: new Date(employee.fechaAlta),
    };
  },
};
