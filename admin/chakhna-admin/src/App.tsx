import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, OutletProvider } from "@/lib/contexts";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/lib/contexts";
import NotFound from "@/pages/not-found";
import { canAccessRoute, getDefaultRouteForRole } from "@/lib/rbac";
import { useLocation } from "wouter";
import { Component, lazy, Suspense, useEffect } from "react";
import type { ReactNode } from "react";

// Page Imports
const Login = lazy(() => import("@/pages/login"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const POS = lazy(() => import("@/pages/pos"));
const Orders = lazy(() => import("@/pages/orders"));
const Kitchen = lazy(() => import("@/pages/kitchen"));
const MenuManagement = lazy(() => import("@/pages/menu"));
const Tables = lazy(() => import("@/pages/tables"));
const Inventory = lazy(() => import("@/pages/inventory"));
const Reports = lazy(() => import("@/pages/reports"));
const Customers = lazy(() => import("@/pages/customers"));
const Settings = lazy(() => import("@/pages/settings"));
const Staff = lazy(() => import("@/pages/staff"));
const LiveOrders = lazy(() => import("@/pages/live-orders"));
const MonthlyMeals = lazy(() => import("@/pages/monthly-meals"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, path }: { component: any; path: string }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      setLocation("/login");
      return;
    }

    if (!canAccessRoute(path, user?.role)) {
      setLocation(getDefaultRouteForRole(user?.role));
    }
  }, [isLoading, isAuthenticated, path, setLocation, user?.role]);

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <div className="p-6 text-sm text-muted-foreground">Redirecting to login...</div>;
  }

  if (!canAccessRoute(path, user?.role)) {
    return <div className="p-6 text-sm text-muted-foreground">Redirecting...</div>;
  }

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      {/* Protected Routes wrapped in Layout */}
      <Route path="/"><ProtectedRoute path="/" component={Dashboard} /></Route>
      <Route path="/pos"><ProtectedRoute path="/pos" component={POS} /></Route>
      <Route path="/orders"><ProtectedRoute path="/orders" component={Orders} /></Route>
      <Route path="/kitchen"><ProtectedRoute path="/kitchen" component={Kitchen} /></Route>
      <Route path="/menu"><ProtectedRoute path="/menu" component={MenuManagement} /></Route>
      <Route path="/tables"><ProtectedRoute path="/tables" component={Tables} /></Route>
      <Route path="/inventory"><ProtectedRoute path="/inventory" component={Inventory} /></Route>
      <Route path="/reports"><ProtectedRoute path="/reports" component={Reports} /></Route>
      <Route path="/customers"><ProtectedRoute path="/customers" component={Customers} /></Route>
      <Route path="/live-orders"><ProtectedRoute path="/live-orders" component={LiveOrders} /></Route>
      <Route path="/monthly-meals"><ProtectedRoute path="/monthly-meals" component={MonthlyMeals} /></Route>
      <Route path="/settings"><ProtectedRoute path="/settings" component={Settings} /></Route>
      <Route path="/staff"><ProtectedRoute path="/staff" component={Staff} /></Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("Admin error boundary caught:", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background p-6">
          <div className="max-w-lg w-full rounded-xl border bg-card p-6 shadow-lg">
            <h1 className="text-lg font-bold mb-2">Something went wrong</h1>
            <p className="text-sm text-destructive mb-4 break-words">{String(this.state.error?.message || this.state.error)}</p>
            <p className="text-xs text-muted-foreground mb-4">
              If this keeps happening, clear this browser&apos;s data for the admin site and sign in again.
            </p>
            <button
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              onClick={() => {
                window.localStorage.clear();
                window.location.reload();
              }}
            >
              Clear local data &amp; reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <ErrorBoundary>
            <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
              <AuthProvider>
                <OutletProvider>
                  <Router />
                </OutletProvider>
              </AuthProvider>
            </Suspense>
          </ErrorBoundary>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

