import Link from "next/link";
import { db } from "@/lib/db";

export async function DataReadiness() {
  const [
    students,
    locatedStudents,
    preferences,
    offers,
    locatedOffers,
    tutors,
  ] = await Promise.all([
    db.student.count(),
    db.student.count({ where: { lat: { not: null }, lng: { not: null } } }),
    db.student.count({
      where: {
        preferences: {
          some: { placement: { active: true, seats: { gt: 0 } } },
        },
      },
    }),
    db.placement.count({ where: { active: true, seats: { gt: 0 } } }),
    db.placement.count({
      where: {
        active: true,
        seats: { gt: 0 },
        lat: { not: null },
        lng: { not: null },
      },
    }),
    db.tutor.aggregate({
      where: { lat: { not: null }, lng: { not: null } },
      _sum: { maxStudents: true },
    }),
  ]);
  const capacity = tutors._sum.maxStudents ?? 0;
  const incomplete =
    students === 0 ||
    students !== locatedStudents ||
    preferences !== students ||
    offers === 0 ||
    offers !== locatedOffers ||
    capacity < students;
  return (
    <details className="panel mb-6">
      <summary className="cursor-pointer text-sm font-medium">
        {incomplete
          ? "Hay datos que conviene revisar antes de simular"
          : "Datos preparados para simular"}
        <span className="hint ml-3">
          {students} estudiantes · {offers} ofertas activas
        </span>
      </summary>
      <ul className="mt-4 space-y-3 text-sm">
        <li>
          {locatedStudents} de {students} estudiantes con ubicación;{" "}
          {preferences} con preferencias.{" "}
          <Link
            className="text-primary underline"
            href="/datos?tab=estudiantes"
          >
            Revisar alumnado
          </Link>
        </li>
        <li>
          {locatedOffers} de {offers} ofertas con ubicación.{" "}
          <Link className="text-primary underline" href="/datos?tab=plazas">
            Revisar ofertas
          </Link>
        </li>
        <li>
          Capacidad de tutoría con ubicación: {capacity} estudiantes.{" "}
          <Link className="text-primary underline" href="/datos?tab=tutores">
            Revisar tutores
          </Link>
        </li>
      </ul>
      <p className="hint mt-4">
        La ubicación es necesaria para participar. Sin preferencias se puede
        recibir una plaza, pero no se podrá valorar la primera opción. La
        capacidad total no garantiza una asignación: también cuentan la
        distancia y los parámetros.
      </p>
    </details>
  );
}
