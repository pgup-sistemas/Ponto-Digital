import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Clock, Send, ChevronDown, ChevronUp, FileText, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Punch, Justification } from "@shared/schema";

interface PendingPunchWithJustification extends Punch {
  justification?: Justification;
}

export default function JustificationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedPunches, setExpandedPunches] = useState<Set<string>>(new Set());
  const [justificationTexts, setJustificationTexts] = useState<Record<string, string>>({});

  const { data: pendingPunches, isLoading: loadingPunches } = useQuery<PendingPunchWithJustification[]>({
    queryKey: ["/api/punches/pending"],
  });

  const { data: justifications, isLoading: loadingJustifications } = useQuery<Justification[]>({
    queryKey: ["/api/justifications"],
  });

  const submitJustification = useMutation({
    mutationFn: async (data: { punchId: string; reason: string }) => {
      const response = await apiRequest("POST", "/api/justifications", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/justifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/punches/pending"] });
      toast({
        title: "Justificativa enviada",
        description: "Sua justificativa foi registrada e aguarda análise.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const toggleExpand = (punchId: string) => {
    const newExpanded = new Set(expandedPunches);
    if (newExpanded.has(punchId)) {
      newExpanded.delete(punchId);
    } else {
      newExpanded.add(punchId);
    }
    setExpandedPunches(newExpanded);
  };

  const handleSubmit = (punchId: string) => {
    const reason = justificationTexts[punchId];
    if (!reason?.trim()) {
      toast({
        title: "Texto obrigatório",
        description: "Digite uma justificativa antes de enviar.",
        variant: "destructive",
      });
      return;
    }

    submitJustification.mutate({ punchId, reason: reason.trim() });
    setJustificationTexts((prev) => ({ ...prev, [punchId]: "" }));
    toggleExpand(punchId);
  };

  const formatDateTime = (timestamp: Date | string) => {
    return new Date(timestamp).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="h-3 w-3" />
            Aprovada
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Rejeitada
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Em análise
          </Badge>
        );
    }
  };

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Justificativas</h1>
        <p className="text-muted-foreground">Gerencie seus pontos pendentes</p>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Pontos Pendentes
          </h2>

          {loadingPunches ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-9 w-24" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : pendingPunches && pendingPunches.length > 0 ? (
            <div className="space-y-3">
              {pendingPunches.map((punch) => (
                <Card key={punch.id}>
                  <Collapsible
                    open={expandedPunches.has(punch.id)}
                    onOpenChange={() => toggleExpand(punch.id)}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                          <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">
                            {punch.type === "entry" ? "Entrada" : "Saída"} - Pendente
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDateTime(punch.timestamp)}
                          </p>
                          {!punch.faceMatched && (
                            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                              Reconhecimento facial não confirmado
                            </p>
                          )}
                          {!punch.gpsValid && (
                            <p className="text-xs text-orange-600 dark:text-orange-400">
                              Localização não validada
                            </p>
                          )}
                        </div>

                        <CollapsibleTrigger asChild>
                          <Button variant="outline" size="sm" data-testid={`button-expand-${punch.id}`}>
                            {expandedPunches.has(punch.id) ? (
                              <>
                                Fechar
                                <ChevronUp className="h-4 w-4 ml-1" />
                              </>
                            ) : (
                              <>
                                Justificar
                                <ChevronDown className="h-4 w-4 ml-1" />
                              </>
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </div>

                      <CollapsibleContent className="mt-4 space-y-3">
                        <Textarea
                          placeholder="Descreva o motivo da pendência..."
                          value={justificationTexts[punch.id] || ""}
                          onChange={(e) =>
                            setJustificationTexts((prev) => ({
                              ...prev,
                              [punch.id]: e.target.value,
                            }))
                          }
                          className="min-h-[100px]"
                          data-testid={`textarea-justification-${punch.id}`}
                        />
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            {(justificationTexts[punch.id] || "").length}/500 caracteres
                          </p>
                          <Button
                            onClick={() => handleSubmit(punch.id)}
                            disabled={submitJustification.isPending}
                            data-testid={`button-submit-${punch.id}`}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            {submitJustification.isPending ? "Enviando..." : "Enviar Justificativa"}
                          </Button>
                        </div>
                      </CollapsibleContent>
                    </CardContent>
                  </Collapsible>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center text-center gap-3">
                  <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Tudo em dia!</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Você não possui pontos pendentes de justificativa.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            Justificativas Enviadas
          </h2>

          {loadingJustifications ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardContent className="py-4">
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : justifications && justifications.length > 0 ? (
            <div className="space-y-3">
              {justifications.map((justification) => (
                <Card key={justification.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusBadge(justification.status || "pending")}
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(justification.createdAt!)}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">{justification.reason}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center text-center gap-3">
                  <div className="p-3 rounded-full bg-muted">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Nenhuma justificativa</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Você ainda não enviou nenhuma justificativa.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
