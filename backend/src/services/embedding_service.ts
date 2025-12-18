import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class EmbeddingService {
  async getAllActive() {
    const embeddings = await prisma.embedding.findMany({
      where: {
        imagen: {
          usuario: {
            activo: true,
          },
        },
      },
      include: {
        imagen: {
          include: {
            usuario: {
              select: {
                id: true,
                nombre: true,
                area: true,
              },
            },
          },
        },
      },
    });

    return embeddings.map((e) => ({
      id: e.id,
      imagenId: e.imagenId,
      modelo: e.modelo,
      version: e.version,
      vector: e.vector.toString('base64'), // Convertir buffer a base64 para enviar
      normaL2: e.normaL2,
      empleado: {
        id: e.imagen.usuario.id,
        nombre: e.imagen.usuario.nombre,
        area: e.imagen.usuario.area,
      },
    }));
  }

  async create(data: {
    imagenId: string;
    modelo: string;
    version?: string;
    vector: string | number[]; // Puede venir como array o base64
    normaL2?: number;
  }) {
    // Verificar que la imagen existe
    const imagen = await prisma.imagen.findUnique({
      where: { id: data.imagenId },
    });

    if (!imagen) {
      throw new Error('Imagen no encontrada');
    }

    // Convertir vector a Buffer
    let vectorBuffer: Buffer;
    if (typeof data.vector === 'string') {
      // Si viene como base64
      vectorBuffer = Buffer.from(data.vector, 'base64');
    } else {
      // Si viene como array de números (Float32Array serializado)
      const float32Array = new Float32Array(data.vector);
      vectorBuffer = Buffer.from(float32Array.buffer);
    }

    const embedding = await prisma.embedding.create({
      data: {
        imagenId: data.imagenId,
        modelo: data.modelo,
        version: data.version,
        vector: vectorBuffer,
        normaL2: data.normaL2,
      },
    });

    return {
      id: embedding.id,
      imagenId: embedding.imagenId,
      modelo: embedding.modelo,
      version: embedding.version,
      normaL2: embedding.normaL2,
    };
  }

  async getByEmployeeId(employeeId: string) {
    const embeddings = await prisma.embedding.findMany({
      where: {
        imagen: {
          usuarioId: employeeId,
        },
      },
      include: {
        imagen: true,
      },
    });

    return embeddings.map((e) => ({
      id: e.id,
      imagenId: e.imagenId,
      modelo: e.modelo,
      version: e.version,
      vector: e.vector.toString('base64'),
      normaL2: e.normaL2,
    }));
  }
}