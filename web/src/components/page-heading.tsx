export function PageHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">SIPA · Prácticas</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2 pt-6">{children}</div>
      )}
    </div>
  );
}
