export function ComingSoon({ title, children }: { title: string; children: string }) {
  return (
    <section>
      <h1>{title}</h1>
      <p>{children}</p>
    </section>
  );
}
