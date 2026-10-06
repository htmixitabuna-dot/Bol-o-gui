const CHAVE_PIX_ALEATORIA = "f0e74d2a-d610-4b76-842e-8b7e1a08047d";

function gerarPayloadPix(chave, valor, merchant, city) {
  const formatar = (id, val) => id + String(val.length).padStart(2, '0') + val;
  const gui = formatar("00", "BR.GOV.BCB.PIX");
  const chavePix = formatar("01", chave);
  const merchantAccount = formatar("26", gui + chavePix);
  const valorStr = Number(valor || 10).toFixed(2);
  let payload =
    "000201" +
    merchantAccount +
    "52040000" +
    "5303986" +
    formatar("54", valorStr) +
    "5802BR" +
    formatar("59", merchant) +
    formatar("60", city) +
    formatar("62", formatar("05", "BOLAO10")) +
    "6304";
  // Calcula CRC16
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xFFFF;
    }
  }
  const crcHex = crc.toString(16).toUpperCase().padStart(4, '0');
  return payload + crcHex;
}

export default async function handler(req, res) {
  const valorAtual = Number(req?.body?.valor) || 10;
  const payload = gerarPayloadPix(CHAVE_PIX_ALEATORIA, valorAtual, "IRAILSON DA SILVA", "ITABUNA");
  return res.status(200).json({
    url: payload,
    payload,
    chaveDestino: CHAVE_PIX_ALEATORIA,
    valor: valorAtual,
  });
}
