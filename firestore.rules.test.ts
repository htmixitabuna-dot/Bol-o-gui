/**
 * Verification test specification for Dirty Dozen payloads against firestore.rules
 */
export const DIRTY_DOZEN_TESTS = [
  {
    name: "1. Shadow Field Injection on Jogador",
    collection: "jogadores",
    docId: "ana_gmail_com",
    payload: { email: "ana@gmail.com", nome: "Ana", pix: "123", pontos: 0, isAdmin: true },
    expected: "PERMISSION_DENIED"
  },
  {
    name: "2. Oversized Nome on Jogador",
    collection: "jogadores",
    docId: "ana_gmail_com",
    payload: { email: "ana@gmail.com", nome: "A".repeat(500), pix: "123", pontos: 0 },
    expected: "PERMISSION_DENIED"
  },
  {
    name: "3. Missing Required Field on Jogador",
    collection: "jogadores",
    docId: "ana_gmail_com",
    payload: { email: "ana@gmail.com", nome: "Ana" },
    expected: "PERMISSION_DENIED"
  },
  {
    name: "4. Invalid Status Enum on Jogador",
    collection: "jogadores",
    docId: "ana_gmail_com",
    payload: { email: "ana@gmail.com", nome: "Ana", pix: "123", pontos: 0, statusPagamento: "HACKED" },
    expected: "PERMISSION_DENIED"
  },
  {
    name: "5. Oversized Comprovante Payload",
    collection: "jogadores",
    docId: "ana_gmail_com",
    payload: { email: "ana@gmail.com", nome: "Ana", pix: "123", pontos: 0, comprovante: "x".repeat(950000) },
    expected: "PERMISSION_DENIED"
  },
  {
    name: "6. Invalid Escolha on Palpite",
    collection: "palpites",
    docId: "ana_gmail_com_1",
    payload: { jogadorEmail: "ana@gmail.com", jogoId: "1", escolha: "INVALIDO", pago: false },
    expected: "PERMISSION_DENIED"
  },
  {
    name: "7. Shadow Field on Palpite",
    collection: "palpites",
    docId: "ana_gmail_com_1",
    payload: { jogadorEmail: "ana@gmail.com", jogoId: "1", escolha: "CASA", pago: false, extra: 1 },
    expected: "PERMISSION_DENIED"
  },
  {
    name: "8. Invalid Type for Pago on Palpite",
    collection: "palpites",
    docId: "ana_gmail_com_1",
    payload: { jogadorEmail: "ana@gmail.com", jogoId: "1", escolha: "CASA", pago: "sim" },
    expected: "PERMISSION_DENIED"
  },
  {
    name: "9. Invalid ResultadoOficial on Jogo",
    collection: "jogos",
    docId: "1",
    payload: { id: "1", casa: "A", fora: "B", escudoCasa: "", escudoFora: "", data: "16:00", estadio: "X", resultadoOficial: "NULO" },
    expected: "PERMISSION_DENIED"
  },
  {
    name: "10. Missing Estadio on Jogo",
    collection: "jogos",
    docId: "1",
    payload: { id: "1", casa: "A", fora: "B", escudoCasa: "", escudoFora: "", data: "16:00" },
    expected: "PERMISSION_DENIED"
  },
  {
    name: "11. Negative Valor on Config",
    collection: "config",
    docId: "bolao_config",
    payload: { valor: -10, chavePix: "123", nomePix: "ADM", cidadePix: "ITA", pixAdm: "123" },
    expected: "PERMISSION_DENIED"
  },
  {
    name: "12. Unmatched Collection Write",
    collection: "random_collection",
    docId: "doc1",
    payload: { test: true },
    expected: "PERMISSION_DENIED"
  }
];
