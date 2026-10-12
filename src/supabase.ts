import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { PERMANENT_SUPABASE_CONFIG, PERMANENT_APP_INTEGRITY } from './config/appIntegrityConfig';

declare const process: {
  env: {
    NEXT_PUBLIC_SUPABASE_URL?: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
    SUPABASE_REST_URL?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
    [key: string]: string | undefined;
  };
};

const envMeta: Record<string, any> =
  typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env : {};

export const SUPABASE_DEFAULT_URL = PERMANENT_SUPABASE_CONFIG.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_DEFAULT_REST_URL = PERMANENT_SUPABASE_CONFIG.SUPABASE_REST_URL;
export const SUPABASE_PUBLISHABLE_KEY = PERMANENT_SUPABASE_CONFIG.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const SUPABASE_SECRET_KEY = PERMANENT_SUPABASE_CONFIG.SUPABASE_SERVICE_ROLE_KEY;

const SAVED_KEYS_STORAGE_KEY = 'bolao_supabase_saved_keys_v1';

function readSavedKeysFromLocal(): Record<string, string> {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(SAVED_KEYS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {}
  return {};
}

function writeSavedKeysToLocal(keys: Record<string, string>): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(SAVED_KEYS_STORAGE_KEY, JSON.stringify(keys));
  } catch {}
}

export function normalizeSupabaseUrl(raw: string): string {
  let u = String(raw || SUPABASE_DEFAULT_URL).trim();
  u = u.replace(/slaq[a-z]*lokjos\.supabase\.co/i, 'slaqxbccectdgmlokjos.supabase.co');
  // Remove /rest/v1/ caso tenha sido informado na URL base para evitar /rest/v1/rest/v1 no cliente Supabase
  u = u.replace(/\/rest\/v1\/?.*$/i, '');
  if (!/^https?:\/\//i.test(u)) {
    u = `https://${u}`;
  }
  return u.replace(/\/+$/, '');
}

export function normalizeSupabaseAnonKey(raw: string): string {
  const k = String(raw || '').trim();
  // O navegador exige a chave publishable (chaves sb_secret_ retornam 401 no browser)
  if (!k || k === 'sb-anon-key-placeholder' || k.startsWith('sb_secret_') || k.startsWith('http')) {
    return SUPABASE_PUBLISHABLE_KEY;
  }
  return k;
}

const initialSavedKeys = readSavedKeysFromLocal();

export let SUPABASE_REST_URL: string = normalizeSupabaseUrl(
  process.env.SUPABASE_REST_URL ||
    envMeta.SUPABASE_REST_URL ||
    initialSavedKeys.SUPABASE_REST_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    envMeta.NEXT_PUBLIC_SUPABASE_URL ||
    initialSavedKeys.NEXT_PUBLIC_SUPABASE_URL ||
    SUPABASE_DEFAULT_URL
);

export let NEXT_PUBLIC_SUPABASE_URL: string = normalizeSupabaseUrl(
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
    envMeta.NEXT_PUBLIC_SUPABASE_URL ||
    initialSavedKeys.NEXT_PUBLIC_SUPABASE_URL ||
    SUPABASE_REST_URL
);

export let NEXT_PUBLIC_SUPABASE_ANON_KEY: string = normalizeSupabaseAnonKey(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    envMeta.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    initialSavedKeys.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    SUPABASE_PUBLISHABLE_KEY
);

export let SUPABASE_SERVICE_ROLE_KEY: string =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  envMeta.SUPABASE_SERVICE_ROLE_KEY ||
  initialSavedKeys.SUPABASE_SERVICE_ROLE_KEY ||
  SUPABASE_SECRET_KEY;

// Salva imediatamente no storage local para nunca perder
writeSavedKeysToLocal({
  NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_REST_URL: SUPABASE_DEFAULT_REST_URL,
  SUPABASE_SERVICE_ROLE_KEY,
});

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

export const VALOR_COTA = PERMANENT_APP_INTEGRITY.valorCotaPadrao;
export const CHAVE_PIX_ALEATORIA = PERMANENT_APP_INTEGRITY.chavePixAleatoria;

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

export function syncAuthCurrentUser(emailOrObj?: any, nome?: string): void {
  const rawEmail =
    typeof emailOrObj === 'object' && emailOrObj !== null
      ? emailOrObj.email
      : emailOrObj;
  const rawNome =
    typeof emailOrObj === 'object' && emailOrObj !== null
      ? emailOrObj.nome || emailOrObj.displayName
      : nome;
  const cleanEmail = String(rawEmail || '').trim().toLowerCase();
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
    displayName: rawNome || cleanEmail.split('@')[0],
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

export const TODOS_OS_TIMES_BOLAO = [
  { nome: 'Atlético-MG', sigla: 'CAM', uf: 'MG', escudo: 'https://logodetimes.com/times/atletico-mineiro/logo-atletico-mineiro-256.png' },
  { nome: 'Athletico-PR', sigla: 'CAP', uf: 'PR', escudo: 'https://logodetimes.com/times/atletico-paranaense/logo-atletico-paranaense-256.png' },
  { nome: 'Bahia', sigla: 'BAH', uf: 'BA', escudo: 'https://logodetimes.com/times/bahia/logo-bahia-256.png' },
  { nome: 'Botafogo', sigla: 'BOT', uf: 'RJ', escudo: 'https://logodetimes.com/times/botafogo/logo-botafogo-256.png' },
  { nome: 'Ceará', sigla: 'CEA', uf: 'CE', escudo: 'https://logodetimes.com/times/ceara/logo-ceara-256.png' },
  { nome: 'Chapecoense', sigla: 'CHA', uf: 'SC', escudo: 'https://logodetimes.com/times/chapecoense/logo-chapecoense-256.png' },
  { nome: 'Corinthians', sigla: 'COR', uf: 'SP', escudo: 'https://logodetimes.com/times/corinthians/logo-corinthians-256.png' },
  { nome: 'Coritiba', sigla: 'CFC', uf: 'PR', escudo: 'https://logodetimes.com/times/coritiba/logo-coritiba-256.png' },
  { nome: 'Cruzeiro', sigla: 'CRU', uf: 'MG', escudo: 'https://logodetimes.com/times/cruzeiro/logo-cruzeiro-256.png' },
  { nome: 'Flamengo', sigla: 'FLA', uf: 'RJ', escudo: 'https://logodetimes.com/times/flamengo/logo-flamengo-256.png' },
  { nome: 'Fluminense', sigla: 'FLU', uf: 'RJ', escudo: 'https://logodetimes.com/times/fluminense/logo-fluminense-256.png' },
  { nome: 'Fortaleza', sigla: 'FOR', uf: 'CE', escudo: 'https://logodetimes.com/times/fortaleza/logo-fortaleza-256.png' },
  { nome: 'Grêmio', sigla: 'GRE', uf: 'RS', escudo: 'https://logodetimes.com/times/gremio/logo-gremio-256.png' },
  { nome: 'Internacional', sigla: 'INT', uf: 'RS', escudo: 'https://logodetimes.com/times/internacional/logo-internacional-256.png' },
  { nome: 'Juventude', sigla: 'JUV', uf: 'RS', escudo: 'https://logodetimes.com/times/juventude/logo-juventude-256.png' },
  { nome: 'Mirassol', sigla: 'MIR', uf: 'SP', escudo: 'https://logodetimes.com/times/mirassol/logo-mirassol-256.png' },
  { nome: 'Palmeiras', sigla: 'PAL', uf: 'SP', escudo: 'https://logodetimes.com/times/palmeiras/logo-palmeiras-256.png' },
  { nome: 'Red Bull Bragantino', sigla: 'RBB', uf: 'SP', escudo: 'https://logodetimes.com/times/red-bull-bragantino/logo-red-bull-bragantino-256.png' },
  { nome: 'Remo', sigla: 'REM', uf: 'PA', escudo: 'https://logodetimes.com/times/remo/logo-remo-256.png' },
  { nome: 'Santos', sigla: 'SAN', uf: 'SP', escudo: 'https://logodetimes.com/times/santos/logo-santos-256.png' },
  { nome: 'São Paulo', sigla: 'SAO', uf: 'SP', escudo: 'https://logodetimes.com/times/sao-paulo/logo-sao-paulo-256.png' },
  { nome: 'Sport', sigla: 'SPT', uf: 'PE', escudo: 'https://logodetimes.com/times/sport-recife/logo-sport-recife-256.png' },
  { nome: 'Vasco da Gama', sigla: 'VAS', uf: 'RJ', escudo: 'https://logodetimes.com/times/vasco-da-gama/logo-vasco-da-gama-256.png' },
  { nome: 'Vitória', sigla: 'VIT', uf: 'BA', escudo: 'https://logodetimes.com/times/vitoria/logo-vitoria-256.png' },
  { nome: 'Criciúma', sigla: 'CRI', uf: 'SC', escudo: 'https://logodetimes.com/times/criciuma/logo-criciuma-256.png' },
  { nome: 'Cuiabá', sigla: 'CUI', uf: 'MT', escudo: 'https://logodetimes.com/times/cuiaba/logo-cuiaba-256.png' },
  { nome: 'Atlético-GO', sigla: 'ACG', uf: 'GO', escudo: 'https://logodetimes.com/times/atletico-goianiense/logo-atletico-goianiense-256.png' },
];

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
  'atletico mineiro': 'https://logodetimes.com/times/atletico-mineiro/logo-atletico-mineiro-256.png',
  fluminense: 'https://logodetimes.com/times/fluminense/logo-fluminense-256.png',
  gremio: 'https://logodetimes.com/times/gremio/logo-gremio-256.png',
  grêmio: 'https://logodetimes.com/times/gremio/logo-gremio-256.png',
  juventude: 'https://logodetimes.com/times/juventude/logo-juventude-256.png',
  bragantino: 'https://logodetimes.com/times/red-bull-bragantino/logo-red-bull-bragantino-256.png',
  'rb bragantino': 'https://logodetimes.com/times/red-bull-bragantino/logo-red-bull-bragantino-256.png',
  'red bull bragantino': 'https://logodetimes.com/times/red-bull-bragantino/logo-red-bull-bragantino-256.png',
  'athletico-pr': 'https://logodetimes.com/times/atletico-paranaense/logo-atletico-paranaense-256.png',
  'atletico-pr': 'https://logodetimes.com/times/atletico-paranaense/logo-atletico-paranaense-256.png',
  chapecoense: 'https://logodetimes.com/times/chapecoense/logo-chapecoense-256.png',
  coritiba: 'https://logodetimes.com/times/coritiba/logo-coritiba-256.png',
  remo: 'https://logodetimes.com/times/remo/logo-remo-256.png',
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

export function buscarEscudoPadrao(nomeTime: string): string {
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

export function markJogadorDeletedLocal(email: string, docId?: string): void {
  const clean = String(email || '').trim().toLowerCase();
  try {
    const set = getDeletedJogadoresSet();
    if (clean) set.add(clean);
    if (docId) set.add(String(docId).trim().toLowerCase());
    localStorage.setItem(DELETED_JOGADORES_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

export function clearJogadorDeletedLocal(email: string, docId?: string): void {
  const clean = String(email || '').trim().toLowerCase();
  try {
    const set = getDeletedJogadoresSet();
    if (clean) set.delete(clean);
    if (docId) set.delete(String(docId).trim().toLowerCase());
    localStorage.setItem(DELETED_JOGADORES_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

export function isJogadorDeletedLocal(email?: string, docId?: string, _ts?: number): boolean {
  const set = getDeletedJogadoresSet();
  const clean = String(email || '').trim().toLowerCase();
  if (clean && set.has(clean)) return true;
  const cleanDoc = String(docId || '').trim().toLowerCase();
  if (cleanDoc && set.has(cleanDoc)) return true;
  return false;
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
    extra.pix ||
      extra.chavePix ||
      rowProfile?.telefone ||
      extra.telefone ||
      (rowJogador?.whatsapp && !String(rowJogador.whatsapp).includes('@') ? rowJogador.whatsapp : '') ||
      ''
  )
    .trim()
    .slice(0, 80);

  const pix = String(extra.pix || extra.chavePix || telefone || finalEmail).trim().slice(0, 120);

  const isExplicitUnpaid =
    extra.pagou === false ||
    extra.aprovado === false ||
    extra.status_pagamento === 'pendente' ||
    extra.statusPagamento === 'PENDENTE' ||
    extra.statusPagamento === 'RECUSADO' ||
    extra.statusPagamento === 'EM_ANALISE';

  const pagou = isExplicitUnpaid
    ? false
    : Boolean(
        rowJogador?.pagou !== undefined
          ? rowJogador.pagou
          : extra.aprovado ||
            extra.status_pagamento === 'pago' ||
            extra.statusPagamento === 'APROVADO' ||
            extra.pagou
      );

  const statusPagamento =
    extra.statusPagamento ||
    (pagou ? 'APROVADO' : extra.comprovante ? 'EM_ANALISE' : 'PENDENTE');

  const bolaoPagoId = extra.bolaoPagoId ? String(extra.bolaoPagoId).trim() : '';

  return {
    ...extra,
    uid: id,
    id,
    _docId: extra._docId || getJogadorDocId(finalEmail),
    nome,
    email: finalEmail,
    telefone,
    pix,
    chavePix: pix,
    cpf: String(extra.cpf || '').trim().slice(0, 20),
    saldo: Number(extra.saldo) || 0,
    pontos: Number(extra.pontos) || 0,
    acertos: Number(extra.acertos) || 0,
    pagou,
    aprovado: pagou,
    status_pagamento: pagou ? 'pago' : 'pendente',
    statusPagamento,
    bolaoPagoId,
    valorPago: pagou ? Number(extra.valorPago) || VALOR_COTA : 0,
    dataAprovacao: pagou ? extra.dataAprovacao || undefined : undefined,
    comprovante: extra.comprovante || undefined,
    timestampComprovante: extra.timestampComprovante || undefined,
    dataEnvioComprovante: extra.dataEnvioComprovante || undefined,
    dataCadastro: extra.dataCadastro || undefined,
    timestampCadastro: extra.timestampCadastro || undefined,
    fotoPerfil: extra.fotoPerfil || extra.avatarUrl || undefined,
    role: finalEmail === 'inhobahia29@gmail.com' ? 'admin' : extra.role || 'player',
    is_admin: finalEmail === 'inhobahia29@gmail.com' ? true : Boolean(extra.is_admin),
    updatedAt: String(extra.updatedAt || rowProfile?.created_at || rowJogador?.created_at || new Date().toISOString()),
  };
}

export async function listarUsuariosDoSupabase(): Promise<any[]> {
  if (!hasValidSupabaseKey()) return [];

  const deletedSet = getDeletedJogadoresSet();

  const [resProfiles, resJogadores, resApostas] = await Promise.all([
    supabase.from('profiles').select('*'),
    supabase.from('jogadores').select('*'),
    supabase.from('apostas').select('*'),
  ]);

  const profilesList = Array.isArray(resProfiles.data) ? resProfiles.data : [];
  const jogadoresList = Array.isArray(resJogadores.data) ? resJogadores.data : [];
  const apostasList = Array.isArray(resApostas.data) ? resApostas.data : [];

  const comprovantesByEmail = new Map<string, any>();
  const depositosConfirmadosByEmail = new Map<string, any>();
  for (const a of apostasList) {
    const raw = String(a?.palpite || '').trim();
    if (!raw.startsWith('{')) continue;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.__type === 'comprovante_pagamento_jogador' && parsed.email) {
        const em = String(parsed.email).trim().toLowerCase();
        if (em && parsed.comprovante) {
          comprovantesByEmail.set(em, parsed);
        }
      } else if (
        parsed &&
        parsed.__type === 'deposito_confirmado' &&
        parsed.email &&
        (parsed.status === 'CONFIRMADO' || parsed.status === 'APROVADO')
      ) {
        const em = String(parsed.email).trim().toLowerCase();
        if (em) {
          depositosConfirmadosByEmail.set(em, parsed);
        }
      }
    } catch {}
  }

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

  const aplicarComprovanteSalvo = (norm: any): any => {
    if (!norm || !norm.email) return norm;
    const emailNorm = String(norm.email).trim().toLowerCase();
    let atualizado = norm;

    // Se tem depósito confirmado ativo na rodada, garante que o jogador apareça como PAGO/APROVADO
    const depDoc = depositosConfirmadosByEmail.get(emailNorm);
    if (depDoc && !atualizado.pagou && atualizado.statusPagamento !== 'RECUSADO') {
      atualizado = {
        ...atualizado,
        pagou: true,
        aprovado: true,
        status_pagamento: 'pago',
        statusPagamento: 'APROVADO',
        bolaoPagoId: String(depDoc.bolaoPagoId || atualizado.bolaoPagoId || ''),
        valorPago: Number(depDoc.valor) || Number(atualizado.valorPago) || VALOR_COTA,
      };
    }

    // Se iniciou pagamento automático na InfinitePay há pelo menos 20s, confirma automaticamente no banco e libera para o ADM
    if (
      !atualizado.pagou &&
      atualizado.statusPagamento === 'PROCESSANDO_INFINITEPAY' &&
      atualizado.inicioPagamentoInfinitePay &&
      Date.now() - Number(atualizado.inicioPagamentoInfinitePay) >= 20000
    ) {
      const horaAprov = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      atualizado = {
        ...atualizado,
        pagou: true,
        aprovado: true,
        status_pagamento: 'pago',
        statusPagamento: 'APROVADO',
        metodoPagamento: 'INFINITEPAY',
        dataAprovacao: atualizado.dataAprovacao || horaAprov,
        valorPago: Number(atualizado.valorPago) || VALOR_COTA,
        inicioPagamentoInfinitePay: undefined,
      };
      setTimeout(() => {
        registrarDepositoConfirmadoInDb(atualizado).catch(() => {});
      }, 50);
    }

    const compDoc = comprovantesByEmail.get(emailNorm);
    if (!compDoc || !compDoc.comprovante) return atualizado;
    const tsComp = Number(compDoc.timestampComprovante) || Number(atualizado.timestampComprovante) || Date.now();
    const statusComp =
      atualizado.pagou || atualizado.statusPagamento === 'APROVADO'
        ? 'APROVADO'
        : compDoc.statusPagamento || atualizado.statusPagamento || 'EM_ANALISE';
    return {
      ...atualizado,
      comprovante: compDoc.comprovante || atualizado.comprovante,
      timestampComprovante: tsComp,
      dataEnvioComprovante: compDoc.dataEnvioComprovante || atualizado.dataEnvioComprovante || 'Recente',
      statusPagamento: statusComp,
      bolaoPagoId: compDoc.bolaoPagoId || atualizado.bolaoPagoId || '',
    };
  };

  const mapaUsuarios = new Map<string, any>();
  const usedJogadorIds = new Set<string>();

  for (const p of profilesList) {
    const pId = String(p?.id || '');
    const pEmail = String(p?.email || '').trim().toLowerCase();
    const matchedJ =
      (pEmail && jogadoresByEmail.get(pEmail)) ||
      (pId && jogadoresById.get(pId)) ||
      undefined;
    if (matchedJ?.id) usedJogadorIds.add(String(matchedJ.id));

    const norm = aplicarComprovanteSalvo(normalizarLinhaUsuarioSupabase(p, matchedJ));
    if (!norm || !norm.email) continue;
    if (deletedSet.has(norm.email) && !norm.comprovante) continue;
    mapaUsuarios.set(norm.email, norm);
  }

  for (const j of jogadoresList) {
    if (j?.id && usedJogadorIds.has(String(j.id))) continue;
    const norm = aplicarComprovanteSalvo(normalizarLinhaUsuarioSupabase(null, j));
    if (!norm || !norm.email) continue;
    if (deletedSet.has(norm.email) && !norm.comprovante) continue;
    if (!mapaUsuarios.has(norm.email)) {
      mapaUsuarios.set(norm.email, norm);
    }
  }

  // Garante que qualquer jogador que tenha enviado comprovante em apostas apareça na lista do ADM mesmo se não estiver em profiles
  for (const [em, compDoc] of comprovantesByEmail.entries()) {
    if (!mapaUsuarios.has(em)) {
      const uid = stringToUuid(em);
      mapaUsuarios.set(em, {
        uid,
        id: uid,
        _docId: getJogadorDocId(em),
        nome: String(compDoc.nome || em.split('@')[0] || 'Jogador'),
        email: em,
        telefone: String(compDoc.telefone || compDoc.pix || ''),
        pix: String(compDoc.pix || compDoc.telefone || em),
        chavePix: String(compDoc.pix || compDoc.telefone || em),
        pagou: false,
        aprovado: false,
        status_pagamento: 'pendente',
        statusPagamento: compDoc.statusPagamento || 'EM_ANALISE',
        bolaoPagoId: String(compDoc.bolaoPagoId || ''),
        valorPago: 0,
        comprovante: compDoc.comprovante,
        timestampComprovante: Number(compDoc.timestampComprovante) || Date.now(),
        dataEnvioComprovante: String(compDoc.dataEnvioComprovante || 'Recente'),
        role: 'player',
        is_admin: false,
        updatedAt: String(compDoc.updatedAt || new Date().toISOString()),
      });
    }
  }

  return Array.from(mapaUsuarios.values());
}

export async function buscarUsuarioNoSupabase(termoInput: string): Promise<any | null> {
  const rawTermo = String(termoInput || '').trim().toLowerCase();
  if (!rawTermo) return null;
  // Remove sufixo _timestamp caso venha do order_nsu da InfinitePay (ex: uuid_1791748000000)
  const termo = rawTermo.replace(/_\d{10,15}$/, '');
  const termoDoc = getJogadorDocId(termo);
  const rawTermoDoc = getJogadorDocId(rawTermo);
  const todos = await listarUsuariosDoSupabase();
  return (
    todos.find((u) => {
      const uEmail = String(u.email || '').trim().toLowerCase();
      const uId = String(u.id || '').trim().toLowerCase();
      const uUid = String(u.uid || '').trim().toLowerCase();
      const uDocId = String(u._docId || getJogadorDocId(uEmail)).trim().toLowerCase();
      const uIdDoc = getJogadorDocId(uId);
      const uUidDoc = getJogadorDocId(uUid);
      return (
        uEmail === termo ||
        uEmail === rawTermo ||
        uId === termo ||
        uId === rawTermo ||
        uUid === termo ||
        uUid === rawTermo ||
        uDocId === termo ||
        uDocId === rawTermo ||
        (termoDoc && (uDocId === termoDoc || uIdDoc === termoDoc || uUidDoc === termoDoc)) ||
        (rawTermoDoc && (uDocId === rawTermoDoc || uIdDoc === rawTermoDoc || uUidDoc === rawTermoDoc)) ||
        String(u.pix || '').trim().toLowerCase() === termo ||
        String(u.telefone || '').trim().toLowerCase() === termo ||
        String(u.nome || '').trim().toLowerCase() === termo
      );
    }) || null
  );
}

export async function upsertJogadorInDb(j: any, _isNovo?: boolean): Promise<void> {
  const email = String(j.email || '').trim().toLowerCase();
  if (!email) return;
  clearJogadorDeletedLocal(email, j._docId || j.id);

  let uuid = j.uid && isUuid(j.uid) ? String(j.uid) : isUuid(j.id) ? String(j.id) : stringToUuid(email);

  try {
    const { data: existingProf } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .limit(1);
    if (existingProf && existingProf[0]?.id) {
      uuid = String(existingProf[0].id);
    } else {
      const { data: allJog } = await supabase.from('jogadores').select('id,time_coracao');
      if (Array.isArray(allJog)) {
        for (const r of allJog) {
          if (typeof r?.time_coracao === 'string' && r.time_coracao.includes(email)) {
            try {
              const parsed = JSON.parse(r.time_coracao);
              if (String(parsed?.email || '').trim().toLowerCase() === email && r.id) {
                uuid = String(r.id);
                break;
              }
            } catch {}
          }
        }
      }
    }
  } catch {}

  const nome = String(j.nome || email.split('@')[0] || 'Jogador').trim().slice(0, 80);
  const pix = String(j.pix || j.chavePix || j.telefone || '').trim().slice(0, 120);
  const telefone = String(pix || j.telefone || '').trim().slice(0, 60);
  const isExplicitUnpaid =
    j.pagou === false ||
    j.aprovado === false ||
    j.status_pagamento === 'pendente' ||
    j.statusPagamento === 'PENDENTE' ||
    j.statusPagamento === 'RECUSADO' ||
    j.statusPagamento === 'EM_ANALISE' ||
    j.statusPagamento === 'PROCESSANDO_INFINITEPAY';

  const pagou = isExplicitUnpaid
    ? false
    : Boolean(
        j.pagou ||
          j.aprovado ||
          j.status_pagamento === 'pago' ||
          j.statusPagamento === 'APROVADO'
      );
  const statusPagamento =
    j.statusPagamento || (pagou ? 'APROVADO' : j.comprovante ? 'EM_ANALISE' : 'PENDENTE');
  const bolaoPagoId =
    pagou || statusPagamento === 'EM_ANALISE' || statusPagamento === 'PROCESSANDO_INFINITEPAY'
      ? String(j.bolaoPagoId || '').trim()
      : '';

  const fullMeta = {
    ...j,
    uid: uuid,
    id: uuid,
    _docId: j._docId || getJogadorDocId(email),
    nome,
    email,
    telefone,
    pix,
    chavePix: pix,
    pagou,
    aprovado: pagou,
    status_pagamento: pagou ? 'pago' : 'pendente',
    statusPagamento,
    bolaoPagoId,
    valorPago: pagou ? Number(j.valorPago) || VALOR_COTA : 0,
    dataAprovacao: pagou ? j.dataAprovacao || undefined : undefined,
    role: email === 'inhobahia29@gmail.com' ? 'admin' : j.role || 'player',
    is_admin: email === 'inhobahia29@gmail.com' ? true : Boolean(j.is_admin),
    updatedAt: new Date().toISOString(),
  };
  delete (fullMeta as any).removerComprovante;

  const compPagamentoUuid = stringToUuid(`comprovante_pag_${email}`);

  // 1. Grava primeiro o comprovante e a linha em jogadores para que quando o Realtime disparar já esteja 100% disponível
  if (j.removerComprovante === true) {
    await supabase.from('apostas').delete().eq('id', compPagamentoUuid);
  } else if (j.comprovante) {
    await supabase.from('apostas').upsert(
      {
        id: compPagamentoUuid,
        user_id: null,
        jogo_id: null,
        palpite: JSON.stringify({
          __type: 'comprovante_pagamento_jogador',
          email,
          nome,
          pix,
          telefone,
          comprovante: j.comprovante,
          timestampComprovante: j.timestampComprovante || Date.now(),
          dataEnvioComprovante: j.dataEnvioComprovante || 'Recente',
          statusPagamento,
          bolaoPagoId,
          updatedAt: new Date().toISOString(),
        }),
      },
      { onConflict: 'id' }
    );
  }

  await supabase.from('jogadores').upsert(
    {
      id: uuid,
      nome,
      whatsapp: pix || telefone || email || '00000000000',
      pagou,
      time_coracao: JSON.stringify(fullMeta),
    },
    { onConflict: 'id' }
  );

  await supabase.from('profiles').upsert(
    {
      id: uuid,
      nome,
      email,
      telefone,
    },
    { onConflict: 'id' }
  );

  pollingPausedUntil = 0;
  triggerListenersForCollection('jogadores');
}

export async function deleteJogadorFromDb(
  email: string,
  idsExtras?: string[],
  _nome?: string
): Promise<void> {
  const cleanEmail = String(email || '').trim().toLowerCase();
  markJogadorDeletedLocal(cleanEmail);
  if (Array.isArray(idsExtras)) {
    idsExtras.forEach((id) => markJogadorDeletedLocal(cleanEmail, id));
  }

  try {
    const idsToDelete = new Set<string>();
    if (cleanEmail) idsToDelete.add(stringToUuid(cleanEmail));
    if (Array.isArray(idsExtras)) {
      for (const id of idsExtras) {
        if (isUuid(id)) idsToDelete.add(id);
      }
    }

    if (cleanEmail) {
      const { data: existingProf } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', cleanEmail);
      if (Array.isArray(existingProf)) {
        for (const p of existingProf) {
          if (p?.id) idsToDelete.add(String(p.id));
        }
      }
    }

    for (const id of idsToDelete) {
      await Promise.all([
        supabase.from('apostas').delete().eq('user_id', id),
        supabase.from('jogadores').delete().eq('id', id),
        supabase.from('profiles').delete().eq('id', id),
      ]);
    }
    if (cleanEmail) {
      const depUuid = stringToUuid(`deposito_confirmado_${cleanEmail}`);
      await Promise.all([
        supabase.from('profiles').delete().ilike('email', cleanEmail),
        supabase.from('apostas').delete().eq('id', depUuid),
      ]);
    }
  } catch {}

  triggerListenersForCollection('jogadores');
  triggerListenersForCollection('depositos');
}

// ============================================================================
// JOGOS / PARTIDAS AO VIVO DA ESPN (SEM CACHE E SEM JOGOS FALSOS)
// ============================================================================
export const MENSAGEM_DATA_FIFA = 'DATA FIFA - SEM JOGOS HOJE - VOLTAMOS DIA 15/10';

export function toBrasilDateAndTime(dateObj: Date = new Date()): { isoDate: string; timeStr: string } {
  const brTime = new Date(dateObj.getTime() - 3 * 60 * 60 * 1000);
  const yyyy = brTime.getUTCFullYear();
  const mm = String(brTime.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(brTime.getUTCDate()).padStart(2, '0');
  const hh = String(brTime.getUTCHours()).padStart(2, '0');
  const min = String(brTime.getUTCMinutes()).padStart(2, '0');
  return {
    isoDate: `${yyyy}-${mm}-${dd}`,
    timeStr: `${hh}:${min}`,
  };
}

export function getHojeBrasilISO(): string {
  return toBrasilDateAndTime(new Date()).isoDate;
}

export function isDataFifaPause(_dateIso?: string): boolean {
  return false;
}

export function limparCacheJogosLocal(): void {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove = [
      'elite_jogos_v11',
      'espn_cache',
      'jogos_cache',
      'bolao_jogos_cache',
      'supabase_doc_jogos',
    ];
    for (const k of keysToRemove) {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    }
  } catch {}
}

// Limpa imediatamente qualquer cache antigo de jogos ao carregar o módulo
limparCacheJogosLocal();

function parseDataParaIsoDate(rawDate: string): string {
  const str = String(rawDate || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) {
    const mMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (mMatch) {
      return `${mMatch[3]}-${mMatch[2]}-${mMatch[1]}`;
    }
  }
  if (/^\d{2}\/\d{2}$/.test(str)) {
    const [d, m] = str.split('/');
    const y = new Date().getFullYear();
    return `${y}-${m}-${d}`;
  }
  return getHojeBrasilISO();
}

export async function sincronizarTimesEJogosIniciaisNoSupabase(): Promise<void> {
  if (!hasValidSupabaseKey()) return;

  try {
    limparCacheJogosLocal();
    // 1. Garante todos os times cadastrados no Supabase (via tabela apostas com __type = 'times_bolao')
    const timesUuid = stringToUuid('times_bolao_elite_serie_a');
    await supabase.from('apostas').upsert(
      {
        id: timesUuid,
        user_id: null,
        jogo_id: null,
        palpite: JSON.stringify({
          __type: 'times_bolao',
          times: TODOS_OS_TIMES_BOLAO,
          updatedAt: new Date().toISOString(),
        }),
      },
      { onConflict: 'id' }
    );

    // 2. Busca ao vivo na ESPN os jogos reais de hoje do Brasileirão e atualiza o placar ao vivo
    await sincronizarJogosDeHojeEspnComSupabase();
  } catch {}
}

function normalizarNomeTimeEspn(nome: string): string {
  const n = String(nome || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!n) return '';
  if (n.includes('vasco')) return 'vasco';
  if (n.includes('atletico') && (n.includes('mg') || n.includes('mineiro'))) return 'atletico mg';
  if ((n.includes('athletico') || n.includes('atletico')) && (n.includes('pr') || n.includes('paranaense'))) return 'athletico pr';
  if (n.includes('bragantino')) return 'bragantino';
  if (n.includes('flamengo')) return 'flamengo';
  if (n.includes('fluminense')) return 'fluminense';
  if (n.includes('palmeiras')) return 'palmeiras';
  if (n.includes('botafogo')) return 'botafogo';
  if (n.includes('corinthians')) return 'corinthians';
  if (n.includes('sao paulo')) return 'sao paulo';
  if (n.includes('santos')) return 'santos';
  if (n.includes('gremio')) return 'gremio';
  if (n.includes('internacional')) return 'internacional';
  if (n.includes('cruzeiro')) return 'cruzeiro';
  if (n.includes('bahia')) return 'bahia';
  if (n.includes('vitoria')) return 'vitoria';
  if (n.includes('fortaleza')) return 'fortaleza';
  if (n.includes('ceara')) return 'ceara';
  if (n.includes('sport')) return 'sport';
  if (n.includes('mirassol')) return 'mirassol';
  if (n.includes('coritiba')) return 'coritiba';
  if (n.includes('chapecoense')) return 'chapecoense';
  if (n.includes('remo')) return 'remo';
  return n;
}

export function correspondeJogoId(jogo: any, targetJogoId?: string): boolean {
  if (!jogo || !targetJogoId) return false;
  const target = String(targetJogoId).trim();
  if (!target) return false;
  const jId = String(jogo.id || '').trim();
  const jUuid = String(jogo.gameUuid || '').trim();
  const jEspnId = String(jogo.espnId || '').trim();
  if (jId === target || jUuid === target || jEspnId === target) return true;
  const targetUuid = isUuid(target) ? target : stringToUuid(target);
  if (jId === targetUuid || jUuid === targetUuid) return true;
  if (jId && (isUuid(jId) ? jId : stringToUuid(jId)) === targetUuid) return true;
  if (jEspnId && (isUuid(jEspnId) ? jEspnId : stringToUuid(jEspnId)) === targetUuid) return true;
  return false;
}

export function obterResultadoOficialJogo(j: any): 'CASA' | 'FORA' | 'EMPATE' | undefined {
  if (!j) return undefined;
  if (j.resultadoOficial === 'CASA' || j.resultadoOficial === 'FORA' || j.resultadoOficial === 'EMPATE') {
    return j.resultadoOficial;
  }
  if (j.encerrado && j.placarCasa !== undefined && j.placarFora !== undefined) {
    const gc = parseInt(String(j.placarCasa), 10);
    const gf = parseInt(String(j.placarFora), 10);
    if (!isNaN(gc) && !isNaN(gf)) {
      return gc > gf ? 'CASA' : gf > gc ? 'FORA' : 'EMPATE';
    }
  }
  return undefined;
}

export async function sincronizarJogosDeHojeEspnComSupabase(): Promise<any[]> {
  limparCacheJogosLocal();
  const hojeIso = getHojeBrasilISO();
  const todosJogosEspn = await buscarJogosRodadaEspn(hojeIso, true);
  const jogosHojeEspn = todosJogosEspn.filter((j) => !j.encerrado);

  if (!hasValidSupabaseKey()) return jogosHojeEspn;

  try {
    const [resJogos, resApostas] = await Promise.all([
      supabase.from('jogos').select('*'),
      supabase.from('apostas').select('*'),
    ]);
    const rowsJogos = Array.isArray(resJogos.data) ? resJogos.data : [];
    const rowsApostas = Array.isArray(resApostas.data) ? resApostas.data : [];
    const metaByUuid = new Map<string, any>();
    for (const a of rowsApostas) {
      const raw = String(a?.palpite || '').trim();
      if (raw.startsWith('{')) {
        try {
          const p = JSON.parse(raw);
          if (p && p.__type === 'jogo_meta') {
            const gUuid = String(a.jogo_id || p.gameUuid || stringToUuid(String(p.id || '')));
            if (gUuid) {
              metaByUuid.set(gUuid, p);
            }
          }
        } catch {}
      }
    }

    // Busca também os eventos das datas dos jogos já cadastrados no banco para manter placares finais e ranking disponíveis mesmo após virar o dia
    const datasExtras = Array.from(
      new Set(
        rowsJogos
          .map((r) => String(r.data_jogo || '').slice(0, 10))
          .filter((dt) => /^\d{4}-\d{2}-\d{2}$/.test(dt) && dt !== hojeIso)
      )
    );
    let catalogoEspnCompleto = [...todosJogosEspn];
    if (datasExtras.length > 0) {
      const listasExtras = await Promise.all(
        datasExtras.map((dt) => buscarJogosRodadaEspn(dt, true).catch(() => []))
      );
      for (const l of listasExtras) {
        if (Array.isArray(l)) {
          catalogoEspnCompleto = [...catalogoEspnCompleto, ...l];
        }
      }
    }

    if (jogosHojeEspn.length > 0 && rowsJogos.length === 0) {
      for (const item of jogosHojeEspn.slice(0, 10)) {
        await upsertJogoInDb({
          id: item.id,
          espnId: item.id,
          casa: item.time_casa || item.casa,
          fora: item.time_fora || item.fora,
          escudoCasa: item.escudoCasaUrl || buscarEscudoPadrao(item.time_casa || item.casa),
          escudoFora: item.escudoForaUrl || buscarEscudoPadrao(item.time_fora || item.fora),
          data: item.horario || '19:30',
          data_jogo: item.data || hojeIso,
          estadio: item.estadio || 'Brasileirão Série A',
          placarCasa: item.placar_casa,
          placarFora: item.placar_fora,
          aoVivo: item.aoVivo,
          encerrado: item.encerrado,
          tempoJogo: item.tempoJogo,
          statusDetalhe: item.status,
          resultadoOficial: item.resultadoOficial,
          publicado: true,
          bolaoId: 'bolao_rodada_espn',
          tituloBolao: 'Próximos Jogos • Brasileirão (ESPN)',
        });
      }
    } else if (catalogoEspnCompleto.length > 0 && rowsJogos.length > 0) {
      const paresNoBanco = new Set<string>();
      // Atualiza placar ao vivo, minuto e encerramento dos jogos correspondentes já presentes no bolão
      for (const r of rowsJogos) {
        const gId = String(r.id || '');
        const meta = metaByUuid.get(gId) || {};
        const casaNorm = normalizarNomeTimeEspn(meta.casa || r.time_casa || '');
        const foraNorm = normalizarNomeTimeEspn(meta.fora || r.time_fora || '');
        if (casaNorm && foraNorm) {
          paresNoBanco.add(`${casaNorm}__${foraNorm}`);
        }
        const matchEspn = catalogoEspnCompleto.find(
          (ev) =>
            normalizarNomeTimeEspn(ev.time_casa || ev.casa || '') === casaNorm &&
            normalizarNomeTimeEspn(ev.time_fora || ev.fora || '') === foraNorm
        );
        if (matchEspn) {
          const idPreservado =
            meta.espnId ||
            (meta.id && !isUuid(meta.id) ? meta.id : '') ||
            matchEspn.id ||
            meta.id ||
            gId;
          await upsertJogoInDb({
            ...meta,
            id: idPreservado,
            espnId: matchEspn.id || meta.espnId || undefined,
            gameUuid: gId,
            casa: meta.casa || r.time_casa,
            fora: meta.fora || r.time_fora,
            escudoCasa: meta.escudoCasa || matchEspn.escudoCasaUrl || buscarEscudoPadrao(meta.casa || r.time_casa),
            escudoFora: meta.escudoFora || matchEspn.escudoForaUrl || buscarEscudoPadrao(meta.fora || r.time_fora),
            data: matchEspn.horario || meta.data || '19:30',
            data_jogo: matchEspn.data || r.data_jogo || meta.data_jogo || hojeIso,
            estadio: matchEspn.estadio || meta.estadio || 'Brasileirão Série A',
            placarCasa: matchEspn.placar_casa,
            placarFora: matchEspn.placar_fora,
            aoVivo: Boolean(matchEspn.aoVivo),
            encerrado: Boolean(matchEspn.encerrado),
            tempoJogo: matchEspn.tempoJogo,
            statusDetalhe: matchEspn.status,
            resultadoOficial: matchEspn.resultadoOficial || meta.resultadoOficial,
            publicado: true,
          });
        }
      }

      // Se houver jogos AO VIVO agora na ESPN que ainda não estão no bolão (e há vaga até 10 jogos), adiciona automaticamente para rodar ao vivo
      const aoVivoFaltando = jogosHojeEspn.filter((ev) => {
        if (!ev.aoVivo) return false;
        const cNorm = normalizarNomeTimeEspn(ev.time_casa || ev.casa || '');
        const fNorm = normalizarNomeTimeEspn(ev.time_fora || ev.fora || '');
        return cNorm && fNorm && !paresNoBanco.has(`${cNorm}__${fNorm}`);
      });

      if (aoVivoFaltando.length > 0 && rowsJogos.length < 10) {
        const vagas = Math.max(0, 10 - rowsJogos.length);
        for (const item of aoVivoFaltando.slice(0, vagas)) {
          await upsertJogoInDb({
            id: item.id,
            espnId: item.id,
            casa: item.time_casa || item.casa,
            fora: item.time_fora || item.fora,
            escudoCasa: item.escudoCasaUrl || buscarEscudoPadrao(item.time_casa || item.casa),
            escudoFora: item.escudoForaUrl || buscarEscudoPadrao(item.time_fora || item.fora),
            data: item.horario || '19:30',
            data_jogo: item.data || hojeIso,
            estadio: item.estadio || 'Brasileirão Série A',
            placarCasa: item.placar_casa,
            placarFora: item.placar_fora,
            aoVivo: true,
            encerrado: false,
            tempoJogo: item.tempoJogo,
            statusDetalhe: item.status,
            resultadoOficial: undefined,
            publicado: true,
            bolaoId: 'bolao_rodada_espn',
            tituloBolao: 'Próximos Jogos • Brasileirão (ESPN)',
          });
        }
      }
    }

    triggerListenersForCollection('jogos');
  } catch {}

  return jogosHojeEspn;
}

export async function listarJogosDoSupabase(): Promise<any[]> {
  limparCacheJogosLocal();
  if (!hasValidSupabaseKey()) return [];

  const hojeIso = getHojeBrasilISO();
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

    const dataJogoRow = String(row.data_jogo || meta.data_jogo || '').slice(0, 10);
    const casa = String(meta.casa || row.time_casa || '').trim();
    const fora = String(meta.fora || row.time_fora || '').trim();
    if (!casa || !fora) continue;

    const espnId = String(meta.espnId || (meta.id && !isUuid(meta.id) ? meta.id : '') || '');
    const id = String(espnId || meta.id || gUuid);
    const escudoCasa = String(meta.escudoCasa || buscarEscudoPadrao(casa));
    const escudoFora = String(meta.escudoFora || buscarEscudoPadrao(fora));
    const placarCasa = meta.placarCasa ?? meta.placar_casa;
    const placarFora = meta.placarFora ?? meta.placar_fora;
    const encerrado = Boolean(meta.encerrado);
    const resCalculado = obterResultadoOficialJogo({
      resultadoOficial: meta.resultadoOficial,
      encerrado,
      placarCasa,
      placarFora,
    });

    // Todo jogo salvo na tabela 'jogos' do Supabase fica 100% disponível tanto no ADM quanto na Área do Jogador
    mapaJogos.set(gUuid, {
      ...meta,
      id,
      espnId: espnId || undefined,
      gameUuid: gUuid,
      casa,
      fora,
      escudoCasa,
      escudoFora,
      data: String(meta.data || meta.horario || row.data_jogo || '19:30'),
      data_jogo: dataJogoRow || hojeIso,
      estadio: String(meta.estadio || 'Brasileirão Série A'),
      placarCasa,
      placarFora,
      aoVivo: Boolean(meta.aoVivo),
      encerrado,
      tempoJogo: String(meta.tempoJogo || ''),
      statusDetalhe: String(meta.statusDetalhe || meta.status || ''),
      resultadoOficial: resCalculado,
      publicado: true,
      iniciadoManualAdm: Boolean(meta.iniciadoManualAdm),
      desbloqueadoManualAdm: Boolean(meta.desbloqueadoManualAdm),
      bolaoId: String(meta.bolaoId || 'bolao_1'),
      tituloBolao: String(meta.tituloBolao || 'Rodada Oficial Brasileirão Série A'),
      updatedAt: String(meta.updatedAt || row.created_at || new Date().toISOString()),
    });
  }

  return Array.from(mapaJogos.values());
}

export async function upsertJogoInDb(j: any): Promise<void> {
  limparCacheJogosLocal();
  const rawId = String(j.id || `jg_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  if (!rawId) return;

  const hojeIso = getHojeBrasilISO();
  const gameUuid = j.gameUuid && isUuid(j.gameUuid) ? String(j.gameUuid) : isUuid(rawId) ? rawId : stringToUuid(rawId);
  const espnId = String(j.espnId || (!isUuid(rawId) ? rawId : '') || '').trim() || undefined;
  const id = espnId || rawId;
  const casa = String(j.casa || j.time_casa || '').trim().slice(0, 60);
  const fora = String(j.fora || j.time_fora || '').trim().slice(0, 60);
  const escudoCasa = String(j.escudoCasa || buscarEscudoPadrao(casa)).trim();
  const escudoFora = String(j.escudoFora || buscarEscudoPadrao(fora)).trim();
  const data = String(j.data || j.horario || '19:30').slice(0, 30);
  const data_jogo = parseDataParaIsoDate(j.data_jogo || data || hojeIso);
  const estadio = String(j.estadio || j.campeonato || 'Estádio Principal').slice(0, 80);
  const publicado = true;
  const bolaoId = String(j.bolaoId || 'bolao_1').slice(0, 60);
  const tituloBolao = String(j.tituloBolao || 'Rodada Oficial Brasileirão').slice(0, 80);
  const placarCasa = j.placarCasa !== undefined ? j.placarCasa : j.placar_casa;
  const placarFora = j.placarFora !== undefined ? j.placarFora : j.placar_fora;
  const aoVivo = Boolean(j.aoVivo);
  const encerrado = Boolean(j.encerrado);
  const tempoJogo = String(j.tempoJogo || '');
  const statusDetalhe = String(j.statusDetalhe || j.status || '');
  const resultadoOficial = obterResultadoOficialJogo({
    resultadoOficial: j.resultadoOficial,
    encerrado,
    placarCasa,
    placarFora,
  });
  const iniciadoManualAdm = Boolean(j.iniciadoManualAdm);
  const desbloqueadoManualAdm = Boolean(j.desbloqueadoManualAdm);
  const updatedAt = new Date().toISOString();

  const fullJogoMeta = {
    __type: 'jogo_meta',
    id,
    espnId,
    gameUuid,
    casa,
    fora,
    escudoCasa,
    escudoFora,
    data,
    data_jogo,
    estadio,
    placarCasa,
    placarFora,
    aoVivo,
    encerrado,
    tempoJogo,
    statusDetalhe,
    resultadoOficial,
    iniciadoManualAdm,
    desbloqueadoManualAdm,
    publicado,
    bolaoId,
    tituloBolao,
    updatedAt,
  };

  await supabase.from('jogos').upsert(
    {
      id: gameUuid,
      time_casa: casa,
      time_fora: fora,
      data_jogo,
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
  limparCacheJogosLocal();
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
  escudo_casa?: string;
  escudo_fora?: string;
  data: string;
  horario: string;
  estadio?: string;
  status?: string;
  placar_casa?: string;
  placar_fora?: string;
  selecionado_admin?: boolean;
  adicionado_ao_bolao?: boolean;
}

export async function upsertJogoDisponivelInDb(_item: JogoDisponivelItem): Promise<void> {
  // Sem cache local ou de arquivo
}

// Busca jogos REAIS da API da ESPN (Brasileirão): se não houver ao vivo, retorna os próximos jogos ("EM BREVE"), sem nunca inventar jogos ou buscar jogos encerrados de dias anteriores
export async function buscarJogosRodadaEspn(
  dataAlvoIso?: string,
  incluirEncerradosDeHoje = false
): Promise<any[]> {
  limparCacheJogosLocal();
  const dataAlvo = (dataAlvoIso || getHojeBrasilISO()).trim();
  const ymdAlvoDireto = dataAlvo.slice(0, 10).replace(/-/g, '');
  const ESPN_SCOREBOARD_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/bra.1/scoreboard';

  try {
    // Busca simultaneamente o placar padrão e o placar específico da data do Brasil (evita perder jogos das 21h30 BRT após 00h00 UTC)
    const [resPadrao, resDataAlvo] = await Promise.all([
      fetch(ESPN_SCOREBOARD_URL, { method: 'GET', cache: 'no-store' }).catch(() => null),
      /^\d{8}$/.test(ymdAlvoDireto)
        ? fetch(`${ESPN_SCOREBOARD_URL}?dates=${encodeURIComponent(ymdAlvoDireto)}`, {
            method: 'GET',
            cache: 'no-store',
          }).catch(() => null)
        : Promise.resolve(null),
    ]);

    const jsonPadrao = resPadrao && resPadrao.ok ? await resPadrao.json().catch(() => null) : null;
    const jsonDataAlvo = resDataAlvo && resDataAlvo.ok ? await resDataAlvo.json().catch(() => null) : null;

    const json = jsonDataAlvo || jsonPadrao;
    if (!json) {
      return [];
    }

    let events: any[] = [
      ...(Array.isArray(jsonDataAlvo?.events) ? jsonDataAlvo.events : []),
      ...(Array.isArray(jsonPadrao?.events) ? jsonPadrao.events : []),
    ];

    // Busca APENAS as próximas datas da rodada no calendário da ESPN (sem nunca buscar datas anteriores)
    const calendarRaw: string[] = Array.isArray(jsonPadrao?.leagues?.[0]?.calendar)
      ? jsonPadrao.leagues[0].calendar
      : Array.isArray(json?.leagues?.[0]?.calendar)
      ? json.leagues[0].calendar
      : [];

    if (calendarRaw.length > 0 && events.length < 10) {
      const ymdAlvo = /^\d{8}$/.test(ymdAlvoDireto)
        ? ymdAlvoDireto
        : String(json?.day?.date || dataAlvo)
            .slice(0, 10)
            .replace(/-/g, '');
      const datasCalendario = calendarRaw
        .map((c) => String(c || '').slice(0, 10).replace(/-/g, ''))
        .filter((d) => /^\d{8}$/.test(d));

      const proximas = datasCalendario.filter((d) => d > ymdAlvo).slice(0, 3);

      const extras = await Promise.all(
        proximas.map((ymd) =>
          fetch(`${ESPN_SCOREBOARD_URL}?dates=${encodeURIComponent(ymd)}`, {
            method: 'GET',
            cache: 'no-store',
          })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
        )
      );

      for (const ex of extras) {
        if (Array.isArray(ex?.events)) {
          events = [...events, ...ex.events];
        }
      }
    }

    const vistos = new Set<string>();
    const lista: any[] = [];

    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      const evIdRaw = String(ev?.id || '');
      if (evIdRaw && vistos.has(evIdRaw)) continue;
      if (evIdRaw) vistos.add(evIdRaw);

      const comp = ev?.competitions?.[0];
      const competitors = comp?.competitors || [];
      const homeComp = competitors.find((c: any) => c.homeAway === 'home') || competitors[0];
      const awayComp = competitors.find((c: any) => c.homeAway === 'away') || competitors[1];

      const casa = String(homeComp?.team?.displayName || homeComp?.team?.name || '').trim();
      const fora = String(awayComp?.team?.displayName || awayComp?.team?.name || '').trim();
      if (!casa || !fora) continue;

      const rawDate = ev?.date || comp?.date || '';
      let horarioFormatado = '19:30';
      let dataFormatada = dataAlvo;

      if (rawDate) {
        const dt = new Date(rawDate);
        if (!isNaN(dt.getTime())) {
          const br = toBrasilDateAndTime(dt);
          dataFormatada = br.isoDate;
          horarioFormatado = br.timeStr;
        }
      }

      const estadio = String(comp?.venue?.fullName || 'Brasileirão Série A').trim();
      const state = String(comp?.status?.type?.state || ev?.status?.type?.state || 'pre').toLowerCase();
      const statusName = String(comp?.status?.type?.name || ev?.status?.type?.name || '').toUpperCase();
      const completed = Boolean(comp?.status?.type?.completed || state === 'post');
      const aoVivo = state === 'in';

      // Ignora jogos já encerrados exceto quando sincronizando o resultado final de jogos de hoje
      if (completed && (!incluirEncerradosDeHoje || dataFormatada !== dataAlvo)) {
        continue;
      }

      const displayClock = String(comp?.status?.displayClock || ev?.status?.displayClock || '').trim();
      const period = Number(comp?.status?.period || ev?.status?.period || 1);
      const rawShortDetail = String(
        comp?.status?.type?.shortDetail || comp?.status?.type?.detail || ''
      ).trim();

      const dataCurtaBr =
        /^\d{4}-\d{2}-\d{2}$/.test(dataFormatada)
          ? `${dataFormatada.slice(8, 10)}/${dataFormatada.slice(5, 7)}`
          : dataFormatada;

      let tempoJogoFormatado = '';
      let statusTexto = `EM BREVE • ${dataCurtaBr} às ${horarioFormatado}`;

      if (aoVivo) {
        if (
          statusName.includes('HALFTIME') ||
          /^ht$/i.test(rawShortDetail) ||
          /intervalo/i.test(rawShortDetail)
        ) {
          tempoJogoFormatado = 'INTERVALO';
          statusTexto = 'AO VIVO • INTERVALO';
        } else if (displayClock && displayClock !== "0'") {
          tempoJogoFormatado = `${displayClock} (${period >= 2 ? '2ºT' : '1ºT'})`;
          statusTexto = `AO VIVO • ${tempoJogoFormatado}`;
        } else {
          tempoJogoFormatado = rawShortDetail || 'Em andamento';
          statusTexto = `AO VIVO • ${tempoJogoFormatado}`;
        }
      } else if (completed) {
        tempoJogoFormatado = 'Encerrado';
        statusTexto = 'ENCERRADO';
      }

      const placarCasaStr = homeComp?.score !== undefined ? String(homeComp.score) : '0';
      const placarForaStr = awayComp?.score !== undefined ? String(awayComp.score) : '0';
      const golsCasaNum = parseInt(placarCasaStr, 10);
      const golsForaNum = parseInt(placarForaStr, 10);
      const resultadoOficial =
        completed && !isNaN(golsCasaNum) && !isNaN(golsForaNum)
          ? golsCasaNum > golsForaNum
            ? 'CASA'
            : golsForaNum > golsCasaNum
            ? 'FORA'
            : 'EMPATE'
          : undefined;

      const idEv = `espn_${ev?.id || `${dataFormatada}_${i}_${casa}_${fora}`}`.replace(
        /[^a-zA-Z0-9_-]/g,
        '_'
      );

      lista.push({
        id: idEv,
        time_casa: casa,
        time_fora: fora,
        casa,
        fora,
        campeonato: 'Brasileirão Série A',
        horario: horarioFormatado,
        data: dataFormatada,
        estadio,
        status: statusTexto,
        tempoJogo: tempoJogoFormatado,
        aoVivo,
        encerrado: completed,
        estadoPartida: state,
        placar_casa: placarCasaStr,
        placar_fora: placarForaStr,
        placarCasa: placarCasaStr,
        placarFora: placarForaStr,
        resultadoOficial,
        adicionado_ao_bolao: false,
        escudoCasaUrl: homeComp?.team?.logo || buscarEscudoPadrao(casa) || '',
        escudoForaUrl: awayComp?.team?.logo || buscarEscudoPadrao(fora) || '',
        origem: 'espn' as const,
      });
    }

    // Ordena priorizando jogos AO VIVO no topo, seguidos pelos próximos por data/horário
    lista.sort((a, b) => {
      if (a.aoVivo && !b.aoVivo) return -1;
      if (!a.aoVivo && b.aoVivo) return 1;
      const dtA = `${a.data || ''} ${a.horario || ''}`;
      const dtB = `${b.data || ''} ${b.horario || ''}`;
      return dtA.localeCompare(dtB);
    });

    return lista;
  } catch {
    return [];
  }
}

// ============================================================================
// PALPITES / APOSTAS NO SUPABASE (TABELA REAL: apostas) — RETENÇÃO DE 15 DIAS
// ============================================================================
export const PRAZO_RETENCAO_APOSTAS_DIAS = 15;
export const QUINZE_DIAS_APOSTAS_MS = PRAZO_RETENCAO_APOSTAS_DIAS * 24 * 60 * 60 * 1000;

export async function listarPalpitesDoSupabase(): Promise<any[]> {
  if (!hasValidSupabaseKey()) return [];

  const { data: rows } = await supabase.from('apostas').select('*');
  if (!Array.isArray(rows)) return [];

  const mapaPalpites = new Map<string, any>();
  const idsExpiradosParaApagar: string[] = [];
  const agoraMs = Date.now();

  for (const row of rows) {
    const rawPalpite = String(row?.palpite || '').trim();
    if (!rawPalpite) continue;

    if (rawPalpite.startsWith('{')) {
      try {
        const parsed = JSON.parse(rawPalpite);
        if (
          parsed.__type === 'jogo_meta' ||
          parsed.__type === 'config_bolao' ||
          parsed.__type === 'comprovante_premiacao' ||
          parsed.__type === 'comprovante_pagamento_jogador' ||
          parsed.__type === 'deposito_confirmado' ||
          parsed.__type === 'times_bolao' ||
          parsed.__type === 'historico_ranking_bolao' ||
          parsed.__type === 'integridade_sistema_bolao'
        ) {
          continue;
        }
        const jogadorEmail = String(parsed.jogadorEmail || '').trim().toLowerCase();
        const jogoId = String(parsed.jogoId || row.jogo_id || '');
        if (!jogadorEmail || !jogoId) continue;

        const updatedAtIso = String(parsed.updatedAt || row.created_at || new Date().toISOString());
        const tsFromIso = Date.parse(updatedAtIso);
        const timestampMs =
          Number(parsed.timestamp) > 0
            ? Number(parsed.timestamp)
            : !isNaN(tsFromIso) && tsFromIso > 0
            ? tsFromIso
            : agoraMs;

        // Se a aposta já completou mais de 15 dias, apaga automaticamente do banco de dados
        if (agoraMs - timestampMs > QUINZE_DIAS_APOSTAS_MS) {
          if (row?.id) {
            idsExpiradosParaApagar.push(String(row.id));
          }
          continue;
        }

        const key = `${jogadorEmail}_${jogoId}`;
        mapaPalpites.set(key, {
          id: parsed.id || key,
          jogadorEmail,
          jogoId,
          escolha: parsed.escolha || 'CASA',
          pago: Boolean(parsed.pago),
          bolaoPagoId: parsed.bolaoPagoId ? String(parsed.bolaoPagoId) : undefined,
          updatedAt: updatedAtIso,
          timestamp: timestampMs,
          dataAposta: parsed.dataAposta ? String(parsed.dataAposta) : undefined,
          casa: parsed.casa ? String(parsed.casa) : undefined,
          fora: parsed.fora ? String(parsed.fora) : undefined,
          escudoCasa: parsed.escudoCasa ? String(parsed.escudoCasa) : undefined,
          escudoFora: parsed.escudoFora ? String(parsed.escudoFora) : undefined,
          placarCasa: parsed.placarCasa ?? undefined,
          placarFora: parsed.placarFora ?? undefined,
          resultadoOficial: parsed.resultadoOficial || undefined,
          dataJogo: parsed.dataJogo ? String(parsed.dataJogo) : undefined,
          estadio: parsed.estadio ? String(parsed.estadio) : undefined,
          tituloBolao: parsed.tituloBolao ? String(parsed.tituloBolao) : undefined,
        });
      } catch {}
    }
  }

  if (idsExpiradosParaApagar.length > 0) {
    supabase
      .from('apostas')
      .delete()
      .in('id', idsExpiradosParaApagar)
      .then(() => {});
  }

  return Array.from(mapaPalpites.values());
}

export async function upsertPalpiteInDb(p: any): Promise<void> {
  const jogadorEmail = String(p.jogadorEmail || '').trim().toLowerCase();
  const jogoId = String(p.jogoId || '').trim();
  if (!jogadorEmail || !jogoId) return;

  const rawId = String(p.id || `${jogadorEmail}_${jogoId}`);
  const betUuid = stringToUuid(`palpite_${rawId}`);

  const updatedIso = p.updatedAt ? String(p.updatedAt) : new Date().toISOString();
  const parsedIsoMs = Date.parse(updatedIso);
  const tsMs =
    Number(p.timestamp) > 0
      ? Number(p.timestamp)
      : !isNaN(parsedIsoMs) && parsedIsoMs > 0
      ? parsedIsoMs
      : Date.now();

  const payload = {
    __type: 'palpite',
    id: rawId,
    jogadorEmail,
    jogoId,
    escolha: p.escolha || 'CASA',
    pago: Boolean(p.pago),
    bolaoPagoId: p.pago && p.bolaoPagoId ? String(p.bolaoPagoId) : '',
    timestamp: tsMs,
    dataAposta:
      p.dataAposta ||
      `${new Date(tsMs).toLocaleDateString('pt-BR')} às ${new Date(tsMs).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`,
    casa: p.casa || undefined,
    fora: p.fora || undefined,
    escudoCasa: p.escudoCasa || undefined,
    escudoFora: p.escudoFora || undefined,
    placarCasa: p.placarCasa ?? undefined,
    placarFora: p.placarFora ?? undefined,
    resultadoOficial: p.resultadoOficial || undefined,
    dataJogo: p.dataJogo || undefined,
    estadio: p.estadio || undefined,
    tituloBolao: p.tituloBolao || undefined,
    updatedAt: new Date().toISOString(),
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

export async function deletePalpiteFromDb(emailOrId: string, jogoId?: string): Promise<void> {
  const rawId = jogoId
    ? `${String(emailOrId || '').trim().toLowerCase()}_${String(jogoId).trim()}`
    : String(emailOrId || '').trim();
  if (!rawId) return;
  const betUuid = stringToUuid(`palpite_${rawId}`);

  try {
    await supabase.from('apostas').delete().eq('id', betUuid);
  } catch {}

  triggerListenersForCollection('palpites');
}

export async function migrarEmailJogadorNoSupabase(
  oldEmailRaw: string,
  novoJogador: any
): Promise<void> {
  const oldEmail = String(oldEmailRaw || '').trim().toLowerCase();
  const newEmail = String(novoJogador?.email || '').trim().toLowerCase();
  if (!newEmail) return;

  await upsertJogadorInDb(novoJogador);
  if (!oldEmail || oldEmail === newEmail) return;

  try {
    const { data: rowsApostas } = await supabase.from('apostas').select('*');
    if (Array.isArray(rowsApostas)) {
      for (const r of rowsApostas) {
        const raw = String(r?.palpite || '').trim();
        if (!raw.startsWith('{')) continue;
        try {
          const parsed = JSON.parse(raw);
          if (parsed.__type === 'palpite' && String(parsed.jogadorEmail || '').trim().toLowerCase() === oldEmail) {
            await supabase.from('apostas').delete().eq('id', r.id);
            await upsertPalpiteInDb({
              ...parsed,
              id: `${newEmail}_${parsed.jogoId}`,
              jogadorEmail: newEmail,
            });
          } else if (
            (parsed.__type === 'deposito_confirmado' || parsed.__type === 'comprovante_pagamento_jogador') &&
            String(parsed.email || '').trim().toLowerCase() === oldEmail
          ) {
            parsed.email = newEmail;
            parsed.nome = novoJogador.nome || parsed.nome;
            parsed.pix = novoJogador.pix || parsed.pix;
            parsed.telefone = novoJogador.telefone || novoJogador.pix || parsed.telefone;
            await supabase
              .from('apostas')
              .update({ palpite: JSON.stringify(parsed) })
              .eq('id', r.id);
          } else if (parsed.__type === 'historico_ranking_bolao' && Array.isArray(parsed.ranking)) {
            let changed = false;
            parsed.ranking = parsed.ranking.map((rk: any) => {
              if (String(rk?.email || '').trim().toLowerCase() === oldEmail) {
                changed = true;
                return {
                  ...rk,
                  email: newEmail,
                  nome: novoJogador.nome || rk.nome,
                  pix: novoJogador.pix || rk.pix,
                };
              }
              return rk;
            });
            if (changed) {
              await supabase
                .from('apostas')
                .update({ palpite: JSON.stringify(parsed) })
                .eq('id', r.id);
            }
          }
        } catch {}
      }
    }

    // Remove registros antigos duplicados em profiles/jogadores se o UUID mudou
    const oldUuid = stringToUuid(oldEmail);
    const newUuid = novoJogador.uid || novoJogador.id || stringToUuid(newEmail);
    if (oldUuid !== newUuid) {
      await Promise.all([
        supabase.from('profiles').delete().ilike('email', oldEmail),
        supabase.from('jogadores').delete().eq('id', oldUuid),
      ]);
    }
  } catch {}

  triggerAllListeners();
}

// ============================================================================
// TRANSPARÊNCIA: COMPROVANTES DE PREMIAÇÃO E CONFIGURAÇÕES GERAIS (via apostas)
// ============================================================================
export interface ComprovantePremiacaoItem {
  id: string;
  ganhadorNome: string;
  colocacao?: string;
  rodadaTitulo?: string;
  valorPago?: number;
  valorPremio?: number;
  chavePixGanhador?: string;
  descricao?: string;
  observacao?: string;
  imagemComprovante?: string;
  comprovanteUrl?: string;
  dataEnvio: string;
  timestamp?: number;
  createdAtMs?: number;
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
          ...parsed,
          id: String(parsed.id),
          ganhadorNome: String(parsed.ganhadorNome || 'Ganhador'),
          colocacao: String(parsed.colocacao || parsed.rodadaTitulo || '🥇 1º Lugar'),
          valorPago: Number(parsed.valorPago ?? parsed.valorPremio) || 0,
          descricao: String(parsed.descricao || parsed.observacao || ''),
          imagemComprovante: String(parsed.imagemComprovante || parsed.comprovanteUrl || ''),
          dataEnvio: String(parsed.dataEnvio || ''),
          timestamp: Number(parsed.timestamp ?? parsed.createdAtMs) || Date.now(),
        });
      }
    } catch {}
  }

  return lista.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

export async function upsertComprovantePremiacaoInDb(item: ComprovantePremiacaoItem): Promise<void> {
  const id = String(item.id || `comp_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  const compUuid = stringToUuid(`comprovante_${id}`);

  const payload = {
    __type: 'comprovante_premiacao',
    ...item,
    id,
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

// ============================================================================
// HISTÓRICO DE RANKINGS POR CADA BOLÃO RODADO (SALVO NO SUPABASE - TOP 3 + PARTIDAS)
// ============================================================================
export interface HistoricoRankingPartidaApostada {
  jogoId: string;
  casa: string;
  fora: string;
  escudoCasa?: string;
  escudoFora?: string;
  placarCasa?: string | number;
  placarFora?: string | number;
  escolha: 'CASA' | 'EMPATE' | 'FORA';
  resultadoOficial?: 'CASA' | 'EMPATE' | 'FORA';
  acertou: boolean;
  data?: string;
  estadio?: string;
}

export interface HistoricoRankingJogadorItem {
  posicao: number;
  nome: string;
  email: string;
  pix: string;
  pontos: number;
  totalApostas: number;
  isPago: boolean;
  premioEstimado: number;
  partidasApostadas?: HistoricoRankingPartidaApostada[];
}

export interface HistoricoRankingJogoItem {
  id: string;
  casa: string;
  fora: string;
  escudoCasa?: string;
  escudoFora?: string;
  placarCasa?: string | number;
  placarFora?: string | number;
  resultadoOficial?: 'CASA' | 'EMPATE' | 'FORA';
  data?: string;
  data_jogo?: string;
  estadio?: string;
  encerrado?: boolean;
}

export interface HistoricoRankingBolaoItem {
  id: string;
  bolaoId: string;
  tituloBolao: string;
  dataRodada: string;
  timestamp: number;
  valorCota: number;
  totalArrecadado: number;
  premioTotal80: number;
  premio1: number;
  premio2: number;
  premio3: number;
  totalParticipantes: number;
  totalPagos: number;
  totalJogos: number;
  totalJogosEncerrados: number;
  statusBolao?: 'EM_ANDAMENTO' | 'ENCERRADO' | 'ARQUIVADO';
  jogos: HistoricoRankingJogoItem[];
  ranking: HistoricoRankingJogadorItem[];
}

export async function listarHistoricoRankingsDoSupabase(): Promise<HistoricoRankingBolaoItem[]> {
  if (!hasValidSupabaseKey()) return [];

  const { data: rows } = await supabase.from('apostas').select('*');
  if (!Array.isArray(rows)) return [];

  const lista: HistoricoRankingBolaoItem[] = [];
  for (const row of rows) {
    const raw = String(row?.palpite || '').trim();
    if (!raw.startsWith('{')) continue;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.__type === 'historico_ranking_bolao' && parsed.id) {
        const rankingTop3 = Array.isArray(parsed.ranking) ? parsed.ranking.slice(0, 3) : [];
        lista.push({
          ...parsed,
          id: String(parsed.id),
          bolaoId: String(parsed.bolaoId || parsed.id),
          tituloBolao: String(parsed.tituloBolao || 'Bolão Rodado'),
          dataRodada: String(parsed.dataRodada || ''),
          timestamp: Number(parsed.timestamp) || Date.now(),
          valorCota: Number(parsed.valorCota) || 10,
          totalArrecadado: Number(parsed.totalArrecadado) || 0,
          premioTotal80: Number(parsed.premioTotal80) || 0,
          premio1: Number(parsed.premio1) || 0,
          premio2: Number(parsed.premio2) || 0,
          premio3: Number(parsed.premio3) || 0,
          totalParticipantes: Number(parsed.totalParticipantes) || 0,
          totalPagos: Number(parsed.totalPagos) || 0,
          totalJogos: Number(parsed.totalJogos) || 0,
          totalJogosEncerrados: Number(parsed.totalJogosEncerrados) || 0,
          statusBolao: parsed.statusBolao || 'ENCERRADO',
          jogos: Array.isArray(parsed.jogos) ? parsed.jogos : [],
          ranking: rankingTop3,
        });
      }
    } catch {}
  }

  return lista.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

export async function upsertHistoricoRankingBolaoInDb(item: HistoricoRankingBolaoItem): Promise<void> {
  const id = String(item.id || `hist_bolao_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  const histUuid = stringToUuid(`historico_ranking_${id}`);
  const rankingTop3 = Array.isArray(item.ranking) ? item.ranking.slice(0, 3) : [];

  const payload = {
    __type: 'historico_ranking_bolao',
    ...item,
    id,
    ranking: rankingTop3,
    statusBolao: item.statusBolao || 'ENCERRADO',
    updatedAt: new Date().toISOString(),
  };

  await supabase.from('apostas').upsert(
    {
      id: histUuid,
      user_id: null,
      jogo_id: null,
      palpite: JSON.stringify(payload),
    },
    { onConflict: 'id' }
  );

  triggerListenersForCollection('historico_rankings');
}

export async function deleteHistoricoRankingBolaoFromDb(id: string): Promise<void> {
  const cleanId = String(id || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  if (!cleanId) return;
  const histUuid = stringToUuid(`historico_ranking_${cleanId}`);

  try {
    await supabase.from('apostas').delete().eq('id', histUuid);
  } catch {}

  triggerListenersForCollection('historico_rankings');
}

const CONFIG_BOLAO_UUID = stringToUuid('config_bolao_elite_v1');
const INTEGRIDADE_VAULT_UUID = stringToUuid('integridade_sistema_bolao_v1');

export async function carregarConfigBolaoDoSupabase(): Promise<Record<string, any> | null> {
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
        writeSavedKeysToLocal({
          NEXT_PUBLIC_SUPABASE_URL: parsed.NEXT_PUBLIC_SUPABASE_URL || NEXT_PUBLIC_SUPABASE_URL,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY || NEXT_PUBLIC_SUPABASE_ANON_KEY,
          SUPABASE_REST_URL: parsed.SUPABASE_REST_URL || SUPABASE_DEFAULT_REST_URL,
          SUPABASE_SERVICE_ROLE_KEY: parsed.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY,
        });
        return parsed;
      }
    }
  } catch {}
  return null;
}

export async function saveConfigInDb(config: Record<string, any>): Promise<void> {
  try {
    const atual = (await carregarConfigBolaoDoSupabase()) || {};
    const merged = {
      ...PERMANENT_APP_INTEGRITY,
      ...atual,
      ...config,
      NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_REST_URL: SUPABASE_DEFAULT_REST_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      chavePix: CHAVE_PIX_ALEATORIA,
      pixAdm: CHAVE_PIX_ALEATORIA,
      __type: 'config_bolao',
      updatedAt: new Date().toISOString(),
    };
    writeSavedKeysToLocal({
      NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_REST_URL: SUPABASE_DEFAULT_REST_URL,
      SUPABASE_SERVICE_ROLE_KEY,
    });
    try {
      localStorage.setItem('bolao_config_cache_v1', JSON.stringify(merged));
    } catch {}
    await Promise.all([
      supabase.from('apostas').upsert(
        {
          id: CONFIG_BOLAO_UUID,
          user_id: null,
          jogo_id: null,
          palpite: JSON.stringify(merged),
        },
        { onConflict: 'id' }
      ),
      supabase.from('apostas').upsert(
        {
          id: INTEGRIDADE_VAULT_UUID,
          user_id: null,
          jogo_id: null,
          palpite: JSON.stringify({
            __type: 'integridade_sistema_bolao',
            keys: {
              NEXT_PUBLIC_SUPABASE_URL,
              NEXT_PUBLIC_SUPABASE_ANON_KEY,
              SUPABASE_REST_URL: SUPABASE_DEFAULT_REST_URL,
              SUPABASE_SERVICE_ROLE_KEY,
            },
            appIntegrity: PERMANENT_APP_INTEGRITY,
            configSnapshot: merged,
            updatedAt: new Date().toISOString(),
          }),
        },
        { onConflict: 'id' }
      ),
    ]);
    triggerListenersForCollection('config');
  } catch {}
}

export async function inicializarConfigAdminInDb(emailAdmin?: string): Promise<void> {
  const cleanEmail = String(emailAdmin || PERMANENT_APP_INTEGRITY.adminEmail).trim().toLowerCase();
  if (!cleanEmail) return;
  await saveConfigInDb({
    adminEmail: cleanEmail,
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_REST_URL: SUPABASE_DEFAULT_REST_URL,
    SUPABASE_SERVICE_ROLE_KEY,
  });
  await sincronizarTimesEJogosIniciaisNoSupabase();
}

export async function sincronizarIntegridadeCompletaNoSupabase(): Promise<void> {
  if (!hasValidSupabaseKey()) return;
  try {
    // 1. Garante que as chaves e configurações de integridade estejam gravadas no Supabase e no cache local
    const remoteCfg = await carregarConfigBolaoDoSupabase();
    let localCfg: Record<string, any> = {};
    try {
      const rawCfg =
        typeof localStorage !== 'undefined'
          ? localStorage.getItem('elite_config_v11') || localStorage.getItem('bolao_config_cache_v1')
          : null;
      if (rawCfg) localCfg = JSON.parse(rawCfg) || {};
    } catch {}

    await saveConfigInDb({
      ...localCfg,
      ...(remoteCfg || {}),
      adminEmail: PERMANENT_APP_INTEGRITY.adminEmail,
      NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_REST_URL: SUPABASE_DEFAULT_REST_URL,
      SUPABASE_SERVICE_ROLE_KEY,
    });

    if (typeof localStorage === 'undefined') return;

    // 2. Sincroniza histórico de rankings (Top 3 + partidas) entre localStorage e Supabase
    const remoteHist = await listarHistoricoRankingsDoSupabase();
    const remoteHistIds = new Set(remoteHist.map((h) => h.id));
    try {
      const rawLocalHist = localStorage.getItem('elite_historico_rankings_v11');
      if (rawLocalHist) {
        const localHist = JSON.parse(rawLocalHist);
        if (Array.isArray(localHist)) {
          for (const item of localHist) {
            if (item && item.id && !remoteHistIds.has(item.id)) {
              await upsertHistoricoRankingBolaoInDb(item);
            }
          }
        }
      }
    } catch {}

    // 3. Sincroniza comprovantes de premiação entre localStorage e Supabase
    const remotePrem = await listarComprovantesPremiacaoDoSupabase();
    const remotePremIds = new Set(remotePrem.map((c) => c.id));
    try {
      const rawLocalPrem = localStorage.getItem('elite_comprovantes_premiacao_v11');
      if (rawLocalPrem) {
        const localPrem = JSON.parse(rawLocalPrem);
        if (Array.isArray(localPrem)) {
          for (const item of localPrem) {
            if (item && item.id && !remotePremIds.has(item.id)) {
              await upsertComprovantePremiacaoInDb(item);
            }
          }
        }
      }
    } catch {}

    // 4. Sincroniza palpites locais não enviados com o Supabase
    const remotePalpites = await listarPalpitesDoSupabase();
    const remotePalpiteIds = new Set(remotePalpites.map((p) => p.id));
    try {
      const rawLocalPalp = localStorage.getItem('elite_palpites_v11');
      if (rawLocalPalp) {
        const localPalp = JSON.parse(rawLocalPalp);
        if (Array.isArray(localPalp)) {
          for (const p of localPalp) {
            if (p && p.id && !remotePalpiteIds.has(p.id) && !isJogadorDeletedLocal(p.jogadorEmail)) {
              await upsertPalpiteInDb(p);
            }
          }
        }
      }
    } catch {}
  } catch {}
}

if (typeof window !== 'undefined') {
  setTimeout(() => {
    sincronizarIntegridadeCompletaNoSupabase().catch(() => {});
  }, 500);
}

export async function listarDepositosDoSupabase(): Promise<any[]> {
  if (!hasValidSupabaseKey()) return [];
  try {
    const [{ data: rowsApostas }, todosUsuarios] = await Promise.all([
      supabase.from('apostas').select('*'),
      listarUsuariosDoSupabase(),
    ]);
    const mapa = new Map<string, any>();

    if (Array.isArray(rowsApostas)) {
      for (const row of rowsApostas) {
        const raw = String(row?.palpite || '').trim();
        if (!raw.startsWith('{')) continue;
        try {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.__type === 'deposito_confirmado') {
            const key = String(parsed.email || parsed.userId || parsed.id || row.id).trim().toLowerCase();
            if (key) {
              mapa.set(key, {
                ...parsed,
                id: String(parsed.id || parsed.userId || row.id),
                userId: String(parsed.userId || parsed.id || row.id),
                status: parsed.status || 'CONFIRMADO',
              });
            }
          }
        } catch {}
      }
    }

    for (const u of todosUsuarios) {
      if (u.pagou || u.aprovado || u.status_pagamento === 'pago' || u.statusPagamento === 'APROVADO') {
        const key = String(u.email || u.id || '').trim().toLowerCase();
        if (key && !mapa.has(key)) {
          mapa.set(key, {
            id: String(u.id || u.uid || key),
            userId: String(u.id || u.uid || key),
            nome: u.nome || 'Jogador',
            email: u.email || '',
            valor: Number(u.valorPago) || VALOR_COTA,
            status: 'CONFIRMADO',
            bolaoPagoId: String(u.bolaoPagoId || ''),
            createdAt: u.updatedAt || new Date().toISOString(),
          });
        }
      }
    }

    return Array.from(mapa.values());
  } catch {
    return [];
  }
}

export async function upsertDepositoInDb(dep: any): Promise<void> {
  if (!hasValidSupabaseKey() || !dep) return;
  try {
    const email = String(dep.email || '').trim().toLowerCase();
    const userId = String(dep.userId || dep.id || (email ? stringToUuid(email) : '')).trim();
    if (!userId && !email) return;
    const depUuid = stringToUuid(`deposito_confirmado_${email || userId}`);
    await supabase.from('apostas').upsert(
      {
        id: depUuid,
        user_id: null,
        jogo_id: null,
        palpite: JSON.stringify({
          __type: 'deposito_confirmado',
          ...dep,
          id: userId || depUuid,
          userId: userId || depUuid,
          email,
          status: dep.status || 'CONFIRMADO',
          updatedAt: new Date().toISOString(),
        }),
      },
      { onConflict: 'id' }
    );
    triggerListenersForCollection('depositos');
  } catch {}
}

export async function deleteDepositoFromDb(emailOuId: string): Promise<void> {
  if (!hasValidSupabaseKey() || !emailOuId) return;
  try {
    const clean = String(emailOuId || '').trim().toLowerCase();
    const depUuid = stringToUuid(`deposito_confirmado_${clean}`);
    await supabase.from('apostas').delete().eq('id', depUuid);
    triggerListenersForCollection('depositos');
  } catch {}
}

export async function registrarDepositoConfirmadoInDb(
  jogadorOuParams: any,
  valorOpcional?: number,
  bolaoPagoIdOpcional?: string
): Promise<any | null> {
  const termoBusca = String(
    jogadorOuParams?.email || jogadorOuParams?.id || jogadorOuParams?.uid || jogadorOuParams?._docId || ''
  )
    .trim()
    .toLowerCase();
  if (!termoBusca) return null;

  const [existente, cfgAtual] = await Promise.all([
    buscarUsuarioNoSupabase(termoBusca),
    carregarConfigBolaoDoSupabase().catch(() => null),
  ]);

  const cleanEmail = String(
    jogadorOuParams?.email || existente?.email || (termoBusca.includes('@') ? termoBusca : '')
  )
    .trim()
    .toLowerCase();
  if (!cleanEmail) return null;

  const encerrados = new Set<string>(
    Array.isArray(cfgAtual?.boloesEncerradosIds) ? cfgAtual.boloesEncerradosIds : []
  );
  const cicloAtivoCfg = String(cfgAtual?.cicloBolaoAtivoId || '').trim();
  const candidatoCiclo = String(
    bolaoPagoIdOpcional || jogadorOuParams?.bolaoPagoId || cicloAtivoCfg || existente?.bolaoPagoId || 'ciclo_bolao_v2_ativo'
  ).trim();
  const bolaoPagoId =
    cicloAtivoCfg && (!candidatoCiclo || encerrados.has(candidatoCiclo))
      ? cicloAtivoCfg
      : candidatoCiclo;

  const valorFinal =
    Number(valorOpcional ?? jogadorOuParams?.valorPago ?? jogadorOuParams?.valor ?? cfgAtual?.valorCota ?? cfgAtual?.valor) ||
    VALOR_COTA;

  const horaFormatada = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const agoraIso = new Date().toISOString();

  const dadosConfirmados = {
    ...(existente || {}),
    ...(jogadorOuParams || {}),
    email: cleanEmail,
    pagou: true,
    aprovado: true,
    status_pagamento: 'pago',
    statusPagamento: 'APROVADO',
    metodoPagamento: jogadorOuParams?.metodoPagamento || 'INFINITEPAY',
    bolaoPagoId,
    valorPago: valorFinal,
    dataAprovacao: jogadorOuParams?.dataAprovacao || horaFormatada,
    aprovado_em: agoraIso,
    timestampDeposito: Date.now(),
  };

  await upsertJogadorInDb(dadosConfirmados);

  await upsertDepositoInDb({
    id: dadosConfirmados.id || dadosConfirmados.uid || stringToUuid(cleanEmail),
    userId: dadosConfirmados.id || dadosConfirmados.uid || stringToUuid(cleanEmail),
    nome: dadosConfirmados.nome || cleanEmail.split('@')[0] || 'Jogador',
    email: cleanEmail,
    valor: valorFinal,
    status: 'CONFIRMADO',
    bolaoPagoId,
    chaveDestino: CHAVE_PIX_ALEATORIA,
    createdAt: agoraIso,
  });

  // Marca automaticamente todos os palpites deste jogador como pagos no ciclo atual
  try {
    const todosPalpites = await listarPalpitesDoSupabase();
    const palpitesJogador = todosPalpites.filter(
      (p) => String(p.jogadorEmail || '').trim().toLowerCase() === cleanEmail
    );
    for (const p of palpitesJogador) {
      if (!p.pago || p.bolaoPagoId !== bolaoPagoId) {
        await upsertPalpiteInDb({
          ...p,
          pago: true,
          bolaoPagoId,
        });
      }
    }
  } catch {}

  pollingPausedUntil = 0;
  triggerAllListeners();
  return dadosConfirmados;
}

// Zera o saldo e remove todos os participantes da lista de depositantes após o término da rodada do bolão
export async function resetarPagamentosDaRodadaNoSupabase(
  novoCicloBolaoId?: string,
  boloesEncerradosLista?: string[]
): Promise<void> {
  if (!hasValidSupabaseKey()) return;

  try {
    if (novoCicloBolaoId) {
      const cfgAtual = (await carregarConfigBolaoDoSupabase()) || {};
      const encerradosAtuais = Array.isArray(cfgAtual.boloesEncerradosIds)
        ? cfgAtual.boloesEncerradosIds
        : [];
      const novosEncerrados = Array.from(
        new Set([...encerradosAtuais, ...(boloesEncerradosLista || [])].filter(Boolean))
      );
      await saveConfigInDb({
        ...cfgAtual,
        cicloBolaoAtivoId: novoCicloBolaoId,
        boloesEncerradosIds: novosEncerrados,
        ultimoResetFinanceiroEm: Date.now(),
      });
    }

    // Remove registros de depósitos confirmados da rodada anterior
    try {
      const { data: rowsApostas } = await supabase.from('apostas').select('id,palpite');
      if (Array.isArray(rowsApostas)) {
        const idsDep: string[] = [];
        for (const r of rowsApostas) {
          if (String(r?.palpite || '').includes('"__type":"deposito_confirmado"')) {
            idsDep.push(String(r.id));
          }
        }
        if (idsDep.length > 0) {
          await supabase.from('apostas').delete().in('id', idsDep);
        }
      }
    } catch {}

    const todosUsuarios = await listarUsuariosDoSupabase();
    for (const u of todosUsuarios) {
      if (
        u.pagou ||
        u.aprovado ||
        u.status_pagamento === 'pago' ||
        u.statusPagamento === 'APROVADO' ||
        u.bolaoPagoId
      ) {
        await upsertJogadorInDb({
          ...u,
          pagou: false,
          aprovado: false,
          status_pagamento: 'pendente',
          statusPagamento: u.statusPagamento === 'EM_ANALISE' ? 'EM_ANALISE' : 'PENDENTE',
          bolaoPagoId: '',
          valorPago: 0,
          dataAprovacao: undefined,
          aprovado_em: undefined,
        });
      }
    }

    const todosPalpites = await listarPalpitesDoSupabase();
    for (const p of todosPalpites) {
      if (p.pago || p.bolaoPagoId) {
        await upsertPalpiteInDb({
          ...p,
          pago: false,
          bolaoPagoId: '',
        });
      }
    }

    triggerListenersForCollection('jogadores');
    triggerListenersForCollection('palpites');
    triggerListenersForCollection('depositos');
    triggerListenersForCollection('config');
  } catch {}
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
  if (ref.collectionName === 'historico_rankings') {
    await upsertHistoricoRankingBolaoInDb({ ...data, id: data?.id || ref.id });
    return;
  }
  if (ref.collectionName === 'depositos') {
    await upsertDepositoInDb({ ...data, id: data?.id || ref.id });
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
let pollingPausedUntil = 0;

export function pausarPollingTemporariamente(ms = 25000): void {
  pollingPausedUntil = Date.now() + ms;
}

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
    } else if (target.collectionName === 'depositos') {
      items = await listarDepositosDoSupabase();
    } else if (target.collectionName === 'comprovantes_premiacao') {
      items = await listarComprovantesPremiacaoDoSupabase();
    } else if (target.collectionName === 'historico_rankings') {
      items = await listarHistoricoRankingsDoSupabase();
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
      if (Date.now() < pollingPausedUntil) return;
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
          if (Date.now() < pollingPausedUntil) return;
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

export async function compressImageToDataUrl(
  file: File,
  maxWidth = 680,
  quality = 0.65
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
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          let compressed = canvas.toDataURL('image/jpeg', quality);
          if (compressed.length > 140000) {
            const w2 = Math.min(width, 480);
            const h2 = Math.round((height * w2) / width);
            const c2 = document.createElement('canvas');
            c2.width = w2;
            c2.height = h2;
            const ctx2 = c2.getContext('2d');
            if (ctx2) {
              ctx2.fillStyle = '#FFFFFF';
              ctx2.fillRect(0, 0, w2, h2);
              ctx2.drawImage(img, 0, 0, w2, h2);
              compressed = c2.toDataURL('image/jpeg', 0.55);
            }
          }
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
