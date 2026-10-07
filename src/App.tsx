import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import logoOficial from './assets/images/bolao_elite_logo_1791164462566.jpg';
import { PWAInstallButton } from './PWAInstallButton';
import {
  db,
  auth,
  VALOR_COTA,
  CHAVE_PIX_ALEATORIA,
  gerarPayloadPix,
  syncAuthCurrentUser,
  serverTimestamp,
  registrarDepositoConfirmadoInDb,
  collection,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  getJogadorDocId,
  listarUsuariosDoSupabase,
  buscarUsuarioNoSupabase,
  upsertJogadorInDb,
  deleteJogadorFromDb,
  clearJogadorDeletedLocal,
  isJogadorDeletedLocal,
  upsertJogoInDb,
  deleteJogoFromDb,
  upsertPalpiteInDb,
  deletePalpiteFromDb,
  ComprovantePremiacaoItem,
  upsertComprovantePremiacaoInDb,
  deleteComprovantePremiacaoFromDb,
  saveConfigInDb,
  inicializarConfigAdminInDb,
  compressImageToDataUrl,
  buscarJogosRodadaEspn,
  sincronizarTimesEJogosIniciaisNoSupabase,
  sincronizarJogosDeHojeEspnComSupabase,
  listarJogosDoSupabase,
  getHojeBrasilISO,
  limparCacheJogosLocal,
  MENSAGEM_DATA_FIFA,
} from './supabase';

// ============================================================================
// TIMES CAMPEONATO BRASILEIRO SÉRIE A (LISTA ATUALIZADA E ESCUDOS OFICIAIS)
// ============================================================================
export interface TimeSerieA {
  nome: string;
  escudo: string;
  sigla: string;
  uf: string;
  aliases?: string[];
}

export const TIMES_PADRAO: TimeSerieA[] = [
  { nome: "Atlético-MG", sigla: "CAM", uf: "MG", escudo: "https://logodetimes.com/times/atletico-mineiro/logo-atletico-mineiro-256.png", aliases: ["atletico mineiro", "atletico mg", "galo"] },
  { nome: "Athletico-PR", sigla: "CAP", uf: "PR", escudo: "https://logodetimes.com/times/atletico-paranaense/logo-atletico-paranaense-256.png", aliases: ["atletico-pr", "atletico paranaense", "athletico"] },
  { nome: "Bahia", sigla: "BAH", uf: "BA", escudo: "https://logodetimes.com/times/bahia/logo-bahia-256.png", aliases: ["ec bahia", "esporte clube bahia"] },
  { nome: "Botafogo", sigla: "BOT", uf: "RJ", escudo: "https://logodetimes.com/times/botafogo/logo-botafogo-256.png", aliases: ["botafogo rj"] },
  { nome: "Ceará", sigla: "CEA", uf: "CE", escudo: "https://logodetimes.com/times/ceara/logo-ceara-256.png", aliases: ["ceara sc"] },
  { nome: "Chapecoense", sigla: "CHA", uf: "SC", escudo: "https://logodetimes.com/times/chapecoense/logo-chapecoense-256.png", aliases: ["chape"] },
  { nome: "Corinthians", sigla: "COR", uf: "SP", escudo: "https://logodetimes.com/times/corinthians/logo-corinthians-256.png", aliases: ["timao", "sport club corinthians paulista"] },
  { nome: "Coritiba", sigla: "CFC", uf: "PR", escudo: "https://logodetimes.com/times/coritiba/logo-coritiba-256.png", aliases: ["coxa"] },
  { nome: "Cruzeiro", sigla: "CRU", uf: "MG", escudo: "https://logodetimes.com/times/cruzeiro/logo-cruzeiro-256.png", aliases: ["cruzeiro ec"] },
  { nome: "Flamengo", sigla: "FLA", uf: "RJ", escudo: "https://logodetimes.com/times/flamengo/logo-flamengo-256.png", aliases: ["cr flamengo", "mengao"] },
  { nome: "Fluminense", sigla: "FLU", uf: "RJ", escudo: "https://logodetimes.com/times/fluminense/logo-fluminense-256.png", aliases: ["fluminense fc"] },
  { nome: "Fortaleza", sigla: "FOR", uf: "CE", escudo: "https://logodetimes.com/times/fortaleza/logo-fortaleza-256.png", aliases: ["fortaleza ec"] },
  { nome: "Grêmio", sigla: "GRE", uf: "RS", escudo: "https://logodetimes.com/times/gremio/logo-gremio-256.png", aliases: ["gremio fbpa"] },
  { nome: "Internacional", sigla: "INT", uf: "RS", escudo: "https://logodetimes.com/times/internacional/logo-internacional-256.png", aliases: ["inter", "sc internacional"] },
  { nome: "Juventude", sigla: "JUV", uf: "RS", escudo: "https://logodetimes.com/times/juventude/logo-juventude-256.png", aliases: ["ec juventude"] },
  { nome: "Mirassol", sigla: "MIR", uf: "SP", escudo: "https://logodetimes.com/times/mirassol/logo-mirassol-256.png", aliases: ["mirassol fc"] },
  { nome: "Palmeiras", sigla: "PAL", uf: "SP", escudo: "https://logodetimes.com/times/palmeiras/logo-palmeiras-256.png", aliases: ["se palmeiras", "verdao"] },
  { nome: "Red Bull Bragantino", sigla: "RBB", uf: "SP", escudo: "https://logodetimes.com/times/red-bull-bragantino/logo-red-bull-bragantino-256.png", aliases: ["bragantino", "rb bragantino"] },
  { nome: "Remo", sigla: "REM", uf: "PA", escudo: "https://logodetimes.com/times/remo/logo-remo-256.png", aliases: ["clube do remo"] },
  { nome: "Santos", sigla: "SAN", uf: "SP", escudo: "https://logodetimes.com/times/santos/logo-santos-256.png", aliases: ["santos fc", "peixe"] },
  { nome: "São Paulo", sigla: "SAO", uf: "SP", escudo: "https://logodetimes.com/times/sao-paulo/logo-sao-paulo-256.png", aliases: ["sao paulo fc", "spfc"] },
  { nome: "Sport", sigla: "SPT", uf: "PE", escudo: "https://logodetimes.com/times/sport-recife/logo-sport-recife-256.png", aliases: ["sport recife"] },
  { nome: "Vasco da Gama", sigla: "VAS", uf: "RJ", escudo: "https://logodetimes.com/times/vasco-da-gama/logo-vasco-da-gama-256.png", aliases: ["vasco", "cr vasco da gama"] },
  { nome: "Vitória", sigla: "VIT", uf: "BA", escudo: "https://logodetimes.com/times/vitoria/logo-vitoria-256.png", aliases: ["ec vitoria", "esporte clube vitoria"] },
];

const ESCUDOS_EXTRAS: Record<string, string> = {
  "criciuma": "https://a.espncdn.com/i/teamlogos/soccer/500/3457.png",
  "cuiaba": "https://logodetimes.com/times/cuiaba/logo-cuiaba-256.png",
  "atletico-go": "https://logodetimes.com/times/atletico-goianiense/logo-atletico-goianiense-256.png",
  "atletico goianiense": "https://logodetimes.com/times/atletico-goianiense/logo-atletico-goianiense-256.png",
};

const normalizarNomeTime = (texto: string) =>
  (texto || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export const getEscudoPadrao = (nome: string) => {
  const norm = normalizarNomeTime(nome);
  if (!norm) return "";
  const encontrado = TIMES_PADRAO.find(
    (x) =>
      normalizarNomeTime(x.nome) === norm ||
      normalizarNomeTime(x.sigla) === norm ||
      (x.aliases && x.aliases.some((al) => normalizarNomeTime(al) === norm))
  );
  if (encontrado) return encontrado.escudo;
  if (ESCUDOS_EXTRAS[norm]) return ESCUDOS_EXTRAS[norm];
  const parcial = TIMES_PADRAO.find(
    (x) =>
      norm.includes(normalizarNomeTime(x.nome)) ||
      normalizarNomeTime(x.nome).includes(norm)
  );
  return parcial ? parcial.escudo : "";
};

export type EscolhaResultado = "CASA" | "EMPATE" | "FORA";

export interface Jogo {
  id: string;
  casa: string;
  fora: string;
  escudoCasa: string;
  escudoFora: string;
  data: string;
  data_jogo?: string;
  estadio: string;
  placarCasa?: string | number;
  placarFora?: string | number;
  aoVivo?: boolean;
  encerrado?: boolean;
  tempoJogo?: string;
  statusDetalhe?: string;
  resultadoOficial?: EscolhaResultado;
  publicado?: boolean;
  bolaoId?: string;
  tituloBolao?: string;
}

export interface Palpite {
  jogadorEmail: string;
  jogoId: string;
  escolha: EscolhaResultado;
  pago?: boolean;
}

export default function App() {
  const [page, setPage] = useState<"landing" | "loginJogador" | "adminLogin" | "admin" | "palpites" | "minhasApostas" | "pagamento" | "pagamentoSucesso" | "classificacao">(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname || "";
      const params = new URLSearchParams(window.location.search);
      if (path.includes("/pagamento-sucesso") || params.get("jogador_id")) {
        return "pagamentoSucesso";
      }
      if (path === "/admin") {
        return "admin";
      }
    }
    return "landing";
  });
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [jogadores, setJogadores] = useState<any[]>([]);
  const [palpites, setPalpites] = useState<Palpite[]>([]);
  const [depositos, setDepositos] = useState<any[]>(() => {
    try {
      const d = localStorage.getItem("elite_depositos_v11");
      return d ? JSON.parse(d) : [];
    } catch {
      return [];
    }
  });
  const [user, setUser] = useState<any>(null);
  const [config, setConfig] = useState<{ valor: number | string; valorCota?: number; precoCota?: number; linkPagamentoInfinitePay?: string; chavePix: string; nomePix: string; cidadePix: string; pixAdm: string }>(() => {
    let inicialVal = VALOR_COTA;
    let inicialLink = "";
    try {
      const savedBolao = localStorage.getItem("supabase_doc_config/bolao");
      const savedCfg = localStorage.getItem("elite_config_v11");
      const parsed = savedBolao ? JSON.parse(savedBolao) : savedCfg ? JSON.parse(savedCfg) : null;
      const v = Number(parsed?.valorCota ?? parsed?.valor ?? parsed?.precoCota);
      if (!isNaN(v) && v > 0) inicialVal = v;
      if (parsed?.linkPagamentoInfinitePay) inicialLink = String(parsed.linkPagamentoInfinitePay);
    } catch {
      // ignore
    }
    return {
      valor: inicialVal,
      valorCota: inicialVal,
      precoCota: inicialVal,
      linkPagamentoInfinitePay: inicialLink,
      chavePix: CHAVE_PIX_ALEATORIA,
      nomePix: "IRAILSON DA SILVA",
      cidadePix: "ITABUNA",
      pixAdm: CHAVE_PIX_ALEATORIA,
    };
  });
  const [valorPixAtual, setValorPixAtual] = useState<number>(() => {
    try {
      const savedBolao = localStorage.getItem("supabase_doc_config/bolao");
      const savedCfg = localStorage.getItem("elite_config_v11");
      const parsed = savedBolao ? JSON.parse(savedBolao) : savedCfg ? JSON.parse(savedCfg) : null;
      const v = Number(parsed?.valorCota ?? parsed?.valor ?? parsed?.precoCota);
      if (!isNaN(v) && v > 0) return v;
    } catch {
      // ignore
    }
    return 10;
  });
  const [payloadPixAtual, setPayloadPixAtual] = useState<string>(() => {
    let inicialVal = 10;
    try {
      const savedBolao = localStorage.getItem("supabase_doc_config/bolao");
      const savedCfg = localStorage.getItem("elite_config_v11");
      const parsed = savedBolao ? JSON.parse(savedBolao) : savedCfg ? JSON.parse(savedCfg) : null;
      const v = Number(parsed?.valorCota ?? parsed?.valor ?? parsed?.precoCota);
      if (!isNaN(v) && v > 0) inicialVal = v;
    } catch {
      // ignore
    }
    return gerarPayloadPix("f0e74d2a-d610-4b76-842e-8b7e1a08047d", inicialVal, "IRAILSON DA SILVA", "ITABUNA");
  });
  const [copiadoPix, setCopiadoPix] = useState(false);
  const [copiadaChave, setCopiadaChave] = useState(false);
  const [pixSalvoAviso, setPixSalvoAviso] = useState(false);
  const [rodadaPublicadaAviso, setRodadaPublicadaAviso] = useState(false);
  const [triagemSalvaAviso, setTriagemSalvaAviso] = useState(false);
  const [modalComprovante, setModalComprovante] = useState<{ url: string; nome: string; email: string; timestamp?: number } | null>(null);
  const [pastaComprovanteAberta, setPastaComprovanteAberta] = useState(false);
  const [tempComprovante, setTempComprovante] = useState<string>("");
  const [modalPixAberto, setModalPixAberto] = useState(false);
  const [mostrarQrPixDireto, setMostrarQrPixDireto] = useState(false);
  const [enviandoComprovantePix, setEnviandoComprovantePix] = useState(false);
  const [comprovanteEnviadoAviso, setComprovanteEnviadoAviso] = useState(false);
  const [carregandoInfinitePay, setCarregandoInfinitePay] = useState(false);
  const [confirmandoJaPaguei, setConfirmandoJaPaguei] = useState(false);
  const [pagamentoConfirmadoLocal, setPagamentoConfirmadoLocal] = useState<boolean>(() => {
    try {
      return localStorage.getItem("elite_pix_confirmado_v11") === "true";
    } catch {
      return false;
    }
  });
  const [confirmandoSucesso, setConfirmandoSucesso] = useState(false);
  const [modoNovaAposta, setModoNovaAposta] = useState(false);
  const [jogadorIdSucesso, setJogadorIdSucesso] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("jogador_id") || params.get("order_nsu") || "";
    }
    return "";
  });

  // Logo Oficial do Bolões Elite
  const [logoBolao, setLogoBolao] = useState<string>(logoOficial);

  // Confronto Form & Novo Bolão Salvo (Sem jogos falsos pré-preenchidos)
  const [nomeTime1, setNomeTime1] = useState("");
  const [nomeTime2, setNomeTime2] = useState("");
  const [escudoTime1, setEscudoTime1] = useState("");
  const [escudoTime2, setEscudoTime2] = useState("");
  const [dataJ, setDataJ] = useState("16:00");
  const [estadio, setEstadio] = useState("Brasileirão Série A");
  const [tituloNovoBolao, setTituloNovoBolao] = useState("Novo Bolão da Rodada");
  const [bolaoEmPreparoId, setBolaoEmPreparoId] = useState("bolao_salvo_1");
  const [bolaoSalvoAviso, setBolaoSalvoAviso] = useState(false);

  // Escolhas temporárias do jogador para a rodada atual
  const [escolhasTemp, setEscolhasTemp] = useState<Record<string, EscolhaResultado>>(() => {
    try {
      const saved = localStorage.getItem("elite_escolhas_temp_v11");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const getEscolhaDoJogo = (j: Jogo): EscolhaResultado | undefined => {
    const gUuid = (j as any)?.gameUuid;
    const chaveTime = `${(j.casa || "").trim().toLowerCase()}_x_${(j.fora || "").trim().toLowerCase()}`;
    return (
      escolhasTemp[j.id] ||
      (gUuid ? escolhasTemp[gUuid] : undefined) ||
      escolhasTemp[chaveTime]
    );
  };

  const selecionarOpcaoJogo = (j: Jogo, escolha: EscolhaResultado) => {
    const gUuid = (j as any)?.gameUuid;
    const chaveTime = `${(j.casa || "").trim().toLowerCase()}_x_${(j.fora || "").trim().toLowerCase()}`;
    setEscolhasTemp((prev) => {
      const next: Record<string, EscolhaResultado> = {
        ...prev,
        [j.id]: escolha,
        [chaveTime]: escolha,
      };
      if (gUuid) {
        next[gUuid] = escolha;
      }
      try {
        localStorage.setItem("elite_escolhas_temp_v11", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Termos
  const [aceitouTermos, setAceitouTermos] = useState(true);
  const [showTermosModal, setShowTermosModal] = useState(false);

  // Filtro de apostas na área ADM
  const [filtroApostasAdm, setFiltroApostasAdm] = useState<"todos" | "pagos" | "pendentes">("todos");
  const [abaLoginJogador, setAbaLoginJogador] = useState<"cadastro" | "entrar">("cadastro");
  const [buscaLoginInput, setBuscaLoginInput] = useState("");
  const [erroLoginJogador, setErroLoginJogador] = useState("");
  const [buscaApostadorAdm, setBuscaApostadorAdm] = useState("");
  const [dbConectado, setDbConectado] = useState(false);
  const [cotaSalvaAviso, setCotaSalvaAviso] = useState(false);
  const [linkSalvoAviso, setLinkSalvoAviso] = useState(false);
  const [avisoAdm, setAvisoAdm] = useState("");
  const [jogosEspnRapido, setJogosEspnRapido] = useState<any[]>([]);
  const [carregandoEspnRapido, setCarregandoEspnRapido] = useState(false);
  const [ultimaAtualizacaoJogos, setUltimaAtualizacaoJogos] = useState<string>("");

  // Área de Transparência (Comprovantes de Pagamento da Premiação enviados pelo ADM para todos os jogadores)
  const [comprovantesPremiacao, setComprovantesPremiacao] = useState<ComprovantePremiacaoItem[]>(() => {
    try {
      const saved = localStorage.getItem("elite_comprovantes_premiacao_v11");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [ganhadorPremiacaoNome, setGanhadorPremiacaoNome] = useState("");
  const [colocacaoPremiacao, setColocacaoPremiacao] = useState("🥇 1º Lugar (50%)");
  const [valorPremiacaoPago, setValorPremiacaoPago] = useState("");
  const [descricaoPremiacao, setDescricaoPremiacao] = useState("");
  const [imgComprovantePremiacao, setImgComprovantePremiacao] = useState("");
  const [enviandoComprovantePremiacao, setEnviandoComprovantePremiacao] = useState(false);
  const [modalTransparenciaAberto, setModalTransparenciaAberto] = useState(false);
  const [comprovantePremiacaoZoom, setComprovantePremiacaoZoom] = useState<ComprovantePremiacaoItem | null>(null);

  const mostrarAvisoAdm = (msg: string) => {
    setAvisoAdm(msg);
    setTimeout(() => setAvisoAdm(""), 4000);
  };

  useEffect(() => {
    limparCacheJogosLocal();
    try {
      const jd = localStorage.getItem("elite_jogadores_v11");
      const p = localStorage.getItem("elite_palpites_v11");
      const cfg = localStorage.getItem("elite_config_v11");
      const u = localStorage.getItem("elite_user_v11");
      const l = localStorage.getItem("elite_logo_v11");

      const agora = Date.now();
      const TRES_DIAS_MS = 3 * 24 * 60 * 60 * 1000;

      if (jd) {
        const parsedJd = JSON.parse(jd);
        let alterouJd = false;
        const limposJd = parsedJd
          .filter((jg: any) => !isJogadorDeletedLocal(jg.email, jg._docId || jg.id, jg.timestampCadastro))
          .map((jg: any) => {
            if (jg.timestampComprovante && agora - jg.timestampComprovante > TRES_DIAS_MS) {
              alterouJd = true;
              return {
                ...jg,
                comprovante: undefined,
                timestampComprovante: undefined,
                dataEnvioComprovante: undefined,
              };
            }
            return jg;
          });
        setJogadores(limposJd);
        if (alterouJd) {
          localStorage.setItem("elite_jogadores_v11", JSON.stringify(limposJd));
        }
      }

      if (p) {
        const parsedP = JSON.parse(p).filter((palp: any) => !isJogadorDeletedLocal(palp.jogadorEmail));
        setPalpites(parsedP);
      }
      if (cfg) {
        const parsed = JSON.parse(cfg);
        const vSalvo = Number(parsed?.valorCota ?? parsed?.valor ?? parsed?.precoCota) || VALOR_COTA;
        setConfig((prev) => ({
          ...prev,
          ...parsed,
          valor: vSalvo,
          valorCota: vSalvo,
          precoCota: vSalvo,
          linkPagamentoInfinitePay: parsed.linkPagamentoInfinitePay ?? prev.linkPagamentoInfinitePay ?? "",
          chavePix: CHAVE_PIX_ALEATORIA,
          pixAdm: CHAVE_PIX_ALEATORIA,
          nomePix: parsed.nomePix || prev.nomePix,
          cidadePix: parsed.cidadePix || prev.cidadePix,
        }));
        setValorPixAtual(vSalvo);
        setPayloadPixAtual(
          gerarPayloadPix("f0e74d2a-d610-4b76-842e-8b7e1a08047d", vSalvo, "IRAILSON DA SILVA", "ITABUNA")
        );
      }

      if (u) {
        const parsedU = JSON.parse(u);
        if (isJogadorDeletedLocal(parsedU.email, parsedU._docId || parsedU.id, parsedU.timestampCadastro)) {
          localStorage.removeItem("elite_user_v11");
          localStorage.removeItem("elite_pix_confirmado_v11");
          setUser(null);
        } else {
          if (parsedU.timestampComprovante && agora - parsedU.timestampComprovante > TRES_DIAS_MS) {
            parsedU.comprovante = undefined;
            parsedU.timestampComprovante = undefined;
            parsedU.dataEnvioComprovante = undefined;
            localStorage.setItem("elite_user_v11", JSON.stringify(parsedU));
          }
          setUser(parsedU);
          syncAuthCurrentUser(parsedU);
        }
      }
      if (l) setLogoBolao(l);
    } catch {
      localStorage.clear();
    }

    const agoraMs = Date.now();
    const TRES_DIAS_MS = 3 * 24 * 60 * 60 * 1000;

    const unsubJogadores = onSnapshot(
      collection(db, "jogadores"),
      (snapshot) => {
        setDbConectado(true);
        const listaDb: any[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (isJogadorDeletedLocal(data.email, docSnap.id, data.timestampCadastro)) {
            return;
          }
          if (data.timestampComprovante && agoraMs - data.timestampComprovante > TRES_DIAS_MS) {
            const limpo = {
              ...data,
              _docId: docSnap.id,
              comprovante: undefined,
              timestampComprovante: undefined,
              dataEnvioComprovante: undefined,
            };
            listaDb.push(limpo);
            upsertJogadorInDb(limpo).catch(() => {});
          } else {
            listaDb.push({ ...data, _docId: docSnap.id });
          }
        });
        setJogadores((prevLocal) => {
          const emailsNoBanco = new Set(listaDb.map((x) => (x.email || "").toLowerCase()));
          const locaisNaoSincronizados = prevLocal.filter((loc) => {
            const em = (loc.email || "").toLowerCase();
            if (!em || emailsNoBanco.has(em)) return false;
            if (isJogadorDeletedLocal(em, loc._docId || loc.id, loc.timestampCadastro)) return false;
            upsertJogadorInDb(loc).catch(() => {});
            return true;
          });
          const combinada = [...listaDb, ...locaisNaoSincronizados];
          localStorage.setItem("elite_jogadores_v11", JSON.stringify(combinada));
          return combinada;
        });

        setUser((prevUser: any) => {
          if (!prevUser?.email) return prevUser;
          if (isJogadorDeletedLocal(prevUser.email, prevUser._docId || prevUser.id, prevUser.timestampCadastro)) {
            localStorage.removeItem("elite_user_v11");
            localStorage.removeItem("elite_pix_confirmado_v11");
            setPagamentoConfirmadoLocal(false);
            return null;
          }
          const atualizado = listaDb.find(
            (x) => (x.email || "").toLowerCase() === prevUser.email.toLowerCase()
          );
          if (atualizado) {
            localStorage.setItem("elite_user_v11", JSON.stringify(atualizado));
            return atualizado;
          }
          return prevUser;
        });
      },
      () => {}
    );

    const unsubJogos = onSnapshot(
      collection(db, "jogos"),
      (snapshot) => {
        setDbConectado(true);
        const listaJogos: Jogo[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data() as Jogo & { data_jogo?: string };
          listaJogos.push({
            ...d,
            publicado: true,
          });
        });
        listaJogos.sort((a, b) => String(a.id).localeCompare(String(b.id)));
        setJogos(listaJogos);
      },
      () => {}
    );

    const unsubPalpites = onSnapshot(
      collection(db, "palpites"),
      (snapshot) => {
        setDbConectado(true);
        const listaPalpites: Palpite[] = [];
        snapshot.forEach((docSnap) => {
          listaPalpites.push(docSnap.data() as Palpite);
        });
        setPalpites(listaPalpites);
        localStorage.setItem("elite_palpites_v11", JSON.stringify(listaPalpites));
      },
      () => {}
    );

    const unsubDepositos = onSnapshot(
      collection(db, "depositos"),
      (snapshot) => {
        setDbConectado(true);
        const listaDep: any[] = [];
        snapshot.forEach((docSnap) => {
          listaDep.push({ id: docSnap.id, ...docSnap.data() });
        });
        if (listaDep.length > 0) {
          setDepositos(listaDep);
          localStorage.setItem("elite_depositos_v11", JSON.stringify(listaDep));
        }
      },
      () => {}
    );

    const unsubConfig = onSnapshot(
      doc(db, "config", "bolao"),
      (docSnap) => {
        setDbConectado(true);
        const configDoc = docSnap.exists() ? docSnap.data() : null;
        setConfig((prev) => {
          const valorAtual =
            Number(configDoc?.valorCota ?? configDoc?.valor ?? configDoc?.precoCota) ||
            Number(prev.valorCota ?? prev.valor) ||
            10;
          setValorPixAtual(valorAtual);
          setPayloadPixAtual(
            gerarPayloadPix("f0e74d2a-d610-4b76-842e-8b7e1a08047d", valorAtual, "IRAILSON DA SILVA", "ITABUNA")
          );
          const next = {
            ...prev,
            ...(configDoc || {}),
            valor: valorAtual,
            valorCota: valorAtual,
            precoCota: valorAtual,
            linkPagamentoInfinitePay: configDoc?.linkPagamentoInfinitePay ?? prev.linkPagamentoInfinitePay ?? "",
            chavePix: CHAVE_PIX_ALEATORIA,
            pixAdm: CHAVE_PIX_ALEATORIA,
            nomePix: configDoc?.nomePix || prev.nomePix,
            cidadePix: configDoc?.cidadePix || prev.cidadePix,
          };
          localStorage.setItem("elite_config_v11", JSON.stringify(next));
          return next;
        });
      },
      () => {}
    );

    const unsubComprovantesPremiacao = onSnapshot(
      collection(db, "comprovantes_premiacao"),
      (snapshot) => {
        setDbConectado(true);
        const listaPrem: ComprovantePremiacaoItem[] = [];
        snapshot.forEach((docSnap) => {
          listaPrem.push(docSnap.data() as ComprovantePremiacaoItem);
        });
        listaPrem.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setComprovantesPremiacao(listaPrem);
        localStorage.setItem("elite_comprovantes_premiacao_v11", JSON.stringify(listaPrem));
      },
      () => {}
    );

    const handleStorageSync = (ev: StorageEvent) => {
      if (ev.key === "elite_jogadores_v11" && ev.newValue) {
        try {
          const novaLista = JSON.parse(ev.newValue);
          if (Array.isArray(novaLista)) {
            setJogadores(novaLista);
          }
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener("storage", handleStorageSync);

    return () => {
      window.removeEventListener("storage", handleStorageSync);
      unsubJogadores();
      unsubJogos();
      unsubPalpites();
      unsubDepositos();
      unsubConfig();
      unsubComprovantesPremiacao();
    };
  }, []);

  // Busca ao vivo os jogos de hoje na ESPN ao abrir a página e sincroniza os jogos ativos do Bolão no Supabase a cada 1 minuto (60.000 ms), sem cache
  const atualizarJogosEspnAoVivo = async () => {
    limparCacheJogosLocal();
    setCarregandoEspnRapido(true);
    try {
      const [listaHoje, jogosNoBanco] = await Promise.all([
        sincronizarJogosDeHojeEspnComSupabase(),
        listarJogosDoSupabase(),
      ]);
      setJogosEspnRapido(listaHoje || []);
      if (Array.isArray(jogosNoBanco)) {
        const normalizados: Jogo[] = jogosNoBanco
          .map((d: any) => ({
            ...d,
            publicado: true,
          }))
          .sort((a: Jogo, b: Jogo) => String(a.id).localeCompare(String(b.id)));
        setJogos(normalizados);
      }
      setUltimaAtualizacaoJogos(
        new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    } catch {
      setJogosEspnRapido([]);
    } finally {
      setCarregandoEspnRapido(false);
    }
  };

  useEffect(() => {
    atualizarJogosEspnAoVivo();
    const intervalId = window.setInterval(() => {
      atualizarJogosEspnAoVivo();
    }, 60000);
    return () => window.clearInterval(intervalId);
  }, [page]);

  // Inicialização automática no Admin com VALOR_COTA = 10 e carregamento de todos os usuários do Supabase
  useEffect(() => {
    if (page === "admin") {
      inicializarConfigAdminInDb().catch(() => {});
      listarUsuariosDoSupabase()
        .then((usuariosSupabase) => {
          if (usuariosSupabase && usuariosSupabase.length > 0) {
            setDbConectado(true);
            setJogadores((prev) => {
              const emailsNoBanco = new Set(usuariosSupabase.map((x) => (x.email || "").toLowerCase()));
              const extras = prev.filter(
                (loc) => loc.email && !emailsNoBanco.has(loc.email.toLowerCase())
              );
              const combinada = [...usuariosSupabase, ...extras];
              localStorage.setItem("elite_jogadores_v11", JSON.stringify(combinada));
              return combinada;
            });
          }
        })
        .catch(() => {});
    }
  }, [page]);

  // Inicializa escolhas temporárias do usuário ao carregar jogos/palpites sem apagar seleções já feitas pelo jogador na tela
  useEffect(() => {
    if (modoNovaAposta) return;
    if (user && palpites.length > 0) {
      const emailLogado = (user.email || "").trim().toLowerCase();
      const userP = palpites.filter(
        (p) => (p.jogadorEmail || "").trim().toLowerCase() === emailLogado
      );
      if (userP.length === 0) return;
      setEscolhasTemp((prev) => {
        const next: Record<string, EscolhaResultado> = { ...prev };
        let alterou = false;
        userP.forEach((p) => {
          if (p.jogoId && !next[p.jogoId]) {
            next[p.jogoId] = p.escolha;
            alterou = true;
          }
        });
        if (alterou) {
          try {
            localStorage.setItem("elite_escolhas_temp_v11", JSON.stringify(next));
          } catch {}
          return next;
        }
        return prev;
      });
    }
  }, [user?.email, palpites, modoNovaAposta]);

  useEffect(() => {
    if (user) {
      syncAuthCurrentUser(user);
    }
  }, [user]);

  const iniciarNovaAposta = () => {
    if (!user) {
      setPage("loginJogador");
      return;
    }
    setModoNovaAposta(true);
    setEscolhasTemp({});
    try {
      localStorage.removeItem("elite_escolhas_temp_v11");
    } catch {}
    setPage("palpites");
    setTimeout(() => {
      const el = document.getElementById("secao-jogos-rodada");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 100);
  };

  // Confirmação automática ao retornar da InfinitePay (/pagamento-sucesso?jogador_id=XXX)
  useEffect(() => {
    if (page !== "pagamentoSucesso") return;
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get("jogador_id") || params.get("order_nsu") || jogadorIdSucesso || user?.id || user?.email;
    if (!idParam) return;

    let cancelado = false;
    const confirmarNoBanco = async () => {
      setConfirmandoSucesso(true);
      try {
        const docId = getJogadorDocId(idParam);
        const snap = await getDoc(doc(db, "jogadores", docId));
        const agoraIso = new Date().toISOString();
        const horaFormatada = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

        let dadosJogador: any = snap.exists() ? snap.data() : null;
        if (!dadosJogador) {
          dadosJogador = jogadores.find(
            (x: any) =>
              getJogadorDocId(x.id || x.email || "") === docId ||
              (x.email || "").toLowerCase() === String(idParam).toLowerCase()
          );
        }
        if (!dadosJogador && user) {
          dadosJogador = user;
        }

        if (dadosJogador && !cancelado) {
          const jgConfirmado = {
            ...dadosJogador,
            id: docId,
            status_pagamento: "pago",
            aprovado: true,
            aprovado_em: agoraIso,
            statusPagamento: "APROVADO",
            dataAprovacao: horaFormatada,
          };
          await upsertJogadorInDb(jgConfirmado);
          setUser(jgConfirmado);
          localStorage.setItem("elite_user_v11", JSON.stringify(jgConfirmado));

          // Marca automaticamente os palpites desse jogador como pagos
          const emailAlvo = (jgConfirmado.email || "").toLowerCase();
          palpites.forEach((p) => {
            if ((p.jogadorEmail || "").toLowerCase() === emailAlvo && !p.pago) {
              upsertPalpiteInDb({ ...p, pago: true }).catch(() => {});
            }
          });
        }
      } catch (err) {
        console.error("Erro ao confirmar pagamento no retorno do PIX:", err);
      } finally {
        if (!cancelado) setConfirmandoSucesso(false);
      }
    };

    confirmarNoBanco();
    return () => {
      cancelado = true;
    };
  }, [page, jogadorIdSucesso]);

  const carregarValorEGerarPix = async () => {
    try {
      const docSnap = await getDoc(doc(db, "config", "bolao"));
      const dataDoc = docSnap.data();
      const valorAtual = Number(dataDoc?.valorCota) || Number(config.valorCota) || Number(config.valor) || 10;
      const linkAtual = String(dataDoc?.linkPagamentoInfinitePay ?? config.linkPagamentoInfinitePay ?? "").trim();
      const payload = gerarPayloadPix("f0e74d2a-d610-4b76-842e-8b7e1a08047d", valorAtual, "IRAILSON DA SILVA", "ITABUNA");
      setValorPixAtual(valorAtual);
      setPayloadPixAtual(payload);
      setConfig((prev) => ({
        ...prev,
        valor: valorAtual,
        valorCota: valorAtual,
        precoCota: valorAtual,
        linkPagamentoInfinitePay: linkAtual || prev.linkPagamentoInfinitePay || "",
      }));
    } catch {
      const fallbackVal = Number(config.valorCota) || Number(config.valor) || 10;
      const payload = gerarPayloadPix("f0e74d2a-d610-4b76-842e-8b7e1a08047d", fallbackVal, "IRAILSON DA SILVA", "ITABUNA");
      setValorPixAtual(fallbackVal);
      setPayloadPixAtual(payload);
    }
  };

  useEffect(() => {
    if (page === "pagamento" || modalPixAberto) {
      carregarValorEGerarPix();
    }
  }, [page, modalPixAberto]);

  const abrirLinkPagamentoInfinitePay = async () => {
    setCarregandoInfinitePay(true);
    try {
      const usuarioLogado = user || {
        id: auth.currentUser?.uid || "inho_jogador",
        nome: auth.currentUser?.displayName || "Jogador Bolao",
        email: auth.currentUser?.email || "inhobahia29@gmail.com",
        pix: "",
      };
      const jogadorId = usuarioLogado.id || getJogadorDocId(usuarioLogado.email || usuarioLogado.nome || "jogador");
      const name = String(usuarioLogado.nome || "Jogador Bolao").trim();
      const email = String(usuarioLogado.email || "jogador@bolao.com").trim().toLowerCase();
      const rawPhone = String(
        usuarioLogado.phone_number || usuarioLogado.telefone || usuarioLogado.pix || "+5573999999999"
      ).trim();
      const digits = rawPhone.replace(/\D/g, "");
      let phone_number = "+5573999999999";
      if (digits.length >= 10 && digits.length <= 11) {
        phone_number = `+55${digits}`;
      } else if (digits.length >= 12 && digits.length <= 13 && digits.startsWith("55")) {
        phone_number = `+${digits}`;
      }

      let checkoutUrl = "";
      try {
        const resp = await fetch("/api/criar-pagamento-infinitepay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jogadorId,
            nome: name,
            email,
            phone_number,
            customer: {
              name,
              email,
              phone_number,
            },
            items: [
              {
                quantity: 1,
                price: 1000,
                description: "Cota Bolao Elite",
              },
            ],
          }),
        });
        if (resp.ok) {
          const data = await resp.json().catch(() => ({}));
          if (data?.url) {
            checkoutUrl = data.url;
          }
        }
      } catch {
        // fallback caso /api/criar-pagamento-infinitepay não esteja rodando localmente no Vite dev
      }

      if (!checkoutUrl) {
        try {
          const origin = typeof window !== "undefined" ? window.location.origin : "https://bol-o-gui.vercel.app";
          const directResp = await fetch("https://api.checkout.infinitepay.io/links", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              handle: "irailson-da-472",
              order_nsu: `${jogadorId}_${Date.now()}`,
              redirect_url: `${origin}/pagamento-sucesso?jogador_id=${encodeURIComponent(jogadorId)}`,
              customer: {
                name,
                email,
                phone_number,
              },
              items: [
                {
                  quantity: 1,
                  price: 1000,
                  description: "Cota Bolao Elite",
                },
              ],
            }),
          });
          if (directResp.ok) {
            const directData = await directResp.json().catch(() => ({}));
            checkoutUrl = directData?.url || directData?.checkout_url || directData?.data?.url || "";
          }
        } catch {
          // ignore CORS/network fallback
        }
      }

      if (!checkoutUrl) {
        const origin = typeof window !== "undefined" ? window.location.origin : "https://bol-o-gui.vercel.app";
        checkoutUrl = `https://checkout.infinitepay.io/irailson-da-472?items=[{"name":"Cota+Bolao+Elite","price":1000,"quantity":1}]&customer_name=${encodeURIComponent(
          name
        )}&customer_email=${encodeURIComponent(email)}&customer_cellphone=${encodeURIComponent(
          phone_number
        )}&order_nsu=${encodeURIComponent(jogadorId)}&redirect_url=${encodeURIComponent(
          `${origin}/pagamento-sucesso?jogador_id=${encodeURIComponent(jogadorId)}`
        )}`;
      }

      window.open(checkoutUrl, "_blank");
    } finally {
      setCarregandoInfinitePay(false);
    }
  };

  const acionarPixDireto = async () => {
    let codigoPix =
      payloadPixAtual ||
      gerarPayloadPix("f0e74d2a-d610-4b76-842e-8b7e1a08047d", Number(config.valorCota) || 10, "IRAILSON DA SILVA", "ITABUNA");
    try {
      const resp = await fetch(`/api/pix-key?valor=${encodeURIComponent(String(Number(config.valorCota) || 10))}`);
      if (resp.ok) {
        const data = await resp.json().catch(() => ({}));
        if (data?.pixCopiaECola || data?.payload) {
          codigoPix = data.pixCopiaECola || data.payload;
          setPayloadPixAtual(codigoPix);
        }
      }
    } catch {
      // usa payload gerado localmente
    }
    try {
      await navigator.clipboard.writeText(codigoPix);
    } catch {
      // ignore clipboard error
    }
    setCopiadoPix(true);
    setTimeout(() => setCopiadoPix(false), 3500);
    setMostrarQrPixDireto(true);
  };

  const handleUploadComprovanteApi = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Imagem muito grande, use arquivo até 5MB!");
      return;
    }
    setEnviandoComprovantePix(true);
    try {
      let comprovanteBase64 = "";
      try {
        comprovanteBase64 = await compressImageToDataUrl(file, 900, 0.72);
      } catch {
        comprovanteBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
          reader.onload = (ev: any) => resolve(String(ev.target?.result || ""));
          reader.readAsDataURL(file);
        });
      }

      if (!user || !jogadores.some((jg: any) => (jg.email || "").toLowerCase() === (user.email || "").toLowerCase())) {
        alert("Seu cadastro não foi encontrado no banco de dados. Faça um Novo Cadastro para participar!");
        setUser(null);
        localStorage.removeItem("elite_user_v11");
        setAbaLoginJogador("cadastro");
        setPage("loginJogador");
        return;
      }
      const usuarioAtivo = user;
      const emailJogador = (usuarioAtivo.email || "").trim().toLowerCase();
      const nomeJogador = (usuarioAtivo.nome || "Jogador").trim();
      const jogadorId = usuarioAtivo.id || getJogadorDocId(emailJogador);

      // Atualiza estado local e grava direto no registro do jogador no Supabase para aparecer na área do ADM (/admin)
      enviarComprovante(emailJogador, comprovanteBase64);

      // Envia também para o endpoint /api/upload-comprovante
      await fetch("/api/upload-comprovante", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jogadorId,
          nome: nomeJogador,
          email: emailJogador,
          comprovante: comprovanteBase64,
        }),
      }).catch(() => {});

      setComprovanteEnviadoAviso(true);
      setTimeout(() => setComprovanteEnviadoAviso(false), 6000);
      alert("✅ Comprovante enviado com sucesso para a sua pasta no painel do ADM! Aguarde a liberação em até 5 min.");
    } finally {
      setEnviandoComprovantePix(false);
    }
  };

  const abrirModalPixDireto = async () => {
    await acionarPixDireto();
    setModalPixAberto(true);
  };

  const confirmarJaPaguei = async () => {
    setConfirmandoJaPaguei(true);
    try {
      const docSnap = await getDoc(doc(db, "config", "bolao"));
      const valorConfirmado = Number(docSnap.data()?.valorCota) || Number(valorPixAtual) || Number(config.valor) || 10;

      if (!user || !jogadores.some((jg: any) => (jg.email || "").toLowerCase() === (user.email || "").toLowerCase())) {
        alert("Seu cadastro não foi encontrado no banco de dados. Faça um Novo Cadastro para participar!");
        setUser(null);
        localStorage.removeItem("elite_user_v11");
        setModalPixAberto(false);
        setAbaLoginJogador("cadastro");
        setPage("loginJogador");
        return;
      }
      const usuarioAtivo = user;
      syncAuthCurrentUser(usuarioAtivo);

      const uid = auth.currentUser.uid;
      const agoraIso = serverTimestamp();
      const horaFormatada = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

      setPagamentoConfirmadoLocal(true);
      localStorage.setItem("elite_pix_confirmado_v11", "true");

      const novoDeposito = {
        id: uid,
        userId: uid,
        valor: valorConfirmado,
        status: "CONFIRMADO",
        chaveDestino: "f0e74d2a-d610-4b76-842e-8b7e1a08047d",
        createdAt: agoraIso,
        nome: usuarioAtivo.nome || "Inho",
        email: usuarioAtivo.email || "inhobahia29@gmail.com",
      };

      const novaListaDepositos = [
        ...depositos.filter((d) => d.userId !== uid && d.id !== uid),
        novoDeposito,
      ];
      setDepositos(novaListaDepositos);
      localStorage.setItem("elite_depositos_v11", JSON.stringify(novaListaDepositos));

      const jgConfirmado = {
        ...usuarioAtivo,
        id: uid,
        status_pagamento: "pago",
        aprovado: true,
        aprovado_em: agoraIso,
        statusPagamento: "APROVADO",
        dataAprovacao: horaFormatada,
      };
      setUser(jgConfirmado);
      localStorage.setItem("elite_user_v11", JSON.stringify(jgConfirmado));

      const novaListaJogadores = [
        ...jogadores.filter(
          (x: any) =>
            (x.email || "").toLowerCase() !== (jgConfirmado.email || "").toLowerCase() &&
            x.id !== uid
        ),
        jgConfirmado,
      ];
      setJogadores(novaListaJogadores);
      localStorage.setItem("elite_jogadores_v11", JSON.stringify(novaListaJogadores));

      const emailAlvo = (jgConfirmado.email || "").toLowerCase();
      const palpitesAtualizados = palpites.map((p) => {
        if ((p.jogadorEmail || "").toLowerCase() === emailAlvo) {
          const nextP = { ...p, pago: true };
          upsertPalpiteInDb(nextP).catch(() => {});
          return nextP;
        }
        return p;
      });
      setPalpites(palpitesAtualizados);
      localStorage.setItem("elite_palpites_v11", JSON.stringify(palpitesAtualizados));

      setModalPixAberto(false);

      await setDoc(doc(db, "depositos", uid), {
        userId: auth.currentUser.uid,
        valor: valorConfirmado,
        status: "CONFIRMADO",
        chaveDestino: "f0e74d2a-d610-4b76-842e-8b7e1a08047d",
        createdAt: serverTimestamp(),
        nome: jgConfirmado.nome || "Inho",
        email: jgConfirmado.email || "inhobahia29@gmail.com",
      }).catch(() => {});

      await registrarDepositoConfirmadoInDb(jgConfirmado, valorConfirmado).catch(() => {});
      await upsertJogadorInDb(jgConfirmado).catch(() => {});
    } finally {
      setConfirmandoJaPaguei(false);
    }
  };

  const saveJogos = (j: Jogo[]) => {
    limparCacheJogosLocal();
    const idsNovos = new Set(j.map((x) => x.id));
    jogos.forEach((antigo) => {
      if (!idsNovos.has(antigo.id)) {
        deleteJogoFromDb(antigo.id).catch(() => {});
      }
    });
    setJogos(j);
    j.forEach((jogoItem) => {
      upsertJogoInDb(jogoItem).catch(() => {});
    });
  };

  const saveJogadores = (jd: any[]) => {
    setJogadores(jd);
    localStorage.setItem("elite_jogadores_v11", JSON.stringify(jd));
    jd.forEach((jg) => {
      upsertJogadorInDb(jg).catch(() => {});
    });
  };

  const saveConfig = (cfg: any) => {
    setConfig(cfg);
    localStorage.setItem("elite_config_v11", JSON.stringify(cfg));
    saveConfigInDb(cfg).catch(() => {});
  };

  const saveLogo = (logoBase64: string) => {
    setLogoBolao(logoBase64 || logoOficial);
    localStorage.setItem("elite_logo_v11", logoBase64 || logoOficial);
  };

  const handleFile = async (file: File | undefined, setEscudo: (data: string) => void) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return alert("Imagem muito grande, use arquivo até 5MB!");
    try {
      const compressed = await compressImageToDataUrl(file, 900, 0.72);
      setEscudo(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        setEscudo(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const Escudo = ({ src, nome, size = 36 }: { src?: string; nome: string; size?: number }) => {
    const escudoPadraoTime = getEscudoPadrao(nome);
    const isLegacyUrl =
      src &&
      !src.startsWith("data:") &&
      (src.includes("espncdn.com/combiner") || src.includes("upload.wikimedia.org"));
    const resolvedSrc = (!src || isLegacyUrl) ? (escudoPadraoTime || src) : src;

    if (!resolvedSrc) {
      return (
        <div
          style={{ width: size, height: size }}
          className="bg-[#FF6B00] text-black font-black text-[10px] rounded-full flex items-center justify-center shrink-0 shadow select-none"
        >
          {(nome || "TIM").substring(0, 3).toUpperCase()}
        </div>
      );
    }
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-white rounded-full p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-sm border border-zinc-200/30"
      >
        <img
          src={resolvedSrc}
          alt={nome}
          className="w-full h-full object-contain"
          onError={(e: any) => {
            if (escudoPadraoTime && e.currentTarget.src !== escudoPadraoTime) {
              e.currentTarget.src = escudoPadraoTime;
              return;
            }
            e.currentTarget.style.display = "none";
            if (e.currentTarget.parentElement) {
              e.currentTarget.parentElement.className =
                "bg-[#FF6B00] text-black font-black text-[10px] rounded-full flex items-center justify-center shrink-0 shadow";
              e.currentTarget.parentElement.innerHTML = (nome || "TIM").substring(0, 3).toUpperCase();
            }
          }}
        />
      </div>
    );
  };

  const jogosPublicados = jogos.filter((j) => j.publicado !== false);
  const jogosSalvosNaoPublicados = jogos.filter((j) => j.publicado === false);

  // Agrupa os bolões salvos (não publicados) por bolaoId
  const boloesSalvosMap = new Map<string, { bolaoId: string; titulo: string; jogos: Jogo[] }>();
  jogosSalvosNaoPublicados.forEach((jgItem) => {
    const bId = jgItem.bolaoId || "bolao_salvo_1";
    const bTitulo = jgItem.tituloBolao || "Novo Bolão da Rodada";
    const atual = boloesSalvosMap.get(bId) || { bolaoId: bId, titulo: bTitulo, jogos: [] };
    atual.jogos.push(jgItem);
    boloesSalvosMap.set(bId, atual);
  });
  const listaBoloesSalvos = Array.from(boloesSalvosMap.values());
  const jogosDoBolaoEmPreparo = jogosSalvosNaoPublicados.filter(
    (j) => (j.bolaoId || "bolao_salvo_1") === bolaoEmPreparoId
  );

  // Cria o jogo no Supabase já publicado (publicado: true) para aparecer automaticamente para todos os usuários logados
  const addJogo = () => {
    if (jogosPublicados.length >= 10) {
      return alert("Máximo de 10 jogos ativos no bolão! Exclua algum jogo para adicionar outro.");
    }
    if (nomeTime1.trim() === nomeTime2.trim()) {
      return alert("Selecione dois times diferentes!");
    }

    const tituloLimpo = (tituloNovoBolao || "Novo Bolão da Rodada").trim();
    const novo: Jogo = {
      id: Date.now().toString(),
      casa: nomeTime1.trim(),
      fora: nomeTime2.trim(),
      escudoCasa: escudoTime1 || getEscudoPadrao(nomeTime1),
      escudoFora: escudoTime2 || getEscudoPadrao(nomeTime2),
      data: dataJ || "A definir",
      estadio: estadio || "Estádio Principal",
      publicado: true,
      bolaoId: bolaoEmPreparoId,
      tituloBolao: tituloLimpo,
    };

    const novaLista = [...jogos, novo];
    saveJogos(novaLista);
    setRodadaPublicadaAviso(true);
    setTimeout(() => setRodadaPublicadaAviso(false), 5000);
    mostrarAvisoAdm(
      `🚀 Jogo "${novo.casa} x ${novo.fora}" criado no Supabase e liberado automaticamente para todos os usuários logados apostarem!`
    );
  };

  // Publica um bolão salvo específico (ou todos os jogos em preparo) para os jogadores
  const publicarBolaoSalvo = (targetBolaoId?: string, substituirAtivos = false) => {
    const candidatos = targetBolaoId
      ? jogosSalvosNaoPublicados.filter((j) => (j.bolaoId || "bolao_salvo_1") === targetBolaoId)
      : jogosSalvosNaoPublicados;

    if (candidatos.length === 0 && jogosPublicados.length === 0) {
      alert("Adicione pelo menos 1 jogo no bolão antes de publicar para os jogadores!");
      return;
    }

    let novaLista: Jogo[];
    if (candidatos.length > 0) {
      if (substituirAtivos) {
        // Remove os jogos publicados da rodada anterior e publica apenas o novo bolão salvo
        const mantendoRascunhosOutros = jogos.filter(
          (j) => j.publicado === false && (targetBolaoId ? (j.bolaoId || "bolao_salvo_1") !== targetBolaoId : false)
        );
        const publicadosAgora = candidatos.slice(0, 10).map((j) => ({
          ...j,
          publicado: true,
        }));
        novaLista = [...mantendoRascunhosOutros, ...publicadosAgora];
      } else {
        const vagasRestantes = Math.max(0, 10 - jogosPublicados.length);
        if (vagasRestantes === 0) {
          const confirmarSubstituicao = confirm(
            "Já existem 10 jogos publicados na rodada atual. Deseja substituir a rodada anterior por este Novo Bolão?"
          );
          if (!confirmarSubstituicao) return;
          const mantendoRascunhosOutros = jogos.filter(
            (j) => j.publicado === false && (targetBolaoId ? (j.bolaoId || "bolao_salvo_1") !== targetBolaoId : false)
          );
          const publicadosAgora = candidatos.slice(0, 10).map((j) => ({
            ...j,
            publicado: true,
          }));
          novaLista = [...mantendoRascunhosOutros, ...publicadosAgora];
        } else {
          const idsParaPublicar = new Set(candidatos.slice(0, vagasRestantes).map((c) => c.id));
          novaLista = jogos.map((j) => (idsParaPublicar.has(j.id) ? { ...j, publicado: true } : j));
        }
      }
    } else {
      novaLista = jogos.map((j) => ({ ...j, publicado: true }));
    }

    saveJogos(novaLista);
    setRodadaPublicadaAviso(true);
    setTimeout(() => setRodadaPublicadaAviso(false), 5000);
    const totalPub = novaLista.filter((j) => j.publicado !== false).length;
    mostrarAvisoAdm(`🚀 Bolão publicado com sucesso! ${totalPub} jogo(s) liberado(s) para os jogadores.`);
    alert(`🚀 Sucesso! O bolão foi publicado e os ${totalPub} confrontos já estão liberados na área de apostas dos jogadores.`);
  };

  const ocultarJogoPublicadoParaRascunho = (jogoId: string) => {
    const novaLista = jogos.map((j) =>
      j.id === jogoId
        ? {
            ...j,
            publicado: false,
            bolaoId: j.bolaoId || bolaoEmPreparoId,
            tituloBolao: j.tituloBolao || tituloNovoBolao || "Bolão Salvo",
          }
        : j
    );
    saveJogos(novaLista);
    mostrarAvisoAdm("🔒 Confronto movido para Bolões Salvos (oculto para os jogadores).");
  };

  const iniciarNovoBolaoRascunho = () => {
    const proximoNumero = listaBoloesSalvos.length + 1;
    const novoId = `bolao_salvo_${Date.now()}`;
    setBolaoEmPreparoId(novoId);
    setTituloNovoBolao(`Novo Bolão #${proximoNumero}`);
    mostrarAvisoAdm(`✨ Novo Bolão #${proximoNumero} criado em modo rascunho! Adicione os confrontos abaixo e deixe salvo.`);
  };

  const salvarEEnviarConfrontos = () => {
    publicarBolaoSalvo(undefined, false);
  };

  const toggleStatusPago = (email: string) => {
    const atualizados = palpites.map((p: any) => {
      if (p.jogadorEmail === email) {
        const nextP = { ...p, pago: !p.pago };
        upsertPalpiteInDb(nextP).catch(() => {});
        return nextP;
      }
      return p;
    });
    setPalpites(atualizados);
    localStorage.setItem("elite_palpites_v11", JSON.stringify(atualizados));
  };

  const aprovarPagamento = (email: string) => {
    // 1. Marca todos os palpites do jogador como pagos
    const palpitesAtualizados = palpites.map((p: any) => {
      if (p.jogadorEmail === email) {
        const nextP = { ...p, pago: true };
        upsertPalpiteInDb(nextP).catch(() => {});
        return nextP;
      }
      return p;
    });
    setPalpites(palpitesAtualizados);
    localStorage.setItem("elite_palpites_v11", JSON.stringify(palpitesAtualizados));

    // 2. Atualiza o status do jogador para APROVADO
    const horaAprovacao = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const jogadoresAtualizados = jogadores.map((jg: any) => {
      if (jg.email === email) {
        const nextJg = {
          ...jg,
          statusPagamento: "APROVADO",
          dataAprovacao: horaAprovacao,
        };
        upsertJogadorInDb(nextJg).catch(() => {});
        return nextJg;
      }
      return jg;
    });
    setJogadores(jogadoresAtualizados);
    localStorage.setItem("elite_jogadores_v11", JSON.stringify(jogadoresAtualizados));

    // 3. Se for o usuário atualmente conectado, atualiza a sessão imediatamente
    if (user && user.email === email) {
      const userAtualizado = {
        ...user,
        statusPagamento: "APROVADO",
        dataAprovacao: horaAprovacao,
      };
      setUser(userAtualizado);
      localStorage.setItem("elite_user_v11", JSON.stringify(userAtualizado));
    }

    if (modalComprovante) setModalComprovante(null);

    const jgNome = jogadores.find((x) => x.email === email)?.nome || "Jogador";
    alert(`✅ Pagamento de ${jgNome} APROVADO com sucesso!\nO jogador já foi notificado na área dele.`);
  };

  const recusarPagamento = (email: string) => {
    const palpitesAtualizados = palpites.map((p: any) => {
      if (p.jogadorEmail === email) {
        const nextP = { ...p, pago: false };
        upsertPalpiteInDb(nextP).catch(() => {});
        return nextP;
      }
      return p;
    });
    setPalpites(palpitesAtualizados);
    localStorage.setItem("elite_palpites_v11", JSON.stringify(palpitesAtualizados));

    const jogadoresAtualizados = jogadores.map((jg: any) => {
      if (jg.email === email) {
        const nextJg = { ...jg, statusPagamento: "RECUSADO" };
        upsertJogadorInDb(nextJg).catch(() => {});
        return nextJg;
      }
      return jg;
    });
    setJogadores(jogadoresAtualizados);
    localStorage.setItem("elite_jogadores_v11", JSON.stringify(jogadoresAtualizados));

    if (user && user.email === email) {
      const userAtualizado = { ...user, statusPagamento: "RECUSADO" };
      setUser(userAtualizado);
      localStorage.setItem("elite_user_v11", JSON.stringify(userAtualizado));
    }

    if (modalComprovante) setModalComprovante(null);
    alert("Pagamento recusado. O status foi atualizado para o jogador.");
  };

  const enviarComprovante = (email: string, comprovanteBase64: string) => {
    const agora = Date.now();
    const horaEnvio = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const dataHoraFormatada = `${new Date().toLocaleDateString("pt-BR")} às ${horaEnvio}`;

    const existeNaLista = jogadores.some((jg: any) => (jg.email || "").toLowerCase() === email.toLowerCase());
    if (!existeNaLista) {
      return;
    }

    const jogadoresAtualizados = jogadores.map((jg: any) => {
      if ((jg.email || "").toLowerCase() === email.toLowerCase()) {
        const nextJg = {
          ...jg,
          comprovante: comprovanteBase64,
          timestampComprovante: agora,
          statusPagamento: "EM_ANALISE",
          dataEnvioComprovante: dataHoraFormatada,
        };
        upsertJogadorInDb(nextJg).catch(() => {});
        return nextJg;
      }
      return jg;
    });
    setJogadores(jogadoresAtualizados);
    localStorage.setItem("elite_jogadores_v11", JSON.stringify(jogadoresAtualizados));

    if (user && user.email === email) {
      const userAtualizado = {
        ...user,
        comprovante: comprovanteBase64,
        timestampComprovante: agora,
        statusPagamento: "EM_ANALISE",
        dataEnvioComprovante: dataHoraFormatada,
      };
      setUser(userAtualizado);
      localStorage.setItem("elite_user_v11", JSON.stringify(userAtualizado));
      upsertJogadorInDb(userAtualizado).catch(() => {});
    }
  };

  const excluirComprovante = (email: string) => {
    const emailNorm = (email || "").trim().toLowerCase();
    const jogadoresAtualizados = jogadores.map((jg: any) => {
      if ((jg.email || "").trim().toLowerCase() === emailNorm) {
        const nextJg = {
          ...jg,
          comprovante: undefined,
          timestampComprovante: undefined,
          dataEnvioComprovante: undefined,
        };
        upsertJogadorInDb(nextJg).catch(() => {});
        return nextJg;
      }
      return jg;
    });
    setJogadores(jogadoresAtualizados);
    localStorage.setItem("elite_jogadores_v11", JSON.stringify(jogadoresAtualizados));

    if (user && (user.email || "").trim().toLowerCase() === emailNorm) {
      const userAtualizado = {
        ...user,
        comprovante: undefined,
        timestampComprovante: undefined,
        dataEnvioComprovante: undefined,
      };
      setUser(userAtualizado);
      localStorage.setItem("elite_user_v11", JSON.stringify(userAtualizado));
    }

    if (modalComprovante && (modalComprovante.email || "").trim().toLowerCase() === emailNorm) {
      setModalComprovante(null);
    }

    mostrarAvisoAdm("🗑️ Comprovante de pagamento excluído com sucesso!");
  };

  const excluirTodosComprovantes = () => {
    const jogadoresAtualizados = jogadores.map((jg: any) => {
      if (jg.comprovante) {
        const nextJg = {
          ...jg,
          comprovante: undefined,
          timestampComprovante: undefined,
          dataEnvioComprovante: undefined,
        };
        upsertJogadorInDb(nextJg).catch(() => {});
        return nextJg;
      }
      return jg;
    });
    setJogadores(jogadoresAtualizados);
    localStorage.setItem("elite_jogadores_v11", JSON.stringify(jogadoresAtualizados));

    if (user?.comprovante) {
      const userAtualizado = {
        ...user,
        comprovante: undefined,
        timestampComprovante: undefined,
        dataEnvioComprovante: undefined,
      };
      setUser(userAtualizado);
      localStorage.setItem("elite_user_v11", JSON.stringify(userAtualizado));
    }

    if (modalComprovante) setModalComprovante(null);
    mostrarAvisoAdm("🗑️ Todos os comprovantes de pagamento foram excluídos!");
  };

  const excluirApostadorAdm = (email: string, nome: string, docIdExtra?: string) => {
    const emailNorm = (email || "").trim().toLowerCase();
    const docIdPadrao = getJogadorDocId(emailNorm || nome || "");

    // Coleta todos os IDs relacionados a esse jogador para exclusão total no Supabase
    const idsParaDeletar: string[] = [];
    if (docIdExtra) idsParaDeletar.push(docIdExtra);
    if (docIdPadrao && docIdPadrao !== "jogador_anonimo") idsParaDeletar.push(docIdPadrao);

    jogadores.forEach((jg: any) => {
      const jgEmail = (jg.email || "").trim().toLowerCase();
      const mesmoEmail = emailNorm && jgEmail === emailNorm;
      const mesmoDocId = docIdExtra && (jg._docId === docIdExtra || jg.id === docIdExtra);
      const mesmoNomeSemEmail = !emailNorm && !jgEmail && (jg.nome || "").trim().toLowerCase() === (nome || "").trim().toLowerCase();
      if (mesmoEmail || mesmoDocId || mesmoNomeSemEmail) {
        if (jg._docId) idsParaDeletar.push(jg._docId);
        if (jg.id) idsParaDeletar.push(jg.id);
      }
    });

    const novaLista = jogadores.filter((jg: any) => {
      const jgEmail = (jg.email || "").trim().toLowerCase();
      if (emailNorm && jgEmail === emailNorm) return false;
      if (docIdExtra && (jg._docId === docIdExtra || jg.id === docIdExtra)) return false;
      if (!emailNorm && !jgEmail && (jg.nome || "").trim().toLowerCase() === (nome || "").trim().toLowerCase()) return false;
      return true;
    });
    setJogadores(novaLista);
    localStorage.setItem("elite_jogadores_v11", JSON.stringify(novaLista));

    // Remove do banco de dados Supabase (users, profiles, jogadores, palpites e depositos)
    deleteJogadorFromDb(emailNorm, idsParaDeletar, nome).catch(() => {});

    const palpitesDoJogador = palpites.filter((p) => (p.jogadorEmail || "").trim().toLowerCase() === emailNorm);
    palpitesDoJogador.forEach((p) => {
      deletePalpiteFromDb(emailNorm, p.jogoId).catch(() => {});
    });
    const novosPalpites = palpites.filter((p) => (p.jogadorEmail || "").trim().toLowerCase() !== emailNorm);
    setPalpites(novosPalpites);
    localStorage.setItem("elite_palpites_v11", JSON.stringify(novosPalpites));

    const novosDepositos = depositos.filter((d: any) => {
      const dEmail = (d.email || "").trim().toLowerCase();
      const dUserId = String(d.userId || d.id || "").trim();
      if (emailNorm && dEmail === emailNorm) return false;
      if (idsParaDeletar.includes(dUserId)) return false;
      return true;
    });
    setDepositos(novosDepositos);
    localStorage.setItem("elite_depositos_v11", JSON.stringify(novosDepositos));

    if (user && ((user.email || "").trim().toLowerCase() === emailNorm || (docIdExtra && (user._docId === docIdExtra || user.id === docIdExtra)))) {
      setUser(null);
      setPagamentoConfirmadoLocal(false);
      localStorage.removeItem("elite_user_v11");
      localStorage.removeItem("elite_pix_confirmado_v11");
    }

    if (modalComprovante && (modalComprovante.email || "").trim().toLowerCase() === emailNorm) {
      setModalComprovante(null);
    }

    mostrarAvisoAdm(`🗑️ Jogador "${nome}" foi excluído do banco de dados! Só voltará se fizer um novo cadastro.`);
  };

  const enviarComprovantePremiacaoAdm = async () => {
    const nomeGanhadorLimpo = ganhadorPremiacaoNome.trim();
    if (!nomeGanhadorLimpo) {
      alert("Informe o nome do ganhador que recebeu a premiação!");
      return;
    }
    if (!imgComprovantePremiacao) {
      alert("Anexe a imagem/foto do comprovante PIX de pagamento da premiação!");
      return;
    }

    const valorPadraoColocacao =
      colocacaoPremiacao.includes("1º")
        ? premio1
        : colocacaoPremiacao.includes("2º")
        ? premio2
        : colocacaoPremiacao.includes("3º")
        ? premio3
        : premio80;

    const valorDigitado = parseFloat(String(valorPremiacaoPago).replace(",", "."));
    const valorFinal = !isNaN(valorDigitado) && valorDigitado > 0 ? valorDigitado : Number(valorPadraoColocacao.toFixed(2));

    setEnviandoComprovantePremiacao(true);
    try {
      const agora = Date.now();
      const dataHoraEnvio = `${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;

      const novoComp: ComprovantePremiacaoItem = {
        id: `prem_${agora}_${Math.random().toString(36).slice(2, 6)}`,
        ganhadorNome: nomeGanhadorLimpo,
        colocacao: colocacaoPremiacao,
        valorPago: valorFinal,
        descricao: descricaoPremiacao.trim() || "Comprovante oficial de pagamento da premiação enviado pelo ADM",
        imagemComprovante: imgComprovantePremiacao,
        dataEnvio: dataHoraEnvio,
        timestamp: agora,
      };

      const novaLista = [novoComp, ...comprovantesPremiacao];
      setComprovantesPremiacao(novaLista);
      localStorage.setItem("elite_comprovantes_premiacao_v11", JSON.stringify(novaLista));

      await upsertComprovantePremiacaoInDb(novoComp);

      setGanhadorPremiacaoNome("");
      setValorPremiacaoPago("");
      setDescricaoPremiacao("");
      setImgComprovantePremiacao("");

      mostrarAvisoAdm(
        `🛡️ Comprovante de premiação de "${nomeGanhadorLimpo}" enviado! Todos os jogadores já podem conferir na Área de Transparência.`
      );
      alert(
        `✅ Comprovante de pagamento da premiação enviado com sucesso!\nEle já chegou na Área de Transparência de todos os jogadores para conferência.`
      );
    } finally {
      setEnviandoComprovantePremiacao(false);
    }
  };

  const excluirComprovantePremiacaoAdm = async (id: string) => {
    const novaLista = comprovantesPremiacao.filter((c) => c.id !== id);
    setComprovantesPremiacao(novaLista);
    localStorage.setItem("elite_comprovantes_premiacao_v11", JSON.stringify(novaLista));
    await deleteComprovantePremiacaoFromDb(id).catch(() => {});
    if (comprovantePremiacaoZoom?.id === id) {
      setComprovantePremiacaoZoom(null);
    }
    mostrarAvisoAdm("🗑️ Comprovante da Área de Transparência removido.");
  };

  const salvarValorCota = async () => {
    const valorDigitado = parseFloat(String(config.valor).replace(",", "."));
    if (isNaN(valorDigitado) || valorDigitado <= 0) {
      alert("Por favor, digite um valor válido para a cota do bolão!");
      return;
    }
    const chaveAtual = (config.chavePix || config.pixAdm || CHAVE_PIX_ALEATORIA).trim();
    const linkAtual = String(config.linkPagamentoInfinitePay || "").trim();
    const novoConfig = {
      ...config,
      valor: valorDigitado,
      valorCota: valorDigitado,
      precoCota: valorDigitado,
      linkPagamentoInfinitePay: linkAtual,
      chavePix: chaveAtual,
      pixAdm: chaveAtual,
    };
    saveConfig(novoConfig);
    setValorPixAtual(valorDigitado);
    const novoPayload = gerarPayloadPix("f0e74d2a-d610-4b76-842e-8b7e1a08047d", valorDigitado, "IRAILSON DA SILVA", "ITABUNA");
    setPayloadPixAtual(novoPayload);

    await setDoc(doc(db, "config", "bolao"), {
      valorCota: valorDigitado,
      valor: valorDigitado,
      precoCota: valorDigitado,
      linkPagamentoInfinitePay: linkAtual,
      chavePix: chaveAtual,
      nomePix: "IRAILSON DA SILVA",
      cidadePix: "ITABUNA",
      pixAdm: chaveAtual,
    }).catch(() => {});

    setCotaSalvaAviso(true);
    setTimeout(() => setCotaSalvaAviso(false), 4000);
    mostrarAvisoAdm(`💾 Valor da cota (R$ ${valorDigitado.toFixed(2)}) salvo em config/bolao com sucesso!`);
  };

  const salvarLinkPagamentoInfinitePay = async () => {
    const linkDigitado = String(config.linkPagamentoInfinitePay || "").trim();
    if (!linkDigitado) {
      alert("Por favor, digite o Link de Pagamento InfinitePay!");
      return;
    }
    const valorDigitado = parseFloat(String(config.valor).replace(",", ".")) || 10;
    const chaveAtual = (config.chavePix || config.pixAdm || CHAVE_PIX_ALEATORIA).trim();
    const novoConfig = {
      ...config,
      valor: valorDigitado,
      valorCota: valorDigitado,
      precoCota: valorDigitado,
      linkPagamentoInfinitePay: linkDigitado,
      chavePix: chaveAtual,
      pixAdm: chaveAtual,
    };
    saveConfig(novoConfig);

    await setDoc(doc(db, "config", "bolao"), {
      valorCota: valorDigitado,
      valor: valorDigitado,
      precoCota: valorDigitado,
      linkPagamentoInfinitePay: linkDigitado,
      chavePix: chaveAtual,
      nomePix: "IRAILSON DA SILVA",
      cidadePix: "ITABUNA",
      pixAdm: chaveAtual,
    }).catch(() => {});

    setLinkSalvoAviso(true);
    setTimeout(() => setLinkSalvoAviso(false), 4000);
    mostrarAvisoAdm("🔗 Link de Pagamento InfinitePay salvo com sucesso!");
  };

  const calcularDiasRestantes = (timestamp?: number) => {
    if (!timestamp) return 3;
    const TRES_DIAS_MS = 3 * 24 * 60 * 60 * 1000;
    const decorrido = Date.now() - timestamp;
    const restante = TRES_DIAS_MS - decorrido;
    if (restante <= 0) return 0;
    return Math.ceil(restante / (24 * 60 * 60 * 1000));
  };

  // Define resultado oficial de um jogo pelo ADM
  const definirResultadoJogo = (jogoId: string, res: EscolhaResultado) => {
    const atualizados = jogos.map((j) => {
      if (j.id === jogoId) {
        return { ...j, resultadoOficial: j.resultadoOficial === res ? undefined : res };
      }
      return j;
    });
    saveJogos(atualizados);
  };

  const confirmarResultadosETriagem = () => {
    saveJogos(jogos);
    setTriagemSalvaAviso(true);
    setTimeout(() => setTriagemSalvaAviso(false), 5000);
    alert("Resultados confirmados! A triagem e ranking automático de ganhadores foram atualizados com sucesso.");
  };

  // =========================================================================
  // TRIAGEM AUTOMÁTICA DE APOSTAS & RANKING DE GANHADORES
  // =========================================================================
  const calcularTriagem = () => {
    const jogosEncerrados = jogosPublicados.filter((j) => j.resultadoOficial);

    const ranking = jogadores.map((jg) => {
      const apostasJogador = palpites.filter((p) => p.jogadorEmail === jg.email);
      const isPago =
        jg.status_pagamento === "pago" ||
        jg.aprovado === true ||
        jg.statusPagamento === "APROVADO" ||
        apostasJogador.some((p) => p.pago);

      let pontos = 0;
      let totalApostas = apostasJogador.length;

      apostasJogador.forEach((p) => {
        const jgCorrespondente = jogosPublicados.find((j) => j.id === p.jogoId);
        if (jgCorrespondente && jgCorrespondente.resultadoOficial) {
          if (p.escolha === jgCorrespondente.resultadoOficial) {
            pontos += 1;
          }
        }
      });

      return {
        ...jg,
        pontos,
        totalApostas,
        isPago,
        apostas: apostasJogador,
      };
    });

    // Ordenação: 1º por pontos (maior para menor), depois por pagos primeiro
    ranking.sort((a, b) => {
      if (b.pontos !== a.pontos) return b.pontos - a.pontos;
      if (a.isPago && !b.isPago) return -1;
      if (!a.isPago && b.isPago) return 1;
      return a.nome.localeCompare(b.nome);
    });

    return { ranking, totalJogosEncerrados: jogosEncerrados.length };
  };

  const { ranking: rankingGanhadores, totalJogosEncerrados } = calcularTriagem();

  // Cálculos Financeiros & Contabilizador de Depósitos (lendo valorCota dinâmico de config/bolao)
  const valorParsedConfig = parseFloat(String(config.valorCota ?? config.valor ?? valorPixAtual ?? 10).replace(",", "."));
  const valorCotaNumerico = !isNaN(valorParsedConfig) && valorParsedConfig > 0 ? valorParsedConfig : (Number(valorPixAtual) || 10);
  const payloadPixRender =
    payloadPixAtual ||
    gerarPayloadPix("f0e74d2a-d610-4b76-842e-8b7e1a08047d", valorCotaNumerico, "IRAILSON DA SILVA", "ITABUNA");
  const jogadoresPagosLista = jogadores.filter(
    (jg: any) =>
      jg.status_pagamento === "pago" ||
      jg.aprovado === true ||
      jg.statusPagamento === "APROVADO" ||
      palpites.some((p: any) => p.jogadorEmail === jg.email && p.pago)
  );
  const jogadoresEmAnaliseLista = jogadores.filter(
    (jg: any) =>
      jg.statusPagamento === "EM_ANALISE" &&
      !jogadoresPagosLista.some((ap: any) => ap.email === jg.email)
  );

  // Depósitos confirmados na coleção depositos + jogadores aprovados
  const depositosConfirmadosColecao = depositos.filter(
    (d: any) => d.status === "CONFIRMADO" || d.status === "APROVADO"
  );

  // Lista de depósitos recentes (Confirmados + Sendo Depositados) para o Contabilizador do Jogador
  const movDepositosBase = [
    ...depositosConfirmadosColecao.map((d: any) => ({
      nome: d.nome || user?.nome || "Inho",
      email: d.email || user?.email || d.userId || "inho",
      userId: d.userId || d.id,
      status: "APROVADO" as const,
      valor: Number(d.valor) || valorCotaNumerico,
      horario: "Confirmado via PIX",
      ordem: Date.now() + 10,
    })),
    ...jogadoresEmAnaliseLista.map((jg: any) => ({
      nome: jg.nome || "Jogador",
      email: jg.email,
      userId: jg.id || getJogadorDocId(jg.email || ""),
      status: "EM_ANALISE" as const,
      valor: valorCotaNumerico,
      horario: jg.dataEnvioComprovante || "Agora mesmo",
      ordem: jg.timestampComprovante || Date.now(),
    })),
    ...jogadoresPagosLista
      .filter(
        (jg: any) =>
          !depositosConfirmadosColecao.some(
            (d: any) =>
              d.userId === (jg.id || getJogadorDocId(jg.email || "")) ||
              (d.email && jg.email && d.email.toLowerCase() === jg.email.toLowerCase())
          )
      )
      .map((jg: any) => ({
        nome: jg.nome || "Jogador",
        email: jg.email,
        userId: jg.id || getJogadorDocId(jg.email || ""),
        status: "APROVADO" as const,
        valor: valorCotaNumerico,
        horario: jg.dataAprovacao ? `Aprovado às ${jg.dataAprovacao}` : "Confirmado",
        ordem: (jg.timestampComprovante || 0) + 1,
      })),
  ].sort((a, b) => b.ordem - a.ordem);

  const movDepositos =
    movDepositosBase.length > 0
      ? movDepositosBase
      : pagamentoConfirmadoLocal
      ? [
          {
            nome: user?.nome || "Inho",
            email: user?.email || "inhobahia29@gmail.com",
            userId: auth.currentUser?.uid || "inho_jogador",
            status: "APROVADO" as const,
            valor: valorCotaNumerico,
            horario: "Confirmado via PIX",
            ordem: Date.now(),
          },
        ]
      : [];

  const depositosConfirmadosLista = movDepositos.filter((dep) => dep.status === "APROVADO");
  const depositosEmAnaliseMovLista = movDepositos.filter((dep) => dep.status === "EM_ANALISE");

  const pagos = Math.max(depositosConfirmadosLista.length, pagamentoConfirmadoLocal ? 1 : 0);
  const emAnaliseCount = depositosEmAnaliseMovLista.length;
  const total =
    depositosConfirmadosLista.length > 0
      ? depositosConfirmadosLista.reduce((acc, dep) => acc + (Number(dep.valor) || valorCotaNumerico), 0)
      : pagamentoConfirmadoLocal
      ? valorCotaNumerico
      : 0;
  const totalSendoDepositado = depositosEmAnaliseMovLista.reduce((acc, dep) => acc + (Number(dep.valor) || valorCotaNumerico), 0);
  const totalGeralDepositos = total + totalSendoDepositado;
  const banca20 = total * 0.2;
  const premio80 = total * 0.8;

  // Prêmios individuais
  const premio1 = premio80 * 0.5;
  const premio2 = premio80 * 0.3;
  const premio3 = premio80 * 0.2;

  const somaConfirmadosMovimentacao = depositosConfirmadosLista.reduce(
    (acc, dep) => acc + (Number(dep.valor) || valorCotaNumerico),
    0
  );

  const isDepositoConfirmado = Boolean(
    pagamentoConfirmadoLocal ||
      somaConfirmadosMovimentacao > 0 ||
      user?.status_pagamento === "pago" ||
      user?.aprovado === true ||
      user?.statusPagamento === "APROVADO" ||
      (user && palpites.some((p: any) => (p.jogadorEmail || "").toLowerCase() === (user.email || "").toLowerCase() && p.pago))
  );

  const meuStatusDeposito = isDepositoConfirmado
    ? "APROVADO"
    : user?.statusPagamento === "EM_ANALISE"
    ? "EM_ANALISE"
    : "APROVADO";

  const valorMeuDepositoExibido =
    somaConfirmadosMovimentacao > 0 ? somaConfirmadosMovimentacao : valorCotaNumerico;

  const nomePrimeiroJogador = user?.nome?.split(" ")[0] || "Inho";

  const ModalPixDireto = () => {
    if (!modalPixAberto) return null;
    return (
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-zinc-900 border-2 border-[#FF6B00] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-center">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="text-left">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#FF6B00] block">
                PIX DIRETO • VALOR R$ {valorCotaNumerico.toFixed(2).replace(".", ",")}
              </span>
              <h3 className="text-lg font-black text-white">Pagar PIX Agora (R$ {valorCotaNumerico})</h3>
            </div>
            <button
              type="button"
              onClick={() => setModalPixAberto(false)}
              className="text-zinc-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="bg-green-950/70 border border-green-600/80 text-green-300 px-3 py-2 rounded-xl text-xs font-black">
            PIX vai para InfinitePay - conta separada
          </div>

          {/* QR Code gerado com qrcode.react */}
          <div className="bg-white p-4 rounded-2xl w-fit mx-auto shadow-lg border-4 border-[#FF6B00]/40">
            <QRCodeSVG value={payloadPixRender} size={210} level="M" includeMargin={false} />
          </div>

          <div className="text-[11px] text-zinc-400">
            Chave Aleatória: <strong className="text-white font-mono select-all">{CHAVE_PIX_ALEATORIA}</strong>
          </div>

          {/* Campo Copia e Cola com botão COPIAR */}
          <div className="bg-black p-3 rounded-xl border border-zinc-800 text-left space-y-2">
            <label className="block text-[10px] text-zinc-400 uppercase font-black">
              PIX Copia e Cola (R$ {valorCotaNumerico.toFixed(2).replace(".", ",")}):
            </label>
            <input
              type="text"
              readOnly
              value={payloadPixRender}
              className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-[11px] text-zinc-200 font-mono outline-none select-all"
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(payloadPixRender);
                setCopiadoPix(true);
                setTimeout(() => setCopiadoPix(false), 3000);
              }}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-[#FF6B00] border border-[#FF6B00]/50 font-black py-2.5 rounded-xl text-xs uppercase tracking-wider cursor-pointer transition"
            >
              {copiadoPix ? "✅ CÓDIGO PIX COPIADO!" : "📋 COPIAR"}
            </button>
          </div>

          {/* Botão JÁ PAGUEI */}
          <button
            type="button"
            disabled={confirmandoJaPaguei}
            onClick={confirmarJaPaguei}
            className="w-full bg-green-500 hover:bg-green-400 text-black font-black py-4 rounded-xl text-sm uppercase tracking-wider cursor-pointer transition shadow-lg shadow-green-500/30 flex items-center justify-center gap-2"
          >
            <span>✅</span>
            <span>{confirmandoJaPaguei ? "CONFIRMANDO..." : "JÁ PAGUEI"}</span>
          </button>
        </div>
      </div>
    );
  };

  const ContabilizadorDepositosJogador = ({ mostrarBotaoDepositar = true }: { mostrarBotaoDepositar?: boolean }) => (
    <div className="mt-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3.5 shadow-xl">
      {/* Cabeçalho do Contabilizador */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-[#FF6B00]/15 border border-[#FF6B00]/40 flex items-center justify-center text-base">
            💰
          </span>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              Contabilizador de Depósitos
              <span className="inline-flex items-center gap-1 text-[9px] bg-green-950 text-green-400 border border-green-700/80 px-2 py-0.5 rounded-full font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse"></span>
                AO VIVO
              </span>
            </h3>
            <p className="text-[10px] text-zinc-400">
              Acompanhe em tempo real quanto está sendo depositado na rodada
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] text-zinc-500 uppercase font-bold">Valor da Cota</div>
          <div className="text-sm font-black text-[#FF6B00]">R$ {valorCotaNumerico.toFixed(2)}</div>
        </div>
      </div>

      {/* Cards Principais de Valores Depositados */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-black/80 border border-green-800/60 p-3 rounded-xl">
          <div className="text-[9px] text-green-400 uppercase font-black flex items-center gap-1">
            <span>✅</span> Depositado
          </div>
          <div className="text-base sm:text-lg font-black text-white mt-0.5">
            R$ {total.toFixed(2)}
          </div>
          <div className="text-[10px] text-zinc-400 font-bold">
            {pagos} {pagos === 1 ? "cota paga" : "cotas pagas"}
          </div>
        </div>

        <div className="bg-black/80 border border-amber-700/60 p-3 rounded-xl">
          <div className="text-[9px] text-amber-400 uppercase font-black flex items-center gap-1">
            <span className="animate-pulse">⏳</span> Entrando Agora
          </div>
          <div className="text-base sm:text-lg font-black text-amber-300 mt-0.5">
            R$ {totalSendoDepositado.toFixed(2)}
          </div>
          <div className="text-[10px] text-zinc-400 font-bold">
            {emAnaliseCount} em análise
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#FF6B00]/20 via-black to-black border border-[#FF6B00]/50 p-3 rounded-xl">
          <div className="text-[9px] text-[#FF6B00] uppercase font-black flex items-center gap-1">
            <span>🏆</span> Prêmio (80%)
          </div>
          <div className="text-base sm:text-lg font-black text-[#FF6B00] mt-0.5">
            R$ {premio80.toFixed(2)}
          </div>
          <div className="text-[10px] text-zinc-400 font-bold">
            Total: R$ {totalGeralDepositos.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Rateio Acumulado de Prêmios em Tempo Real */}
      <div className="bg-black/60 border border-zinc-800/90 rounded-xl p-2.5 grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-[9px] text-zinc-400 font-bold uppercase">🥇 1º Lugar (50%)</div>
          <div className="text-xs sm:text-sm font-black text-amber-400">R$ {premio1.toFixed(2)}</div>
        </div>
        <div className="border-x border-zinc-800">
          <div className="text-[9px] text-zinc-400 font-bold uppercase">🥈 2º Lugar (30%)</div>
          <div className="text-xs sm:text-sm font-black text-zinc-200">R$ {premio2.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-[9px] text-zinc-400 font-bold uppercase">🥉 3º Lugar (20%)</div>
          <div className="text-xs sm:text-sm font-black text-amber-600">R$ {premio3.toFixed(2)}</div>
        </div>
      </div>

      {/* Status do Depósito Individual do Jogador Conectado */}
      <div className="p-3 rounded-xl border bg-green-950/50 border-green-600/80 text-green-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-base">✅</span>
          <div>
            <div className="font-black text-white">
              Seu Depósito ({nomePrimeiroJogador}):{" "}
              <span className="text-green-400">
                R$ {valorMeuDepositoExibido.toFixed(2).replace(".", ",")}
              </span>
            </div>
            <div className="text-[10px] text-green-300/90">
              {isDepositoConfirmado
                ? "Depósito confirmado! Sua aposta e participação estão liberadas."
                : "PIX vai para InfinitePay - conta separada (Chave Aleatória)."}
            </div>
          </div>
        </div>

        {mostrarBotaoDepositar && (
          <button
            type="button"
            onClick={abrirModalPixDireto}
            className="bg-[#FF6B00] hover:bg-[#ff7b1a] text-black font-black px-3 py-2 rounded-lg text-[10px] uppercase tracking-wider cursor-pointer shrink-0 transition shadow"
          >
            PAGAR PIX AGORA (R$ {valorCotaNumerico})
          </button>
        )}
      </div>

      {/* Movimentação de Depósitos Recentes */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold uppercase">
          <span>📊 Movimentação de Depósitos ({movDepositos.length})</span>
          <span>Atualização Automática</span>
        </div>

        {movDepositos.length === 0 ? (
          <div className="bg-black/50 border border-dashed border-zinc-800 rounded-xl p-2.5 text-center text-[11px] text-zinc-500">
            Nenhum depósito contabilizado ainda nesta rodada. Seja o primeiro a depositar!
          </div>
        ) : (
          <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
            {movDepositos.map((dep, i) => (
              <div
                key={`${dep.email}-${i}`}
                className="bg-black/70 border border-zinc-800/90 px-3 py-2 rounded-lg flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs">
                    {dep.status === "APROVADO" ? "🟢" : "🟡"}
                  </span>
                  <div className="truncate">
                    <span className="font-bold text-white">{dep.nome}</span>
                    {user?.email === dep.email && (
                      <span className="ml-1.5 text-[9px] bg-[#FF6B00] text-black font-black px-1.5 py-0.5 rounded">
                        VOCÊ
                      </span>
                    )}
                    <div className="text-[10px] text-zinc-500">{dep.horario}</div>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-2">
                  <div
                    className={`font-black text-xs ${
                      dep.status === "APROVADO" ? "text-green-400" : "text-amber-300"
                    }`}
                  >
                    + R$ {dep.valor.toFixed(2)}
                  </div>
                  <div className="text-[9px] uppercase font-bold text-zinc-400">
                    {dep.status === "APROVADO" ? "Confirmado" : "Depositando..."}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const salvarPalpitesTemporariosSeHouver = async () => {
    if (!user) return;
    const jogosComPalpite = jogosPublicados.filter((j) => Boolean(getEscolhaDoJogo(j)));
    if (jogosComPalpite.length === 0) return;

    const jaPago =
      !modoNovaAposta &&
      Boolean(
        isDepositoConfirmado ||
          user.status_pagamento === "pago" ||
          user.aprovado === true ||
          user.statusPagamento === "APROVADO"
      );

    const novosPalpites: Palpite[] = jogosComPalpite.map((j) => ({
      jogadorEmail: user.email,
      jogoId: j.id,
      escolha: getEscolhaDoJogo(j)!,
      pago: jaPago,
    }));

    const outros = palpites.filter((p) => p.jogadorEmail !== user.email);
    const todos = [...outros, ...novosPalpites];
    setPalpites(todos);
    localStorage.setItem("elite_palpites_v11", JSON.stringify(todos));
    setModoNovaAposta(false);

    for (const np of novosPalpites) {
      await upsertPalpiteInDb(np).catch(() => {});
    }
  };

  const BotoesPagamentoDuplo = ({ validarPalpitesAntes = false }: { validarPalpitesAntes?: boolean }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-left">
      {/* CAIXA 1: BOTÃO 1 VERDE - PIX DIRETO + ENVIAR COMPROVANTE */}
      <div className="bg-zinc-950 border-2 border-green-600/80 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-lg shadow-green-950/30">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider bg-green-500/20 text-green-400 border border-green-500/40 px-2.5 py-0.5 rounded-full">
              Opção 1 • PIX Manual
            </span>
            <span className="text-sm font-black text-green-400">R$ 10</span>
          </div>

          <button
            type="button"
            onClick={async () => {
              if (validarPalpitesAntes) {
                if (!user) {
                  setPage("loginJogador");
                  return;
                }
                const jogosComPalpite = jogosPublicados.filter((j) => Boolean(getEscolhaDoJogo(j)));
                if (jogosComPalpite.length === 0 && meusPalpitesSalvos.length === 0) {
                  alert("Selecione seus palpites nos jogos da rodada antes de pagar!");
                  return;
                }
                await salvarPalpitesTemporariosSeHouver();
              }
              await acionarPixDireto();
            }}
            className="w-full bg-green-600 hover:bg-green-500 text-black font-black py-3.5 px-3 rounded-xl cursor-pointer transition text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-green-600/25 flex items-center justify-center gap-1.5 text-center"
          >
            <span>💠</span>
            <span>PAGAR NO PIX DIRETO - R$10</span>
          </button>

          {copiadoPix && (
            <div className="bg-green-950 border border-green-600 text-green-300 text-[11px] font-bold px-2.5 py-1.5 rounded-lg text-center">
              ✅ PIX Copia e Cola copiado! Escaneie o QR abaixo ou cole no seu banco.
            </div>
          )}

          {mostrarQrPixDireto && (
            <div className="bg-black/90 border border-green-700/60 rounded-xl p-3 space-y-2 text-center animate-fade-in">
              <div className="bg-white p-2.5 rounded-xl w-fit mx-auto">
                <QRCodeSVG value={payloadPixRender} size={150} level="M" includeMargin={false} />
              </div>
              <input
                type="text"
                readOnly
                value={payloadPixRender}
                className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 rounded text-[10px] text-zinc-200 font-mono outline-none select-all"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(payloadPixRender);
                  setCopiadoPix(true);
                  setTimeout(() => setCopiadoPix(false), 3000);
                }}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-green-400 border border-green-600/50 font-black py-1.5 rounded-lg text-[10px] uppercase cursor-pointer"
              >
                {copiadoPix ? "✅ COPIADO!" : "📋 COPIAR PIX COPIA E COLA"}
              </button>
            </div>
          )}

          {/* Botão ENVIAR COMPROVANTE logo abaixo */}
          <label className="w-full bg-zinc-900 hover:bg-zinc-800 border-2 border-green-500/70 text-green-400 hover:text-green-300 font-black py-3 px-3 rounded-xl cursor-pointer transition text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 text-center shadow">
            <span>📤</span>
            <span>{enviandoComprovantePix ? "ENVIANDO COMPROVANTE..." : "ENVIAR COMPROVANTE"}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleUploadComprovanteApi(file);
                  e.target.value = "";
                }
              }}
            />
          </label>

          {comprovanteEnviadoAviso && (
            <div className="bg-green-950/90 border border-green-500 text-green-200 text-[11px] font-bold p-2 rounded-lg text-center">
              ✅ Comprovante enviado para a sua área no ADM!
            </div>
          )}
        </div>

        <div className="bg-green-950/40 border border-green-800/60 rounded-xl px-3 py-2 text-[11px] text-green-300 font-bold text-center">
          Envie comprovante e aguarde ADM 5 min
        </div>
      </div>

      {/* CAIXA 2: BOTÃO 2 LARANJA - CHECKOUT INTEGRADO INFINITEPAY */}
      <div className="bg-zinc-950 border-2 border-[#FF6B00]/80 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-lg shadow-[#FF6B00]/10">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/40 px-2.5 py-0.5 rounded-full">
              Opção 2 • Checkout Integrado
            </span>
            <span className="text-sm font-black text-[#FF6B00]">R$ 10</span>
          </div>

          <button
            type="button"
            disabled={carregandoInfinitePay}
            onClick={async () => {
              if (validarPalpitesAntes) {
                if (!user) {
                  setPage("loginJogador");
                  return;
                }
                const jogosComPalpite = jogosPublicados.filter((j) => Boolean(getEscolhaDoJogo(j)));
                if (jogosComPalpite.length === 0 && meusPalpitesSalvos.length === 0) {
                  alert("Selecione seus palpites nos jogos da rodada antes de pagar!");
                  return;
                }
                await salvarPalpitesTemporariosSeHouver();
              }
              await abrirLinkPagamentoInfinitePay();
            }}
            className="w-full bg-[#FF6B00] hover:bg-[#ff7b1a] text-black font-black py-3.5 px-3 rounded-xl cursor-pointer transition text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-[#FF6B00]/25 flex items-center justify-center gap-1.5 text-center"
          >
            <span>⚡</span>
            <span>
              {carregandoInfinitePay
                ? "ABRINDO INFINITEPAY..."
                : "PAGAR AUTOMÁTICO E LIBERAR NA HORA - R$10"}
            </span>
          </button>

          <div className="text-[11px] text-zinc-400 leading-relaxed text-center pt-1">
            Abre o Checkout Integrado InfinitePay já com seus dados de jogador logado.
          </div>
        </div>

        <div className="bg-[#FF6B00]/15 border border-[#FF6B00]/50 rounded-xl px-3 py-2 text-[11px] text-[#FF6B00] font-bold text-center">
          Liberação automática em 30s, sem cadastro, sem comprovante
        </div>
      </div>
    </div>
  );

  // Painel da Área de Transparência visível automaticamente para todos os jogadores
  const PainelTransparenciaJogadores = () => (
    <div className="mt-4 bg-gradient-to-b from-emerald-950/50 via-zinc-900 to-zinc-950 border-2 border-emerald-500/60 p-4 rounded-2xl space-y-3 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/60 flex items-center justify-center text-lg shrink-0">
            🛡️
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-black px-2 py-0.5 rounded">
                100% TRANSPARÊNCIA
              </span>
              <span className="text-[10px] text-emerald-400 font-bold">
                • Conferência Oficial dos Jogadores
              </span>
            </div>
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white mt-0.5">
              Área de Transparência • Pagamento da Premiação ({comprovantesPremiacao.length})
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setModalTransparenciaAberto(true)}
          className="bg-emerald-500 hover:bg-emerald-400 text-black font-black px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-wider cursor-pointer transition shrink-0 shadow"
        >
          🔍 Ver Todos ({comprovantesPremiacao.length})
        </button>
      </div>

      <p className="text-[11px] text-zinc-300 leading-relaxed">
        Assim que o ADM realiza o pagamento dos ganhadores, os comprovantes PIX da premiação aparecem automaticamente aqui para conferência de todos os participantes.
      </p>

      {comprovantesPremiacao.length === 0 ? (
        <div className="bg-black/60 border border-dashed border-zinc-800 rounded-xl p-3.5 text-center text-xs text-zinc-400">
          ⏳ Aguardando envio dos comprovantes de pagamento da premiação desta rodada pelo ADM.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {comprovantesPremiacao.slice(0, 4).map((comp) => (
            <div
              key={comp.id}
              className="bg-black/80 border border-emerald-500/40 hover:border-emerald-400 rounded-xl p-3 flex items-center justify-between gap-3 transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => setComprovantePremiacaoZoom(comp)}
                  className="relative w-14 h-14 rounded-lg overflow-hidden border border-emerald-500/60 bg-zinc-900 shrink-0 cursor-pointer group"
                  title="Clique para ampliar o comprovante"
                >
                  <img
                    src={comp.imagemComprovante}
                    alt={comp.ganhadorNome}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs text-white font-bold">
                    🔍
                  </div>
                </button>
                <div className="min-w-0">
                  <span className="text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded inline-block">
                    {comp.colocacao}
                  </span>
                  <div className="font-black text-xs text-white truncate mt-0.5">
                    🏆 {comp.ganhadorNome}
                  </div>
                  <div className="text-xs font-black text-emerald-400">
                    Prêmio Pago: R$ {Number(comp.valorPago || 0).toFixed(2).replace(".", ",")}
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate">{comp.dataEnvio}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setComprovantePremiacaoZoom(comp)}
                className="bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-600/60 font-black px-2.5 py-2 rounded-lg text-[10px] uppercase cursor-pointer shrink-0 transition"
              >
                🔍 Conferir
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Modal Completo da Área de Transparência + Zoom de Comprovante de Premiação
  const ModalAreaTransparencia = () => (
    <>
      {modalTransparenciaAberto && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 text-left">
          <div className="bg-zinc-900 border-2 border-emerald-500/70 rounded-3xl max-w-2xl w-full p-5 max-h-[88vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🛡️</span>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white uppercase">
                    Área de Transparência • Premiações Pagas
                  </h3>
                  <p className="text-xs text-emerald-400 font-bold">
                    Comprovantes oficiais enviados pelo ADM para simples conferência de todos os jogadores
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalTransparenciaAberto(false)}
                className="text-zinc-400 hover:text-white text-lg font-black p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {comprovantesPremiacao.length === 0 ? (
              <div className="bg-black/60 border border-dashed border-zinc-800 rounded-2xl p-8 text-center space-y-2">
                <div className="text-3xl">🛡️</div>
                <div className="text-sm font-black text-white">
                  Nenhum comprovante de premiação publicado ainda
                </div>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  Assim que o ADM enviar os comprovantes de pagamento da premiação dos vencedores, eles aparecerão aqui instantaneamente para todos os jogadores conferirem.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {comprovantesPremiacao.map((comp) => (
                  <div
                    key={comp.id}
                    className="bg-black border border-emerald-500/40 rounded-2xl p-3.5 space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase bg-emerald-500 text-black px-2 py-0.5 rounded">
                          {comp.colocacao}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">{comp.dataEnvio}</span>
                      </div>

                      <div>
                        <div className="text-sm font-black text-white">🏆 Ganhador: {comp.ganhadorNome}</div>
                        <div className="text-base font-black text-emerald-400">
                          Valor Pago: R$ {Number(comp.valorPago || 0).toFixed(2).replace(".", ",")}
                        </div>
                        {comp.descricao && (
                          <div className="text-[11px] text-zinc-400 mt-0.5">{comp.descricao}</div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setComprovantePremiacaoZoom(comp)}
                        className="w-full h-44 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden flex items-center justify-center cursor-pointer group relative"
                      >
                        <img
                          src={comp.imagemComprovante}
                          alt={`Comprovante ${comp.ganhadorNome}`}
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-xs font-black text-white">
                          🔍 CLIQUE PARA AMPLIAR COMPROVANTE
                        </div>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setComprovantePremiacaoZoom(comp)}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-black font-black py-2.5 rounded-xl text-xs uppercase cursor-pointer transition"
                    >
                      🔍 Ampliar Comprovante p/ Conferência
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setModalTransparenciaAberto(false)}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl text-xs uppercase cursor-pointer transition"
            >
              Fechar Área de Transparência
            </button>
          </div>
        </div>
      )}

      {comprovantePremiacaoZoom && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 text-left">
          <div className="bg-zinc-900 border-2 border-emerald-500 rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase bg-emerald-500 text-black px-2 py-0.5 rounded">
                  {comprovantePremiacaoZoom.colocacao}
                </span>
                <h3 className="text-base font-black text-white mt-1">
                  🏆 Ganhador: {comprovantePremiacaoZoom.ganhadorNome}
                </h3>
                <div className="text-xs font-black text-emerald-400">
                  Valor Pago: R$ {Number(comprovantePremiacaoZoom.valorPago || 0).toFixed(2).replace(".", ",")} •{" "}
                  <span className="text-zinc-400 font-normal">{comprovantePremiacaoZoom.dataEnvio}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setComprovantePremiacaoZoom(null)}
                className="text-zinc-400 hover:text-white text-lg font-black p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {comprovantePremiacaoZoom.descricao && (
              <div className="text-xs text-zinc-300 bg-black/60 border border-zinc-800 p-2.5 rounded-xl">
                {comprovantePremiacaoZoom.descricao}
              </div>
            )}

            <div className="bg-black rounded-2xl p-2 max-h-[60vh] overflow-auto flex items-center justify-center border border-zinc-800">
              <img
                src={comprovantePremiacaoZoom.imagemComprovante}
                alt="Comprovante da Premiação"
                className="w-full h-auto object-contain max-h-[56vh] rounded-lg"
              />
            </div>

            <button
              type="button"
              onClick={() => setComprovantePremiacaoZoom(null)}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-3 rounded-xl text-xs uppercase cursor-pointer transition"
            >
              ✓ Fechar Conferência
            </button>
          </div>
        </div>
      )}
    </>
  );

  // Dados das apostas salvas do jogador conectado
  const meusPalpitesSalvos = user
    ? palpites.filter((p) => (p.jogadorEmail || "").toLowerCase() === (user.email || "").toLowerCase())
    : [];
  const isMinhaApostaAprovada = Boolean(
    isDepositoConfirmado ||
      (user &&
        (user.status_pagamento === "pago" ||
          user.aprovado === true ||
          user.statusPagamento === "APROVADO" ||
          meusPalpitesSalvos.some((p) => p.pago)))
  );
  const codigoAutenticidadeJogador = user
    ? `ELITE-${(user.nome || "JG")
        .replace(/[^a-zA-Z]/g, "")
        .slice(0, 3)
        .toUpperCase()}-${(user.email || "000")
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(0, 4)
        .toUpperCase()}-${String(meusPalpitesSalvos.length).padStart(2, "0")}`
    : "ELITE-0000";

  const meusPontosAtuais = meusPalpitesSalvos.reduce((acc, ap) => {
    const jgMatch = jogos.find((j) => j.id === ap.jogoId);
    if (jgMatch?.resultadoOficial && jgMatch.resultadoOficial === ap.escolha) {
      return acc + 1;
    }
    return acc;
  }, 0);

  const minhasApostasGanhas = meusPalpitesSalvos.filter((ap) => {
    const jgMatch = jogos.find((j) => j.id === ap.jogoId);
    return Boolean(jgMatch?.resultadoOficial && jgMatch.resultadoOficial === ap.escolha);
  }).length;

  const minhasApostasPerdidas = meusPalpitesSalvos.filter((ap) => {
    const jgMatch = jogos.find((j) => j.id === ap.jogoId);
    return Boolean(jgMatch?.resultadoOficial && jgMatch.resultadoOficial !== ap.escolha);
  }).length;

  const AreaMinhasApostas = ({ modoCompacto = false }: { modoCompacto?: boolean }) => {
    if (!user) return null;

    return (
      <div className="mt-4 bg-zinc-900 border-2 border-[#FF6B00]/60 rounded-2xl p-4 space-y-4 shadow-2xl">
        {/* Cabeçalho Geral do Bilhete Oficial do Jogador */}
        <div className="bg-gradient-to-r from-[#FF6B00]/20 via-black to-black border border-[#FF6B00]/40 rounded-xl p-3.5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
            <div className="flex items-center gap-2.5">
              <img src={logoBolao} alt="Logo" className="w-9 h-9 object-contain rounded-lg border border-[#FF6B00]/40" />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#FF6B00]">
                    🎫 ÁREA MINHAS APOSTAS • COMPROVANTE DE TITULARIDADE
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                  Apostador: {user.nome}
                </h3>
              </div>
            </div>

            <div className="flex flex-col items-end">
              <span
                className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase border ${
                  isMinhaApostaAprovada
                    ? "bg-green-500 text-black border-green-400 shadow-md shadow-green-500/20"
                    : user.statusPagamento === "EM_ANALISE"
                    ? "bg-amber-500 text-black border-amber-400"
                    : "bg-zinc-800 text-zinc-300 border-zinc-700"
                }`}
              >
                {isMinhaApostaAprovada
                  ? "✅ APROVADA PELO ADM"
                  : user.statusPagamento === "EM_ANALISE"
                  ? "⏳ EM ANÁLISE NO ADM"
                  : "⚪ AGUARDANDO PAGAMENTO"}
              </span>
              <span className="text-[10px] font-mono text-zinc-400 mt-1">
                ID: <strong className="text-white">{codigoAutenticidadeJogador}</strong>
              </span>
            </div>
          </div>

          {/* Dados Completos do Jogador para Comprovação */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-black/70 p-2.5 rounded-lg border border-zinc-800">
            <div>
              <span className="text-[9px] text-zinc-500 uppercase font-bold block">Nome do Jogador</span>
              <span className="font-black text-white">{user.nome}</span>
            </div>
            <div>
              <span className="text-[9px] text-zinc-500 uppercase font-bold block">E-mail Registrado</span>
              <span className="font-mono text-zinc-200 font-bold break-all">{user.email}</span>
            </div>
            <div>
              <span className="text-[9px] text-zinc-500 uppercase font-bold block">Chave PIX do Jogador</span>
              <span className="font-mono text-[#FF6B00] font-black break-all">{user.pix}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-300 pt-0.5">
            <span>
              📋 Times Selecionados: <strong className="text-white">{meusPalpitesSalvos.length} confronto(s)</strong>
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-green-950/90 border border-green-600 text-green-300 font-black px-2.5 py-0.5 rounded-lg">
                ✅ GANHOU: {minhasApostasGanhas}
              </span>
              <span className="bg-red-950/90 border border-red-600 text-red-300 font-black px-2.5 py-0.5 rounded-lg">
                ❌ PERDEU: {minhasApostasPerdidas}
              </span>
              <span className="bg-zinc-900 border border-zinc-700 text-[#FF6B00] font-black px-2.5 py-0.5 rounded-lg">
                🏆 {meusPontosAtuais} pt(s)
              </span>
            </div>
            {user.dataAprovacao && (
              <span className="text-green-400 font-bold">
                ✓ Validado pelo ADM às {user.dataAprovacao}
              </span>
            )}
          </div>
        </div>

        {/* Lista de Apostas Individuais (Com Dados do Jogador no Topo de CADA Aposta) */}
        {meusPalpitesSalvos.length === 0 ? (
          <div className="bg-black/60 border border-dashed border-zinc-800 rounded-xl p-6 text-center space-y-2">
            <div className="text-2xl">⚽</div>
            <div className="text-xs font-bold text-white">
              Você ainda não enviou seus palpites nesta rodada
            </div>
            <p className="text-[11px] text-zinc-400">
              Selecione os times nos confrontos e clique em "Enviar Apostas & Pagar" para gerar seus bilhetes oficiais.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-black uppercase text-[#FF6B00] tracking-wider">
                📌 Seus Times Selecionados ({meusPalpitesSalvos.length} Apostas)
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={iniciarNovaAposta}
                  className="text-[11px] bg-green-600 hover:bg-green-500 text-black font-black px-3 py-1 rounded-lg cursor-pointer transition shadow-md flex items-center gap-1"
                >
                  <span>➕</span> Fazer Nova Aposta
                </button>
                {modoCompacto && (
                  <button
                    type="button"
                    onClick={() => setPage("minhasApostas")}
                    className="text-[11px] bg-[#FF6B00] hover:bg-[#ff7b1a] text-black font-black px-3 py-1 rounded-lg cursor-pointer transition"
                  >
                    🔍 Abrir Tela Cheia p/ Print
                  </button>
                )}
              </div>
            </div>

            {meusPalpitesSalvos.map((ap, idx) => {
              const match = jogos.find((j) => j.id === ap.jogoId);
              if (!match) return null;

              const timeSelecionadoNome =
                ap.escolha === "CASA"
                  ? match.casa
                  : ap.escolha === "FORA"
                  ? match.fora
                  : "EMPATE";
              const escudoSelecionado =
                ap.escolha === "CASA"
                  ? match.escudoCasa
                  : ap.escolha === "FORA"
                  ? match.escudoFora
                  : undefined;

              const acertou = Boolean(match.resultadoOficial && match.resultadoOficial === ap.escolha);
              const errou = Boolean(match.resultadoOficial && match.resultadoOficial !== ap.escolha);
              const textoResultadoOficial = match.resultadoOficial
                ? match.resultadoOficial === "CASA"
                  ? `Vitória do ${match.casa}`
                  : match.resultadoOficial === "FORA"
                  ? `Vitória do ${match.fora}`
                  : "Empate"
                : null;

              return (
                <div
                  key={ap.jogoId}
                  className={`rounded-2xl border-2 overflow-hidden shadow-lg transition ${
                    acertou
                      ? "bg-gradient-to-b from-green-950/30 to-black border-green-500 shadow-green-500/10"
                      : errou
                      ? "bg-gradient-to-b from-red-950/30 to-black border-red-600 shadow-red-600/10"
                      : isMinhaApostaAprovada
                      ? "bg-black border-green-700/70"
                      : "bg-black border-zinc-800"
                  }`}
                >
                  {/* TOPO DE CADA APOSTA: DADOS DO JOGADOR PARA COMPROVAR QUE É DELE + SINALIZAÇÃO GANHOU / PERDEU */}
                  <div className="bg-zinc-950 border-b border-zinc-800 px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] bg-[#FF6B00] text-black font-black px-2 py-0.5 rounded uppercase">
                          Aposta #{idx + 1}
                        </span>
                        <span className="text-xs font-black text-white">
                          👤 {user.nome}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400">
                          ({user.email})
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-400 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <span>
                          PIX do Titular: <strong className="text-[#FF6B00] font-mono">{user.pix}</strong>
                        </span>
                        <span>
                          Bilhete: <strong className="text-zinc-300 font-mono">{codigoAutenticidadeJogador}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      {acertou && (
                        <span className="text-[10px] bg-green-500 text-black font-black px-2.5 py-1 rounded-full uppercase shadow-md shadow-green-500/30 flex items-center gap-1">
                          <span>✅</span> GANHOU
                        </span>
                      )}
                      {errou && (
                        <span className="text-[10px] bg-red-600 text-white font-black px-2.5 py-1 rounded-full uppercase shadow-md shadow-red-600/30 flex items-center gap-1">
                          <span>❌</span> PERDEU
                        </span>
                      )}
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase border ${
                          isMinhaApostaAprovada
                            ? "bg-green-950 text-green-400 border-green-600"
                            : user.statusPagamento === "EM_ANALISE"
                            ? "bg-amber-950 text-amber-300 border-amber-600"
                            : "bg-zinc-900 text-zinc-400 border-zinc-700"
                        }`}
                      >
                        {isMinhaApostaAprovada
                          ? "✓ APROVADA PELO ADM"
                          : user.statusPagamento === "EM_ANALISE"
                          ? "⏳ EM ANÁLISE"
                          : "PENDENTE"}
                      </span>
                    </div>
                  </div>

                  {/* CORPO DA APOSTA: CONFRONTO E TIME SELECIONADO */}
                  <div className="p-3.5 space-y-3">
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold uppercase">
                      <span>Confronto #{idx + 1} • {match.data}</span>
                      <span>🏟️ {match.estadio}</span>
                    </div>

                    {/* Placar Ao Vivo / Confronto */}
                    <div className="flex items-center justify-between gap-2 bg-zinc-900/70 p-2.5 rounded-xl border border-zinc-800/80">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Escudo src={match.escudoCasa} nome={match.casa} size={32} />
                        <span className="font-bold text-xs text-white truncate">{match.casa}</span>
                      </div>
                      <div className="flex flex-col items-center shrink-0 px-2">
                        {match.aoVivo && (
                          <span className="text-[9px] bg-red-600 text-white font-black px-1.5 py-0.5 rounded animate-pulse mb-0.5">
                            🔴 AO VIVO {match.tempoJogo ? `• ${match.tempoJogo}` : ""}
                          </span>
                        )}
                        {!match.aoVivo && match.encerrado && (
                          <span className="text-[9px] bg-zinc-800 text-zinc-300 font-black px-1.5 py-0.5 rounded mb-0.5">
                            🏁 FIM
                          </span>
                        )}
                        {match.placarCasa !== undefined && match.placarFora !== undefined ? (
                          <div className="bg-black border border-zinc-700 px-2.5 py-1 rounded-lg font-mono text-xs font-black text-white flex items-center gap-1.5">
                            <span>{match.placarCasa}</span>
                            <span className="text-[#FF6B00]">x</span>
                            <span>{match.placarFora}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-black text-zinc-500 px-1">VS</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                        <span className="font-bold text-xs text-white truncate text-right">{match.fora}</span>
                        <Escudo src={match.escudoFora} nome={match.fora} size={32} />
                      </div>
                    </div>

                    {/* Destaque do Time Selecionado pelo Jogador + Sinalização GANHOU / PERDEU */}
                    <div
                      className={`p-3 rounded-xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                        acertou
                          ? "bg-green-950/60 border-green-500 text-green-100"
                          : errou
                          ? "bg-red-950/60 border-red-600 text-red-100"
                          : "bg-[#FF6B00]/15 border-[#FF6B00] text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {ap.escolha === "EMPATE" ? (
                          <div className="w-9 h-9 rounded-full bg-[#FF6B00] text-black font-black text-xs flex items-center justify-center shrink-0">
                            X
                          </div>
                        ) : (
                          <Escudo src={escudoSelecionado} nome={timeSelecionadoNome} size={36} />
                        )}
                        <div>
                          <div className="text-[9px] uppercase font-black tracking-wider text-[#FF6B00]">
                            Time / Palpite Selecionado por {user.nome?.split(" ")[0]}:
                          </div>
                          <div className="text-sm font-black text-white">
                            {ap.escolha === "EMPATE"
                              ? "EMPATE NO JOGO (COLUNA DO MEIO)"
                              : `VITÓRIA DO ${timeSelecionadoNome.toUpperCase()}`}
                          </div>
                          {textoResultadoOficial && (
                            <div className="text-[10px] mt-0.5 font-bold opacity-90">
                              Resultado Oficial da Partida: <span className="underline">{textoResultadoOficial}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {acertou ? (
                          <div className="bg-green-500 text-black font-black text-xs px-3.5 py-2 rounded-xl uppercase shadow-lg shadow-green-500/30 flex items-center justify-center gap-1.5">
                            <span>✅</span>
                            <span>GANHOU (+1 PT)</span>
                          </div>
                        ) : errou ? (
                          <div className="bg-red-600 text-white font-black text-xs px-3.5 py-2 rounded-xl uppercase shadow-lg shadow-red-600/30 flex items-center justify-center gap-1.5">
                            <span>❌</span>
                            <span>PERDEU</span>
                          </div>
                        ) : (
                          <span className="bg-black/80 border border-[#FF6B00]/50 text-[#FF6B00] font-black text-[10px] px-2.5 py-1.5 rounded-lg uppercase inline-block">
                            ⏳ AGUARDANDO RESULTADO
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // =========================================================================
  // 1. LANDING PAGE
  // =========================================================================
  if (page === "landing") {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col justify-between">
        <header className="p-4 flex justify-between items-center border-b border-zinc-900 max-w-md mx-auto w-full">
          <div className="flex items-center gap-2.5">
            <img src={logoBolao} alt="Logo" className="w-7 h-7 object-contain rounded-full shadow" />
            <span className="font-black text-xs tracking-wider text-[#FF6B00]">BOLÕES ELITE</span>
          </div>
          <button
            onClick={() => setPage("adminLogin")}
            className="text-xs text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-600 px-3 py-1.5 rounded-full transition cursor-pointer"
          >
            Área ADM
          </button>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto w-full">
          <div className="mb-3">
            <div className="p-2 rounded-3xl bg-radial from-red-600/10 via-transparent to-transparent">
              <img
                src={logoBolao}
                alt="Logo Oficial Bolões Elite"
                className="w-44 h-44 sm:w-52 sm:h-52 object-contain mx-auto drop-shadow-[0_15px_35px_rgba(239,68,68,0.4)] transition transform hover:scale-105 duration-300 rounded-2xl"
              />
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black leading-none text-center">
            JOGUE COM<br />
            <span className="text-[#FF6B00]">A ELITE</span>
          </h1>

          <p className="text-zinc-400 text-xs mt-3 text-center max-w-xs leading-relaxed">
            Palpites simplificados: escolha quem vence ou se empata! Triagem automática de ganhadores e premiação via PIX.
          </p>

          {user ? (
            <div className="w-full mt-6 space-y-2.5">
              <button
                onClick={() => setPage("palpites")}
                className="w-full bg-[#FF6B00] hover:bg-[#ff7b1a] text-black font-black py-4 rounded-xl cursor-pointer hover:scale-105 active:scale-95 transition shadow-lg shadow-[#FF6B00]/20 text-sm uppercase tracking-wider"
              >
                CONTINUAR COMO {user.nome?.split(" ")[0]?.toUpperCase()}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setErroLoginJogador("");
                    setAbaLoginJogador("entrar");
                    setPage("loginJogador");
                  }}
                  className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold py-3 rounded-xl cursor-pointer transition text-xs uppercase tracking-wider"
                >
                  🔑 Entrar c/ outra conta
                </button>
                <button
                  onClick={() => {
                    setErroLoginJogador("");
                    setAbaLoginJogador("cadastro");
                    setPage("loginJogador");
                  }}
                  className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold py-3 rounded-xl cursor-pointer transition text-xs uppercase tracking-wider"
                >
                  📝 Novo Cadastro
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full mt-6 space-y-3">
              <button
                onClick={() => {
                  setErroLoginJogador("");
                  setAbaLoginJogador("cadastro");
                  setPage("loginJogador");
                }}
                className="w-full bg-[#FF6B00] hover:bg-[#ff7b1a] text-black font-black py-4 rounded-xl cursor-pointer hover:scale-105 active:scale-95 transition shadow-lg shadow-[#FF6B00]/20 text-sm uppercase tracking-wider"
              >
                CRIAR CADASTRO E JOGAR
              </button>
              <button
                onClick={() => {
                  setErroLoginJogador("");
                  setAbaLoginJogador("entrar");
                  setPage("loginJogador");
                }}
                className="w-full bg-zinc-900 hover:bg-zinc-800 border-2 border-[#FF6B00]/60 text-[#FF6B00] hover:text-white font-black py-3.5 rounded-xl cursor-pointer hover:scale-[1.02] active:scale-95 transition text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <span>🔑</span> JÁ TENHO LOGIN • ENTRAR
              </button>
            </div>
          )}

          {/* Painel Placar ao Vivo / Status Oficial ESPN (Brasileirão) na Tela Inicial */}
          <div className="w-full mt-5 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3.5 text-left space-y-2.5 shadow-lg">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#FF6B00]">
                  PLACAR AO VIVO • BRASILEIRÃO (ESPN)
                </span>
              </div>
              <button
                type="button"
                onClick={() => atualizarJogosEspnAoVivo()}
                disabled={carregandoEspnRapido}
                className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold px-2 py-0.5 rounded cursor-pointer transition"
              >
                {carregandoEspnRapido ? "🔄..." : "🔄 Ao Vivo"}
              </button>
            </div>

            {jogosPublicados.length === 0 ? (
              <div className="bg-black/80 border border-[#FF6B00]/40 rounded-xl p-3.5 text-center space-y-1">
                <div className="text-xs sm:text-sm font-black text-[#FF6B00] uppercase tracking-wide">
                  {MENSAGEM_DATA_FIFA}
                </div>
                <p className="text-[10px] text-zinc-400">
                  Sincronizado em tempo real com a API oficial da ESPN (Brasileirão Série A).
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {jogosPublicados.map((j) => (
                  <div
                    key={j.id}
                    className="bg-black/80 border border-zinc-800 rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <Escudo src={j.escudoCasa} nome={j.casa} size={22} />
                      <span className="font-bold text-white truncate">{j.casa}</span>
                    </div>
                    <div className="flex flex-col items-center shrink-0 px-2">
                      {j.aoVivo && (
                        <span className="text-[8px] bg-red-600 text-white font-black px-1.5 py-0.5 rounded animate-pulse mb-0.5">
                          🔴 {j.tempoJogo || "AO VIVO"}
                        </span>
                      )}
                      <div className="bg-zinc-900 border border-zinc-700 px-2 py-0.5 rounded font-mono text-xs font-black text-white flex items-center gap-1">
                        <span>{j.placarCasa ?? 0}</span>
                        <span className="text-[#FF6B00]">x</span>
                        <span>{j.placarFora ?? 0}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                      <span className="font-bold text-white truncate text-right">{j.fora}</span>
                      <Escudo src={j.escudoFora} nome={j.fora} size={22} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Banner para Instalar o App no Celular com a Logo do Bolões Elite */}
          <PWAInstallButton variant="banner" logoSrc={logoBolao} />

          <div className="grid grid-cols-3 mt-8 border-t border-zinc-900 pt-5 text-center w-full">
            <div>
              <div className="text-2xl font-black text-[#FF6B00]">
                R$ {total > 0 ? total.toFixed(0) : "184k"}
              </div>
              <div className="text-[9px] text-zinc-500 uppercase font-bold">Prêmios</div>
            </div>
            <div>
              <div className="text-2xl font-black">{jogadores.length > 0 ? jogadores.length : "12.4k"}</div>
              <div className="text-[9px] text-zinc-500 uppercase font-bold">Jogadores</div>
            </div>
            <div>
              <div className="text-2xl font-black">{jogosPublicados.length}</div>
              <div className="text-[9px] text-zinc-500 uppercase font-bold">Confrontos</div>
            </div>
          </div>
        </main>

        <footer className="text-center text-[10px] text-zinc-500 pb-4 space-y-1.5">
          <div>
            <button
              type="button"
              onClick={() => setShowTermosModal(true)}
              className="text-[#FF6B00] hover:underline font-bold cursor-pointer"
            >
              📄 Termos de Uso e Regulamento - Elite do Bolão
            </button>
          </div>
          <div className="text-zinc-600">© 2026 Bolões Elite • Todos os direitos reservados</div>
        </footer>
        <ModalAreaTransparencia />

        {showTermosModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 text-left">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-sm sm:text-base font-black text-[#FF6B00] uppercase">
                  TERMOS DE USO E REGULAMENTO - ELITE DO BOLÃO - ATUALIZADO
                </h3>
                <button
                  type="button"
                  onClick={() => setShowTermosModal(false)}
                  className="text-zinc-400 hover:text-white font-black text-base cursor-pointer ml-2"
                >
                  ✕
                </button>
              </div>
              <div className="text-xs text-zinc-300 space-y-3.5 leading-relaxed">
                <div>
                  <strong className="text-white block mb-0.5">1. NATUREZA DA PLATAFORMA</strong>
                  <p>
                    O ELITE DO BOLÃO é uma plataforma de tecnologia para organização de concursos de prognósticos esportivos recreativos entre participantes. NÃO somos casa de apostas de quota fixa (Lei 14.790/2023), não operamos como banca e não definimos odds.
                  </p>
                </div>

                <div>
                  <strong className="text-white block mb-0.5">2. COMPOSIÇÃO DA PARTICIPAÇÃO</strong>
                  <p>Toda participação paga pelo usuário é dividida de forma transparente e automática:</p>
                  <p className="mt-1">
                    <strong>80% (oitenta por cento) = POTE DE PRÊMIOS:</strong> valor destinado integralmente e rateado entre os acertadores do bolão.
                  </p>
                  <p className="mt-1">
                    <strong>20% (vinte por cento) = TAXA DE SERVIÇO:</strong> valor destinado à plataforma para custos de tecnologia, hospedagem, processamento de pagamentos (InfinitePay/PIX), suporte e organização.
                  </p>
                  <p className="mt-1.5 text-zinc-400 bg-black/50 p-2.5 rounded-xl border border-zinc-800">
                    Exemplos ilustrativos: Bolão de R$10 = R$8 de pote + R$2 de taxa. Bolão de R$20 = R$16 de pote + R$4 de taxa. Bolão de R$50 = R$40 de pote + R$10 de taxa.
                  </p>
                </div>

                <div>
                  <strong className="text-white block mb-0.5">3. PRÊMIOS</strong>
                  <p>
                    100% do valor arrecadado a título de POTE (os 80%) é distribuído entre os ganhadores conforme regras de cada bolão. A plataforma não retém nenhuma porcentagem do pote de prêmios.
                  </p>
                </div>

                <div>
                  <strong className="text-white block mb-0.5">4. RESPONSABILIDADE DO USUÁRIO</strong>
                  <p>
                    O usuário declara que participa de forma voluntária de um bolão recreativo e social, e que a taxa de 20% é uma taxa de serviço digital, faturada pelo CPF da plataforma.
                  </p>
                </div>

                <div>
                  <strong className="text-white block mb-0.5">5. LEGISLAÇÃO</strong>
                  <p>
                    Esta atividade não se confunde com apostas de quota fixa, loterias ou jogos de azar explorados contra a banca, por não haver banca.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAceitouTermos(true);
                  setShowTermosModal(false);
                }}
                className="w-full bg-[#FF6B00] hover:bg-[#ff7b1a] text-black font-black py-3.5 rounded-xl cursor-pointer text-xs uppercase tracking-wider transition"
              >
                ENTENDI E CONCORDO
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 2. CADASTRO / LOGIN DO JOGADOR
  // =========================================================================
  if (page === "loginJogador") {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white p-6 max-w-md mx-auto flex flex-col justify-center">
        <button
          onClick={() => setPage("landing")}
          className="text-zinc-400 hover:text-white text-xs mb-4 flex items-center gap-1 cursor-pointer w-fit"
        >
          ← Voltar
        </button>

        <div className="flex items-center gap-3 mb-2">
          <img src={logoBolao} alt="" className="w-10 h-10 object-contain rounded-lg" />
          <h2 className="text-3xl font-black">Área do Jogador</h2>
        </div>
        <p className="text-xs text-zinc-400">
          {abaLoginJogador === "entrar"
            ? "Digite seu E-mail ou Chave PIX cadastrada para acessar sua conta."
            : "Preencha seus dados para se cadastrar, apostar e receber o prêmio via PIX."}
        </p>

        {/* Seletor de Abas: Entrar (Já tenho login) vs Novo Cadastro */}
        <div className="grid grid-cols-2 gap-2 bg-zinc-900 p-1.5 rounded-xl border border-zinc-800 mt-5">
          <button
            type="button"
            onClick={() => {
              setErroLoginJogador("");
              setAbaLoginJogador("entrar");
            }}
            className={`py-2.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 ${
              abaLoginJogador === "entrar"
                ? "bg-[#FF6B00] text-black shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <span>🔑</span> Já tenho Login
          </button>
          <button
            type="button"
            onClick={() => {
              setErroLoginJogador("");
              setAbaLoginJogador("cadastro");
            }}
            className={`py-2.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 ${
              abaLoginJogador === "cadastro"
                ? "bg-[#FF6B00] text-black shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <span>📝</span> Novo Cadastro
          </button>
        </div>

        {abaLoginJogador === "entrar" ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setErroLoginJogador("");
              const termo = buscaLoginInput.trim().toLowerCase();
              if (!termo) {
                setErroLoginJogador("Digite seu E-mail ou Chave PIX para entrar.");
                return;
              }
              let encontrado = jogadores.find(
                (jg: any) =>
                  (jg.email || "").trim().toLowerCase() === termo ||
                  (jg.pix || "").trim().toLowerCase() === termo ||
                  (jg.nome || "").trim().toLowerCase() === termo
              );
              if (!encontrado) {
                encontrado = await buscarUsuarioNoSupabase(termo);
              }
              if (!encontrado) {
                setErroLoginJogador(
                  "Não encontramos um cadastro com esse E-mail ou Chave PIX no Supabase. Verifique os dados ou clique em 'Novo Cadastro'."
                );
                return;
              }
              setUser(encontrado);
              localStorage.setItem("elite_user_v11", JSON.stringify(encontrado));
              setPage("palpites");
            }}
            className="mt-6 space-y-4 bg-zinc-900/60 border border-zinc-800 p-5 rounded-2xl"
          >
            <div>
              <label className="block text-[11px] text-zinc-400 uppercase font-bold mb-1">
                Seu E-mail ou Chave PIX Cadastrada
              </label>
              <input
                value={buscaLoginInput}
                onChange={(e) => {
                  setBuscaLoginInput(e.target.value);
                  if (erroLoginJogador) setErroLoginJogador("");
                }}
                placeholder="Digite seu e-mail ou chave PIX..."
                required
                className="w-full bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl outline-none focus:border-[#FF6B00] text-sm text-white"
              />
            </div>

            {erroLoginJogador && (
              <div className="bg-red-950/80 border border-red-700 text-red-200 p-3 rounded-xl text-xs space-y-2">
                <div>⚠️ {erroLoginJogador}</div>
                <button
                  type="button"
                  onClick={() => {
                    setErroLoginJogador("");
                    setAbaLoginJogador("cadastro");
                  }}
                  className="bg-[#FF6B00] text-black font-black px-3 py-1.5 rounded-lg text-[11px] cursor-pointer uppercase"
                >
                  Criar Meu Cadastro Agora
                </button>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-[#FF6B00] hover:bg-[#ff7b1a] text-black font-black py-4 rounded-xl cursor-pointer hover:scale-[1.01] transition shadow-lg shadow-[#FF6B00]/20 text-sm uppercase tracking-wider"
            >
              ENTRAR NA MINHA CONTA
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setErroLoginJogador("");
                  setAbaLoginJogador("cadastro");
                }}
                className="text-xs text-zinc-400 hover:text-[#FF6B00] underline cursor-pointer"
              >
                Ainda não tem conta? Clique aqui para se cadastrar
              </button>
            </div>
          </form>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!aceitouTermos) {
                alert("Você deve aceitar os Termos e Políticas do bolão!");
                return;
              }
              const fd = new FormData(e.currentTarget);
              const nome = (fd.get("nome") as string).trim();
              const email = (fd.get("email") as string).trim().toLowerCase();
              const pix = (fd.get("pix") as string).trim();

              if (!nome || !email || !pix) return alert("Preencha todos os campos!");

              const docId = getJogadorDocId(email);
              const existente = jogadores.find((x: any) => (x.email || "").toLowerCase() === email);
              const agora = Date.now();
              const dataHoraCadastro = `${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}`;

              const novo = existente
                ? {
                    ...existente,
                    id: docId,
                    _docId: docId,
                    nome,
                    email,
                    pix,
                    dataCadastro: dataHoraCadastro,
                    timestampCadastro: agora,
                    _pendingSync: true,
                  }
                : {
                    id: docId,
                    _docId: docId,
                    nome,
                    email,
                    pix,
                    pontos: 0,
                    statusPagamento: "PENDENTE",
                    status_pagamento: "pendente",
                    aprovado: false,
                    dataCadastro: dataHoraCadastro,
                    timestampCadastro: agora,
                    _pendingSync: true,
                  };

              clearJogadorDeletedLocal(email, docId);
              const lista = [...jogadores.filter((x: any) => (x.email || "").toLowerCase() !== email), novo];
              setJogadores(lista);
              localStorage.setItem("elite_jogadores_v11", JSON.stringify(lista));
              setUser(novo);
              localStorage.setItem("elite_user_v11", JSON.stringify(novo));
              await upsertJogadorInDb(novo, true).catch(() => {});

              // Vai direto para a tela de palpites (o jogador só é cobrado após fazer suas apostas)
              setPage("palpites");
            }}
            className="mt-6 space-y-4"
          >
            <div>
              <label className="block text-[11px] text-zinc-400 uppercase font-bold mb-1">Seu Nome</label>
              <input
                name="nome"
                placeholder="Ex: Carlos Silva"
                required
                className="w-full bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl outline-none focus:border-[#FF6B00] text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 uppercase font-bold mb-1">Seu E-mail</label>
              <input
                name="email"
                type="email"
                defaultValue={buscaLoginInput.includes("@") ? buscaLoginInput : ""}
                placeholder="carlos@gmail.com"
                required
                className="w-full bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl outline-none focus:border-[#FF6B00] text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 uppercase font-bold mb-1">Chave PIX (Para receber)</label>
              <input
                name="pix"
                placeholder="CPF, Telefone ou E-mail"
                required
                className="w-full bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl outline-none focus:border-[#FF6B00] text-sm text-white font-mono"
              />
            </div>

            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aceitouTermos}
                  onChange={(e) => setAceitouTermos(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded accent-[#FF6B00] cursor-pointer"
                />
                <span className="text-xs text-zinc-300 leading-snug">
                  Li e concordo com os Termos de Uso e Regulamento - Elite do Bolão.
                </span>
              </label>
              <button
                type="button"
                onClick={() => setShowTermosModal(true)}
                className="text-[11px] text-[#FF6B00] hover:underline font-bold block ml-6 cursor-pointer"
              >
                📄 Ler Termos de Uso e Regulamento Atualizado
              </button>
            </div>

            <button
              type="submit"
              disabled={!aceitouTermos}
              className="w-full bg-[#FF6B00] disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-black font-black py-4 rounded-xl cursor-pointer hover:scale-[1.01] transition shadow-lg shadow-[#FF6B00]/20 text-sm uppercase tracking-wider"
            >
              CADASTRAR E IR PARA AS APOSTAS
            </button>
          </form>
        )}

        {showTermosModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-sm sm:text-base font-black text-[#FF6B00] uppercase">
                  TERMOS DE USO E REGULAMENTO - ELITE DO BOLÃO - ATUALIZADO
                </h3>
                <button
                  type="button"
                  onClick={() => setShowTermosModal(false)}
                  className="text-zinc-400 hover:text-white font-black text-base cursor-pointer ml-2"
                >
                  ✕
                </button>
              </div>
              <div className="text-xs text-zinc-300 space-y-3.5 leading-relaxed">
                <div>
                  <strong className="text-white block mb-0.5">1. NATUREZA DA PLATAFORMA</strong>
                  <p>
                    O ELITE DO BOLÃO é uma plataforma de tecnologia para organização de concursos de prognósticos esportivos recreativos entre participantes. NÃO somos casa de apostas de quota fixa (Lei 14.790/2023), não operamos como banca e não definimos odds.
                  </p>
                </div>

                <div>
                  <strong className="text-white block mb-0.5">2. COMPOSIÇÃO DA PARTICIPAÇÃO</strong>
                  <p>Toda participação paga pelo usuário é dividida de forma transparente e automática:</p>
                  <p className="mt-1">
                    <strong>80% (oitenta por cento) = POTE DE PRÊMIOS:</strong> valor destinado integralmente e rateado entre os acertadores do bolão.
                  </p>
                  <p className="mt-1">
                    <strong>20% (vinte por cento) = TAXA DE SERVIÇO:</strong> valor destinado à plataforma para custos de tecnologia, hospedagem, processamento de pagamentos (InfinitePay/PIX), suporte e organização.
                  </p>
                  <p className="mt-1.5 text-zinc-400 bg-black/50 p-2.5 rounded-xl border border-zinc-800">
                    Exemplos ilustrativos: Bolão de R$10 = R$8 de pote + R$2 de taxa. Bolão de R$20 = R$16 de pote + R$4 de taxa. Bolão de R$50 = R$40 de pote + R$10 de taxa.
                  </p>
                </div>

                <div>
                  <strong className="text-white block mb-0.5">3. PRÊMIOS</strong>
                  <p>
                    100% do valor arrecadado a título de POTE (os 80%) é distribuído entre os ganhadores conforme regras de cada bolão. A plataforma não retém nenhuma porcentagem do pote de prêmios.
                  </p>
                </div>

                <div>
                  <strong className="text-white block mb-0.5">4. RESPONSABILIDADE DO USUÁRIO</strong>
                  <p>
                    O usuário declara que participa de forma voluntária de um bolão recreativo e social, e que a taxa de 20% é uma taxa de serviço digital, faturada pelo CPF da plataforma.
                  </p>
                </div>

                <div>
                  <strong className="text-white block mb-0.5">5. LEGISLAÇÃO</strong>
                  <p>
                    Esta atividade não se confunde com apostas de quota fixa, loterias ou jogos de azar explorados contra a banca, por não haver banca.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAceitouTermos(true);
                  setShowTermosModal(false);
                }}
                className="w-full bg-[#FF6B00] hover:bg-[#ff7b1a] text-black font-black py-3.5 rounded-xl cursor-pointer text-xs uppercase tracking-wider transition"
              >
                ENTENDI E CONCORDO
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 3. LOGIN ADM
  // =========================================================================
  if (page === "adminLogin") {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white p-6 max-w-md mx-auto flex flex-col justify-center">
        <button
          onClick={() => setPage("landing")}
          className="text-zinc-400 hover:text-white text-xs mb-4 flex items-center gap-1 cursor-pointer w-fit"
        >
          ← Voltar
        </button>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <img src={logoBolao} alt="" className="w-8 h-8 object-contain rounded" />
            <div className="inline-block border border-[#FF6B00]/40 bg-[#FF6B00]/10 text-[#FF6B00] text-[10px] font-black uppercase px-2.5 py-1 rounded">
              Acesso Restrito
            </div>
          </div>
          <h2 className="text-2xl font-black">Login ADM</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const emailInput = String(fd.get("email") || "").trim().toLowerCase();
              const senhaInput = String(fd.get("senha") || "").trim();
              if (emailInput === "inhobahia29@gmail.com" && senhaInput === "040608") {
                inicializarConfigAdminInDb().catch(() => {});
                setPage("admin");
              } else {
                alert("Acesso negado");
              }
            }}
            className="mt-6 space-y-3"
          >
            <div>
              <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">E-mail</label>
              <input
                name="email"
                defaultValue="InhoBahia29@gmail.com"
                className="w-full bg-black border border-zinc-800 p-3.5 rounded-xl outline-none focus:border-[#FF6B00] text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Senha</label>
              <input
                name="senha"
                type="password"
                placeholder="Senha"
                required
                className="w-full bg-black border border-zinc-800 p-3.5 rounded-xl outline-none focus:border-[#FF6B00] text-sm text-white"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#FF6B00] text-black font-black py-4 rounded-xl cursor-pointer hover:scale-105 transition text-sm uppercase tracking-wider"
            >
              ENTRAR NO PAINEL
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 4. PAINEL ADM COM TRIAGEM AUTOMÁTICA & CONFIRMAÇÃO DE RESULTADOS
  // =========================================================================
  if (page === "admin") {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white p-4 max-w-4xl mx-auto space-y-6 pb-24">
        {/* Topo ADM */}
        <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-3">
            <img src={logoBolao} alt="" className="w-10 h-10 object-contain rounded-lg" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-[#FF6B00] text-xl">ADM - BOLÕES ELITE</h2>
                <span className="text-[10px] bg-green-950 text-green-400 border border-green-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse"></span>
                  {dbConectado ? "Banco Online" : "Sincronizando..."}
                </span>
              </div>
              <div className="text-[11px] text-zinc-400">InhoBahia29@gmail.com</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                window.history.pushState({}, "", "/admin/importar-jogos");
                window.dispatchEvent(new PopStateEvent("popstate"));
              }}
              className="text-xs bg-[#FF6B00] hover:bg-[#ff7b1a] text-black px-3.5 py-1.5 rounded-lg cursor-pointer font-black uppercase tracking-wider shadow-md shadow-[#FF6B00]/20 flex items-center gap-1.5 transition"
            >
              <span>⚡</span> JOGOS DO DIA
            </button>
            <button
              onClick={() => setPage("palpites")}
              className="text-xs bg-[#FF6B00]/10 border border-[#FF6B00]/40 text-[#FF6B00] px-3 py-1.5 rounded cursor-pointer font-bold hover:bg-[#FF6B00]/20"
            >
              Área de Apostas
            </button>
            <button
              onClick={() => setPage("landing")}
              className="text-xs border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded cursor-pointer"
            >
              Sair
            </button>
          </div>
        </div>

        {/* Aviso Flutuante de Ações do ADM */}
        {avisoAdm && (
          <div className="bg-green-950/90 border border-green-600 text-green-200 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-lg">
            <span>{avisoAdm}</span>
            <button
              type="button"
              onClick={() => setAvisoAdm("")}
              className="text-green-400 hover:text-white ml-3 font-black cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Resumo Financeiro */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-xs space-y-2">
          <div className="font-bold flex flex-wrap gap-2 justify-between border-b border-zinc-800 pb-2">
            <span>CADASTRADOS: {jogadores.length}</span>
            <span>PAGOS: {pagos} de {jogadores.length}</span>
            <span>VALOR DA COTA: R$ {config.valor}</span>
            <span>TOTAL: R$ {total.toFixed(2)}</span>
            <span>BANCA 20%: R$ {banca20.toFixed(2)}</span>
            <span className="text-[#FF6B00]">PRÊMIO 80%: R$ {premio80.toFixed(2)}</span>
          </div>
          <div className="text-[#FF6B00] font-bold flex flex-wrap gap-3 pt-1">
            <span>🥇 1º (50%): R$ {premio1.toFixed(2)}</span>
            <span>🥈 2º (30%): R$ {premio2.toFixed(2)}</span>
            <span>🥉 3º (20%): R$ {premio3.toFixed(2)}</span>
          </div>
        </div>

        {/* ================================================================= */}
        {/* BANCO DE DADOS DE TODOS OS APOSTADORES CADASTRADOS */}
        {/* ================================================================= */}
        <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-2">
            <div>
              <h3 className="font-black text-sm text-white flex items-center gap-2">
                <span className="text-[#FF6B00] text-base">🗄️</span> USUÁRIOS DO SUPABASE CADASTRADOS ({jogadores.length})
              </h3>
              <p className="text-[11px] text-zinc-400">
                Todos os usuários salvos na tabela users / profiles do Supabase aparecem automaticamente aqui.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  const listaSupabase = await listarUsuariosDoSupabase();
                  if (listaSupabase.length > 0) {
                    setJogadores(listaSupabase);
                    localStorage.setItem("elite_jogadores_v11", JSON.stringify(listaSupabase));
                  }
                  mostrarAvisoAdm(`🔄 Lista sincronizada com o Supabase (${listaSupabase.length || jogadores.length} usuário(s))!`);
                }}
                className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-[#FF6B00] border border-[#FF6B00]/50 px-3 py-1.5 rounded-lg cursor-pointer font-bold transition flex items-center gap-1"
              >
                <span>🔄</span> Atualizar do Supabase
              </button>
              {jogadores.some((jg) => jg.comprovante) && (
                <button
                  type="button"
                  onClick={excluirTodosComprovantes}
                  className="text-[10px] bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800 px-3 py-1.5 rounded-lg cursor-pointer font-bold transition flex items-center gap-1"
                >
                  <span>🗑️</span> Excluir Todos Comprovantes
                </button>
              )}
              <input
                value={buscaApostadorAdm}
                onChange={(e) => setBuscaApostadorAdm(e.target.value)}
                placeholder="🔍 Buscar por nome, e-mail ou PIX..."
                className="bg-black border border-zinc-800 px-3 py-1.5 rounded-lg text-xs text-white outline-none focus:border-[#FF6B00] sm:w-60"
              />
            </div>
          </div>

          {jogadores.length === 0 ? (
            <p className="text-zinc-500 text-xs py-4 text-center border border-dashed border-zinc-800 rounded-lg">
              Nenhum apostador cadastrado ainda. Assim que alguém se cadastrar, aparecerá aqui em tempo real.
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {jogadores
                .filter((jg) => {
                  const q = buscaApostadorAdm.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    (jg.nome || "").toLowerCase().includes(q) ||
                    (jg.email || "").toLowerCase().includes(q) ||
                    (jg.pix || "").toLowerCase().includes(q)
                  );
                })
                .map((jg, idx) => {
                  const palpitesJg = palpites.filter((p) => p.jogadorEmail === jg.email);
                  const isPagoJg =
                    jg.status_pagamento === "pago" ||
                    jg.aprovado === true ||
                    jg.statusPagamento === "APROVADO" ||
                    palpitesJg.some((p) => p.pago);
                  return (
                    <div
                      key={jg.email || idx}
                      className="bg-black/70 border border-zinc-800 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-mono text-zinc-500">#{idx + 1}</span>
                          <span className="font-black text-white text-sm">{jg.nome}</span>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                              isPagoJg
                                ? "bg-green-950 text-green-400 border-green-700"
                                : "bg-amber-950 text-amber-300 border-amber-700"
                            }`}
                          >
                            {isPagoJg ? "✅ PAGO (AUTOMÁTICO PIX)" : "⏳ AGUARDANDO PIX INFINITEPAY"}
                          </span>
                          <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-[#FF6B00] px-2 py-0.5 rounded font-bold">
                            {palpitesJg.length} palpite(s)
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 flex flex-wrap gap-x-3 gap-y-0.5">
                          <span>
                            E-mail: <strong className="text-zinc-200 font-mono select-all">{jg.email}</strong>
                          </span>
                          <span>
                            Chave PIX: <strong className="text-[#FF6B00] font-mono select-all">{jg.pix}</strong>
                          </span>
                          {jg.dataCadastro && (
                            <span className="text-zinc-500">Cadastro: {jg.dataCadastro}</span>
                          )}
                          {jg.link_pagamento && (
                            <a
                              href={jg.link_pagamento}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#FF6B00] underline font-bold"
                            >
                              🔗 Link PIX InfinitePay
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        {jg.comprovante && (
                          <button
                            type="button"
                            onClick={() => excluirComprovante(jg.email)}
                            className="text-[10px] bg-amber-950/70 hover:bg-amber-900 text-amber-300 border border-amber-800/80 px-2.5 py-1.5 rounded-lg cursor-pointer font-bold transition"
                            title="Excluir comprovante de pagamento deste jogador"
                          >
                            🗑️ Excluir Comprovante
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => excluirApostadorAdm(jg.email, jg.nome, jg._docId || jg.id)}
                          className="text-[10px] bg-red-950/70 hover:bg-red-900 text-red-300 border border-red-800/80 px-2.5 py-1.5 rounded-lg cursor-pointer font-bold transition"
                          title="Excluir jogador do banco de dados"
                        >
                          🗑️ Excluir Jogador
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* SEÇÃO 1: CONFIRMAR OS TIMES VITORIOSOS E RESULTADOS OFICIAIS */}
        {/* ================================================================= */}
        <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div>
              <h3 className="font-black text-sm text-white flex items-center gap-2">
                <span className="text-[#FF6B00] text-base">🏁</span> CONFIRMAR RESULTADOS DOS JOGOS (APURAÇÃO)
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Clique no time vencedor ou em empate. O sistema faz a triagem automática instantaneamente.
              </p>
            </div>
            <span className="text-[10px] bg-black border border-zinc-800 text-[#FF6B00] font-bold px-2 py-1 rounded">
              {totalJogosEncerrados} de {jogosPublicados.length} Definidos
            </span>
          </div>

          {jogosPublicados.length === 0 ? (
            <p className="text-zinc-500 text-xs py-3 text-center border border-dashed border-zinc-800 rounded-lg">
              Nenhum jogo publicado no momento. Publique um bolão salvo abaixo para apurar os vencedores.
            </p>
          ) : (
            <div className="space-y-2 mt-2">
              {jogosPublicados.map((j, idx) => (
                <div
                  key={j.id}
                  className="bg-black/70 border border-zinc-800 p-3 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2 min-w-48">
                    <span className="text-[10px] font-mono text-zinc-500">#{idx + 1}</span>
                    <Escudo src={j.escudoCasa} nome={j.casa} size={28} />
                    <span className="font-bold text-xs text-white">{j.casa}</span>
                    <span className="text-zinc-500 text-[11px]">x</span>
                    <span className="font-bold text-xs text-white">{j.fora}</span>
                    <Escudo src={j.escudoFora} nome={j.fora} size={28} />
                  </div>

                  {/* Botões de Vencedor / Empate */}
                  <div className="grid grid-cols-3 gap-1.5 flex-1 max-w-md">
                    <button
                      onClick={() => definirResultadoJogo(j.id, "CASA")}
                      className={`py-2 px-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        j.resultadoOficial === "CASA"
                          ? "bg-green-600 text-black shadow-md font-black"
                          : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800"
                      }`}
                    >
                      <Escudo src={j.escudoCasa} nome={j.casa} size={20} />
                      <span className="truncate">
                        {j.resultadoOficial === "CASA" && "✓ "}
                        {j.casa}
                      </span>
                    </button>

                    <button
                      onClick={() => definirResultadoJogo(j.id, "EMPATE")}
                      className={`py-2 px-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
                        j.resultadoOficial === "EMPATE"
                          ? "bg-amber-500 text-black shadow-md font-black"
                          : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800"
                      }`}
                    >
                      {j.resultadoOficial === "EMPATE" && "✓ "}
                      Empate
                    </button>

                    <button
                      onClick={() => definirResultadoJogo(j.id, "FORA")}
                      className={`py-2 px-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        j.resultadoOficial === "FORA"
                          ? "bg-green-600 text-black shadow-md font-black"
                          : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800"
                      }`}
                    >
                      <Escudo src={j.escudoFora} nome={j.fora} size={20} />
                      <span className="truncate">
                        {j.resultadoOficial === "FORA" && "✓ "}
                        {j.fora}
                      </span>
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={confirmarResultadosETriagem}
                className="w-full bg-[#FF6B00] hover:bg-[#ff7b1a] text-black font-black py-3 rounded-xl cursor-pointer transition uppercase text-xs tracking-wider shadow-lg shadow-[#FF6B00]/20 flex items-center justify-center gap-2 mt-2"
              >
                <span>🏁</span> CONFIRMAR RESULTADOS & PROCESSAR TRIAGEM AUTOMÁTICA
              </button>

              {triagemSalvaAviso && (
                <div className="bg-green-950/80 border border-green-700 text-green-300 p-3 rounded-xl text-xs flex items-center gap-2">
                  <span>✅</span>
                  <div>
                    <strong>Resultados oficiais gravados!</strong> A ordem dos ganhadores e quem mais pontuou foram calculados abaixo.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* SEÇÃO 2: TRIAGEM AUTOMÁTICA DE APOSTAS & ORDEM DOS GANHADORES */}
        {/* ================================================================= */}
        <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-zinc-800 pb-2">
            <div>
              <h3 className="font-black text-sm text-white flex items-center gap-2">
                <span className="text-[#FF6B00] text-base">🏆</span> TRIAGEM AUTOMÁTICA: ORDEM DOS GANHADORES
              </h3>
              <p className="text-[11px] text-zinc-400">
                Classificação em tempo real por maior número de acertos (vitória/empate).
              </p>
            </div>
            <span className="text-[10px] text-zinc-400 bg-black px-2 py-1 rounded border border-zinc-800">
              Total de Participantes: {rankingGanhadores.length}
            </span>
          </div>

          {rankingGanhadores.length === 0 ? (
            <p className="text-zinc-500 text-xs py-3 text-center border border-dashed border-zinc-800 rounded-lg">
              Nenhuma aposta enviada ainda. As apostas dos jogadores aparecerão aqui automaticamente.
            </p>
          ) : (
            <div className="space-y-3">
              {rankingGanhadores.map((jg, index) => {
                const isPrimeiro = index === 0 && jg.pontos > 0;
                const isSegundo = index === 1 && jg.pontos > 0;
                const isTerceiro = index === 2 && jg.pontos > 0;

                let premioEstimado = 0;
                if (jg.isPago) {
                  if (isPrimeiro) premioEstimado = premio1;
                  else if (isSegundo) premioEstimado = premio2;
                  else if (isTerceiro) premioEstimado = premio3;
                }

                return (
                  <div
                    key={jg.email}
                    className={`p-3.5 rounded-xl border transition ${
                      isPrimeiro
                        ? "bg-gradient-to-r from-amber-500/10 via-black to-black border-amber-500/50 shadow-lg"
                        : isSegundo
                        ? "bg-zinc-900 border-zinc-700"
                        : isTerceiro
                        ? "bg-zinc-900 border-zinc-800"
                        : "bg-black/60 border-zinc-900"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                            index === 0
                              ? "bg-amber-400 text-black shadow-md shadow-amber-400/30"
                              : index === 1
                              ? "bg-zinc-300 text-black"
                              : index === 2
                              ? "bg-amber-700 text-white"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {index + 1}º
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-white">{jg.nome}</span>
                            {isPrimeiro && (
                              <span className="text-[10px] bg-amber-400 text-black font-black px-2 py-0.5 rounded-full uppercase">
                                Líder da Rodada
                              </span>
                            )}
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                jg.isPago
                                  ? "bg-green-950 text-green-400 border-green-700"
                                  : "bg-red-950 text-red-400 border-red-800"
                              }`}
                            >
                              {jg.isPago ? "PAGO" : "PENDENTE"}
                            </span>
                          </div>

                          <div className="text-[11px] text-zinc-400 mt-0.5">
                            Chave PIX: <span className="font-mono text-zinc-200 select-all font-bold">{jg.pix}</span>
                          </div>
                        </div>
                      </div>

                      {/* Pontos & Prêmio */}
                      <div className="flex items-center gap-3 text-right">
                        <div>
                          <div className="text-xl font-black text-[#FF6B00]">
                            {jg.pontos}{" "}
                            <span className="text-xs font-normal text-zinc-400">
                              / {totalJogosEncerrados > 0 ? totalJogosEncerrados : jogos.length} pts
                            </span>
                          </div>
                          <div className="text-[9px] text-zinc-500 uppercase font-bold">
                            {jg.totalApostas} confrontos apostados
                          </div>
                        </div>

                        {premioEstimado > 0 && (
                          <div className="bg-[#FF6B00]/10 border border-[#FF6B00]/40 px-3 py-1.5 rounded-lg text-right">
                            <div className="text-[9px] text-zinc-400 uppercase font-bold">Prêmio</div>
                            <div className="text-sm font-black text-[#FF6B00]">
                              R$ {premioEstimado.toFixed(2)}
                            </div>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => excluirApostadorAdm(jg.email, jg.nome, jg._docId || jg.id)}
                          className="text-[10px] bg-red-950/70 hover:bg-red-900 text-red-300 border border-red-800/80 px-2.5 py-1.5 rounded-lg cursor-pointer font-bold transition"
                          title="Excluir jogador"
                        >
                          🗑️ Excluir Jogador
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* SEÇÃO 2.5: ÁREA DE TRANSPARÊNCIA - ENVIAR COMPROVANTES DA PREMIAÇÃO */}
        {/* ================================================================= */}
        <div className="bg-zinc-900 p-4 rounded-xl border-2 border-emerald-500/60 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-black px-2 py-0.5 rounded">
                  TRANSPARÊNCIA P/ TODOS OS JOGADORES
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">
                  ⚡ Chega na hora na tela de todos os jogadores
                </span>
              </div>
              <h3 className="font-black text-sm sm:text-base text-white flex items-center gap-2 mt-1">
                <span>🛡️</span> ÁREA DE TRANSPARÊNCIA: COMPROVANTES DE PAGAMENTO DA PREMIAÇÃO
              </h3>
              <p className="text-[11px] text-zinc-400">
                Envie aqui o comprovante PIX do pagamento do prêmio dos ganhadores. Todos os jogadores recebem imediatamente para simples conferência!
              </p>
            </div>
            <span className="text-[10px] bg-black border border-emerald-500/50 text-emerald-400 font-black px-2.5 py-1 rounded-lg shrink-0">
              {comprovantesPremiacao.length} Comprovante(s) Publicado(s)
            </span>
          </div>

          {/* Atalho rápido para selecionar ganhador direto do Ranking */}
          {rankingGanhadores.length > 0 && (
            <div className="bg-black/60 border border-zinc-800 p-3 rounded-xl space-y-2">
              <div className="text-[10px] font-black uppercase text-emerald-400">
                ⚡ Selecionar Ganhador Rápido do Ranking (1 Clique):
              </div>
              <div className="flex flex-wrap gap-1.5">
                {rankingGanhadores.slice(0, 5).map((jg, i) => {
                  const colSugerida =
                    i === 0
                      ? "🥇 1º Lugar (50%)"
                      : i === 1
                      ? "🥈 2º Lugar (30%)"
                      : i === 2
                      ? "🥉 3º Lugar (20%)"
                      : "🏆 Premiação do Bolão";
                  const valSugerido =
                    i === 0 ? premio1 : i === 1 ? premio2 : i === 2 ? premio3 : premio80;

                  return (
                    <button
                      key={`sel_ganhador_${jg.email || i}`}
                      type="button"
                      onClick={() => {
                        setGanhadorPremiacaoNome(jg.nome);
                        setColocacaoPremiacao(colSugerida);
                        setValorPremiacaoPago(valSugerido > 0 ? valSugerido.toFixed(2) : "");
                      }}
                      className="text-[11px] bg-zinc-900 hover:bg-emerald-950 border border-zinc-700 hover:border-emerald-500 text-white px-2.5 py-1.5 rounded-lg font-bold cursor-pointer transition flex items-center gap-1.5"
                    >
                      <span className="text-emerald-400 font-black">{i + 1}º</span>
                      <span>{jg.nome}</span>
                      <span className="text-[10px] text-zinc-400">({jg.pontos} pts)</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Formulário de Envio do Comprovante da Premiação */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
                Nome do Ganhador
              </label>
              <input
                value={ganhadorPremiacaoNome}
                onChange={(e) => setGanhadorPremiacaoNome(e.target.value)}
                placeholder="Ex: Carlos Silva"
                className="w-full bg-black border border-zinc-800 p-2.5 rounded-lg text-xs text-white font-bold outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
                Colocação / Prêmio
              </label>
              <select
                value={colocacaoPremiacao}
                onChange={(e) => {
                  const col = e.target.value;
                  setColocacaoPremiacao(col);
                  if (col.includes("1º") && premio1 > 0) setValorPremiacaoPago(premio1.toFixed(2));
                  else if (col.includes("2º") && premio2 > 0) setValorPremiacaoPago(premio2.toFixed(2));
                  else if (col.includes("3º") && premio3 > 0) setValorPremiacaoPago(premio3.toFixed(2));
                }}
                className="w-full bg-black border border-zinc-800 p-2.5 rounded-lg text-xs text-white font-bold outline-none focus:border-emerald-500"
              >
                <option value="🥇 1º Lugar (50%)">🥇 1º Lugar (50%)</option>
                <option value="🥈 2º Lugar (30%)">🥈 2º Lugar (30%)</option>
                <option value="🥉 3º Lugar (20%)">🥉 3º Lugar (20%)</option>
                <option value="🏆 Premiação Geral / Rateio">🏆 Premiação Geral / Rateio</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
                Valor Pago no PIX (R$)
              </label>
              <input
                value={valorPremiacaoPago}
                onChange={(e) => setValorPremiacaoPago(e.target.value)}
                placeholder={`Ex: ${premio1 > 0 ? premio1.toFixed(2) : "80.00"}`}
                className="w-full bg-black border border-zinc-800 p-2.5 rounded-lg text-xs text-emerald-400 font-black outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
                Observação / Identificação da Rodada (Opcional)
              </label>
              <input
                value={descricaoPremiacao}
                onChange={(e) => setDescricaoPremiacao(e.target.value)}
                placeholder="Ex: Pagamento PIX Premiação Rodada Brasileirão"
                className="w-full bg-black border border-zinc-800 p-2.5 rounded-lg text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-emerald-400 mb-1">
                📎 Anexar Foto/Print do Comprovante PIX da Premiação:
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFile(e.target.files?.[0], setImgComprovantePremiacao)}
                className="w-full text-xs text-zinc-300 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:bg-emerald-500 file:text-black cursor-pointer bg-black border border-zinc-800 p-1.5 rounded-lg"
              />
            </div>
          </div>

          {imgComprovantePremiacao && (
            <div className="bg-black/80 border border-emerald-500/50 p-3 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={imgComprovantePremiacao}
                  alt="Prévia do Comprovante"
                  className="w-16 h-16 object-cover rounded-lg border border-emerald-500"
                />
                <div className="text-xs">
                  <div className="font-black text-emerald-400">✅ Imagem do comprovante carregada!</div>
                  <div className="text-[11px] text-zinc-400">
                    Clique no botão abaixo para enviar para a Área de Transparência de todos os jogadores.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setImgComprovantePremiacao("")}
                className="text-xs text-red-400 hover:text-red-300 font-bold px-2.5 py-1 rounded border border-red-800/60 cursor-pointer"
              >
                Remover Imagem
              </button>
            </div>
          )}

          <button
            type="button"
            disabled={enviandoComprovantePremiacao}
            onClick={enviarComprovantePremiacaoAdm}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 text-black font-black py-3.5 px-4 rounded-xl cursor-pointer transition uppercase text-xs sm:text-sm tracking-wider shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            <span>📤</span>
            <span>
              {enviandoComprovantePremiacao
                ? "ENVIANDO PARA TODOS OS JOGADORES..."
                : "ENVIAR COMPROVANTE DE PREMIAÇÃO P/ TODOS OS JOGADORES"}
            </span>
          </button>

          {/* Lista de comprovantes de premiação já enviados */}
          {comprovantesPremiacao.length > 0 && (
            <div className="pt-3 border-t border-zinc-800 space-y-2.5">
              <div className="text-[11px] font-black uppercase text-zinc-300">
                📋 Comprovantes de Premiação Visíveis para Todos os Jogadores ({comprovantesPremiacao.length}):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {comprovantesPremiacao.map((comp) => (
                  <div
                    key={comp.id}
                    className="bg-black/80 border border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={comp.imagemComprovante}
                        alt={comp.ganhadorNome}
                        onClick={() => setComprovantePremiacaoZoom(comp)}
                        className="w-12 h-12 rounded-lg object-cover border border-emerald-500/50 cursor-pointer shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                          {comp.colocacao}
                        </span>
                        <div className="font-bold text-white truncate mt-0.5">{comp.ganhadorNome}</div>
                        <div className="text-emerald-400 font-black">
                          R$ {Number(comp.valorPago || 0).toFixed(2).replace(".", ",")} •{" "}
                          <span className="text-[10px] text-zinc-500 font-normal">{comp.dataEnvio}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setComprovantePremiacaoZoom(comp)}
                        className="bg-zinc-800 hover:bg-zinc-700 text-emerald-300 px-2.5 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer"
                      >
                        🔍 Ver
                      </button>
                      <button
                        type="button"
                        onClick={() => excluirComprovantePremiacaoAdm(comp.id)}
                        className="bg-red-950/70 hover:bg-red-900 text-red-300 border border-red-800/70 px-2.5 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer"
                        title="Excluir comprovante da Área de Transparência"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* SEÇÃO 3: CAMPO DE TODAS AS APOSTAS RECEBIDAS */}
        {/* ================================================================= */}
        <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-2">
            <div>
              <h3 className="font-black text-sm text-white flex items-center gap-2">
                <span className="text-[#FF6B00] text-base">📋</span> APOSTAS RECEBIDAS (CAMPO DE CONTROLE)
              </h3>
              <p className="text-[11px] text-zinc-400">
                Visualize os palpites individuais de vitória/empate de cada jogador, gerencie comprovantes e exclua jogadores.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {jogadores.some((jg) => jg.comprovante) && (
                <button
                  type="button"
                  onClick={excluirTodosComprovantes}
                  className="text-[10px] bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800 px-2.5 py-1.5 rounded-lg cursor-pointer font-bold transition flex items-center gap-1"
                >
                  <span>🗑️</span> Excluir Todos Comprovantes
                </button>
              )}

              <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-zinc-800">
                <button
                  onClick={() => setFiltroApostasAdm("todos")}
                  className={`text-[10px] px-2.5 py-1 rounded font-bold cursor-pointer transition ${
                    filtroApostasAdm === "todos" ? "bg-[#FF6B00] text-black" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Todos ({rankingGanhadores.length})
                </button>
                <button
                  onClick={() => setFiltroApostasAdm("pagos")}
                  className={`text-[10px] px-2.5 py-1 rounded font-bold cursor-pointer transition ${
                    filtroApostasAdm === "pagos" ? "bg-green-600 text-black" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Pagos ({rankingGanhadores.filter((x) => x.isPago).length})
                </button>
                <button
                  onClick={() => setFiltroApostasAdm("pendentes")}
                  className={`text-[10px] px-2.5 py-1 rounded font-bold cursor-pointer transition ${
                    filtroApostasAdm === "pendentes" ? "bg-red-600 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Pendentes ({rankingGanhadores.filter((x) => !x.isPago).length})
                </button>
              </div>
            </div>
          </div>

          {rankingGanhadores.length === 0 ? (
            <p className="text-zinc-500 text-xs py-3 text-center border border-dashed border-zinc-800 rounded-lg">
              Nenhuma aposta registrada até o momento.
            </p>
          ) : (
            <div className="space-y-3">
              {rankingGanhadores
                .filter((jg) => {
                  if (filtroApostasAdm === "pagos") return jg.isPago;
                  if (filtroApostasAdm === "pendentes") return !jg.isPago;
                  return true;
                })
                .map((jg) => (
                  <div key={jg.email} className="bg-black/70 border border-zinc-800 rounded-xl p-3.5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-900 pb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-white">{jg.nome}</span>
                          <span className="text-zinc-500 font-normal text-xs font-mono">({jg.email})</span>
                          {jg.comprovante && (
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-bold">
                              📎 Comprovante Anexo
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-400 mt-0.5">
                          PIX: <strong className="font-mono text-zinc-200 select-all">{jg.pix}</strong>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Status Automático do Pagamento PIX InfinitePay */}
                        {jg.isPago || jg.status_pagamento === "pago" || jg.aprovado === true || jg.statusPagamento === "APROVADO" ? (
                          <span className="text-xs bg-green-950 text-green-400 border border-green-700 px-3 py-1.5 rounded-lg font-black flex items-center gap-1.5">
                            <span>✅</span> PAGO AUTOMÁTICO (INFINITEPAY)
                          </span>
                        ) : (
                          <span className="text-xs bg-amber-950/80 text-amber-300 border border-amber-700/80 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5">
                            <span>⏳</span> AGUARDANDO RETORNO DO PIX
                          </span>
                        )}

                        {jg.comprovante && (
                          <button
                            type="button"
                            onClick={() => excluirComprovante(jg.email)}
                            className="text-xs bg-amber-950/70 hover:bg-amber-900 text-amber-300 border border-amber-800 px-2.5 py-1.5 rounded-lg cursor-pointer font-bold transition flex items-center gap-1"
                            title="Excluir comprovante de pagamento"
                          >
                            <span>🗑️</span> Excluir Comprovante
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => excluirApostadorAdm(jg.email, jg.nome, jg._docId || jg.id)}
                          className="text-xs bg-red-950/70 hover:bg-red-900 text-red-300 border border-red-800 px-2.5 py-1.5 rounded-lg cursor-pointer font-bold transition flex items-center gap-1"
                          title="Excluir jogador e suas apostas"
                        >
                          <span>🗑️</span> Excluir Jogador
                        </button>
                      </div>
                    </div>

                    {/* ESPAÇO DEDICADO DO COMPROVANTE NA ÁREA ADM */}
                    {jg.comprovante ? (
                      <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>📂</span> Espaço do Comprovante de Pagamento
                          </span>
                          <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                            <span>Enviado: {jg.dataEnvioComprovante || "Recente"}</span>
                            <span className="text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/80 font-bold">
                              ⏱️ Válido por {calcularDiasRestantes(jg.timestampComprovante)} dia(s)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                          <button
                            type="button"
                            onClick={() => setModalComprovante({ url: jg.comprovante, nome: jg.nome, email: jg.email, timestamp: jg.timestampComprovante })}
                            className="relative w-16 h-16 rounded-lg overflow-hidden border border-zinc-700 bg-black shrink-0 hover:opacity-80 transition cursor-pointer group"
                            title="Clique para ampliar"
                          >
                            <img src={jg.comprovante} alt="Comprovante" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs text-white">
                              🔍
                            </div>
                          </button>

                          <div className="flex-1 space-y-1.5">
                            <div className="text-[11px] text-zinc-400 leading-snug">
                              Comprovante arquivado na pasta do jogador. Pode ser excluído pelo ADM após o término da rodada (ou expira automaticamente em 3 dias).
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => setModalComprovante({ url: jg.comprovante, nome: jg.nome, email: jg.email, timestamp: jg.timestampComprovante })}
                                className="text-xs bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-700 px-3 py-1 rounded-lg cursor-pointer font-bold transition flex items-center gap-1"
                              >
                                <span>🔍</span> Ver Completo
                              </button>
                              <button
                                type="button"
                                onClick={() => excluirComprovante(jg.email)}
                                className="text-xs bg-red-950/70 hover:bg-red-900 text-red-300 border border-red-800 px-3 py-1 rounded-lg cursor-pointer font-bold transition flex items-center gap-1"
                                title="Excluir comprovante desta rodada"
                              >
                                <span>🗑️</span> Excluir Comprovante
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-zinc-950/50 p-2.5 rounded-lg border border-zinc-900 text-zinc-500 text-[11px] flex items-center gap-2">
                        <span>📁</span>
                        <span>Espaço do Comprovante: Aguardando envio pelo jogador.</span>
                      </div>
                    )}

                    {/* Confrontos Apostados com Status */}
                    <div>
                      <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1.5">
                        Palpites da Rodada ({jg.apostas.length} jogos):
                      </div>

                      {jg.apostas.length === 0 ? (
                        <span className="text-xs text-zinc-500 italic">Nenhum palpite enviado ainda.</span>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {jg.apostas.map((ap: Palpite) => {
                            const match = jogos.find((j) => j.id === ap.jogoId);
                            if (!match) return null;

                            const acertou = match.resultadoOficial && match.resultadoOficial === ap.escolha;
                            const errou = match.resultadoOficial && match.resultadoOficial !== ap.escolha;
                            const pendente = !match.resultadoOficial;

                            let textoEscolha = "";
                            if (ap.escolha === "CASA") textoEscolha = `Vitória: ${match.casa}`;
                            else if (ap.escolha === "FORA") textoEscolha = `Vitória: ${match.fora}`;
                            else textoEscolha = "Empate";

                            return (
                              <div
                                key={ap.jogoId}
                                className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                                  acertou
                                    ? "bg-green-950/40 border-green-600 text-green-200"
                                    : errou
                                    ? "bg-red-950/40 border-red-700 text-red-200"
                                    : "bg-zinc-900/60 border-zinc-800 text-zinc-300"
                                }`}
                              >
                                <span className="font-bold truncate max-w-[130px]">
                                  {match.casa} x {match.fora}
                                </span>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="font-black bg-black px-2 py-0.5 rounded text-[11px] text-[#FF6B00]">
                                    {textoEscolha}
                                  </span>
                                  {acertou && (
                                    <span className="bg-green-500 text-black font-black px-2 py-0.5 rounded text-[10px] uppercase">
                                      ✅ GANHOU
                                    </span>
                                  )}
                                  {errou && (
                                    <span className="bg-red-600 text-white font-black px-2 py-0.5 rounded text-[10px] uppercase">
                                      ❌ PERDEU
                                    </span>
                                  )}
                                  {pendente && (
                                    <span className="text-zinc-500 text-[10px]" title="Aguardando jogo">
                                      ⏳
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Configurações & Chave PIX */}
        <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-zinc-800 pb-2">
            <h3 className="font-black text-sm text-white flex items-center gap-2">
              <span className="text-[#FF6B00] text-base">💰</span> VALOR DA COTA & CHAVE PIX DO ADM
            </h3>
            <span className="text-[10px] text-zinc-400">Defina e salve o valor da cota e a chave PIX para recebimento</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Bloco Valor da Cota + Link de Pagamento InfinitePay */}
            <div className="bg-black/60 border border-zinc-800 p-3.5 rounded-xl space-y-3.5">
              <div className="space-y-2.5">
                <label className="block text-[10px] text-zinc-400 uppercase font-bold">
                  VALOR DA COTA (R$)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    value={config.valor}
                    onChange={(e) => setConfig({ ...config, valor: e.target.value })}
                    placeholder="Ex: 20"
                    className="flex-1 bg-zinc-900 border border-zinc-800 p-2.5 rounded-lg text-white font-bold outline-none focus:border-[#FF6B00] text-sm"
                  />
                  <button
                    type="button"
                    onClick={salvarValorCota}
                    className="bg-[#FF6B00] hover:bg-[#ff7b1a] text-black font-black px-4 py-2.5 rounded-lg cursor-pointer transition uppercase text-xs tracking-wider shadow-md shadow-[#FF6B00]/20 flex items-center gap-1.5 shrink-0"
                  >
                    <span>💾</span> SALVAR VALOR DA COTA
                  </button>
                </div>
                <div className="text-[11px] text-zinc-500">
                  Valor atual salvo: <strong className="text-[#FF6B00] font-black">R$ {config.valor}</strong>
                </div>
                {cotaSalvaAviso && (
                  <div className="bg-green-950/80 border border-green-700 text-green-300 px-3 py-2 rounded-lg text-[11px] font-bold flex items-center gap-1.5">
                    <span>✅</span> Valor da cota salvo no banco de dados!
                  </div>
                )}
              </div>

              {/* Novo campo: LINK DE PAGAMENTO INFINITEPAY logo abaixo do VALOR DA COTA */}
              <div className="pt-3 border-t border-zinc-800 space-y-2.5">
                <label className="block text-[10px] text-[#FF6B00] uppercase font-black">
                  LINK DE PAGAMENTO INFINITEPAY
                </label>
                <div className="flex items-center gap-2">
                  <input
                    value={config.linkPagamentoInfinitePay || ""}
                    onChange={(e) => setConfig({ ...config, linkPagamentoInfinitePay: e.target.value })}
                    placeholder="Cole aqui o link de pagamento da InfinitePay..."
                    className="flex-1 bg-zinc-900 border border-zinc-800 p-2.5 rounded-lg text-white font-mono outline-none focus:border-[#FF6B00] text-xs sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={salvarLinkPagamentoInfinitePay}
                    className="bg-[#FF6B00] hover:bg-[#ff7b1a] text-black font-black px-4 py-2.5 rounded-lg cursor-pointer transition uppercase text-xs tracking-wider shadow-md shadow-[#FF6B00]/20 flex items-center gap-1.5 shrink-0"
                  >
                    <span>💾</span> SALVAR LINK
                  </button>
                </div>
                <div className="text-[11px] text-zinc-500 break-all">
                  Link salvo (linkPagamentoInfinitePay):{" "}
                  <strong className="text-zinc-300 font-mono">
                    {config.linkPagamentoInfinitePay || "Nenhum link salvo ainda"}
                  </strong>
                </div>
                {linkSalvoAviso && (
                  <div className="bg-green-950/80 border border-green-700 text-green-300 px-3 py-2 rounded-lg text-[11px] font-bold flex items-center gap-1.5">
                    <span>✅</span> Link de Pagamento InfinitePay salvo no Supabase!
                  </div>
                )}
              </div>
            </div>

            {/* Bloco Chave PIX */}
            <div className="bg-black/60 border border-zinc-800 p-3.5 rounded-xl space-y-2.5">
              <label className="block text-[10px] text-zinc-400 uppercase font-bold">
                Chave PIX do ADM (Para Receber)
              </label>
              <div className="flex items-center gap-2">
                <input
                  value={config.chavePix || config.pixAdm || ""}
                  onChange={(e) => setConfig({ ...config, chavePix: e.target.value, pixAdm: e.target.value })}
                  placeholder="CPF, CNPJ, Telefone, E-mail ou Aleatória"
                  className="flex-1 bg-zinc-900 border border-zinc-800 p-2.5 rounded-lg text-white outline-none focus:border-[#FF6B00] text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    const chaveSalvar = (config.chavePix || config.pixAdm || "").trim();
                    if (!chaveSalvar) {
                      alert("Por favor, digite a chave PIX do ADM!");
                      return;
                    }
                    saveConfig({ ...config, chavePix: chaveSalvar, pixAdm: chaveSalvar });
                    setPixSalvoAviso(true);
                    setTimeout(() => setPixSalvoAviso(false), 4000);
                    mostrarAvisoAdm("💾 Chave PIX salva com sucesso!");
                  }}
                  className="bg-[#FF6B00] hover:bg-[#ff7b1a] text-black font-black px-4 py-2.5 rounded-lg cursor-pointer transition uppercase text-xs tracking-wider shadow-md shadow-[#FF6B00]/20 flex items-center gap-1.5 shrink-0"
                >
                  <span>💾</span> SALVAR CHAVE PIX
                </button>
              </div>
              <div className="text-[11px] text-zinc-500">
                Chave ativa salva: <strong className="text-zinc-300 font-mono">{config.chavePix || config.pixAdm}</strong>
              </div>
              {pixSalvoAviso && (
                <div className="bg-green-950/80 border border-green-700 text-green-300 px-3 py-2 rounded-lg text-[11px] font-bold flex items-center gap-1.5">
                  <span>✅</span> Chave PIX salva com sucesso!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cadastrar Novo Bolão (Deixar Pronto e Salvo) & Gerenciar Confrontos */}
        <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-[#FF6B00] text-black px-2 py-0.5 rounded">
                  PRÉ-CADASTRO & PUBLICAÇÃO
                </span>
                <span className="text-[10px] text-amber-400 font-bold">
                  🔒 Fica salvo e só libera quando você clicar em Publicar
                </span>
              </div>
              <h3 className="font-black text-base text-white mt-1">
                Cadastrar Novo Bolão (Deixar Pronto e Salvo) • Gerenciar Confrontos ({jogos.length}/10)
              </h3>
              <p className="text-[11px] text-zinc-400">
                Monte os confrontos do próximo bolão (ou busque em Jogos do Dia) e deixe salvo no banco. Os jogadores só verão quando você publicar!
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  window.history.pushState({}, "", "/admin/importar-jogos");
                  window.dispatchEvent(new PopStateEvent("popstate"));
                }}
                className="bg-[#FF6B00] hover:bg-[#ff7b1a] text-black font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider cursor-pointer transition shadow-lg shadow-[#FF6B00]/25 shrink-0 flex items-center gap-1.5"
              >
                <span>⚡</span> JOGOS DO DIA
              </button>
              <button
                type="button"
                onClick={iniciarNovoBolaoRascunho}
                className="bg-zinc-800 hover:bg-zinc-700 border border-[#FF6B00]/50 text-[#FF6B00] font-black px-3.5 py-2.5 rounded-xl text-xs uppercase tracking-wider cursor-pointer transition shrink-0 flex items-center gap-1.5"
              >
                <span>➕</span> Criar Outro Novo Bolão
              </button>
            </div>
          </div>

          {/* =============================================================== */}
          {/* LANÇAMENTO RÁPIDO ESPN COM 1 CLIQUE DIRETO NO PAINEL ADM        */}
          {/* =============================================================== */}
          <div className="bg-gradient-to-r from-[#FF6B00]/15 via-zinc-950 to-black border-2 border-[#FF6B00]/70 rounded-2xl p-4 space-y-3 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase bg-[#FF6B00] text-black px-2 py-0.5 rounded">
                    ESPN AO VIVO • SEM CACHE
                  </span>
                  <span className="text-[10px] text-green-400 font-bold">
                    🟢 Atualiza sozinho a cada 1 minuto
                    {ultimaAtualizacaoJogos ? ` • Última busca: ${ultimaAtualizacaoJogos}` : ""}
                  </span>
                </div>
                <h4 className="font-black text-sm sm:text-base text-white mt-1">
                  Jogos de Hoje da ESPN ao vivo ({jogosEspnRapido.length} jogo(s) hoje • {getHojeBrasilISO()})
                </h4>
                <p className="text-[11px] text-zinc-400">
                  Busca direto na internet na hora em que abre a página e a cada 1 minuto (sem usar memória ou jogos de ontem).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => atualizarJogosEspnAoVivo()}
                  disabled={carregandoEspnRapido}
                  className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-bold px-3 py-2.5 rounded-xl text-xs cursor-pointer transition"
                >
                  {carregandoEspnRapido ? "🔄 Buscando..." : "🔄 Atualizar Agora"}
                </button>
                {jogosEspnRapido.length > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      setCarregandoEspnRapido(true);
                      try {
                        const lista = await buscarJogosRodadaEspn(getHojeBrasilISO());
                        const lote = (lista || []).slice(0, 10);
                        const novos: Jogo[] = lote.map((item: any, i: number) => ({
                          id: item.id || `espn_${Date.now()}_${i}`,
                          casa: item.time_casa || item.casa,
                          fora: item.time_fora || item.fora,
                          escudoCasa: getEscudoPadrao(item.time_casa || item.casa) || item.escudoCasaUrl || "",
                          escudoFora: getEscudoPadrao(item.time_fora || item.fora) || item.escudoForaUrl || "",
                          data: item.horario || "19:30",
                          estadio: item.estadio || item.campeonato || "Brasileirão Série A",
                          publicado: true,
                          bolaoId: bolaoEmPreparoId,
                          tituloBolao: "Jogos de Hoje • Brasileirão (ESPN)",
                        }));
                        saveJogos(novos);
                        await sincronizarTimesEJogosIniciaisNoSupabase();
                        setRodadaPublicadaAviso(true);
                        setTimeout(() => setRodadaPublicadaAviso(false), 5000);
                        mostrarAvisoAdm(
                          `🚀 ${novos.length} jogos de hoje da ESPN foram lançados no bolão e salvos no Supabase com 1 clique!`
                        );
                      } finally {
                        setCarregandoEspnRapido(false);
                      }
                    }}
                    className="bg-[#FF6B00] hover:bg-[#ff7b1a] text-black font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider cursor-pointer transition shadow-lg shadow-[#FF6B00]/30 flex items-center gap-1.5"
                  >
                    <span>⚡</span> LANÇAR JOGOS DE HOJE ESPN (1 CLIQUE)
                  </button>
                )}
              </div>
            </div>

            {carregandoEspnRapido ? (
              <div className="text-xs text-zinc-400 py-4 text-center">
                🔄 Buscando jogos de hoje ao vivo na ESPN (sem cache)...
              </div>
            ) : jogosEspnRapido.length === 0 ? (
              <div className="bg-black/80 border border-[#FF6B00]/50 rounded-xl p-5 text-center space-y-1.5">
                <div className="text-2xl">⚽</div>
                <div className="text-sm sm:text-base font-black text-[#FF6B00] uppercase tracking-wide">
                  {MENSAGEM_DATA_FIFA}
                </div>
                <p className="text-[11px] text-zinc-400">
                  Busca em tempo real na API da ESPN (Brasileirão Série A • {getHojeBrasilISO()}). Sem jogos falsos.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {jogosEspnRapido.map((item: any) => {
                  const casaNome = item.time_casa || item.casa;
                  const foraNome = item.time_fora || item.fora;
                  const jaNoBolao = jogos.some(
                    (j) =>
                      j.casa.trim().toLowerCase() === String(casaNome).trim().toLowerCase() &&
                      j.fora.trim().toLowerCase() === String(foraNome).trim().toLowerCase()
                  );
                  return (
                    <div
                      key={item.id || `${casaNome}_${foraNome}`}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                        jaNoBolao
                          ? "bg-green-950/30 border-green-700/60"
                          : "bg-black/80 border-zinc-800 hover:border-[#FF6B00]/60"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Escudo src={getEscudoPadrao(casaNome) || item.escudoCasaUrl} nome={casaNome} size={26} />
                        <span className="font-bold text-white truncate">{casaNome}</span>
                        <span className="bg-zinc-900 border border-zinc-700 px-1.5 py-0.5 rounded font-mono text-[11px] font-black text-[#FF6B00]">
                          {item.placar_casa ?? 0} x {item.placar_fora ?? 0}
                        </span>
                        <span className="font-bold text-white truncate">{foraNome}</span>
                        <Escudo src={getEscudoPadrao(foraNome) || item.escudoForaUrl} nome={foraNome} size={26} />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (jaNoBolao) return;
                          const novo: Jogo = {
                            id: item.id || `espn_${Date.now()}`,
                            casa: casaNome,
                            fora: foraNome,
                            escudoCasa: getEscudoPadrao(casaNome) || item.escudoCasaUrl || "",
                            escudoFora: getEscudoPadrao(foraNome) || item.escudoForaUrl || "",
                            data: item.horario || "19:30",
                            data_jogo: item.data || getHojeBrasilISO(),
                            estadio: item.estadio || item.campeonato || "Brasileirão Série A",
                            placarCasa: item.placar_casa ?? "0",
                            placarFora: item.placar_fora ?? "0",
                            aoVivo: Boolean(item.aoVivo),
                            encerrado: Boolean(item.encerrado),
                            tempoJogo: item.tempoJogo || "",
                            statusDetalhe: item.status || "",
                            resultadoOficial: item.resultadoOficial,
                            publicado: true,
                            bolaoId: bolaoEmPreparoId,
                            tituloBolao: tituloNovoBolao || "Rodada Oficial Brasileirão",
                          };
                          const base = jogos.length >= 10 ? jogos.slice(1) : jogos;
                          saveJogos([...base, novo]);
                          mostrarAvisoAdm(`🚀 "${casaNome} x ${foraNome}" lançado no bolão com 1 clique!`);
                        }}
                        disabled={jaNoBolao}
                        className={`px-2.5 py-1.5 rounded-lg font-black text-[10px] uppercase shrink-0 transition ${
                          jaNoBolao
                            ? "bg-green-600/20 text-green-300 border border-green-600/50 cursor-default"
                            : "bg-[#FF6B00] hover:bg-[#ff7b1a] text-black cursor-pointer shadow"
                        }`}
                      >
                        {jaNoBolao ? "✅ No Bolão" : "🚀 Lançar (1 Clique)"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Identificação do Novo Bolão que está sendo preparado */}
          <div className="bg-black/70 border border-zinc-800 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1 space-y-1">
              <label className="block text-[10px] uppercase font-black text-[#FF6B00]">
                Nome / Identificação do Novo Bolão em Preparo ({jogosDoBolaoEmPreparo.length}/10 jogos salvos neste bolão)
              </label>
              <input
                value={tituloNovoBolao}
                onChange={(e) => setTituloNovoBolao(e.target.value)}
                placeholder="Ex: Bolão Rodada de Domingo / Bolão Especial"
                className="w-full bg-zinc-900 border border-zinc-700 p-2.5 rounded-lg text-xs sm:text-sm text-white font-bold outline-none focus:border-[#FF6B00]"
              />
            </div>

            {listaBoloesSalvos.length > 1 && (
              <div className="sm:w-64 space-y-1">
                <label className="block text-[10px] uppercase font-bold text-zinc-400">
                  Alternar Bolão Salvo:
                </label>
                <select
                  value={bolaoEmPreparoId}
                  onChange={(e) => {
                    const idSel = e.target.value;
                    setBolaoEmPreparoId(idSel);
                    const encontrado = listaBoloesSalvos.find((b) => b.bolaoId === idSel);
                    if (encontrado) setTituloNovoBolao(encontrado.titulo);
                  }}
                  className="w-full bg-zinc-900 border border-zinc-700 p-2.5 rounded-lg text-xs text-white font-bold outline-none"
                >
                  {listaBoloesSalvos.map((b) => (
                    <option key={b.bolaoId} value={b.bolaoId}>
                      {b.titulo} ({b.jogos.length} jogos)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Time 1 */}
            <div className="bg-black/60 p-3.5 rounded-xl border border-zinc-800 space-y-3">
              <div className="flex items-center gap-3">
                <Escudo src={escudoTime1} nome={nomeTime1} size={48} />
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Mandante</label>
                  <input
                    value={nomeTime1}
                    onChange={(e) => {
                      setNomeTime1(e.target.value);
                      const p = getEscudoPadrao(e.target.value);
                      if (p && !escudoTime1.startsWith('data:')) setEscudoTime1(p);
                    }}
                    placeholder="Nome do Time 1"
                    className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-xs text-white font-bold outline-none focus:border-[#FF6B00]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-zinc-400 mb-1 font-bold">
                  📁 Carregar Escudo do Time 1:
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFile(e.target.files?.[0], setEscudoTime1)}
                  className="w-full text-xs text-zinc-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:bg-[#FF6B00] file:text-black cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-zinc-400 uppercase font-black">
                    🏆 Times da Série A • Brasileirão ({TIMES_PADRAO.length} clubes c/ escudos):
                  </span>
                </div>
                <select
                  value={TIMES_PADRAO.some((t) => t.nome === nomeTime1) ? nomeTime1 : ""}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    setNomeTime1(e.target.value);
                    setEscudoTime1(getEscudoPadrao(e.target.value));
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-xs text-white outline-none"
                >
                  <option value="">-- Escolher Série A --</option>
                  {TIMES_PADRAO.map((t) => (
                    <option key={t.nome} value={t.nome}>
                      {t.nome} ({t.uf})
                    </option>
                  ))}
                </select>

                {/* Grade visual com os escudos dos times listados da Série A */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto p-1.5 bg-zinc-950/90 border border-zinc-800/90 rounded-xl">
                  {TIMES_PADRAO.map((t) => {
                    const selecionado = normalizarNomeTime(nomeTime1) === normalizarNomeTime(t.nome);
                    return (
                      <button
                        key={t.nome}
                        type="button"
                        onClick={() => {
                          setNomeTime1(t.nome);
                          setEscudoTime1(t.escudo);
                        }}
                        className={`flex flex-col items-center justify-center gap-1 p-1.5 rounded-lg border text-center transition cursor-pointer ${
                          selecionado
                            ? "bg-[#FF6B00]/20 border-[#FF6B00] text-white shadow-md"
                            : "bg-zinc-900/70 hover:bg-zinc-800 border-zinc-800 text-zinc-300"
                        }`}
                      >
                        <Escudo src={t.escudo} nome={t.nome} size={28} />
                        <span className="text-[9px] font-bold leading-tight truncate w-full">
                          {t.nome}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Time 2 */}
            <div className="bg-black/60 p-3.5 rounded-xl border border-zinc-800 space-y-3">
              <div className="flex items-center gap-3">
                <Escudo src={escudoTime2} nome={nomeTime2} size={48} />
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Visitante</label>
                  <input
                    value={nomeTime2}
                    onChange={(e) => {
                      setNomeTime2(e.target.value);
                      const p = getEscudoPadrao(e.target.value);
                      if (p && !escudoTime2.startsWith('data:')) setEscudoTime2(p);
                    }}
                    placeholder="Nome do Time 2"
                    className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-xs text-white font-bold outline-none focus:border-[#FF6B00]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-zinc-400 mb-1 font-bold">
                  📁 Carregar Escudo do Time 2:
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFile(e.target.files?.[0], setEscudoTime2)}
                  className="w-full text-xs text-zinc-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:bg-[#FF6B00] file:text-black cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-zinc-400 uppercase font-black">
                    🏆 Times da Série A • Brasileirão ({TIMES_PADRAO.length} clubes c/ escudos):
                  </span>
                </div>
                <select
                  value={TIMES_PADRAO.some((t) => t.nome === nomeTime2) ? nomeTime2 : ""}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    setNomeTime2(e.target.value);
                    setEscudoTime2(getEscudoPadrao(e.target.value));
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-xs text-white outline-none"
                >
                  <option value="">-- Escolher Série A --</option>
                  {TIMES_PADRAO.map((t) => (
                    <option key={t.nome} value={t.nome}>
                      {t.nome} ({t.uf})
                    </option>
                  ))}
                </select>

                {/* Grade visual com os escudos dos times listados da Série A */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto p-1.5 bg-zinc-950/90 border border-zinc-800/90 rounded-xl">
                  {TIMES_PADRAO.map((t) => {
                    const selecionado = normalizarNomeTime(nomeTime2) === normalizarNomeTime(t.nome);
                    return (
                      <button
                        key={t.nome}
                        type="button"
                        onClick={() => {
                          setNomeTime2(t.nome);
                          setEscudoTime2(t.escudo);
                        }}
                        className={`flex flex-col items-center justify-center gap-1 p-1.5 rounded-lg border text-center transition cursor-pointer ${
                          selecionado
                            ? "bg-[#FF6B00]/20 border-[#FF6B00] text-white shadow-md"
                            : "bg-zinc-900/70 hover:bg-zinc-800 border-zinc-800 text-zinc-300"
                        }`}
                      >
                        <Escudo src={t.escudo} nome={t.nome} size={28} />
                        <span className="text-[9px] font-bold leading-tight truncate w-full">
                          {t.nome}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              value={dataJ}
              onChange={(e) => setDataJ(e.target.value)}
              placeholder="Data/Hora (Ex: 16:00)"
              className="bg-black border border-zinc-800 p-2.5 rounded-lg text-white text-xs outline-none focus:border-[#FF6B00]"
            />
            <input
              value={estadio}
              onChange={(e) => setEstadio(e.target.value)}
              placeholder="Estádio"
              className="bg-black border border-zinc-800 p-2.5 rounded-lg text-white text-xs outline-none focus:border-[#FF6B00]"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              type="button"
              onClick={addJogo}
              className="flex-1 bg-[#FF6B00] hover:bg-[#ff7b1a] text-black font-black py-3.5 px-4 rounded-xl cursor-pointer transition uppercase text-xs shadow-lg shadow-[#FF6B00]/20 flex items-center justify-center gap-1.5"
            >
              <span>🚀</span> CRIAR JOGO E LIBERAR P/ TODOS OS USUÁRIOS ({jogosPublicados.length}/10)
            </button>
            {jogosSalvosNaoPublicados.length > 0 && (
              <button
                type="button"
                onClick={() => publicarBolaoSalvo(bolaoEmPreparoId, false)}
                className="bg-green-600 hover:bg-green-500 text-black font-black py-3.5 px-5 rounded-xl cursor-pointer transition uppercase text-xs shadow-lg shadow-green-600/20 flex items-center justify-center gap-1.5"
              >
                <span>🚀</span> PUBLICAR P/ OS JOGADORES AGORA
              </button>
            )}
          </div>

          {bolaoSalvoAviso && (
            <div className="bg-amber-950/80 border border-amber-600 text-amber-200 p-3.5 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔒</span>
                <div>
                  <strong>Confronto salvo no bolão em preparo (oculto para jogadores)!</strong>
                  <div className="text-[10px] text-amber-300">
                    Continue adicionando os jogos ou clique em &quot;PUBLICAR P/ OS JOGADORES&quot; quando quiser liberar.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => publicarBolaoSalvo(bolaoEmPreparoId, false)}
                className="bg-green-500 hover:bg-green-400 text-black font-black px-3 py-1.5 rounded-lg text-[11px] cursor-pointer shrink-0 transition"
              >
                🚀 Publicar Agora
              </button>
            </div>
          )}

          {rodadaPublicadaAviso && (
            <div className="bg-green-950/80 border border-green-700 text-green-300 p-3.5 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="text-xl">✅</span>
                <div>
                  <strong>Bolão publicado e liberado com sucesso!</strong>
                  <div className="text-[10px] text-green-400">
                    Os {jogosPublicados.length} confrontos publicados já estão visíveis na área de apostas dos jogadores.
                  </div>
                </div>
              </div>
              <button
                onClick={() => setPage("palpites")}
                className="bg-green-500 hover:bg-green-400 text-black font-black px-3 py-1.5 rounded-lg text-[11px] cursor-pointer shrink-0 transition"
              >
                👁️ Ver Área de Apostas
              </button>
            </div>
          )}

          {/* =============================================================== */}
          {/* CAIXA 1: BOLÕES SALVOS E PRONTOS (AGUARDANDO PUBLICAÇÃO)        */}
          {/* =============================================================== */}
          <div className="mt-4 bg-zinc-950 border-2 border-amber-500/60 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-base">📦</span>
                <div>
                  <div className="text-xs font-black uppercase text-amber-400">
                    Bolões Salvos e Prontos • Aguardando Publicação ({jogosSalvosNaoPublicados.length} jogo(s))
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    Estes jogos já estão salvos no banco de dados, mas continuam ocultos até você publicar.
                  </div>
                </div>
              </div>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-full font-black uppercase">
                🔒 Oculto p/ Jogadores
              </span>
            </div>

            {listaBoloesSalvos.length === 0 ? (
              <p className="text-zinc-500 text-xs py-4 text-center border border-dashed border-zinc-800 rounded-xl">
                Nenhum bolão em rascunho no momento. Escolha os times acima e clique em &quot;SALVAR CONFRONTO NO NOVO BOLÃO&quot; para deixar um novo bolão pronto!
              </p>
            ) : (
              <div className="space-y-4">
                {listaBoloesSalvos.map((bolaoGrupo) => (
                  <div
                    key={bolaoGrupo.bolaoId}
                    className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-white">{bolaoGrupo.titulo}</span>
                          <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-700 px-2 py-0.5 rounded font-bold">
                            {bolaoGrupo.jogos.length}/10 jogos salvos
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          Status: Pronto no banco de dados • Aguardando sua liberação
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setBolaoEmPreparoId(bolaoGrupo.bolaoId);
                            setTituloNovoBolao(bolaoGrupo.titulo);
                            mostrarAvisoAdm(`✏️ Editando "${bolaoGrupo.titulo}". Adicione mais jogos acima!`);
                          }}
                          className="text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-3 py-1.5 rounded-lg font-bold cursor-pointer transition"
                        >
                          ➕ Adicionar + Jogos
                        </button>

                        <button
                          type="button"
                          onClick={() => publicarBolaoSalvo(bolaoGrupo.bolaoId, false)}
                          className="text-[11px] bg-green-600 hover:bg-green-500 text-black font-black px-3.5 py-1.5 rounded-lg cursor-pointer transition uppercase shadow-md shadow-green-600/20 flex items-center gap-1"
                        >
                          <span>🚀</span> PUBLICAR P/ OS JOGADORES
                        </button>

                        {jogosPublicados.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                confirm(
                                  `Deseja substituir os ${jogosPublicados.length} jogos publicados atuais por este novo bolão "${bolaoGrupo.titulo}"?`
                                )
                              ) {
                                publicarBolaoSalvo(bolaoGrupo.bolaoId, true);
                              }
                            }}
                            className="text-[11px] bg-[#FF6B00] hover:bg-[#ff7b1a] text-black font-black px-3 py-1.5 rounded-lg cursor-pointer transition uppercase"
                            title="Substitui a rodada anterior publicada por este novo bolão"
                          >
                            🔄 Publicar Substituindo Anterior
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {bolaoGrupo.jogos.map((j) => (
                        <div
                          key={j.id}
                          className="flex justify-between items-center bg-black p-2.5 rounded-xl text-xs border border-zinc-800"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-bold shrink-0">
                              SALVO
                            </span>
                            <Escudo src={j.escudoCasa} nome={j.casa} size={28} />
                            <span className="font-bold text-white truncate">{j.casa}</span>
                            <span className="text-[#FF6B00] font-black px-1">x</span>
                            <span className="font-bold text-white truncate">{j.fora}</span>
                            <Escudo src={j.escudoFora} nome={j.fora} size={28} />
                            <span className="text-[10px] text-zinc-500 ml-1 hidden sm:inline">
                              • {j.data} ({j.estadio})
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                const nova = jogos.map((x) => (x.id === j.id ? { ...x, publicado: true } : x));
                                saveJogos(nova);
                                mostrarAvisoAdm(`🚀 Jogo "${j.casa} x ${j.fora}" publicado para os jogadores!`);
                              }}
                              className="text-green-400 hover:text-green-300 font-bold px-2 py-1 bg-green-950/40 rounded border border-green-800/60 cursor-pointer text-[11px]"
                            >
                              🚀 Publicar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const nova = jogos.filter((x) => x.id !== j.id);
                                saveJogos(nova);
                              }}
                              className="text-red-400 hover:text-red-300 font-bold px-2 py-1 bg-red-950/40 rounded border border-red-900/60 cursor-pointer text-[11px]"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* =============================================================== */}
          {/* CAIXA 2: CONFRONTOS ATIVOS (JÁ PUBLICADOS P/ OS JOGADORES)      */}
          {/* =============================================================== */}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between items-center">
              <div className="text-[11px] uppercase font-bold text-zinc-400">
                🟢 JOGOS NO BOLÃO ({jogosPublicados.length}) • DISPONÍVEIS PARA OS JOGADORES
              </div>
              {jogosPublicados.length > 0 && (
                <span className="text-[10px] text-green-400 font-bold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  DISPONÍVEIS PARA OS JOGADORES
                </span>
              )}
            </div>

            {jogosPublicados.length === 0 ? (
              <div className="py-5 px-4 text-center border border-dashed border-[#FF6B00]/50 bg-black/60 rounded-xl space-y-1">
                <div className="text-xs sm:text-sm font-black text-[#FF6B00] uppercase">
                  {MENSAGEM_DATA_FIFA}
                </div>
                <p className="text-zinc-500 text-[11px]">
                  Nenhum jogo ativo no momento. Assim que a rodada retornar na ESPN, os jogos aparecerão aqui e para todos os jogadores.
                </p>
              </div>
            ) : (
              jogosPublicados.map((j) => (
                <div
                  key={j.id}
                  className="flex justify-between items-center bg-black p-2.5 rounded-xl text-xs border border-green-900/50 hover:border-green-700/60 transition"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[9px] bg-green-500/20 text-green-400 border border-green-500/40 px-1.5 py-0.5 rounded font-bold shrink-0">
                      PUBLICADO
                    </span>
                    <Escudo src={j.escudoCasa} nome={j.casa} size={32} />
                    <span className="font-bold text-white truncate">{j.casa}</span>
                    <span className="bg-zinc-900 border border-zinc-700 px-2 py-0.5 rounded font-mono text-xs font-black text-[#FF6B00]">
                      {j.placarCasa ?? 0} x {j.placarFora ?? 0}
                    </span>
                    <span className="font-bold text-white truncate">{j.fora}</span>
                    <Escudo src={j.escudoFora} nome={j.fora} size={32} />
                    {j.aoVivo && (
                      <span className="text-[9px] bg-red-600 text-white font-black px-1.5 py-0.5 rounded animate-pulse shrink-0">
                        🔴 AO VIVO {j.tempoJogo ? `• ${j.tempoJogo}` : ""}
                      </span>
                    )}
                    <span className="text-[10px] text-zinc-500 ml-2 hidden sm:inline">
                      • {j.data} ({j.estadio})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => ocultarJogoPublicadoParaRascunho(j.id)}
                      className="text-amber-300 hover:text-amber-200 font-bold px-2 py-1 bg-amber-950/40 rounded border border-amber-800/60 cursor-pointer text-[11px]"
                      title="Ocultar dos jogadores e voltar para Bolões Salvos"
                    >
                      🔒 Voltar p/ Salvo
                    </button>
                    <button
                      onClick={() => {
                        const nova = jogos.filter((x) => x.id !== j.id);
                        saveJogos(nova);
                      }}
                      className="text-red-400 hover:text-red-300 font-bold px-2 py-1 bg-red-950/40 rounded border border-red-900/60 cursor-pointer text-xs"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal de Comprovante de Pagamento do Jogador */}
        {modalComprovante && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <div>
                  <h3 className="text-base font-black text-white">Comprovante de Pagamento</h3>
                  <div className="text-xs text-zinc-400">
                    Jogador: <strong className="text-[#FF6B00]">{modalComprovante.nome}</strong> ({modalComprovante.email})
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalComprovante(null)}
                  className="text-zinc-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-400 bg-black/50 px-3 py-1.5 rounded-lg border border-zinc-800">
                <span>⏱️ Regra de Retenção:</span>
                <span className="text-amber-400 font-bold">
                  Guarda por até 3 dias (restam {calcularDiasRestantes(modalComprovante.timestamp)} dia(s))
                </span>
              </div>

              <div className="bg-black rounded-xl p-2 max-h-[55vh] overflow-auto flex items-center justify-center border border-zinc-800">
                <img
                  src={modalComprovante.url}
                  alt="Comprovante de Pagamento"
                  className="w-full h-auto object-contain rounded-lg max-h-[50vh]"
                />
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => aprovarPagamento(modalComprovante.email)}
                    className="flex-1 bg-green-600 hover:bg-green-500 text-black font-black py-3 rounded-xl cursor-pointer text-xs uppercase tracking-wider shadow-lg transition"
                  >
                    ✅ APROVAR PAGAMENTO AGORA
                  </button>
                  <button
                    type="button"
                    onClick={() => recusarPagamento(modalComprovante.email)}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-3 px-3 rounded-xl cursor-pointer text-xs transition"
                  >
                    Recusar
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => excluirComprovante(modalComprovante.email)}
                  className="w-full bg-red-950/70 hover:bg-red-900 text-red-300 border border-red-800 font-bold py-2 rounded-xl cursor-pointer text-xs transition flex items-center justify-center gap-1.5"
                >
                  <span>🗑️</span> EXCLUIR COMPROVANTE (Após término da rodada)
                </button>
              </div>
            </div>
          </div>
        )}
        <ModalAreaTransparencia />
      </div>
    );
  }

  // =========================================================================
  // 5. TELA DE APOSTAS DO JOGADOR (SEM PLACAR - QUEM VENCE OU EMPATE)
  // =========================================================================
  if (page === "palpites") {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white p-4 pb-32 max-w-xl mx-auto">
        <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
          <div className="flex items-center gap-3">
            <img src={logoBolao} alt="" className="w-9 h-9 object-contain rounded-lg" />
            <div>
              <div className="text-[10px] text-zinc-500 uppercase font-bold">Jogador Conectado</div>
              <h2 className="font-black text-lg text-white">{user?.nome || "Convidado"}</h2>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={iniciarNovaAposta}
              className="text-xs bg-green-600 hover:bg-green-500 text-black px-2.5 py-1.5 rounded-lg cursor-pointer font-black transition flex items-center gap-1 border border-green-400 shadow-md shadow-green-600/20"
              title="Limpar seleção e fazer uma nova aposta"
            >
              <span>➕</span> Fazer Nova Aposta
            </button>
            <button
              type="button"
              onClick={() => setPage("minhasApostas")}
              className={`text-xs px-2.5 py-1.5 rounded-lg cursor-pointer font-black transition flex items-center gap-1 border ${
                isMinhaApostaAprovada
                  ? "bg-green-600 hover:bg-green-500 text-black border-green-400 shadow-md shadow-green-600/20"
                  : "bg-[#FF6B00] hover:bg-[#ff7b1a] text-black border-[#FF6B00]"
              }`}
              title="Abrir área Minhas Apostas"
            >
              <span>🎫</span> Minhas Apostas ({meusPalpitesSalvos.length})
            </button>
            <button
              type="button"
              onClick={() => setPastaComprovanteAberta(true)}
              className="text-xs bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white px-2.5 py-1.5 rounded-lg cursor-pointer font-bold transition flex items-center gap-1"
              title="Abrir pasta de comprovantes"
            >
              <span>📁</span> Comprovantes
            </button>
            <PWAInstallButton variant="compact" logoSrc={logoBolao} />
            <button
              onClick={() => setPage("classificacao")}
              className="text-xs bg-[#FF6B00]/10 border border-[#FF6B00]/40 text-[#FF6B00] hover:bg-[#FF6B00]/20 px-2.5 py-1.5 rounded-lg cursor-pointer font-bold transition flex items-center gap-1"
            >
              <span>🏆</span> Ranking
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("elite_user_v11");
                localStorage.removeItem("elite_escolhas_temp_v11");
                setEscolhasTemp({});
                setUser(null);
                setPage("landing");
              }}
              className="text-xs border border-zinc-800 hover:border-zinc-600 px-2.5 py-1.5 rounded cursor-pointer"
            >
              Sair
            </button>
          </div>
        </div>

        {/* NOTIFICAÇÃO OFICIAL DE PAGAMENTO APROVADO */}
        {(user?.statusPagamento === "APROVADO" && palpites.some((p) => p.jogadorEmail === user?.email && p.pago)) ? (
          <div className="mt-4 bg-gradient-to-r from-green-950 via-zinc-900 to-black border-2 border-green-500/80 text-green-300 p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 border border-green-500 flex items-center justify-center text-xl shrink-0">
                🎉
              </div>
              <div>
                <div className="text-[10px] uppercase font-black tracking-wider text-green-400">
                  Notificação do Administrador
                </div>
                <div className="text-sm font-black text-white">
                  PAGAMENTO E APOSTAS APROVADAS COM SUCESSO!
                </div>
                <p className="text-[11px] text-green-300/90 mt-0.5">
                  Suas apostas foram validadas pelo ADM! Confira abaixo seus times selecionados com seus dados de titularidade.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPage("minhasApostas")}
              className="bg-green-500 hover:bg-green-400 text-black font-black text-xs px-3.5 py-2 rounded-xl uppercase shrink-0 cursor-pointer transition shadow-lg flex items-center justify-center gap-1.5"
            >
              <span>🎫</span> VER MINHAS APOSTAS
            </button>
          </div>
        ) : user?.statusPagamento === "EM_ANALISE" ? (
          <div className="mt-4 bg-amber-950/70 border border-amber-600/80 text-amber-200 p-3.5 rounded-2xl flex items-center justify-between gap-2 animate-fade-in">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">⏳</span>
              <div>
                <div className="text-xs font-bold text-white">Comprovante em Análise pelo ADM</div>
                <p className="text-[10px] text-amber-300/90">
                  O organizador está conferindo seu PIX. Assim que aprovado, sua confirmação aparecerá aqui!
                </p>
              </div>
            </div>
            <button
              onClick={() => setPage("pagamento")}
              className="text-[10px] bg-amber-500 hover:bg-amber-400 text-black font-black px-2.5 py-1.5 rounded-lg shrink-0 cursor-pointer"
            >
              Ver Status
            </button>
          </div>
        ) : user?.statusPagamento === "RECUSADO" ? (
          <div className="mt-4 bg-red-950/70 border border-red-600/80 text-red-200 p-3.5 rounded-2xl flex items-center justify-between gap-2 animate-fade-in">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">⚠️</span>
              <div>
                <div className="text-xs font-bold text-white">Comprovante Recusado pelo ADM</div>
                <p className="text-[10px] text-red-300/90">
                  Houve uma divergência no comprovante. Por favor, reenvie o comprovante na tela de pagamento.
                </p>
              </div>
            </div>
            <button
              onClick={() => setPage("pagamento")}
              className="text-[10px] bg-red-600 hover:bg-red-500 text-white font-black px-2.5 py-1.5 rounded-lg shrink-0 cursor-pointer"
            >
              Reenviar
            </button>
          </div>
        ) : null}

        <div className="mt-4 bg-[#FF6B00] text-black p-4 rounded-xl shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider">Valor do Bolão</div>
              <div className="text-3xl font-black">R$ {config.valor}</div>
            </div>
            <div className="text-right">
              <span className="text-[10px] bg-black text-[#FF6B00] font-black px-2 py-0.5 rounded">
                80% EM PRÊMIOS
              </span>
              <div className="text-[10px] font-bold text-black/70 mt-1">1º 50% • 2º 30% • 3º 20%</div>
            </div>
          </div>
          <div className="text-xs mt-2 pt-2 border-t border-black/20">
            Chave PIX: <b>{config.pixAdm}</b>
          </div>
        </div>

        {/* Contabilizador de Depósito em Tempo Real na Área do Jogador */}
        <ContabilizadorDepositosJogador mostrarBotaoDepositar={true} />

        {/* Área de Transparência em Tempo Real (Comprovantes de Premiação enviados pelo ADM) */}
        <PainelTransparenciaJogadores />

        {/* Área Minhas Apostas (exibida automaticamente quando o jogador já selecionou seus times / ADM aprovou) */}
        {meusPalpitesSalvos.length > 0 && !modoNovaAposta && <AreaMinhasApostas modoCompacto={true} />}

        {/* Banner de Modo Nova Aposta */}
        {modoNovaAposta && (
          <div className="mt-4 bg-gradient-to-r from-[#FF6B00]/25 via-zinc-900 to-black border-2 border-[#FF6B00] p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FF6B00] text-black font-black flex items-center justify-center text-xl shrink-0">
                ➕
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-[#FF6B00]">
                  Nova Aposta Iniciada
                </div>
                <div className="text-sm font-black text-white">
                  Selecione seus times nos confrontos abaixo!
                </div>
                <p className="text-[11px] text-zinc-300">
                  As marcações foram limpas para você montar sua nova aposta e confirmar no PIX.
                </p>
              </div>
            </div>
            {meusPalpitesSalvos.length > 0 && (
              <button
                type="button"
                onClick={() => setModoNovaAposta(false)}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold px-3 py-2 rounded-xl cursor-pointer shrink-0 border border-zinc-700 transition"
              >
                Cancelar / Manter Anterior
              </button>
            )}
          </div>
        )}

        {/* Status da Rodada (Dinâmico • Atualiza a cada 1 minuto ao vivo da ESPN) */}
        <div
          id="secao-jogos-rodada"
          className="mt-4 flex flex-wrap items-center justify-between gap-2 bg-zinc-900/90 border border-zinc-800 px-3.5 py-2.5 rounded-xl"
        >
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${jogosPublicados.length > 0 ? "bg-green-500 animate-pulse" : "bg-amber-500"}`}></span>
              <span className="text-xs font-bold text-white">
                {jogosPublicados.length > 0
                  ? `Escolha de Jogos: ${jogosPublicados.length} Jogo(s) Disponível(is) p/ Apostar`
                  : MENSAGEM_DATA_FIFA}
              </span>
            </div>
            <span className="text-[10px] text-green-400 font-mono">
              🟢 Placar ao Vivo ESPN • Atualiza a cada 1 min
              {ultimaAtualizacaoJogos ? ` • ${ultimaAtualizacaoJogos}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => atualizarJogosEspnAoVivo()}
              disabled={carregandoEspnRapido}
              className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold px-2.5 py-1 rounded-lg cursor-pointer transition border border-zinc-700"
            >
              {carregandoEspnRapido ? "🔄..." : "🔄 Atualizar"}
            </button>
            <button
              type="button"
              onClick={iniciarNovaAposta}
              className="text-[10px] bg-green-600 hover:bg-green-500 text-black font-black px-2.5 py-1 rounded-lg cursor-pointer transition flex items-center gap-1"
            >
              <span>➕</span> Fazer Nova Aposta
            </button>
            <span className="text-[10px] bg-black text-[#FF6B00] font-black px-2 py-0.5 rounded border border-zinc-800">
              {jogosPublicados.filter((jp) => Boolean(getEscolhaDoJogo(jp))).length}/{jogosPublicados.length} APOSTADOS
            </span>
          </div>
        </div>

        {jogosPublicados.length === 0 ? (
          <div className="mt-8 text-center py-12 px-4 bg-zinc-900/80 rounded-2xl border-2 border-[#FF6B00]/60 text-zinc-300 space-y-3 shadow-xl">
            <div className="text-4xl">⚽</div>
            <div className="font-black text-base sm:text-xl text-[#FF6B00] uppercase tracking-wider">
              {MENSAGEM_DATA_FIFA}
            </div>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Conectado ao vivo na API oficial da ESPN (Brasileirão Série A). A página atualiza automaticamente a cada 1 minuto sem usar jogos falsos.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {jogosPublicados.map((j, idx) => {
              const escolhaAtual = getEscolhaDoJogo(j);
              const ganhouJogo = Boolean(escolhaAtual && j.resultadoOficial && j.resultadoOficial === escolhaAtual);
              const perdeuJogo = Boolean(escolhaAtual && j.resultadoOficial && j.resultadoOficial !== escolhaAtual);

              return (
                <div
                  key={j.id}
                  className={`bg-zinc-900 border-2 rounded-2xl overflow-hidden shadow-md transition ${
                    ganhouJogo
                      ? "border-green-500"
                      : perdeuJogo
                      ? "border-red-600"
                      : escolhaAtual
                      ? "border-[#FF6B00] shadow-[#FF6B00]/10"
                      : "border-zinc-800"
                  }`}
                >
                  {/* Topo de cada aposta com os dados do jogador para comprovação */}
                  {user && (
                    <div className="bg-zinc-950 border-b border-zinc-800 px-3.5 py-2 flex flex-wrap items-center justify-between gap-1 text-[10px]">
                      <div className="flex flex-wrap items-center gap-1.5 text-zinc-300">
                        <span className="bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/40 font-black px-1.5 py-0.5 rounded uppercase">
                          Aposta #{idx + 1}
                        </span>
                        <span className="font-black text-white">👤 {user.nome}</span>
                        <span className="text-zinc-500 font-mono">({user.email})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-400">
                          PIX: <strong className="text-[#FF6B00] font-mono">{user.pix}</strong>
                        </span>
                        {ganhouJogo ? (
                          <span className="bg-green-500 text-black px-2 py-0.5 rounded font-black uppercase text-[10px] shadow">
                            ✅ GANHOU
                          </span>
                        ) : perdeuJogo ? (
                          <span className="bg-red-600 text-white px-2 py-0.5 rounded font-black uppercase text-[10px] shadow">
                            ❌ PERDEU
                          </span>
                        ) : escolhaAtual ? (
                          <span className="bg-green-950 text-green-400 border border-green-700/80 px-1.5 py-0.5 rounded font-black uppercase text-[9px]">
                            ✓ Selecionado
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )}

                  <div className="p-4 space-y-3">
                    {/* Cabeçalho do Confronto + Status Ao Vivo da ESPN */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-zinc-400 uppercase font-bold tracking-wider border-b border-zinc-800/80 pb-2">
                      <span>Jogo #{idx + 1} • {j.data} • {j.estadio}</span>
                      {j.aoVivo ? (
                        <span className="bg-red-600 text-white font-black px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1">
                          <span>🔴</span> AO VIVO {j.tempoJogo ? `• ${j.tempoJogo}` : ""}
                        </span>
                      ) : j.encerrado ? (
                        <span className="bg-zinc-800 text-zinc-200 font-black px-2 py-0.5 rounded-full">
                          🏁 ENCERRADO
                        </span>
                      ) : (
                        <span className="bg-black text-green-400 border border-green-800/60 font-mono px-2 py-0.5 rounded-full">
                          🟢 ESPN AO VIVO
                        </span>
                      )}
                    </div>

                    {/* Aviso de Resultado Lançado pelo ADM */}
                    {j.resultadoOficial && escolhaAtual && (
                      <div
                        className={`px-3 py-2 rounded-xl border text-xs font-black flex items-center justify-between ${
                          ganhouJogo
                            ? "bg-green-950/70 border-green-500 text-green-300"
                            : "bg-red-950/70 border-red-600 text-red-300"
                        }`}
                      >
                        <span>
                          Resultado Oficial:{" "}
                          {j.resultadoOficial === "CASA"
                            ? `Vitória ${j.casa}`
                            : j.resultadoOficial === "FORA"
                            ? `Vitória ${j.fora}`
                            : "Empate"}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-[11px] uppercase ${
                            ganhouJogo ? "bg-green-500 text-black" : "bg-red-600 text-white"
                          }`}
                        >
                          {ganhouJogo ? "✅ SUA APOSTA GANHOU" : "❌ SUA APOSTA PERDEU"}
                        </span>
                      </div>
                    )}

                  <div className="flex items-center justify-between gap-3 px-2">
                    {/* Mandante */}
                    <button
                      type="button"
                      onClick={() => selecionarOpcaoJogo(j, "CASA")}
                      className={`flex items-center gap-2.5 flex-1 min-w-0 text-left p-1.5 rounded-xl transition cursor-pointer ${
                        escolhaAtual === "CASA"
                          ? "bg-[#FF6B00]/20 ring-1 ring-[#FF6B00]"
                          : "hover:bg-zinc-800/60"
                      }`}
                    >
                      <Escudo src={j.escudoCasa} nome={j.casa} size={42} />
                      <span className="font-black text-sm truncate text-white">{j.casa}</span>
                    </button>

                    {/* Placar Ao Vivo em Tempo Real */}
                    <div className="flex flex-col items-center shrink-0 px-2">
                      <div className="bg-black border-2 border-zinc-700 px-3 py-1 rounded-xl font-mono text-base font-black text-white flex items-center gap-2 shadow-inner">
                        <span>{j.placarCasa ?? 0}</span>
                        <span className="text-[#FF6B00] text-xs">X</span>
                        <span>{j.placarFora ?? 0}</span>
                      </div>
                      <span className="text-[9px] text-zinc-500 font-bold uppercase mt-0.5">
                        {j.aoVivo ? j.tempoJogo || "Em andamento" : j.encerrado ? "Placar Final" : "Placar Ao Vivo"}
                      </span>
                    </div>

                    {/* Visitante */}
                    <button
                      type="button"
                      onClick={() => selecionarOpcaoJogo(j, "FORA")}
                      className={`flex items-center gap-2.5 flex-1 min-w-0 justify-end text-right p-1.5 rounded-xl transition cursor-pointer ${
                        escolhaAtual === "FORA"
                          ? "bg-[#FF6B00]/20 ring-1 ring-[#FF6B00]"
                          : "hover:bg-zinc-800/60"
                      }`}
                    >
                      <span className="font-black text-sm truncate text-right text-white">{j.fora}</span>
                      <Escudo src={j.escudoFora} nome={j.fora} size={42} />
                    </button>
                  </div>

                  {/* SELETOR: QUEM VENCE OU EMPATE */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {/* 1: Mandante */}
                    <button
                      type="button"
                      onClick={() => selecionarOpcaoJogo(j, "CASA")}
                      className={`p-3 rounded-xl border text-center font-bold text-xs transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                        escolhaAtual === "CASA"
                          ? "bg-[#FF6B00] text-black border-[#FF6B00] shadow-md shadow-[#FF6B00]/30 scale-[1.02]"
                          : "bg-black/70 text-zinc-300 border-zinc-800 hover:border-zinc-700"
                      }`}
                    >
                      <span className="text-[9px] uppercase font-bold opacity-75">Coluna 1</span>
                      <span className="font-black text-xs truncate max-w-full">
                        {j.casa}
                      </span>
                    </button>

                    {/* X: Empate */}
                    <button
                      type="button"
                      onClick={() => selecionarOpcaoJogo(j, "EMPATE")}
                      className={`p-3 rounded-xl border text-center font-bold text-xs transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                        escolhaAtual === "EMPATE"
                          ? "bg-[#FF6B00] text-black border-[#FF6B00] shadow-md shadow-[#FF6B00]/30 scale-[1.02]"
                          : "bg-black/70 text-zinc-300 border-zinc-800 hover:border-zinc-700"
                      }`}
                    >
                      <span className="text-[9px] uppercase font-bold opacity-75">Coluna do Meio</span>
                      <span className="font-black text-xs">Empate</span>
                    </button>

                    {/* 2: Visitante */}
                    <button
                      type="button"
                      onClick={() => selecionarOpcaoJogo(j, "FORA")}
                      className={`p-3 rounded-xl border text-center font-bold text-xs transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                        escolhaAtual === "FORA"
                          ? "bg-[#FF6B00] text-black border-[#FF6B00] shadow-md shadow-[#FF6B00]/30 scale-[1.02]"
                          : "bg-black/70 text-zinc-300 border-zinc-800 hover:border-zinc-700"
                      }`}
                    >
                      <span className="text-[9px] uppercase font-bold opacity-75">Coluna 2</span>
                      <span className="font-black text-xs truncate max-w-full">
                        {j.fora}
                      </span>
                    </button>
                  </div>
                  </div>
                </div>
              );
            })}

            {isMinhaApostaAprovada && !modoNovaAposta && (
              <button
                type="button"
                onClick={async () => {
                  if (!user) {
                    setPage("loginJogador");
                    return;
                  }
                  const jogosComPalpite = jogosPublicados.filter((j) => Boolean(getEscolhaDoJogo(j)));
                  if (jogosComPalpite.length === 0) {
                    alert("Selecione seus palpites nos jogos da rodada antes de finalizar a aposta!");
                    return;
                  }
                  await salvarPalpitesTemporariosSeHouver();
                  setPage("minhasApostas");
                }}
                className="w-full bg-[#FF6B00] hover:bg-[#ff7b1a] text-black font-black py-4 rounded-xl mt-4 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition uppercase tracking-wider text-sm shadow-lg shadow-[#FF6B00]/20 flex items-center justify-center gap-2"
              >
                <span>⚡</span>
                <span>SALVAR MEUS PALPITES (PAGAMENTO JÁ CONFIRMADO)</span>
              </button>
            )}

            {/* 2 BOTÕES DE PAGAMENTO LADO A LADO EM CAIXAS SEPARADAS */}
            <BotoesPagamentoDuplo validarPalpitesAntes={true} />

            {meusPalpitesSalvos.length > 0 && !modoNovaAposta && (
              <button
                type="button"
                onClick={iniciarNovaAposta}
                className="w-full bg-green-600 hover:bg-green-500 text-black font-black py-3.5 rounded-xl mt-2 cursor-pointer hover:scale-[1.01] transition uppercase tracking-wider text-xs sm:text-sm shadow-lg shadow-green-600/20 flex items-center justify-center gap-2"
              >
                <span>➕</span> FAZER NOVA APOSTA
              </button>
            )}
          </div>
        )}

        {/* MODAL: PASTA DO JOGADOR - COMPROVANTE DE PAGAMENTO */}
        {pastaComprovanteAberta && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📁</span>
                  <div>
                    <h3 className="text-base font-black text-white">Pasta: Comprovante de Pagamento</h3>
                    <div className="text-[10px] text-zinc-400">
                      Jogador: <strong className="text-[#FF6B00]">{user?.nome}</strong> ({user?.email})
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPastaComprovanteAberta(false)}
                  className="text-zinc-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Informação sobre os 3 dias */}
              <div className="bg-black/60 p-3 rounded-xl border border-zinc-800 text-xs text-zinc-300 space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span>⏱️</span> Regra de Retenção do Comprovante
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  O comprovante pode ser excluído pelo ADM após o término da rodada. Caso o ADM não exclua, ele fica armazenado por <strong>3 dias</strong> nesta sua pasta para consulta.
                </p>
              </div>

              {/* Comprovante atual se houver */}
              {user?.comprovante ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Comprovante Arquivado:</span>
                    <span className="text-amber-400 font-bold bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/80 text-[10px]">
                      Restam {calcularDiasRestantes(user?.timestampComprovante)} dia(s) na pasta
                    </span>
                  </div>

                  <div className="bg-black rounded-xl p-2 max-h-[45vh] overflow-auto flex items-center justify-center border border-zinc-800">
                    <img
                      src={user.comprovante}
                      alt="Comprovante de Pagamento"
                      className="w-full h-auto object-contain rounded-lg max-h-[40vh]"
                    />
                  </div>

                  <div className="text-[11px] text-zinc-400 text-center">
                    Enviado em: <strong className="text-zinc-200">{user.dataEnvioComprovante || "Recente"}</strong>
                  </div>
                </div>
              ) : (
                <div className="bg-black/50 p-6 rounded-2xl border border-dashed border-zinc-800 text-center space-y-2">
                  <div className="text-2xl">📭</div>
                  <div className="text-xs font-bold text-white">Nenhum comprovante salvo no momento</div>
                  <p className="text-[11px] text-zinc-500">
                    Envie a foto ou print do seu pagamento PIX para arquivar nesta pasta e liberar suas apostas.
                  </p>
                </div>
              )}

              {/* Opção para enviar / reenviar novo comprovante */}
              <div className="pt-2 border-t border-zinc-800 space-y-2.5">
                <label className="block text-xs font-bold text-white">
                  📤 {user?.comprovante ? "Substituir ou Enviar Novo Comprovante:" : "Enviar Comprovante de Pagamento:"}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFile(e.target.files?.[0], setTempComprovante)}
                  className="w-full text-xs text-zinc-400 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-black file:bg-[#FF6B00] file:text-black cursor-pointer"
                />

                {tempComprovante && (
                  <div className="space-y-2 pt-1">
                    <div className="relative w-28 h-28 rounded-lg overflow-hidden border border-zinc-700 bg-black mx-auto">
                      <img src={tempComprovante} alt="Prévia" className="w-full h-full object-contain" />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        enviarComprovante(user.email, tempComprovante);
                        setTempComprovante("");
                        alert("Comprovante gravado na sua pasta e enviado para o ADM com sucesso!");
                      }}
                      className="w-full bg-green-600 hover:bg-green-500 text-black font-black py-2.5 rounded-xl cursor-pointer text-xs uppercase tracking-wider transition shadow-md"
                    >
                      💾 SALVAR NA PASTA & ENVIAR P/ O ADM
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setPastaComprovanteAberta(false)}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2.5 rounded-xl cursor-pointer text-xs transition"
              >
                Fechar Pasta
              </button>
            </div>
          </div>
        )}
        <ModalPixDireto />
        <ModalAreaTransparencia />
      </div>
    );
  }

  // =========================================================================
  // 5.1 TELA DEDICADA: MINHAS APOSTAS (COMPROVANTE DE TITULARIDADE DO JOGADOR)
  // =========================================================================
  if (page === "minhasApostas") {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white p-4 pb-28 max-w-xl mx-auto space-y-4">
        <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
          <button
            onClick={() => setPage("palpites")}
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer font-bold"
          >
            ← Voltar para Jogos
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage("classificacao")}
              className="text-xs bg-zinc-900 border border-zinc-800 text-[#FF6B00] px-2.5 py-1.5 rounded-lg cursor-pointer font-bold"
            >
              🏆 Ranking
            </button>
            <button
              onClick={() => setPage("pagamento")}
              className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-300 px-2.5 py-1.5 rounded-lg cursor-pointer font-bold"
            >
              💠 PIX
            </button>
          </div>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-[#FF6B00]">
              Bilhete Oficial Individual
            </div>
            <h2 className="text-xl font-black text-white">Minhas Apostas Registradas</h2>
            <p className="text-xs text-zinc-400">
              Cada aposta abaixo exibe seus dados de jogador no topo para comprovar que o palpite pertence a você.
            </p>
          </div>
          <div className="text-3xl shrink-0">🎫</div>
        </div>

        <AreaMinhasApostas modoCompacto={false} />

        <PainelTransparenciaJogadores />

        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={iniciarNovaAposta}
            className="w-full bg-green-600 hover:bg-green-500 text-black font-black py-4 rounded-xl cursor-pointer text-xs sm:text-sm uppercase tracking-wider transition shadow-lg shadow-green-600/20 flex items-center justify-center gap-2"
          >
            <span>➕</span> FAZER NOVA APOSTA
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPage("palpites")}
              className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold py-3.5 rounded-xl cursor-pointer text-xs uppercase tracking-wider transition"
            >
              ⚽ Ver Confrontos
            </button>
            <button
              type="button"
              onClick={() => setPage("classificacao")}
              className="w-full bg-[#FF6B00] hover:bg-[#ff7b1a] text-black font-black py-3.5 rounded-xl cursor-pointer text-xs uppercase tracking-wider transition shadow-lg shadow-[#FF6B00]/20"
            >
              🏆 Ver Ranking Geral
            </button>
          </div>
        </div>
        <ModalAreaTransparencia />
      </div>
    );
  }

  // =========================================================================
  // 6. TELA DE CLASSIFICAÇÃO / RANKING (VISÍVEL AOS JOGADORES)
  // =========================================================================
  if (page === "classificacao") {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white p-4 pb-24 max-w-xl mx-auto space-y-4">
        <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
          <button
            onClick={() => setPage("palpites")}
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
          >
            ← Voltar para Apostas
          </button>
          <span className="text-xs font-black text-[#FF6B00]">TRIAGEM & RANKING</span>
        </div>

        <div className="bg-gradient-to-b from-[#FF6B00]/15 to-transparent border border-[#FF6B00]/30 p-5 rounded-2xl text-center space-y-1">
          <div className="text-3xl">🏆</div>
          <h2 className="text-2xl font-black">Classificação da Rodada</h2>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Ganha quem mais pontuar nos confrontos da rodada (vitórias e empates).
          </p>
          <div className="pt-2 text-xs font-bold text-[#FF6B00]">
            Prêmio Total em Disputa: R$ {premio80.toFixed(2)} (80%)
          </div>
        </div>

        {/* Contabilizador de Depósito também visível no Ranking */}
        <ContabilizadorDepositosJogador mostrarBotaoDepositar={true} />

        {/* Área de Transparência também visível no Ranking */}
        <PainelTransparenciaJogadores />

        <div className="space-y-2.5">
          {rankingGanhadores.length === 0 ? (
            <p className="text-zinc-500 text-xs py-8 text-center bg-zinc-900/60 rounded-xl border border-zinc-800">
              Nenhuma aposta cadastrada ainda nesta rodada.
            </p>
          ) : (
            rankingGanhadores.map((jg, index) => {
              const isPrimeiro = index === 0 && jg.pontos > 0;
              const isSegundo = index === 1 && jg.pontos > 0;
              const isTerceiro = index === 2 && jg.pontos > 0;

              let premioEstimado = 0;
              if (jg.isPago) {
                if (isPrimeiro) premioEstimado = premio1;
                else if (isSegundo) premioEstimado = premio2;
                else if (isTerceiro) premioEstimado = premio3;
              }

              return (
                <div
                  key={jg.email}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                    isPrimeiro
                      ? "bg-amber-500/10 border-amber-500/50"
                      : isSegundo
                      ? "bg-zinc-900 border-zinc-700"
                      : isTerceiro
                      ? "bg-zinc-900 border-zinc-800"
                      : "bg-black/60 border-zinc-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                        index === 0
                          ? "bg-amber-400 text-black"
                          : index === 1
                          ? "bg-zinc-300 text-black"
                          : index === 2
                          ? "bg-amber-700 text-white"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {index + 1}º
                    </div>

                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-1.5">
                        {jg.nome}
                        {jg.email === user?.email && (
                          <span className="text-[9px] bg-[#FF6B00] text-black font-black px-1.5 py-0.5 rounded">
                            VOCÊ
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {jg.isPago ? "✅ Aposta Confirmada (Pago)" : "⏳ Aguardando Pagamento"}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-black text-[#FF6B00]">{jg.pontos} pts</div>
                    {premioEstimado > 0 && (
                      <div className="text-[11px] font-black text-green-400">
                        R$ {premioEstimado.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        <ModalPixDireto />
        <ModalAreaTransparencia />
      </div>
    );
  }

  // =========================================================================
  // 6.5 PÁGINA DE SUCESSO DO PIX INFINITEPAY (/pagamento-sucesso?jogador_id=XXX)
  // =========================================================================
  if (page === "pagamentoSucesso") {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white p-6 flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-zinc-900 p-7 rounded-3xl border-2 border-green-500/80 text-center shadow-2xl space-y-5">
          <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center text-4xl mx-auto shadow-lg shadow-green-500/20">
            ✅
          </div>

          <div className="inline-block bg-green-500 text-black text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider">
            PIX CONFIRMADO AUTOMATICAMENTE
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
            Pagamento confirmado! Sua aposta está garantida.
          </h2>

          <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed">
            {confirmandoSucesso
              ? "Sincronizando confirmação automática no banco de dados..."
              : "Seu pagamento via InfinitePay PIX foi registrado automaticamente no sistema e sua participação na rodada já está 100% aprovada."}
          </p>

          {user && (
            <div className="bg-black/80 border border-zinc-800 rounded-2xl p-4 text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-zinc-400">Jogador:</span>
                <strong className="text-white">{user.nome}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">E-mail:</span>
                <strong className="text-zinc-200 font-mono">{user.email}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Status do Pagamento:</span>
                <strong className="text-green-400 uppercase">PAGO / APROVADO</strong>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.history?.replaceState) {
                window.history.replaceState({}, "", "/");
              }
              setPage("palpites");
            }}
            className="w-full bg-[#FF6B00] hover:bg-[#ff7b1a] text-black font-black py-4 rounded-xl cursor-pointer hover:scale-[1.02] transition text-sm uppercase tracking-wider shadow-lg shadow-[#FF6B00]/25"
          >
            Ver Bolão
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 7. TELA DE PAGAMENTO DO BOLÃO (2 BOTÕES LADO A LADO EM CAIXAS SEPARADAS)
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 flex flex-col items-center justify-center">
      <div className="max-w-2xl w-full bg-zinc-900 p-6 rounded-2xl border border-zinc-800 text-center shadow-2xl">
        <img
          src={logoBolao}
          alt=""
          className="w-20 h-20 object-contain mx-auto mb-2 drop-shadow-[0_8px_16px_rgba(239,68,68,0.3)] rounded-xl"
        />
        <div className="inline-block border border-[#FF6B00]/30 bg-[#FF6B00]/10 text-[#FF6B00] text-xs font-bold px-4 py-1.5 rounded-full uppercase">
          PAGAMENTO DO BOLÃO • R$ {valorCotaNumerico}
        </div>
        <h2 className="text-3xl font-black mt-4">Escolha como Pagar</h2>
        <p className="text-zinc-300 text-xs sm:text-sm mt-2 font-bold">
          Pague no PIX Direto enviando comprovante ou no Checkout Automático InfinitePay
        </p>

        {/* Contabilizador de Depósito na Tela de Pagamento */}
        <div className="text-left">
          <ContabilizadorDepositosJogador mostrarBotaoDepositar={false} />
        </div>

        {/* 2 BOTÕES LADO A LADO EM CAIXAS SEPARADAS */}
        <BotoesPagamentoDuplo validarPalpitesAntes={false} />

        <div className="mt-6 space-y-2">
          <button
            onClick={() => setPage("minhasApostas")}
            className="w-full bg-green-600 hover:bg-green-500 text-black font-black py-3.5 rounded-xl cursor-pointer transition text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
          >
            <span>🎫</span> VER MINHAS APOSTAS OFICIAIS
          </button>
          <button
            onClick={() => setPage("palpites")}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl text-xs cursor-pointer uppercase tracking-wider"
          >
            Voltar para Jogos da Rodada
          </button>
          <button
            onClick={() => setPage("landing")}
            className="w-full border border-zinc-800 hover:border-zinc-700 text-zinc-400 py-2.5 rounded-xl text-xs cursor-pointer"
          >
            Voltar ao Início
          </button>
        </div>
      </div>

      <ModalPixDireto />
    </div>
  );
}
