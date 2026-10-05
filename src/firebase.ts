import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
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

  try {
    await setDoc(doc(db, 'jogadores', docId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
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

export { collection, doc, onSnapshot };

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
