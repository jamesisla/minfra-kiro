import Link from "next/link";

/**
 * Navbar de ejemplo. En proyectos reales, considera dividir en
 * NavbarPublic / NavbarAuth según el grupo de rutas.
 */
export function Navbar() {
  return (
    <nav className="flex items-center justify-between border-b border-border px-6 py-3">
      <Link href="/" className="font-bold">
        SDD Project
      </Link>
      <div className="flex gap-4 text-sm">
        <Link href="/about" className="hover:underline">
          Acerca de
        </Link>
        <Link href="/login" className="hover:underline">
          Ingresar
        </Link>
      </div>
    </nav>
  );
}
