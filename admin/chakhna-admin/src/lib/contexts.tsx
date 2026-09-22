import React, { createContext, useContext, useState, useEffect } from "react";
import { getGetMeQueryKey, getGetOutletsQueryKey, useGetMe, useGetOutlets } from "@workspace/api-client-react";
import type { Outlet, User } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { DEMO_SESSION_KEY, TOKEN_KEY, DEMO_AUTH_ENABLED } from "@/lib/session";

const demoUser: User = {
  id: 1,
  email: "owner@tabio.com",
  name: "Chakhna Owner",
  role: "owner",
  outletId: 1,
};

const demoOutlets: Outlet[] = [
  {
    id: 1,
    name: "Chakhna by Kilo",
    address: "Outside Shapoorji C Block Gate, Technocity (New Town), Kolkata - 700135",
    phone: "+91-84202 52042",
    email: "owner@tabio.com",
    currency: "INR",
    timezone: "Asia/Kolkata",
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

// --- Auth Context ---
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const [demoAuthenticated, setDemoAuthenticated] = useState(() => localStorage.getItem(DEMO_SESSION_KEY) === "1");
  const [hasToken, setHasToken] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));
  const demoActive = DEMO_AUTH_ENABLED || demoAuthenticated;

  useEffect(() => {
    const syncToken = () => setHasToken(Boolean(localStorage.getItem(TOKEN_KEY)));
    window.addEventListener("storage", syncToken);
    window.addEventListener("cbk-auth-changed", syncToken as EventListener);
    return () => {
      window.removeEventListener("storage", syncToken);
      window.removeEventListener("cbk-auth-changed", syncToken as EventListener);
    };
  }, []);

  const { data: userResponse, isLoading, isError, isFetching } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: !demoActive && hasToken,
    },
  });
  const user = userResponse && typeof userResponse === "object" && "role" in (userResponse as any)
    ? (userResponse as User)
    : null;

  useEffect(() => {
    const sync = () => setDemoAuthenticated(localStorage.getItem(DEMO_SESSION_KEY) === "1");
    window.addEventListener("storage", sync);
    window.addEventListener("cbk-demo-auth-changed", sync as EventListener);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("cbk-demo-auth-changed", sync as EventListener);
    };
  }, []);

  // In production builds, stale demo sessions (e.g. leftover from a demo/Vercel preview)
  // must never put the admin into demo mode or split POS vs Kitchen/Orders state.
  useEffect(() => {
    if (!DEMO_AUTH_ENABLED && demoAuthenticated) {
      localStorage.removeItem(DEMO_SESSION_KEY);
      setDemoAuthenticated(false);
      window.dispatchEvent(new Event("cbk-demo-auth-changed"));
    }
  }, [demoAuthenticated]);

  useEffect(() => {
    if (demoActive) {
      if (!demoAuthenticated && !DEMO_AUTH_ENABLED) {
        const currentPath = window.location.pathname;
        if (!currentPath.endsWith("/login")) {
          setLocation("/login");
        }
      }
      return;
    }

    if (!hasToken) {
      const currentPath = window.location.pathname;
      if (!currentPath.endsWith("/login")) {
        setLocation("/login");
      }
      return;
    }

    // Redirect to login once we know we don't have a valid authenticated user.
    if (!isLoading && !isFetching && (isError || !user)) {
      const currentPath = window.location.pathname;
      if (!currentPath.endsWith("/login")) {
        setLocation("/login");
      }
    }
  }, [demoAuthenticated, hasToken, isLoading, isFetching, isError, setLocation, user, demoActive]);

  return (
    <AuthContext.Provider
      value={{
        user: demoActive ? demoUser : user,
        isLoading: demoActive ? false : hasToken && (isLoading || isFetching),
        isAuthenticated: demoActive ? true : !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// --- Outlet Context ---
interface OutletContextType {
  outletId: number;
  setOutletId: (id: number) => void;
  outlets: Outlet[];
  isOutletsLoading: boolean;
}

const OutletContext = createContext<OutletContextType>({
  outletId: 1, // Defaulting to 1 for demo purposes
  setOutletId: () => {},
  outlets: [],
  isOutletsLoading: false,
});

export function OutletProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const demoActive = DEMO_AUTH_ENABLED || localStorage.getItem(DEMO_SESSION_KEY) === "1";
  const { data: outletsResponse, isLoading: isOutletsLoading } = useGetOutlets({
    query: {
      enabled: isAuthenticated && !demoActive,
      queryKey: getGetOutletsQueryKey(),
    },
  });
  const outlets = Array.isArray(outletsResponse)
    ? outletsResponse
    : Array.isArray((outletsResponse as any)?.outlets)
      ? (outletsResponse as any).outlets
      : [];
  const [outletId, setOutletId] = useState(1);

  useEffect(() => {
    if (!isAuthenticated) return;

    if (demoActive) {
      setOutletId(1);
      localStorage.setItem("tabio_outlet_id", "1");
      return;
    }

    if (!outlets.length) return;

    const persistedOutletId = Number(localStorage.getItem("tabio_outlet_id"));
    const outletIds = outlets.map((outlet) => outlet.id);
    const userOutletId = user?.outletId ?? null;

    const nextOutletId = Number.isFinite(persistedOutletId) && outletIds.includes(persistedOutletId)
      ? persistedOutletId
      : userOutletId && outletIds.includes(userOutletId)
        ? userOutletId
        : outlets[0].id;

    setOutletId(nextOutletId);
  }, [isAuthenticated, outlets, user?.outletId]);

  const handleSetOutletId = (id: number) => {
    setOutletId(id);
    localStorage.setItem("tabio_outlet_id", String(id));
  };
  
  const activeOutlets = demoActive ? demoOutlets : outlets;

  return (
    <OutletContext.Provider value={{ outletId, setOutletId: handleSetOutletId, outlets: activeOutlets, isOutletsLoading: demoActive ? false : isOutletsLoading }}>
      {children}
    </OutletContext.Provider>
  );
}

export const useAppOutlet = () => useContext(OutletContext);
