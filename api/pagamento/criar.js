const INFINITEPAY_HANDLE = "irailson-da-472";
const INFINITEPAY_ENDPOINT = "https://api.infinitepay.io/invoices/public/checkout/links";
const DEFAULT_SITE_URL = "https://bol-o-gui-d57d-eight.vercel.app";

const PROJECT_ID = "gen-lang-client-0929605804";
const DATABASE_ID = "ai-studio-bologui-41191dbc-bc23-4859-bc28-074d5c8a833c";
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;

function sanitizeDocId(raw) {
  return (
    String(raw || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 90) || "jogador_anonimo"
  );
}

function parseFirestoreNumber(field) {
  if (!field) return null;
  if (field.integerValue !== undefined) {
    const n = Number(field.integerValue);
    return !isNaN(n) && n > 0 ? n : null;
  }
  if (field.doubleValue !== undefined) {
    const n = Number(field.doubleValue);
    return !isNaN(n) && n > 0 ? n : null;
  }
  if (field.stringValue !== undefined) {
    const n = parseFloat(String(field.stringValue).replace(",", "."));
    return !isNaN(n) && n > 0 ? n : null;
  }
  return null;
}

async function buscarValorBolaoNoBanco() {
  const candidatos = [
    `${FIRESTORE_BASE_URL}/config/bolao_config`,
    `${FIRESTORE_BASE_URL}/settings/bolao_config`,
    `${FIRESTORE_BASE_URL}/settings/default`,
    `${FIRESTORE_BASE_URL}/valores/bolao_config`,
  ];

  for (const url of candidatos) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) continue;
      const docData = await resp.json();
      const fields = docData?.fields || {};
      const valor =
        parseFirestoreNumber(fields.valor) ??
        parseFirestoreNumber(fields.valor_aposta) ??
        parseFirestoreNumber(fields.preco) ??
        parseFirestoreNumber(fields.valorCota);
      if (valor !== null && valor > 0) {
        return valor;
      }
    } catch {
      // continua
    }
  }

  throw new Error("Valor da aposta não encontrado no banco de dados (config/bolao_config).");
}

async function salvarLinkPagamentoNoJogador(jogadorId, link) {
  const docId = sanitizeDocId(jogadorId);
  const docUrl = `${FIRESTORE_BASE_URL}/jogadores/${docId}`;
  try {
    const getResp = await fetch(docUrl);
    if (!getResp.ok) return;
    const existingDoc = await getResp.json();
    if (!existingDoc?.fields) return;

    const updatedFields = {
      ...existingDoc.fields,
      id: { stringValue: docId },
      link_pagamento: { stringValue: String(link).slice(0, 2000) },
    };

    await fetch(docUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: updatedFields }),
    });
  } catch (err) {
    console.error("Aviso ao salvar link_pagamento:", err);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed. Use POST." });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { jogador_id, nome, redirect_origin } = body;

    if (!jogador_id || !nome) {
      res.status(400).json({ error: "Os campos jogador_id e nome são obrigatórios." });
      return;
    }

    const valorReais = await buscarValorBolaoNoBanco();
    const valorCentavos = Math.round(valorReais * 100);

    const baseSite = String(redirect_origin || DEFAULT_SITE_URL).replace(/\/+$/, "");
    const redirectUrl = `${baseSite}/pagamento-sucesso?jogador_id=${encodeURIComponent(String(jogador_id))}`;

    const itemPayload = [
      {
        quantity: 1,
        price: valorCentavos,
        description: "Bolao - Participacao",
      },
    ];

    const infinitePayBody = {
      handle: INFINITEPAY_HANDLE,
      items: itemPayload,
      itens: itemPayload,
      order_nsu: String(jogador_id),
      redirect_url: redirectUrl,
      customer: {
        name: String(nome).trim(),
      },
    };

    const ipResponse = await fetch(INFINITEPAY_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(infinitePayBody),
    });

    const ipData = await ipResponse.json().catch(() => ({}));
    const link = ipData?.url || ipData?.invoice_url || ipData?.checkout_url;

    if (!ipResponse.ok || !link) {
      res.status(ipResponse.status || 500).json({
        error: ipData?.message || "Erro ao gerar link PIX na InfinitePay.",
        details: ipData,
      });
      return;
    }

    await salvarLinkPagamentoNoJogador(String(jogador_id), link);

    res.status(200).json({
      url: link,
      invoice_url: link,
      valor: valorReais,
      price: valorCentavos,
      redirect_url: redirectUrl,
    });
  } catch (error) {
    res.status(500).json({
      error: error?.message || "Erro interno ao criar pagamento PIX.",
    });
  }
}
