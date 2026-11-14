interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
  SUPABASE_SECRET_KEY: string;
}

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/api/admin/password" || request.method === "OPTIONS") {
      if (url.pathname === "/api/admin/password" && request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: { "allow": "POST, OPTIONS" } });
      }
      return env.ASSETS.fetch(request);
    }
    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

    // Accept requests only from this exact site origin.
    if (request.headers.get("origin") !== url.origin) return json({ error: "Origin not allowed." }, 403);

    if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY || !env.SUPABASE_SECRET_KEY) {
      return json({ error: "إعداد الخادم غير مكتمل. راجعي إعدادات أسرار Cloudflare." }, 503);
    }

    const authorization = request.headers.get("authorization") || "";
    const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!accessToken) return json({ error: "سجّلي الدخول من جديد." }, 401);

    let body: { password?: unknown };
    try {
      const raw = await request.text();
      if (raw.length > 4096) return json({ error: "الطلب أكبر من المسموح." }, 413);
      body = JSON.parse(raw);
    } catch {
      return json({ error: "بيانات الطلب غير صالحة." }, 400);
    }

    const password = typeof body.password === "string" ? body.password : "";
    if (password.length < 12 || password.length > 128) {
      return json({ error: "كلمة المرور لازم تكون من 12 إلى 128 خانة." }, 400);
    }

    const base = env.SUPABASE_URL.replace(/\/+$/, "");
    const userResponse = await fetch(base + "/auth/v1/user", {
      headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, authorization: `Bearer ${accessToken}` },
    });
    if (!userResponse.ok) return json({ error: "انتهت الجلسة أو بيانات الدخول غير صالحة. سجّلي الدخول مرة ثانية." }, 401);
    const user = await userResponse.json() as { id?: string };
    if (!user.id) return json({ error: "تعذّر التحقق من الحساب." }, 401);

    const adminResponse = await fetch(
      base + "/rest/v1/admins?select=user_id&user_id=eq." + encodeURIComponent(user.id),
      { headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, authorization: `Bearer ${accessToken}` } },
    );
    if (!adminResponse.ok) return json({ error: "تعذّر التحقق من صلاحية المدير." }, 403);
    const admins = await adminResponse.json() as Array<{ user_id: string }>;
    if (!Array.isArray(admins) || admins.length !== 1) return json({ error: "ليس لديك صلاحية لهذه العملية." }, 403);

    const updateResponse = await fetch(base + "/auth/v1/admin/users/" + encodeURIComponent(user.id), {
      method: "PUT",
      headers: {
        apikey: env.SUPABASE_SECRET_KEY,
        authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ password }),
    });
    if (!updateResponse.ok) {
      // Never return the upstream body: it may contain internal details.
      return json({ error: "Supabase رفض تحديث كلمة المرور. راجعي إعداد المفتاح السري." }, 502);
    }
    return json({ ok: true });
  },
};
