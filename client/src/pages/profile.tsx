import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Camera, Shield, LogOut, CheckCircle, AlertCircle, Building, Mail, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { CameraCapture } from "@/components/camera-capture";
import { apiRequest } from "@/lib/queryClient";

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showEnrollment, setShowEnrollment] = useState(false);

  const enrollMutation = useMutation({
    mutationFn: async (imageBase64: string) => {
      const response = await apiRequest("POST", `/api/users/${user?.id}/enroll-face`, {
        imageBase64,
      });
      return response.json();
    },
    onSuccess: (data) => {
      updateUser(data.user);
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      setShowEnrollment(false);
      toast({
        title: "Cadastro facial concluído!",
        description: "Seu rosto foi registrado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro no cadastro",
        description: error instanceof Error ? error.message : "Não foi possível registrar",
        variant: "destructive",
      });
    },
  });

  const handleEnrollCapture = (imageBase64: string) => {
    enrollMutation.mutate(imageBase64);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isEnrolled = !!user?.enrolledAt;

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Perfil</h1>
        <p className="text-muted-foreground">Gerencie suas informações</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {user?.name ? getInitials(user.name) : "U"}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center md:text-left">
              <h2 className="text-xl font-semibold" data-testid="text-user-name">
                {user?.name}
              </h2>
              <div className="flex flex-col md:flex-row md:items-center gap-2 mt-2 text-muted-foreground">
                <div className="flex items-center justify-center md:justify-start gap-1.5">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">{user?.email}</span>
                </div>
                {user?.department && (
                  <>
                    <Separator orientation="vertical" className="hidden md:block h-4" />
                    <div className="flex items-center justify-center md:justify-start gap-1.5">
                      <Building className="h-4 w-4" />
                      <span className="text-sm">{user.department}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <Badge
              variant={isEnrolled ? "default" : "secondary"}
              className="gap-1.5"
            >
              {isEnrolled ? (
                <>
                  <CheckCircle className="h-3 w-3" />
                  Face cadastrada
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3" />
                  Face não cadastrada
                </>
              )}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Cadastro Facial
          </CardTitle>
          <CardDescription>
            {isEnrolled
              ? "Seu rosto está cadastrado para validação de ponto."
              : "Cadastre seu rosto para validar seus registros de ponto."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showEnrollment ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-orange-800 dark:text-orange-300">
                      Consentimento Biométrico
                    </p>
                    <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                      Ao prosseguir, você autoriza o processamento dos seus dados biométricos
                      exclusivamente para validação de ponto. Nenhuma imagem facial é armazenada,
                      apenas um código matemático (embedding) que não pode ser revertido em imagem.
                    </p>
                  </div>
                </div>
              </div>

              <CameraCapture
                onCapture={handleEnrollCapture}
                isProcessing={enrollMutation.isPending}
              />

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowEnrollment(false)}
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => setShowEnrollment(true)}
                className="flex-1"
                data-testid="button-enroll-face"
              >
                <Camera className="h-4 w-4 mr-2" />
                {isEnrolled ? "Atualizar Cadastro Facial" : "Cadastrar Face"}
              </Button>

              {isEnrolled && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Cadastrado em {new Date(user.enrolledAt!).toLocaleDateString("pt-BR")}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacidade e Segurança
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Dados Biométricos Protegidos</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Nenhuma imagem facial é armazenada. Apenas embeddings matemáticos são salvos.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Processamento em Tempo Real</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Imagens são processadas instantaneamente e descartadas após validação.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Conformidade LGPD</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Sistema em conformidade com a Lei Geral de Proteção de Dados.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full text-destructive" data-testid="button-logout">
                <LogOut className="h-4 w-4 mr-2" />
                Sair da Conta
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sair da conta?</AlertDialogTitle>
                <AlertDialogDescription>
                  Você precisará fazer login novamente para acessar o sistema.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={logout} data-testid="button-confirm-logout">
                  Sair
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
