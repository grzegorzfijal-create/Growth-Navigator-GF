export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="display grid size-14 place-items-center rounded-2xl bg-accent text-2xl text-accent-foreground">93</span>
          <div>
            <h1 className="display text-3xl">Trening</h1>
            <p className="text-sm text-muted">Plan, progresja, dieta i suplementacja w jednym miejscu.</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
