# Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Path ID Integrity**: All document IDs (`{jogadorId}`, `{jogoId}`, `{palpiteId}`, `{configId}`) for single-document operations must match `^[a-zA-Z0-9_\-]+$` and be at most 128 characters.
2. **Jogador Schema Integrity**: Every document in `/jogadores/{jogadorId}` must strictly contain required keys `['email', 'nome', 'pix', 'pontos']` and only allowed keys `['email', 'nome', 'pix', 'pontos', 'statusPagamento', 'comprovante', 'timestampComprovante', 'dataEnvioComprovante', 'dataAprovacao', 'dataCadastro', 'timestampCadastro']` with strict string length bounds.
3. **Jogo Schema Integrity**: Every document in `/jogos/{jogoId}` must strictly contain required keys `['id', 'casa', 'fora', 'escudoCasa', 'escudoFora', 'data', 'estadio']` and only allowed keys (including optional `'resultadoOficial'` restricted to `['CASA', 'EMPATE', 'FORA']`).
4. **Palpite Schema Integrity**: Every document in `/palpites/{palpiteId}` must strictly contain required keys `['jogadorEmail', 'jogoId', 'escolha', 'pago']`, with `escolha` in `['CASA', 'EMPATE', 'FORA']`.
5. **Config Schema Integrity**: Every document in `/config/{configId}` must strictly contain `['valor', 'chavePix', 'nomePix', 'cidadePix', 'pixAdm']` with valid types and string bounds.

## 2. The "Dirty Dozen" Payloads
1. **Shadow Field Injection on Jogador**: `{ email: "a@b.com", nome: "Ana", pix: "123", pontos: 0, isAdmin: true }` -> Rejected by `hasOnly`.
2. **Oversized Nome on Jogador**: `{ email: "a@b.com", nome: "A".repeat(500), pix: "123", pontos: 0 }` -> Rejected by `nome.size() <= 100`.
3. **Missing Required Field on Jogador**: `{ email: "a@b.com", nome: "Ana" }` -> Rejected by `hasAll`.
4. **Invalid Status Enum on Jogador**: `{ email: "a@b.com", nome: "Ana", pix: "123", pontos: 0, statusPagamento: "HACKED" }` -> Rejected by enum check.
5. **Oversized Comprovante Payload**: `{ email: "a@b.com", nome: "Ana", pix: "123", pontos: 0, comprovante: "x".repeat(950000) }` -> Rejected by `comprovante.size() <= 900000`.
6. **Invalid Escolha on Palpite**: `{ jogadorEmail: "a@b.com", jogoId: "1", escolha: "INVALIDO", pago: false }` -> Rejected by enum check.
7. **Shadow Field on Palpite**: `{ jogadorEmail: "a@b.com", jogoId: "1", escolha: "CASA", pago: false, extra: 1 }` -> Rejected by `hasOnly`.
8. **Invalid Type for Pago on Palpite**: `{ jogadorEmail: "a@b.com", jogoId: "1", escolha: "CASA", pago: "sim" }` -> Rejected by `pago is bool`.
9. **Invalid ResultadoOficial on Jogo**: `{ id: "1", casa: "A", fora: "B", escudoCasa: "", escudoFora: "", data: "16:00", estadio: "X", resultadoOficial: "NULO" }` -> Rejected by enum check.
10. **Missing Estadio on Jogo**: `{ id: "1", casa: "A", fora: "B", escudoCasa: "", escudoFora: "", data: "16:00" }` -> Rejected by `hasAll`.
11. **Negative Valor on Config**: `{ valor: -10, chavePix: "123", nomePix: "ADM", cidadePix: "ITA", pixAdm: "123" }` -> Rejected by `valor >= 0`.
12. **Unmatched Collection Write**: Writing to `/random_collection/doc1` -> Rejected by global default-deny `match /{document=**} { allow read, write: if false; }`.
