import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { EmbeddingService } from '../services/embedding_service';

const embeddingService = new EmbeddingService();

export class EmbeddingController {
  async getAll(req: AuthRequest, res: Response) {
    try {
      const embeddings = await embeddingService.getAllActive();
      res.json(embeddings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const { imagenId, modelo, version, vector, normaL2 } = req.body;

      if (!imagenId || !modelo || !vector) {
        return res.status(400).json({
          message: 'imagenId, modelo y vector son requeridos',
        });
      }

      const embedding = await embeddingService.create({
        imagenId,
        modelo,
        version,
        vector,
        normaL2,
      });

      res.status(201).json(embedding);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async getByEmployee(req: AuthRequest, res: Response) {
    try {
      const { employeeId } = req.params;
      const embeddings = await embeddingService.getByEmployeeId(employeeId);
      res.json(embeddings);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  }
}