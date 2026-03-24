export const dynamic = "force-dynamic";
import Link from "next/link";

import { listOrganizations } from "@/modules/organizations/service";

export default async function HomePage() {
  const organizations = await listOrganizations();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-10">
      <section className="rounded-[2rem] border border-white/60 bg-white/85 p-8 shadow-soft backdrop-blur md:p-12">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="space-y-6">
            <span className="inline-flex rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-900">
              Real-estate SaaS MVP foundation
            </span>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              Internal workspace for organizations, teams, leads, and property inventory.
            </h1>
            <p className="text-lg leading-8 text-slate-600">
              The product now exposes a first real tenant workspace layer: organization context,
              team roles, lead pipeline, and inventory views that are ready to evolve into CRM,
              map, and visits flows.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/map"
                className="rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                Open sample workspace
              </Link>
              <Link
                href="/map"
                className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Review public inventory
              </Link>
            </div>
          </div>

          <div className="rounded-[1.75rem] border bg-slate-950 p-6 text-slate-50">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Included now
            </p>
            <div className="mt-5 grid gap-3">
              {[
                {
                  title: "Organizations",
                  description: "Tenant workspaces, profile context, and portfolio metrics.",
                },
                {
                  title: "Users and roles",
                  description: "Visible member directory with clear ownership and role breakdown.",
                },
                {
                  title: "Leads and properties",
                  description: "Operational views that feel like an internal product, not placeholders.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[1.25rem] border border-white/10 bg-white/10 p-5 backdrop-blur"
                >
                  <h2 className="text-lg font-semibold text-white">{item.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
              Workspaces
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
              Available organizations
            </h2>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {organizations.map((organization) => (
            <Link
              key={organization.id}
              href={`/${organization.slug}`}
              className="rounded-[1.5rem] border bg-white p-6 shadow-soft transition hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-slate-950">{organization.name}</h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {organization.planLabel}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500">{organization.city}</p>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                {organization.marketFocus}
              </p>
              <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-500">
                <span>{organization.memberCount} team members</span>
                <span>{organization.leadCount} leads</span>
                <span>{organization.propertyCount} properties</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}