import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

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
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
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
    console.warn('Erro ao ler config/bolao_config via SDK:', err);
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
    const redirectUrl = `${redirect_origin.replace(/\/+$/, '')}/pagamento-sucesso?jogador_id=${encodeURIComponent(jogador_id)}`;
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
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePalpiteFromDb(email: string, jogoId: string): Promise<void> {
  const docId = getPalpiteDocId(email, jogoId);
  const path = `palpites/${docId}`;
  try {
    await deleteDoc(doc(db, 'palpites', docId));
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

export { collection, doc, getDoc, onSnapshot };

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
