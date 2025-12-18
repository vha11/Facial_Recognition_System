import { useState, useEffect, useRef } from 'react';
import { FaceLandmarker, FilesetResolver, FaceLandmarkerResult } from '@mediapipe/tasks-vision';

export interface DetectedFace {
  landmarks: any; // 468 puntos faciales
  embedding: Float32Array; // Descriptor facial (512 dimensiones)
  confidence: number;
}

/**
 * Hook para detección facial con MediaPipe
 */
export const useFaceDetection = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  /**
   * Inicializar MediaPipe FaceLandmarker
   */
  useEffect(() => {
    const initializeFaceDetection = async () => {
      try {
        console.log('🔧 Inicializando MediaPipe...');
        
        // Cargar los archivos WASM de MediaPipe
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        // Crear el FaceLandmarker
        const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU', // Usar GPU para mejor rendimiento
          },
          runningMode: 'VIDEO',
          numFaces: 1, // Detectar solo 1 rostro a la vez
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
        });

        faceLandmarkerRef.current = faceLandmarker;
        setIsLoading(false);
        console.log('✅ MediaPipe inicializado correctamente');
      } catch (err) {
        console.error('❌ Error al inicializar MediaPipe:', err);
        setError('Error al cargar el modelo de detección facial');
        setIsLoading(false);
      }
    };

    initializeFaceDetection();

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
      }
    };
  }, []);

  /**
   * Detectar rostro en un frame de video
   */
  const detectFace = async (
    videoElement: HTMLVideoElement
  ): Promise<DetectedFace | null> => {
    if (!faceLandmarkerRef.current || !videoElement) {
      return null;
    }

    try {
      // Obtener timestamp actual
      const timestamp = performance.now();

      // Detectar rostros en el video
      const results: FaceLandmarkerResult = faceLandmarkerRef.current.detectForVideo(
        videoElement,
        timestamp
      );

      // Si no se detectó ningún rostro
      if (!results.faceLandmarks || results.faceLandmarks.length === 0) {
        return null;
      }

      // Obtener el primer rostro detectado
      const faceLandmarks = results.faceLandmarks[0];

      // Generar embedding desde los landmarks
      // MediaPipe Face Landmarker da 468 puntos, los convertimos a un vector
      const embedding = landmarksToEmbedding(faceLandmarks);

      return {
        landmarks: faceLandmarks,
        embedding,
        confidence: 0.9, // MediaPipe no da confidence score directo, usamos valor fijo
      };
    } catch (err) {
      console.error('Error al detectar rostro:', err);
      return null;
    }
  };

  /**
   * Detectar rostro continuamente (en loop)
   */
  const startContinuousDetection = (
    videoElement: HTMLVideoElement,
    onDetection: (face: DetectedFace | null) => void,
    intervalMs: number = 1000 // Detectar cada 1 segundo por defecto
  ) => {
    if (isDetecting) return;

    setIsDetecting(true);
    let lastDetectionTime = 0;

    const detect = async () => {
      const now = performance.now();

      // Solo detectar cada X milisegundos
      if (now - lastDetectionTime >= intervalMs) {
        const face = await detectFace(videoElement);
        onDetection(face);
        lastDetectionTime = now;
      }

      animationFrameRef.current = requestAnimationFrame(detect);
    };

    detect();
  };

  /**
   * Detener detección continua
   */
  const stopContinuousDetection = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsDetecting(false);
  };

  /**
   * Capturar un solo frame y detectar rostro
   */
  const captureFrame = async (
    videoElement: HTMLVideoElement
  ): Promise<DetectedFace | null> => {
    return await detectFace(videoElement);
  };

  return {
    isLoading,
    error,
    isDetecting,
    detectFace,
    captureFrame,
    startContinuousDetection,
    stopContinuousDetection,
  };
};

/**
 * Convierte los 468 landmarks faciales a un embedding (vector descriptor)
 * Usamos una técnica simple: extraer características clave y normalizarlas
 */
function landmarksToEmbedding(landmarks: any[]): Float32Array {
  // MediaPipe Face Mesh tiene 468 puntos
  // Cada punto tiene x, y, z
  // Total: 468 * 3 = 1404 valores
  
  const flatValues: number[] = [];
  
  for (const landmark of landmarks) {
    flatValues.push(landmark.x, landmark.y, landmark.z);
  }

  // Normalizar los valores (importante para comparación)
  const normalized = normalizeVector(flatValues);
  
  return new Float32Array(normalized);
}

/**
 * Normaliza un vector (para que la comparación sea más precisa)
 */
function normalizeVector(vector: number[]): number[] {
  // Calcular la norma L2
  let norm = 0;
  for (const val of vector) {
    norm += val * val;
  }
  norm = Math.sqrt(norm);

  // Evitar división por cero
  if (norm === 0) {
    return vector;
  }

  // Normalizar cada valor
  return vector.map(val => val / norm);
}