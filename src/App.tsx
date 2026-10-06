import React, { useState, useEffect } from 'react';
import logoOficial from './assets/images/bolao_elite_logo_1791164462566.jpg';
import {
  db,
  collection,
  doc,
  getDoc,
  onSnapshot,
  OperationType,
  handleFirestoreError,
  getJogadorDocId,
  upsertJogadorInDb,
  deleteJogadorFromDb,
  upsertJogoInDb,
  deleteJogoFromDb,
  upsertPalpiteInDb,
  deletePalpiteFromDb,
  saveConfigInDb,
  compressImageToDataUrl,
  criarPagamentoInfinitePay,
} from './firebase';

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
  estadio: string;
  resultadoOficial?: EscolhaResultado;
}

export interface Palpite {
  jogadorEmail: string;
  jogoId: string;
  escolha: EscolhaResultado;
  pago?: boolean;
}

export function geraPixPayload(chave: string, nome: string, cidade: string, valor: number | string): string {
  const c = (chave || "").trim();
  const n = ((nome || "INHO BAHIA").trim())
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .slice(0, 25);
  const cid = ((cidade || "ITABUNA").trim())
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .slice(0, 15);
  const numVal = parseFloat(String(valor).replace(",", "."));
  const vStr = !isNaN(numVal) && numVal > 0 ? numVal.toFixed(2) : "";

  const tlv = (id: string, value: string) => {
    const len = value.length.toString().padStart(2, "0");
    return `${id}${len}${value}`;
  };

  const f00 = tlv("00", "01");
  const gui = tlv("00", "br.gov.bcb.pix");
  const key = tlv("01", c);
  const f26 = tlv("26", `${gui}${key}`);
  const f52 = tlv("52", "0000");
  const f53 = tlv("53", "986");
  const f54 = vStr ? tlv("54", vStr) : "";
  const f58 = tlv("58", "BR");
  const f59 = tlv("59", n);
  const f60 = tlv("60", cid);
  const f62 = tlv("62", tlv("05", "***"));

  const payloadSemCRC = `${f00}${f26}${f52}${f53}${f54}${f58}${f59}${f60}${f62}6304`;

  let crc = 0xFFFF;
  for (let i = 0; i < payloadSemCRC.length; i++) {
    crc ^= payloadSemCRC.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  const crcHex = crc.toString(16).toUpperCase().padStart(4, "0");
  return `${payloadSemCRC}${crcHex}`;
}

export default function App() {
  const [page, setPage] = useState<"landing" | "loginJogador" | "adminLogin" | "admin" | "palpites" | "minhasApostas" | "pagamento" | "pagamentoSucesso" | "classificacao">(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname || "";
      const params = new URLSearchParams(window.location.search);
      if (path.includes("/pagamento-sucesso") || params.get("jogador_id")) {
        return "pagamentoSucesso";
      }
    }
    return "landing";
  });
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [jogadores, setJogadores] = useState<any[]>([]);
  const [palpites, setPalpites] = useState<Palpite[]>([]);
  const [user, setUser] = useState<any>(null);
  const [config, setConfig] = useState<{ valor: number | string; chavePix: string; nomePix: string; cidadePix: string; pixAdm: string }>({ valor: 10, chavePix: "01780181558", nomePix: "INHO BAHIA", cidadePix: "ITABUNA", pixAdm: "01780181558" });
  const [copiadoPix, setCopiadoPix] = useState(false);
  const [copiadaChave, setCopiadaChave] = useState(false);
  const [pixSalvoAviso, setPixSalvoAviso] = useState(false);
  const [rodadaPublicadaAviso, setRodadaPublicadaAviso] = useState(false);
  const [triagemSalvaAviso, setTriagemSalvaAviso] = useState(false);
  const [modalComprovante, setModalComprovante] = useState<{ url: string; nome: string; email: string; timestamp?: number } | null>(null);
  const [pastaComprovanteAberta, setPastaComprovanteAberta] = useState(false);
  const [tempComprovante, setTempComprovante] = useState<string>("");
  const [gerandoPixInfinite, setGerandoPixInfinite] = useState(false);
  const [erroPixInfinite, setErroPixInfinite] = useState("");
  const [linkPixGerado, setLinkPixGerado] = useState("");
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

  // Confronto Form
  const [nomeTime1, setNomeTime1] = useState("Palmeiras");
  const [nomeTime2, setNomeTime2] = useState("Grêmio");
  const [escudoTime1, setEscudoTime1] = useState(() => getEscudoPadrao("Palmeiras"));
  const [escudoTime2, setEscudoTime2] = useState(() => getEscudoPadrao("Grêmio"));
  const [dataJ, setDataJ] = useState("16:00");
  const [estadio, setEstadio] = useState("Maracanã");

  // Escolhas temporárias do jogador para a rodada atual
  const [escolhasTemp, setEscolhasTemp] = useState<Record<string, EscolhaResultado>>({});

  // Termos
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [showTermosModal, setShowTermosModal] = useState(false);

  // Filtro de apostas na área ADM
  const [filtroApostasAdm, setFiltroApostasAdm] = useState<"todos" | "pagos" | "pendentes">("todos");
  const [abaLoginJogador, setAbaLoginJogador] = useState<"cadastro" | "entrar">("cadastro");
  const [buscaLoginInput, setBuscaLoginInput] = useState("");
  const [erroLoginJogador, setErroLoginJogador] = useState("");
  const [buscaApostadorAdm, setBuscaApostadorAdm] = useState("");
  const [dbConectado, setDbConectado] = useState(false);
  const [cotaSalvaAviso, setCotaSalvaAviso] = useState(false);
  const [avisoAdm, setAvisoAdm] = useState("");

  const mostrarAvisoAdm = (msg: string) => {
    setAvisoAdm(msg);
    setTimeout(() => setAvisoAdm(""), 4000);
  };

  useEffect(() => {
    try {
      const j = localStorage.getItem("elite_jogos_v11");
      const jd = localStorage.getItem("elite_jogadores_v11");
      const p = localStorage.getItem("elite_palpites_v11");
      const cfg = localStorage.getItem("elite_config_v11");
      const u = localStorage.getItem("elite_user_v11");
      const l = localStorage.getItem("elite_logo_v11");

      const agora = Date.now();
      const TRES_DIAS_MS = 3 * 24 * 60 * 60 * 1000;

      if (j) setJogos(JSON.parse(j));

      if (jd) {
        const parsedJd = JSON.parse(jd);
        let alterouJd = false;
        const limposJd = parsedJd.map((jg: any) => {
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
        limposJd.forEach((jg: any) => {
          upsertJogadorInDb(jg).catch(() => {});
        });
      }

      if (p) {
        const parsedP = JSON.parse(p);
        setPalpites(parsedP);
        parsedP.forEach((palp: any) => {
          upsertPalpiteInDb(palp).catch(() => {});
        });
      }
      if (cfg) {
        const parsed = JSON.parse(cfg);
        setConfig((prev) => ({
          ...prev,
          ...parsed,
          valor: parsed.valor !== undefined ? parsed.valor : prev.valor,
          chavePix: parsed.chavePix || parsed.pixAdm || prev.chavePix,
          pixAdm: parsed.chavePix || parsed.pixAdm || prev.pixAdm,
          nomePix: parsed.nomePix || prev.nomePix,
          cidadePix: parsed.cidadePix || prev.cidadePix,
        }));
      }

      if (u) {
        const parsedU = JSON.parse(u);
        if (parsedU.timestampComprovante && agora - parsedU.timestampComprovante > TRES_DIAS_MS) {
          parsedU.comprovante = undefined;
          parsedU.timestampComprovante = undefined;
          parsedU.dataEnvioComprovante = undefined;
          localStorage.setItem("elite_user_v11", JSON.stringify(parsedU));
        }
        setUser(parsedU);
        upsertJogadorInDb(parsedU).catch(() => {});
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
          if (data.timestampComprovante && agoraMs - data.timestampComprovante > TRES_DIAS_MS) {
            const limpo = {
              ...data,
              comprovante: undefined,
              timestampComprovante: undefined,
              dataEnvioComprovante: undefined,
            };
            listaDb.push(limpo);
            upsertJogadorInDb(limpo).catch(() => {});
          } else {
            listaDb.push(data);
          }
        });
        setJogadores(listaDb);
        localStorage.setItem("elite_jogadores_v11", JSON.stringify(listaDb));

        setUser((prevUser: any) => {
          if (!prevUser?.email) return prevUser;
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
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "jogadores");
      }
    );

    const unsubJogos = onSnapshot(
      collection(db, "jogos"),
      (snapshot) => {
        setDbConectado(true);
        const listaJogos: Jogo[] = [];
        snapshot.forEach((docSnap) => {
          listaJogos.push(docSnap.data() as Jogo);
        });
        listaJogos.sort((a, b) => a.id.localeCompare(b.id));
        setJogos(listaJogos);
        localStorage.setItem("elite_jogos_v11", JSON.stringify(listaJogos));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "jogos");
      }
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
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "palpites");
      }
    );

    const unsubConfig = onSnapshot(
      doc(db, "config", "bolao_config"),
      (docSnap) => {
        setDbConectado(true);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setConfig((prev) => {
            const next = {
              ...prev,
              ...data,
              valor: data.valor !== undefined ? data.valor : prev.valor,
              chavePix: data.chavePix || data.pixAdm || prev.chavePix,
              pixAdm: data.chavePix || data.pixAdm || prev.pixAdm,
              nomePix: data.nomePix || prev.nomePix,
              cidadePix: data.cidadePix || prev.cidadePix,
            };
            localStorage.setItem("elite_config_v11", JSON.stringify(next));
            return next;
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "config/bolao_config");
      }
    );

    return () => {
      unsubJogadores();
      unsubJogos();
      unsubPalpites();
      unsubConfig();
    };
  }, []);

  // Inicializa escolhas temporárias do usuário ao carregar jogos/palpites (exceto quando estiver fazendo nova aposta)
  useEffect(() => {
    if (modoNovaAposta) return;
    if (user && palpites.length > 0) {
      const userP = palpites.filter((p) => p.jogadorEmail === user.email);
      const map: Record<string, EscolhaResultado> = {};
      userP.forEach((p) => {
        map[p.jogoId] = p.escolha;
      });
      setEscolhasTemp(map);
    }
  }, [user, palpites, modoNovaAposta]);

  const iniciarNovaAposta = () => {
    if (!user) {
      setPage("loginJogador");
      return;
    }
    setModoNovaAposta(true);
    setEscolhasTemp({});
    setErroPixInfinite("");
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

  const iniciarPagamentoInfinitePay = async (jogadorAlvo: any) => {
    if (!jogadorAlvo) return;
    setGerandoPixInfinite(true);
    setErroPixInfinite("");
    try {
      const jogadorId = getJogadorDocId(jogadorAlvo.id || jogadorAlvo.email);
      const resultado = await criarPagamentoInfinitePay({
        jogador_id: jogadorId,
        nome: jogadorAlvo.nome || "Jogador",
        jogadorObj: jogadorAlvo,
      });

      if (resultado.url) {
        setLinkPixGerado(resultado.url);
        const atualizado = {
          ...jogadorAlvo,
          id: jogadorId,
          link_pagamento: resultado.url,
        };
        setUser(atualizado);
        localStorage.setItem("elite_user_v11", JSON.stringify(atualizado));

        // Redireciona o usuário para a URL do PIX da InfinitePay
        window.location.href = resultado.url;
      }
    } catch (err: any) {
      setErroPixInfinite(err?.message || "Erro ao gerar link de pagamento PIX na InfinitePay.");
      setPage("pagamento");
    } finally {
      setGerandoPixInfinite(false);
    }
  };

  const saveJogos = (j: Jogo[]) => {
    const idsNovos = new Set(j.map((x) => x.id));
    jogos.forEach((antigo) => {
      if (!idsNovos.has(antigo.id)) {
        deleteJogoFromDb(antigo.id).catch(() => {});
      }
    });
    setJogos(j);
    localStorage.setItem("elite_jogos_v11", JSON.stringify(j));
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

  const addJogo = () => {
    if (jogos.length >= 10) return alert("Máximo de 10 jogos no bolão!");
    if (nomeTime1.trim() === nomeTime2.trim()) return alert("Selecione dois times diferentes!");

    const novo: Jogo = {
      id: Date.now().toString(),
      casa: nomeTime1.trim(),
      fora: nomeTime2.trim(),
      escudoCasa: escudoTime1 || getEscudoPadrao(nomeTime1),
      escudoFora: escudoTime2 || getEscudoPadrao(nomeTime2),
      data: dataJ || "A definir",
      estadio: estadio || "Estádio Principal",
    };

    const novaLista = [...jogos, novo];
    saveJogos(novaLista);
    setRodadaPublicadaAviso(true);
    setTimeout(() => setRodadaPublicadaAviso(false), 5000);
    alert(`Jogo "${novo.casa} x ${novo.fora}" salvo e liberado na área de apostas dos jogadores!`);
  };

  const salvarEEnviarConfrontos = () => {
    if (jogos.length === 0) {
      alert("Adicione pelo menos 1 jogo antes de enviar para os jogadores!");
      return;
    }
    saveJogos(jogos);
    setRodadaPublicadaAviso(true);
    setTimeout(() => setRodadaPublicadaAviso(false), 5000);
    alert(`Sucesso! Os ${jogos.length} confrontos foram salvos e já estão disponíveis na área de apostas dos jogadores.`);
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

    const jogadoresAtualizados = jogadores.map((jg: any) => {
      if (jg.email === email) {
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

  const excluirApostadorAdm = (email: string, nome: string) => {
    const emailNorm = (email || "").trim().toLowerCase();
    const novaLista = jogadores.filter((jg) => (jg.email || "").trim().toLowerCase() !== emailNorm);
    setJogadores(novaLista);
    localStorage.setItem("elite_jogadores_v11", JSON.stringify(novaLista));
    deleteJogadorFromDb(emailNorm).catch(() => {});

    const palpitesDoJogador = palpites.filter((p) => (p.jogadorEmail || "").trim().toLowerCase() === emailNorm);
    palpitesDoJogador.forEach((p) => {
      deletePalpiteFromDb(emailNorm, p.jogoId).catch(() => {});
    });
    const novosPalpites = palpites.filter((p) => (p.jogadorEmail || "").trim().toLowerCase() !== emailNorm);
    setPalpites(novosPalpites);
    localStorage.setItem("elite_palpites_v11", JSON.stringify(novosPalpites));

    if (user && (user.email || "").trim().toLowerCase() === emailNorm) {
      setUser(null);
      localStorage.removeItem("elite_user_v11");
    }

    mostrarAvisoAdm(`🗑️ Jogador "${nome}" e suas apostas foram excluídos do banco de dados!`);
  };

  const salvarValorCota = () => {
    const numVal = parseFloat(String(config.valor).replace(",", "."));
    if (isNaN(numVal) || numVal <= 0) {
      mostrarAvisoAdm("⚠️ Digite um valor válido para a cota!");
      return;
    }
    const chaveAtual = (config.chavePix || config.pixAdm || "01780181558").trim();
    saveConfig({ ...config, valor: numVal, chavePix: chaveAtual, pixAdm: chaveAtual });
    setCotaSalvaAviso(true);
    setTimeout(() => setCotaSalvaAviso(false), 4000);
    mostrarAvisoAdm(`💾 Valor da cota (R$ ${numVal}) salvo com sucesso!`);
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
    const jogosEncerrados = jogos.filter((j) => j.resultadoOficial);

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
        const jgCorrespondente = jogos.find((j) => j.id === p.jogoId);
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

  // Cálculos Financeiros & Contabilizador de Depósitos
  const valorCotaNumerico = parseFloat(String(config.valor).replace(",", ".")) || 0;
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

  const pagos = jogadoresPagosLista.length;
  const emAnaliseCount = jogadoresEmAnaliseLista.length;
  const total = pagos * valorCotaNumerico;
  const totalSendoDepositado = emAnaliseCount * valorCotaNumerico;
  const totalGeralDepositos = total + totalSendoDepositado;
  const banca20 = total * 0.2;
  const premio80 = total * 0.8;

  // Prêmios individuais
  const premio1 = premio80 * 0.5;
  const premio2 = premio80 * 0.3;
  const premio3 = premio80 * 0.2;

  // Lista de depósitos recentes (Confirmados + Sendo Depositados) para o Contabilizador do Jogador
  const movDepositos = [
    ...jogadoresEmAnaliseLista.map((jg: any) => ({
      nome: jg.nome || "Jogador",
      email: jg.email,
      status: "EM_ANALISE" as const,
      valor: valorCotaNumerico,
      horario: jg.dataEnvioComprovante || "Agora mesmo",
      ordem: jg.timestampComprovante || Date.now(),
    })),
    ...jogadoresPagosLista.map((jg: any) => ({
      nome: jg.nome || "Jogador",
      email: jg.email,
      status: "APROVADO" as const,
      valor: valorCotaNumerico,
      horario: jg.dataAprovacao ? `Aprovado às ${jg.dataAprovacao}` : jg.dataEnvioComprovante || "Confirmado",
      ordem: (jg.timestampComprovante || 0) + 1,
    })),
  ].sort((a, b) => b.ordem - a.ordem);

  const meuStatusDeposito = user
    ? user.status_pagamento === "pago" ||
      user.aprovado === true ||
      user.statusPagamento === "APROVADO" ||
      palpites.some((p: any) => p.jogadorEmail === user.email && p.pago)
      ? "APROVADO"
      : user.statusPagamento === "EM_ANALISE"
      ? "EM_ANALISE"
      : "PENDENTE"
    : "PENDENTE";

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
      {user && (
        <div
          className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
            meuStatusDeposito === "APROVADO"
              ? "bg-green-950/40 border-green-700/70 text-green-200"
              : meuStatusDeposito === "EM_ANALISE"
              ? "bg-amber-950/40 border-amber-700/70 text-amber-200"
              : "bg-black/60 border-zinc-800 text-zinc-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">
              {meuStatusDeposito === "APROVADO"
                ? "✅"
                : meuStatusDeposito === "EM_ANALISE"
                ? "⏳"
                : "💳"}
            </span>
            <div>
              <div className="font-black text-white">
                Seu Depósito ({user.nome?.split(" ")[0]}):{" "}
                <span className="text-[#FF6B00]">
                  {meuStatusDeposito === "APROVADO"
                    ? `R$ ${valorCotaNumerico.toFixed(2)} (Confirmado)`
                    : meuStatusDeposito === "EM_ANALISE"
                    ? `R$ ${valorCotaNumerico.toFixed(2)} (Sendo contabilizado / Em análise)`
                    : `R$ 0,00 (Aguardando depósito de R$ ${valorCotaNumerico.toFixed(2)})`}
                </span>
              </div>
              <div className="text-[10px] opacity-80">
                {meuStatusDeposito === "APROVADO"
                  ? "Seu depósito já está somado no caixa oficial da rodada!"
                  : meuStatusDeposito === "EM_ANALISE"
                  ? "Você enviou o comprovante e seu depósito está sendo validado pelo ADM."
                  : "Faça o PIX da cota e envie o comprovante para seu depósito entrar no contabilizador."}
              </div>
            </div>
          </div>

          {mostrarBotaoDepositar && meuStatusDeposito !== "APROVADO" && (
            <button
              type="button"
              onClick={() => setPage("pagamento")}
              className="bg-[#FF6B00] hover:bg-[#ff7b1a] text-black font-black px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider cursor-pointer shrink-0 transition shadow"
            >
              {meuStatusDeposito === "EM_ANALISE" ? "Ver Meu Depósito" : "Depositar PIX"}
            </button>
          )}
        </div>
      )}

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

  // Dados das apostas salvas do jogador conectado
  const meusPalpitesSalvos = user
    ? palpites.filter((p) => (p.jogadorEmail || "").toLowerCase() === (user.email || "").toLowerCase())
    : [];
  const isMinhaApostaAprovada = Boolean(
    user &&
      (user.status_pagamento === "pago" ||
        user.aprovado === true ||
        user.statusPagamento === "APROVADO" ||
        meusPalpitesSalvos.some((p) => p.pago))
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

                    {/* Placar / Confronto */}
                    <div className="flex items-center justify-between gap-2 bg-zinc-900/70 p-2.5 rounded-xl border border-zinc-800/80">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Escudo src={match.escudoCasa} nome={match.casa} size={32} />
                        <span className="font-bold text-xs text-white truncate">{match.casa}</span>
                      </div>
                      <span className="text-[10px] font-black text-zinc-500 px-1">VS</span>
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
              <div className="text-2xl font-black">{jogos.length}</div>
              <div className="text-[9px] text-zinc-500 uppercase font-bold">Confrontos</div>
            </div>
          </div>
        </main>

        <footer className="text-center text-[10px] text-zinc-600 pb-3">
          © 2026 Bolões Elite • Todos os direitos reservados
        </footer>
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
            onSubmit={(e) => {
              e.preventDefault();
              setErroLoginJogador("");
              const termo = buscaLoginInput.trim().toLowerCase();
              if (!termo) {
                setErroLoginJogador("Digite seu E-mail ou Chave PIX para entrar.");
                return;
              }
              const encontrado = jogadores.find(
                (jg: any) =>
                  (jg.email || "").trim().toLowerCase() === termo ||
                  (jg.pix || "").trim().toLowerCase() === termo
              );
              if (!encontrado) {
                setErroLoginJogador(
                  "Não encontramos um cadastro com esse E-mail ou Chave PIX. Verifique os dados ou clique em 'Novo Cadastro'."
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
                    nome,
                    email,
                    pix,
                    dataCadastro: existente.dataCadastro || dataHoraCadastro,
                    timestampCadastro: existente.timestampCadastro || agora,
                  }
                : {
                    id: docId,
                    nome,
                    email,
                    pix,
                    pontos: 0,
                    statusPagamento: "PENDENTE",
                    status_pagamento: "pendente",
                    aprovado: false,
                    dataCadastro: dataHoraCadastro,
                    timestampCadastro: agora,
                  };

              const lista = [...jogadores.filter((x: any) => (x.email || "").toLowerCase() !== email), novo];
              saveJogadores(lista);
              await upsertJogadorInDb(novo).catch(() => {});
              setUser(novo);
              localStorage.setItem("elite_user_v11", JSON.stringify(novo));

              // Chama /api/pagamento/criar e redireciona o usuário para a URL do PIX da InfinitePay
              await iniciarPagamentoInfinitePay(novo);
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
                  Li e concordo com os Termos de Uso e Política de Privacidade do Bolão.
                </span>
              </label>
              <button
                type="button"
                onClick={() => setShowTermosModal(true)}
                className="text-[11px] text-[#FF6B00] hover:underline font-bold block ml-6 cursor-pointer"
              >
                📄 Ler Termos e Regras
              </button>
            </div>

            <button
              type="submit"
              disabled={!aceitouTermos || gerandoPixInfinite}
              className="w-full bg-[#FF6B00] disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-black font-black py-4 rounded-xl cursor-pointer hover:scale-[1.01] transition shadow-lg shadow-[#FF6B00]/20 text-sm uppercase tracking-wider"
            >
              {gerandoPixInfinite
                ? "⏳ GERANDO PIX INFINITEPAY..."
                : `CADASTRAR E PAGAR PIX (R$ ${config.valor})`}
            </button>
          </form>
        )}

        {showTermosModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto space-y-4">
              <h3 className="text-lg font-black text-white">Termos & Política de Privacidade</h3>
              <div className="text-xs text-zinc-300 space-y-3 leading-relaxed">
                <p>
                  <strong>REGRA DE APOSTAS:</strong> O apostador escolhe quem vence (Mandante ou Visitante) ou Empate.
                  Cada acerto garante 1 ponto. A triagem é automática após o ADM confirmar os resultados oficiais.
                </p>
                <p>
                  <strong>PREMIAÇÃO:</strong> 20% do valor arrecadado fica com a banca organizadora e 80% é distribuído:
                  1º lugar (50%), 2º lugar (30%) e 3º lugar (20%). Em caso de empate de pontos, o valor da colocação
                  é dividido igualmente. Apenas apostas com pagamento validado pelo ADM participam da premiação.
                </p>
              </div>
              <button
                onClick={() => {
                  setAceitouTermos(true);
                  setShowTermosModal(false);
                }}
                className="w-full bg-[#FF6B00] text-black font-black py-3 rounded-xl cursor-pointer text-xs"
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
          <div className="flex items-center gap-2">
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
                <span className="text-[#FF6B00] text-base">🗄️</span> BANCO DE DADOS: APOSTADORES CADASTRADOS ({jogadores.length})
              </h3>
              <p className="text-[11px] text-zinc-400">
                Todos os apostadores que se cadastram pelo link ficam salvos automaticamente aqui no banco de dados.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
                          onClick={() => excluirApostadorAdm(jg.email, jg.nome)}
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
              {totalJogosEncerrados} de {jogos.length} Definidos
            </span>
          </div>

          {jogos.length === 0 ? (
            <p className="text-zinc-500 text-xs py-3 text-center border border-dashed border-zinc-800 rounded-lg">
              Cadastre os confrontos abaixo para poder definir os vencedores.
            </p>
          ) : (
            <div className="space-y-2 mt-2">
              {jogos.map((j, idx) => (
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
                          onClick={() => excluirApostadorAdm(jg.email, jg.nome)}
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
                          onClick={() => excluirApostadorAdm(jg.email, jg.nome)}
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
            {/* Bloco Valor da Cota */}
            <div className="bg-black/60 border border-zinc-800 p-3.5 rounded-xl space-y-2.5">
              <label className="block text-[10px] text-zinc-400 uppercase font-bold">
                Valor da Entrada por Cota (R$)
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

        {/* Gerenciar Confrontos */}
        <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm">Adicionar Confronto ({jogos.length}/10)</h3>
            <span className="text-[10px] text-zinc-400">Suba imagens próprias ou use os times padrão</span>
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
              onClick={addJogo}
              className="flex-1 bg-[#FF6B00] hover:bg-[#ff7b1a] text-black font-black py-3 rounded-xl cursor-pointer transition uppercase text-xs shadow-lg shadow-[#FF6B00]/20 flex items-center justify-center gap-1.5"
            >
              <span>+</span> ADICIONAR E SALVAR CONFRONTO ({jogos.length}/10)
            </button>
            {jogos.length > 0 && (
              <button
                onClick={salvarEEnviarConfrontos}
                className="bg-green-600 hover:bg-green-500 text-black font-black py-3 px-4 rounded-xl cursor-pointer transition uppercase text-xs shadow-lg flex items-center justify-center gap-1.5"
              >
                <span>🚀</span> PUBLICAR P/ OS JOGADORES
              </button>
            )}
          </div>

          {rodadaPublicadaAviso && (
            <div className="bg-green-950/80 border border-green-700 text-green-300 p-3.5 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="text-xl">✅</span>
                <div>
                  <strong>Confrontos salvos e enviados com sucesso!</strong>
                  <div className="text-[10px] text-green-400">
                    Os {jogos.length} confrontos cadastrados já estão liberados na área de apostas dos jogadores.
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

          {/* Lista de Jogos */}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between items-center">
              <div className="text-[11px] uppercase font-bold text-zinc-500">
                Confrontos Ativos ({jogos.length}/10)
              </div>
              {jogos.length > 0 && (
                <span className="text-[10px] text-green-400 font-bold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  Disponíveis na Área dos Jogadores
                </span>
              )}
            </div>

            {jogos.length === 0 ? (
              <p className="text-zinc-500 text-xs py-3 text-center border border-dashed border-zinc-800 rounded-lg">
                Nenhum confronto cadastrado ainda.
              </p>
            ) : (
              jogos.map((j) => (
                <div
                  key={j.id}
                  className="flex justify-between items-center bg-black p-2.5 rounded-xl text-xs border border-zinc-800 hover:border-zinc-700 transition"
                >
                  <div className="flex items-center gap-2">
                    <Escudo src={j.escudoCasa} nome={j.casa} size={32} />
                    <span className="font-bold text-white">{j.casa}</span>
                    <span className="text-[#FF6B00] font-black px-1">x</span>
                    <span className="font-bold text-white">{j.fora}</span>
                    <Escudo src={j.escudoFora} nome={j.fora} size={32} />
                    <span className="text-[10px] text-zinc-500 ml-2 hidden sm:inline">
                      • {j.data} ({j.estadio})
                    </span>
                  </div>
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
            <button
              onClick={() => setPage("classificacao")}
              className="text-xs bg-[#FF6B00]/10 border border-[#FF6B00]/40 text-[#FF6B00] hover:bg-[#FF6B00]/20 px-2.5 py-1.5 rounded-lg cursor-pointer font-bold transition flex items-center gap-1"
            >
              <span>🏆</span> Ranking
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("elite_user_v11");
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

        {/* Status da Rodada */}
        <div
          id="secao-jogos-rodada"
          className="mt-4 flex flex-wrap items-center justify-between gap-2 bg-zinc-900/90 border border-zinc-800 px-3.5 py-2.5 rounded-xl"
        >
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${jogos.length > 0 ? "bg-green-500 animate-pulse" : "bg-amber-500"}`}></span>
            <span className="text-xs font-bold text-white">
              {jogos.length > 0
                ? `Rodada Aberta: ${jogos.length} Jogo(s) Liberado(s)`
                : "Aguardando Publicação pelo ADM"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={iniciarNovaAposta}
              className="text-[10px] bg-green-600 hover:bg-green-500 text-black font-black px-2.5 py-1 rounded-lg cursor-pointer transition flex items-center gap-1"
            >
              <span>➕</span> Fazer Nova Aposta
            </button>
            <span className="text-[10px] bg-black text-[#FF6B00] font-black px-2 py-0.5 rounded border border-zinc-800">
              {Object.keys(escolhasTemp).length}/{jogos.length} APOSTADOS
            </span>
          </div>
        </div>

        {jogos.length === 0 ? (
          <div className="mt-8 text-center py-12 px-4 bg-zinc-900/60 rounded-2xl border border-dashed border-zinc-800 text-zinc-400 space-y-2">
            <div className="text-3xl">⏳</div>
            <div className="font-bold text-sm text-white">Nenhum confronto disponível no momento</div>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              O organizador (ADM) está definindo os confrontos da rodada. Assim que ele salvar, eles aparecerão aqui instantaneamente!
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {jogos.map((j, idx) => {
              const escolhaAtual = escolhasTemp[j.id];
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
                    {/* Cabeçalho do Confronto */}
                    <div className="text-[10px] text-zinc-400 text-center uppercase font-bold tracking-wider">
                      Jogo #{idx + 1} • {j.data} • {j.estadio}
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
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <Escudo src={j.escudoCasa} nome={j.casa} size={42} />
                      <span className="font-black text-sm truncate text-white">{j.casa}</span>
                    </div>

                    <div className="text-zinc-500 font-black text-sm shrink-0 px-2">
                      VS
                    </div>

                    {/* Visitante */}
                    <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end">
                      <span className="font-black text-sm truncate text-right text-white">{j.fora}</span>
                      <Escudo src={j.escudoFora} nome={j.fora} size={42} />
                    </div>
                  </div>

                  {/* SELETOR: QUEM VENCE OU EMPATE */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {/* 1: Mandante */}
                    <button
                      type="button"
                      onClick={() => setEscolhasTemp({ ...escolhasTemp, [j.id]: "CASA" })}
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
                      onClick={() => setEscolhasTemp({ ...escolhasTemp, [j.id]: "EMPATE" })}
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
                      onClick={() => setEscolhasTemp({ ...escolhasTemp, [j.id]: "FORA" })}
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

            <button
              disabled={gerandoPixInfinite}
              onClick={async () => {
                if (!user) {
                  setPage("loginJogador");
                  return;
                }

                // Verifica se preencheu todos os confrontos
                const naoPreenchidos = jogos.filter((j) => !escolhasTemp[j.id]);
                if (naoPreenchidos.length > 0) {
                  const confirma = confirm(
                    `Você ainda não palpitou em ${naoPreenchidos.length} jogo(s). Deseja salvar assim mesmo?`
                  );
                  if (!confirma) return;
                }

                const jaPago =
                  !modoNovaAposta &&
                  Boolean(
                    user.status_pagamento === "pago" ||
                      user.aprovado === true ||
                      user.statusPagamento === "APROVADO"
                  );

                const novosPalpites: Palpite[] = jogos
                  .filter((j) => escolhasTemp[j.id])
                  .map((j) => ({
                    jogadorEmail: user!.email,
                    jogoId: j.id,
                    escolha: escolhasTemp[j.id],
                    pago: jaPago,
                  }));

                const outros = palpites.filter((p) => p.jogadorEmail !== user!.email);
                const todos = [...outros, ...novosPalpites];
                setPalpites(todos);
                localStorage.setItem("elite_palpites_v11", JSON.stringify(todos));
                for (const np of novosPalpites) {
                  await upsertPalpiteInDb(np).catch(() => {});
                }

                if (jaPago) {
                  setModoNovaAposta(false);
                  setPage("minhasApostas");
                  return;
                }

                // Se for uma nova aposta ou ainda não estiver paga, prepara o usuário e gera o novo PIX InfinitePay
                const userParaPix = {
                  ...user,
                  statusPagamento: "PENDENTE",
                  status_pagamento: "pendente",
                  aprovado: false,
                };
                setUser(userParaPix);
                localStorage.setItem("elite_user_v11", JSON.stringify(userParaPix));
                await upsertJogadorInDb(userParaPix).catch(() => {});
                setModoNovaAposta(false);

                await iniciarPagamentoInfinitePay(userParaPix);
              }}
              className="w-full bg-[#FF6B00] disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-black py-4 rounded-xl mt-4 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition uppercase tracking-wider text-sm shadow-lg shadow-[#FF6B00]/20 flex items-center justify-center gap-2"
            >
              <span>💾</span>
              <span>
                {gerandoPixInfinite
                  ? "GERANDO LINK PIX INFINITEPAY..."
                  : modoNovaAposta
                  ? `FINALIZAR NOVA APOSTA & PAGAR PIX (R$ ${config.valor})`
                  : isMinhaApostaAprovada
                  ? "SALVAR MEUS PALPITES (PAGAMENTO JÁ CONFIRMADO)"
                  : `SALVAR APOSTAS & PAGAR PIX (R$ ${config.valor})`}
              </span>
            </button>

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
  // 7. TELA DE PAGAMENTO PIX AUTOMÁTICO (INFINITEPAY)
  // =========================================================================
  const valorDinamico = config.valor;
  const linkCheckoutAtivo = linkPixGerado || user?.link_pagamento || "";

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 flex flex-col items-center justify-center">
      <div className="max-w-md w-full bg-zinc-900 p-6 rounded-2xl border border-zinc-800 text-center shadow-2xl">
        <img
          src={logoBolao}
          alt=""
          className="w-20 h-20 object-contain mx-auto mb-2 drop-shadow-[0_8px_16px_rgba(239,68,68,0.3)] rounded-xl"
        />
        <div className="inline-block border border-[#FF6B00]/30 bg-[#FF6B00]/10 text-[#FF6B00] text-xs font-bold px-4 py-1.5 rounded-full uppercase">
          PIX AUTOMÁTICO INFINITEPAY
        </div>
        <h2 className="text-3xl font-black mt-4">Pagamento PIX</h2>
        <p className="text-zinc-400 text-xs sm:text-sm mt-2">
          Pague via PIX na InfinitePay e tenha sua aposta aprovada automaticamente assim que concluir:
        </p>

        {/* Contabilizador de Depósito na Tela de Pagamento */}
        <div className="text-left">
          <ContabilizadorDepositosJogador mostrarBotaoDepositar={false} />
        </div>

        {/* CARD DE CHECKOUT PIX AUTOMÁTICO INFINITEPAY */}
        <div className="mt-6 bg-black p-5 rounded-2xl border border-zinc-800 text-left space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Valor Atual da Cota (Banco):</span>
              <span className="text-xs text-zinc-400">Handle: <strong className="text-white font-mono">irailson-da-472</strong></span>
            </div>
            <span className="text-3xl font-black text-[#FF6B00]">R$ {valorDinamico}</span>
          </div>

          {erroPixInfinite && (
            <div className="bg-red-950/80 border border-red-700 text-red-200 p-3 rounded-xl text-xs">
              ⚠️ {erroPixInfinite}
            </div>
          )}

          <button
            type="button"
            disabled={gerandoPixInfinite}
            onClick={() => {
              if (!user) {
                setPage("loginJogador");
                return;
              }
              iniciarPagamentoInfinitePay(user);
            }}
            className="w-full bg-[#FF6B00] hover:bg-[#ff7b1a] disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-black py-4 px-4 rounded-xl cursor-pointer transition text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-[#FF6B00]/25 flex items-center justify-center gap-2"
          >
            <span>⚡</span>
            <span>
              {gerandoPixInfinite
                ? "GERANDO PIX AUTOMÁTICO..."
                : `PAGAR PIX AGORA (R$ ${valorDinamico})`}
            </span>
          </button>

          {linkCheckoutAtivo && (
            <div className="pt-2 border-t border-zinc-900 space-y-2">
              <div className="text-[10px] text-zinc-400 uppercase font-bold">
                Link de Pagamento PIX Gerado:
              </div>
              <a
                href={linkCheckoutAtivo}
                target="_top"
                rel="noopener noreferrer"
                className="block w-full text-center bg-green-600 hover:bg-green-500 text-black font-black py-3 rounded-xl text-xs uppercase tracking-wider transition"
              >
                🔗 ABRIR CHECKOUT PIX INFINITEPAY
              </a>
            </div>
          )}
        </div>

        <div className="mt-6 space-y-2">
          <button
            onClick={() => setPage("minhasApostas")}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-[#FF6B00] font-black py-3.5 rounded-xl cursor-pointer transition text-sm uppercase tracking-wider flex items-center justify-center gap-2 border border-[#FF6B00]/40"
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
    </div>
  );
}
