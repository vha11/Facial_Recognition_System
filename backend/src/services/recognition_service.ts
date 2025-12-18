// src/services/recognition_service.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface MatchResult {
  employeeId: string;
  employeeName: string;
  employeeArea?: string | null;
  confidence: number;
}

export class RecognitionService {
  /**
   * Dado un embedding (Float32Array) calcula el mejor match en DB
   * usando similitud coseno y un umbral.
   */
  async findBestMatch(
    embedding: Float32Array,
    threshold: number = 0.5
  ): Promise<MatchResult | null> {
    // 1. Obtener todos los embeddings de empleados activos
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
            usuario: true,
          },
        },
      },
    });

    if (embeddings.length === 0) {
      return null;
    }

    const capturedVector = Array.from(embedding);

    let bestMatch: MatchResult | null = null;
    let highestSimilarity = 0;

    for (const e of embeddings) {
      const storedVector = bufferToFloat32Array(e.vector);
      const similarity = cosineSimilarity(capturedVector, storedVector);

      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        bestMatch = {
          employeeId: e.imagen.usuario.id,
          employeeName: e.imagen.usuario.nombre,
          employeeArea: e.imagen.usuario.area,
          confidence: similarity,
        };
      }
    }

    if (bestMatch && bestMatch.confidence >= threshold) {
      return bestMatch;
    }

    return null;
  }
}

/**
 * Convierte Buffer (guardado en DB) a Float32Array
 */
function bufferToFloat32Array(buffer: Buffer): number[] {
  const floatArray = new Float32Array(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength / Float32Array.BYTES_PER_ELEMENT
  );
  return Array.from(floatArray);
}

/**
 * Similitud coseno (misma lógica que en el frontend)
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}
