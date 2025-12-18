// backend/src/services/face_detection_service.ts
import * as ort from 'onnxruntime-node';
import { createCanvas, loadImage, Canvas } from '@napi-rs/canvas';
import path from 'path';

export interface DetectedFace {
  // bounding box en coordenadas de la imagen original
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  score: number;
}

export interface FaceWithLandmarks extends DetectedFace {
  landmarks: { x: number; y: number }[]; // 106 puntos
  // imagen alineada para ArcFace (112x112) en JPEG
  alignedImageBuffer: Buffer;
}

/**
 * Resultado simplificado para consumo desde otros servicios
 * (por ejemplo, face_embedding_service).
 */
export interface FaceDetectionResult {
  alignedImageBuffer: Buffer;
  bbox?: [number, number, number, number];
  score?: number;
  landmarks106?: { x: number; y: number }[];
}

let scrfdSession: ort.InferenceSession | null = null;
let scrfdInputWidth = 640;
let scrfdInputHeight = 640;

let landmarkSession: ort.InferenceSession | null = null;
let landmarkInputWidth = 192;
let landmarkInputHeight = 192;

/**
 * Inicializa SCRFD (scrfd_10g_bnkps.onnx)
 */
async function initScrfd() {
  if (scrfdSession) return;

  const modelPath = path.resolve(__dirname, '../models/scrfd_10g_bnkps.onnx');
  scrfdSession = await ort.InferenceSession.create(modelPath);

  //console.log("SCRFD output names:", scrfdSession.outputNames);

  //console.log("SCRFD output shapes (probando con dummy input)...");

  // Crear tensor dummy con tamaño del modelo
  const inName = scrfdSession.inputNames[0];
  const inMeta = (scrfdSession.inputMetadata as any)[inName];
  const dims = inMeta?.dimensions;

  let H = 640;
  let W = 640;

  if (Array.isArray(dims) && dims.length === 4) {
    if (typeof dims[2] === 'number') H = dims[2];
    if (typeof dims[3] === 'number') W = dims[3];
  }

  scrfdInputHeight = H;
  scrfdInputWidth = W;

  // Dummy tensor (todo en ceros)
  const dummy = new ort.Tensor('float32', new Float32Array(1 * 3 * H * W), [1,3,H,W]);

  const outputs = await scrfdSession.run({ [inName]: dummy });

  for (const name of scrfdSession.outputNames) {
    const out = outputs[name];
    if (!out) continue;

    console.log(` → ${name}: dims=${JSON.stringify(out.dims)}  len=${out.data.length}`);
  }
}




/**
 * Inicializa el modelo de landmarks (2d106det.onnx)
 */
async function initLandmarks() {
  if (landmarkSession) return;

  const modelPath = path.resolve(__dirname, '../models/2d106det.onnx');
  landmarkSession = await ort.InferenceSession.create(modelPath);

  const inName = landmarkSession.inputNames[0];

  const inputMeta = landmarkSession.inputMetadata as Record<string, any>;
  const meta = inputMeta[inName];
  const dims = meta?.dimensions;

  if (Array.isArray(dims) && dims.length === 4) {
    const h = dims[2];
    const w = dims[3];
    if (typeof h === 'number' && typeof w === 'number') {
      landmarkInputHeight = h;
      landmarkInputWidth = w;
    }
  }
}



/**
 * Normalización tipo InsightFace:
 *   (pixel - 127.5) / 128
 */
function normalizeCHW(
  rgba: Uint8ClampedArray,
  width: number,
  height: number
): Float32Array {
  const chw = new Float32Array(3 * width * height);

  let idxR = 0;
  let idxG = width * height;
  let idxB = width * height * 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = rgba[idx];
      const g = rgba[idx + 1];
      const b = rgba[idx + 2];

      const nr = (r - 127.5) / 128;
      const ng = (g - 127.5) / 128;
      const nb = (b - 127.5) / 128;

      chw[idxR++] = nr;
      chw[idxG++] = ng;
      chw[idxB++] = nb;
    }
  }

  return chw;
}

/**
 * Preprocesa una imagen arbitraria para SCRFD:
 *  - Mantiene aspecto
 *  - Rellena con negro hasta [scrfdInputWidth, scrfdInputHeight]
 * Devuelve:
 *  - tensor listo para onnx
 *  - escala y desplazamiento para volver a coords originales
 */
async function preprocessForScrfd(imageBuffer: Buffer) {
  const img = await loadImage(imageBuffer);
  const iw = img.width;
  const ih = img.height;

  const targetW = scrfdInputWidth;   // normalmente 640
  const targetH = scrfdInputHeight;  // normalmente 640

  const r = Math.min(targetW / iw, targetH / ih);
  const newW = Math.round(iw * r);
  const newH = Math.round(ih * r);

  // centrar imagen (PAD)
  const dx = Math.floor((targetW - newW) / 2);
  const dy = Math.floor((targetH - newH) / 2);

  const canvas = createCanvas(targetW, targetH);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(img, dx, dy, newW, newH);

  const imageData = ctx.getImageData(0, 0, targetW, targetH);
  const chw = normalizeCHW(imageData.data, targetW, targetH);

  return {
    tensor: new ort.Tensor('float32', chw, [1, 3, targetH, targetW]),
    canvas,
    resizeRatio: 1 / r,  // para volver coords a la imagen original
    offsetX: dx,
    offsetY: dy,
    originalWidth: iw,
    originalHeight: ih
  };
}


/**
 * Preprocesa un crop de rostro para el modelo 2d106det
 */
function preprocessForLandmarks(faceCanvas: Canvas): ort.Tensor {
  const canvas = createCanvas(landmarkInputWidth, landmarkInputHeight);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, landmarkInputWidth, landmarkInputHeight);
  ctx.drawImage(faceCanvas, 0, 0, landmarkInputWidth, landmarkInputHeight);

  const imageData = ctx.getImageData(0, 0, landmarkInputWidth, landmarkInputHeight);
  const chw = normalizeCHW(
    imageData.data,
    landmarkInputWidth,
    landmarkInputHeight
  );

  return new ort.Tensor('float32', chw, [
    1,
    3,
    landmarkInputHeight,
    landmarkInputWidth,
  ]);
}

/**
 * Sigmoid
 */
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * IoU para NMS
 */
function iou(a: DetectedFace, b: DetectedFace): number {
  const x1 = Math.max(a.x1, b.x1);
  const y1 = Math.max(a.y1, b.y1);
  const x2 = Math.min(a.x2, b.x2);
  const y2 = Math.min(a.y2, b.y2);

  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const areaA = Math.max(0, a.x2 - a.x1) * Math.max(0, a.y2 - a.y1);
  const areaB = Math.max(0, b.x2 - b.x1) * Math.max(0, b.y2 - b.y1);

  const union = areaA + areaB - inter;
  if (union <= 0) return 0;
  return inter / union;
}

/**
 * Non-Maximum Suppression simple
 */
function nms(
  boxes: DetectedFace[],
  iouThreshold: number
): DetectedFace[] {
  const sorted = [...boxes].sort((a, b) => b.score - a.score);
  const kept: DetectedFace[] = [];

  while (sorted.length > 0) {
    const box = sorted.shift()!;
    kept.push(box);

    for (let i = sorted.length - 1; i >= 0; i--) {
      if (iou(box, sorted[i]) > iouThreshold) {
        sorted.splice(i, 1);
      }
    }
  }

  return kept;
}

/**
 * Decodifica salidas de SCRFD.
 *
 * SUPOSICIÓN de nombres de salida (muy común en scrfd_10g_bnkps):
 *   cls_8, bbox_8, cls_16, bbox_16, cls_32, bbox_32
 * Si tus nombres difieren, ajusta el mapping `strideOutputs` abajo.
 */
function decodeScrfdOutputs(
  outputs: Record<string, ort.Tensor>,
  inputW: number,
  inputH: number,
  scoreThreshold: number
): DetectedFace[] {

  // Mapeo explícito según tus shapes reales
  const map = {
    8: {
      cls: outputs['448'],
      bbox: outputs['451']
    },
    16: {
      cls: outputs['471'],
      bbox: outputs['474']
    },
    32: {
      cls: outputs['494'],
      bbox: outputs['497']
    }
  };

  const detections: DetectedFace[] = [];

  for (const stride of [8, 16, 32] as const) {
    const clsTensor = map[stride].cls;
    const bboxTensor = map[stride].bbox;

    if (!clsTensor || !bboxTensor) {
      console.error(`SCRFD: faltan tensores para stride ${stride}`);
      continue;
    }

    const cls = clsTensor.data as Float32Array | number[];
    const bbox = bboxTensor.data as Float32Array | number[];

    const numAnchors = cls.length; // ej: 12800 en stride 8

    // dims stride 8: H=80 W=80 => 80*80*2 = 12800
    const sH = Math.floor(inputH / stride); // 80
    const sW = Math.floor(inputW / stride); // 80

    for (let i = 0; i < numAnchors; i++) {
      const score = 1 / (1 + Math.exp(-cls[i]));
      if (score < scoreThreshold) continue;

      const dx = bbox[i * 4 + 0] * stride;
      const dy = bbox[i * 4 + 1] * stride;
      const dr = bbox[i * 4 + 2] * stride;
      const db = bbox[i * 4 + 3] * stride;

      const cell = Math.floor(i / 2);
      const anchorId = i % 2;

      const cyIndex = Math.floor(cell / sW);
      const cxIndex = cell % sW;

      let cx = cxIndex * stride;
      let cy = cyIndex * stride;

      // ambos anchors centrados aquí
      cx += stride / 2;
      cy += stride / 2;

      detections.push({
        x1: cx - dx,
        y1: cy - dy,
        x2: cx + dr,
        y2: cy + db,
        score
      });
    }
  }

  return detections;
}


/**
 * Dada una imagen y una caja (coords en input SCRFD), recorta a un canvas.
 */
function cropFaceCanvas(
  scrfdCanvas: Canvas,
  box: DetectedFace
): Canvas {
  const { width: iw, height: ih } = scrfdCanvas;

  const x1 = Math.max(0, Math.floor(box.x1));
  const y1 = Math.max(0, Math.floor(box.y1));
  const x2 = Math.min(iw, Math.floor(box.x2));
  const y2 = Math.min(ih, Math.floor(box.y2));

  const w = Math.max(1, x2 - x1);
  const h = Math.max(1, y2 - y1);

  const faceCanvas = createCanvas(w, h);
  const ctx = faceCanvas.getContext('2d');
  ctx.drawImage(scrfdCanvas, x1, y1, w, h, 0, 0, w, h);

  return faceCanvas;
}

/**
 * Corre 2d106det sobre un crop y devuelve 106 landmarks en coords del crop.
 *
 * SUPOSICIÓN de forma de salida:
 *   [1, 212] con [x1..x106, y1..y106] normalizados a [0,1].
 * Si tu modelo devuelve otra cosa (por ejemplo [1, 1, 106, 2]), adapta esta parte.
 */
async function runLandmarks(
  faceCanvas: Canvas
): Promise<{ x: number; y: number }[]> {
  await initLandmarks();

  if (!landmarkSession) {
    throw new Error('Landmark session no inicializada');
  }

  const inputTensor = preprocessForLandmarks(faceCanvas);
  const inputName = landmarkSession.inputNames[0];

  const outputs = await landmarkSession.run({
    [inputName]: inputTensor,
  });

  const outName = landmarkSession.outputNames[0];
  const outTensor = outputs[outName];

  const data = outTensor.data as Float32Array | Float64Array | number[];
  const arr = Array.from(data);

  const w = landmarkInputWidth;
  const h = landmarkInputHeight;

  // Si len === 212: asumimos [x1..x106, y1..y106] en [0,1]
  if (arr.length === 212) {
    const landmarks: { x: number; y: number }[] = [];

    for (let i = 0; i < 106; i++) {
      const nx = arr[i];
      const ny = arr[106 + i];
      landmarks.push({
        x: nx * w,
        y: ny * h,
      });
    }

    return landmarks;
  }

  // Fallback simple si el formato fuese [1, 1, 106, 2]
  if (arr.length === 106 * 2) {
    const landmarks: { x: number; y: number }[] = [];
    for (let i = 0; i < 106; i++) {
      const nx = arr[i * 2 + 0];
      const ny = arr[i * 2 + 1];
      landmarks.push({
        x: nx * w,
        y: ny * h,
      });
    }
    return landmarks;
  }

  throw new Error(
    `Formato de salida inesperado en 2d106det: length=${arr.length}`
  );
}

/**
 * Alinea rostro a 112x112 (simple) para ArcFace.
 * Puedes mejorarla usando una transformación de similitud con landmarks.
 */
function alignFaceSimple(faceCanvas: Canvas): Buffer {
  const targetSize = 112;
  const canvas = createCanvas(targetSize, targetSize);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, targetSize, targetSize);

  const w = faceCanvas.width;
  const h = faceCanvas.height;
  const scale = Math.min(targetSize / w, targetSize / h);
  const newW = w * scale;
  const newH = h * scale;

  const dx = (targetSize - newW) / 2;
  const dy = (targetSize - newH) / 2;

  ctx.drawImage(faceCanvas, 0, 0, w, h, dx, dy, newW, newH);

  // Devuelve JPEG listo para pasar a computeEmbeddingFromImage
  const buf = canvas.toBuffer('image/jpeg');
  return buf;
}

/**
 * Servicio principal: dado un Buffer de imagen
 * 1) Detecta rostros con SCRFD
 * 2) Aplica NMS y se queda con el mejor rostro
 * 3) Corre 2d106det sobre el crop
 * 4) Genera una imagen alineada 112x112 para ArcFace
 */
export class FaceDetectionService {
  constructor(
    private scoreThreshold: number = 0.5,
    private nmsThreshold: number = 0.4
  ) {}

  async detectMainFace(
    imageBuffer: Buffer
  ): Promise<FaceWithLandmarks | null> {
    await initScrfd();

    if (!scrfdSession) {
      throw new Error('SCRFD session no inicializada');
    }

    // 1) Preprocesar para SCRFD
    const {
      tensor,
      canvas: scrfdCanvas,
      resizeRatio,
      offsetX,
      offsetY,
      originalWidth,
      originalHeight,
    } = await preprocessForScrfd(imageBuffer);

    const inputName = scrfdSession.inputNames[0];

    // 2) Inferencia SCRFD
    const outputs = await scrfdSession.run({
      [inputName]: tensor,
    });

    // 3) Decodificar cajas en coords del input de SCRFD
    const rawBoxes = decodeScrfdOutputs(
      outputs,
      scrfdInputWidth,
      scrfdInputHeight,
      this.scoreThreshold
    );
    console.log("SCRFD detecciones crudas:", rawBoxes.length);


    if (rawBoxes.length === 0) {
      return null;
    }

    // 4) NMS
    const boxesNms = nms(rawBoxes, this.nmsThreshold);
    const best = boxesNms[0];

    // 5) Convertir coords del input SCRFD -> imagen original
    const x1 = Math.max(
      0,
      (best.x1 - offsetX) * resizeRatio
    );
    const y1 = Math.max(
      0,
      (best.y1 - offsetY) * resizeRatio
    );
    const x2 = Math.min(
      originalWidth,
      (best.x2 - offsetX) * resizeRatio
    );
    const y2 = Math.min(
      originalHeight,
      (best.y2 - offsetY) * resizeRatio
    );

    const finalBox: DetectedFace = {
      x1,
      y1,
      x2,
      y2,
      score: best.score,
    };

    // 6) Volver a recortar sobre el canvas de SCRFD para landmarks
    const faceCanvas = cropFaceCanvas(scrfdCanvas, best);

    // 7) Landmarks 106 puntos en coords del crop
    const landmarks = await runLandmarks(faceCanvas);

    // 8) Alineación simple a 112x112 (puedes mejorarla usando los landmarks)
    const alignedImageBuffer = alignFaceSimple(faceCanvas);

    return {
      ...finalBox,
      landmarks,
      alignedImageBuffer,
    };
  }
}

/**
 * Helper de alto nivel para otros servicios:
 * Dado un Buffer de imagen, devuelve únicamente lo que
 * necesita ArcFace: la imagen alineada (y algo de info opcional).
 */
export async function detectAndAlignFace(
  imageBuffer: Buffer
): Promise<FaceDetectionResult | null> {
  const service = new FaceDetectionService();
  const face = await service.detectMainFace(imageBuffer);

  if (!face) {
    return null;
  }

  return {
    alignedImageBuffer: face.alignedImageBuffer,
    bbox: [face.x1, face.y1, face.x2, face.y2],
    score: face.score,
    landmarks106: face.landmarks,
  };
}
