import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { getDefaultRouteForRole } from "@/lib/rbac";
import { DEMO_SESSION_KEY, TOKEN_KEY } from "@/lib/session";

const DEMO_AUTH = import.meta.env.VITE_TABIO_DEMO_AUTH === "true";
const DEMO_CREDENTIALS = {
  email: "owner@tabio.com",
  password: "demo1234",
};

function activateDemoSession(setLocation: (path: string) => void) {
  localStorage.setItem(DEMO_SESSION_KEY, "1");
  localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event("cbk-demo-auth-changed"));
  setLocation("/pos");
}

export default function Login() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const loginMutation = useLogin();
  
  const [email, setEmail] = useState("owner@tabio.com");
  const [password, setPassword] = useState("demo1234");
  const [demoError, setDemoError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (DEMO_AUTH && email === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
      setDemoError(false);
      activateDemoSession(setLocation);
      return;
    }

    if (DEMO_AUTH) {
      setDemoError(true);
      return;
    }

    loginMutation.mutate({ data: { email, password } }, {
      onSuccess: (data) => {
        // Persist token so customFetch sends it on every request
        if (data.token) localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.removeItem(DEMO_SESSION_KEY);
        // Set user data directly in the cache so AuthProvider sees it immediately
        queryClient.setQueryData(getGetMeQueryKey(), data.user);
        setLocation(getDefaultRouteForRole((data.user as { role?: string | null })?.role ?? null));
      },
      onError: () => {
        if (DEMO_AUTH && email === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
          setDemoError(false);
          activateDemoSession(setLocation);
          return;
        }

        setDemoError(true);
      },
    });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-background">
      {/* Background Image requested in requirements */}
      <img 
        src={`${import.meta.env.BASE_URL}images/login-bg.png`} 
        alt="Login Background" 
        className="absolute inset-0 w-full h-full object-cover opacity-60"
      />
      
      <Card className="w-full max-w-md relative z-10 p-8 shadow-2xl bg-card/95 backdrop-blur-xl border-blue-200/70">
        <div className="flex flex-col items-center mb-8">
          <img
            src={`${import.meta.env.BASE_URL}logo.jpeg`}
            alt="Chakhna by Kilo Logo"
            className="w-16 h-16 rounded-2xl shadow-lg object-cover mb-4"
          />
          <h1 className="text-3xl font-display font-extrabold text-foreground">Chakhna by Kilo Admin</h1>
          <p className="text-foreground/85 mt-2 text-center font-medium">Sign in to manage POS, KOT, inventory, reports, and more.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input 
              id="email" 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="bg-white/90 focus:bg-white transition-colors py-6 text-lg text-slate-900 font-semibold"
              placeholder={DEMO_CREDENTIALS.email}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="bg-white/90 focus:bg-white transition-colors py-6 text-lg text-slate-900 font-semibold"
              placeholder="••••••••"
              required
            />
          </div>
          
          {(loginMutation.isError || demoError) && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              Invalid credentials. Try owner@tabio.com / demo1234
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full py-6 text-lg rounded-xl bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : "Sign In"}
          </Button>
        </form>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Demo Owner Credentials:</p>
          <p className="font-mono mt-1 bg-muted inline-block px-3 py-1 rounded-md">owner@tabio.com / demo1234</p>
        </div>
      </Card>
    </div>
  );
}

