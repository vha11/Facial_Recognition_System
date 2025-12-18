-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rol" TEXT NOT NULL,
    "email" TEXT,
    "hashPassword" TEXT,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "puesto" TEXT,
    "area" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fechaAlta" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaBaja" DATETIME,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Imagen" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuarioId" TEXT NOT NULL,
    "uri" TEXT NOT NULL,
    "formato" TEXT,
    "ancho" INTEGER,
    "alto" INTEGER,
    "hashSha256" TEXT,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Imagen_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Embedding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "imagenId" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "version" TEXT,
    "vector" BLOB NOT NULL,
    "normaL2" REAL,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Embedding_imagenId_fkey" FOREIGN KEY ("imagenId") REFERENCES "Imagen" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Asistencia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuarioId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "confianza" REAL NOT NULL,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Asistencia_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Horario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuarioId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "horaEntradaProg" TEXT NOT NULL,
    "horaSalidaProg" TEXT NOT NULL,
    "toleranciaMin" INTEGER NOT NULL DEFAULT 10,
    CONSTRAINT "Horario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Feriado" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fecha" DATETIME NOT NULL,
    "descripcion" TEXT
);

-- CreateTable
CREATE TABLE "ExcepcionCalendario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuarioId" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "tipo" TEXT NOT NULL,
    CONSTRAINT "ExcepcionCalendario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Calendario" (
    "fecha" DATETIME NOT NULL PRIMARY KEY
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_rol_idx" ON "Usuario"("rol");

-- CreateIndex
CREATE INDEX "Usuario_activo_idx" ON "Usuario"("activo");

-- CreateIndex
CREATE INDEX "Usuario_nombre_idx" ON "Usuario"("nombre");

-- CreateIndex
CREATE INDEX "Imagen_usuarioId_idx" ON "Imagen"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Imagen_usuarioId_uri_key" ON "Imagen"("usuarioId", "uri");

-- CreateIndex
CREATE UNIQUE INDEX "Embedding_imagenId_key" ON "Embedding"("imagenId");

-- CreateIndex
CREATE INDEX "Asistencia_usuarioId_timestamp_idx" ON "Asistencia"("usuarioId", "timestamp");

-- CreateIndex
CREATE INDEX "Asistencia_timestamp_idx" ON "Asistencia"("timestamp");

-- CreateIndex
CREATE INDEX "Horario_usuarioId_diaSemana_idx" ON "Horario"("usuarioId", "diaSemana");

-- CreateIndex
CREATE UNIQUE INDEX "Feriado_fecha_key" ON "Feriado"("fecha");

-- CreateIndex
CREATE INDEX "ExcepcionCalendario_usuarioId_fecha_idx" ON "ExcepcionCalendario"("usuarioId", "fecha");
