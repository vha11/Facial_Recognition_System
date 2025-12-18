import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Camera as CameraIcon, Clock, UserCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFaceDetection } from "@/hooks/useFaceDetection";
import { attendanceService } from "@/services/attendance";

interface AttendanceRecord {
  id: string;
  employeeName: string;
  type: "ENTRADA" | "SALIDA";
  time: string;
  confidence: number;
}

const IS_DEV = process.env.NODE_ENV === "development";

const Camera = () => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [recentAttendances, setRecentAttendances] = useState<AttendanceRecord[]>([]);
  const [detectionStatus, setDetectionStatus] = useState<string>("Esperando...");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastDetectionRef = useRef<Map<string, number>>(new Map());
  const { toast } = useToast();

  const {
    isLoading: isModelLoading,
    error: modelError,
    isDetecting,
    startContinuousDetection,
    stopContinuousDetection,
  } = useFaceDetection();

  // Manejo de montaje/desmontaje compatible con StrictMode
  useEffect(() => {
    return () => {
      // En desarrollo React StrictMode llama este cleanup extra; no detenemos la cámara ahí
      if (IS_DEV) return;

      // En producción: detener stream y detección al desmontar realmente el componente
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      stopContinuousDetection();
    };
  }, [stopContinuousDetection]);

  /**
   * Seleccionar cámara:
   * - Intenta iVCam si existe
   * - Si no, usa cámara por defecto con constraints base
   * - Si falla, fallback muy simple { video: true }
   */
  const getCameraStream = async (): Promise<MediaStream> => {
    const baseVideoConstraints: MediaTrackConstraints = {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      aspectRatio: { ideal: 16 / 9 },
    };

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");

      const ivcamDevice = videoDevices.find((d) =>
        (d.label || "").toLowerCase().includes("ivcam")
      );

      if (ivcamDevice) {
        return navigator.mediaDevices.getUserMedia({
          video: {
            ...baseVideoConstraints,
            deviceId: { exact: ivcamDevice.deviceId },
          },
          audio: false,
        });
      }

      return navigator.mediaDevices.getUserMedia({
        video: baseVideoConstraints,
        audio: false,
      });
    } catch (error) {
      console.error("Error en getCameraStream, usando fallback simple:", error);
      return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }
  };

  /**
   * Iniciar captura de cámara y detección facial
   */
  const startCapture = async () => {
    if (isModelLoading) {
      toast({
        title: "Cargando modelo...",
        description: "Espera a que el modelo de IA se cargue",
        className: "floating-notification border-l-4 border-l-app-warning",
      });
      return;
    }

    if (modelError) {
      toast({
        variant: "destructive",
        title: "Error del modelo",
        description: modelError,
        className: "floating-notification border-l-4 border-l-app-error",
      });
      return;
    }

    try {
      const stream = await getCameraStream();

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCapturing(true);

        videoRef.current.onloadedmetadata = () => {
          if (!videoRef.current) return;

          videoRef.current
            .play()
            .catch((err) =>
              console.error("Error al hacer play() del video:", err)
            );

          startContinuousDetection(
            videoRef.current,
            handleFaceDetection,
            2000 // cada 2 segundos
          );

          toast({
            title: "Sistema activo",
            description: "Reconocimiento facial iniciado",
            className: "floating-notification border-l-4 border-l-app-success",
          });
        };
      }
    } catch (error) {
      console.error("Error al iniciar la captura:", error);
      toast({
        variant: "destructive",
        title: "Error de cámara",
        description: "No se pudo acceder a la cámara. Verifica permisos.",
        className: "floating-notification border-l-4 border-l-app-error",
      });
    }
  };

  /**
   * Pausar captura y detección
   */
  const pauseCapture = () => {
    stopContinuousDetection();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCapturing(false);
    setDetectionStatus("Pausado");

    toast({
      title: "Sistema pausado",
      description: "Reconocimiento facial detenido",
      className: "floating-notification border-l-4 border-l-app-warning",
    });
  };

  const toggleCapture = () => {
    if (isCapturing) {
      pauseCapture();
    } else {
      startCapture();
    }
  };

  /**
   * Callback cuando MediaPipe detecta un rostro
   */
  const handleFaceDetection = async (_detectedFace: any) => {
    if (!_detectedFace) {
      setDetectionStatus("No se detecta ningún rostro");
      return;
    }

    if (!videoRef.current) {
      setDetectionStatus("Video no disponible");
      return;
    }

    setDetectionStatus("Rostro detectado, identificando...");

    try {
      const video = videoRef.current;

      // 1. Capturar frame a canvas
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        console.error("No se pudo obtener contexto de canvas");
        setDetectionStatus("Error al capturar imagen");
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // 2. Canvas → Blob JPEG
      const imageBlob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("No se pudo generar blob de la imagen"));
          },
          "image/jpeg",
          0.9
        );
      });

      // 3. Llamar backend: reconocer + registrar asistencia
      const result = await attendanceService.recognizeAndRecord(imageBlob);

      if (!result.match) {
        setDetectionStatus("Rostro no reconocido");
        toast({
          title: "Rostro desconocido",
          description: "No se encontró coincidencia en el sistema",
          className: "floating-notification border-l-4 border-l-app-warning",
        });
        return;
      }

      const {
        employeeId,
        employeeName,
        confidence,
        type,
        timestamp,
        attendanceId,
      } = result;

      if (!employeeId || !employeeName || !type || !timestamp || !attendanceId) {
        console.warn("Respuesta incompleta de recognizeAndRecord:", result);
        setDetectionStatus("Error en datos de reconocimiento");
        return;
      }

      // Cooldown anti-duplicados (30s por empleado)
      const now = Date.now();
      const lastDetection = lastDetectionRef.current.get(employeeId);
      if (lastDetection && now - lastDetection < 30000) {
        return;
      }
      lastDetectionRef.current.set(employeeId, now);

      setDetectionStatus(`Identificado: ${employeeName}`);

      const timeLabel = new Date(timestamp).toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const newRecord: AttendanceRecord = {
        id: attendanceId,
        employeeName,
        type,
        time: timeLabel,
        confidence: confidence ?? 0,
      };

      setRecentAttendances((prev) => [newRecord, ...prev.slice(0, 9)]);

      toast({
        title: "Asistencia registrada",
        description: `${employeeName} - ${type} registrada exitosamente`,
        className: "floating-notification border-l-4 border-l-app-success",
      });
    } catch (error) {
      console.error("Error al identificar rostro:", error);
      setDetectionStatus("Error al identificar");
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo procesar el reconocimiento facial",
        className: "floating-notification border-l-4 border-l-app-error",
      });
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-app-text-primary mb-2">
            Cámara en Tiempo Real
          </h1>
          <p className="text-app-text-secondary text-lg">
            Sistema de reconocimiento facial con IA
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="glass-card p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full",
                      isCapturing
                        ? "bg-app-success animate-pulse"
                        : "bg-app-text-secondary"
                    )}
                  />
                  <span className="text-app-text-primary font-medium">
                    {isModelLoading ? "Cargando modelo..." : detectionStatus}
                  </span>
                  {isDetecting && (
                    <Loader2 className="w-4 h-4 text-app-accent-start animate-spin" />
                  )}
                </div>

                <Button
                  onClick={toggleCapture}
                  disabled={isModelLoading}
                  className={cn(
                    "bg-gradient-accent text-app-text-light hover:scale-105 transition-bounce",
                    isCapturing && "hover:opacity-90"
                  )}
                >
                  <CameraIcon className="w-4 h-4 mr-2" />
                  {isCapturing ? "Pausar" : "Iniciar Captura"}
                </Button>
              </div>

              <div className="relative aspect-video bg-gradient-glass rounded-2xl overflow-hidden border border-app-text-secondary/20 shadow-elevated">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {!isCapturing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-glass">
                    <div className="text-center">
                      {isModelLoading ? (
                        <>
                          <Loader2 className="w-16 h-16 text-app-accent-start mx-auto mb-4 animate-spin" />
                          <p className="text-app-text-secondary text-lg">
                            Cargando modelo de IA...
                          </p>
                        </>
                      ) : (
                        <>
                          <CameraIcon className="w-16 h-16 text-app-text-secondary mx-auto mb-4" />
                          <p className="text-app-text-secondary text-lg">
                            Presiona "Iniciar Captura" para comenzar
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {isCapturing && (
                  <div className="absolute top-4 right-4 glass px-3 py-1 rounded-full">
                    <span className="text-app-text-primary text-sm font-medium">
                      EN VIVO
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-app-text-primary mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Últimas Asistencias
              </h3>

              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {recentAttendances.map((attendance) => (
                  <div
                    key={attendance.id}
                    className="glass p-3 rounded-xl border border-app-text-secondary/10"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full flex-shrink-0",
                          attendance.type === "ENTRADA"
                            ? "bg-app-success"
                            : "bg-app-warning"
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-app-text-primary truncate">
                          {attendance.employeeName}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span
                            className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              attendance.type === "ENTRADA"
                                ? "bg-app-success/20 text-app-success"
                                : "bg-app-warning/20 text-app-warning"
                            )}
                          >
                            {attendance.type}
                          </span>
                          <span className="text-xs text-app-text-secondary">
                            {attendance.time}
                          </span>
                        </div>
                        <div className="mt-1">
                          <span className="text-xs text-app-text-secondary">
                            {Math.round(attendance.confidence * 100)}% confianza
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {recentAttendances.length === 0 && (
                <div className="text-center py-8">
                  <UserCheck className="w-8 h-8 text-app-text-secondary mx-auto mb-2" />
                  <p className="text-app-text-secondary text-sm">
                    No hay asistencias recientes
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Camera;
