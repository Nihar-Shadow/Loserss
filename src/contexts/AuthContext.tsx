import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  walletAddress: string | null;
  connectWallet: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load wallet address from profile
  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("wallet_address")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.wallet_address) setWalletAddress(data.wallet_address);
        });
    }
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setWalletAddress(null);
  };

  const connectWallet = async () => {
    if (!(window as any).ethereum) {
      alert("MetaMask not detected. Please install MetaMask.");
      return;
    }
    try {
      const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
      const address = accounts[0];
      setWalletAddress(address);
      if (user) {
        await supabase
          .from("profiles")
          .update({ wallet_address: address })
          .eq("user_id", user.id);
      }
    } catch (err) {
      console.error("Wallet connection failed:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut, walletAddress, connectWallet }}>
      {children}
    </AuthContext.Provider>
  );
}
