/**
 * Ejemplo de ruta pública usando un grupo de rutas (public).
 * Los grupos de rutas (carpetas entre paréntesis) no afectan la URL:
 * esta página se sirve en /about, no en /public/about.
 */
export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold mb-4">Acerca de este proyecto</h1>
      <p className="text-muted-foreground">
        Esta es una página de ejemplo dentro del grupo de rutas{" "}
        <code>(public)</code>. Útil para páginas informativas que no
        requieren autenticación.
      </p>
    </main>
  );
}
