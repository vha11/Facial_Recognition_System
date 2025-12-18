import { Request, Response } from 'express';
import { AuthService } from '../services/auth_service';
import { AuthRequest } from '../middlewares/auth';

const authService = new AuthService();

export class AuthController {
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Email y contraseña son requeridos' });
      }

      const result = await authService.login(email, password);
      res.json(result);
    } catch (error: any) {
      res.status(401).json({ message: error.message });
    }
  }

  async verify(req: AuthRequest, res: Response) {
    try {
      // El middleware ya verificó el token, solo devolvemos el usuario
      const user = await authService.getUserById(req.user!.userId);
      res.json(user);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  }

  async logout(req: Request, res: Response) {
    // En JWT no necesitamos hacer nada en el servidor
    // El cliente simplemente elimina el token
    res.json({ message: 'Sesión cerrada exitosamente' });
  }
}