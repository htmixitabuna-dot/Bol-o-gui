import React, { useState, useEffect, useCallback, useRef } from 'react';

const ESPN_API =
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

function formatarHorarioEvento(dateIso?: string): string {
  if (!dateIso) return '19:30';
  try {
    const dt = new Date(dateIso);
    if (isNaN(dt.getTime())) return '19:30';
    return dt.toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '19:30';
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

function BolaoLiveCardInner({
  onConfirmarPalpite,
  admAbertoPorPadrao = false,
}: BolaoLiveCardProps) {
  const onConfirmarPalpiteRef = useRef(onConfirmarPalpite);
  useEffect(() => {
    onConfirmarPalpiteRef.current = onConfirmarPalpite;
  }, [onConfirmarPalpite]);

  // Estado da Reprise salva no localStorage (prioridade sobre a API da ESPN)
  const [repriseSalva, setRepriseSalva] = useState<RepriseSalvaStorage | null>(
    () => lerRepriseSalvaLocalStorage()
  );

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

  // Estados da API da ESPN Ao Vivo + Goal Alerts
  const [jogosEspn, setJogosEspn] = useState<PartidaEspn[]>([]);
  const [partida, setPartida] = useState<PartidaEspn | null>(null);
  const [buscandoJogos, setBuscandoJogos] = useState<boolean>(true);
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

  // Busca os jogos ao vivo / próximos na ESPN_API via fetch nativo
  const buscarJogosEspn = useCallback(async () => {
    try {
      const response = await fetch(ESPN_API);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      const events = Array.isArray(data?.events) ? data.events : [];
      const nomeCampeonatoPadrao =
        data?.leagues?.[0]?.name || 'Brasileirão Série A';

      const listaPartidas: PartidaEspn[] = events
        .map((event: any, idx: number): PartidaEspn | null => {
          const competition = event?.competitions?.[0];
          const competitors = competition?.competitors || [];
          const compCasa = competitors[0];
          const compFora = competitors[1];

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

          const aoVivo = state === 'in';
          const encerrado = state === 'post';
          const naoComecou = !aoVivo && !encerrado;

          const horario = formatarHorarioEvento(
            event?.date || competition?.date
          );

          const rawDetail = String(
            event?.status?.type?.detail ||
              event?.status?.type?.shortDetail ||
              competition?.status?.type?.detail ||
              ''
          ).trim();

          const displayClock = String(
            event?.status?.displayClock || ''
          ).trim();

          let status = rawDetail || horario;
          let minuto = displayClock || rawDetail || horario;

          if (aoVivo) {
            if (displayClock) {
              status = `AO VIVO ${displayClock}`;
              minuto = displayClock;
            } else if (!/ao vivo/i.test(rawDetail)) {
              status = `AO VIVO ${rawDetail}`.trim();
              minuto = rawDetail || 'Em andamento';
            } else {
              status = rawDetail.toUpperCase();
              minuto = rawDetail;
            }
          } else if (encerrado) {
            status = rawDetail || 'FT';
            minuto = 'Encerrado (90\')';
          } else {
            status = horario;
            minuto = `Início às ${horario}`;
          }

          const estadio =
            competition?.venue?.fullName ||
            competition?.venue?.address?.city ||
            'Estádio Brasileirão';

          const idEvento = String(event?.id || `espn_${idx}`);

          // Verifica mudança de placar na API para disparar Goal Alert ("GOOOL! Novo placar")
          const placarAnterior = placaresAnterioresRef.current[idEvento];
          if (
            placarAnterior &&
            (placarAnterior.casa !== placarCasa ||
              placarAnterior.fora !== placarFora)
          ) {
            dispararAlertaGol({
              id: `${idEvento}_${Date.now()}`,
              mensagem: `GOOOL! Novo placar: ${timeCasa} ${placarCasa} - ${placarFora} ${timeFora}`,
              timeCasa,
              timeFora,
              placarCasa,
              placarFora,
              minuto,
            });
          }
          placaresAnterioresRef.current[idEvento] = {
            casa: placarCasa,
            fora: placarFora,
          };

          return {
            id: idEvento,
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
            estadio,
            aoVivo,
            naoComecou,
            encerrado,
          };
        })
        .filter((item: PartidaEspn | null): item is PartidaEspn =>
          Boolean(item)
        );

      setJogosEspn(listaPartidas);

      setPartida((prev) => {
        if (listaPartidas.length === 0) return null;
        if (prev) {
          const atualizada = listaPartidas.find((p) => p.id === prev.id);
          if (atualizada) {
            if (
              String(prev.placarCasa) !== String(atualizada.placarCasa) ||
              String(prev.placarFora) !== String(atualizada.placarFora)
            ) {
              dispararAlertaGol({
                id: `${atualizada.id}_${Date.now()}`,
                mensagem: `GOOOL! Novo placar: ${atualizada.timeCasa} ${atualizada.placarCasa} - ${atualizada.placarFora} ${atualizada.timeFora}`,
                timeCasa: atualizada.timeCasa,
                timeFora: atualizada.timeFora,
                placarCasa: atualizada.placarCasa,
                placarFora: atualizada.placarFora,
                minuto: atualizada.minuto,
              });
            }
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

  // useEffect para fazer fetch na ESPN_API assim que o componente carregar + setInterval de 30s
  useEffect(() => {
    buscarJogosEspn();
    const timer = window.setInterval(() => {
      buscarJogosEspn();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [buscarJogosEspn]);

  // Salva e ativa a reprise imediatamente (tanto ao colar quanto ao clicar em Salvar Reprise)
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
    setInputYoutubeUrl('');
    setInputTimeCasa('');
    setInputTimeFora('');
    setErroAdm('');
    setFeedbackAdm('🔴 Reprise removida! Exibindo jogos da ESPN.');
    setErroLogoCasa(false);
    setErroLogoFora(false);
  };

  // Se tiver reprise salva no localStorage, ela tem prioridade sobre a API da ESPN
  const idRepriseSalva = repriseSalva
    ? extrairYoutubeID(repriseSalva.youtubeUrl)
    : null;
  const modoRepriseAtivo = Boolean(repriseSalva && idRepriseSalva);

  const timeCasaExibido = modoRepriseAtivo
    ? repriseSalva!.timeCasa
    : partida?.timeCasa || 'Time Casa';
  const timeForaExibido = modoRepriseAtivo
    ? repriseSalva!.timeFora
    : partida?.timeFora || 'Time Fora';
  const logoCasaExibido = modoRepriseAtivo
    ? obterEscudoPorNome(repriseSalva!.timeCasa) || partida?.logoCasa || ''
    : partida?.logoCasa || '';
  const logoForaExibido = modoRepriseAtivo
    ? obterEscudoPorNome(repriseSalva!.timeFora) || partida?.logoFora || ''
    : partida?.logoFora || '';

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
    <div className="w-full bg-[#0A0A0A] text-white border border-[#C41E3A] rounded-[16px] overflow-hidden shadow-[0_12px_35px_rgba(196,30,58,0.18)]">
      {/* TOPO DO COMPONENTE COM BOTÃO PEQUENO "⚙️ ADM" */}
      <div className="bg-[#0A0A0A] border-b border-[#222222] px-3.5 py-2 flex items-center justify-between gap-2">
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
            <span className="bg-[#111111] border border-[#C41E3A] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
              ESPN
            </span>
          )}
          <span className="text-xs font-extrabold text-white truncate">
            {buscandoJogos && !modoRepriseAtivo && !partida
              ? 'Buscando jogos ao vivo...'
              : `${timeCasaExibido} x ${timeForaExibido}`}
          </span>
        </div>

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
                  🔴 Voltar ao Ao Vivo
                </button>
              </div>

              {modoRepriseAtivo && (
                <button
                  type="button"
                  onClick={handleLimparRepriseVoltarAoVivo}
                  className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 font-bold py-2 px-3 rounded-lg text-[11px] uppercase cursor-pointer transition"
                >
                  🗑️ Limpar Reprise
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {/* 1. ÁREA DO VÍDEO (w-full h-[210px]): REPRISE SALVA TEM PRIORIDADE SOBRE A API DA ESPN */}
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
              Buscando jogos ao vivo...
            </span>
          </div>
        ) : (
          /* CAPA DO JOGO COM IMAGEM DO ESTÁDIO + ESCUDOS DOS TIMES + BADGE AO VIVO PULSANTE */
          <div className="relative w-full h-[210px] flex flex-col justify-between p-3.5 select-none">
            <img
              src={CAPA_ESTADIO_TRANSMISSAO}
              alt="Estádio Brasileirão"
              className="absolute inset-0 w-full h-full object-cover opacity-35 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/65 to-black/80" />

            {/* Topo sobre a capa: Badge AO VIVO vermelho pulsante se status for ao vivo */}
            <div className="relative z-10 flex items-center justify-between gap-2">
              {partida?.aoVivo ? (
                <span className="bg-[#C41E3A] text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-lg flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  <span>{partida.status}</span>
                </span>
              ) : (
                <span className="bg-black/85 border border-[#C41E3A] text-white text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                  {partida?.encerrado
                    ? `ENCERRADO • ${partida.status}`
                    : `HOJE • ${partida?.horario || '--:--'}`}
                </span>
              )}

              <span className="bg-black/85 border border-[#222222] text-zinc-200 text-[10px] font-bold px-2.5 py-1 rounded-full truncate max-w-[180px]">
                🏟️ {partida?.estadio || 'Brasileirão Série A'}
              </span>
            </div>

            {/* Centro da Capa do Jogo: Confronto Visual com Logos da ESPN */}
            {partida ? (
              <div className="relative z-10 flex items-center justify-center gap-5 sm:gap-8 my-auto">
                <div className="flex flex-col items-center gap-1.5 w-28 text-center">
                  <div className="w-16 h-16 rounded-full bg-black/80 border-2 border-[#C41E3A] p-2 flex items-center justify-center shadow-[0_0_25px_rgba(196,30,58,0.4)]">
                    {!erroLogoCasa && partida.logoCasa ? (
                      <img
                        src={partida.logoCasa}
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

                <div className="flex flex-col items-center justify-center">
                  <span className="bg-[#C41E3A] text-white text-xs font-black px-3 py-1 rounded-lg uppercase tracking-widest shadow-lg">
                    VS
                  </span>
                </div>

                <div className="flex flex-col items-center gap-1.5 w-28 text-center">
                  <div className="w-16 h-16 rounded-full bg-black/80 border-2 border-[#C41E3A] p-2 flex items-center justify-center shadow-[0_0_25px_rgba(196,30,58,0.4)]">
                    {!erroLogoFora && partida.logoFora ? (
                      <img
                        src={partida.logoFora}
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
              <div className="relative z-10 my-auto text-center">
                <p className="text-xs font-bold text-zinc-300">
                  Nenhum confronto retornado pela ESPN no momento.
                </p>
              </div>
            )}

            {/* Rodapé da Capa */}
            <div className="relative z-10 flex items-center justify-between text-[10px] text-zinc-300 font-bold">
              <span>⚽ Brasileirão Série A • ESPN API</span>
              <span className="text-[#C41E3A] font-black uppercase">
                Atualização a cada 30s
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
            Buscando jogos ao vivo...
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

            {/* Centro: placarCasa - placarFora em caixa vermelha #C41E3A (ou VS + horário se não começou) + status + estádio */}
            <div className="flex flex-col items-center shrink-0 px-2 max-w-[175px]">
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
              ) : partida?.naoComecou ? (
                <>
                  <div className="bg-[#C41E3A] text-white font-black text-lg sm:text-xl px-4 py-1 rounded-xl tracking-widest shadow-md">
                    VS
                  </div>
                  <span className="text-[11px] text-white font-black uppercase tracking-wider mt-1">
                    ⏰ {partida.horario}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-semibold truncate max-w-full mt-0.5">
                    {partida.estadio}
                  </span>
                </>
              ) : (
                <>
                  <div className="bg-[#C41E3A] text-white font-black text-xl sm:text-2xl px-4 py-1 rounded-xl tracking-widest shadow-md font-mono">
                    {partida?.placarCasa ?? 0} - {partida?.placarFora ?? 0}
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider mt-1 ${
                      partida?.aoVivo
                        ? 'text-[#C41E3A] animate-pulse'
                        : 'text-white/90'
                    }`}
                  >
                    {partida?.status || 'AO VIVO'}
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

      {/* 2.5. MATCH SUMMARY (RESUMO DA PARTIDA ABAIXO DO PLACAR: ESTÁDIO, CAMPEONATO E MINUTO) */}
      <div className="bg-[#0A0A0A] border-b border-[#222222] px-3.5 py-2.5">
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
              ⏱️ Minuto
            </span>
            <span className="text-[11px] font-black text-white truncate w-full mt-0.5">
              {modoRepriseAtivo
                ? 'Reprise'
                : partida?.minuto || partida?.status || '--'}
            </span>
          </div>
        </div>
      </div>

      {/* CONTEÚDO INTERNO DO CARD */}
      <div className="p-4 space-y-4">
        {/* 3. LISTA DE JOGOS DA ESPN (VIRA OS CANAIS EMBAIXO DO VÍDEO) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-white">
              ⚽ Jogos Brasileirão (ESPN)
            </span>
            <button
              type="button"
              onClick={() => {
                setBuscandoJogos(true);
                buscarJogosEspn();
              }}
              className="text-[10px] font-bold text-[#C41E3A] hover:underline cursor-pointer"
            >
              🔄 Atualizar Placar
            </button>
          </div>

          {buscandoJogos && jogosEspn.length === 0 ? (
            <div className="bg-[#111111] border border-[#222222] rounded-xl p-3 text-center text-xs text-zinc-300 font-bold">
              Buscando jogos ao vivo...
            </div>
          ) : jogosEspn.length === 0 ? (
            <div className="bg-[#111111] border border-[#222222] rounded-xl p-3 text-center text-xs text-zinc-400">
              Nenhum jogo encontrado no placar da ESPN no momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-0.5">
              {jogosEspn.map((item) => {
                const selecionado = partida?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
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
                      <span className="truncate max-w-[68px]">
                        {item.timeCasa}
                      </span>
                      <span className="text-[10px] font-black opacity-80">
                        x
                      </span>
                      <span className="truncate max-w-[68px]">
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
                      className={`text-[10px] font-black px-2 py-0.5 rounded shrink-0 flex items-center gap-1 ${
                        selecionado
                          ? 'bg-black/40 text-white'
                          : item.aoVivo
                          ? 'bg-[#C41E3A] text-white animate-pulse'
                          : 'bg-[#0A0A0A] text-zinc-300 border border-[#222222]'
                      }`}
                    >
                      {item.aoVivo && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      )}
                      {item.naoComecou
                        ? item.horario
                        : `${item.placarCasa}-${item.placarFora} • ${item.status}`}
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
