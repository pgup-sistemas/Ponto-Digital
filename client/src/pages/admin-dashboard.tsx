import { useQuery } from "@tanstack/react-query";
import { Users, Clock, AlertCircle, CheckCircle, TrendingUp, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";

interface Stats {
  totalUsers: number;
  totalPunches: number;
  pendingJustifications: number;
  todayPunches: number;
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["/api/admin/stats"],
  });

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Painel Administrativo</h1>
        <p className="text-muted-foreground">
          Bem-vindo, {user?.name}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card data-testid="card-total-users">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
                <p className="text-xs text-muted-foreground">Usuários cadastrados</p>
              </CardContent>
            </Card>

            <Card data-testid="card-today-punches">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium">Pontos Hoje</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.todayPunches || 0}</div>
                <p className="text-xs text-muted-foreground">Registros hoje</p>
              </CardContent>
            </Card>

            <Card data-testid="card-total-punches">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium">Total de Pontos</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalPunches || 0}</div>
                <p className="text-xs text-muted-foreground">Todos os registros</p>
              </CardContent>
            </Card>

            <Card data-testid="card-pending-justifications">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium">Justificativas Pendentes</CardTitle>
                <AlertCircle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats?.pendingJustifications || 0}</div>
                <p className="text-xs text-muted-foreground">Aguardando análise</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gestão de Usuários
            </CardTitle>
            <CardDescription>Gerenciar funcionários e acessos</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/users">
              <Button className="w-full" data-testid="button-manage-users">
                Gerenciar Usuários
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Revisão de Justificativas
            </CardTitle>
            <CardDescription>Aprovar ou rejeitar justificativas pendentes</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/justifications">
              <Button className="w-full" variant={stats?.pendingJustifications ? "default" : "outline"} data-testid="button-review-justifications">
                {stats?.pendingJustifications ? (
                  <>
                    <Badge variant="secondary" className="mr-2">{stats.pendingJustifications}</Badge>
                    Revisar Justificativas
                  </>
                ) : (
                  "Ver Justificativas"
                )}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
