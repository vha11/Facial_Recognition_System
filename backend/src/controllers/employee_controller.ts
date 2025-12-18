import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { EmployeeService } from '../services/employee_service';

const employeeService = new EmployeeService();

export class EmployeeController {
  async getAll(req: AuthRequest, res: Response) {
    try {
      const employees = await employeeService.getAll();
      res.json(employees);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const employee = await employeeService.getById(id);
      res.json(employee);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const data = req.body;
      const files = req.files as Express.Multer.File[];
      
      const employee = await employeeService.create(data, files);
      res.status(201).json(employee);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      const files = req.files as Express.Multer.File[];

      const employee = await employeeService.update(id, data, files);
      res.json(employee);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      await employeeService.delete(id);
      res.json({ message: 'Empleado eliminado exitosamente' });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async toggleStatus(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const employee = await employeeService.toggleStatus(id);
      res.json(employee);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Genera embeddings ONNX para todas las imágenes de un empleado.
   * POST /api/employees/:id/generate-embeddings
   */
  async generateEmbeddings(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ message: 'id de empleado requerido' });
      }

      const result = await employeeService.generateEmbeddingsForEmployee(id);
      res.status(201).json(result);
    } catch (error: any) {
      console.error('Error al generar embeddings para empleado:', error);
      res.status(500).json({ message: error.message || 'Error al generar embeddings' });
    }
  }
}
