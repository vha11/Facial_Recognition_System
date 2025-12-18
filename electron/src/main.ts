import { app, BrowserWindow } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import axios from 'axios';

let backendProcess: ChildProcess | null = null;
let mainWindow: BrowserWindow | null = null;

const BACKEND_PORT = 3000;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;
const isDev = !app.isPackaged; // true en desarrollo, false en producción

/**
 * Inicia el servidor Express como proceso hijo
 */
function startBackendServer() {
  console.log('🚀 Iniciando servidor Express...');

  // En desarrollo, NO iniciar Express (ya está corriendo con npm run dev)
  if (isDev) {
    console.log('⚠️  Modo desarrollo: Se espera que Express ya esté corriendo en puerto 3000');
    return;
  }

  // En producción: ejecutar el build de Express
  const backendPath = path.join(process.resourcesPath, 'backend', 'dist', 'index.js');
  console.log(`Ejecutando: node ${backendPath}`);

  backendProcess = spawn('node', [backendPath], {
    stdio: 'pipe',
    env: {
      ...process.env,
      PORT: BACKEND_PORT.toString(),
      NODE_ENV: 'production',
    },
  });

  // Logs del proceso Express
  backendProcess.stdout?.on('data', (data) => {
    console.log(`[Express] ${data.toString()}`);
  });

  backendProcess.stderr?.on('data', (data) => {
    console.error(`[Express Error] ${data.toString()}`);
  });

  backendProcess.on('close', (code) => {
    console.log(`Express cerrado con código: ${code}`);
  });

  backendProcess.on('error', (err) => {
    console.error('Error al iniciar Express:', err);
  });
}

/**
 * Espera a que Express esté listo antes de crear la ventana
 */
async function waitForBackend() {
  if (isDev) {
    console.log('✅ Modo desarrollo: Express ya verificado');
    return;
  }

  console.log(`⏳ Esperando a Express en ${BACKEND_URL}...`);

  const maxAttempts = 30;
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      await axios.get(`${BACKEND_URL}/health`, { timeout: 1000 });
      console.log('✅ Express está listo!');
      return;
    } catch (error) {
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.error('❌ Express no respondió a tiempo');
  app.quit();
}

/**
 * Crea la ventana principal de Electron
 */
function createWindow() {
  console.log('🪟 Creando ventana principal...');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'Sistema de Reconocimiento Facial',
  });

  // Cargar la aplicación
  if (isDev) {
    // Desarrollo: cargar desde Vite dev server
    console.log('🔄 Cargando desde Vite dev server...');
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Producción: cargar archivos estáticos
    console.log('📦 Cargando desde archivos estáticos...');
    mainWindow.loadFile(path.join(__dirname, '../../frontend/dist/index.html'));
  }

  mainWindow.on('closed', () => {
    console.log('🔴 Ventana cerrada');
    mainWindow = null;
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('❌ Error al cargar:', errorCode, errorDescription);
  });
}

/**
 * Detiene el servidor Express
 */
function stopBackendServer() {
  if (backendProcess) {
    console.log('🛑 Deteniendo servidor Express...');

    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', backendProcess.pid!.toString(), '/f', '/t']);
    } else {
      backendProcess.kill('SIGTERM');
    }

    backendProcess = null;
  }
}

// ============================================
// EVENTOS DEL CICLO DE VIDA DE ELECTRON
// ============================================

app.whenReady().then(async () => {
  try {
    // 1. Iniciar Express (solo en producción)
    startBackendServer();

    // 2. Esperar a que Express esté listo
    await waitForBackend();

    // 3. Crear la ventana
    createWindow();

    console.log('✅ Aplicación iniciada correctamente');
  } catch (error) {
    console.error('❌ Error durante la inicialización:', error);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  console.log('🔴 Todas las ventanas cerradas');
  if (process.platform !== 'darwin') {
    stopBackendServer();
    app.quit();
  }
});

app.on('before-quit', () => {
  console.log('🛑 Cerrando aplicación...');
  stopBackendServer();
});

process.on('uncaughtException', (error) => {
  console.error('Error no capturado:', error);
  stopBackendServer();
  app.quit();
});