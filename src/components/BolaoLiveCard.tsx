import React, { useState, useEffect, useCallback } from 'react';
import {
  buscarJogosRodadaEspn,
  getHojeBrasilISO,
  toBrasilDateAndTime,
} from '../supabase';

export interface JogoEspnItem {
  id: string;
  time_casa: string;
  time_fora: string;
  casa: string;
  fora: string;
  campeonato: string;
  horario: string;
  data: string;
  estadio: string;
  status: string;
  tempoJogo: string;
  aoVivo: boolean;
  encerrado: boolean;
  estadoPartida?: string;
  placar_casa: string | number;
  placar_fora: string | number;
  escudoCasaUrl: string;
  escudoForaUrl: string;
}

export interface CanalItem {
  id: string;
  nome: string;
  videoId: string;
  timeCasa: string;
  timeFora: string;
  placarCasa: number;
  placarFora: number;
  campeonato: string;
  escudoCasa: string;
  escudoFora: string;
}

export interface RepriseSalvaStorage {
  youtubeUrl: string;
  youtubeId?: string;
  timeCasa: string;
  timeFora: string;
  data: string | Date;
}

const STORAGE_KEY_REPRISE = 'bolao_reprise_atual';

export function extrairYoutubeID(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const limpo = url.trim();
  if (!limpo) return null;

  // Caso o usuário tenha colado diretamente o ID de 11 caracteres
  if (/^[a-zA-Z0-9_-]{11}$/.test(limpo)) {
    return limpo;
  }

  // Formatos: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/live/ID, youtube.com/embed/ID, youtube.com/shorts/ID
  const padroes = [
    /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
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
  flamengo: 'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F819.png',
  palmeiras: 'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F2029.png',
  corinthians: 'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F874.png',
  santos: 'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F2674.png',
  vasco: 'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F3454.png',
  'vasco da gama': 'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F3454.png',
  fluminense: 'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F3445.png',
  botafogo: 'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F6086.png',
  'sao paulo': 'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F2026.png',
  gremio: 'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F6273.png',
  internacional: 'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F1936.png',
  cruzeiro: 'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F2022.png',
  'atletico-mg': 'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F7632.png',
  bahia: 'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F9967.png',
  fortaleza: 'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F6272.png',
  ceara: 'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F3441.png',
  vitoria: 'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F3457.png',
  brasil: 'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fcountries%2F500%2Fbra.png',
  argentina: 'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fcountries%2F500%2Farg.png',
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

export const CANAIS: CanalItem[] = [
  {
    id: 'cazetv',
    nome: 'CazéTV',
    videoId: 'K6oCrMQCXJU',
    timeCasa: 'Vasco',
    timeFora: 'Fluminense',
    placarCasa: 2,
    placarFora: 1,
    campeonato: 'Brasileirão Série A • Maracanã',
    escudoCasa: ESCUDOS_CONHECIDOS['vasco'],
    escudoFora: ESCUDOS_CONHECIDOS['fluminense'],
  },
  {
    id: 'fifa',
    nome: 'FIFA+',
    videoId: 'IsLDe3K9Pf4',
    timeCasa: 'Corinthians',
    timeFora: 'Palmeiras',
    placarCasa: 1,
    placarFora: 0,
    campeonato: 'Clássico • Derby Paulista',
    escudoCasa: ESCUDOS_CONHECIDOS['corinthians'],
    escudoFora: ESCUDOS_CONHECIDOS['palmeiras'],
  },
  {
    id: 'nsports',
    nome: 'N Sports',
    videoId: 'l_2qXr8wCnk',
    timeCasa: 'Santos',
    timeFora: 'Flamengo',
    placarCasa: 2,
    placarFora: 2,
    campeonato: 'Brasileirão Série A • Vila Belmiro',
    escudoCasa: ESCUDOS_CONHECIDOS['santos'],
    escudoFora: ESCUDOS_CONHECIDOS['flamengo'],
  },
  {
    id: 'goat',
    nome: 'Canal GOAT',
    videoId: 'CTNlXPwPHbA',
    timeCasa: 'Flamengo',
    timeFora: 'Palmeiras',
    placarCasa: 1,
    placarFora: 1,
    campeonato: 'Transmissão Oficial • Canal GOAT',
    escudoCasa: ESCUDOS_CONHECIDOS['flamengo'],
    escudoFora: ESCUDOS_CONHECIDOS['palmeiras'],
  },
];

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
}

function converterHorarioParaMinutos(horarioStr: string): number {
  const match = String(horarioStr || '').match(/(\d{1,2}):(\d{2})/);
  if (!match) return 9999;
  return Number(match[1]) * 60 + Number(match[2]);
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

export function BolaoLiveCard({ onConfirmarPalpite }: BolaoLiveCardProps) {
  // Estado da Reprise salva pelo ADM no localStorage (`bolao_reprise_atual`)
  const [repriseSalva, setRepriseSalva] = useState<RepriseSalvaStorage | null>(
    () => lerRepriseSalvaLocalStorage()
  );

  // Estado do Painel ADM (escondido por padrão, abre ao clicar em "⚙️ ADM")
  const [painelAdmAberto, setPainelAdmAberto] = useState<boolean>(false);
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

  // Estado do modo Ao Vivo normal com os 4 canais
  const [canalAtivo, setCanalAtivo] = useState<CanalItem>(CANAIS[0]);

  // Estado das partidas reais da ESPN (Brasileirão Série A)
  const [jogosAtivosEspn, setJogosAtivosEspn] = useState<JogoEspnItem[]>([]);
  const [proximosJogosHoje, setProximosJogosHoje] = useState<JogoEspnItem[]>([]);
  const [indiceJogoEspn, setIndiceJogoEspn] = useState<number>(0);
  const [carregandoEspn, setCarregandoEspn] = useState<boolean>(true);
  const [ultimaSincronizacao, setUltimaSincronizacao] = useState<string>('');

  const [escolhaVencedor, setEscolhaVencedor] = useState<'CASA' | 'EMPATE' | 'FORA'>('CASA');
  const [apostaConfirmada, setApostaConfirmada] = useState<boolean>(false);

  const [erroEscudoCasa, setErroEscudoCasa] = useState<boolean>(false);
  const [erroEscudoFora, setErroEscudoFora] = useState<boolean>(false);

  // Sincroniza caso o localStorage mude em outra aba
  useEffect(() => {
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === STORAGE_KEY_REPRISE) {
        const atual = lerRepriseSalvaLocalStorage();
        setRepriseSalva(atual);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const carregarJogosEspn = useCallback(async () => {
    try {
      const hojeIso = getHojeBrasilISO();
      const lista = await buscarJogosRodadaEspn(hojeIso);
      const todosHoje: JogoEspnItem[] = Array.isArray(lista) ? lista : [];

      todosHoje.sort(
        (a, b) =>
          converterHorarioParaMinutos(a.horario) -
          converterHorarioParaMinutos(b.horario)
      );

      const brAgora = toBrasilDateAndTime(new Date());
      const minutosAgora = converterHorarioParaMinutos(brAgora.timeStr);

      const emAndamento = todosHoje.filter((j) => {
        if (j.aoVivo || j.estadoPartida === 'in') return true;
        if (j.encerrado || j.estadoPartida === 'post') return false;
        const minJogo = converterHorarioParaMinutos(j.horario);
        return minutosAgora >= minJogo && minutosAgora <= minJogo + 135;
      });

      const agendados = todosHoje.filter(
        (j) =>
          !j.aoVivo &&
          !j.encerrado &&
          converterHorarioParaMinutos(j.horario) > minutosAgora
      );

      setJogosAtivosEspn(emAndamento);
      setProximosJogosHoje(agendados);

      if (emAndamento.length > 0) {
        let melhorIndice = 0;
        let menorDiferenca = Infinity;
        emAndamento.forEach((jg, idx) => {
          const diff = Math.abs(
            minutosAgora - converterHorarioParaMinutos(jg.horario)
          );
          if (diff <= menorDiferenca) {
            menorDiferenca = diff;
            melhorIndice = idx;
          }
        });
        setIndiceJogoEspn((prev) =>
          prev < emAndamento.length ? prev : melhorIndice
        );
      } else {
        setIndiceJogoEspn(0);
      }

      setUltimaSincronizacao(
        new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    } catch {
      setJogosAtivosEspn([]);
      setProximosJogosHoje([]);
    } finally {
      setCarregandoEspn(false);
    }
  }, []);

  useEffect(() => {
    carregarJogosEspn();
    const interval = window.setInterval(() => {
      carregarJogosEspn();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [carregarJogosEspn]);

  useEffect(() => {
    if (jogosAtivosEspn.length <= 1) return;
    const rotacao = window.setInterval(() => {
      setIndiceJogoEspn((prev) => (prev + 1) % jogosAtivosEspn.length);
      setErroEscudoCasa(false);
      setErroEscudoFora(false);
    }, 20000);
    return () => window.clearInterval(rotacao);
  }, [jogosAtivosEspn.length]);

  const jogoEspnAtual: JogoEspnItem | null =
    jogosAtivosEspn.length > 0
      ? jogosAtivosEspn[indiceJogoEspn % jogosAtivosEspn.length]
      : null;

  const handleSalvarRepriseAdm = (e: React.FormEvent) => {
    e.preventDefault();
    setErroAdm('');
    setFeedbackAdm('');

    const idExtraido = extrairYoutubeID(inputYoutubeUrl);
    if (!idExtraido) {
      setErroAdm(
        'Link do YouTube inválido. Use o formato https://www.youtube.com/watch?v=XXXX ou https://youtu.be/XXXX'
      );
      return;
    }

    const casaLimpo = inputTimeCasa.trim() || 'Time Casa';
    const foraLimpo = inputTimeFora.trim() || 'Time Fora';

    const dadosReprise: RepriseSalvaStorage = {
      youtubeUrl: inputYoutubeUrl.trim(),
      timeCasa: casaLimpo,
      timeFora: foraLimpo,
      data: new Date().toISOString(),
    };

    try {
      localStorage.setItem(STORAGE_KEY_REPRISE, JSON.stringify(dadosReprise));
    } catch {
      // ignore storage errors
    }

    setRepriseSalva(dadosReprise);
    setErroEscudoCasa(false);
    setErroEscudoFora(false);
    setApostaConfirmada(false);
    setFeedbackAdm(
      `✅ Reprise "${casaLimpo} x ${foraLimpo}" salva e carregada no player!`
    );
  };

  const handleLimparRepriseVoltarAoVivo = () => {
    try {
      localStorage.removeItem(STORAGE_KEY_REPRISE);
    } catch {
      // ignore
    }
    setRepriseSalva(null);
    setInputYoutubeUrl('');
    setInputTimeCasa('');
    setInputTimeFora('');
    setErroAdm('');
    setFeedbackAdm('🔴 Reprise removida! Player voltou ao modo Ao Vivo.');
    setErroEscudoCasa(false);
    setErroEscudoFora(false);
  };

  const selecionarCanalAoVivo = (canal: CanalItem) => {
    // Se clicar em um canal ao vivo, volta para o canal selecionado
    if (repriseSalva) {
      try {
        localStorage.removeItem(STORAGE_KEY_REPRISE);
      } catch {
        // ignore
      }
      setRepriseSalva(null);
    }
    setCanalAtivo(canal);
    setErroEscudoCasa(false);
    setErroEscudoFora(false);
    setApostaConfirmada(false);
  };

  // Determina o ID do YouTube e a URL do embed
  const idRepriseSalva = repriseSalva
    ? extrairYoutubeID(repriseSalva.youtubeUrl)
    : null;
  const modoRepriseAtivo = Boolean(repriseSalva && idRepriseSalva);

  const iframeEmbedUrl = modoRepriseAtivo
    ? `https://www.youtube.com/embed/${idRepriseSalva}?autoplay=0&playsinline=1&rel=0`
    : `https://www.youtube.com/embed/${canalAtivo.videoId}?autoplay=0&playsinline=1&rel=0`;

  // Times exibidos na área de confronto e aposta
  const timeCasaExibido = modoRepriseAtivo
    ? repriseSalva!.timeCasa
    : jogoEspnAtual
    ? jogoEspnAtual.time_casa || jogoEspnAtual.casa
    : canalAtivo.timeCasa;

  const timeForaExibido = modoRepriseAtivo
    ? repriseSalva!.timeFora
    : jogoEspnAtual
    ? jogoEspnAtual.time_fora || jogoEspnAtual.fora
    : canalAtivo.timeFora;

  const escudoCasaExibido = modoRepriseAtivo
    ? obterEscudoPorNome(repriseSalva!.timeCasa)
    : jogoEspnAtual
    ? jogoEspnAtual.escudoCasaUrl
    : canalAtivo.escudoCasa;

  const escudoForaExibido = modoRepriseAtivo
    ? obterEscudoPorNome(repriseSalva!.timeFora)
    : jogoEspnAtual
    ? jogoEspnAtual.escudoForaUrl
    : canalAtivo.escudoFora;

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
      canal: modoRepriseAtivo ? 'Reprise ADM' : canalAtivo.nome,
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

    if (typeof onConfirmarPalpite === 'function') {
      onConfirmarPalpite(dadosPalpite);
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
          ) : (
            <span className="bg-[#C41E3A] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              AO VIVO
            </span>
          )}
          <span className="text-xs font-extrabold text-white truncate">
            {timeCasaExibido} x {timeForaExibido}
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            setPainelAdmAberto((prev) => !prev);
            setErroAdm('');
            setFeedbackAdm('');
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

      {/* PAINEL ADM INTERNO (SÓ ABRE QUANDO CLICAR EM ⚙️ ADM, COM BORDER AMARELO) */}
      {painelAdmAberto && (
        <div className="p-3.5 bg-[#0A0A0A] border-b-2 border-amber-400 space-y-3">
          <div className="border-2 border-amber-400 rounded-xl p-3.5 bg-[#111111] space-y-3">
            <div className="flex items-center justify-between border-b border-amber-400/30 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <span>⚙️</span>
                <span>Painel ADM • Configurar Reprise YouTube</span>
              </span>
              <button
                type="button"
                onClick={() => setPainelAdmAberto(false)}
                className="text-xs text-zinc-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarRepriseAdm} className="space-y-2.5">
              <div>
                <label className="block text-[10px] font-bold uppercase text-amber-300 mb-1">
                  Cole o link do YouTube da reprise
                </label>
                <input
                  type="text"
                  value={inputYoutubeUrl}
                  onChange={(e) => setInputYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=XXXX"
                  className="w-full bg-[#0A0A0A] border border-amber-400/60 focus:border-amber-400 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none"
                />
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
                    className="w-full bg-[#0A0A0A] border border-amber-400/60 focus:border-amber-400 rounded-lg px-3 py-2 text-xs text-white font-bold outline-none"
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
                    className="w-full bg-[#0A0A0A] border border-amber-400/60 focus:border-amber-400 rounded-lg px-3 py-2 text-xs text-white font-bold outline-none"
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

      {/* 1. ÁREA DO PLAYER DE VÍDEO DENTRO DO CARD (w-full h-[210px]) */}
      <div className="relative w-full h-[210px] overflow-hidden bg-black border-b border-[#C41E3A]">
        {/* Badge sobre o player: AMARELO "REPRISE" se tiver reprise salva, ou "AO VIVO" normal */}
        <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-2 pointer-events-none">
          {modoRepriseAtivo ? (
            <span className="bg-amber-400 text-black text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-lg flex items-center gap-1.5">
              <span>📼</span>
              <span>REPRISE</span>
            </span>
          ) : (
            <span className="bg-[#C41E3A] text-white text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>AO VIVO</span>
            </span>
          )}
          <span className="bg-black/85 border border-[#C41E3A] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
            {modoRepriseAtivo
              ? `${repriseSalva!.timeCasa} x ${repriseSalva!.timeFora}`
              : canalAtivo.nome}
          </span>
        </div>

        <iframe
          key={iframeEmbedUrl}
          src={iframeEmbedUrl}
          title={
            modoRepriseAtivo
              ? `Reprise: ${repriseSalva!.timeCasa} x ${repriseSalva!.timeFora}`
              : `Transmissão: ${canalAtivo.timeCasa} x ${canalAtivo.timeFora}`
          }
          className="w-full h-[210px] border-0 block bg-black"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>

      {/* Faixa informativa quando está em modo REPRISE */}
      {modoRepriseAtivo && (
        <div className="bg-amber-400/15 border-b border-amber-400/40 px-3.5 py-2 flex items-center justify-between gap-2 text-[11px]">
          <span className="text-amber-300 font-bold truncate">
            📼 Reprise de Jogo: <strong>{repriseSalva!.timeCasa} x {repriseSalva!.timeFora}</strong>
          </span>
          <span className="text-[10px] text-amber-400 font-mono shrink-0">
            Gravado
          </span>
        </div>
      )}

      {/* CONTEÚDO INTERNO DO CARD */}
      <div className="p-4 space-y-4">
        {/* 2. CANAIS DO PLAYER */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-white">
              📺 Canais de Transmissão
            </span>
            <span className="text-[10px] font-bold text-white/70">
              {modoRepriseAtivo
                ? `Reprise: ${repriseSalva!.timeCasa} x ${repriseSalva!.timeFora}`
                : `${canalAtivo.nome} • ${canalAtivo.timeCasa} x ${canalAtivo.timeFora}`}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {CANAIS.map((canal) => {
              const ativo = !modoRepriseAtivo && canalAtivo.id === canal.id;
              return (
                <button
                  key={canal.id}
                  type="button"
                  onClick={() => selecionarCanalAoVivo(canal)}
                  className={`w-full py-2.5 px-2.5 rounded-xl text-[11px] sm:text-xs font-bold border border-[#C41E3A] transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 truncate ${
                    ativo
                      ? 'bg-[#C41E3A] text-white shadow-[0_0_15px_rgba(196,30,58,0.45)]'
                      : 'bg-[#0A0A0A] hover:bg-[#C41E3A]/20 text-white'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      ativo ? 'bg-white animate-pulse' : 'bg-[#C41E3A]'
                    }`}
                  />
                  <span className="truncate">{canal.nome}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. PLACAR ESTILO ESPN (ATUALIZA VIA ESPN OU MOSTRA O CONFRONTO DA REPRISE) */}
        <div className="bg-[#111111] border border-[#222222] rounded-[16px] p-3.5 text-center space-y-2.5">
          <div className="flex items-center justify-between border-b border-[#222222] pb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-300">
              {modoRepriseAtivo
                ? '📼 Confronto da Reprise'
                : '⚽ Placar Brasileirão Série A (ESPN)'}
            </span>
            <button
              type="button"
              onClick={() => carregarJogosEspn()}
              className="text-[10px] font-bold text-[#C41E3A] hover:underline cursor-pointer"
            >
              🔄 Atualizar {ultimaSincronizacao ? `(${ultimaSincronizacao})` : ''}
            </button>
          </div>

          {modoRepriseAtivo ? (
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex flex-col items-center flex-1 min-w-0">
                <div className="w-12 h-12 rounded-full bg-zinc-950 border border-[#222222] p-1.5 flex items-center justify-center shadow-md">
                  {!erroEscudoCasa && escudoCasaExibido ? (
                    <img
                      src={escudoCasaExibido}
                      alt={timeCasaExibido}
                      onError={() => setErroEscudoCasa(true)}
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

              <div className="flex flex-col items-center shrink-0 px-2">
                <div className="bg-amber-400 text-black font-black text-xs sm:text-sm px-3.5 py-1.5 rounded-xl tracking-wider shadow-md uppercase">
                  REPRISE
                </div>
                <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider mt-1">
                  Jogo Gravado
                </span>
              </div>

              <div className="flex flex-col items-center flex-1 min-w-0">
                <div className="w-12 h-12 rounded-full bg-zinc-950 border border-[#222222] p-1.5 flex items-center justify-center shadow-md">
                  {!erroEscudoFora && escudoForaExibido ? (
                    <img
                      src={escudoForaExibido}
                      alt={timeForaExibido}
                      onError={() => setErroEscudoFora(true)}
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
          ) : carregandoEspn ? (
            <div className="py-3 text-xs text-zinc-400 font-bold">
              Consultando jogos do Brasileirão Série A na ESPN...
            </div>
          ) : jogoEspnAtual ? (
            <>
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex flex-col items-center flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-zinc-950 border border-[#222222] p-1.5 flex items-center justify-center shadow-md">
                    {!erroEscudoCasa && jogoEspnAtual.escudoCasaUrl ? (
                      <img
                        src={jogoEspnAtual.escudoCasaUrl}
                        alt={jogoEspnAtual.time_casa}
                        onError={() => setErroEscudoCasa(true)}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-xs font-black text-white">
                        {siglaTime(jogoEspnAtual.time_casa)}
                      </span>
                    )}
                  </div>
                  <span className="mt-1.5 text-xs sm:text-sm font-extrabold text-white truncate max-w-full">
                    {jogoEspnAtual.time_casa}
                  </span>
                </div>

                <div className="flex flex-col items-center shrink-0 px-2">
                  <div className="bg-[#C41E3A] text-white font-black text-xl sm:text-2xl px-4 py-1.5 rounded-xl tracking-widest shadow-md font-mono">
                    {jogoEspnAtual.placar_casa ?? 0} - {jogoEspnAtual.placar_fora ?? 0}
                  </div>
                  <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider mt-1">
                    {jogoEspnAtual.tempoJogo ||
                      jogoEspnAtual.status ||
                      `Horário ${jogoEspnAtual.horario}`}
                  </span>
                </div>

                <div className="flex flex-col items-center flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-zinc-950 border border-[#222222] p-1.5 flex items-center justify-center shadow-md">
                    {!erroEscudoFora && jogoEspnAtual.escudoForaUrl ? (
                      <img
                        src={jogoEspnAtual.escudoForaUrl}
                        alt={jogoEspnAtual.time_fora}
                        onError={() => setErroEscudoFora(true)}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-xs font-black text-white">
                        {siglaTime(jogoEspnAtual.time_fora)}
                      </span>
                    )}
                  </div>
                  <span className="mt-1.5 text-xs sm:text-sm font-extrabold text-white truncate max-w-full">
                    {jogoEspnAtual.time_fora}
                  </span>
                </div>
              </div>

              <p className="text-[11px] sm:text-xs text-white/90 font-semibold border-t border-[#222222] pt-2">
                Brasileirão Série A • {jogoEspnAtual.estadio} • Horário:{' '}
                {jogoEspnAtual.horario}
              </p>
            </>
          ) : (
            <div className="py-2.5 px-2 space-y-1">
              <div className="text-xs sm:text-sm font-black uppercase text-white">
                Sem jogos no momento
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Nenhuma partida do Brasileirão Série A em andamento na ESPN agora. O placar mudará automaticamente de acordo com o horário do jogo.
              </p>
              {proximosJogosHoje.length > 0 && (
                <div className="inline-block text-[10px] text-[#C41E3A] font-bold bg-black border border-[#222222] px-3 py-1 rounded-full mt-1">
                  Próximo jogo hoje às {proximosJogosHoje[0].horario}:{' '}
                  {proximosJogosHoje[0].time_casa} x {proximosJogosHoje[0].time_fora}
                </div>
              )}
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

export default BolaoLiveCard;
