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

export interface RepriseYoutubeItem {
  id: string;
  canal: string;
  videoId: string;
  timeCasa: string;
  timeFora: string;
  placarCasa: number;
  placarFora: number;
  campeonato: string;
  descricaoReprise: string;
  escudoCasa: string;
  escudoFora: string;
}

export const REPRISES_YOUTUBE: RepriseYoutubeItem[] = [
  {
    id: 'goat_fla_pal',
    canal: 'Canal GOAT (YouTube)',
    videoId: 'CTNlXPwPHbA',
    timeCasa: 'Flamengo',
    timeFora: 'Palmeiras',
    placarCasa: 1,
    placarFora: 1,
    campeonato: 'Final • Jogo Completo',
    descricaoReprise: 'Reprise de jogo anterior: Flamengo x Palmeiras (Transmissão Canal GOAT)',
    escudoCasa:
      'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F819.png',
    escudoFora:
      'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F2029.png',
  },
  {
    id: 'derby_cor_pal',
    canal: 'Paulistão / Tradição (YouTube)',
    videoId: 'IsLDe3K9Pf4',
    timeCasa: 'Corinthians',
    timeFora: 'Palmeiras',
    placarCasa: 0,
    placarFora: 0,
    campeonato: 'Final • Derby Paulista Completo',
    descricaoReprise: 'Reprise de jogo anterior: Corinthians x Palmeiras (Jogo Completo)',
    escudoCasa:
      'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F874.png',
    escudoFora:
      'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F2029.png',
  },
  {
    id: 'brasileirao_san_fla',
    canal: 'Transmissão Brasileirão (YouTube)',
    videoId: 'l_2qXr8wCnk',
    timeCasa: 'Santos',
    timeFora: 'Flamengo',
    placarCasa: 2,
    placarFora: 2,
    campeonato: 'Brasileirão Série A • Jogo Completo',
    descricaoReprise: 'Reprise de jogo anterior: Santos x Flamengo (Brasileirão Série A)',
    escudoCasa:
      'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F2674.png',
    escudoFora:
      'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F819.png',
  },
  {
    id: 'goat_cea_for',
    canal: 'Canal GOAT Clássicos (YouTube)',
    videoId: 'ZiLdsJWExG4',
    timeCasa: 'Ceará',
    timeFora: 'Fortaleza',
    placarCasa: 1,
    placarFora: 1,
    campeonato: 'Clássico-Rei • Jogo Completo',
    descricaoReprise: 'Reprise de jogo anterior: Ceará x Fortaleza (Transmissão Canal GOAT)',
    escudoCasa:
      'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F3441.png',
    escudoFora:
      'https://a.espncdn.com/combiner/i?img=%2Fi%2Fteamlogos%2Fsoccer%2F500%2F6272.png',
  },
];

export const CANAIS = REPRISES_YOUTUBE;

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

export function BolaoLiveCard({ onConfirmarPalpite }: BolaoLiveCardProps) {
  // Estado das partidas reais da ESPN (Brasileirão Série A)
  const [jogosAtivosEspn, setJogosAtivosEspn] = useState<JogoEspnItem[]>([]);
  const [proximosJogosHoje, setProximosJogosHoje] = useState<JogoEspnItem[]>([]);
  const [indiceJogoEspn, setIndiceJogoEspn] = useState<number>(0);
  const [carregandoEspn, setCarregandoEspn] = useState<boolean>(true);
  const [ultimaSincronizacao, setUltimaSincronizacao] = useState<string>('');

  // Estado das Reprises de Jogos Anteriores (YouTube)
  const [assistindoReprise, setAssistindoReprise] = useState<boolean>(true);
  const [repriseAtiva, setRepriseAtiva] = useState<RepriseYoutubeItem>(REPRISES_YOUTUBE[0]);
  const [autoplayReprise, setAutoplayReprise] = useState<boolean>(false);

  const [escolhaVencedor, setEscolhaVencedor] = useState<'CASA' | 'EMPATE' | 'FORA'>('CASA');
  const [apostaConfirmada, setApostaConfirmada] = useState<boolean>(false);

  const [erroEscudoCasa, setErroEscudoCasa] = useState<boolean>(false);
  const [erroEscudoFora, setErroEscudoFora] = useState<boolean>(false);

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

      // Filtra apenas jogos do Brasileirão Série A que estão acontecendo neste momento na ESPN
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

  // Se houver mais de um jogo acontecendo simultaneamente na ESPN, alterna pelo horário
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

  const selecionarReprise = (item: RepriseYoutubeItem) => {
    setRepriseAtiva(item);
    setAssistindoReprise(true);
    setAutoplayReprise(true);
    setApostaConfirmada(false);
  };

  const siglaTime = (nome: string) =>
    (nome || '').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'FC';

  const timeCasaAposta = jogoEspnAtual
    ? jogoEspnAtual.time_casa || jogoEspnAtual.casa
    : repriseAtiva.timeCasa;
  const timeForaAposta = jogoEspnAtual
    ? jogoEspnAtual.time_fora || jogoEspnAtual.fora
    : repriseAtiva.timeFora;

  const handleApostarAgora = () => {
    setApostaConfirmada(true);

    const golsCasaNum = escolhaVencedor === 'CASA' ? 1 : 0;
    const golsForaNum = escolhaVencedor === 'FORA' ? 1 : 0;

    const dadosPalpite: DadosPalpiteLive = {
      timeCasa: timeCasaAposta,
      timeFora: timeForaAposta,
      golsCasa: golsCasaNum,
      golsFora: golsForaNum,
      placarPalpite:
        escolhaVencedor === 'CASA'
          ? `Vitória ${timeCasaAposta}`
          : escolhaVencedor === 'FORA'
          ? `Vitória ${timeForaAposta}`
          : 'Empate',
      escolha: escolhaVencedor,
      valor: 10,
      canal: jogoEspnAtual ? 'ESPN Brasileirão Série A' : repriseAtiva.canal,
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

  const youtubeEmbedSrc = `https://www.youtube.com/embed/${repriseAtiva.videoId}?playsinline=1&modestbranding=1&rel=0${
    autoplayReprise ? '&autoplay=1' : ''
  }`;

  return (
    <div className="w-full bg-[#0A0A0A] text-white border border-[#C41E3A] rounded-[16px] overflow-hidden shadow-[0_12px_35px_rgba(196,30,58,0.18)]">
      {/* 1. ÁREA DE VÍDEO DE REPRISE DE JOGOS ANTERIORES (w-full h-[210px]) */}
      <div className="relative w-full h-[210px] rounded-t-[16px] overflow-hidden bg-black border-b border-[#C41E3A]">
        {/* Aviso fixo no topo informando claramente que é REPRISE de determinado jogo */}
        <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex flex-wrap items-center justify-between gap-1.5 pointer-events-none">
          <span className="bg-amber-500 text-black text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-lg flex items-center gap-1">
            <span>📼</span>
            <span>REPRISE: {repriseAtiva.timeCasa} x {repriseAtiva.timeFora}</span>
          </span>
          <span className="bg-black/90 border border-[#C41E3A] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
            {repriseAtiva.canal}
          </span>
        </div>

        {assistindoReprise ? (
          <iframe
            key={`${repriseAtiva.id}_${autoplayReprise ? 'play' : 'init'}`}
            src={youtubeEmbedSrc}
            title={repriseAtiva.descricaoReprise}
            className="w-full h-[210px] border-0 block bg-black"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <div className="w-full h-[210px] flex flex-col items-center justify-center p-4 text-center space-y-2 bg-black">
            <span className="text-2xl">📼</span>
            <div className="text-xs sm:text-sm font-black uppercase text-white">
              Reprise Pausada
            </div>
            <button
              type="button"
              onClick={() => {
                setAssistindoReprise(true);
                setAutoplayReprise(true);
              }}
              className="bg-[#C41E3A] hover:bg-[#a81830] text-white text-xs font-black px-4 py-2 rounded-xl cursor-pointer transition"
            >
              ▶️ Assistir Reprise: {repriseAtiva.timeCasa} x {repriseAtiva.timeFora}
            </button>
          </div>
        )}
      </div>

      {/* FAIXA DE AVISO CLARO DE REPRISE DO JOGO SELECIONADO */}
      <div className="bg-amber-500/15 border-b border-amber-500/40 px-3.5 py-2 flex items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-amber-400 font-black shrink-0">📼 AVISO:</span>
          <span className="text-amber-200 font-bold truncate">
            {repriseAtiva.descricaoReprise}
          </span>
        </div>
        <span className="text-[10px] font-mono font-extrabold text-amber-300 shrink-0">
          Placar Final: {repriseAtiva.placarCasa}x{repriseAtiva.placarFora}
        </span>
      </div>

      {/* CONTEÚDO INTERNO DO CARD */}
      <div className="p-4 space-y-4">
        {/* 2. SELETOR DE REPRISES DE JOGOS ANTERIORES (CANAIS DO YOUTUBE QUE REALMENTE PASSAM) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-white">
              📼 Assistir Reprise de Jogos Anteriores (YouTube)
            </span>
            <span className="text-[10px] font-bold text-amber-400">
              Jogos Completos
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {REPRISES_YOUTUBE.map((rep) => {
              const ativo = repriseAtiva.id === rep.id && assistindoReprise;
              return (
                <button
                  key={rep.id}
                  type="button"
                  onClick={() => selecionarReprise(rep)}
                  className={`w-full p-2.5 rounded-xl text-left border transition-all duration-200 cursor-pointer flex flex-col gap-0.5 ${
                    ativo
                      ? 'bg-[#C41E3A] text-white border-[#C41E3A] shadow-[0_0_15px_rgba(196,30,58,0.45)]'
                      : 'bg-[#111111] hover:bg-[#C41E3A]/20 text-white border-[#222222] hover:border-[#C41E3A]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                      ▶️ Reprise • {rep.canal.replace(' (YouTube)', '')}
                    </span>
                    <span className="text-[10px] font-mono font-black bg-black/50 px-1.5 py-0.5 rounded">
                      {rep.placarCasa}x{rep.placarFora}
                    </span>
                  </div>
                  <div className="text-xs font-extrabold text-white truncate">
                    {rep.timeCasa} x {rep.timeFora}
                  </div>
                  <div className="text-[10px] text-white/75 truncate">
                    {rep.campeonato}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. PAINEL ESPN BRASILEIRÃO SÉRIE A (TEMPO REAL PELO HORÁRIO DO JOGO OU "SEM JOGOS NO MOMENTO") */}
        <div className="bg-[#111111] border border-[#222222] rounded-[16px] p-3.5 text-center space-y-2.5">
          <div className="flex items-center justify-between border-b border-[#222222] pb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-300">
              ⚽ Placar em Tempo Real • Brasileirão Série A (ESPN)
            </span>
            <button
              type="button"
              onClick={() => carregarJogosEspn()}
              className="text-[10px] font-bold text-[#C41E3A] hover:underline cursor-pointer"
            >
              🔄 Atualizar {ultimaSincronizacao ? `(${ultimaSincronizacao})` : ''}
            </button>
          </div>

          {carregandoEspn ? (
            <div className="py-3 text-xs text-zinc-400 font-bold">
              Consultando jogos do Brasileirão Série A na ESPN...
            </div>
          ) : jogoEspnAtual ? (
            <>
              <div className="flex items-center justify-between gap-2 pt-1">
                {/* Esquerda: escudo + nome do time da casa */}
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

                {/* Centro: Placar real da ESPN */}
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

                {/* Direita: escudo + nome do time visitante */}
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
            <div className="py-3 px-2 space-y-1.5">
              <div className="text-xs sm:text-sm font-black uppercase text-white">
                ⚽ Sem jogos no momento no Brasileirão Série A
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Nenhuma partida está acontecendo agora na ESPN. Enquanto isso, você pode assistir acima às reprises completas de jogos anteriores! Quando um jogo iniciar, o placar mudará automaticamente aqui de acordo com o horário do jogo.
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
              {jogoEspnAtual ? `Jogo das ${jogoEspnAtual.horario}` : 'Jogos da Rodada'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* Opção 1: Time Casa Ganha */}
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
                {timeCasaAposta}
              </span>
              <span className="text-[9px] uppercase font-bold opacity-85">
                Ganha
              </span>
            </button>

            {/* Opção X: Empate */}
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

            {/* Opção 2: Time Fora Ganha */}
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
                {timeForaAposta}
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
                ? `Vitória do ${timeCasaAposta}`
                : escolhaVencedor === 'FORA'
                ? `Vitória do ${timeForaAposta}`
                : `Empate (${timeCasaAposta} x ${timeForaAposta})`}
              !
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BolaoLiveCard;
