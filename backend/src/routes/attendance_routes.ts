import { Router } from 'express';
import multer from 'multer';
import { AttendanceController } from '../controllers/attendance_controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();
const attendanceController = new AttendanceController();
const upload = multer(); // memoria, no disco (puedes cambiarlo si quieres)

router.post(
  '/recognize',
  authMiddleware,
  upload.single('image'),
  (req, res) => attendanceController.recognizeAndRecord(req, res)
);

// Todas las rutas requieren autenticación
router.use(authMiddleware);

router.get('/', attendanceController.getAll.bind(attendanceController));
router.post('/', attendanceController.record.bind(attendanceController));
router.get('/export', attendanceController.export.bind(attendanceController));

export default router;
