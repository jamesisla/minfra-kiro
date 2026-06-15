"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Eye, EyeOff, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { apiClient, ApiError } from "@/lib/api/client";
import { useInfrastructureStore } from "@/lib/stores/infrastructure-store";
import { useTheme } from "@/components/providers/theme-provider";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

type LoginForm = z.infer<typeof loginSchema>;

interface TokenResponse {
  access_token: string;
  token_type: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { setAuthToken } = useInfrastructureStore();
  const { theme, toggleTheme } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    try {
      const res = await apiClient.post<TokenResponse>("/api/v1/auth/login", data);
      // Guardar token en localStorage
      localStorage.setItem("minfra-token", res.access_token);
      setAuthToken(res.access_token);
      router.replace("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 401
            ? "Email o contraseña incorrectos"
            : `Error ${err.status}: ${err.message}`
        );
      } else {
        setError("No se pudo conectar con el servidor. Verifica que el backend esté corriendo.");
      }
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      {/* Toggle tema */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        aria-label="Cambiar tema"
      >
        {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-2">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">MInfra</h1>
          <p className="text-sm text-muted-foreground text-center">
            Gestión de Infraestructura Universitaria
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 bg-card border border-border rounded-xl p-6 shadow-sm"
        >
          <h2 className="text-base font-semibold mb-2">Iniciar sesión</h2>

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              placeholder="admin@universidad.cl"
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                {...register("password")}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          {/* Error general */}
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          <Button type="submit" className="w-full mt-2" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/50 border-t-primary-foreground rounded-full animate-spin" />
                Ingresando…
              </span>
            ) : (
              "Ingresar"
            )}
          </Button>
        </form>

        <p className="text-xs text-center text-muted-foreground mt-4">
          Sistema de gestión v0.1
        </p>
      </div>
    </main>
  );
}
