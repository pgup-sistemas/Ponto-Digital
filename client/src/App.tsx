import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { MobileNav } from "@/components/mobile-nav";
import { DesktopNav } from "@/components/desktop-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import LoginPage from "@/pages/login";
import PunchPage from "@/pages/punch";
import HistoryPage from "@/pages/history";
import JustificationsPage from "@/pages/justifications";
import ProfilePage from "@/pages/profile";
import AdminDashboardPage from "@/pages/admin-dashboard";
import AdminUsersPage from "@/pages/admin-users";
import AdminJustificationsPage from "@/pages/admin-justifications";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component, adminOnly = false }: { component: React.ComponentType; adminOnly?: boolean }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-4 w-full max-w-md p-4">
          <Skeleton className="h-16 w-16 rounded-full mx-auto" />
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (adminOnly && user?.role !== "admin" && user?.role !== "manager") {
    return <Redirect to="/" />;
  }

  return <Component />;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DesktopNav />
      <div className="flex flex-col flex-1 pb-16 md:pb-0">
        <div className="md:hidden flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <span className="font-semibold">Ponto Digital</span>
          </div>
          <ThemeToggle />
        </div>
        {children}
      </div>
      <MobileNav />
    </div>
  );
}

function Router() {
  const { isAuthenticated } = useAuth();

  return (
    <Switch>
      <Route path="/login">
        {isAuthenticated ? <Redirect to="/" /> : <LoginPage />}
      </Route>
      <Route path="/">
        <ProtectedRoute component={() => (
          <AppLayout>
            <PunchPage />
          </AppLayout>
        )} />
      </Route>
      <Route path="/history">
        <ProtectedRoute component={() => (
          <AppLayout>
            <HistoryPage />
          </AppLayout>
        )} />
      </Route>
      <Route path="/justifications">
        <ProtectedRoute component={() => (
          <AppLayout>
            <JustificationsPage />
          </AppLayout>
        )} />
      </Route>
      <Route path="/profile">
        <ProtectedRoute component={() => (
          <AppLayout>
            <ProfilePage />
          </AppLayout>
        )} />
      </Route>
      <Route path="/admin">
        <ProtectedRoute adminOnly component={() => (
          <AppLayout>
            <AdminDashboardPage />
          </AppLayout>
        )} />
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute adminOnly component={() => (
          <AppLayout>
            <AdminUsersPage />
          </AppLayout>
        )} />
      </Route>
      <Route path="/admin/justifications">
        <ProtectedRoute adminOnly component={() => (
          <AppLayout>
            <AdminJustificationsPage />
          </AppLayout>
        )} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
