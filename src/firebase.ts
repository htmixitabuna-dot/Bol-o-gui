import firebaseConfig from '../firebase-applet-config.json';

const PROJECT_ID = firebaseConfig.projectId || 'gen-lang-client-0929605804';
const DATABASE_ID = firebaseConfig.firestoreDatabaseId || 'ai-studio-bologui-41191dbc-bc23-4859-bc28-074d5c8a833c';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;

export const VALOR_COTA = 10;
export const CHAVE_PIX_ALEATORIA = 'f0e74d2a-d610-4b76-842e-8b7e1a08047d';

export function gerarPayloadPix(chave: string, valor: number, merchant: string, city: string): string {
  const formatar = (id: string, val: string) => id + String(val.length).padStart(2, '0') + val;
  const gui = formatar("00", "BR.GOV.BCB.PIX");
  const chavePix = formatar("01", chave);
  const merchantAccount = formatar("26", gui + chavePix);
  const valorNum = Number(valor) || 10;
  const valorStr = valorNum.toFixed(2);
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

function getCachedConfigDoc(): Record<string, any> {
  if (typeof window !== 'undefined') {
    try {
      const cachedBolao = localStorage.getItem('firestore_doc_config/bolao');
      if (cachedBolao) {
        const parsed = JSON.parse(cachedBolao);
        const val = Number(parsed?.valorCota ?? parsed?.valor ?? parsed?.precoCota);
        if (!isNaN(val) && val > 0) {
          return { ...parsed, valorCota: val, valor: val, precoCota: val };
        }
      }
      const eliteCfg = localStorage.getItem('elite_config_v11');
      if (eliteCfg) {
        const parsed = JSON.parse(eliteCfg);
        const val = Number(parsed?.valorCota ?? parsed?.valor ?? parsed?.precoCota);
        if (!isNaN(val) && val > 0) {
          return {
            valorCota: val,
            precoCota: val,
            valor: val,
            linkPagamentoInfinitePay: parsed.linkPagamentoInfinitePay || '',
            chavePix: parsed.chavePix || CHAVE_PIX_ALEATORIA,
            nomePix: parsed.nomePix || 'IRAILSON DA SILVA',
            cidadePix: parsed.cidadePix || 'ITABUNA',
            pixAdm: parsed.pixAdm || CHAVE_PIX_ALEATORIA,
          };
        }
      }
    } catch {
      // ignore
    }
  }
  return {
    valorCota: VALOR_COTA,
    precoCota: VALOR_COTA,
    valor: VALOR_COTA,
    linkPagamentoInfinitePay: '',
    chavePix: CHAVE_PIX_ALEATORIA,
    nomePix: 'IRAILSON DA SILVA',
    cidadePix: 'ITABUNA',
    pixAdm: CHAVE_PIX_ALEATORIA,
  };
}

function setCachedConfigDoc(data: Record<string, any>, pendingLocal = false) {
  if (typeof window !== 'undefined') {
    try {
      const val = Number(data?.valorCota ?? data?.valor ?? data?.precoCota) || VALOR_COTA;
      const normalized = {
        ...data,
        valorCota: val,
        valor: val,
        precoCota: val,
        linkPagamentoInfinitePay: String(data?.linkPagamentoInfinitePay ?? '').trim(),
        _pendingLocal: pendingLocal,
      };
      localStorage.setItem('firestore_doc_config/bolao', JSON.stringify(normalized));
      localStorage.setItem('firestore_doc_config/bolao_config', JSON.stringify(normalized));
    } catch {
      // ignore
    }
  }
}

export const db = { projectId: PROJECT_ID, databaseId: DATABASE_ID };
export const auth: { currentUser: { uid: string; email?: string; displayName?: string } } = {
  currentUser: {
    uid: 'inho_jogador',
    email: 'inhobahia29@gmail.com',
    displayName: 'Inho',
  },
};

export function syncAuthCurrentUser(u: any) {
  if (!u) return;
  const rawId = u.uid || u.id || u.email || u.nome || 'inho_jogador';
  const uid =
    String(rawId)
      .trim()
      .toLowerCase()
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 90) || 'inho_jogador';
  auth.currentUser = {
    uid,
    email: u.email || 'inhobahia29@gmail.com',
    displayName: u.nome || 'Inho',
  };
}

export function serverTimestamp(): string {
  return new Date().toISOString();
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Notice: ', JSON.stringify(errInfo));
}

// Helpers para serializar e desserializar documentos da REST API do Firestore
function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fromFirestoreValue(field: any): any {
  if (!field || typeof field !== 'object') return undefined;
  if ('stringValue' in field) return field.stringValue;
  if ('booleanValue' in field) return Boolean(field.booleanValue);
  if ('integerValue' in field) return Number(field.integerValue);
  if ('doubleValue' in field) return Number(field.doubleValue);
  if ('nullValue' in field) return null;
  if ('timestampValue' in field) return field.timestampValue;
  if ('arrayValue' in field) {
    const vals = field.arrayValue?.values || [];
    return vals.map(fromFirestoreValue);
  }
  if ('mapValue' in field) {
    return fromFirestoreFields(field.mapValue?.fields || {});
  }
  return undefined;
}

function fromFirestoreFields(fields: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  if (!fields) return out;
  for (const [k, v] of Object.entries(fields)) {
    out[k] = fromFirestoreValue(v);
  }
  return out;
}

export interface CollectionRef {
  type: 'collection';
  path: string;
}

export interface DocRef {
  type: 'doc';
  path: string;
  id: string;
}

export function collection(_db: any, colPath: string): CollectionRef {
  return { type: 'collection', path: colPath.replace(/^\/+|\/+$/g, '') };
}

export function doc(_db: any, ...segments: string[]): DocRef {
  const clean = segments.map((s) => String(s || '').replace(/^\/+|\/+$/g, '')).filter(Boolean);
  const fullPath = clean.join('/');
  const id = clean[clean.length - 1] || '';
  return { type: 'doc', path: fullPath, id };
}

export async function getDoc(ref: DocRef): Promise<{
  id: string;
  exists: () => boolean;
  data: () => any;
}> {
  const isConfig = ref.path.startsWith('config/');
  try {
    const resp = await fetch(`${BASE_URL}/${ref.path}`);
    if (resp.status === 404) {
      if (isConfig) {
        const cached = getCachedConfigDoc();
        return {
          id: ref.id,
          exists: () => true,
          data: () => cached,
        };
      }
      return {
        id: ref.id,
        exists: () => false,
        data: () => undefined,
      };
    }
    if (!resp.ok) {
      if (isConfig) {
        const cached = getCachedConfigDoc();
        return {
          id: ref.id,
          exists: () => true,
          data: () => cached,
        };
      }
      return {
        id: ref.id,
        exists: () => false,
        data: () => undefined,
      };
    }
    const raw = await resp.json();
    const parsed = fromFirestoreFields(raw?.fields || {});
    if (isConfig) {
      const cached = getCachedConfigDoc();
      if (cached._pendingLocal) {
        return {
          id: ref.id,
          exists: () => true,
          data: () => cached,
        };
      }
      const serverVal = Number(parsed?.valorCota ?? parsed?.valor ?? parsed?.precoCota);
      const finalData =
        !isNaN(serverVal) && serverVal > 0
          ? { ...cached, ...parsed, valorCota: serverVal, valor: serverVal, precoCota: serverVal }
          : cached;
      setCachedConfigDoc(finalData, false);
      return {
        id: ref.id,
        exists: () => true,
        data: () => finalData,
      };
    }
    return {
      id: ref.id,
      exists: () => Boolean(raw && raw.fields),
      data: () => parsed,
    };
  } catch {
    if (isConfig) {
      const cached = getCachedConfigDoc();
      return {
        id: ref.id,
        exists: () => true,
        data: () => cached,
      };
    }
    return {
      id: ref.id,
      exists: () => false,
      data: () => undefined,
    };
  }
}

export async function getDocFromServer(ref: DocRef) {
  return getDoc(ref);
}

export async function setDoc(ref: DocRef, data: Record<string, any>): Promise<void> {
  if (ref.path.startsWith('config/')) {
    setCachedConfigDoc(data, true);
  }
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined && !k.startsWith('_')) {
      fields[k] = toFirestoreValue(v);
    }
  }
  const resp = await fetch(`${BASE_URL}/${ref.path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`Firestore PATCH ${ref.path} failed (${resp.status}): ${txt}`);
  }
  if (ref.path.startsWith('config/')) {
    setCachedConfigDoc(data, false);
  }
}

export async function deleteDoc(ref: DocRef): Promise<void> {
  const resp = await fetch(`${BASE_URL}/${ref.path}`, {
    method: 'DELETE',
  });
  if (!resp.ok && resp.status !== 404) {
    throw new Error(`Firestore DELETE ${ref.path} failed (${resp.status})`);
  }
}

// Listeners ativos para notificar imediatamente após escritas locais + polling leve
const activeListeners = new Set<() => void>();

function triggerAllListeners() {
  activeListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // ignore
    }
  });
}

export function onSnapshot(
  ref: CollectionRef | DocRef,
  onNext: (snap: any) => void,
  onError?: (err: Error) => void
): () => void {
  let cancelled = false;
  let lastHash = '';

  const poll = async () => {
    if (cancelled) return;
    try {
      if (ref.type === 'doc') {
        const snap = await getDoc(ref);
        if (cancelled) return;
        const hash = JSON.stringify({ e: snap.exists(), d: snap.data() });
        if (hash !== lastHash) {
          lastHash = hash;
          onNext(snap);
        }
      } else {
        const resp = await fetch(`${BASE_URL}:runQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            structuredQuery: {
              from: [{ collectionId: ref.path }],
            },
          }),
        });
        if (!resp.ok) {
          return;
        }
        const raw = await resp.json();
        if (cancelled) return;
        const rows = Array.isArray(raw) ? raw : [];
        const docs = rows
          .filter((r: any) => r && r.document)
          .map((r: any) => {
            const d = r.document;
            const nameParts = String(d?.name || '').split('/');
            const docId = nameParts[nameParts.length - 1] || '';
            const parsed = fromFirestoreFields(d?.fields || {});
            return {
              id: docId,
              exists: () => true,
              data: () => ({ ...parsed, _docId: docId }),
            };
          });
        const hash = JSON.stringify(docs.map((x: any) => ({ id: x.id, d: x.data() })));
        if (hash !== lastHash) {
          lastHash = hash;
          onNext({
            docs,
            size: docs.length,
            empty: docs.length === 0,
            forEach: (cb: (docSnap: any) => void) => {
              docs.forEach(cb);
            },
          });
        }
      }
    } catch (err: any) {
      if (!cancelled && onError) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  };

  poll();
  activeListeners.add(poll);
  const timer = setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    poll();
  }, 15000);

  return () => {
    cancelled = true;
    activeListeners.delete(poll);
    clearInterval(timer);
  };
}

export function getJogadorDocId(email: string): string {
  const cleaned = (email || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 90);
  return cleaned || 'jogador_anonimo';
}

export function getPalpiteDocId(email: string, jogoId: string): string {
  const jId = (jogoId || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32);
  return `${getJogadorDocId(email)}_${jId}`;
}

function getDeletedSet(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem('elite_deleted_jogadores_v11');
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr.map((x) => String(x).toLowerCase()));
    }
  } catch {
    // ignore
  }
  return new Set();
}

function saveDeletedSet(set: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('elite_deleted_jogadores_v11', JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

export function markJogadorDeletedLocal(email?: string, docId?: string) {
  const s = getDeletedSet();
  if (email) {
    const eNorm = email.trim().toLowerCase();
    if (eNorm) {
      s.add(eNorm);
      s.add(getJogadorDocId(eNorm));
    }
  }
  if (docId) {
    s.add(docId.trim().toLowerCase());
  }
  saveDeletedSet(s);
}

export function clearJogadorDeletedLocal(email?: string, docId?: string) {
  const s = getDeletedSet();
  if (email) {
    const eNorm = email.trim().toLowerCase();
    s.delete(eNorm);
    s.delete(getJogadorDocId(eNorm));
  }
  if (docId) {
    s.delete(docId.trim().toLowerCase());
  }
  saveDeletedSet(s);
}

export function isJogadorDeletedLocal(email?: string, docId?: string): boolean {
  const s = getDeletedSet();
  if (email) {
    const eNorm = email.trim().toLowerCase();
    if (s.has(eNorm) || s.has(getJogadorDocId(eNorm))) return true;
  }
  if (docId && s.has(docId.trim().toLowerCase())) return true;
  return false;
}

export async function upsertJogadorInDb(jg: any, isNovoCadastro = false): Promise<void> {
  const email = String(jg.email || '').trim().toLowerCase().slice(0, 120);
  if (!email || email.length < 3) return;
  const docId = getJogadorDocId(email);
  if (isNovoCadastro) {
    clearJogadorDeletedLocal(email, docId);
  } else if (isJogadorDeletedLocal(email, docId)) {
    return;
  }
  const path = `jogadores/${docId}`;

  const payload: Record<string, any> = {
    email,
    nome: String(jg.nome || 'Jogador').trim().slice(0, 100) || 'Jogador',
    pix: String(jg.pix || '-').trim().slice(0, 120) || '-',
    pontos: typeof jg.pontos === 'number' && !isNaN(jg.pontos) ? jg.pontos : 0,
  };

  if (jg.statusPagamento && ['PENDENTE', 'EM_ANALISE', 'APROVADO', 'RECUSADO'].includes(jg.statusPagamento)) {
    payload.statusPagamento = jg.statusPagamento;
  }
  if (jg.comprovante && typeof jg.comprovante === 'string' && jg.comprovante.length <= 900000) {
    payload.comprovante = jg.comprovante;
  }
  if (typeof jg.timestampComprovante === 'number') {
    payload.timestampComprovante = jg.timestampComprovante;
  }
  if (jg.dataEnvioComprovante && typeof jg.dataEnvioComprovante === 'string') {
    payload.dataEnvioComprovante = jg.dataEnvioComprovante.slice(0, 60);
  }
  if (jg.dataAprovacao && typeof jg.dataAprovacao === 'string') {
    payload.dataAprovacao = jg.dataAprovacao.slice(0, 60);
  }
  if (jg.dataCadastro && typeof jg.dataCadastro === 'string') {
    payload.dataCadastro = jg.dataCadastro.slice(0, 60);
  }
  if (typeof jg.timestampCadastro === 'number') {
    payload.timestampCadastro = jg.timestampCadastro;
  }
  payload.id = String(jg.id || docId).slice(0, 120);
  if (jg.link_pagamento && typeof jg.link_pagamento === 'string') {
    payload.link_pagamento = jg.link_pagamento.slice(0, 2000);
  }
  if (jg.status_pagamento && typeof jg.status_pagamento === 'string') {
    payload.status_pagamento = jg.status_pagamento.slice(0, 40);
  }
  if (typeof jg.aprovado === 'boolean') {
    payload.aprovado = jg.aprovado;
  }
  if (jg.aprovado_em && typeof jg.aprovado_em === 'string') {
    payload.aprovado_em = jg.aprovado_em.slice(0, 100);
  }

  try {
    await setDoc(doc(db, 'jogadores', docId), payload);
    triggerAllListeners();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function buscarValorAtualBolao(): Promise<number> {
  try {
    const docSnap = await getDoc(doc(db, 'config', 'bolao'));
    const valorAtual = Number(docSnap.data()?.valorCota) || 10;
    return valorAtual;
  } catch {
    return getCachedConfigDoc().valorCota || 10;
  }
}

export async function registrarDepositoConfirmadoInDb(userObj?: any, valorPago?: number): Promise<{
  userId: string;
  valor: number;
  status: string;
  chaveDestino: string;
  createdAt: string;
  nome?: string;
  email?: string;
}> {
  if (userObj) {
    syncAuthCurrentUser(userObj);
  }
  const uid = auth.currentUser?.uid || getJogadorDocId(userObj?.email || userObj?.nome || 'inho_jogador');
  const valorFinal = Number(valorPago) || getCachedConfigDoc().valorCota || 10;
  const payload: Record<string, any> = {
    userId: uid,
    valor: valorFinal,
    status: 'CONFIRMADO',
    chaveDestino: CHAVE_PIX_ALEATORIA,
    createdAt: serverTimestamp(),
  };
  if (userObj?.nome) {
    payload.nome = String(userObj.nome).trim().slice(0, 100);
  }
  if (userObj?.email) {
    payload.email = String(userObj.email).trim().toLowerCase().slice(0, 120);
  }

  try {
    await setDoc(doc(db, 'depositos', uid), payload);
    triggerAllListeners();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `depositos/${uid}`);
  }

  return payload as any;
}

export async function deleteJogadorFromDb(
  email: string,
  extraDocIds: string[] = [],
  nome?: string
): Promise<void> {
  const emailNorm = String(email || '').trim().toLowerCase();
  const primaryDocId = getJogadorDocId(emailNorm || nome || '');
  markJogadorDeletedLocal(emailNorm, primaryDocId);
  for (const exId of extraDocIds) {
    if (exId) markJogadorDeletedLocal(undefined, exId);
  }

  const candidateIds = new Set<string>();
  if (primaryDocId && primaryDocId !== 'jogador_anonimo') candidateIds.add(primaryDocId);
  extraDocIds.forEach((id) => {
    const clean = String(id || '').trim();
    if (clean) candidateIds.add(clean);
  });

  try {
    // 1. Deleta diretamente pelos IDs conhecidos em jogadores e depositos
    for (const cid of Array.from(candidateIds)) {
      await deleteDoc(doc(db, 'jogadores', cid)).catch(() => {});
      await deleteDoc(doc(db, 'depositos', cid)).catch(() => {});
    }

    // 2. Busca e remove quaisquer documentos remanescentes em 'jogadores' com o mesmo e-mail ou ID
    const respJogadores = await fetch(`${BASE_URL}:runQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: { from: [{ collectionId: 'jogadores' }] },
      }),
    }).catch(() => null);

    if (respJogadores && respJogadores.ok) {
      const rows = await respJogadores.json().catch(() => []);
      if (Array.isArray(rows)) {
        for (const r of rows) {
          if (!r?.document) continue;
          const nameParts = String(r.document.name || '').split('/');
          const dId = nameParts[nameParts.length - 1] || '';
          const data = fromFirestoreFields(r.document.fields || {});
          const docEmail = String(data.email || '').trim().toLowerCase();
          if (
            (emailNorm && docEmail === emailNorm) ||
            candidateIds.has(dId) ||
            (!emailNorm && nome && String(data.nome || '').trim().toLowerCase() === nome.trim().toLowerCase())
          ) {
            markJogadorDeletedLocal(docEmail, dId);
            await deleteDoc(doc(db, 'jogadores', dId)).catch(() => {});
          }
        }
      }
    }

    // 3. Busca e remove todos os palpites desse jogador na coleção 'palpites'
    const respPalpites = await fetch(`${BASE_URL}:runQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: { from: [{ collectionId: 'palpites' }] },
      }),
    }).catch(() => null);

    if (respPalpites && respPalpites.ok) {
      const rows = await respPalpites.json().catch(() => []);
      if (Array.isArray(rows)) {
        for (const r of rows) {
          if (!r?.document) continue;
          const nameParts = String(r.document.name || '').split('/');
          const pId = nameParts[nameParts.length - 1] || '';
          const data = fromFirestoreFields(r.document.fields || {});
          const pEmail = String(data.jogadorEmail || '').trim().toLowerCase();
          if ((emailNorm && pEmail === emailNorm) || (primaryDocId && pId.startsWith(`${primaryDocId}_`))) {
            await deleteDoc(doc(db, 'palpites', pId)).catch(() => {});
          }
        }
      }
    }

    // 4. Busca e remove todos os depósitos desse jogador na coleção 'depositos'
    const respDepositos = await fetch(`${BASE_URL}:runQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: { from: [{ collectionId: 'depositos' }] },
      }),
    }).catch(() => null);

    if (respDepositos && respDepositos.ok) {
      const rows = await respDepositos.json().catch(() => []);
      if (Array.isArray(rows)) {
        for (const r of rows) {
          if (!r?.document) continue;
          const nameParts = String(r.document.name || '').split('/');
          const depId = nameParts[nameParts.length - 1] || '';
          const data = fromFirestoreFields(r.document.fields || {});
          const depEmail = String(data.email || '').trim().toLowerCase();
          const depUserId = String(data.userId || '').trim();
          if (
            (emailNorm && depEmail === emailNorm) ||
            candidateIds.has(depId) ||
            candidateIds.has(depUserId)
          ) {
            await deleteDoc(doc(db, 'depositos', depId)).catch(() => {});
          }
        }
      }
    }

    triggerAllListeners();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `jogadores/${primaryDocId}`);
  }
}

export async function upsertJogoInDb(j: any): Promise<void> {
  const id = String(j.id || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  if (!id) return;
  const path = `jogos/${id}`;
  const payload: Record<string, any> = {
    id,
    casa: String(j.casa || '').trim().slice(0, 80) || 'Mandante',
    fora: String(j.fora || '').trim().slice(0, 80) || 'Visitante',
    escudoCasa: String(j.escudoCasa || '').slice(0, 500000),
    escudoFora: String(j.escudoFora || '').slice(0, 500000),
    data: String(j.data || 'A definir').trim().slice(0, 60) || 'A definir',
    estadio: String(j.estadio || 'Estádio Principal').trim().slice(0, 100) || 'Estádio Principal',
  };
  if (j.resultadoOficial && ['CASA', 'EMPATE', 'FORA'].includes(j.resultadoOficial)) {
    payload.resultadoOficial = j.resultadoOficial;
  }
  if (typeof j.publicado === 'boolean') {
    payload.publicado = j.publicado;
  }
  if (j.bolaoId && typeof j.bolaoId === 'string') {
    payload.bolaoId = j.bolaoId.slice(0, 80);
  }
  if (j.tituloBolao && typeof j.tituloBolao === 'string') {
    payload.tituloBolao = j.tituloBolao.slice(0, 120);
  }
  try {
    await setDoc(doc(db, 'jogos', id), payload);
    triggerAllListeners();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteJogoFromDb(jogoId: string): Promise<void> {
  const id = String(jogoId || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  if (!id) return;
  const path = `jogos/${id}`;
  try {
    await deleteDoc(doc(db, 'jogos', id));
    triggerAllListeners();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export interface JogoDisponivelItem {
  id: string;
  time_casa: string;
  time_fora: string;
  campeonato: string;
  horario: string;
  data: string;
  adicionado_ao_bolao: boolean;
}

export async function upsertJogoDisponivelInDb(item: JogoDisponivelItem): Promise<void> {
  const id = String(item.id || '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 120);
  if (!id) return;
  const path = `jogos_disponiveis/${id}`;
  const payload: JogoDisponivelItem = {
    id,
    time_casa: String(item.time_casa || 'Time Casa').trim().slice(0, 100) || 'Time Casa',
    time_fora: String(item.time_fora || 'Time Fora').trim().slice(0, 100) || 'Time Fora',
    campeonato: String(item.campeonato || 'Futebol').trim().slice(0, 120) || 'Futebol',
    horario: String(item.horario || '16:00').trim().slice(0, 60) || '16:00',
    data: String(item.data || new Date().toISOString().slice(0, 10)).trim().slice(0, 40) || new Date().toISOString().slice(0, 10),
    adicionado_ao_bolao: Boolean(item.adicionado_ao_bolao),
  };
  try {
    await setDoc(doc(db, 'jogos_disponiveis', id), payload);
    triggerAllListeners();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteJogoDisponivelFromDb(itemId: string): Promise<void> {
  const id = String(itemId || '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 120);
  if (!id) return;
  const path = `jogos_disponiveis/${id}`;
  try {
    await deleteDoc(doc(db, 'jogos_disponiveis', id));
    triggerAllListeners();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function upsertPalpiteInDb(p: any): Promise<void> {
  const jogadorEmail = String(p.jogadorEmail || '').trim().toLowerCase().slice(0, 120);
  const jogoId = String(p.jogoId || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  if (!jogadorEmail || !jogoId || !['CASA', 'EMPATE', 'FORA'].includes(p.escolha)) return;
  const docId = getPalpiteDocId(jogadorEmail, jogoId);
  const path = `palpites/${docId}`;
  const payload = {
    jogadorEmail,
    jogoId,
    escolha: p.escolha,
    pago: Boolean(p.pago),
  };
  try {
    await setDoc(doc(db, 'palpites', docId), payload);
    triggerAllListeners();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePalpiteFromDb(email: string, jogoId: string): Promise<void> {
  const docId = getPalpiteDocId(email, jogoId);
  const path = `palpites/${docId}`;
  try {
    await deleteDoc(doc(db, 'palpites', docId));
    triggerAllListeners();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export interface ComprovantePremiacaoItem {
  id: string;
  ganhadorNome: string;
  colocacao: string;
  valorPago: number;
  descricao?: string;
  imagemComprovante: string;
  dataEnvio: string;
  timestamp: number;
}

export async function upsertComprovantePremiacaoInDb(item: ComprovantePremiacaoItem): Promise<void> {
  const id = String(item.id || '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 120);
  if (!id || !item.imagemComprovante) return;
  const path = `comprovantes_premiacao/${id}`;
  const valorNum = Number(item.valorPago);
  const payload: Record<string, any> = {
    id,
    ganhadorNome: String(item.ganhadorNome || 'Ganhador do Bolão').trim().slice(0, 120) || 'Ganhador do Bolão',
    colocacao: String(item.colocacao || 'Premiação do Bolão').trim().slice(0, 80) || 'Premiação do Bolão',
    valorPago: !isNaN(valorNum) && valorNum >= 0 ? valorNum : 0,
    imagemComprovante: String(item.imagemComprovante).slice(0, 900000),
    dataEnvio: String(item.dataEnvio || new Date().toLocaleDateString('pt-BR')).trim().slice(0, 80) || 'Recente',
    timestamp: typeof item.timestamp === 'number' && !isNaN(item.timestamp) ? item.timestamp : Date.now(),
  };
  if (item.descricao && String(item.descricao).trim()) {
    payload.descricao = String(item.descricao).trim().slice(0, 200);
  }
  try {
    await setDoc(doc(db, 'comprovantes_premiacao', id), payload);
    triggerAllListeners();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteComprovantePremiacaoFromDb(itemId: string): Promise<void> {
  const id = String(itemId || '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 120);
  if (!id) return;
  const path = `comprovantes_premiacao/${id}`;
  try {
    await deleteDoc(doc(db, 'comprovantes_premiacao', id));
    triggerAllListeners();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function inicializarConfigAdminInDb(): Promise<void> {
  try {
    const ref = doc(db, 'config', 'bolao');
    const snap = await getDoc(ref);
    const valAtual = Number(snap.data()?.valorCota) || getCachedConfigDoc().valorCota || VALOR_COTA;
    if (!snap.exists() || !snap.data()?.valorCota) {
      const initPayload = {
        valorCota: valAtual,
        precoCota: valAtual,
        valor: valAtual,
        chavePix: CHAVE_PIX_ALEATORIA,
        nomePix: 'IRAILSON DA SILVA',
        cidadePix: 'ITABUNA',
        pixAdm: CHAVE_PIX_ALEATORIA,
      };
      await setDoc(doc(db, 'config', 'bolao'), initPayload);
      await setDoc(doc(db, 'config', 'bolao_config'), initPayload).catch(() => {});
      triggerAllListeners();
    }
  } catch {
    // silencioso
  }
}

export async function saveConfigInDb(cfg: any): Promise<void> {
  const path = 'config/bolao';
  const rawVal = parseFloat(String(cfg.valorCota ?? cfg.valor ?? cfg.precoCota ?? VALOR_COTA).replace(',', '.'));
  const valorNumerico = !isNaN(rawVal) && rawVal > 0 ? rawVal : VALOR_COTA;
  const chavePix = String(cfg.chavePix || cfg.pixAdm || CHAVE_PIX_ALEATORIA).trim().slice(0, 120) || CHAVE_PIX_ALEATORIA;
  const linkPagamentoInfinitePay = String(cfg.linkPagamentoInfinitePay ?? getCachedConfigDoc().linkPagamentoInfinitePay ?? '').trim().slice(0, 2000);
  const payload = {
    valor: valorNumerico,
    valorCota: valorNumerico,
    precoCota: valorNumerico,
    linkPagamentoInfinitePay,
    chavePix,
    nomePix: String(cfg.nomePix || 'IRAILSON DA SILVA').trim().slice(0, 60) || 'IRAILSON DA SILVA',
    cidadePix: String(cfg.cidadePix || 'ITABUNA').trim().slice(0, 60) || 'ITABUNA',
    pixAdm: String(cfg.pixAdm || chavePix).trim().slice(0, 120) || chavePix,
  };
  setCachedConfigDoc(payload);
  try {
    await setDoc(doc(db, 'config', 'bolao'), payload);
    await setDoc(doc(db, 'config', 'bolao_config'), payload).catch(() => {});
    triggerAllListeners();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function compressImageToDataUrl(file: File, maxDim = 900, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
    reader.onload = (e: any) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onerror = () => resolve(dataUrl);
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed.length < dataUrl.length ? compressed : dataUrl);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testConnection();
