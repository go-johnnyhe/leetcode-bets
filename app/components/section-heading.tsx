export function SectionHeading({
  children,
  meta,
}: {
  children: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex items-baseline justify-between border-b border-zinc-800 pb-3">
      <h2 className="font-serif text-xl font-medium text-zinc-100">{children}</h2>
      {meta != null && (
        <span className="font-serif text-xs italic text-zinc-500">{meta}</span>
      )}
    </header>
  );
}
