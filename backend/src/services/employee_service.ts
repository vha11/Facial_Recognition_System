import { PrismaClient } from '@prisma/client';
import { writeFile, mkdir, readFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { Rol } from '../utils/constants';
import { EmbeddingService } from './embedding_service';
import { computeEmbeddingFromImage } from './face_embedding_service';
import { FaceDetectionService } from './face_detection_service';

const prisma = new PrismaClient();
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'employees');
const embeddingService = new EmbeddingService();
const detectionService = new FaceDetectionService();

export class EmployeeService {
  constructor() {
    // Crear directorio de uploads si no existe
    mkdir(UPLOAD_DIR, { recursive: true }).catch(console.error);
  }

  async getAll() {
    const usuarios = await prisma.usuario.findMany({
      where: { rol: Rol.EMPLEADO },
      include: {
        imagenes: true,
        _count: {
          select: { imagenes: true },
        },
      },
      orderBy: { fechaAlta: 'desc' },
    });

    return usuarios.map((u) => ({
      id: u.id,
      nombre: u.nombre,
      telefono: u.telefono,
      puesto: u.puesto,
      area: u.area,
      activo: u.activo,
      imageCount: u._count.imagenes,
      fechaAlta: u.fechaAlta,
    }));
  }

  async getById(id: string) {
    const usuario = await prisma.usuario.findUnique({
      where: { id },
      include: {
        imagenes: true,
      },
    });

    if (!usuario || usuario.rol !== Rol.EMPLEADO) {
      throw new Error('Empleado no encontrado');
    }

    return {
      id: usuario.id,
      nombre: usuario.nombre,
      telefono: usuario.telefono,
      puesto: usuario.puesto,
      area: usuario.area,
      activo: usuario.activo,
      imageCount: usuario.imagenes.length,
      fechaAlta: usuario.fechaAlta,
      imagenes: usuario.imagenes,
    };
  }

  async create(data: any, files?: Express.Multer.File[]) {
    const usuario = await prisma.usuario.create({
      data: {
        rol: Rol.EMPLEADO,
        nombre: data.nombre,
        telefono: data.telefono,
        puesto: data.puesto,
        area: data.area,
        activo: data.activo !== 'false',
      },
    });

    // Guardar imágenes si se proporcionaron
    if (files && files.length > 0) {
      await this.saveImages(usuario.id, files);

      // GENERAR EMBEDDINGS AUTOMÁTICAMENTE
      try {
        await this.generateEmbeddingsForEmployee(usuario.id);
      } catch (err) {
        console.error('Error generando embeddings al crear empleado:', err);
        // si quieres que falle todo el alta:
        // throw err;
      }
    }

    return this.getById(usuario.id);
  }

  async update(id: string, data: any, files?: Express.Multer.File[]) {
    const usuario = await prisma.usuario.update({
      where: { id },
      data: {
        nombre: data.nombre,
        telefono: data.telefono,
        puesto: data.puesto,
        area: data.area,
        activo: data.activo !== 'false',
      },
    });

    // Agregar nuevas imágenes si se proporcionaron
    if (files && files.length > 0) {
      await this.saveImages(usuario.id, files);

      // GENERAR EMBEDDINGS PARA LAS NUEVAS IMÁGENES
      try {
        await this.generateEmbeddingsForEmployee(usuario.id);
      } catch (err) {
        console.error('Error generando embeddings al actualizar empleado:', err);
      }
    }

    return this.getById(usuario.id);
  }

  async delete(id: string) {
    await prisma.usuario.delete({
      where: { id },
    });
  }

  async toggleStatus(id: string) {
    const usuario = await prisma.usuario.findUnique({
      where: { id },
    });

    if (!usuario) {
      throw new Error('Empleado no encontrado');
    }

    const updated = await prisma.usuario.update({
      where: { id },
      data: { activo: !usuario.activo },
    });

    return this.getById(updated.id);
  }

  /**
   * Genera embeddings (ONNX) para todas las imágenes de un empleado
   * usando los archivos físicos guardados en `imagen.uri`.
   * Evita duplicar embeddings si ya existen para una imagen.
   */
  async generateEmbeddingsForEmployee(employeeId: string) {
    const usuario = await prisma.usuario.findUnique({
      where: { id: employeeId },
      include: { imagenes: true },
    });

    if (!usuario || usuario.rol !== Rol.EMPLEADO) {
      throw new Error('Empleado no encontrado');
    }

    if (!usuario.imagenes || usuario.imagenes.length === 0) {
      throw new Error('El empleado no tiene imágenes registradas');
    }

    // buscar imágenes que ya tengan embedding
    const existingEmbeddings = await prisma.embedding.findMany({
      where: {
        imagenId: {
          in: usuario.imagenes.map((img) => img.id),
        },
      },
      select: { imagenId: true },
    });

    const alreadyEmbeddedIds = new Set(existingEmbeddings.map((e) => e.imagenId));

    let embeddingsCreated = 0;
    const errors: string[] = [];

    for (const img of usuario.imagenes) {
      // saltar las que ya tienen embedding
      if (alreadyEmbeddedIds.has(img.id)) continue;

      try {
        const filepath = img.uri;
        const imageBuffer = await readFile(filepath);

        const face = await detectionService.detectMainFace(imageBuffer);
          if (!face) throw new Error("No se detectó un rostro");

        const embedding = await computeEmbeddingFromImage(face.alignedImageBuffer);


        await embeddingService.create({
          imagenId: img.id,
          modelo: 'arcface-glintr100',
          version: '1.0',
          vector: Array.from(embedding),
          normaL2: 1,
        });

        embeddingsCreated++;
      } catch (err: any) {
        console.error(`Error generando embedding para imagen ${img.id}:`, err);
        errors.push(img.id);
      }
    }

    return {
      employeeId,
      imagesFound: usuario.imagenes.length,
      embeddingsCreated,
      imagesWithError: errors,
    };
  }

  private async saveImages(usuarioId: string, files: Express.Multer.File[]) {
    for (const file of files) {
      const hash = crypto.createHash('sha256').update(file.buffer).digest('hex');
      const filename = `${usuarioId}_${Date.now()}_${hash.substring(0, 8)}.jpg`;
      const filepath = path.join(UPLOAD_DIR, filename);

      await writeFile(filepath, file.buffer);

      await prisma.imagen.create({
        data: {
          usuarioId,
          uri: filepath,
          formato: file.mimetype,
          ancho: null,
          alto: null,
          hashSha256: hash,
        },
      });
    }
  }
}
