// backend/src/services/face_embedding_service.ts
import * as ort from 'onnxruntime-node';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import path from 'path';
import { detectAndAlignFace } from './face_detection_service';

let arcfaceSession: ort.InferenceSession | null = null;

/**
 * Inicializa el modelo de embeddings (glintr100.onnx) si no está cargado.
 */
async function initArcfaceModel() {
  if (arcfaceSession) return;

  const modelPath = path.resolve(__dirname, '../models/glintr100.onnx');

  // Usamos configuración por defecto (CPU), que ya te funciona
  arcfaceSession = await ort.InferenceSession.create(modelPath);
}

/**
 * Preprocesa una imagen alineada (112x112) a un tensor [1,3,112,112] normalizado para ArcFace.
 * La imagen que llega aquí ya debe ser la cara alineada.
 */
async function preprocessAlignedImageToTensor(
  alignedImageBuffer: Buffer
): Promise<ort.Tensor> {
  const targetSize = 112;

  const img = await loadImage(alignedImageBuffer);
  const canvas = createCanvas(targetSize, targetSize);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No se pudo obtener el contexto 2D del canvas');
  }

  // Fondo negro por seguridad
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, targetSize, targetSize);

  // Redimensionamos exactamente a 112x112 (el face_detection ya debería entregarla así)
  ctx.drawImage(img, 0, 0, targetSize, targetSize);

  const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
  const data = imageData.data; // RGBA

  const chw = new Float32Array(3 * targetSize * targetSize);

  // ArcFace: (pixel - 127.5) / 128
  let idxR = 0;
  let idxG = targetSize * targetSize;
  let idxB = targetSize * targetSize * 2;

  for (let y = 0; y < targetSize; y++) {
    for (let x = 0; x < targetSize; x++) {
      const idx = (y * targetSize + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const nr = (r - 127.5) / 128;
      const ng = (g - 127.5) / 128;
      const nb = (b - 127.5) / 128;

      chw[idxR++] = nr;
      chw[idxG++] = ng;
      chw[idxB++] = nb;
    }
  }

  return new ort.Tensor('float32', chw, [1, 3, targetSize, targetSize]);
}

/**
 * Genera el embedding facial (512D) a partir de un buffer de imagen cruda.
 * Pipeline:
 *   1) detectAndAlignFace (SCRFD + 2d106det) -> alignedImageBuffer
 *   2) glintr100 (ArcFace) -> embedding L2-normalizado
 */
export async function computeEmbeddingFromImage(
  imageBuffer: Buffer
): Promise<Float32Array> {
  await initArcfaceModel();

  if (!arcfaceSession) {
    throw new Error('La sesión de ArcFace no se inicializó correctamente');
  }

  // 1. Detectar y alinear rostro
  const detection = await detectAndAlignFace(imageBuffer);

  if (!detection) {
    throw new Error('No se detectó ningún rostro en la imagen');
  }

  // Ajusta este nombre si en face_detection_service.ts lo llamaste distinto
  const alignedImageBuffer = detection.alignedImageBuffer;
  if (!alignedImageBuffer) {
    throw new Error('No se pudo obtener la imagen alineada del rostro');
  }

  // 2. Preprocesar imagen alineada a tensor
  const inputTensor = await preprocessAlignedImageToTensor(alignedImageBuffer);

  // 3. Ejecutar modelo ArcFace
  const feeds: Record<string, ort.Tensor> = {};
  const inputName = arcfaceSession.inputNames[0];
  feeds[inputName] = inputTensor;

  const results = await arcfaceSession.run(feeds);
  const outputName = arcfaceSession.outputNames[0];
  const output = results[outputName];

  if (!output || !(output.data instanceof Float32Array)) {
    throw new Error('Salida del modelo ArcFace no es Float32Array');
  }

  const embedding = output.data as Float32Array;

  // 4. Normalizar L2 el embedding
  let norm = 0;
  for (let i = 0; i < embedding.length; i++) {
    norm += embedding[i] * embedding[i];
  }
  norm = Math.sqrt(norm) || 1;

  const normalized = new Float32Array(embedding.length);
  for (let i = 0; i < embedding.length; i++) {
    normalized[i] = embedding[i] / norm;
  }

  return normalized;
}
