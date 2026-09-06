import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Metode tidak diizinkan." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "Layanan pendaftaran belum siap." }, 503);

    const payload = await request.json().catch(() => ({}));
    const name = String(payload.name || "").trim().replace(/\s+/g, " ");
    const email = String(payload.email || "").trim().toLowerCase();
    const password = String(payload.password || "");

    if (name.length < 2 || name.length > 100) return json({ error: "Nama lengkap belum valid." }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return json({ error: "Alamat email belum valid." }, 400);
    if (password.length < 8 || password.length > 72) return json({ error: "Kata sandi minimal 8 karakter." }, 400);

    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const clientIp = request.headers.get("cf-connecting-ip") || forwarded || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    const ipHash = await sha256(`${clientIp}|${userAgent}`);
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await admin
      .from("registration_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("attempted_at", oneHourAgo);
    if (countError) throw countError;
    if ((count || 0) >= 5) return json({ error: "Terlalu banyak percobaan pendaftaran. Tunggu beberapa saat lalu coba kembali." }, 429);

    const { data: attempt, error: attemptError } = await admin
      .from("registration_attempts")
      .insert({ ip_hash: ipHash, succeeded: false })
      .select("id")
      .single();
    if (attemptError) throw attemptError;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });

    if (error) {
      if (/already|exists|registered/i.test(error.message)) return json({ error: "Email ini sudah terdaftar. Pilih Masuk dan gunakan akun yang sudah ada." }, 409);
      throw error;
    }

    await admin.from("registration_attempts").update({ succeeded: true }).eq("id", attempt.id);

    return json({ ok: true, userId: data.user.id }, 201);
  } catch (error) {
    console.error("register-teacher failed", error);
    return json({ error: "Akun belum dapat dibuat. Silakan coba kembali." }, 500);
  }
});
