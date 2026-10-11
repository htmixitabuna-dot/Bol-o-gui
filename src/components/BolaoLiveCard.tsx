import React, { useState, useEffect, useCallback, useRef } from 'react';

export const ESPN_API =
  'https://site.api.espn.com/apis/site/v2/sports/soccer/bra.1/scoreboard';

const STORAGE_KEY_REPRISE = 'bolao_reprise_atual';

const CAPA_ESTADIO_TRANSMISSAO =
  'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1200&q=80';

export interface PartidaEspn {
  id: string;
  timeCasa: string;
  timeFora: string;
  logoCasa: string;
  logoFora: string;
  placarCasa: string | number;
  placarFora: string | number;
  status: string;
  minuto: string;
  campeonato: string;
  horario: string;
  dataFormatada: string;
  estadio: string;
  aoVivo: boolean;
  naoComecou: boolean;
  encerrado: boolean;
}

export interface AlertaGolInfo {
  id: string;
  mensagem: string;
  timeCasa: string;
  timeFora: string;
  placarCasa: string | number;
  placarFora: string | number;
  minuto: string;
}

export interface RepriseSalvaStorage {
  youtubeUrl: string;
  youtubeId?: string;
  timeCasa: string;
  timeFora: string;
  data: string | Date;
}

export interface DadosPalpiteLive {
  timeCasa: string;
  timeFora: string;
  golsCasa: number;
  golsFora: number;
  placarPalpite: string;
  escolha: 'CASA' | 'FORA' | 'EMPATE';
  valor: number;
  canal: string;
  timestamp: number;
}

export interface BolaoLiveCardProps {
  onConfirmarPalpite?: (dados: DadosPalpiteLive) => void;
  admAbertoPorPadrao?: boolean;
}

export function extrairYoutubeID(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  let limpo = url.trim();
  if (!limpo) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(limpo)) {
    return limpo;
  }

  const srcMatch = limpo.match(/src=["']([^"']+)["']/i);
  if (srcMatch && srcMatch[1]) {
    limpo = srcMatch[1].trim();
  } else {
    const urlNoTexto = limpo.match(/https?:\/\/[^\s"'<>]+/i);
    if (urlNoTexto && urlNoTexto[0]) {
      limpo = urlNoTexto[0].trim();
    }
  }

  try {
    limpo = decodeURIComponent(limpo);
  } catch {
    // ignore decode errors
  }

  try {
    const urlComProtocolo = /^https?:\/\//i.test(limpo)
      ? limpo
      : `https://${limpo}`;
    const parsedUrl = new URL(urlComProtocolo);
    const vParam =
      parsedUrl.searchParams.get('v') || parsedUrl.searchParams.get('vi');
    if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam.slice(0, 11))) {
      return vParam.slice(0, 11);
    }
  } catch {
    // fallback regex
  }

  const padroes = [
    /(?:[?&]v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube(?:-nocookie)?\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/e\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/watch\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const regex of padroes) {
    const match = limpo.match(regex);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

const ESCUDOS_CONHECIDOS: Record<string, string> = {
  flamengo:
    'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F819.png',
  palmeiras:
    'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F2029.png',
  corinthians:
    'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F874.png',
  santos:
    'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F2674.png',
  vasco:
    'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F3454.png',
  'vasco da gama':
    'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F3454.png',
  fluminense:
    'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F3445.png',
  botafogo:
    'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F6086.png',
  'sao paulo':
    'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F2026.png',
  gremio:
    'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F6273.png',
  internacional:
    'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F1936.png',
  cruzeiro:
    'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F2022.png',
  'atletico-mg':
    'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F7632.png',
  bahia:
    'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F9967.png',
  fortaleza:
    'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F6272.png',
  ceara:
    'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F3441.png',
  vitoria:
    'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F3457.png',
  remo: 'https://a.espncdn.com/i/teamlogos/soccer/500/4936.png',
  coritiba: 'https://a.espncdn.com/i/teamlogos/soccer/500/3456.png',
  chapecoense: 'https://a.espncdn.com/i/teamlogos/soccer/500/9318.png',
  mirassol: 'https://a.espncdn.com/i/teamlogos/soccer/500/9969.png',
};

function obterEscudoPorNome(nome: string): string {
  const norm = (nome || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!norm) return '';
  if (ESCUDOS_CONHECIDOS[norm]) return ESCUDOS_CONHECIDOS[norm];
  const chaveParcial = Object.keys(ESCUDOS_CONHECIDOS).find(
    (k) => norm.includes(k) || k.includes(norm)
  );
  return chaveParcial ? ESCUDOS_CONHECIDOS[chaveParcial] : '';
}

function formatarHorarioEvento(dateIso?: string): {
  horario: string;
  dataCurta: string;
} {
  if (!dateIso) return { horario: '19:30', dataCurta: 'Em breve' };
  try {
    const dt = new Date(dateIso);
    if (isNaN(dt.getTime())) return { horario: '19:30', dataCurta: 'Em breve' };
    const horario = dt.toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
    });
    const dataCurta = dt.toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
    });
    return { horario, dataCurta };
  } catch {
    return { horario: '19:30', dataCurta: 'Em breve' };
  }
}

function lerRepriseSalvaLocalStorage(): RepriseSalvaStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REPRISE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.youtubeUrl && extrairYoutubeID(parsed.youtubeUrl)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function mapearEventoEspnParaPartida(
  event: any,
  idx: number,
  nomeCampeonatoPadrao: string
): PartidaEspn | null {
  const competition = event?.competitions?.[0];
  const competitors = competition?.competitors || [];
  const compCasa =
    competitors.find((c: any) => c.homeAway === 'home') || competitors[0];
  const compFora =
    competitors.find((c: any) => c.homeAway === 'away') || competitors[1];

  if (!compCasa || !compFora) return null;

  const timeCasa =
    compCasa?.team?.displayName ||
    compCasa?.team?.shortDisplayName ||
    compCasa?.team?.name ||
    'Time Casa';
  const timeFora =
    compFora?.team?.displayName ||
    compFora?.team?.shortDisplayName ||
    compFora?.team?.name ||
    'Time Fora';

  const logoCasa =
    compCasa?.team?.logo ||
    compCasa?.team?.logos?.[0]?.href ||
    obterEscudoPorNome(timeCasa);
  const logoFora =
    compFora?.team?.logo ||
    compFora?.team?.logos?.[0]?.href ||
    obterEscudoPorNome(timeFora);

  const placarCasa = String(compCasa?.score ?? '0');
  const placarFora = String(compFora?.score ?? '0');

  const state = String(
    event?.status?.type?.state ||
      competition?.status?.type?.state ||
      'pre'
  ).toLowerCase();
  const statusName = String(
    event?.status?.type?.name ||
      competition?.status?.type?.name ||
      ''
  ).toUpperCase();
  const period = Number(
    event?.status?.period || competition?.status?.period || 1
  );

  const aoVivo = state === 'in';
  const encerrado = Boolean(
    event?.status?.type?.completed ||
      competition?.status?.type?.completed ||
      state === 'post'
  );
  const naoComecou = !aoVivo && !encerrado;

  const { horario, dataCurta } = formatarHorarioEvento(
    event?.date || competition?.date
  );

  const rawDetail = String(
    event?.status?.type?.shortDetail ||
      event?.status?.type?.detail ||
      competition?.status?.type?.shortDetail ||
      competition?.status?.type?.detail ||
      ''
  ).trim();

  const displayClock = String(
    event?.status?.displayClock || competition?.status?.displayClock || ''
  ).trim();

  let status = `EM BREVE • ${dataCurta} às ${horario}`;
  let minuto = `EM BREVE (${dataCurta} • ${horario})`;

  if (aoVivo) {
    if (
      statusName.includes('HALFTIME') ||
      /^ht$/i.test(rawDetail) ||
      /intervalo/i.test(rawDetail)
    ) {
      status = 'AO VIVO • INTERVALO';
      minuto = 'INTERVALO';
    } else if (displayClock && displayClock !== "0'") {
      minuto = `${displayClock} (${period >= 2 ? '2ºT' : '1ºT'})`;
      status = `AO VIVO • ${minuto}`;
    } else if (rawDetail && !/scheduled/i.test(rawDetail)) {
      status = /ao vivo/i.test(rawDetail)
        ? rawDetail.toUpperCase()
        : `AO VIVO • ${rawDetail}`;
      minuto = rawDetail;
    } else {
      status = 'AO VIVO';
      minuto = 'Em andamento';
    }
  } else if (encerrado) {
    status = `ENCERRADO • ${dataCurta}`;
    minuto = "Encerrado (90')";
  }

  const estadio =
    competition?.venue?.fullName ||
    competition?.venue?.address?.city ||
    'Estádio Brasileirão';

  return {
    id: String(event?.id || `espn_${idx}`),
    timeCasa,
    timeFora,
    logoCasa,
    logoFora,
    placarCasa,
    placarFora,
    status,
    minuto,
    campeonato: nomeCampeonatoPadrao,
    horario,
    dataFormatada: dataCurta,
    estadio,
    aoVivo,
    naoComecou,
    encerrado,
  };
}

function obterHojeYmdBrasil(): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    if (y && m && d) return `${y}${m}${d}`;
  } catch {}
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

function BolaoLiveCardInner({
  onConfirmarPalpite,
  admAbertoPorPadrao = false,
}: BolaoLiveCardProps) {
  const onConfirmarPalpiteRef = useRef(onConfirmarPalpite);
  useEffect(() => {
    onConfirmarPalpiteRef.current = onConfirmarPalpite;
  }, [onConfirmarPalpite]);

  // Estado da Reprise salva no localStorage (tem prioridade quando ativa manualmente)
  const [repriseSalva, setRepriseSalva] = useState<RepriseSalvaStorage | null>(
    () => lerRepriseSalvaLocalStorage()
  );
  const [forcarModoEspn, setForcarModoEspn] = useState<boolean>(true);

  // Estado do Painel ADM
  const [painelAdmAberto, setPainelAdmAberto] = useState<boolean>(
    Boolean(admAbertoPorPadrao)
  );
  const [inputYoutubeUrl, setInputYoutubeUrl] = useState<string>(
    () => lerRepriseSalvaLocalStorage()?.youtubeUrl || ''
  );
  const [inputTimeCasa, setInputTimeCasa] = useState<string>(
    () => lerRepriseSalvaLocalStorage()?.timeCasa || ''
  );
  const [inputTimeFora, setInputTimeFora] = useState<string>(
    () => lerRepriseSalvaLocalStorage()?.timeFora || ''
  );
  const [feedbackAdm, setFeedbackAdm] = useState<string>('');
  const [erroAdm, setErroAdm] = useState<string>('');
  const inputUrlRef = useRef<HTMLInputElement | null>(null);

  // Estados da API da ESPN (Ao Vivo ou Próximos Jogos Em Breve) + Goal Alerts
  const [jogosEspn, setJogosEspn] = useState<PartidaEspn[]>([]);
  const [partida, setPartida] = useState<PartidaEspn | null>(null);
  const [buscandoJogos, setBuscandoJogos] = useState<boolean>(true);
  const [ultimaSincronizacao, setUltimaSincronizacao] = useState<string>('');
  const [segundosParaAtualizar, setSegundosParaAtualizar] =
    useState<number>(15);
  const [alertaGol, setAlertaGol] = useState<AlertaGolInfo | null>(null);
  const placaresAnterioresRef = useRef<
    Record<string, { casa: string; fora: string }>
  >({});

  const [escolhaVencedor, setEscolhaVencedor] = useState<
    'CASA' | 'EMPATE' | 'FORA'
  >('CASA');
  const [apostaConfirmada, setApostaConfirmada] = useState<boolean>(false);

  const [erroLogoCasa, setErroLogoCasa] = useState<boolean>(false);
  const [erroLogoFora, setErroLogoFora] = useState<boolean>(false);

  // Dispara alerta vermelho "GOOOL! Novo placar" e oculta automaticamente após 9s
  const dispararAlertaGol = useCallback((info: AlertaGolInfo) => {
    setAlertaGol(info);
  }, []);

  useEffect(() => {
    if (!alertaGol) return;
    const t = window.setTimeout(() => {
      setAlertaGol(null);
    }, 9000);
    return () => window.clearTimeout(t);
  }, [alertaGol]);

  // Busca diretamente na ESPN_API: se houver jogos ao vivo mostra AO VIVO; se não houver, monta a lista dos Próximos Jogos da ESPN como "EM BREVE"
  const buscarJogosEspn = useCallback(async () => {
    try {
      const hojeYmd = obterHojeYmdBrasil();
      const [resPadrao, resHoje] = await Promise.all([
        fetch(ESPN_API, { method: 'GET', cache: 'no-store' }).catch(() => null),
        fetch(`${ESPN_API}?dates=${hojeYmd}`, {
          method: 'GET',
          cache: 'no-store',
        }).catch(() => null),
      ]);

      const dataPadrao =
        resPadrao && resPadrao.ok
          ? await resPadrao.json().catch(() => null)
          : null;
      const dataHoje =
        resHoje && resHoje.ok ? await resHoje.json().catch(() => null) : null;
      const data = dataHoje || dataPadrao;
      if (!data) {
        throw new Error('Sem resposta da ESPN');
      }

      const eventsIniciais = [
        ...(Array.isArray(dataHoje?.events) ? dataHoje.events : []),
        ...(Array.isArray(dataPadrao?.events) ? dataPadrao.events : []),
      ];
      const nomeCampeonatoPadrao =
        data?.leagues?.[0]?.name === 'Brazilian Serie A'
          ? 'Brasileirão Série A'
          : data?.leagues?.[0]?.name || 'Brasileirão Série A';

      let todosEventosBrutos: any[] = [...eventsIniciais];
      const calendarRaw: string[] = Array.isArray(
        dataPadrao?.leagues?.[0]?.calendar
      )
        ? dataPadrao.leagues[0].calendar
        : Array.isArray(data?.leagues?.[0]?.calendar)
        ? data.leagues[0].calendar
        : [];

      // Busca APENAS as próximas datas da rodada no calendário da ESPN (sem nunca inventar jogos ou buscar jogos passados)
      if (calendarRaw.length > 0 && todosEventosBrutos.length < 10) {
        const datasCalendario = calendarRaw
          .map((c) => String(c || '').slice(0, 10).replace(/-/g, ''))
          .filter((d) => /^\d{8}$/.test(d));

        const proximasDatas = datasCalendario
          .filter((d) => d > hojeYmd)
          .slice(0, 3);

        const respostasExtras = await Promise.all(
          proximasDatas.map((ymd) =>
            fetch(`${ESPN_API}?dates=${ymd}`, {
              method: 'GET',
              cache: 'no-store',
            })
              .then((r) => (r.ok ? r.json() : null))
              .catch(() => null)
          )
        );

        for (const extra of respostasExtras) {
          if (Array.isArray(extra?.events)) {
            todosEventosBrutos = [...todosEventosBrutos, ...extra.events];
          }
        }
      }

      const mapaUnicos = new Map<string, PartidaEspn>();
      todosEventosBrutos.forEach((ev, idx) => {
        const mapeado = mapearEventoEspnParaPartida(
          ev,
          idx,
          nomeCampeonatoPadrao
        );
        if (mapeado && !mapaUnicos.has(mapeado.id)) {
          mapaUnicos.set(mapeado.id, mapeado);
        }
      });

      const todasMapeadas = Array.from(mapaUnicos.values());
      const jogosAoVivo = todasMapeadas.filter((p) => p.aoVivo);
      const proximosJogos = todasMapeadas.filter((p) => p.naoComecou);

      // Se houver jogos ao vivo, exibe os ao vivo + próximos; se não houver, exibe APENAS a lista de próximos jogos da ESPN ("EM BREVE")
      const listaPartidas =
        jogosAoVivo.length > 0
          ? [...jogosAoVivo, ...proximosJogos]
          : proximosJogos;

      // Se houver jogo ao vivo na ESPN neste momento, garante que o placar ao vivo da ESPN fique visível
      if (jogosAoVivo.length > 0) {
        setForcarModoEspn(true);
      }

      // Verifica mudança real de placar em jogos AO VIVO para disparar Goal Alert ("GOOOL! Novo placar")
      for (const item of listaPartidas) {
        const placarAnterior = placaresAnterioresRef.current[item.id];
        if (
          item.aoVivo &&
          placarAnterior &&
          (placarAnterior.casa !== String(item.placarCasa) ||
            placarAnterior.fora !== String(item.placarFora))
        ) {
          dispararAlertaGol({
            id: `${item.id}_${Date.now()}`,
            mensagem: `GOOOL! Novo placar: ${item.timeCasa} ${item.placarCasa} - ${item.placarFora} ${item.timeFora}`,
            timeCasa: item.timeCasa,
            timeFora: item.timeFora,
            placarCasa: item.placarCasa,
            placarFora: item.placarFora,
            minuto: item.minuto,
          });
        }
        placaresAnterioresRef.current[item.id] = {
          casa: String(item.placarCasa),
          fora: String(item.placarFora),
        };
      }

      setJogosEspn(listaPartidas);
      setUltimaSincronizacao(
        new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      setSegundosParaAtualizar(15);

      setPartida((prev) => {
        if (listaPartidas.length === 0) return null;
        if (prev) {
          const atualizada = listaPartidas.find((p) => p.id === prev.id);
          // Se a partida anterior não estava ao vivo, mas agora há um jogo ao vivo na ESPN, destaca o jogo ao vivo!
          if (atualizada && (atualizada.aoVivo || jogosAoVivo.length === 0)) {
            return atualizada;
          }
        }
        const primeiraAoVivo = listaPartidas.find((p) => p.aoVivo);
        return primeiraAoVivo || listaPartidas[0];
      });
    } catch {
      // Mantém estado anterior em caso de oscilação de rede
    } finally {
      setBuscandoJogos(false);
    }
  }, [dispararAlertaGol]);

  // useEffect para fazer fetch na ESPN_API assim que o componente carregar + setInterval de 15s
  useEffect(() => {
    buscarJogosEspn();
    const timerPoll = window.setInterval(() => {
      buscarJogosEspn();
    }, 15000);
    const timerCountdown = window.setInterval(() => {
      setSegundosParaAtualizar((prev) => (prev <= 1 ? 15 : prev - 1));
    }, 1000);
    return () => {
      window.clearInterval(timerPoll);
      window.clearInterval(timerCountdown);
    };
  }, [buscarJogosEspn]);

  // Salva e ativa a reprise imediatamente
  const salvarEAtivarReprise = useCallback(
    (
      urlBruta: string,
      casaAtual: string,
      foraAtual: string,
      origemColagem = false
    ) => {
      const textoLimpo = (urlBruta || '').trim();
      setInputYoutubeUrl(textoLimpo);
      setErroAdm('');

      const idExtraido = extrairYoutubeID(textoLimpo);
      if (!idExtraido) {
        if (!origemColagem) {
          setErroAdm(
            'Link do YouTube inválido. Cole um link como https://www.youtube.com/watch?v=XXXX ou https://youtu.be/XXXX'
          );
        }
        return false;
      }

      const casaFinal =
        (casaAtual || '').trim() ||
        repriseSalva?.timeCasa ||
        partida?.timeCasa ||
        'Time Casa';
      const foraFinal =
        (foraAtual || '').trim() ||
        repriseSalva?.timeFora ||
        partida?.timeFora ||
        'Time Fora';

      const dadosReprise: RepriseSalvaStorage = {
        youtubeUrl: textoLimpo,
        youtubeId: idExtraido,
        timeCasa: casaFinal,
        timeFora: foraFinal,
        data: new Date().toISOString(),
      };

      try {
        localStorage.setItem(STORAGE_KEY_REPRISE, JSON.stringify(dadosReprise));
        window.dispatchEvent(new CustomEvent('bolao-reprise-updated'));
      } catch {
        // ignore storage errors
      }

      setRepriseSalva(dadosReprise);
      setForcarModoEspn(false);
      setErroLogoCasa(false);
      setErroLogoFora(false);
      setApostaConfirmada(false);
      setFeedbackAdm(
        origemColagem
          ? '✅ Link colado com sucesso! Reprise ativa no player.'
          : `✅ Reprise "${casaFinal} x ${foraFinal}" salva e carregada no player!`
      );

      if (!casaAtual.trim() && !foraAtual.trim()) {
        fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${idExtraido}&format=json`
        )
          .then((r) => (r.ok ? r.json() : null))
          .then((meta) => {
            if (!meta?.title) return;
            const titulo = String(meta.title);
            const matchTimes = titulo.match(
              /([A-Za-zÀ-ÿ\s-]{3,20})\s*(?:\d+\s*)?[xX×vV][sS]?\s*(?:\d+\s*)?([A-Za-zÀ-ÿ\s-]{3,20})/
            );
            if (matchTimes && matchTimes[1] && matchTimes[2]) {
              const tCasa = matchTimes[1].trim().slice(0, 18);
              const tFora = matchTimes[2].trim().slice(0, 18);
              if (tCasa && tFora) {
                setInputTimeCasa((prev) => prev || tCasa);
                setInputTimeFora((prev) => prev || tFora);
                const atualizado: RepriseSalvaStorage = {
                  ...dadosReprise,
                  timeCasa: tCasa,
                  timeFora: tFora,
                };
                setRepriseSalva(atualizado);
                try {
                  localStorage.setItem(
                    STORAGE_KEY_REPRISE,
                    JSON.stringify(atualizado)
                  );
                } catch {
                  // ignore
                }
              }
            }
          })
          .catch(() => {});
      }

      return true;
    },
    [
      repriseSalva?.timeCasa,
      repriseSalva?.timeFora,
      partida?.timeCasa,
      partida?.timeFora,
    ]
  );

  // Botão Colar Link no ADM
  const handleColarLinkYoutube = useCallback(async () => {
    setErroAdm('');
    setFeedbackAdm('');

    if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
      try {
        const textoClip = await navigator.clipboard.readText();
        if (textoClip && textoClip.trim()) {
          const ok = salvarEAtivarReprise(
            textoClip.trim(),
            inputTimeCasa,
            inputTimeFora,
            true
          );
          if (!ok) {
            setErroAdm(
              'O texto copiado não parece ser um link do YouTube. Copie o link do vídeo e tente novamente.'
            );
          }
          return;
        }
      } catch {
        // fallback abaixo
      }
    }

    if (inputUrlRef.current) {
      inputUrlRef.current.focus();
      inputUrlRef.current.select();
      try {
        const colouExec = document.execCommand('paste');
        if (colouExec && inputUrlRef.current.value) {
          salvarEAtivarReprise(
            inputUrlRef.current.value,
            inputTimeCasa,
            inputTimeFora,
            true
          );
          return;
        }
      } catch {
        // ignore
      }
    }

    if (inputUrlRef.current) {
      inputUrlRef.current.focus();
    }
    setFeedbackAdm(
      '📲 Campo selecionado! Segure o dedo na caixa abaixo e toque em "Colar" (ou aperte Ctrl+V).'
    );
  }, [inputTimeCasa, inputTimeFora, salvarEAtivarReprise]);

  // Captura Ctrl+V quando o Painel ADM estiver aberto
  useEffect(() => {
    if (!painelAdmAberto) return;

    const timerFocus = window.setTimeout(() => {
      inputUrlRef.current?.focus();
    }, 80);

    const onGlobalPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        target.tagName === 'INPUT' &&
        target !== inputUrlRef.current
      ) {
        return;
      }
      const texto =
        e.clipboardData?.getData('text/plain') ||
        e.clipboardData?.getData('text') ||
        '';
      if (texto && texto.trim()) {
        e.preventDefault();
        salvarEAtivarReprise(texto.trim(), inputTimeCasa, inputTimeFora, true);
      }
    };

    window.addEventListener('paste', onGlobalPaste);
    return () => {
      window.clearTimeout(timerFocus);
      window.removeEventListener('paste', onGlobalPaste);
    };
  }, [painelAdmAberto, inputTimeCasa, inputTimeFora, salvarEAtivarReprise]);

  // Sincroniza caso o localStorage mude em outra aba ou componente
  useEffect(() => {
    const sincronizarReprise = () => {
      const atual = lerRepriseSalvaLocalStorage();
      setRepriseSalva(atual);
      if (atual) {
        setForcarModoEspn(false);
        setInputYoutubeUrl(atual.youtubeUrl || '');
        setInputTimeCasa(atual.timeCasa || '');
        setInputTimeFora(atual.timeFora || '');
      }
    };
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === STORAGE_KEY_REPRISE) {
        sincronizarReprise();
      }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('bolao-reprise-updated', sincronizarReprise);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('bolao-reprise-updated', sincronizarReprise);
    };
  }, []);

  const handleSalvarRepriseAdm = (e: React.FormEvent) => {
    e.preventDefault();
    salvarEAtivarReprise(inputYoutubeUrl, inputTimeCasa, inputTimeFora, false);
  };

  const handleLimparRepriseVoltarAoVivo = () => {
    try {
      localStorage.removeItem(STORAGE_KEY_REPRISE);
      window.dispatchEvent(new CustomEvent('bolao-reprise-updated'));
    } catch {
      // ignore
    }
    setRepriseSalva(null);
    setForcarModoEspn(true);
    setInputYoutubeUrl('');
    setInputTimeCasa('');
    setInputTimeFora('');
    setErroAdm('');
    setFeedbackAdm('🔴 Reprise removida! Exibindo próximos jogos da ESPN.');
    setErroLogoCasa(false);
    setErroLogoFora(false);
  };

  const idRepriseSalva = repriseSalva
    ? extrairYoutubeID(repriseSalva.youtubeUrl)
    : null;
  const modoRepriseAtivo = Boolean(
    repriseSalva && idRepriseSalva && !forcarModoEspn
  );

  const temJogoAoVivoNaLista = jogosEspn.some((j) => j.aoVivo);

  const timeCasaExibido = modoRepriseAtivo
    ? repriseSalva!.timeCasa
    : partida?.timeCasa || 'Time Casa';
  const timeForaExibido = modoRepriseAtivo
    ? repriseSalva!.timeFora
    : partida?.timeFora || 'Time Fora';
  const logoCasaExibido = modoRepriseAtivo
    ? obterEscudoPorNome(repriseSalva!.timeCasa) || partida?.logoCasa || ''
    : partida?.logoCasa || obterEscudoPorNome(partida?.timeCasa || '');
  const logoForaExibido = modoRepriseAtivo
    ? obterEscudoPorNome(repriseSalva!.timeFora) || partida?.logoFora || ''
    : partida?.logoFora || obterEscudoPorNome(partida?.timeFora || '');

  const siglaTime = (nome: string) =>
    (nome || '').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'FC';

  const handleApostarAgora = () => {
    setApostaConfirmada(true);

    const golsCasaNum = escolhaVencedor === 'CASA' ? 1 : 0;
    const golsForaNum = escolhaVencedor === 'FORA' ? 1 : 0;

    const dadosPalpite: DadosPalpiteLive = {
      timeCasa: timeCasaExibido,
      timeFora: timeForaExibido,
      golsCasa: golsCasaNum,
      golsFora: golsForaNum,
      placarPalpite:
        escolhaVencedor === 'CASA'
          ? `Vitória ${timeCasaExibido}`
          : escolhaVencedor === 'FORA'
          ? `Vitória ${timeForaExibido}`
          : 'Empate',
      escolha: escolhaVencedor,
      valor: 10,
      canal: modoRepriseAtivo ? 'Reprise YouTube' : 'ESPN Brasileirão',
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(
        'bolao_elite_live_palpite',
        JSON.stringify(dadosPalpite)
      );
    } catch {
      // ignore storage errors
    }

    if (typeof onConfirmarPalpiteRef.current === 'function') {
      onConfirmarPalpiteRef.current(dadosPalpite);
    }
  };

  return (
    <div className="w-full bg-[#0A0A0A] text-white border-2 border-[#C41E3A] rounded-[16px] overflow-hidden shadow-[0_12px_35px_rgba(196,30,58,0.22)]">
      {/* TOPO DO COMPONENTE COM STATUS DA API ESPN E BOTÃO PEQUENO "⚙️ ADM" */}
      <div className="bg-[#0A0A0A] border-b border-[#222222] px-3.5 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {modoRepriseAtivo ? (
            <span className="bg-amber-400 text-black text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
              REPRISE
            </span>
          ) : partida?.aoVivo ? (
            <span className="bg-[#C41E3A] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shrink-0 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              AO VIVO
            </span>
          ) : (
            <span className="bg-amber-500 text-black text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
              ⏳ EM BREVE
            </span>
          )}
          <span className="text-xs font-extrabold text-white truncate">
            {buscandoJogos && !modoRepriseAtivo && !partida
              ? 'Buscando jogos na ESPN...'
              : partida
              ? `${timeCasaExibido} x ${timeForaExibido}`
              : 'Sem jogos ao vivo no momento'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {repriseSalva && idRepriseSalva && forcarModoEspn && (
            <button
              type="button"
              onClick={() => setForcarModoEspn(false)}
              className="text-[10px] font-black px-2 py-1 rounded-lg bg-amber-400 text-black cursor-pointer"
              title="Voltar para a reprise salva"
            >
              📼 Ver Reprise
            </button>
          )}
          <button
            type="button"
            onClick={async () => {
              const abrindo = !painelAdmAberto;
              setPainelAdmAberto(abrindo);
              setErroAdm('');
              setFeedbackAdm('');
              if (
                abrindo &&
                typeof navigator !== 'undefined' &&
                navigator.clipboard?.readText
              ) {
                try {
                  const clip = await navigator.clipboard.readText();
                  if (clip && extrairYoutubeID(clip)) {
                    salvarEAtivarReprise(
                      clip.trim(),
                      inputTimeCasa,
                      inputTimeFora,
                      true
                    );
                  }
                } catch {
                  // ignore clipboard permission on open
                }
              }
            }}
            className={`text-[11px] font-extrabold px-2.5 py-1 rounded-lg border transition cursor-pointer shrink-0 flex items-center gap-1 ${
              painelAdmAberto
                ? 'bg-amber-400 text-black border-amber-300'
                : 'bg-[#111111] hover:bg-zinc-800 text-amber-400 border-amber-400/60'
            }`}
            title="Abrir controle ADM de Reprise"
          >
            <span>⚙️</span>
            <span>ADM</span>
          </button>
        </div>
      </div>

      {/* AVISO QUANDO NÃO HÁ JOGOS AO VIVO NO MOMENTO */}
      {!modoRepriseAtivo && !buscandoJogos && !temJogoAoVivoNaLista && (
        <div className="bg-[#111111] border-b border-amber-500/40 px-3.5 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] font-bold text-amber-300">
            <span>⏳</span>
            <span>
              Sem jogos ao vivo no momento • Exibindo os{' '}
              <strong className="text-white uppercase">
                Próximos Jogos da ESPN (EM BREVE)
              </strong>
            </span>
          </div>
          <span className="bg-amber-500/20 border border-amber-400/60 text-amber-300 text-[9px] font-black px-2 py-0.5 rounded uppercase shrink-0">
            EM BREVE
          </span>
        </div>
      )}

      {/* PAINEL ADM DE REPRISE POR CIMA (COM BORDER AMARELO) */}
      {painelAdmAberto && (
        <div className="p-3.5 bg-[#0A0A0A] border-b-2 border-amber-400 space-y-3">
          <div className="border-2 border-amber-400 rounded-xl p-3.5 bg-[#111111] space-y-3">
            <div className="flex items-center justify-between border-b border-amber-400/30 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <span>⚙️</span>
                <span>Painel ADM • Reprise YouTube (Prioridade)</span>
              </span>
              <button
                type="button"
                onClick={() => setPainelAdmAberto(false)}
                className="text-xs text-zinc-400 hover:text-white font-bold cursor-pointer px-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarRepriseAdm} className="space-y-2.5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="input-youtube-reprise-adm"
                    className="block text-[10px] font-bold uppercase text-amber-300"
                  >
                    Cole o link do YouTube da reprise
                  </label>
                  <button
                    type="button"
                    onClick={handleColarLinkYoutube}
                    className="bg-amber-400 hover:bg-amber-300 active:scale-95 text-black font-black text-[10px] uppercase px-2.5 py-1 rounded-md cursor-pointer transition flex items-center gap-1 shadow"
                  >
                    <span>📋</span>
                    <span>Colar Link</span>
                  </button>
                </div>

                <div className="relative flex items-center">
                  <input
                    id="input-youtube-reprise-adm"
                    ref={inputUrlRef}
                    type="text"
                    inputMode="url"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={inputYoutubeUrl}
                    onChange={(e) => {
                      const val = e.target.value;
                      setInputYoutubeUrl(val);
                      if (extrairYoutubeID(val)) {
                        salvarEAtivarReprise(
                          val,
                          inputTimeCasa,
                          inputTimeFora,
                          true
                        );
                      }
                    }}
                    onPaste={(e) => {
                      const textoColado =
                        e.clipboardData?.getData('text/plain') ||
                        e.clipboardData?.getData('text') ||
                        '';
                      if (textoColado && textoColado.trim()) {
                        e.preventDefault();
                        salvarEAtivarReprise(
                          textoColado.trim(),
                          inputTimeCasa,
                          inputTimeFora,
                          true
                        );
                      }
                    }}
                    placeholder="https://www.youtube.com/watch?v=XXXX"
                    style={{ WebkitUserSelect: 'text', userSelect: 'text' }}
                    className="w-full bg-[#0A0A0A] border-2 border-amber-400/80 focus:border-amber-300 rounded-lg pl-3 pr-8 py-2.5 text-xs text-white font-mono outline-none select-text pointer-events-auto"
                  />
                  {inputYoutubeUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setInputYoutubeUrl('');
                        setErroAdm('');
                        setFeedbackAdm('');
                        inputUrlRef.current?.focus();
                      }}
                      className="absolute right-2 text-zinc-400 hover:text-white text-xs font-black px-1.5 py-0.5 cursor-pointer"
                      title="Limpar campo"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-300 mb-1">
                    Time Casa
                  </label>
                  <input
                    type="text"
                    value={inputTimeCasa}
                    onChange={(e) => setInputTimeCasa(e.target.value)}
                    placeholder="Ex: Flamengo"
                    style={{ WebkitUserSelect: 'text', userSelect: 'text' }}
                    className="w-full bg-[#0A0A0A] border border-amber-400/60 focus:border-amber-400 rounded-lg px-3 py-2 text-xs text-white font-bold outline-none select-text"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-300 mb-1">
                    Time Fora
                  </label>
                  <input
                    type="text"
                    value={inputTimeFora}
                    onChange={(e) => setInputTimeFora(e.target.value)}
                    placeholder="Ex: Vasco"
                    style={{ WebkitUserSelect: 'text', userSelect: 'text' }}
                    className="w-full bg-[#0A0A0A] border border-amber-400/60 focus:border-amber-400 rounded-lg px-3 py-2 text-xs text-white font-bold outline-none select-text"
                  />
                </div>
              </div>

              {erroAdm && (
                <div className="bg-red-950/80 border border-red-500 text-red-200 text-[11px] font-bold px-3 py-2 rounded-lg">
                  ⚠️ {erroAdm}
                </div>
              )}

              {feedbackAdm && (
                <div className="bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-[11px] font-bold px-3 py-2 rounded-lg">
                  {feedbackAdm}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="submit"
                  className="w-full bg-[#C41E3A] hover:bg-[#a81830] text-white font-black py-2.5 px-3 rounded-xl text-xs uppercase tracking-wider cursor-pointer transition shadow-md"
                >
                  💾 Salvar Reprise
                </button>
                <button
                  type="button"
                  onClick={handleLimparRepriseVoltarAoVivo}
                  className="w-full bg-[#0A0A0A] hover:bg-zinc-900 text-amber-400 border border-amber-400 font-black py-2.5 px-3 rounded-xl text-xs uppercase tracking-wider cursor-pointer transition"
                >
                  📅 Ver Próximos Jogos ESPN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1. ÁREA DO VÍDEO (w-full h-[210px]): REPRISE SALVA TEM PRIORIDADE SOBRE A CAPA DA ESPN */}
      <div className="relative w-full h-[210px] overflow-hidden bg-[#0A0A0A] border-b border-[#C41E3A]">
        {modoRepriseAtivo ? (
          <>
            <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-2 pointer-events-none">
              <span className="bg-amber-400 text-black text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-lg flex items-center gap-1.5">
                <span>📼</span>
                <span>REPRISE</span>
              </span>
              <span className="bg-black/85 border border-amber-400 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                {repriseSalva!.timeCasa} x {repriseSalva!.timeFora}
              </span>
            </div>

            <iframe
              key={idRepriseSalva}
              src={`https://www.youtube.com/embed/${idRepriseSalva}?autoplay=0&playsinline=1&rel=0`}
              title={`Reprise: ${repriseSalva!.timeCasa} x ${repriseSalva!.timeFora}`}
              className="w-full h-[210px] border-0 block bg-black"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </>
        ) : buscandoJogos && !partida ? (
          <div className="w-full h-[210px] flex flex-col items-center justify-center bg-[#0A0A0A] gap-2.5 p-4 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-[#C41E3A] border-t-transparent animate-spin" />
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
              Buscando próximos jogos na ESPN...
            </span>
          </div>
        ) : (
          /* CAPA DO CONFRONTO (SEM VÍDEO DEMO / SEM LOGO GG PLAY) */
          <div className="relative w-full h-[210px] flex flex-col justify-between p-3.5 select-none">
            <img
              src={CAPA_ESTADIO_TRANSMISSAO}
              alt="Estádio Brasileirão"
              className="absolute inset-0 w-full h-full object-cover opacity-35 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/65 to-black/80" />

            {/* Topo sobre a capa */}
            <div className="relative z-10 flex items-center justify-between gap-2">
              {partida?.aoVivo ? (
                <span className="bg-[#C41E3A] text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-lg flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  <span>{partida.status}</span>
                </span>
              ) : (
                <span className="bg-amber-500 text-black text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                  ⏳ EM BREVE • {partida?.dataFormatada} às {partida?.horario}
                </span>
              )}

              <span className="bg-black/85 border border-[#222222] text-zinc-200 text-[10px] font-bold px-2.5 py-1 rounded-full truncate max-w-[180px]">
                🏟️ {partida?.estadio || 'Brasileirão Série A'}
              </span>
            </div>

            {/* Centro da Capa do Jogo: Confronto Visual com Logos Reais da ESPN */}
            {partida ? (
              <div className="relative z-10 flex items-center justify-center gap-4 sm:gap-7 my-auto">
                <div className="flex flex-col items-center gap-1.5 w-28 text-center">
                  <div className="w-16 h-16 rounded-full bg-black/85 border-2 border-[#C41E3A] p-2 flex items-center justify-center shadow-[0_0_25px_rgba(196,30,58,0.45)]">
                    {!erroLogoCasa && logoCasaExibido ? (
                      <img
                        src={logoCasaExibido}
                        alt={partida.timeCasa}
                        onError={() => setErroLogoCasa(true)}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-sm font-black text-white">
                        {siglaTime(partida.timeCasa)}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-black text-white truncate w-full drop-shadow">
                    {partida.timeCasa}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center gap-1">
                  {partida.aoVivo ? (
                    <span className="bg-[#C41E3A] text-white text-sm sm:text-base font-black px-3.5 py-1 rounded-xl uppercase tracking-widest shadow-lg font-mono">
                      {partida.placarCasa} - {partida.placarFora}
                    </span>
                  ) : (
                    <span className="bg-[#C41E3A] text-white text-xs sm:text-sm font-black px-3 py-1 rounded-xl uppercase tracking-wider shadow-lg">
                      EM BREVE
                    </span>
                  )}
                  <span className="text-[10px] font-black text-amber-300 uppercase">
                    {partida.dataFormatada} • {partida.horario}
                  </span>
                </div>

                <div className="flex flex-col items-center gap-1.5 w-28 text-center">
                  <div className="w-16 h-16 rounded-full bg-black/85 border-2 border-[#C41E3A] p-2 flex items-center justify-center shadow-[0_0_25px_rgba(196,30,58,0.45)]">
                    {!erroLogoFora && logoForaExibido ? (
                      <img
                        src={logoForaExibido}
                        alt={partida.timeFora}
                        onError={() => setErroLogoFora(true)}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-sm font-black text-white">
                        {siglaTime(partida.timeFora)}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-black text-white truncate w-full drop-shadow">
                    {partida.timeFora}
                  </span>
                </div>
              </div>
            ) : (
              <div className="relative z-10 my-auto text-center space-y-1">
                <p className="text-xs sm:text-sm font-black text-amber-400 uppercase">
                  ⏳ Sem jogos disponíveis no momento
                </p>
                <p className="text-[11px] font-bold text-zinc-300">
                  Novos confrontos da ESPN aparecerão aqui em breve.
                </p>
              </div>
            )}

            {/* Rodapé da Capa */}
            <div className="relative z-10 flex items-center justify-between text-[10px] text-zinc-300 font-bold">
              <span>⚽ {partida?.campeonato || 'Brasileirão Série A'} • ESPN</span>
              <span className="text-[#C41E3A] font-black uppercase">
                🔄 Atualiza em {segundosParaAtualizar}s
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ALERTA DE GOL ("GOOOL! Novo placar") QUANDO O PLACAR MUDA NA API */}
      {alertaGol && (
        <div className="bg-[#C41E3A] border-b border-white/25 px-3.5 py-2.5 flex items-center justify-between gap-2 animate-pulse shadow-[0_0_25px_rgba(196,30,58,0.65)]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base shrink-0 animate-bounce">⚽</span>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-black uppercase tracking-wider text-white truncate">
                GOOOL! Novo placar
              </div>
              <div className="text-[11px] font-bold text-white/95 truncate">
                {alertaGol.timeCasa} {alertaGol.placarCasa} x{' '}
                {alertaGol.placarFora} {alertaGol.timeFora} ({alertaGol.minuto})
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAlertaGol(null)}
            className="text-xs font-black text-white/90 hover:text-white bg-black/30 px-2 py-1 rounded-lg cursor-pointer shrink-0"
            title="Fechar alerta de gol"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. PLACAR ESTILO ESPN EMBAIXO DO VÍDEO (FUNDO #111) */}
      <div className="bg-[#111111] border-b border-[#222222] p-3.5 text-center">
        {buscandoJogos && !partida && !modoRepriseAtivo ? (
          <div className="py-3 text-xs font-bold text-zinc-300">
            Buscando próximos jogos na ESPN...
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            {/* Esquerda: logoCasa + nomeCasa */}
            <div className="flex flex-col items-center flex-1 min-w-0">
              <div className="w-12 h-12 rounded-full bg-[#0A0A0A] border border-[#222222] p-1.5 flex items-center justify-center shadow-md">
                {!erroLogoCasa && logoCasaExibido ? (
                  <img
                    src={logoCasaExibido}
                    alt={timeCasaExibido}
                    onError={() => setErroLogoCasa(true)}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-xs font-black text-white">
                    {siglaTime(timeCasaExibido)}
                  </span>
                )}
              </div>
              <span className="mt-1.5 text-xs sm:text-sm font-extrabold text-white truncate max-w-full">
                {timeCasaExibido}
              </span>
            </div>

            {/* Centro: se ao vivo mostra placar; se não começou mostra EM BREVE + data/horário */}
            <div className="flex flex-col items-center shrink-0 px-2 max-w-[190px]">
              {modoRepriseAtivo ? (
                <>
                  <div className="bg-[#C41E3A] text-white font-black text-base sm:text-lg px-4 py-1.5 rounded-xl tracking-wider shadow-md uppercase">
                    REPRISE
                  </div>
                  <span className="text-[10px] text-amber-400 font-black uppercase tracking-wider mt-1">
                    TRANSMISSÃO GRAVADA
                  </span>
                  <span className="text-[10px] text-zinc-400 font-semibold truncate max-w-full mt-0.5">
                    {partida?.estadio || 'Brasileirão Série A'}
                  </span>
                </>
              ) : partida?.aoVivo ? (
                <>
                  <div className="bg-[#C41E3A] text-white font-black text-xl sm:text-2xl px-4 py-1 rounded-xl tracking-widest shadow-md font-mono">
                    {partida.placarCasa} - {partida.placarFora}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider mt-1 text-[#C41E3A] animate-pulse">
                    {partida.status}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-semibold truncate max-w-full mt-0.5">
                    {partida.estadio}
                  </span>
                </>
              ) : (
                <>
                  <div className="bg-[#C41E3A] text-white font-black text-sm sm:text-base px-3.5 py-1.5 rounded-xl tracking-wider shadow-md uppercase">
                    ⏳ EM BREVE
                  </div>
                  <span className="text-[10px] text-amber-400 font-black uppercase tracking-wider mt-1">
                    📅 {partida?.dataFormatada || '--/--'} às{' '}
                    {partida?.horario || '--:--'}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-semibold truncate max-w-full mt-0.5">
                    {partida?.estadio || 'Estádio Brasileirão'}
                  </span>
                </>
              )}
            </div>

            {/* Direita: nomeFora + logoFora */}
            <div className="flex flex-col items-center flex-1 min-w-0">
              <div className="w-12 h-12 rounded-full bg-[#0A0A0A] border border-[#222222] p-1.5 flex items-center justify-center shadow-md">
                {!erroLogoFora && logoForaExibido ? (
                  <img
                    src={logoForaExibido}
                    alt={timeForaExibido}
                    onError={() => setErroLogoFora(true)}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-xs font-black text-white">
                    {siglaTime(timeForaExibido)}
                  </span>
                )}
              </div>
              <span className="mt-1.5 text-xs sm:text-sm font-extrabold text-white truncate max-w-full">
                {timeForaExibido}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2.5. MATCH SUMMARY (RESUMO DA PARTIDA ABAIXO DO PLACAR: ESTÁDIO, CAMPEONATO E STATUS/MINUTO) */}
      <div className="bg-[#0A0A0A] border-b border-[#222222] px-3.5 py-2.5 space-y-2">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-[#111111] border border-[#222222] rounded-xl px-2 py-1.5 flex flex-col items-center justify-center min-w-0">
            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
              🏟️ Estádio
            </span>
            <span className="text-[11px] font-extrabold text-white truncate w-full mt-0.5">
              {partida?.estadio || 'Brasileirão'}
            </span>
          </div>

          <div className="bg-[#111111] border border-[#222222] rounded-xl px-2 py-1.5 flex flex-col items-center justify-center min-w-0">
            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
              🏆 Campeonato
            </span>
            <span className="text-[11px] font-extrabold text-white truncate w-full mt-0.5">
              {partida?.campeonato || 'Brasileirão Série A'}
            </span>
          </div>

          <div className="bg-[#111111] border border-[#C41E3A]/60 rounded-xl px-2 py-1.5 flex flex-col items-center justify-center min-w-0">
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#C41E3A]">
              ⏱️ Status / Horário
            </span>
            <span className="text-[11px] font-black text-amber-300 truncate w-full mt-0.5">
              {modoRepriseAtivo
                ? 'Reprise'
                : partida?.aoVivo
                ? partida.minuto
                : `EM BREVE (${partida?.dataFormatada || ''} ${
                    partida?.horario || ''
                  })`}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 text-[10px] text-zinc-400 px-0.5">
          <span className="truncate">
            🟢 ESPN API:{' '}
            {ultimaSincronizacao
              ? `Sincronizado às ${ultimaSincronizacao} (${segundosParaAtualizar}s)`
              : 'Sincronizando...'}
          </span>
          <button
            type="button"
            onClick={() => {
              setBuscandoJogos(true);
              buscarJogosEspn();
            }}
            className="text-[10px] font-black text-[#C41E3A] hover:underline cursor-pointer shrink-0"
          >
            🔄 Atualizar ESPN
          </button>
        </div>
      </div>

      {/* CONTEÚDO INTERNO DO CARD */}
      <div className="p-4 space-y-4">
        {/* 3. LISTA DE PRÓXIMOS JOGOS / JOGOS AO VIVO DA ESPN */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-white flex items-center gap-1.5">
              <span>{temJogoAoVivoNaLista ? '🔴' : '📅'}</span>
              <span>
                {temJogoAoVivoNaLista
                  ? `Jogos Ao Vivo na ESPN (${jogosEspn.length})`
                  : `Próximos Jogos da ESPN • Em Breve (${jogosEspn.length})`}
              </span>
            </span>
            <span className="text-[10px] font-black text-amber-400 uppercase">
              {temJogoAoVivoNaLista ? 'Ao Vivo' : '⏳ Em Breve'}
            </span>
          </div>

          {buscandoJogos && jogosEspn.length === 0 ? (
            <div className="bg-[#111111] border border-[#222222] rounded-xl p-3 text-center text-xs text-zinc-300 font-bold">
              Buscando próximos jogos na ESPN...
            </div>
          ) : jogosEspn.length === 0 ? (
            <div className="bg-[#111111] border border-[#222222] rounded-xl p-3 text-center text-xs text-amber-300 font-bold">
              ⏳ Sem jogos disponíveis no momento — Novos jogos da ESPN em breve.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-0.5">
              {jogosEspn.map((item) => {
                const selecionado =
                  !modoRepriseAtivo && partida?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setForcarModoEspn(true);
                      setPartida({
                        id: item.id,
                        timeCasa: item.timeCasa,
                        timeFora: item.timeFora,
                        logoCasa: item.logoCasa,
                        logoFora: item.logoFora,
                        placarCasa: item.placarCasa,
                        placarFora: item.placarFora,
                        status: item.status,
                        minuto: item.minuto,
                        campeonato: item.campeonato,
                        horario: item.horario,
                        dataFormatada: item.dataFormatada,
                        estadio: item.estadio,
                        aoVivo: item.aoVivo,
                        naoComecou: item.naoComecou,
                        encerrado: item.encerrado,
                      });
                      setErroLogoCasa(false);
                      setErroLogoFora(false);
                      setApostaConfirmada(false);
                    }}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold border transition-all duration-200 cursor-pointer flex items-center justify-between gap-2 ${
                      selecionado
                        ? 'bg-[#C41E3A] text-white border-[#C41E3A] shadow-[0_0_15px_rgba(196,30,58,0.45)]'
                        : 'bg-[#111111] hover:bg-[#C41E3A]/20 text-white border-[#222222] hover:border-[#C41E3A]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {item.logoCasa ? (
                        <img
                          src={item.logoCasa}
                          alt={item.timeCasa}
                          className="w-5 h-5 object-contain shrink-0"
                        />
                      ) : (
                        <span className="text-[10px] font-black">
                          {siglaTime(item.timeCasa)}
                        </span>
                      )}
                      <span className="truncate max-w-[65px]">
                        {item.timeCasa}
                      </span>
                      <span className="text-[10px] font-black opacity-80">
                        x
                      </span>
                      <span className="truncate max-w-[65px]">
                        {item.timeFora}
                      </span>
                      {item.logoFora ? (
                        <img
                          src={item.logoFora}
                          alt={item.timeFora}
                          className="w-5 h-5 object-contain shrink-0"
                        />
                      ) : (
                        <span className="text-[10px] font-black">
                          {siglaTime(item.timeFora)}
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded shrink-0 flex items-center gap-1 ${
                        selecionado
                          ? 'bg-black/40 text-white'
                          : item.aoVivo
                          ? 'bg-[#C41E3A] text-white animate-pulse'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-400/50'
                      }`}
                    >
                      {item.aoVivo ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                          <span>
                            {item.placarCasa}-{item.placarFora} • {item.minuto}
                          </span>
                        </>
                      ) : (
                        <span>
                          ⏳ EM BREVE • {item.dataFormatada} {item.horario}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. QUEM GANHA? APOSTE AGORA */}
        <div className="bg-[#111111] border border-[#C41E3A] rounded-[16px] p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-white flex items-center gap-1.5">
              <span>🔥</span>
              <span>Quem Ganha? Aposte Agora</span>
            </span>
            <span className="text-[10px] font-bold text-[#C41E3A] uppercase tracking-wider">
              Escolha o Vencedor
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setEscolhaVencedor('CASA');
                setApostaConfirmada(false);
              }}
              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                escolhaVencedor === 'CASA'
                  ? 'bg-[#C41E3A] text-white border-[#C41E3A] shadow-[0_0_15px_rgba(196,30,58,0.45)] scale-[1.02]'
                  : 'bg-[#0A0A0A] hover:bg-[#C41E3A]/15 text-white border-[#222222] hover:border-[#C41E3A]/60'
              }`}
            >
              <span className="text-[11px] font-black truncate max-w-full">
                {timeCasaExibido}
              </span>
              <span className="text-[9px] uppercase font-bold opacity-85">
                Ganha
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEscolhaVencedor('EMPATE');
                setApostaConfirmada(false);
              }}
              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                escolhaVencedor === 'EMPATE'
                  ? 'bg-[#C41E3A] text-white border-[#C41E3A] shadow-[0_0_15px_rgba(196,30,58,0.45)] scale-[1.02]'
                  : 'bg-[#0A0A0A] hover:bg-[#C41E3A]/15 text-white border-[#222222] hover:border-[#C41E3A]/60'
              }`}
            >
              <span className="text-[11px] font-black">Empate</span>
              <span className="text-[9px] uppercase font-bold opacity-85">
                Igualdade
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEscolhaVencedor('FORA');
                setApostaConfirmada(false);
              }}
              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                escolhaVencedor === 'FORA'
                  ? 'bg-[#C41E3A] text-white border-[#C41E3A] shadow-[0_0_15px_rgba(196,30,58,0.45)] scale-[1.02]'
                  : 'bg-[#0A0A0A] hover:bg-[#C41E3A]/15 text-white border-[#222222] hover:border-[#C41E3A]/60'
              }`}
            >
              <span className="text-[11px] font-black truncate max-w-full">
                {timeForaExibido}
              </span>
              <span className="text-[9px] uppercase font-bold opacity-85">
                Ganha
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleApostarAgora}
            className="w-full bg-[#C41E3A] hover:bg-[#a81830] active:scale-[0.99] text-white font-black py-3.5 px-4 rounded-xl text-sm uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(196,30,58,0.4)] border border-[#C41E3A]"
          >
            <span>⚡</span>
            <span>Quem Ganha? Aposte Agora</span>
          </button>

          {apostaConfirmada && (
            <div className="bg-[#C41E3A]/20 border border-[#C41E3A] rounded-xl p-2.5 text-center text-xs font-bold text-white">
              ✅ Aposta selecionada:{' '}
              {escolhaVencedor === 'CASA'
                ? `Vitória do ${timeCasaExibido}`
                : escolhaVencedor === 'FORA'
                ? `Vitória do ${timeForaExibido}`
                : `Empate (${timeCasaExibido} x ${timeForaExibido})`}
              !
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const BolaoLiveCard = React.memo(
  BolaoLiveCardInner,
  (prev, next) => prev.admAbertoPorPadrao === next.admAbertoPorPadrao
);

export default BolaoLiveCard;
