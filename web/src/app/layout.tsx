import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "SIPA · Prácticas",
  description: "Asignación de prácticas y tutoría académica · Cátedra ENIA UPV",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
