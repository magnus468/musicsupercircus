import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/** Allows: nightly cron (x-cron-secret), internal service-role calls, or a signed-in staff user. Returns null if allowed, else a 401/403 Response. */
export async function requireCaller(req: Request, cors: Record<string, string>): Promise<Response | null> {
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey);
  const deny = (status: number) =>
    new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret) {
    const { data } = await admin.from("internal_cron_secret").select("secret").maybeSingle();
    if (data?.secret && data.secret === cronSecret) return null;
    return deny(401);
  }

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return deny(401);
  if (token === serviceKey) return null;

  const { data: u, error } = await admin.auth.getUser(token);
  if (error || !u?.user) return deny(401);
  const { data: staff } = await admin.rpc("is_staff", { _user_id: u.user.id });
  return staff ? null : deny(403);
}
