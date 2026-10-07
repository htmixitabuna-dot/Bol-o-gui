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
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo nao permitido. Use POST." });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const jogadorEmail = String(body.email || body.jogadorEmail || "").trim().toLowerCase();
    const comprovanteRaw = String(body.comprovante || body.fileData || body.image || "").trim();

    if (!jogadorEmail || !comprovanteRaw) {
      return res.status(400).json({ error: "E-mail do jogador e comprovante sao obrigatorios." });
    }

    const base64Data = comprovanteRaw.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const mimeMatch = comprovanteRaw.match(/^data:([^;]+);base64,/);
    const contentType = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const ext = contentType.includes("png") ? "png" : contentType.includes("pdf") ? "pdf" : "jpg";
    const safeEmail = jogadorEmail.replace(/[^a-z0-9_-]/g, "_");
    const filePath = `depositos/${safeEmail}_${Date.now()}.${ext}`;

    let publicUrl = comprovanteRaw;

    try {
      const { error: uploadError } = await supabase.storage
        .from("comprovantes")
        .upload(filePath, buffer, {
          contentType,
          upsert: true,
        });

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from("comprovantes").getPublicUrl(filePath);
        if (urlData && urlData.publicUrl) {
          publicUrl = urlData.publicUrl;
        }
      }
    } catch {
      // Mantem data URL caso o bucket 'comprovantes' nao exista
    }

    // Busca usuario existente em profiles ou jogadores
    let userId = stringToUuid(jogadorEmail);
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("*")
      .ilike("email", jogadorEmail)
      .limit(1);

    if (existingProfile && existingProfile[0]?.id) {
      userId = existingProfile[0].id;
    }

    const { data: existingJogador } = await supabase
      .from("jogadores")
      .select("*")
      .eq("id", userId)
      .limit(1);

    let meta = {};
    if (existingJogador && existingJogador[0]?.time_coracao) {
      try {
        if (String(existingJogador[0].time_coracao).startsWith("{")) {
          meta = JSON.parse(existingJogador[0].time_coracao);
        }
      } catch {}
    }

    const updatedMeta = {
      ...meta,
      email: jogadorEmail,
      comprovante: publicUrl,
      statusPagamento: "pendente",
      updatedAt: new Date().toISOString(),
    };

    const nome = existingProfile?.[0]?.nome || existingJogador?.[0]?.nome || meta.nome || jogadorEmail.split("@")[0];
    const whatsapp = existingProfile?.[0]?.telefone || existingJogador?.[0]?.whatsapp || meta.telefone || jogadorEmail;

    await supabase.from("jogadores").upsert(
      {
        id: userId,
        nome,
        whatsapp,
        pagou: Boolean(existingJogador?.[0]?.pagou || false),
        time_coracao: JSON.stringify(updatedMeta),
      },
      { onConflict: "id" }
    );

    return res.status(200).json({
      ok: true,
      url: publicUrl,
      email: jogadorEmail,
      statusPagamento: "pendente",
    });
  } catch (err) {
    return res.status(200).json({
      ok: true,
      url: req.body?.comprovante || "",
      warning: String(err?.message || err),
    });
  }
}
