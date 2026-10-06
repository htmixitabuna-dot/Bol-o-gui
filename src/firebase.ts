import firebaseConfig from '../firebase-applet-config.json';

const PROJECT_ID = firebaseConfig.projectId || 'gen-lang-client-0929605804';
const DATABASE_ID = firebaseConfig.firestoreDatabaseId || 'ai-studio-bologui-41191dbc-bc23-4859-bc28-074d5c8a833c';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;

export const db = { projectId: PROJECT_ID, databaseId: DATABASE_ID };
export const auth: { currentUser: any } = { currentUser: null };

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
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
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
  const resp = await fetch(`${BASE_URL}/${ref.path}`);
  if (resp.status === 404) {
    return {
      id: ref.id,
      exists: () => false,
      data: () => undefined,
    };
  }
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} on GET ${ref.path}`);
  }
  const raw = await resp.json();
  const parsed = fromFirestoreFields(raw?.fields || {});
  return {
    id: ref.id,
    exists: () => Boolean(raw && raw.fields),
    data: () => parsed,
  };
}

export async function getDocFromServer(ref: DocRef) {
  return getDoc(ref);
}

export async function setDoc(ref: DocRef, data: Record<string, any>): Promise<void> {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) {
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
          throw new Error(`HTTP ${resp.status} listing ${ref.path}`);
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
              data: () => parsed,
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
  const timer = setInterval(poll, 4000);

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

export async function upsertJogadorInDb(jg: any): Promise<void> {
  const email = String(jg.email || '').trim().toLowerCase().slice(0, 120);
  if (!email || email.length < 3) return;
  const docId = getJogadorDocId(email);
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
    const snap = await getDoc(doc(db, 'config', 'bolao_config'));
    if (snap.exists()) {
      const data = snap.data();
      const raw = data?.valor ?? data?.valor_aposta ?? data?.preco;
      const num = parseFloat(String(raw).replace(',', '.'));
      if (!isNaN(num) && num > 0) {
        return num;
      }
    }
  } catch (err) {
    console.warn('Erro ao ler config/bolao_config:', err);
  }
  throw new Error('Valor da cota não encontrado em config/bolao_config no banco de dados.');
}

export async function criarPagamentoInfinitePay(params: {
  jogador_id: string;
  nome: string;
  jogadorObj?: any;
}): Promise<{ url: string; valor?: number; price?: number }> {
  const jogador_id = getJogadorDocId(params.jogador_id);
  const nome = String(params.nome || 'Jogador').trim();
  const redirect_origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://bol-o-gui-d57d-eight.vercel.app';

  let urlRetornada = '';
  let valorReais = 0;
  let valorCentavos = 0;

  try {
    const resp = await fetch('/api/pagamento/criar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jogador_id, nome, redirect_origin }),
    });
    if (resp.ok) {
      const data = await resp.json();
      urlRetornada = data?.url || data?.invoice_url || '';
      valorReais = Number(data?.valor) || 0;
      valorCentavos = Number(data?.price) || 0;
    }
  } catch {
    // Fallback direto caso a rota serverless não esteja acessível
  }

  if (!urlRetornada) {
    valorReais = await buscarValorAtualBolao();
    valorCentavos = Math.round(valorReais * 100);
    const redirectUrl = `${redirect_origin.replace(/\/+$/, '')}/?pagamento=sucesso&jogador_id=${encodeURIComponent(jogador_id)}`;
    const itemPayload = [{ quantity: 1, price: valorCentavos, description: 'Bolao - Participacao' }];

    const ipResp = await fetch('https://api.infinitepay.io/invoices/public/checkout/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        handle: 'irailson-da-472',
        items: itemPayload,
        itens: itemPayload,
        order_nsu: jogador_id,
        redirect_url: redirectUrl,
        customer: { name: nome },
      }),
    });
    const ipData = await ipResp.json();
    urlRetornada = ipData?.url || ipData?.invoice_url || '';
  }

  if (!urlRetornada) {
    throw new Error('Não foi possível gerar o link PIX da InfinitePay.');
  }

  if (params.jogadorObj) {
    await upsertJogadorInDb({
      ...params.jogadorObj,
      id: jogador_id,
      link_pagamento: urlRetornada,
    }).catch(() => {});
  }

  return { url: urlRetornada, valor: valorReais, price: valorCentavos };
}

export async function deleteJogadorFromDb(email: string): Promise<void> {
  const docId = getJogadorDocId(email);
  const path = `jogadores/${docId}`;
  try {
    await deleteDoc(doc(db, 'jogadores', docId));
    triggerAllListeners();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
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

export async function saveConfigInDb(cfg: any): Promise<void> {
  const path = 'config/bolao_config';
  const numVal = parseFloat(String(cfg.valor).replace(',', '.'));
  const valor = !isNaN(numVal) && numVal >= 0 ? numVal : 20;
  const chavePix = String(cfg.chavePix || cfg.pixAdm || '01780181558').trim().slice(0, 120) || '01780181558';
  const payload = {
    valor,
    chavePix,
    nomePix: String(cfg.nomePix || 'INHO BAHIA').trim().slice(0, 60) || 'INHO BAHIA',
    cidadePix: String(cfg.cidadePix || 'ITABUNA').trim().slice(0, 60) || 'ITABUNA',
    pixAdm: String(cfg.pixAdm || chavePix).trim().slice(0, 120) || chavePix,
  };
  try {
    await setDoc(doc(db, 'config', 'bolao_config'), payload);
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
