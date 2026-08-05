/**
 * Cliente HTTP centralizado para hablar con el backend FastAPI.
 *
 * Uso:
 *   const data = await apiClient.get<UserRead[]>("/api/v1/users");
 *   await apiClient.post("/api/v1/auth/login", { email, password });
 *
 * Para Server Components, usa fetch nativo directamente o este mismo
 * cliente (funciona en server y cliente).
 */

export function getApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    // Si la app corre en localhost en dev local, usar http://localhost:8000
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "http://localhost:8000";
    }
    // En producción en servidor remoto (Oracle Cloud, etc.), usar ruta relativa ("")
    // para que las peticiones vayan al Nginx reverse proxy del mismo host
    return "";
  }
  return "http://localhost:8000";
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions extends RequestInit {
  token?: string;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers, ...rest } = options;
  const baseUrl = getApiUrl();

  const response = await fetch(`${baseUrl}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    let detail = "Error en la solicitud";
    if (typeof body.detail === "string") {
      detail = body.detail;
    } else if (Array.isArray(body.detail) && body.detail.length > 0) {
      detail = body.detail.map((e: any) => e.msg || JSON.stringify(e)).join(", ");
    } else if (body.detail) {
      detail = JSON.stringify(body.detail);
    }
    throw new ApiError(response.status, detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body: JSON.stringify(body) }),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body: JSON.stringify(body) }),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};

export { ApiError };
