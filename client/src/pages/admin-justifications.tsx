import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle, XCircle, ArrowLeft, Clock, User, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import type { Justification } from "@shared/schema";

interface JustificationWithDetails extends Justification {
  userName: string;
  punchTimestamp: Date | string;
  punchType: string;
}

export default function AdminJustificationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: justifications, isLoading } = useQuery<JustificationWithDetails[]>({
    queryKey: ["/api/admin/justifications"],
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const response = await apiRequest("PATCH", `/api/admin/justifications/${id}`, { status });
      return response.json();
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/justifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: status === "approved" ? "Justificativa Aprovada" : "Justificativa Rejeitada",
        description: status === "approved" 
          ? "O ponto foi marcado como OK." 
          : "O funcionário será notificado.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao processar",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const formatDateTime = (timestamp: Date | string) => {
    return new Date(timestamp).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Revisão de Justificativas</h1>
          <p className="text-muted-foreground">Aprovar ou rejeitar justificativas pendentes</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="py-6">
                <div className="space-y-4">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-20 w-full" />
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : justifications && justifications.length > 0 ? (
        <div className="space-y-4">
          {justifications.map((justification) => (
            <Card key={justification.id} data-testid={`justification-card-${justification.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                      <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        Justificativa #{justification.id.slice(0, 8)}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDateTime(justification.createdAt!)}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="h-3 w-3" />
                    Pendente
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-start gap-2 mb-2">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span className="text-sm font-medium">Motivo apresentado:</span>
                  </div>
                  <p className="text-sm text-foreground pl-6">{justification.reason}</p>
                </div>

                <div className="flex flex-col gap-2 p-3 rounded-lg border">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{justification.userName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      Ponto de {justification.punchType === "entry" ? "entrada" : "saída"} em{" "}
                      {formatDateTime(justification.punchTimestamp)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => reviewMutation.mutate({ id: justification.id, status: "approved" })}
                    disabled={reviewMutation.isPending}
                    className="flex-1"
                    data-testid={`button-approve-${justification.id}`}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Aprovar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => reviewMutation.mutate({ id: justification.id, status: "rejected" })}
                    disabled={reviewMutation.isPending}
                    className="flex-1"
                    data-testid={`button-reject-${justification.id}`}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Rejeitar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center gap-4">
              <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Nenhuma justificativa pendente</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Todas as justificativas foram analisadas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
