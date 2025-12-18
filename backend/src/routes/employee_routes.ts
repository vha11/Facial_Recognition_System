import { Router } from 'express';
import multer from 'multer';
import { EmployeeController } from '../controllers/employee_controller';
import { authMiddleware, isAdmin } from '../middlewares/auth';

const router = Router();
const employeeController = new EmployeeController();

// Configurar multer para subir archivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB por archivo
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'));
    }
  },
});

// Todas las rutas requieren autenticación de admin
router.use(authMiddleware, isAdmin);

router.get('/', employeeController.getAll.bind(employeeController));
router.get('/:id', employeeController.getById.bind(employeeController));
router.post('/', upload.array('images', 10), employeeController.create.bind(employeeController));
router.put('/:id', upload.array('images', 10), employeeController.update.bind(employeeController));
router.delete('/:id', employeeController.delete.bind(employeeController));
router.patch('/:id/toggle-status', employeeController.toggleStatus.bind(employeeController));

router.post('/:id/generate-embeddings', employeeController.generateEmbeddings.bind(employeeController));


export default router;