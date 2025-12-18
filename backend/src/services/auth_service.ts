import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { generateToken } from '../config/jwt';
import { Rol } from '../utils/constants';

const prisma = new PrismaClient();

export class AuthService {
  async login(email: string, password: string) {
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        hashPassword: true,
        nombre: true,
        rol: true,
        activo: true,
      },
    });

    if (!usuario) {
      throw new Error('Credenciales incorrectas');
    }

    if (!usuario.activo) {
      throw new Error('Usuario inactivo');
    }

    if (usuario.rol !== Rol.ADMIN) {
      throw new Error('Solo los administradores pueden iniciar sesión');
    }

    if (!usuario.hashPassword) {
      throw new Error('Usuario sin contraseña configurada');
    }

    const isValid = await bcrypt.compare(password, usuario.hashPassword);

    if (!isValid) {
      throw new Error('Credenciales incorrectas');
    }

    const token = generateToken({
      userId: usuario.id,
      email: usuario.email!,
      rol: usuario.rol,
    });

    return {
      token,
      user: {
        id: usuario.id,
        email: usuario.email,
        name: usuario.nombre,
        role: usuario.rol,
      },
    };
  }

  async getUserById(userId: string) {
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
      },
    });

    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }

    return {
      id: usuario.id,
      email: usuario.email,
      name: usuario.nombre,
      role: usuario.rol,
    };
  }
}