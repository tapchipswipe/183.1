"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../supabase/client";

export interface Merchant {
  id: string;
  owner_user_id: string;
  business_name: string;
  store_type: string | null;
}

interface AuthContextValue {
  loading: boolean;
  session: Session | null;
  user: User | null;
  merchant: Merchant | null;
  refreshMerchant: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);

  const refreshMerchant = async () => {
    const u = supabase.auth.getUser ? (await supabase.auth.getUser()).data.user : null;
    const userId = u?.id ?? user?.id ?? null;
    if (!userId) {
      setMerchant(null);
      return;
    }
    const { data, error } = await supabase
      .from("merchants")
      .select("id, owner_user_id, business_name, store_type")
      .eq("owner_user_id", userId)
      .maybeSingle();
    if (error) {
      setMerchant(null);
      return;
    }
    setMerchant((data ?? null) as Merchant | null);
  };

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setLoading(false);
      if (data.session?.user) await refreshMerchant();
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, newSession) => {
      if (cancelled) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) await refreshMerchant();
      else setMerchant(null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session,
      user,
      merchant,
      refreshMerchant,
      signOut: async () => {
        await supabase.auth.signOut();
        setMerchant(null);
      },
    }),
    [loading, session, user, merchant],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

