# Backend - Sistema de Reconocimiento Facial

Backend completo con Express + TypeScript + Prisma + SQLite

## 📁 Estructura del proyecto

```
backend/
├── src/
│   ├── controllers/       # Controladores (lógica de endpoints)
│   ├── services/          # Servicios (lógica de negocio)
│   ├── routes/            # Definición de rutas
│   ├── middlewares/       # Middlewares (auth, errors)
│   ├── config/            # Configuración (JWT, etc)
│   └── index.ts           # Punto de entrada
├── prisma/
│   └── schema.prisma      # Tu schema existente
├── uploads/               # Imágenes de empleados (se crea automáticamente)
├── .env                   # Variables de entorno
├── package.json
└── tsconfig.json
```

## 🚀 Instalación

### 1. Instalar dependencias
```bash
cd backend
npm install
```

### 2. Configurar variables de entorno
Crea el archivo `.env`:
```bash
cp .env.example .env
```

Edita `.env`:
```
DATABASE_URL="file:./dev.db"
JWT_SECRET="cambia-esto-por-algo-seguro"
PORT=3000
NODE_ENV=development
```

### 3. Inicializar base de datos
```bash
npm run prisma:generate
npm run prisma:migrate
```

### 4. Crear usuario admin inicial
Ejecuta en la consola de Prisma Studio o con un script:
```bash
npm run prisma:studio
```

O ejecuta este código una vez:
```typescript
// scripts/create-admin.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('admin123', 10);
  
  await prisma.usuario.create({
    data: {
      rol: 'ADMIN',
      nombre: 'Administrador',
      email: 'admin@empresa.com',
      hashPassword: password,
      activo: true,
    },
  });
  
  console.log('✅ Admin creado: admin@empresa.com / admin123');
}

main();
```

## 🎯 Endpoints

### Auth
```
POST   /api/auth/login       - Login de administrador
GET    /api/auth/verify      - Verificar token (requiere auth)
POST   /api/auth/logout      - Cerrar sesión
```

### Employees
```
GET    /api/employees             - Listar empleados (requiere auth admin)
GET    /api/employees/:id         - Obtener empleado (requiere auth admin)
POST   /api/employees             - Crear empleado (requiere auth admin, acepta multipart/form-data)
PUT    /api/employees/:id         - Actualizar empleado (requiere auth admin)
DELETE /api/employees/:id         - Eliminar empleado (requiere auth admin)
PATCH  /api/employees/:id/toggle-status - Activar/desactivar (requiere auth admin)
```

### Attendance
```
GET    /api/attendance            - Listar asistencias (requiere auth)
POST   /api/attendance            - Registrar asistencia (requiere auth)
GET    /api/attendance/export     - Exportar CSV (requiere auth)
```

### Embeddings
```
GET    /api/embeddings                      - Obtener todos los embeddings activos (requiere auth)
POST   /api/embeddings                      - Guardar embedding (requiere auth)
GET    /api/embeddings/employee/:employeeId - Obtener embeddings de un empleado (requiere auth)
```

## 💻 Desarrollo

```bash
# Modo desarrollo (con hot reload)
npm run dev

# Compilar TypeScript
npm run build

# Ejecutar en producción
npm start
```

## 🔐 Autenticación

Todas las rutas (excepto `/api/auth/login`) requieren autenticación JWT.

**Header requerido:**
```
Authorization: Bearer <token>
```

**Flujo:**
1. Login → obtienes el token
2. Guardas el token en tu frontend
3. Envías el token en cada petición

## 📝 Ejemplos de uso

### Login
```javascript
POST /api/auth/login
Body: {
  "email": "admin@empresa.com",
  "password": "admin123"
}

Response: {
  "token": "eyJhbGc...",
  "user": {
    "id": "...",
    "email": "admin@empresa.com",
    "name": "Administrador",
    "role": "ADMIN"
  }
}
```

### Crear empleado
```javascript
POST /api/employees
Headers: {
  "Authorization": "Bearer <token>"
}
Body (multipart/form-data): {
  "nombre": "Juan Pérez",
  "telefono": "+52 555 1234",
  "puesto": "Desarrollador",
  "area": "Tecnología",
  "activo": true,
  "images": [File, File, File] // Array de imágenes
}
```

### Registrar asistencia (desde frontend con MediaPipe)
```javascript
POST /api/attendance
Headers: {
  "Authorization": "Bearer <token>"
}
Body: {
  "employeeId": "uuid-del-empleado",
  "type": "ENTRADA",  // o "SALIDA"
  "confidence": 0.95
}
```

### Guardar embedding (después de MediaPipe)
```javascript
POST /api/embeddings
Headers: {
  "Authorization": "Bearer <token>"
}
Body: {
  "imagenId": "uuid-de-la-imagen",
  "modelo": "mediapipe-facemesh",
  "version": "0.1",
  "vector": [0.234, 0.456, ...], // Array de números o base64
  "normaL2": 1.0
}
```

## 🔌 Integración con Electron

El backend se ejecutará como proceso hijo de Electron. Ver `electron/src/main.ts` para la configuración.

## 📦 Base de datos

SQLite se usa para desarrollo. Los archivos se guardan en:
- `prisma/dev.db` - Base de datos
- `uploads/employees/` - Imágenes de empleados

## 🐛 Debugging

Logs aparecen en la consola. En desarrollo usa:
```bash
npm run dev
```

Y visita: http://localhost:3000/health