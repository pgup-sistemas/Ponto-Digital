import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, LogIn, LogOut, MapPin, CheckCircle, AlertCircle, Search, Filter, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import type { Punch } from "@shared/schema";

type FilterPeriod = "all" | "week" | "month";

export default function HistoryPage() {
  const [period, setPeriod] = useState<FilterPeriod>("week");
  const [searchDate, setSearchDate] = useState("");

  const { data: punches, isLoading } = useQuery<Punch[]>({
    queryKey: ["/api/punches", period],
  });

  const filteredPunches = punches?.filter((punch) => {
    if (!searchDate) return true;
    const punchDate = new Date(punch.timestamp).toLocaleDateString("pt-BR");
    return punchDate.includes(searchDate);
  });

  const formatTime = (timestamp: Date | string) => {
    return new Date(timestamp).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (timestamp: Date | string) => {
    return new Date(timestamp).toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
  };

  const groupPunchesByDate = (punches: Punch[]) => {
    const groups: Record<string, Punch[]> = {};
    
    punches.forEach((punch) => {
      const dateKey = new Date(punch.timestamp).toLocaleDateString("pt-BR");
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(punch);
    });

    return Object.entries(groups).sort(([a], [b]) => {
      const dateA = new Date(a.split("/").reverse().join("-"));
      const dateB = new Date(b.split("/").reverse().join("-"));
      return dateB.getTime() - dateA.getTime();
    });
  };

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Histórico</h1>
          <p className="text-muted-foreground">Seus registros de ponto</p>
        </div>
        <Button variant="outline" data-testid="button-export">
          <FileText className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <Tabs value={period} onValueChange={(v) => setPeriod(v as FilterPeriod)} className="w-full md:w-auto">
              <TabsList className="grid grid-cols-3 w-full md:w-auto">
                <TabsTrigger value="all" data-testid="tab-all">
                  Todos
                </TabsTrigger>
                <TabsTrigger value="week" data-testid="tab-week">
                  Semana
                </TabsTrigger>
                <TabsTrigger value="month" data-testid="tab-month">
                  Mês
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por data..."
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="pl-9"
                data-testid="input-search-date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-32" />
                  <div className="space-y-2">
                    {[1, 2].map((j) => (
                      <div key={j} className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-lg" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-24 mb-1" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredPunches && filteredPunches.length > 0 ? (
        <div className="space-y-4">
          {groupPunchesByDate(filteredPunches).map(([date, dayPunches]) => (
            <Card key={date}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium">{date}</CardTitle>
                  <Badge variant="secondary" className="ml-auto">
                    {dayPunches.length} registro{dayPunches.length > 1 ? "s" : ""}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {dayPunches
                    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                    .map((punch) => (
                      <div
                        key={punch.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                        data-testid={`punch-item-${punch.id}`}
                      >
                        <div className={`p-2.5 rounded-lg ${
                          punch.type === "entry" 
                            ? "bg-green-100 dark:bg-green-900/30" 
                            : "bg-orange-100 dark:bg-orange-900/30"
                        }`}>
                          {punch.type === "entry" ? (
                            <LogIn className="h-4 w-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <LogOut className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {punch.type === "entry" ? "Entrada" : "Saída"}
                            </p>
                            {punch.gpsValid && (
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatTime(punch.timestamp)}
                          </div>
                        </div>

                        <Badge
                          variant={punch.status === "ok" ? "default" : "secondary"}
                          className="gap-1 shrink-0"
                        >
                          {punch.status === "ok" ? (
                            <>
                              <CheckCircle className="h-3 w-3" />
                              OK
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-3 w-3" />
                              Pendente
                            </>
                          )}
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center gap-4">
              <div className="p-4 rounded-full bg-muted">
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Nenhum registro encontrado</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchDate 
                    ? "Nenhum registro para a data pesquisada" 
                    : "Você ainda não possui registros de ponto"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
