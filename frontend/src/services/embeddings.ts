import { api } from '@/lib/api';

export interface Embedding {
  id: string;
  imagenId: string;
  modelo: string;
  version?: string;
  vector: number[]; // Array de números (descriptor facial)
  normaL2?: number;
  empleado: {
    id: string;
    nombre: string;
    area?: string;
  };
}

export interface CreateEmbeddingData {
  imagenId: string;
  modelo: string;
  version?: string;
  vector: number[] | Float32Array;
  normaL2?: number;
}

/**
 * Servicio para gestión de embeddings faciales
 */
export const embeddingsService = {
  /**
   * Obtener todos los embeddings de empleados activos
   * Útil para comparar rostros detectados
   */
  getAllActive: async (): Promise<Embedding[]> => {
    const data = await api.get<any[]>('/api/embeddings');
    
    // Convertir vector de base64 a array de números
    return data.map(embedding => ({
      ...embedding,
      vector: embedding.vector ? base64ToFloat32Array(embedding.vector) : [],
    }));
  },

  /**
   * Crear un nuevo embedding
   * Se usa al registrar un empleado con sus fotos
   */
  create: async (data: CreateEmbeddingData): Promise<{ id: string }> => {
    // Convertir Float32Array a array normal para JSON
    const vectorArray = Array.from(data.vector);
    
    return api.post('/api/embeddings', {
      imagenId: data.imagenId,
      modelo: data.modelo,
      version: data.version,
      vector: vectorArray,
      normaL2: data.normaL2,
    });
  },

  /**
   * Obtener embeddings de un empleado específico
   */
  getByEmployeeId: async (employeeId: string): Promise<Embedding[]> => {
    const data = await api.get<any[]>(`/api/embeddings/employee/${employeeId}`);
    
    return data.map(embedding => ({
      ...embedding,
      vector: embedding.vector ? base64ToFloat32Array(embedding.vector) : [],
    }));
  },

  /**
   * Comparar un embedding capturado con todos los embeddings en DB
   * Retorna el empleado con mayor similitud si supera el umbral
   */
  findMatch: async (
    capturedVector: Float32Array,
    threshold: number = 0.6
  ): Promise<{ empleado: Embedding['empleado']; confidence: number } | null> => {
    // Obtener todos los embeddings
    const allEmbeddings = await embeddingsService.getAllActive();
    
    if (allEmbeddings.length === 0) {
      return null;
    }

    // Calcular similitud con cada embedding
    let bestMatch: { empleado: Embedding['empleado']; confidence: number } | null = null;
    let highestSimilarity = 0;

    for (const embedding of allEmbeddings) {
      const similarity = cosineSimilarity(
        Array.from(capturedVector),
        embedding.vector
      );

      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        bestMatch = {
          empleado: embedding.empleado,
          confidence: similarity,
        };
      }
    }

    // Solo retornar si supera el umbral
    if (bestMatch && bestMatch.confidence >= threshold) {
      return bestMatch;
    }

    return null;
  },
};

/**
 * Convierte un string base64 a Float32Array
 */
function base64ToFloat32Array(base64: string): number[] {
  try {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const float32Array = new Float32Array(bytes.buffer);
    return Array.from(float32Array);
  } catch (error) {
    console.error('Error converting base64 to Float32Array:', error);
    return [];
  }
}

/**
 * Calcula la similitud coseno entre dos vectores
 * Retorna un valor entre 0 (totalmente diferentes) y 1 (idénticos)
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

/**
 * Calcula la distancia euclidiana entre dos vectores
 * Útil como métrica alternativa
 */
export function euclideanDistance(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    return Infinity;
  }

  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    const diff = vecA[i] - vecB[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}