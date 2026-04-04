export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-10">
      <section className="rounded-[2rem] border border-white/60 bg-white/85 p-8 shadow-soft backdrop-blur md:p-12">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
          ProyecSaaS funcionando
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          La aplicación web respondió correctamente.
        </p>
      </section>
    </main>
  );
}