import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { AttendanceService } from '../services/attendance_service';

const attendanceService = new AttendanceService();

export class AttendanceController {
  async getAll(req: AuthRequest, res: Response) {
    try {
      const { employeeName, startDate, endDate } = req.query;

      const filters = {
        employeeName: employeeName as string,
        startDate: startDate as string,
        endDate: endDate as string,
      };

      const attendance = await attendanceService.getAll(filters);
      res.json(attendance);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async record(req: AuthRequest, res: Response) {
    try {
      const { employeeId, type, confidence } = req.body;

      if (!employeeId || !type || confidence === undefined) {
        return res.status(400).json({
          message: 'employeeId, type y confidence son requeridos',
        });
      }

      const record = await attendanceService.record({
        employeeId,
        type,
        confidence,
      });

      res.status(201).json(record);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async export(req: AuthRequest, res: Response) {
    try {
      const { employeeName, startDate, endDate } = req.query;

      const filters = {
        employeeName: employeeName as string,
        startDate: startDate as string,
        endDate: endDate as string,
      };

      const csv = await attendanceService.exportCSV(filters);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="asistencias_${Date.now()}.csv"`
      );
      res.send(csv);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * NUEVO endpoint:
   * POST /api/attendance/recognize
   * - recibe una imagen (req.file)
   * - delega en AttendanceService.recognizeAndRecord
   */
  async recognizeAndRecord(req: AuthRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Imagen requerida' });
      }

      const imageBuffer = req.file.buffer;

      const result = await attendanceService.recognizeAndRecord(imageBuffer);

      // Si no hay match, devolvemos message detallado desde el servicio
      if (!result.match) {
        return res.status(200).json({
          match: false,
          message: result.message || 'Rostro no reconocido',
        });
      }

      // Para mayor claridad, podemos forzar el timestamp a ISO string si quieres:
      // (el frontend ya lo convierte a Date)
      return res.status(201).json({
        ...result,
        timestamp: result.timestamp ? result.timestamp.toISOString() : undefined,
      });
    } catch (error: any) {
      console.error('Error en recognizeAndRecord:', error);
      res.status(500).json({ message: error.message || 'Error interno' });
    }
  }
}
