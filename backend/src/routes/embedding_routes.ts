import { Router } from 'express';
import { EmbeddingController } from '../controllers/embedding_controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();
const embeddingController = new EmbeddingController();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

router.get('/', embeddingController.getAll.bind(embeddingController));
router.post('/', embeddingController.create.bind(embeddingController));
router.get('/employee/:employeeId', embeddingController.getByEmployee.bind(embeddingController));

export default router;