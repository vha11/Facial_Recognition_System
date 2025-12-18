import { api } from '@/lib/api';

export interface AttendanceRecord {
  id: string;
  employeeName: string;
  employeeArea: string;
  type: 'ENTRADA' | 'SALIDA';
  timestamp: Date;
  confidence: number;
}

export interface AttendanceFilters {
  employeeName?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Respuesta del endpoint de reconocimiento + registro
 * POST /api/attendance/recognize
 */
export interface RecognitionResult {
  match: boolean;
  message?: string;

  employeeId?: string;
  employeeName?: string;
  employeeArea?: string | null;
  confidence?: number;

  attendanceId?: string;
  type?: 'ENTRADA' | 'SALIDA';
  timestamp?: Date;        // la convertimos a Date al recibir
}

/**
 * Servicio para gestión de asistencias
 */
export const attendanceService = {
  /**
   * Obtener registros de asistencia con filtros opcionales
   */
  getAttendance: async (filters?: AttendanceFilters): Promise<AttendanceRecord[]> => {
    const queryParams = new URLSearchParams();
    
    if (filters?.employeeName) {
      queryParams.append('employeeName', filters.employeeName);
    }
    if (filters?.startDate) {
      queryParams.append('startDate', filters.startDate);
    }
    if (filters?.endDate) {
      queryParams.append('endDate', filters.endDate);
    }

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/api/attendance?${queryString}` : '/api/attendance';
    
    const data = await api.get<AttendanceRecord[]>(endpoint);
    
    // Convertir timestamp a Date
    return data.map(record => ({
      ...record,
      timestamp: new Date(record.timestamp),
    }));
  },

  /**
   * Registrar una nueva asistencia (flujo manual / legacy)
   */
  recordAttendance: async (data: {
    employeeId: string;
    type: 'ENTRADA' | 'SALIDA';
    confidence: number;
  }): Promise<AttendanceRecord> => {
    const record = await api.post<AttendanceRecord>('/api/attendance', data);
    
    return {
      ...record,
      timestamp: new Date(record.timestamp),
    };
  },

  /**
   * NUEVO:
   * Reconocer rostro a partir de una imagen y registrar asistencia en backend.
   * image: frame capturado desde la cámara (Blob).
   */
  recognizeAndRecord: async (image: Blob): Promise<RecognitionResult> => {
    const formData = new FormData();
    formData.append('image', image, 'frame.jpg');

    const token = localStorage.getItem('auth_token');

    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/attendance/recognize`,
      {
        method: 'POST',
        headers: {
          // IMPORTANTE: NO establecer Content-Type aquí.
          // El navegador pondrá multipart/form-data con boundary automáticamente.
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(text || 'Error al reconocer asistencia');
    }

    const raw: {
      match: boolean;
      message?: string;
      employeeId?: string;
      employeeName?: string;
      employeeArea?: string | null;
      confidence?: number;
      attendanceId?: string;
      type?: 'ENTRADA' | 'SALIDA';
      timestamp?: string;
    } = await response.json();

    const result: RecognitionResult = {
      ...raw,
      timestamp: raw.timestamp ? new Date(raw.timestamp) : undefined,
    };

    return result;
  },

  /**
   * Exportar registros de asistencia
   */
  exportAttendance: async (filters?: AttendanceFilters): Promise<Blob> => {
    const queryParams = new URLSearchParams();
    
    if (filters?.employeeName) {
      queryParams.append('employeeName', filters.employeeName);
    }
    if (filters?.startDate) {
      queryParams.append('startDate', filters.startDate);
    }
    if (filters?.endDate) {
      queryParams.append('endDate', filters.endDate);
    }

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/api/attendance/export?${queryString}` : '/api/attendance/export';
    
    // Hacer petición directa con fetch para obtener el blob
    const token = localStorage.getItem('auth_token');
    
    const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
    });

    if (!response.ok) {
      throw new Error('Error al exportar datos');
    }

    return response.blob();
  },
};
