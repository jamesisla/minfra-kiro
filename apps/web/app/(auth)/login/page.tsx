"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Eye, EyeOff, Moon, Sun, Sparkles, UserCheck, ShieldCheck } from "lucide-react";
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
  password: z.string().min(6, "Mínimo 6 caracteres"),
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
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "admin@institucion.cl",
      password: "Admin123!",
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    try {
      const res = await apiClient.post<TokenResponse>("/api/v1/auth/login", data);
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
        setError("No se pudo conectar con el servidor backend (FastAPI en puerto 8000).");
      }
    }
  };

  const handleQuickLogin = (email: string, pass: string) => {
    setValue("email", email, { shouldValidate: true });
    setValue("password", pass, { shouldValidate: true });
    handleSubmit(onSubmit)();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4 relative">
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
        <div className="flex flex-col items-center mb-6 gap-2">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Building2 className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">MInfra</h1>
          <p className="text-xs text-muted-foreground text-center">
            Gestión de Infraestructura, Espacios y Activos
          </p>
        </div>

        {/* Acceso rápido / Demo */}
        <div className="mb-4 bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Acceso Rápido Demo (1 Clic)</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin("admin@institucion.cl", "Admin123!")}
              className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-background hover:bg-primary/10 border border-primary/30 rounded-lg text-xs font-semibold text-foreground transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>Admin Demo</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin("alumno.demo@institucion.cl", "Admin123!")}
              className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-background hover:bg-primary/10 border border-primary/30 rounded-lg text-xs font-semibold text-foreground transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Alumno Demo</span>
            </button>
          </div>
        </div>

        {/* Formulario */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 bg-card border border-border rounded-xl p-6 shadow-md"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Credenciales</h2>
            <span className="text-[10px] text-muted-foreground font-mono">v4.2.0</span>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-medium">
              Correo Electrónico
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors font-medium"
              placeholder="admin@institucion.cl"
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-medium">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                {...register("password")}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors font-medium"
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
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 animate-in fade-in-0">
              <p className="text-xs text-destructive font-medium">{error}</p>
            </div>
          )}

          <Button type="submit" className="w-full mt-2 font-semibold text-xs" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-primary-foreground/50 border-t-primary-foreground rounded-full animate-spin" />
                Iniciando sesión…
              </span>
            ) : (
              "Ingresar al Sistema"
            )}
          </Button>
        </form>

        <p className="text-[11px] text-center text-muted-foreground mt-4">
          MInfra · Sistema de Facility Management y CAD
        </p>
      </div>
    </main>
  );
}
