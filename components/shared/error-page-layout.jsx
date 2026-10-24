export default function ErrorPageLayout({
  eyebrow,
  title,
  description,
  icon: Icon,
  children,
}) {
  return (
    <main className="relative isolate grid min-h-screen place-items-center overflow-hidden bg-[linear-gradient(145deg,#f8fbff_0%,#eff8ff_48%,#f8fafc_100%)] p-6 text-foreground">
      <div className="pointer-events-none absolute -left-24 top-[-6rem] -z-10 h-72 w-72 rounded-full bg-sky-200/55 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-20 -z-10 h-80 w-80 rounded-full bg-indigo-200/45 blur-3xl" />

      <section className="w-full max-w-xl rounded-[2rem] border border-sky-100 bg-white/95 p-7 shadow-[0_24px_70px_rgb(30_64_175/0.14)] backdrop-blur sm:p-10">
        <div className="flex items-start justify-between gap-5">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl border border-sky-100 bg-sky-50 shadow-sm">
            <img
              src="/brand/logo-telao-online.webp"
              alt="Telão Online"
              className="h-14 w-14 object-contain"
            />
          </div>
          {Icon ? (
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Icon className="h-6 w-6" aria-hidden />
            </span>
          ) : null}
        </div>

        <p className="mt-10 text-xs font-bold uppercase tracking-[0.22em] text-primary">
          {eyebrow}
        </p>
        <h1 className="mt-3 max-w-lg text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 max-w-md text-[0.98rem] leading-7 text-slate-600">
          {description}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">{children}</div>
      </section>
    </main>
  );
}
