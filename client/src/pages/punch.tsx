import { useState, useEffect } from "react";
import { Clock, LogIn, LogOut, CheckCircle, AlertCircle, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { CameraCapture } from "@/components/camera-capture";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Punch } from "@shared/schema";

export default function PunchPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [punchType, setPunchType] = useState<"entry" | "exit">("entry");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const { data: lastPunch, isLoading: loadingLastPunch } = useQuery<Punch>({
    queryKey: ["/api/punches/last"],
  });

  useEffect(() => {
    if (lastPunch) {
      setPunchType(lastPunch.type === "entry" ? "exit" : "entry");
    }
  }, [lastPunch]);

  const punchMutation = useMutation({
    mutationFn: async (data: {
      imageBase64: string;
      type: "entry" | "exit";
      latitude?: number;
      longitude?: number;
      gpsAccuracy?: number;
    }) => {
      const response = await apiRequest("POST", "/api/punches/face-match", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/punches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/punches/last"] });
      
      if (data.status === "ok") {
        toast({
          title: "Ponto registrado!",
          description: `${punchType === "entry" ? "Entrada" : "Saída"} registrada com sucesso.`,
        });
      } else {
        toast({
          title: "Ponto pendente",
          description: "Validação facial ou GPS incompleta. Adicione uma justificativa.",
          variant: "default",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Erro ao registrar ponto",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const handleCapture = (imageBase64: string, location: GeolocationPosition | null) => {
    punchMutation.mutate({
      imageBase64,
      type: punchType,
      latitude: location?.coords.latitude,
      longitude: location?.coords.longitude,
      gpsAccuracy: location?.coords.accuracy,
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
      <div className="text-center space-y-2">
        <div className="text-5xl md:text-6xl font-bold tracking-tight text-foreground" data-testid="text-current-time">
          {formatTime(currentTime)}
        </div>
        <p className="text-muted-foreground capitalize" data-testid="text-current-date">
          {formatDate(currentTime)}
        </p>
        <p className="text-sm text-muted-foreground">
          Olá, <span className="font-medium text-foreground">{user?.name}</span>
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-lg">Registrar Ponto</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={punchType === "entry" ? "default" : "outline"}
                size="sm"
                onClick={() => setPunchType("entry")}
                data-testid="button-type-entry"
              >
                <LogIn className="h-4 w-4 mr-1.5" />
                Entrada
              </Button>
              <Button
                variant={punchType === "exit" ? "default" : "outline"}
                size="sm"
                onClick={() => setPunchType("exit")}
                data-testid="button-type-exit"
              >
                <LogOut className="h-4 w-4 mr-1.5" />
                Saída
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CameraCapture
            onCapture={handleCapture}
            isProcessing={punchMutation.isPending}
          />
        </CardContent>
      </Card>

      {lastPunch && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Último Registro</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${lastPunch.type === "entry" ? "bg-green-100 dark:bg-green-900/30" : "bg-orange-100 dark:bg-orange-900/30"}`}>
                  {lastPunch.type === "entry" ? (
                    <LogIn className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <LogOut className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {lastPunch.type === "entry" ? "Entrada" : "Saída"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(lastPunch.timestamp).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
              <Badge
                variant={lastPunch.status === "ok" ? "default" : "secondary"}
                className="gap-1"
              >
                {lastPunch.status === "ok" ? (
                  <>
                    <CheckCircle className="h-3 w-3" />
                    Confirmado
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3" />
                    Pendente
                  </>
                )}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {loadingLastPunch && (
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-3 w-32 bg-muted rounded animate-pulse" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
