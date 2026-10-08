function normalizeSupabaseUrl(raw) {
  let u = String(raw || "https://slaqxbccectdgmlokjos.supabase.co").trim();
  u = u.replace(/slaq[a-z]*lokjos\.supabase\.co/i, "slaqxbccectdgmlokjos.supabase.co");
  u = u.replace(/\/rest\/v1\/?.*$/i, "");
  if (!/^https?:\/\//i.test(u)) {
    u = `https://${u}`;
  }
  return u.replace(/\/+$/, "");
}

export default function handler(req, res) {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const restUrl =
    process.env.SUPABASE_REST_URL || "https://slaqxbccectdgmlokjos.supabase.co/rest/v1/";
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "sb_publishable_Tqbx1xWWObM_PYo9A8Lwzg_HP4Q5M1Y";
  return res.status(200).json({
    url,
    restUrl,
    anonKey,
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    SUPABASE_REST_URL: restUrl,
  });
}
