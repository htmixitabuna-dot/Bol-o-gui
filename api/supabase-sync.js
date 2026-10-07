import { createClient } from "@supabase/supabase-js";

function normalizeSupabaseUrl(raw) {
  let u = String(raw || "https://slaqxbccectdgmlokjos.supabase.co").trim();
  u = u.replace(/slaq[a-z]*lokjos\.supabase\.co/i, "slaqxbccectdgmlokjos.supabase.co");
  if (!/^https?:\/\//i.test(u)) {
    u = `https://${u}`;
  }
  return u.replace(/\/+$/, "");
}

const SUPABASE_URL = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_Tqbx1xWWObM_PYo9A8Lwzg_HP4Q5M1Y";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function stringToUuid(input) {
  const str = String(input || "bolao_elite").trim().toLowerCase();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str)) {
    return str;
  }
  const hashes = [0x12345678, 0x9abcdef0, 0x13579bdf, 0x2468ace0];
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hashes[0] = Math.imul(hashes[0] ^ ch, 0x85ebca6b) >>> 0;
    hashes[1] = Math.imul(hashes[1] ^ (ch + i), 0xc2b2ae35) >>> 0;
    hashes[2] = Math.imul(hashes[2] ^ (ch * 31), 0x27d4eb2f) >>> 0;
    hashes[3] = Math.imul(hashes[3] ^ (ch ^ (i << 3)), 0x165667b1) >>> 0;
  }
  const hex = hashes.map((h) => h.toString(16).padStart(8, "0")).join("");
  return (
    hex.slice(0, 8) +
    "-" +
    hex.slice(8, 12) +
    "-4" +
    hex.slice(13, 16) +
    "-a" +
    hex.slice(17, 20) +
    "-" +
    hex.slice(20, 32)
  );
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (req.method === "GET") {
      const type = String(req.query?.type || "all");
      const out = { ok: true };

      if (type === "all" || type === "users") {
        const [{ data: profiles }, { data: jogadores }] = await Promise.all([
          supabase.from("profiles").select("*"),
          supabase.from("jogadores").select("*"),
        ]);
        out.profiles = profiles || [];
        out.jogadores = jogadores || [];
      }

      if (type === "all" || type === "jogos") {
        const [{ data: jogos }, { data: apostas }] = await Promise.all([
          supabase.from("jogos").select("*"),
          supabase.from("apostas").select("*"),
        ]);
        out.jogos = jogos || [];
        out.apostas = apostas || [];
      }

      return res.status(200).json(out);
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const action = String(body.action || "");

      if (action === "upsert_user") {
        const u = body.user || {};
        const email = String(u.email || "").trim().toLowerCase();
        if (!email) return res.status(400).json({ error: "Email obrigatorio" });

        let uuid = u.uid && /^[0-9a-f-]{36}$/i.test(u.uid) ? u.uid : stringToUuid(email);
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .ilike("email", email)
          .limit(1);
        if (existing && existing[0]?.id) {
          uuid = existing[0].id;
        }

        const nome = String(u.nome || email.split("@")[0]).trim();
        const telefone = String(u.telefone || "").trim();

        await Promise.all([
          supabase.from("profiles").upsert(
            {
              id: uuid,
              nome,
              email,
              telefone,
            },
            { onConflict: "id" }
          ),
          supabase.from("jogadores").upsert(
            {
              id: uuid,
              nome,
              whatsapp: telefone || email || "00000000000",
              pagou: Boolean(u.pagou),
              time_coracao: JSON.stringify({ ...u, uid: uuid, email }),
            },
            { onConflict: "id" }
          ),
        ]);

        return res.status(200).json({ ok: true, id: uuid });
      }

      if (action === "upsert_jogo") {
        const j = body.jogo || {};
        const id = String(j.id || "");
        if (!id) return res.status(400).json({ error: "ID obrigatorio" });
        const uuid = stringToUuid(id);
        const rawDate = String(j.data || "");
        let data_jogo = new Date().toISOString().slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
          data_jogo = rawDate;
        } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
          const [d, m, y] = rawDate.split("/");
          data_jogo = `${y}-${m}-${d}`;
        }

        await supabase.from("jogos").upsert(
          {
            id: uuid,
            time_casa: String(j.casa || j.time_casa || ""),
            time_fora: String(j.fora || j.time_fora || ""),
            data_jogo,
          },
          { onConflict: "id" }
        );

        await supabase.from("apostas").upsert(
          {
            id: stringToUuid(`jogo_meta_${uuid}`),
            user_id: null,
            jogo_id: uuid,
            palpite: JSON.stringify({ __type: "jogo_meta", ...j, publicado: true, gameUuid: uuid }),
          },
          { onConflict: "id" }
        );

        return res.status(200).json({ ok: true, id: uuid });
      }

      return res.status(200).json({ ok: true });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(200).json({ ok: false, error: String(err?.message || err) });
  }
}
