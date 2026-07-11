import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { localDateString } from "@/lib/work/composer/defaults";
import type { WorkComposerOptionsPayload } from "@/lib/work/composer/types";

export const dynamic = "force-dynamic";

/**
 * Lightweight options for the Executive Work Composer pickers.
 */
export async function GET() {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const payload = await getPayload({ config });
    const [clientsRes, usersRes] = await Promise.all([
      payload.find({
        collection: "clients",
        limit: 300,
        page: 1,
        sort: "name",
        depth: 0,
        overrideAccess: true,
      }),
      payload.find({
        collection: "users",
        limit: 100,
        page: 1,
        depth: 0,
        overrideAccess: true,
      }),
    ]);

    const clients = clientsRes.docs.map((doc) => ({
      id: Number(doc.id),
      name: String((doc as { name?: string }).name ?? `Client #${doc.id}`),
    }));

    const users = usersRes.docs.map((doc) => {
      const row = doc as { id: number; email?: string; displayName?: string | null };
      return {
        id: Number(row.id),
        email: String(row.email ?? ""),
        displayName: row.displayName ? String(row.displayName) : null,
      };
    });

    const authId = Number(auth.id);
    const currentUser =
      users.find((u) => u.id === authId) ??
      (Number.isFinite(authId)
        ? {
            id: authId,
            email: typeof auth.email === "string" ? auth.email : "",
            displayName:
              typeof auth.displayName === "string" ? auth.displayName : null,
          }
        : null);

    const body: WorkComposerOptionsPayload = {
      clients,
      users,
      currentUser,
      today: localDateString(),
    };

    return NextResponse.json({ ok: true, ...body });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load composer options.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
