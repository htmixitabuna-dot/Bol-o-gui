import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INFINITEPAY_HANDLE = "irailson-da-472";
const INFINITEPAY_ENDPOINT = "https://api.infinitepay.io/invoices/public/checkout/links";
const DEFAULT_SITE_URL = "https://bol-o-gui-d57d-eight.vercel.app";

const PROJECT_ID = firebaseConfig.projectId;
const DATABASE_ID = firebaseConfig.firestoreDatabaseId;
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;

function sanitizeDocId(raw: string): string {
  return (raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 90) || "jogador_anonimo";
}

function parseFirestoreNumber(field: any): number | null {
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

async function buscarValorBolaoNoBanco(): Promise<number> {
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
      const docData: any = await resp.json();
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
      // Continua procurando na próxima tabela/coleção
    }
  }

  throw new Error("Valor da aposta não encontrado no banco de dados (config/bolao_config).");
}

async function salvarLinkPagamentoNoJogador(jogadorId: string, link: string): Promise<void> {
  const docId = sanitizeDocId(jogadorId);
  const docUrl = `${FIRESTORE_BASE_URL}/jogadores/${docId}`;
  try {
    const getResp = await fetch(docUrl);
    if (!getResp.ok) return;
    const existingDoc: any = await getResp.json();
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
    console.error("Aviso ao salvar link_pagamento no Firestore:", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Rota oficial para criar checkout PIX variável na InfinitePay
  app.post("/api/pagamento/criar", async (req, res) => {
    try {
      const { jogador_id, nome, redirect_origin } = req.body || {};

      if (!jogador_id || !nome) {
        res.status(400).json({ error: "Os campos jogador_id e nome são obrigatórios." });
        return;
      }

      // 1. Busca valor atual do bolão sempre no banco de dados (nunca fixo no código)
      const valorReais = await buscarValorBolaoNoBanco();

      // 2. Converte: valor_reais * 100 = price em centavos (ex: R$10 = 1000)
      const valorCentavos = Math.round(valorReais * 100);

      // 3. Monta redirect_url dinâmico (mantém compatibilidade com o domínio oficial Vercel e preview)
      const originHeader =
        redirect_origin ||
        req.headers.origin ||
        (req.headers.host ? `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}` : DEFAULT_SITE_URL);
      const baseSite = String(originHeader || DEFAULT_SITE_URL).replace(/\/+$/, "");
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

      const ipData: any = await ipResponse.json().catch(() => ({}));
      const link = ipData?.url || ipData?.invoice_url || ipData?.checkout_url;

      if (!ipResponse.ok || !link) {
        res.status(ipResponse.status || 500).json({
          error: ipData?.message || "Erro ao gerar link PIX na InfinitePay.",
          details: ipData,
        });
        return;
      }

      // 4. Salva o link retornado na coluna/campo link_pagamento do jogador
      await salvarLinkPagamentoNoJogador(String(jogador_id), link);

      // 5. Retorna { url: link }
      res.status(200).json({
        url: link,
        invoice_url: link,
        valor: valorReais,
        price: valorCentavos,
        redirect_url: redirectUrl,
      });
    } catch (error: any) {
      console.error("Erro em /api/pagamento/criar:", error);
      res.status(500).json({
        error: error?.message || "Erro interno ao criar pagamento PIX.",
      });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
