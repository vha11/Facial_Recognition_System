import { PrismaClient } from '@prisma/client';
import { isValidAsistenciaTipo } from '../utils/constants';
import { RecognitionService } from './recognition_service';
import { computeEmbeddingFromImage } from './face_embedding_service';
import { FaceDetectionService } from './face_detection_service';

const prisma = new PrismaClient();
const recognitionService = new RecognitionService();
const detectionService = new FaceDetectionService();

interface AttendanceFilters {
  employeeName?: string;
  startDate?: string;
  endDate?: string;
}

export interface RecognitionResult {
  match: boolean;
  message?: string;

  employeeId?: string;
  employeeName?: string;
  employeeArea?: string | null;
  confidence?: number;

  attendanceId?: string;
  type?: 'ENTRADA' | 'SALIDA';
  timestamp?: Date;
}

export class AttendanceService {
  async getAll(filters: AttendanceFilters) {
    const where: any = {};

    if (filters.employeeName) {
      where.usuario = {
        nombre: {
          contains: filters.employeeName,
        },
      };
    }

    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) {
        where.timestamp.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.timestamp.lte = new Date(filters.endDate);
      }
    }

    const asistencias = await prisma.asistencia.findMany({
      where,
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            area: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    return asistencias.map((a) => ({
      id: a.id,
      employeeName: a.usuario.nombre,
      employeeArea: a.usuario.area || 'Sin área',
      type: a.tipo,
      timestamp: a.timestamp,
      confidence: a.confianza,
    }));
  }

  async record(data: {
    employeeId: string;
    type: 'ENTRADA' | 'SALIDA';
    confidence: number;
  }) {
    // Validar tipo de asistencia
    if (!isValidAsistenciaTipo(data.type)) {
      throw new Error('Tipo de asistencia inválido');
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: data.employeeId },
    });

    if (!usuario) {
      throw new Error('Empleado no encontrado');
    }

    if (!usuario.activo) {
      throw new Error('Empleado inactivo');
    }

    const asistencia = await prisma.asistencia.create({
      data: {
        usuarioId: data.employeeId,
        tipo: data.type,
        timestamp: new Date(),
        confianza: data.confidence,
      },
      include: {
        usuario: {
          select: {
            nombre: true,
            area: true,
          },
        },
      },
    });

    return {
      id: asistencia.id,
      employeeName: asistencia.usuario.nombre,
      employeeArea: asistencia.usuario.area || 'Sin área',
      type: asistencia.tipo,
      timestamp: asistencia.timestamp,
      confidence: asistencia.confianza,
    };
  }

  async exportCSV(filters: AttendanceFilters) {
    const records = await this.getAll(filters);

    const headers = 'Empleado,Área,Tipo,Fecha y Hora,Confianza';
    const rows = records.map((r) =>
      [
        r.employeeName,
        r.employeeArea,
        r.type,
        r.timestamp.toISOString(),
        `${Math.round(r.confidence * 100)}%`,
      ].join(',')
    );

    return [headers, ...rows].join('\n');
  }

  /**
   * 1. Calcula embedding a partir de la imagen (ONNX) -> computeEmbeddingFromImage
   * 2. Busca el mejor match en la BD (RecognitionService)
   * 3. Si hay match, decide ENTRADA/SALIDA según último registro y crea asistencia.
   *
   * Este método es el que debe usar el controlador de `/api/attendance/recognize`.
   */
  async recognizeAndRecord(imageBuffer: Buffer): Promise<RecognitionResult> {
    // 1. Obtener embedding desde la imagen (ONNX)

    const face = await detectionService.detectMainFace(imageBuffer);
    if (!face) {
      return { match: false, message: "No se detectó rostro" };
    }

    const embedding = await computeEmbeddingFromImage(face.alignedImageBuffer);

    // embedding: Float32Array de 512 dims, normalizado L2

    // 2. Buscar mejor match en DB
    const match = await recognitionService.findBestMatch(embedding, 0.6);

    if (!match) {
      return {
        match: false,
        message: 'Rostro no reconocido',
      };
    }

    // 3. Verificar que el usuario exista y esté activo
    const usuario = await prisma.usuario.findUnique({
      where: { id: match.employeeId },
    });

    if (!usuario) {
      return {
        match: false,
        message: 'Empleado no encontrado',
      };
    }

    if (!usuario.activo) {
      return {
        match: false,
        message: 'Empleado inactivo',
      };
    }

    // 4. Determinar ENTRADA/SALIDA según el último registro de asistencia
    const lastAsistencia = await prisma.asistencia.findFirst({
      where: { usuarioId: match.employeeId },
      orderBy: { timestamp: 'desc' },
    });

    const tipo: 'ENTRADA' | 'SALIDA' =
      !lastAsistencia || lastAsistencia.tipo === 'SALIDA'
        ? 'ENTRADA'
        : 'SALIDA';

    // 5. Registrar asistencia
    const asistencia = await prisma.asistencia.create({
      data: {
        usuarioId: match.employeeId,
        tipo,
        timestamp: new Date(),
        confianza: match.confidence,
      },
      include: {
        usuario: {
          select: {
            nombre: true,
            area: true,
          },
        },
      },
    });

    return {
      match: true,
      employeeId: match.employeeId,
      employeeName: asistencia.usuario.nombre,
      employeeArea: asistencia.usuario.area || 'Sin área',
      confidence: match.confidence,
      attendanceId: asistencia.id,
      type: asistencia.tipo as 'ENTRADA' | 'SALIDA',
      timestamp: asistencia.timestamp,
    };
  }
}
//