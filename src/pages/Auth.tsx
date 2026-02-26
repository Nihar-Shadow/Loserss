import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Mail, Lock, User, Wallet, Shield, Fingerprint, ArrowRight, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type AuthTab = "email" | "web3";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AuthTab>("email");
  const [walletStep, setWalletStep] = useState<"idle" | "connecting" | "signing" | "authenticating">("idle");
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/");
      } else {
        if (!displayName.trim()) { toast.error("Display name is required"); setLoading(false); return; }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account!");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWeb3Login = async () => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      toast.error("MetaMask not detected. Please install MetaMask to use Web3 login.");
      return;
    }

    try {
      // Step 1: Connect wallet
      setWalletStep("connecting");
      const accounts: string[] = await ethereum.request({ method: "eth_requestAccounts" });
      const address = accounts[0];
      setConnectedAddress(address);

      // Step 2: Sign message
      setWalletStep("signing");
      const nonce = Math.floor(Math.random() * 1000000);
      const message = `Welcome to NexusFin!\n\nSign this message to verify your wallet ownership.\n\nWallet: ${address}\nNonce: ${nonce}\nTimestamp: ${new Date().toISOString()}`;

      const signature: string = await ethereum.request({
        method: "personal_sign",
        params: [message, address],
      });

      // Step 3: Authenticate via backend
      setWalletStep("authenticating");
      const { data, error } = await supabase.functions.invoke("wallet-auth", {
        body: { wallet_address: address, signature, message },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Set the session from the response
      if (data.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        toast.success(data.is_new
          ? `Welcome to NexusFin! Wallet ${address.slice(0, 6)}...${address.slice(-4)} registered.`
          : `Welcome back! Signed in with ${address.slice(0, 6)}...${address.slice(-4)}`
        );
        navigate("/");
      }
    } catch (err: any) {
      if (err.code === 4001) {
        toast.error("Signature rejected. Please sign the message to authenticate.");
      } else {
        toast.error(err.message || "Web3 authentication failed");
      }
    } finally {
      setWalletStep("idle");
    }
  };

  const stepLabels: Record<string, string> = {
    idle: "Connect & Sign In with MetaMask",
    connecting: "Connecting to MetaMask…",
    signing: "Please sign the message in MetaMask…",
    authenticating: "Verifying signature…",
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold gradient-text">NexusFin</span>
        </div>

        <div className="glass-card p-8">
          {/* Auth method tabs */}
          <div className="flex rounded-xl bg-secondary/50 p-1 mb-6">
            <button
              onClick={() => setActiveTab("email")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "email" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Mail className="w-4 h-4" />
              Email
            </button>
            <button
              onClick={() => setActiveTab("web3")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "web3" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Wallet className="w-4 h-4" />
              Web3
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "email" ? (
              <motion.div key="email" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                <h2 className="text-xl font-bold text-center mb-6">
                  {isLogin ? "Welcome Back" : "Create Account"}
                </h2>
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  {!isLogin && (
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Display Name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-secondary/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                      />
                    </div>
                  )}
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 bg-secondary/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full pl-10 pr-4 py-3 bg-secondary/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {loading ? "Loading…" : isLogin ? "Sign In" : "Sign Up"}
                  </button>
                </form>
                <p className="text-center text-sm text-muted-foreground mt-6">
                  {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                  <button onClick={() => setIsLogin(!isLogin)} className="text-primary hover:underline">
                    {isLogin ? "Sign Up" : "Sign In"}
                  </button>
                </p>
              </motion.div>
            ) : (
              <motion.div key="web3" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-bold mb-2">Web3 Login</h2>
                  <p className="text-sm text-muted-foreground">Sign in securely with your crypto wallet. No email or password needed.</p>
                </div>

                {/* How it works */}
                <div className="space-y-3">
                  {[
                    { icon: Wallet, label: "Connect your MetaMask wallet", step: 1, active: walletStep === "connecting" },
                    { icon: Fingerprint, label: "Sign a verification message", step: 2, active: walletStep === "signing" },
                    { icon: Shield, label: "Securely authenticated", step: 3, active: walletStep === "authenticating" },
                  ].map((s) => (
                    <div key={s.step} className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                      s.active ? "bg-primary/10 border border-primary/30" : "bg-secondary/30"
                    }`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                        s.active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        {s.step}
                      </div>
                      <span className={`text-sm ${s.active ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s.label}</span>
                      {s.active && <ArrowRight className="w-4 h-4 text-primary ml-auto animate-pulse" />}
                    </div>
                  ))}
                </div>

                {connectedAddress && walletStep !== "idle" && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-gain/10 border border-gain/20">
                    <CheckCircle className="w-4 h-4 text-gain" />
                    <span className="text-xs font-mono text-gain">
                      {connectedAddress.slice(0, 6)}...{connectedAddress.slice(-4)}
                    </span>
                  </div>
                )}

                <button
                  onClick={handleWeb3Login}
                  disabled={walletStep !== "idle"}
                  className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold hover:opacity-90 transition-all disabled:opacity-50"
                >
                  <Wallet className="w-5 h-5" />
                  {stepLabels[walletStep]}
                </button>

                <p className="text-xs text-center text-muted-foreground">
                  By connecting, you agree to sign a message proving wallet ownership. No gas fees involved.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
