import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://slaqxbccectdgmlokjos.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_Tqbx1xWWObM_PYo9A8Lwzg_HP4Q5M1Y";

const CHAVE_PIX_PADRAO = "f0e74d2a-d610-4b76-842e-8b7e1a08047d";

function isUuid(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(str || "").trim()
  );
}

function stringToUuid(input) {
  const str = String(input || "bolao_elite").trim().toLowerCase();
  if (isUuid(str)) {
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

function sanitizeDocId(val) {
  return String(val || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_");
}

function normalizeIdForCompare(val) {
  return String(val || "")
    .trim()
    .toLowerCase()
    .replace(/[-_@.]/g, "");
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-InfinitePay-Signature");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const rawBody =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const payload =
      rawBody && typeof rawBody.data === "object" && rawBody.data !== null && !rawBody.order_nsu
        ? { ...rawBody, ...rawBody.data }
        : rawBody;

    // 1. Extrai order_nsu, identificadores da transação e dados do cliente
    const rawOrderNsu = String(
      payload.order_nsu ||
        payload.orderNsu ||
        payload.metadata?.order_nsu ||
        payload.jogador_id ||
        req.query?.order_nsu ||
        req.query?.jogador_id ||
        ""
    ).trim();

    const jogadorId = rawOrderNsu.replace(/_\d{10,15}$/, "").trim();
    const transactionNsu = String(
      payload.transaction_nsu || payload.transactionNsu || req.query?.transaction_nsu || ""
    ).trim();
    const invoiceSlug = String(
      payload.invoice_slug || payload.slug || req.query?.slug || req.query?.invoice_slug || ""
    ).trim();
    const receiptUrl = String(payload.receipt_url || req.query?.receipt_url || "").trim();

    const emailWebhook = String(
      payload.customer?.email ||
        payload.customer_email ||
        payload.email ||
        payload.metadata?.email ||
        req.query?.email ||
        ""
    )
      .trim()
      .toLowerCase();

    const bolaoIdParam = String(
      payload.bolao_id || payload.bolaoPagoId || payload.metadata?.bolao_id || req.query?.bolao_id || ""
    ).trim();

    // 2. Verifica o status do pagamento recebido no JSON
    const rawStatus = String(
      payload.status ||
        payload.payment_status ||
        payload.state ||
        payload.transaction_status ||
        req.query?.status ||
        ""
    )
      .trim()
      .toLowerCase();

    const paidFlag = payload.paid ?? payload.approved ?? payload.is_paid;

    const statusNegados = new Set([
      "failed",
      "canceled",
      "cancelled",
      "rejected",
      "refused",
      "expired",
      "refunded",
      "chargeback",
      "recusado",
      "cancelado",
      "negado",
      "pending",
      "pendente",
      "waiting",
      "aguardando",
    ]);

    if (paidFlag === false || (rawStatus && statusNegados.has(rawStatus))) {
      return res.status(200).json({
        ok: true,
        approved: false,
        order_nsu: rawOrderNsu,
        status: rawStatus || "rejected",
      });
    }

    const statusAprovados = new Set([
      "paid",
      "approved",
      "aprovado",
      "pago",
      "succeeded",
      "completed",
      "confirmed",
      "authorized",
      "captured",
      "sucesso",
      "confirmado",
    ]);

    const isPagamentoAprovado =
      paidFlag === true ||
      (rawStatus && statusAprovados.has(rawStatus)) ||
      Boolean(
        !rawStatus &&
          (transactionNsu ||
            invoiceSlug ||
            receiptUrl ||
            payload.capture_method ||
            payload.paid_amount ||
            rawOrderNsu)
      );

    if (!isPagamentoAprovado) {
      return res.status(200).json({
        ok: true,
        approved: false,
        order_nsu: rawOrderNsu,
        reason: "status_not_approved",
      });
    }

    if (!jogadorId && !emailWebhook && !rawOrderNsu) {
      return res.status(200).json({
        ok: true,
        ignored: true,
        reason: "missing_order_nsu_and_email",
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // 3. Carrega configuração atual do bolão para vincular o depósito ao bolão ativo
    let cicloAtivo = bolaoIdParam || "ciclo_bolao_v2_ativo";
    let valorCota = 10;
    let encerrados = new Set();

    try {
      const configUuid = stringToUuid("config_bolao_elite_v1");
      const { data: cfgAposta } = await supabase
        .from("apostas")
        .select("palpite")
        .eq("id", configUuid)
        .limit(1);

      let snap = null;
      if (cfgAposta && cfgAposta[0]?.palpite) {
        const parsedAposta = JSON.parse(cfgAposta[0].palpite);
        snap = parsedAposta?.configSnapshot || parsedAposta || null;
      }

      if (!snap) {
        const { data: cfgRow } = await supabase
          .from("jogadores")
          .select("time_coracao")
          .eq("nome", "__CONFIG_BOLAO__")
          .limit(1);
        if (cfgRow && cfgRow[0]?.time_coracao) {
          const parsedCfg = JSON.parse(cfgRow[0].time_coracao);
          snap = parsedCfg?.configSnapshot || parsedCfg || null;
        }
      }

      if (snap) {
        if (Array.isArray(snap.boloesEncerradosIds)) {
          encerrados = new Set(snap.boloesEncerradosIds.map((x) => String(x)));
        }
        const cicloCfg = String(snap.cicloBolaoAtivoId || "").trim();
        if (cicloCfg && (!bolaoIdParam || encerrados.has(bolaoIdParam))) {
          cicloAtivo = cicloCfg;
        }
        if (Number(snap.valorCota || snap.valor) > 0) {
          valorCota = Number(snap.valorCota || snap.valor);
        }
      }
    } catch {}

    // Se o webhook informar paid_amount ou amount em centavos, converte caso válido
    const rawAmountCents = Number(payload.paid_amount || payload.amount || 0);
    const valorConfirmado =
      rawAmountCents >= 100 ? Number((rawAmountCents / 100).toFixed(2)) : valorCota;

    // 4. Localiza o jogador no banco de dados (Supabase) pelo order_nsu, jogadorId ou email
    const { data: rowsJogadores } = await supabase.from("jogadores").select("*");
    let alvoRow = null;
    let alvoMeta = {};

    const normJogadorId = normalizeIdForCompare(jogadorId);
    const normOrderNsu = normalizeIdForCompare(rawOrderNsu);
    const docJogadorId = sanitizeDocId(jogadorId);

    if (Array.isArray(rowsJogadores)) {
      for (const r of rowsJogadores) {
        if (r.nome === "__CONFIG_BOLAO__") continue;
        let meta = {};
        try {
          if (typeof r.time_coracao === "string" && r.time_coracao.startsWith("{")) {
            meta = JSON.parse(r.time_coracao);
          }
        } catch {}

        const rId = String(r.id || "").trim().toLowerCase();
        const rEmail = String(meta.email || "").trim().toLowerCase();
        const rOrder = String(meta.ultimoOrderNsu || meta.order_nsu || "").trim().toLowerCase();
        const rDocId = String(meta._docId || meta.id || meta.uid || "").trim().toLowerCase();

        const matchId =
          jogadorId &&
          (rId === jogadorId.toLowerCase() ||
            rDocId === jogadorId.toLowerCase() ||
            sanitizeDocId(rId) === docJogadorId ||
            sanitizeDocId(rEmail) === docJogadorId ||
            sanitizeDocId(rDocId) === docJogadorId ||
            (normJogadorId.length >= 6 &&
              (normalizeIdForCompare(rId) === normJogadorId ||
                normalizeIdForCompare(rEmail) === normJogadorId ||
                normalizeIdForCompare(rDocId) === normJogadorId)));

        const matchOrder =
          rawOrderNsu &&
          (rOrder === rawOrderNsu.toLowerCase() ||
            (normOrderNsu.length >= 6 && normalizeIdForCompare(rOrder) === normOrderNsu));

        const matchEmail =
          (emailWebhook && rEmail === emailWebhook) ||
          (jogadorId.includes("@") && rEmail === jogadorId.toLowerCase());

        if (matchId || matchOrder || matchEmail) {
          alvoRow = r;
          alvoMeta = meta;
          break;
        }
      }
    }

    const horaFormatada = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const agoraIso = new Date().toISOString();

    // Se o jogador não foi encontrado mas temos email ou jogadorId, criamos/garantimos o registro
    if (!alvoRow && (emailWebhook || jogadorId)) {
      const fallbackEmail =
        emailWebhook || (jogadorId.includes("@") ? jogadorId.toLowerCase() : `${jogadorId}@jogador.bolao`);
      const fallbackId = isUuid(jogadorId) ? jogadorId : stringToUuid(fallbackEmail);
      const fallbackNome = String(
        payload.customer?.name || payload.customer_name || fallbackEmail.split("@")[0] || "Jogador"
      ).trim();

      alvoMeta = {
        id: fallbackId,
        uid: fallbackId,
        _docId: fallbackEmail,
        nome: fallbackNome,
        email: fallbackEmail,
        pagou: true,
        aprovado: true,
        status_pagamento: "pago",
        statusPagamento: "APROVADO",
        metodoPagamento: "INFINITEPAY",
        bolaoPagoId: cicloAtivo,
        valorPago: valorConfirmado,
        order_nsu: rawOrderNsu || undefined,
        ultimoOrderNsu: rawOrderNsu || undefined,
        transaction_nsu: transactionNsu || undefined,
        slug: invoiceSlug || undefined,
        receipt_url: receiptUrl || undefined,
        dataAprovacao: horaFormatada,
        aprovado_em: agoraIso,
        timestampDeposito: Date.now(),
        updatedAt: agoraIso,
      };

      const { data: insertedRows } = await supabase
        .from("jogadores")
        .upsert(
          {
            id: fallbackId,
            nome: fallbackNome,
            whatsapp: fallbackEmail,
            pagou: true,
            pontos: 0,
            time_coracao: JSON.stringify(alvoMeta),
          },
          { onConflict: "id" }
        )
        .select("*");

      alvoRow =
        Array.isArray(insertedRows) && insertedRows[0]
          ? insertedRows[0]
          : { id: fallbackId, nome: fallbackNome };
    } else if (alvoRow) {
      // 5. Atualiza status do jogador para 'APROVADO' e vincula ao bolão ativo
      const novoMeta = {
        ...alvoMeta,
        id: alvoRow.id,
        uid: alvoRow.id,
        pagou: true,
        aprovado: true,
        status_pagamento: "pago",
        statusPagamento: "APROVADO",
        metodoPagamento: "INFINITEPAY",
        bolaoPagoId: cicloAtivo,
        valorPago: valorConfirmado,
        order_nsu: rawOrderNsu || alvoMeta.ultimoOrderNsu || undefined,
        ultimoOrderNsu: rawOrderNsu || alvoMeta.ultimoOrderNsu || undefined,
        transaction_nsu: transactionNsu || alvoMeta.transaction_nsu || undefined,
        slug: invoiceSlug || alvoMeta.slug || undefined,
        receipt_url: receiptUrl || alvoMeta.receipt_url || undefined,
        dataAprovacao: horaFormatada,
        aprovado_em: agoraIso,
        timestampDeposito: Date.now(),
        inicioPagamentoInfinitePay: undefined,
        updatedAt: agoraIso,
      };
      alvoMeta = novoMeta;

      await supabase
        .from("jogadores")
        .update({
          pagou: true,
          time_coracao: JSON.stringify(novoMeta),
        })
        .eq("id", alvoRow.id);
    }

    if (alvoRow) {
      const emailAlvo = String(
        alvoMeta.email || emailWebhook || (jogadorId.includes("@") ? jogadorId : "")
      )
        .trim()
        .toLowerCase();
      const nomeAlvo = String(alvoMeta.nome || alvoRow.nome || "Jogador").trim();

      // 6. Registra/vincula o depósito confirmado ao bolão ativo na tabela apostas
      const depKey = emailAlvo || String(alvoRow.id);
      const depUuid = stringToUuid(`deposito_confirmado_${depKey}`);
      await supabase.from("apostas").upsert(
        {
          id: depUuid,
          user_id: null,
          jogo_id: null,
          palpite: JSON.stringify({
            __type: "deposito_confirmado",
            id: String(alvoRow.id),
            userId: String(alvoRow.id),
            nome: nomeAlvo,
            email: emailAlvo,
            valor: valorConfirmado,
            status: "CONFIRMADO",
            statusPagamento: "APROVADO",
            metodoPagamento: "INFINITEPAY",
            order_nsu: rawOrderNsu || undefined,
            transaction_nsu: transactionNsu || undefined,
            slug: invoiceSlug || undefined,
            bolaoPagoId: cicloAtivo,
            chaveDestino: CHAVE_PIX_PADRAO,
            createdAt: agoraIso,
            updatedAt: agoraIso,
          }),
        },
        { onConflict: "id" }
      );

      // 7. Marca automaticamente todos os palpites do jogador como pagos no bolão ativo
      const { data: rowsApostas } = await supabase.from("apostas").select("*");
      if (Array.isArray(rowsApostas)) {
        for (const ap of rowsApostas) {
          const rawP = String(ap?.palpite || "").trim();
          let pObj = null;
          if (rawP.startsWith("{")) {
            try {
              pObj = JSON.parse(rawP);
            } catch {}
          }
          const isDoJogador =
            String(ap.user_id || "") === String(alvoRow.id) ||
            (emailAlvo && pObj && String(pObj.jogadorEmail || "").trim().toLowerCase() === emailAlvo);

          if (isDoJogador && (!pObj || !pObj.__type || pObj.__type === "palpite")) {
            const escolha = pObj ? pObj.escolha : rawP;
            const novoPalpitePayload = JSON.stringify({
              ...(pObj || {}),
              __type: pObj?.__type || "palpite",
              escolha,
              jogadorEmail: emailAlvo || pObj?.jogadorEmail || "",
              jogoId: String(pObj?.jogoId || pObj?.jogoKey || ap.jogo_id || ""),
              jogoKey: String(pObj?.jogoKey || pObj?.jogoId || ap.jogo_id || ""),
              pago: true,
              bolaoPagoId: cicloAtivo,
              updatedAt: agoraIso,
            });
            await supabase
              .from("apostas")
              .update({ palpite: novoPalpitePayload })
              .eq("id", ap.id);
          }
        }
      }

      return res.status(200).json({
        success: true,
        ok: true,
        approved: true,
        statusPagamento: "APROVADO",
        jogadorId: alvoRow.id,
        email: emailAlvo,
        order_nsu: rawOrderNsu,
        bolaoPagoId: cicloAtivo,
        valor: valorConfirmado,
      });
    }

    return res.status(200).json({
      success: true,
      ok: true,
      approved: false,
      order_nsu: rawOrderNsu,
      reason: "player_not_found",
    });
  } catch (err) {
    return res.status(200).json({
      ok: true,
      error: String(err?.message || err),
    });
  }
}
