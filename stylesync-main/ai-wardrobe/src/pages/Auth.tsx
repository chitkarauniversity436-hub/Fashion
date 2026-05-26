import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, Sparkles, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { signIn, signUp, continueAsGuest } = useAuth();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (isSignUp && !name) {
      toast.error("Please enter your name.");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) throw error;
        toast.success("Account created successfully! Check your inbox or proceed to login.");
        setIsSignUp(false);
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success("Signed in successfully!");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    continueAsGuest();
    toast.success("Welcome! Entered Guest/Demo Mode.");
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Dynamic Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary/20 blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, -50, 0],
            y: [0, 40, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-rose-600/10 blur-3xl"
        />
      </div>

      {/* Auth Card Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md p-8 m-4 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 shadow-2xl flex flex-col items-center"
      >
        {/* Brand Icon & Heading */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20 mb-4">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            StyleVault
          </h1>
          <p className="text-sm text-slate-400 mt-2 font-medium">
            Your Premium AI Wardrobe & Styling Assistant
          </p>
        </div>

        {/* Custom Auth Tabs */}
        <div className="w-full flex bg-slate-950/80 p-1 rounded-xl mb-6 border border-slate-800/50">
          <button
            onClick={() => {
              setIsSignUp(false);
              setEmail("");
              setPassword("");
              setName("");
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              !isSignUp
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setIsSignUp(true);
              setEmail("");
              setPassword("");
              setName("");
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              isSignUp
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleAuth} className="w-full space-y-4">
          <AnimatePresence mode="wait">
            {isSignUp && (
              <motion.div
                key="signup-name"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="relative"
              >
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-950 border border-slate-800 focus:border-primary text-sm text-slate-100 placeholder-slate-600 outline-none focus:ring-1 focus:ring-primary transition-all font-sans"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-950 border border-slate-800 focus:border-primary text-sm text-slate-100 placeholder-slate-600 outline-none focus:ring-1 focus:ring-primary transition-all font-sans"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-3 rounded-lg bg-slate-950 border border-slate-800 focus:border-primary text-sm text-slate-100 placeholder-slate-600 outline-none focus:ring-1 focus:ring-primary transition-all font-sans"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Form Actions */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg gradient-primary text-white font-semibold text-sm shadow-lg shadow-primary/30 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-6"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {isSignUp ? "Create Account" : "Sign In"}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Separator */}
        <div className="relative w-full flex items-center justify-center my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <span className="relative z-10 px-3 bg-slate-900/60 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            OR
          </span>
        </div>

        {/* Guest Access Option */}
        <button
          onClick={handleGuestLogin}
          className="w-full py-3 rounded-lg bg-slate-800/40 hover:bg-slate-800/60 border border-slate-800 text-slate-300 hover:text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
        >
          <span>Continue as Guest / Demo Mode</span>
        </button>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-500 mt-6 max-w-[280px]">
          By continuing, you agree to StyleVault's Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
}
