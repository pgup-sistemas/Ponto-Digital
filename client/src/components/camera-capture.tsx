import { useRef, useState, useCallback, useEffect } from "react";
import { Camera, CameraOff, MapPin, MapPinOff, RefreshCw, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CameraCaptureProps {
  onCapture: (imageBase64: string, location: GeolocationPosition | null) => void;
  isProcessing?: boolean;
}

export function CameraCapture({ onCapture, isProcessing = false }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraReady(true);
      }
    } catch (err) {
      console.error("Camera error:", err);
      setCameraError("Não foi possível acessar a câmera. Verifique as permissões.");
      setIsCameraReady(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraReady(false);
  }, []);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocalização não suportada");
      return;
    }

    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation(position);
      },
      (err) => {
        console.error("Location error:", err);
        setLocationError("Não foi possível obter localização");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  useEffect(() => {
    startCamera();
    getLocation();

    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera, getLocation]);

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady) return;

    setIsCapturing(true);
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const imageBase64 = canvas.toDataURL("image/jpeg", 0.8);
    
    onCapture(imageBase64, location);
    
    setTimeout(() => setIsCapturing(false), 500);
  }, [isCameraReady, location, onCapture]);

  return (
    <div className="space-y-4">
      <div className="relative aspect-[4/3] bg-muted rounded-xl overflow-hidden">
        {cameraError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <CameraOff className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{cameraError}</p>
            <Button variant="outline" onClick={startCamera} data-testid="button-retry-camera">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              data-testid="video-camera-preview"
            />
            
            <div className="absolute top-3 right-3">
              <Badge
                variant={location ? "default" : "secondary"}
                className="gap-1.5"
              >
                {location ? (
                  <>
                    <MapPin className="h-3 w-3" />
                    GPS OK
                  </>
                ) : locationError ? (
                  <>
                    <MapPinOff className="h-3 w-3" />
                    Sem GPS
                  </>
                ) : (
                  <>
                    <MapPin className="h-3 w-3 animate-pulse" />
                    Obtendo...
                  </>
                )}
              </Badge>
            </div>

            {isCapturing && (
              <div className="absolute inset-0 bg-white/50 dark:bg-black/50 flex items-center justify-center">
                <CheckCircle className="h-16 w-16 text-primary animate-pulse" />
              </div>
            )}
          </>
        )}
        
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="flex flex-col items-center gap-3">
        <Button
          size="lg"
          className="w-full py-6 text-lg"
          onClick={captureFrame}
          disabled={!isCameraReady || isProcessing || isCapturing}
          data-testid="button-capture"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
              Processando reconhecimento facial...
            </>
          ) : (
            <>
              <Camera className="h-5 w-5 mr-2" />
              Registrar Ponto
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center flex items-center gap-1.5">
          <Shield className="h-3 w-3" />
          Nenhuma imagem é armazenada. Processamento em tempo real.
        </p>
      </div>
    </div>
  );
}

function Shield(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </svg>
  );
}
