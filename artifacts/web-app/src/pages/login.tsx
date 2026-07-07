import { useState } from "react";
import { useLogin } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const login = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    login.mutate({ data: { username, password } }, {
      onSuccess: () => { queryClient.invalidateQueries(); },
      onError: () => { setError("Invalid username or password."); },
    });
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel — editorial brand */}
      <div
        className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 px-14 py-14"
        style={{
          background: "linear-gradient(160deg, hsl(30,35%,88%) 0%, hsl(24,28%,78%) 100%)",
        }}
      >
        <div>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-10"
            style={{ background: "hsl(var(--primary))" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="w-5 h-5">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <h1
            className="text-5xl font-bold leading-[1.1] mb-4"
            style={{ color: "hsl(24,25%,18%)" }}
          >
            Pulse
          </h1>
          <p
            className="text-lg leading-relaxed max-w-[280px]"
            style={{ color: "hsl(24,15%,40%)" }}
          >
            Community intelligence,<br />decoded.
          </p>
        </div>

        <div>
          <p className="text-xs" style={{ color: "hsl(24,12%,50%)" }}>
            Authorised users only · Restricted access
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 bg-background">
        {/* Mobile wordmark */}
        <div className="lg:hidden mb-10 text-center">
          <h1
            className="text-4xl font-bold mb-1"
           
          >
            Pulse
          </h1>
          <p className="text-sm text-muted-foreground">Community Intelligence Platform</p>
        </div>

        <div className="w-full max-w-[360px]">
          <h2
            className="text-2xl font-semibold mb-1"
           
          >
            Welcome back
          </h2>
          <p className="text-sm text-muted-foreground mb-8">Sign in to your account to continue</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Username</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="your-username"
                className="h-11 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="h-11 rounded-lg pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              type="submit"
              className="w-full h-11 rounded-lg text-sm font-medium"
              disabled={login.isPending}
            >
              {login.isPending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
