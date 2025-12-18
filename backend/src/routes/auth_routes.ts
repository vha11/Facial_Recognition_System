import { Router } from 'express';
import { AuthController } from '../controllers/auth_controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();
const authController = new AuthController();

router.post('/login', authController.login.bind(authController));
router.get('/verify', authMiddleware, authController.verify.bind(authController));
router.post('/logout', authController.logout.bind(authController));

export default router;