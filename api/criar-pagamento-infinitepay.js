export default async function handler(req, res) {
  if (req.method && req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const customerInput = body.customer || {};

    const name = String(customerInput.name || body.name || body.nome || "Jogador Bolao").trim();
    const email = String(customerInput.email || body.email || "jogador@bolao.com").trim().toLowerCase();
    const rawPhone = String(
      customerInput.phone_number || body.phone_number || body.telefone || body.pix || "+5573999999999"
    ).trim();

    const digits = rawPhone.replace(/\D/g, "");
    let phone_number = "+5573999999999";
    if (digits.length >= 10 && digits.length <= 11) {
      phone_number = `+55${digits}`;
    } else if (digits.length >= 12 && digits.length <= 13 && digits.startsWith("55")) {
      phone_number = `+${digits}`;
    }

    const jogadorId = String(body.jogadorId || body.id || email || "jogador").trim();
    const origin =
      (req.headers && (req.headers.origin || (req.headers.host ? `https://${req.headers.host}` : ""))) ||
      "https://bol-o-gui.vercel.app";

    const payload = {
      handle: "irailson-da-472",
      order_nsu: `${jogadorId}_${Date.now()}`,
      redirect_url: `${origin}/pagamento-sucesso?jogador_id=${encodeURIComponent(jogadorId)}`,
      customer: {
        name,
        email,
        phone_number,
      },
      items: [
        {
          quantity: 1,
          price: 1000,
          description: "Cota Bolao Elite",
        },
      ],
    };

    const response = await fetch("https://api.checkout.infinitepay.io/links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    const url =
      data?.url ||
      data?.checkout_url ||
      data?.link ||
      data?.data?.url ||
      `https://checkout.infinitepay.io/irailson-da-472?items=[{"name":"Cota+Bolao+Elite","price":1000,"quantity":1}]&customer_name=${encodeURIComponent(
        name
      )}&customer_email=${encodeURIComponent(email)}&customer_cellphone=${encodeURIComponent(
        phone_number
      )}&order_nsu=${encodeURIComponent(jogadorId)}&redirect_url=${encodeURIComponent(
        `${origin}/pagamento-sucesso?jogador_id=${encodeURIComponent(jogadorId)}`
      )}`;

    return res.status(200).json({ url });
  } catch (error) {
    const body = typeof req.body === "object" && req.body ? req.body : {};
    const customerInput = body.customer || {};
    const name = String(customerInput.name || body.name || body.nome || "Jogador Bolao").trim();
    const email = String(customerInput.email || body.email || "jogador@bolao.com").trim().toLowerCase();
    const jogadorId = String(body.jogadorId || body.id || email || "jogador").trim();
    const fallbackUrl = `https://checkout.infinitepay.io/irailson-da-472?items=[{"name":"Cota+Bolao+Elite","price":1000,"quantity":1}]&customer_name=${encodeURIComponent(
      name
    )}&customer_email=${encodeURIComponent(email)}&order_nsu=${encodeURIComponent(jogadorId)}`;
    return res.status(200).json({ url: fallbackUrl });
  }
}
