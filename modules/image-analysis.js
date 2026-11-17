// Motors visuals del analitzador. Els models s'importen només quan s'inicia l'anàlisi.
let objectDetectorPromise = null;
let faceDetectorPromise = null;
let sceneClassifierPromise = null;
let ocrWorkerPromise = null;
let ocrProgressListener = () => {};
let modelProgressListener = () => {};
let transformersPromise = null;
let webGpuSupportPromise = null;

// Reuse large models on powerful computers; release them on smaller devices to
// avoid keeping hundreds of megabytes in memory after the scan is complete.
function canKeepVisionModels() {
  return Number(navigator.deviceMemory) >= 8 && Number(navigator.hardwareConcurrency) >= 8;
}

const scenePrompts = [
  { id: 'street', prompt: 'a street, road, or city intersection' },
  { id: 'building', prompt: 'the exterior of a building or a building facade' },
  { id: 'park', prompt: 'a public park or garden' },
  { id: 'beach', prompt: 'a beach or coastline' },
  { id: 'landscape', prompt: 'a mountain, countryside, or natural landscape' },
  { id: 'monument', prompt: 'a monument, famous landmark, or historic site' },
  { id: 'commercial', prompt: 'a shop, storefront, or commercial area' },
  { id: 'bridge', prompt: 'a bridge or large transport structure' },
  { id: 'station', prompt: 'a train station, airport, or transport terminal' },
  { id: 'indoor', prompt: 'an indoor room or interior' },
  { id: 'portrait', prompt: 'a close-up portrait of one person' },
  { id: 'group', prompt: 'a group photo of several people' },
  { id: 'object', prompt: 'a close-up photo of an object' },
  { id: 'document', prompt: 'a document or a text-heavy screen' },
  { id: 'other', prompt: 'something else, not a recognizable place' }
];

function makeCanvas(image, maxDimension) {
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d', { willReadFrequently: false });
  if (!context) throw new Error('El navegador no pudo preparar la imagen.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function loadTransformers() {
  if (!transformersPromise) {
    transformersPromise = import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm')
      .catch(error => { transformersPromise = null; throw error; });
  }
  return transformersPromise;
}

function getWebGpuSupport() {
  if (!webGpuSupportPromise) {
    webGpuSupportPromise = (async () => {
      if (!globalThis.isSecureContext || !navigator.gpu) return false;
      try { return Boolean(await navigator.gpu.requestAdapter()); }
      catch (error) { return false; }
    })();
  }
  return webGpuSupportPromise;
}

function reportModelProgress(label, event) {
  if (event?.status === 'progress' && Number.isFinite(Number(event.progress))) {
    modelProgressListener(`${label}: descargando ${Math.round(Number(event.progress))}%`);
  } else if (event?.status === 'done') {
    modelProgressListener(`${label}: carga completada`);
  } else if (event?.status === 'initiate') {
    modelProgressListener(`${label}: iniciando carga…`);
  }
}

async function createVisionPipeline(task, model, label) {
  const { pipeline } = await loadTransformers();
  const progress_callback = event => reportModelProgress(label, event);

  // WebGPU gives compatible desktop browsers a faster inference path. LAN
  // pages served over plain HTTP and unsupported devices safely use q8/WASM.
  if (await getWebGpuSupport()) {
    try {
      modelProgressListener(`${label}: preparando aceleración gráfica…`);
      return await pipeline(task, model, { device: 'webgpu', dtype: 'fp16', progress_callback });
    } catch (error) {
      modelProgressListener(`${label}: usando el modo compatible…`);
    }
  }
  return pipeline(task, model, { dtype: 'q8', progress_callback });
}

function getObjectDetector() {
  if (!objectDetectorPromise) {
    objectDetectorPromise = createVisionPipeline('object-detection', 'Xenova/detr-resnet-50', 'Detector de objetos')
      .catch(error => { objectDetectorPromise = null; throw error; });
  }
  return objectDetectorPromise;
}

function getSceneClassifier() {
  if (!sceneClassifierPromise) {
    sceneClassifierPromise = createVisionPipeline('zero-shot-image-classification', 'Xenova/clip-vit-base-patch32', 'Clasificador de escenas')
      .catch(error => { sceneClassifierPromise = null; throw error; });
  }
  return sceneClassifierPromise;
}

async function releaseTransformersPipeline(pipeline, kind) {
  if (canKeepVisionModels()) return;
  try {
    await pipeline.dispose?.();
  } catch (error) {
    // La liberación de memoria es auxiliar; no debe ocultar los resultados obtenidos.
  }
  if (kind === 'objects') objectDetectorPromise = null;
  if (kind === 'scene') sceneClassifierPromise = null;
}

function getFaceDetector() {
  if (!faceDetectorPromise) {
    faceDetectorPromise = import('https://cdn.jsdelivr.net/npm/@vladmandic/human@3.3.6/dist/human.esm.js')
      .then(async ({ Human }) => {
        const human = new Human({
          backend: 'webgl',
          modelBasePath: 'https://vladmandic.github.io/human-models/models/',
          cacheModels: true,
          debug: false,
          face: {
            enabled: true,
            detector: { enabled: true, maxDetected: 10, rotation: false, minConfidence: 0.82, minSize: 22, iouThreshold: 0.35 },
            mesh: { enabled: true, keepInvalid: false },
            attention: { enabled: false }, iris: { enabled: false }, description: { enabled: false },
            emotion: { enabled: false }, antispoof: { enabled: false }, liveness: { enabled: false }, gear: { enabled: false }
          },
          body: { enabled: false }, hand: { enabled: false }, object: { enabled: false },
          gesture: { enabled: false }, segmentation: { enabled: false }
        });
        await human.load();
        return human;
      })
      .catch(error => { faceDetectorPromise = null; throw error; });
  }
  return faceDetectorPromise;
}

function getOcrWorker(onProgress) {
  ocrProgressListener = onProgress;
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = import('https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/+esm')
      .then(({ createWorker }) => createWorker('eng+spa', 1, {
        logger: message => {
          if (message.status === 'loading language traineddata') ocrProgressListener('Descargando datos OCR…');
          else if (message.status === 'recognizing text') ocrProgressListener('Leyendo texto de la imagen…');
        }
      }))
      .catch(error => { ocrWorkerPromise = null; throw error; });
  }
  return ocrWorkerPromise;
}

// Analitza els motors un per un per limitar l'ús de memòria i fer servir els que sí que carreguin.
export async function analyzeImage(image, onProgress = () => {}) {
  modelProgressListener = onProgress;
  const result = { objects: [], faces: null, scene: null, ocrText: '', engines: [], notes: [] };

  try {
    onProgress('Cargando detector de objetos…');
    const detector = await getObjectDetector();
    onProgress('Buscando objetos visibles…');
    try {
      result.objects = (await detector(makeCanvas(image, 512), { threshold: 0.45 }))
        .filter(item => Number(item.score) >= 0.45);
    } finally {
      // Transformers.js permite cerrar el modelo antes de cargar el siguiente.
      await releaseTransformersPipeline(detector, 'objects');
    }
    result.engines.push('objetos');
  } catch (error) {
    result.notes.push('El detector de objetos no se pudo cargar.');
  }

  try {
    onProgress('Cargando detector de rostros…');
    const detector = await getFaceDetector();
    onProgress('Buscando rostros…');
    const detection = await detector.detect(makeCanvas(image, 768));
    result.faces = (detection.face || []).filter(face => {
      const boxConfidence = Number(face.boxScore) || 0;
      const meshConfidence = Number(face.faceScore) || 0;
      const width = Number(face.size?.[0] ?? face.box?.[2]) || 0;
      const height = Number(face.size?.[1] ?? face.box?.[3]) || 0;
      // Filtra cajas poco fiables, caras diminutas y coincidencias faciales sin malla válida.
      return boxConfidence >= 0.82 && meshConfidence >= 0.72 && Array.isArray(face.mesh) && face.mesh.length > 0 && width >= 22 && height >= 22;
    });
    result.engines.push('rostros');
  } catch (error) {
    result.notes.push('No se pudo cargar el detector Human de rostros.');
  }

  try {
    onProgress('Clasificando el tipo general de escena…');
    const classifier = await getSceneClassifier();
    try {
      const matches = await classifier(makeCanvas(image, 512), scenePrompts.map(item => item.prompt), { top_k: 5 });
      result.scene = matches
        .map(item => ({ id: scenePrompts.find(option => option.prompt === item.label)?.id || 'other', score: Number(item.score) || 0 }))
        .sort((a, b) => b.score - a.score);
    } finally {
      await releaseTransformersPipeline(classifier, 'scene');
    }
    result.engines.push('tipo de escena');
  } catch (error) {
    result.notes.push('No se pudo cargar el clasificador local de escenas.');
  }

  try {
    const worker = await getOcrWorker(onProgress);
    // El límite de resolución evita reservar demasiada memoria en móviles.
    const recognized = await worker.recognize(makeCanvas(image, 1600));
    const confidentWords = (recognized.data.words || [])
      .filter(word => Number(word.confidence) >= 45)
      .map(word => word.text);
    const candidateText = (confidentWords.length ? confidentWords.join(' ') : recognized.data.text || '')
      .replace(/\s+/g, ' ')
      .trim();
    const confidence = Number(recognized.data.confidence) || 0;
    if (confidence >= 35 && /[\p{L}\p{N}]{3}/u.test(candidateText)) result.ocrText = candidateText;
    result.engines.push('OCR');
  } catch (error) {
    result.notes.push('El lector de texto (OCR) no se pudo cargar.');
  }

  return result;
}
