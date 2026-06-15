import { NextResponse } from "next/server";

/**
 * Healthcheck propio del frontend. Útil para que Vercel/Railway
 * verifiquen que el contenedor Next.js está respondiendo,
 * independientemente del backend FastAPI.
 */
export async function GET() {
  return NextResponse.json({ status: "ok", service: "web" });
}
