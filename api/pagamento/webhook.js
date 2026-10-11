import webhookHandler from "../webhook-infinitepay.js";

export default async function handler(req, res) {
  return webhookHandler(req, res);
}
