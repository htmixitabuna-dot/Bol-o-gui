const PROJECT_ID = "gen-lang-client-0929605804";
const DATABASE_ID = "ai-studio-bologui-41191dbc-bc23-4859-bc28-074d5c8a833c";
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;

function getJogadorDocId(emailOrId) {
  const cleaned = String(emailOrId || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 90);
  return cleaned || "jogador_anonimo";
}

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === "string") return { stringValue: val };
  return { stringValue: String(val) };
}

export default async function handler(req, res) {
  if (req.method && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const email = String(body.email || "").trim().toLowerCase();
    const nome = String(body.nome || "Jogador").trim();
    const jogadorId = getJogadorDocId(email || body.jogadorId || nome);
    const comprovante = String(body.comprovante || body.file || body.image || "");

    if (!comprovante) {
      return res.status(400).json({ error: "Comprovante ausente" });
    }

    const agora = Date.now();
    const dataEnvioComprovante =
      body.dataEnvioComprovante ||
      `${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;

    // Busca documento existente do jogador para preservar campos como pix e pontos
    let existingFields = {};
    try {
      const getResp = await fetch(`${BASE_URL}/jogadores/${jogadorId}`);
      if (getResp.ok) {
        const docData = await getResp.json();
        existingFields = docData.fields || {};
      }
    } catch {
      // ignora erro de leitura prévia
    }

    const fields = {
      ...existingFields,
      id: toFirestoreValue(jogadorId),
      nome: toFirestoreValue(nome),
      email: toFirestoreValue(email || `${jogadorId}@bolao.com`),
      pix: existingFields.pix || toFirestoreValue(String(body.pix || "-")),
      pontos: existingFields.pontos || toFirestoreValue(0),
      comprovante: toFirestoreValue(comprovante),
      timestampComprovante: toFirestoreValue(agora),
      dataEnvioComprovante: toFirestoreValue(dataEnvioComprovante),
      statusPagamento: toFirestoreValue("EM_ANALISE"),
    };

    const patchResp = await fetch(`${BASE_URL}/jogadores/${jogadorId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });

    if (!patchResp.ok) {
      const errTxt = await patchResp.text().catch(() => "");
      return res.status(200).json({
        ok: true,
        localOnly: true,
        jogadorId,
        nome,
        email,
        dataEnvioComprovante,
        timestampComprovante: agora,
        notice: errTxt,
      });
    }

    return res.status(200).json({
      ok: true,
      jogadorId,
      nome,
      email,
      statusPagamento: "EM_ANALISE",
      dataEnvioComprovante,
      timestampComprovante: agora,
    });
  } catch (error) {
    return res.status(200).json({
      ok: true,
      message: "Comprovante recebido",
    });
  }
}
