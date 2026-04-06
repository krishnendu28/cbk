import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const USER_SESSION_KEY = "cbk_user_session_mobile";

type Session = {
  name: string;
  phone: string;
  dateOfBirth: string;
} | null;

type SessionContextType = {
  session: Session;
  isHydrated: boolean;
  login: (name: string, phone: string, dateOfBirth: string) => void;
  logout: () => void;
};

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    async function hydrateSession() {
      try {
        const raw = await AsyncStorage.getItem(USER_SESSION_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Session;
          if (parsed?.name && parsed?.phone && parsed?.dateOfBirth) {
            setSession(parsed);
          }
        }
      } catch {
        setSession(null);
      } finally {
        setIsHydrated(true);
      }
    }

    hydrateSession();
  }, []);

  const value = useMemo(
    () => ({
      session,
      isHydrated,
      login: (name: string, phone: string, dateOfBirth: string) => {
        const nextSession = { name: name.trim(), phone: phone.trim(), dateOfBirth: dateOfBirth.trim() };
        setSession(nextSession);
        AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(nextSession)).catch(() => null);
      },
      logout: () => {
        setSession(null);
        AsyncStorage.removeItem(USER_SESSION_KEY).catch(() => null);
      },
    }),
    [isHydrated, session],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
