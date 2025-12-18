import Link from "next/link";
export default function NotFound() {
  return (
    <div className="panel m-8">
      <h1 className="mb-3 text-xl font-semibold">Página no encontrada</h1>
      <Link className="text-primary underline" href="/">
        Volver a mi espacio
      </Link>
    </div>
  );
}
