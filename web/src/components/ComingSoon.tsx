// Stands in for screens that later slices build, so the navigation already works.
export function ComingSoon({ title, children }: { title: string; children: string }) {
  return (
    <section>
      <h1>{title}</h1>
      <p>{children}</p>
    </section>
  );
}
