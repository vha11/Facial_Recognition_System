# Facial Recognition System

Sistema de reconocimiento facial multiplataforma desarrollado como aplicación **Desktop** usando **Electron**, con un **backend en Node.js** y un **frontend web moderno**. El sistema permite el registro de empleados, detección facial, generación de embeddings y control de asistencia.

---

## 📌 Características principales

* 📷 Captura y detección facial en tiempo real
* 🧠 Generación de embeddings faciales
* 👤 Registro y gestión de empleados
* 🕒 Control de asistencia
* 🖥️ Aplicación de escritorio multiplataforma (Windows / macOS / Linux)
* 🔐 Autenticación con JWT

---

## 🏗️ Arquitectura del proyecto

El proyecto está organizado como un **monorepo**:

```
facialRecognitionSystem/
│
├── backend/        # API REST (Node.js + TypeScript)
├── frontend/       # Interfaz web (Vite + React + Tailwind)
├── electron/       # Aplicación Desktop (Electron)
└── README.md
```

### Tecnologías utilizadas

* **Backend**: Node.js, TypeScript, Express, Prisma, SQLite
* **Frontend**: React, Vite, TypeScript, Tailwind CSS
* **Desktop**: Electron, Electron Builder
* **Autenticación**: JWT
* **Reconocimiento facial**: OpenCV / modelos ONNX (no incluidos en el repo)

---

## ⚠️ Modelos de reconocimiento facial

Los **modelos de reconocimiento facial no se incluyen en el repositorio** debido a su tamaño.

Para ejecutar el sistema correctamente debes:

1. Descargar o entrenar los modelos de reconocimiento facial
2. Colocarlos en la ruta:

```
backend/src/models/
```

Ejemplo de modelos esperados:

* `scrfd_10g_bnkps.onnx`
* `glintr100.onnx`
* `2d106det.onnx`

---

## 🚀 Ejecución en modo desarrollo

### 1️⃣ Requisitos previos

* Node.js >= 18
* npm

---

### 2️⃣ Instalación de dependencias

Desde la raíz del proyecto:

```bash
cd backend && npm install
cd ../frontend && npm install
cd ../electron && npm install
```

---

### 3️⃣ Variables de entorno

Configura el archivo:

```
backend/.env
```

Ejemplo:

```env
PORT=3000
JWT_SECRET=supersecretkey
DATABASE_URL="file:./prisma/facial_recognition_system.db"
```

---

### 4️⃣ Ejecutar en modo desarrollo (Electron + Backend + Frontend)

Desde la carpeta `electron`:

```bash
npm run dev
```

Este comando ejecuta:

* Backend → `http://localhost:3000`
* Frontend → `http://localhost:5173`
* Electron → Aplicación Desktop

---

## 🏗️ Build de la aplicación

### Build completo

Desde `electron`:

```bash
npm run build:all
```

---

### Generar instaladores

```bash
npm run dist
```

Se generarán instaladores para:

* 🪟 Windows (`.exe`, portable)
* 🍎 macOS (`.dmg`)
* 🐧 Linux (`.AppImage`, `.deb`)

Los archivos se guardan en:

```
electron/release/
```

---

## 🔐 Seguridad

* Autenticación basada en JWT
* Los archivos `.env` **no deben compartirse públicamente**
* Los modelos de ML se mantienen fuera del repositorio

---

## 🧪 Estado del proyecto

* ✔ Funcional
* ✔ Arquitectura modular
* ✔ Preparado para entrega académica
* ✔ Preparado para empaquetado como aplicación Desktop

---

## 👩‍💻 Autoras

**Valentina Buendía**
**María José Rodríguez**
Proyecto académico – Sistema de Reconocimiento Facial

---

## 📄 Licencia

Este proyecto se distribuye bajo la licencia **MIT**.
