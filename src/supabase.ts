import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

const envMeta: Record<string, any> =
  typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env : {};
const envProc: Record<string, any> =
  typeof process !== 'undefined' && process.env ? process.env : {};

export function normalizeSupabaseUrl(raw: string): string {
  let u = String(raw || 'https://slaqxbccectdgmlokjos.supabase.co').trim();
  u = u.replace('slaqxbcectdgmlokjos', 'slaqxbccectdgmlokjos');
  if (!/^https?:\/\//i.test(u)) {
    u = `https://${u}`;
  }
  return u.replace(/\/+$/, '');
}

export let NEXT_PUBLIC_SUPABASE_URL: string = normalizeSupabaseUrl(
  envMeta.NEXT_PUBLIC_SUPABASE_URL ||
    envProc.NEXT_PUBLIC_SUPABASE_URL ||
    'https://slaqxbccectdgmlokjos.supabase.co'
);

export let NEXT_PUBLIC_SUPABASE_ANON_KEY: string =
  envMeta.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  envProc.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_Tqbx1xWWObM_PYo9A8Lwzg_HP4Q5M1Y';

export let supabase: SupabaseClient = createClient(
  NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

function hasValidSupabaseKey(): boolean {
  return Boolean(
    NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'sb-anon-key-placeholder' &&
      NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 15
  );
}

export const VALOR_COTA = 10;
export const CHAVE_PIX_ALEATORIA = 'f0e74d2a-d610-4b76-842e-8b7e1a08047d';

export function gerarPayloadPix(chave: string, valor: number, merchant: string, city: string): string {
  const formatar = (id: string, val: string) => id + String(val.length).padStart(2, '0') + val;
  const gui = formatar('00', 'BR.GOV.BCB.PIX');
  const chavePix = formatar('01', chave);
  const merchantAccount = formatar('26', gui + chavePix);
  const valorNum = Number(valor) || 10;
  const valorStr = valorNum.toFixed(2);
  let payload =
    '000201' +
    merchantAccount +
    '52040000' +
    '5303986' +
    formatar('54', valorStr) +
    '5802BR' +
    formatar('59', merchant) +
    formatar('60', city) +
    formatar('62', formatar('05', 'BOLAO10')) +
    '6304';
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  const crcHex = crc.toString(16).toUpperCase().padStart(4, '0');
  return payload + crcHex;
}

export function isUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(str || '').trim()
  );
}

export function stringToUuid(input: string): string {
  const str = String(input || 'bolao_elite').trim().toLowerCase();
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
  const hex = hashes.map((h) => h.toString(16).padStart(8, '0')).join('');
  return (
    hex.slice(0, 8) +
    '-' +
    hex.slice(8, 12) +
    '-4' +
    hex.slice(13, 16) +
    '-a' +
    hex.slice(17, 20) +
    '-' +
    hex.slice(20, 32)
  );
}

export interface SupabaseCurrentUser {
  uid: string;
  email: string;
  displayName?: string;
}

export const auth: { currentUser: SupabaseCurrentUser | null } = {
  currentUser: null,
};

export function syncAuthCurrentUser(email?: string | null, nome?: string): void {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail) {
    auth.currentUser = null;
    try {
      localStorage.removeItem('bolao_supabase_auth_user');
    } catch {}
    return;
  }
  const userObj: SupabaseCurrentUser = {
    uid: stringToUuid(cleanEmail),
    email: cleanEmail,
    displayName: nome || cleanEmail.split('@')[0],
  };
  auth.currentUser = userObj;
  try {
    localStorage.setItem('bolao_supabase_auth_user', JSON.stringify(userObj));
  } catch {}
}

try {
  const savedAuth = localStorage.getItem('bolao_supabase_auth_user');
  if (savedAuth) {
    auth.currentUser = JSON.parse(savedAuth);
  }
} catch {}

export function serverTimestamp(): string {
  return new Date().toISOString();
}

export const db = { supabaseUrl: NEXT_PUBLIC_SUPABASE_URL };

const ESCUDOS_MAP: Record<string, string> = {
  flamengo: 'https://logodetimes.com/times/flamengo/logo-flamengo-256.png',
  palmeiras: 'https://logodetimes.com/times/palmeiras/logo-palmeiras-256.png',
  botafogo: 'https://logodetimes.com/times/botafogo/logo-botafogo-256.png',
  fortaleza: 'https://logodetimes.com/times/fortaleza/logo-fortaleza-256.png',
  internacional: 'https://logodetimes.com/times/internacional/logo-internacional-256.png',
  'sao paulo': 'https://logodetimes.com/times/sao-paulo/logo-sao-paulo-256.png',
  'são paulo': 'https://logodetimes.com/times/sao-paulo/logo-sao-paulo-256.png',
  corinthians: 'https://logodetimes.com/times/corinthians/logo-corinthians-256.png',
  bahia: 'https://logodetimes.com/times/bahia/logo-bahia-256.png',
  cruzeiro: 'https://logodetimes.com/times/cruzeiro/logo-cruzeiro-256.png',
  vasco: 'https://logodetimes.com/times/vasco-da-gama/logo-vasco-da-gama-256.png',
  'vasco da gama': 'https://logodetimes.com/times/vasco-da-gama/logo-vasco-da-gama-256.png',
  vitoria: 'https://logodetimes.com/times/vitoria/logo-vitoria-256.png',
  vitória: 'https://logodetimes.com/times/vitoria/logo-vitoria-256.png',
  'atletico-mg': 'https://logodetimes.com/times/atletico-mineiro/logo-atletico-mineiro-256.png',
  'atlético-mg': 'https://logodetimes.com/times/atletico-mineiro/logo-atletico-mineiro-256.png',
  fluminense: 'https://logodetimes.com/times/fluminense/logo-fluminense-256.png',
  gremio: 'https://logodetimes.com/times/gremio/logo-gremio-256.png',
  grêmio: 'https://logodetimes.com/times/gremio/logo-gremio-256.png',
  juventude: 'https://logodetimes.com/times/juventude/logo-juventude-256.png',
  bragantino: 'https://logodetimes.com/times/red-bull-bragantino/logo-red-bull-bragantino-256.png',
  'rb bragantino': 'https://logodetimes.com/times/red-bull-bragantino/logo-red-bull-bragantino-256.png',
  'athletico-pr': 'https://logodetimes.com/times/athletico-paranaense/logo-athletico-paranaense-256.png',
  criciuma: 'https://logodetimes.com/times/criciuma/logo-criciuma-256.png',
  criciúma: 'https://logodetimes.com/times/criciuma/logo-criciuma-256.png',
  'atletico-go': 'https://logodetimes.com/times/atletico-goianiense/logo-atletico-goianiense-256.png',
  cuiaba: 'https://logodetimes.com/times/cuiaba/logo-cuiaba-256.png',
  cuiabá: 'https://logodetimes.com/times/cuiaba/logo-cuiaba-256.png',
  santos: 'https://logodetimes.com/times/santos/logo-santos-256.png',
  ceara: 'https://logodetimes.com/times/ceara/logo-ceara-256.png',
  ceará: 'https://logodetimes.com/times/ceara/logo-ceara-256.png',
  sport: 'https://logodetimes.com/times/sport-recife/logo-sport-recife-256.png',
  mirassol: 'https://logodetimes.com/times/mirassol/logo-mirassol-256.png',
};

function buscarEscudoPadrao(nomeTime: string): string {
  const key = String(nomeTime || '').trim().toLowerCase();
  return ESCUDOS_MAP[key] || '';
}

export function getJogadorDocId(email: string): string {
  return (
    String(email || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9@._-]/g, '_')
      .slice(0, 100) || 'anon'
  );
}

const DELETED_JOGADORES_KEY = 'bolao_deleted_jogadores_v1';

export function getDeletedJogadoresSet(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_JOGADORES_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.map((e: any) => String(e || '').trim().toLowerCase()).filter(Boolean));
  } catch {
    return new Set();
  }
}

export function markJogadorDeletedLocal(email: string): void {
  const clean = String(email || '').trim().toLowerCase();
  if (!clean) return;
  try {
    const set = getDeletedJogadoresSet();
    set.add(clean);
    localStorage.setItem(DELETED_JOGADORES_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

export function clearJogadorDeletedLocal(email: string): void {
  const clean = String(email || '').trim().toLowerCase();
  if (!clean) return;
  try {
    const set = getDeletedJogadoresSet();
    if (set.has(clean)) {
      set.delete(clean);
      localStorage.setItem(DELETED_JOGADORES_KEY, JSON.stringify(Array.from(set)));
    }
  } catch {}
}

export function isJogadorDeletedLocal(email: string): boolean {
  const clean = String(email || '').trim().toLowerCase();
  if (!clean) return false;
  return getDeletedJogadoresSet().has(clean);
}

// ============================================================================
// LEITURA E ESCRITA DE USUÁRIOS (TABELAS REAIS: profiles + jogadores)
// ============================================================================
export function normalizarLinhaUsuarioSupabase(rowProfile: any, rowJogador?: any): any | null {
  if (!rowProfile && !rowJogador) return null;

  let extra: Record<string, any> = {};
  const tc = rowJogador?.time_coracao;
  if (typeof tc === 'string' && tc.trim().startsWith('{')) {
    try {
      extra = JSON.parse(tc);
    } catch {}
  }

  const emailRaw =
    rowProfile?.email ||
    extra.email ||
    (rowJogador?.whatsapp && String(rowJogador.whatsapp).includes('@') ? rowJogador.whatsapp : '') ||
    '';
  const email = String(emailRaw).trim().toLowerCase();

  const id = String(rowProfile?.id || rowJogador?.id || extra.uid || (email ? stringToUuid(email) : ''));
  const finalEmail = email || (id ? `${id.slice(0, 8)}@jogador.bolao` : '');
  if (!finalEmail) return null;

  const nome = String(
    rowProfile?.nome ||
      rowJogador?.nome ||
      extra.nome ||
      finalEmail.split('@')[0] ||
      'Jogador'
  )
    .trim()
    .slice(0, 80);

  const telefone = String(
    rowProfile?.telefone ||
      extra.telefone ||
      (rowJogador?.whatsapp && !String(rowJogador.whatsapp).includes('@') ? rowJogador.whatsapp : '') ||
      ''
  )
    .trim()
    .slice(0, 30);

  const pagou = Boolean(
    rowJogador?.pagou !== undefined ? rowJogador.pagou : extra.pagou !== undefined ? extra.pagou : false
  );

  const statusPagamento =
    extra.statusPagamento ||
    (pagou ? 'aprovado' : extra.comprovante ? 'pendente' : 'nenhum');

  return {
    uid: id,
    id,
    nome,
    email: finalEmail,
    telefone,
    cpf: String(extra.cpf || '').trim().slice(0, 20),
    chavePix: String(extra.chavePix || telefone || '').trim().slice(0, 120),
    saldo: Number(extra.saldo) || 0,
    pontos: Number(extra.pontos) || 0,
    acertos: Number(extra.acertos) || 0,
    pagou,
    statusPagamento,
    comprovante: String(extra.comprovante || ''),
    palpitesExtras: Number(extra.palpitesExtras) || 0,
    senha: String(extra.senha || '123456').slice(0, 60),
    updatedAt: String(extra.updatedAt || rowProfile?.created_at || rowJogador?.created_at || new Date().toISOString()),
  };
}

export async function listarUsuariosDoSupabase(): Promise<any[]> {
  if (!hasValidSupabaseKey()) return [];

  const deletedSet = getDeletedJogadoresSet();

  const [resProfiles, resJogadores] = await Promise.all([
    supabase.from('profiles').select('*'),
    supabase.from('jogadores').select('*'),
  ]);

  const profilesList = Array.isArray(resProfiles.data) ? resProfiles.data : [];
  const jogadoresList = Array.isArray(resJogadores.data) ? resJogadores.data : [];

  const jogadoresById = new Map<string, any>();
  const jogadoresByEmail = new Map<string, any>();

  for (const j of jogadoresList) {
    if (j?.id) jogadoresById.set(String(j.id), j);
    if (typeof j?.time_coracao === 'string' && j.time_coracao.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(j.time_coracao);
        if (parsed?.email) {
          jogadoresByEmail.set(String(parsed.email).trim().toLowerCase(), j);
        }
      } catch {}
    }
  }

  const mapaUsuarios = new Map<string, any>();
  const usedJogadorIds = new Set<string>();

  for (const p of profilesList) {
    const pId = String(p?.id || '');
    const pEmail = String(p?.email || '').trim().toLowerCase();
    const matchedJ =
      (pId && jogadoresById.get(pId)) ||
      (pEmail && jogadoresByEmail.get(pEmail)) ||
      undefined;
    if (matchedJ?.id) usedJogadorIds.add(String(matchedJ.id));

    const norm = normalizarLinhaUsuarioSupabase(p, matchedJ);
    if (!norm || !norm.email) continue;
    if (deletedSet.has(norm.email)) continue;
    mapaUsuarios.set(norm.email, norm);
  }

  for (const j of jogadoresList) {
    if (j?.id && usedJogadorIds.has(String(j.id))) continue;
    const norm = normalizarLinhaUsuarioSupabase(null, j);
    if (!norm || !norm.email) continue;
    if (deletedSet.has(norm.email)) continue;
    if (!mapaUsuarios.has(norm.email)) {
      mapaUsuarios.set(norm.email, norm);
    }
  }

  return Array.from(mapaUsuarios.values());
}

export async function buscarUsuarioNoSupabase(emailInput: string): Promise<any | null> {
  const email = String(emailInput || '').trim().toLowerCase();
  if (!email) return null;
  const todos = await listarUsuariosDoSupabase();
  return todos.find((u) => String(u.email || '').trim().toLowerCase() === email) || null;
}

export async function upsertJogadorInDb(j: any): Promise<void> {
  const email = String(j.email || '').trim().toLowerCase();
  if (!email) return;
  clearJogadorDeletedLocal(email);

  let uuid = j.uid && isUuid(j.uid) ? String(j.uid) : stringToUuid(email);

  try {
    const { data: existingProf } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .limit(1);
    if (existingProf && existingProf[0]?.id) {
      uuid = String(existingProf[0].id);
    }
  } catch {}

  const nome = String(j.nome || email.split('@')[0] || 'Jogador').trim().slice(0, 80);
  const telefone = String(j.telefone || '').trim().slice(0, 30);
  const cpf = String(j.cpf || '').trim().slice(0, 20);
  const chavePix = String(j.chavePix || telefone || '').trim().slice(0, 120);
  const saldo = Number(j.saldo) || 0;
  const pontos = Number(j.pontos) || 0;
  const acertos = Number(j.acertos) || 0;
  const pagou = Boolean(j.pagou);
  const statusPagamento = j.statusPagamento || (pagou ? 'aprovado' : 'nenhum');
  const comprovante = j.comprovante || '';
  const palpitesExtras = Number(j.palpitesExtras) || 0;
  const senha = String(j.senha || '123456').slice(0, 60);
  const updatedAt = new Date().toISOString();

  const fullMeta = {
    uid: uuid,
    id: uuid,
    nome,
    email,
    telefone,
    cpf,
    chavePix,
    saldo,
    pontos,
    acertos,
    pagou,
    statusPagamento,
    comprovante,
    palpitesExtras,
    senha,
    updatedAt,
  };

  if (j.senha) {
    supabase.auth
      .signUp({
        email,
        password: String(j.senha).length >= 6 ? String(j.senha) : `${j.senha}123456`,
        options: {
          data: { nome, telefone, cpf, chavePix },
        },
      })
      .catch(() => {});
  }

  await Promise.all([
    supabase
      .from('profiles')
      .upsert(
        {
          id: uuid,
          nome,
          email,
          telefone,
        },
        { onConflict: 'id' }
      ),
    supabase
      .from('jogadores')
      .upsert(
        {
          id: uuid,
          nome,
          whatsapp: telefone || email || '00000000000',
          pagou,
          time_coracao: JSON.stringify(fullMeta),
        },
        { onConflict: 'id' }
      ),
  ]);

  triggerListenersForCollection('jogadores');
}

export async function deleteJogadorFromDb(email: string): Promise<void> {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail) return;
  markJogadorDeletedLocal(cleanEmail);

  try {
    const { data: existingProf } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', cleanEmail);

    const idsToDelete = new Set<string>([stringToUuid(cleanEmail)]);
    if (Array.isArray(existingProf)) {
      for (const p of existingProf) {
        if (p?.id) idsToDelete.add(String(p.id));
      }
    }

    for (const id of idsToDelete) {
      await Promise.all([
        supabase.from('apostas').delete().eq('user_id', id),
        supabase.from('jogadores').delete().eq('id', id),
        supabase.from('profiles').delete().eq('id', id),
      ]);
    }
    await supabase.from('profiles').delete().ilike('email', cleanEmail);
  } catch {}

  triggerListenersForCollection('jogadores');
}

// ============================================================================
// JOGOS / PARTIDAS NO SUPABASE (TABELA REAL: jogos + metadados em apostas)
// ============================================================================
function parseDataParaIsoDate(rawDate: string): string {
  const str = String(rawDate || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split('/');
    return `${y}-${m}-${d}`;
  }
  if (/^\d{2}\/\d{2}$/.test(str)) {
    const [d, m] = str.split('/');
    const y = new Date().getFullYear();
    return `${y}-${m}-${d}`;
  }
  return new Date().toISOString().slice(0, 10);
}

export async function listarJogosDoSupabase(): Promise<any[]> {
  if (!hasValidSupabaseKey()) return [];

  const [resJogos, resApostas] = await Promise.all([
    supabase.from('jogos').select('*'),
    supabase.from('apostas').select('*'),
  ]);

  const jogosRows = Array.isArray(resJogos.data) ? resJogos.data : [];
  const apostasRows = Array.isArray(resApostas.data) ? resApostas.data : [];

  const metaByGameUuid = new Map<string, any>();
  for (const a of apostasRows) {
    const rawPalpite = String(a?.palpite || '').trim();
    if (!rawPalpite.startsWith('{')) continue;
    try {
      const parsed = JSON.parse(rawPalpite);
      if (parsed && parsed.__type === 'jogo_meta') {
        const gUuid = String(a.jogo_id || parsed.gameUuid || stringToUuid(String(parsed.id || '')));
        if (gUuid) {
          metaByGameUuid.set(gUuid, parsed);
        }
      }
    } catch {}
  }

  const mapaJogos = new Map<string, any>();

  for (const row of jogosRows) {
    const gUuid = String(row.id || '');
    if (!gUuid) continue;
    const meta = metaByGameUuid.get(gUuid) || {};

    const casa = String(meta.casa || row.time_casa || '').trim();
    const fora = String(meta.fora || row.time_fora || '').trim();
    if (!casa || !fora) continue;

    const id = String(meta.id || gUuid);
    const escudoCasa = String(meta.escudoCasa || buscarEscudoPadrao(casa));
    const escudoFora = String(meta.escudoFora || buscarEscudoPadrao(fora));

    mapaJogos.set(id, {
      id,
      gameUuid: gUuid,
      casa,
      fora,
      escudoCasa,
      escudoFora,
      golsCasa: meta.golsCasa === null || meta.golsCasa === undefined || meta.golsCasa === '' ? null : Number(meta.golsCasa),
      golsFora: meta.golsFora === null || meta.golsFora === undefined || meta.golsFora === '' ? null : Number(meta.golsFora),
      data: String(meta.data || row.data_jogo || 'Hoje'),
      horario: String(meta.horario || '16:00'),
      estadio: String(meta.estadio || 'Arena'),
      encerrado: Boolean(meta.encerrado ?? false),
      publicado: true,
      titulo: String(meta.titulo || `${casa} x ${fora}`),
      subtitulo: String(meta.subtitulo || 'Bolão Elite'),
      campeonato: String(meta.campeonato || 'Brasileirão Série A'),
      rodada: String(meta.rodada || 'Rodada Principal'),
      tipoJogo: String(meta.tipoJogo || 'Brasileirão Série A'),
      premioBase: Number(meta.premioBase) || 1000,
      valorCota: Number(meta.valorCota) || VALOR_COTA,
      updatedAt: String(meta.updatedAt || row.created_at || new Date().toISOString()),
    });
  }

  return Array.from(mapaJogos.values());
}

export async function upsertJogoInDb(j: any): Promise<void> {
  const id = String(j.id || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  if (!id) return;

  const gameUuid = isUuid(id) ? id : stringToUuid(id);
  const casa = String(j.casa || j.time_casa || '').trim().slice(0, 60);
  const fora = String(j.fora || j.time_fora || '').trim().slice(0, 60);
  const escudoCasa = String(j.escudoCasa || buscarEscudoPadrao(casa)).trim();
  const escudoFora = String(j.escudoFora || buscarEscudoPadrao(fora)).trim();
  const golsCasa = j.golsCasa === null || j.golsCasa === undefined || j.golsCasa === '' ? null : Number(j.golsCasa);
  const golsFora = j.golsFora === null || j.golsFora === undefined || j.golsFora === '' ? null : Number(j.golsFora);
  const data = String(j.data || 'Hoje').slice(0, 20);
  const horario = String(j.horario || '16:00').slice(0, 20);
  const estadio = String(j.estadio || 'Arena').slice(0, 60);
  const encerrado = Boolean(j.encerrado);
  const publicado = j.publicado !== undefined ? Boolean(j.publicado) : true;
  const titulo = String(j.titulo || `${casa} x ${fora}`).slice(0, 80);
  const subtitulo = String(j.subtitulo || 'Bolão Elite').slice(0, 100);
  const campeonato = String(j.campeonato || 'Brasileirão Série A').slice(0, 80);
  const rodada = String(j.rodada || 'Rodada Principal').slice(0, 60);
  const tipoJogo = String(j.tipoJogo || 'Brasileirão Série A').slice(0, 60);
  const premioBase = Number(j.premioBase) || 1000;
  const valorCota = Number(j.valorCota) || VALOR_COTA;
  const updatedAt = new Date().toISOString();

  const fullJogoMeta = {
    __type: 'jogo_meta',
    id,
    gameUuid,
    casa,
    fora,
    escudoCasa,
    escudoFora,
    golsCasa,
    golsFora,
    data,
    horario,
    estadio,
    encerrado,
    publicado,
    titulo,
    subtitulo,
    campeonato,
    rodada,
    tipoJogo,
    premioBase,
    valorCota,
    updatedAt,
  };

  await supabase.from('jogos').upsert(
    {
      id: gameUuid,
      time_casa: casa,
      time_fora: fora,
      data_jogo: parseDataParaIsoDate(data),
    },
    { onConflict: 'id' }
  );

  await supabase.from('apostas').upsert(
    {
      id: stringToUuid(`jogo_meta_${gameUuid}`),
      user_id: null,
      jogo_id: gameUuid,
      palpite: JSON.stringify(fullJogoMeta),
    },
    { onConflict: 'id' }
  );

  triggerListenersForCollection('jogos');
}

export async function deleteJogoFromDb(id: string): Promise<void> {
  const cleanId = String(id || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  if (!cleanId) return;
  const gameUuid = isUuid(cleanId) ? cleanId : stringToUuid(cleanId);

  try {
    await supabase.from('apostas').delete().eq('id', stringToUuid(`jogo_meta_${gameUuid}`));
    await supabase.from('apostas').delete().eq('jogo_id', gameUuid);
    await supabase.from('jogos').delete().eq('id', gameUuid);
  } catch {}

  triggerListenersForCollection('jogos');
}

export interface JogoDisponivelItem {
  id: string;
  campeonato: string;
  rodada?: string;
  time_casa: string;
  time_fora: string;
  escudo_casa: string;
  escudo_fora: string;
  data: string;
  horario: string;
  estadio: string;
  status: string;
  selecionado_admin: boolean;
}

export async function upsertJogoDisponivelInDb(_item: JogoDisponivelItem): Promise<void> {
  // Mantido para compatibilidade com ImportarJogosAdmin
}

// ============================================================================
// PALPITES / APOSTAS NO SUPABASE (TABELA REAL: apostas)
// ============================================================================
export async function listarPalpitesDoSupabase(): Promise<any[]> {
  if (!hasValidSupabaseKey()) return [];

  const { data: rows } = await supabase.from('apostas').select('*');
  if (!Array.isArray(rows)) return [];

  const mapaPalpites = new Map<string, any>();

  for (const row of rows) {
    const rawPalpite = String(row?.palpite || '').trim();
    if (!rawPalpite) continue;

    if (rawPalpite.startsWith('{')) {
      try {
        const parsed = JSON.parse(rawPalpite);
        if (
          parsed.__type === 'jogo_meta' ||
          parsed.__type === 'config_bolao' ||
          parsed.__type === 'comprovante_premiacao'
        ) {
          continue;
        }
        const id = String(parsed.id || row.id || '');
        if (!id) continue;
        mapaPalpites.set(id, {
          id,
          jogadorEmail: String(parsed.jogadorEmail || '').trim().toLowerCase(),
          jogadorNome: String(parsed.jogadorNome || 'Jogador'),
          jogoId: String(parsed.jogoId || row.jogo_id || ''),
          golsCasa: Number(parsed.golsCasa) || 0,
          golsFora: Number(parsed.golsFora) || 0,
          indicePalpite: Number(parsed.indicePalpite) || 1,
          timestamp: String(parsed.timestamp || row.created_at || ''),
          updatedAt: String(parsed.updatedAt || row.created_at || new Date().toISOString()),
        });
      } catch {}
    } else if (/^\d+\s*[xX-]\s*\d+$/.test(rawPalpite)) {
      const parts = rawPalpite.split(/[xX-]/);
      const id = String(row.id || '');
      if (!id) continue;
      mapaPalpites.set(id, {
        id,
        jogadorEmail: String(row.user_id || '').trim().toLowerCase(),
        jogadorNome: 'Jogador',
        jogoId: String(row.jogo_id || ''),
        golsCasa: Number(parts[0]) || 0,
        golsFora: Number(parts[1]) || 0,
        indicePalpite: 1,
        timestamp: String(row.created_at || ''),
        updatedAt: String(row.created_at || new Date().toISOString()),
      });
    }
  }

  return Array.from(mapaPalpites.values());
}

export async function upsertPalpiteInDb(p: any): Promise<void> {
  const id = String(p.id || '').replace(/[^a-zA-Z0-9_@.-]/g, '_').slice(0, 120);
  if (!id) return;
  const betUuid = stringToUuid(`palpite_${id}`);
  const jogadorEmail = String(p.jogadorEmail || '').trim().toLowerCase().slice(0, 120);
  const jogadorNome = String(p.jogadorNome || 'Jogador').trim().slice(0, 80);
  const jogoId = String(p.jogoId || '').slice(0, 64);
  const golsCasa = Number(p.golsCasa) || 0;
  const golsFora = Number(p.golsFora) || 0;
  const indicePalpite = Number(p.indicePalpite) || 1;
  const timestamp = String(p.timestamp || new Date().toLocaleString('pt-BR')).slice(0, 40);
  const updatedAt = new Date().toISOString();

  const payload = {
    __type: 'palpite',
    id,
    jogadorEmail,
    jogadorNome,
    jogoId,
    golsCasa,
    golsFora,
    indicePalpite,
    timestamp,
    updatedAt,
  };

  await supabase.from('apostas').upsert(
    {
      id: betUuid,
      user_id: null,
      jogo_id: null,
      palpite: JSON.stringify(payload),
    },
    { onConflict: 'id' }
  );

  triggerListenersForCollection('palpites');
}

export async function deletePalpiteFromDb(id: string): Promise<void> {
  const cleanId = String(id || '').replace(/[^a-zA-Z0-9_@.-]/g, '_').slice(0, 120);
  if (!cleanId) return;
  const betUuid = stringToUuid(`palpite_${cleanId}`);

  try {
    await supabase.from('apostas').delete().eq('id', betUuid);
  } catch {}

  triggerListenersForCollection('palpites');
}

// ============================================================================
// TRANSPARÊNCIA: COMPROVANTES DE PREMIAÇÃO E CONFIGURAÇÕES GERAIS (via apostas)
// ============================================================================
export interface ComprovantePremiacaoItem {
  id: string;
  ganhadorNome: string;
  rodadaTitulo: string;
  valorPremio: number;
  chavePixGanhador?: string;
  comprovanteUrl: string;
  observacao?: string;
  dataEnvio: string;
  createdAtMs: number;
}

export async function listarComprovantesPremiacaoDoSupabase(): Promise<ComprovantePremiacaoItem[]> {
  if (!hasValidSupabaseKey()) return [];

  const { data: rows } = await supabase.from('apostas').select('*');
  if (!Array.isArray(rows)) return [];

  const lista: ComprovantePremiacaoItem[] = [];
  for (const row of rows) {
    const raw = String(row?.palpite || '').trim();
    if (!raw.startsWith('{')) continue;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.__type === 'comprovante_premiacao' && parsed.id) {
        lista.push({
          id: String(parsed.id),
          ganhadorNome: String(parsed.ganhadorNome || 'Ganhador'),
          rodadaTitulo: String(parsed.rodadaTitulo || 'Rodada Principal'),
          valorPremio: Number(parsed.valorPremio) || 0,
          chavePixGanhador: String(parsed.chavePixGanhador || ''),
          comprovanteUrl: String(parsed.comprovanteUrl || ''),
          observacao: String(parsed.observacao || ''),
          dataEnvio: String(parsed.dataEnvio || ''),
          createdAtMs: Number(parsed.createdAtMs) || Date.now(),
        });
      }
    } catch {}
  }

  return lista.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
}

export async function upsertComprovantePremiacaoInDb(item: ComprovantePremiacaoItem): Promise<void> {
  const id = String(item.id || `comp_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  const compUuid = stringToUuid(`comprovante_${id}`);

  const payload = {
    __type: 'comprovante_premiacao',
    id,
    ganhadorNome: String(item.ganhadorNome || 'Ganhador').trim().slice(0, 80),
    rodadaTitulo: String(item.rodadaTitulo || 'Rodada Principal').trim().slice(0, 80),
    valorPremio: Number(item.valorPremio) || 0,
    chavePixGanhador: String(item.chavePixGanhador || '').trim().slice(0, 120),
    comprovanteUrl: String(item.comprovanteUrl || ''),
    observacao: String(item.observacao || '').trim().slice(0, 240),
    dataEnvio: String(item.dataEnvio || new Date().toLocaleString('pt-BR')).slice(0, 40),
    createdAtMs: Number(item.createdAtMs) || Date.now(),
    updatedAt: new Date().toISOString(),
  };

  await supabase.from('apostas').upsert(
    {
      id: compUuid,
      user_id: null,
      jogo_id: null,
      palpite: JSON.stringify(payload),
    },
    { onConflict: 'id' }
  );

  triggerListenersForCollection('comprovantes_premiacao');
}

export async function deleteComprovantePremiacaoFromDb(id: string): Promise<void> {
  const cleanId = String(id || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  if (!cleanId) return;
  const compUuid = stringToUuid(`comprovante_${cleanId}`);

  try {
    await supabase.from('apostas').delete().eq('id', compUuid);
  } catch {}

  triggerListenersForCollection('comprovantes_premiacao');
}

const CONFIG_BOLAO_UUID = stringToUuid('config_bolao_elite_v1');

async function carregarConfigBolaoDoSupabase(): Promise<Record<string, any> | null> {
  if (!hasValidSupabaseKey()) return null;
  try {
    const { data } = await supabase
      .from('apostas')
      .select('palpite')
      .eq('id', CONFIG_BOLAO_UUID)
      .limit(1);
    if (data && data[0]?.palpite) {
      const parsed = JSON.parse(data[0].palpite);
      if (parsed && parsed.__type === 'config_bolao') {
        return parsed;
      }
    }
  } catch {}
  return null;
}

export async function saveConfigInDb(config: {
  premioBase?: number;
  valorCota?: number;
  chavePix?: string;
  tituloBolao?: string;
  subtituloBolao?: string;
  regrasBolao?: string;
  termosBolao?: string;
  palpitesBloqueados?: boolean;
}): Promise<void> {
  const payload: Record<string, any> = {
    __type: 'config_bolao',
    updatedAt: new Date().toISOString(),
  };
  if (config.premioBase !== undefined) payload.premioBase = Number(config.premioBase);
  if (config.valorCota !== undefined) payload.valorCota = Number(config.valorCota);
  if (config.chavePix !== undefined) payload.chavePix = String(config.chavePix).slice(0, 140);
  if (config.tituloBolao !== undefined) payload.tituloBolao = String(config.tituloBolao).slice(0, 80);
  if (config.subtituloBolao !== undefined) payload.subtituloBolao = String(config.subtituloBolao).slice(0, 120);
  if (config.regrasBolao !== undefined) payload.regrasBolao = String(config.regrasBolao).slice(0, 4000);
  if (config.termosBolao !== undefined) payload.termosBolao = String(config.termosBolao).slice(0, 6000);
  if (config.palpitesBloqueados !== undefined) payload.palpitesBloqueados = Boolean(config.palpitesBloqueados);

  try {
    const atual = (await carregarConfigBolaoDoSupabase()) || {};
    const merged = { ...atual, ...payload, __type: 'config_bolao' };
    try {
      localStorage.setItem('bolao_config_cache_v1', JSON.stringify(merged));
    } catch {}
    await supabase.from('apostas').upsert(
      {
        id: CONFIG_BOLAO_UUID,
        user_id: null,
        jogo_id: null,
        palpite: JSON.stringify(merged),
      },
      { onConflict: 'id' }
    );
    triggerListenersForCollection('config');
  } catch {}
}

export async function inicializarConfigAdminInDb(emailAdmin: string): Promise<void> {
  const cleanEmail = String(emailAdmin || '').trim().toLowerCase();
  if (!cleanEmail) return;
}

export async function registrarDepositoConfirmadoInDb(params: {
  email: string;
  nome?: string;
  telefone?: string;
  chavePix?: string;
  valor: number;
  novoSaldo: number;
  metodo?: string;
}): Promise<void> {
  const cleanEmail = String(params.email || '').trim().toLowerCase();
  if (!cleanEmail) return;

  const existente = await buscarUsuarioNoSupabase(cleanEmail);
  await upsertJogadorInDb({
    ...(existente || {}),
    email: cleanEmail,
    nome: params.nome || existente?.nome || cleanEmail.split('@')[0],
    telefone: params.telefone || existente?.telefone || '',
    chavePix: params.chavePix || existente?.chavePix || '',
    saldo: Number(params.novoSaldo) || 0,
    pagou: true,
    statusPagamento: 'aprovado',
  });
}

// ============================================================================
// CAMADA DE ESCUTA EM TEMPO REAL (SUPABASE REALTIME + POLLING AUTOMÁTICO)
// ============================================================================
export interface DocRef {
  type: 'doc';
  collectionName: string;
  id: string;
  path: string;
}

export interface CollectionRef {
  type: 'collection';
  collectionName: string;
  path: string;
}

export function collection(_db: any, collectionName: string): CollectionRef {
  return {
    type: 'collection',
    collectionName,
    path: collectionName,
  };
}

export function doc(_db: any, pathOrCollection: string, ...segments: string[]): DocRef {
  const parts = [pathOrCollection, ...segments].join('/').split('/').filter(Boolean);
  const collectionName = parts[0] || 'config';
  const id = parts.slice(1).join('/') || 'default';
  return {
    type: 'doc',
    collectionName,
    id,
    path: `${collectionName}/${id}`,
  };
}

export async function getDoc(ref: DocRef): Promise<{ exists: () => boolean; data: () => any; id: string }> {
  if (ref.collectionName === 'config' && ref.id === 'bolao') {
    const remote = await carregarConfigBolaoDoSupabase();
    if (remote) {
      return { exists: () => true, data: () => remote, id: ref.id };
    }
    try {
      const local = localStorage.getItem('bolao_config_cache_v1');
      if (local) {
        const parsed = JSON.parse(local);
        return { exists: () => true, data: () => parsed, id: ref.id };
      }
    } catch {}
    return { exists: () => false, data: () => undefined, id: ref.id };
  }

  if (ref.collectionName === 'jogadores') {
    const user = await buscarUsuarioNoSupabase(ref.id);
    return {
      exists: () => Boolean(user),
      data: () => user || undefined,
      id: ref.id,
    };
  }

  return { exists: () => false, data: () => undefined, id: ref.id };
}

export async function setDoc(ref: DocRef, data: any, _options?: { merge?: boolean }): Promise<void> {
  if (ref.collectionName === 'config' && ref.id === 'bolao') {
    await saveConfigInDb(data || {});
    return;
  }
  if (ref.collectionName === 'jogadores') {
    await upsertJogadorInDb({ ...data, email: data?.email || ref.id });
    return;
  }
  if (ref.collectionName === 'jogos') {
    await upsertJogoInDb({ ...data, id: data?.id || ref.id });
    return;
  }
  if (ref.collectionName === 'palpites') {
    await upsertPalpiteInDb({ ...data, id: data?.id || ref.id });
    return;
  }
  if (ref.collectionName === 'comprovantes_premiacao') {
    await upsertComprovantePremiacaoInDb({ ...data, id: data?.id || ref.id });
    return;
  }
}

type ListenerEntry = {
  target: DocRef | CollectionRef;
  onNext: (snap: any) => void;
  onError?: (err: any) => void;
};

const activeListeners = new Set<ListenerEntry>();
let realtimeChannel: RealtimeChannel | null = null;
let pollingIntervalId: any = null;

async function notifyListener(entry: ListenerEntry): Promise<void> {
  try {
    const { target, onNext } = entry;
    if (target.type === 'doc') {
      const snap = await getDoc(target);
      onNext(snap);
      return;
    }

    let items: any[] = [];
    if (target.collectionName === 'jogadores') {
      items = await listarUsuariosDoSupabase();
    } else if (target.collectionName === 'jogos') {
      items = await listarJogosDoSupabase();
    } else if (target.collectionName === 'palpites') {
      items = await listarPalpitesDoSupabase();
    } else if (target.collectionName === 'comprovantes_premiacao') {
      items = await listarComprovantesPremiacaoDoSupabase();
    }

    const docs = items.map((item) => ({
      id: String(item.id || item.email || item.uid || ''),
      data: () => item,
    }));

    onNext({
      docs,
      empty: docs.length === 0,
      size: docs.length,
      forEach: (cb: (d: any) => void) => docs.forEach(cb),
    });
  } catch (err) {
    if (entry.onError) entry.onError(err);
  }
}

export function triggerListenersForCollection(collectionName: string): void {
  for (const entry of activeListeners) {
    if (entry.target.collectionName === collectionName) {
      notifyListener(entry);
    }
  }
}

export function triggerAllListeners(): void {
  for (const entry of activeListeners) {
    notifyListener(entry);
  }
}

function ensureRealtimeAndPolling(): void {
  if (!pollingIntervalId && typeof window !== 'undefined') {
    pollingIntervalId = window.setInterval(() => {
      if (activeListeners.size > 0) {
        triggerAllListeners();
      }
    }, 5000);
  }

  if (!realtimeChannel && hasValidSupabaseKey()) {
    try {
      realtimeChannel = supabase
        .channel('bolao-elite-realtime')
        .on('postgres_changes', { event: '*', schema: 'public' }, () => {
          triggerAllListeners();
        })
        .subscribe();
    } catch {}
  }
}

export function onSnapshot(
  target: DocRef | CollectionRef,
  onNext: (snap: any) => void,
  onError?: (err: any) => void
): () => void {
  const entry: ListenerEntry = { target, onNext, onError };
  activeListeners.add(entry);
  ensureRealtimeAndPolling();
  notifyListener(entry);

  return () => {
    activeListeners.delete(entry);
  };
}

// ============================================================================
// UTILITÁRIO PARA COMPRIMIR IMAGEM DE COMPROVANTE
// ============================================================================
export async function compressImageToDataUrl(
  file: File,
  maxWidth = 900,
  quality = 0.72
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.onload = () => {
      const resultStr = String(reader.result || '');
      if (file.type === 'application/pdf') {
        resolve(resultStr);
        return;
      }
      const img = new Image();
      img.onerror = () => resolve(resultStr);
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(resultStr);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed.length < resultStr.length ? compressed : resultStr);
        } catch {
          resolve(resultStr);
        }
      };
      img.src = resultStr;
    };
    reader.readAsDataURL(file);
  });
}
