export const dynamic = "force-dynamic";

import { getSessionUser } from "@/lib/auth/session"; // ajusta ruta si es distinta
import { listOrganizationsForUser } from "@/lib/data/organizations"; // idem

export default async function HomePage() {
  let sessionUser = null;
  let organizations = [];

  try {
    sessionUser = await getSessionUser();

    if (sessionUser) {
      organizations = await listOrganizationsForUser(sessionUser.id);
    }
  } catch (error) {
    console.error("HOME PAGE RUNTIME ERROR:", error);
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Home OK</h1>
    </div>
  );
}