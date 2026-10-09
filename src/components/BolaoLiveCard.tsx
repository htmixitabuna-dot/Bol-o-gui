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

export const CANAIS: any[] = [];

function converterHorarioParaMinutos(horarioStr: string): number {
  const match = String(horarioStr || '').match(/(\d{1,2}):(\d{2})/);
  if (!match) return 9999;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function BolaoLiveCard({ onConfirmarPalpite }: BolaoLiveCardProps) {
  const [jogosAtivos, setJogosAtivos] = useState<JogoEspnItem[]>([]);
  const [proximosJogosHoje, setProximosJogosHoje] = useState<JogoEspnItem[]>([]);
  const [indiceJogoAtual, setIndiceJogoAtual] = useState<number>(0);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [ultimaSincronizacao, setUltimaSincronizacao] = useState<string>('');

  const [escolhaVencedor, setEscolhaVencedor] = useState<'CASA' | 'EMPATE' | 'FORA'>('CASA');
  const [apostaConfirmada, setApostaConfirmada] = useState<boolean>(false);

  const [erroEscudoCasa, setErroEscudoCasa] = useState<boolean>(false);
  const [erroEscudoFora, setErroEscudoFora] = useState<boolean>(false);

  const carregarJogosEspn = useCallback(async () => {
    try {
      const hojeIso = getHojeBrasilISO();
      const lista = await buscarJogosRodadaEspn(hojeIso);
      const todosHoje: JogoEspnItem[] = Array.isArray(lista) ? lista : [];

      // Ordena pelo horário do jogo
      todosHoje.sort(
        (a, b) =>
          converterHorarioParaMinutos(a.horario) -
          converterHorarioParaMinutos(b.horario)
      );

      const brAgora = toBrasilDateAndTime(new Date());
      const minutosAgora = converterHorarioParaMinutos(brAgora.timeStr);

      // Filtra jogos que estão acontecendo agora na ESPN (estado 'in' / aoVivo,
      // ou cujo horário já chegou e ainda não encerraram)
      const emAndamento = todosHoje.filter((j) => {
        if (j.aoVivo || j.estadoPartida === 'in') return true;
        if (j.encerrado || j.estadoPartida === 'post') return false;
        const minJogo = converterHorarioParaMinutos(j.horario);
        return minutosAgora >= minJogo && minutosAgora <= minJogo + 135;
      });

      const agendados = todosHoje.filter(
        (j) => !j.aoVivo && !j.encerrado && converterHorarioParaMinutos(j.horario) > minutosAgora
      );

      setJogosAtivos(emAndamento);
      setProximosJogosHoje(agendados);

      // Seleciona automaticamente o jogo mais próximo do horário atual
      if (emAndamento.length > 0) {
        let melhorIndice = 0;
        let menorDiferenca = Infinity;
        emAndamento.forEach((jg, idx) => {
          const diff = Math.abs(minutosAgora - converterHorarioParaMinutos(jg.horario));
          if (diff <= menorDiferenca) {
            menorDiferenca = diff;
            melhorIndice = idx;
          }
        });
        setIndiceJogoAtual((prev) =>
          prev < emAndamento.length ? prev : melhorIndice
        );
      } else {
        setIndiceJogoAtual(0);
      }

      setUltimaSincronizacao(
        new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    } catch {
      setJogosAtivos([]);
      setProximosJogosHoje([]);
    } finally {
      setCarregando(false);
    }
  }, []);

  // Busca na ESPN ao abrir e atualiza automaticamente a cada 30 segundos
  useEffect(() => {
    carregarJogosEspn();
    const interval = window.setInterval(() => {
      carregarJogosEspn();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [carregarJogosEspn]);

  // Se houver mais de um jogo acontecendo simultaneamente no mesmo horário,
  // alterna suavemente entre os jogos em andamento a cada 20 segundos
  useEffect(() => {
    if (jogosAtivos.length <= 1) return;
    const rotacao = window.setInterval(() => {
      setIndiceJogoAtual((prev) => (prev + 1) % jogosAtivos.length);
      setErroEscudoCasa(false);
      setErroEscudoFora(false);
      setApostaConfirmada(false);
    }, 20000);
    return () => window.clearInterval(rotacao);
  }, [jogosAtivos.length]);

  const jogoAtual: JogoEspnItem | null =
    jogosAtivos.length > 0
      ? jogosAtivos[indiceJogoAtual % jogosAtivos.length]
      : null;

  const siglaTime = (nome: string) =>
    (nome || '').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'FC';

  const handleApostarAgora = () => {
    if (!jogoAtual) return;
    setApostaConfirmada(true);

    const golsCasaNum = escolhaVencedor === 'CASA' ? 1 : 0;
    const golsForaNum = escolhaVencedor === 'FORA' ? 1 : 0;

    const dadosPalpite: DadosPalpiteLive = {
      timeCasa: jogoAtual.time_casa || jogoAtual.casa,
      timeFora: jogoAtual.time_fora || jogoAtual.fora,
      golsCasa: golsCasaNum,
      golsFora: golsForaNum,
      placarPalpite:
        escolhaVencedor === 'CASA'
          ? `Vitória ${jogoAtual.time_casa || jogoAtual.casa}`
          : escolhaVencedor === 'FORA'
          ? `Vitória ${jogoAtual.time_fora || jogoAtual.fora}`
          : 'Empate',
      escolha: escolhaVencedor,
      valor: 10,
      canal: 'ESPN Brasileirão Série A',
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
      {/* 1. PAINEL SUPERIOR DO JOGO (w-full h-[210px]) - SEM TARJA AO VIVO FALSA */}
      <div className="relative w-full h-[210px] rounded-t-[16px] overflow-hidden bg-black border-b border-[#C41E3A] select-none flex flex-col justify-between p-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(196,30,58,0.16)_0%,rgba(10,10,10,0.96)_75%)] pointer-events-none" />

        {/* Topo Informativo ESPN */}
        <div className="relative z-10 flex items-center justify-between gap-2">
          <span className="bg-[#111111] border border-[#222222] text-zinc-200 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
            ⚽ Brasileirão Série A • ESPN
          </span>
          <button
            type="button"
            onClick={() => carregarJogosEspn()}
            className="bg-[#111111] hover:bg-zinc-800 border border-[#222222] text-zinc-300 text-[10px] font-bold px-2.5 py-1 rounded-full cursor-pointer transition"
          >
            🔄 Atualizar {ultimaSincronizacao ? `(${ultimaSincronizacao})` : ''}
          </button>
        </div>

        {/* Conteúdo Central: Jogo acontecendo na ESPN ou Mensagem "Sem jogos no momento" */}
        {carregando ? (
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center space-y-2">
            <div className="text-xs font-extrabold uppercase tracking-wider text-zinc-300">
              Consultando jogos na ESPN...
            </div>
            <p className="text-[11px] text-zinc-500">
              Verificando partidas do Brasileirão Série A em andamento
            </p>
          </div>
        ) : !jogoAtual ? (
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-3 space-y-2">
            <div className="w-11 h-11 rounded-full bg-[#111111] border border-[#222222] flex items-center justify-center text-lg">
              ⚽
            </div>
            <div className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
              Sem jogos no momento
            </div>
            <p className="text-[11px] text-zinc-400 max-w-xs leading-relaxed">
              Nenhuma partida do Brasileirão Série A está acontecendo agora na ESPN. O painel atualiza sozinho conforme o horário dos jogos.
            </p>
            {proximosJogosHoje.length > 0 && (
              <div className="text-[10px] text-[#C41E3A] font-bold bg-[#111111] border border-[#222222] px-3 py-1 rounded-full">
                Próximo jogo hoje às {proximosJogosHoje[0].horario}:{' '}
                {proximosJogosHoje[0].time_casa} x {proximosJogosHoje[0].time_fora}
              </div>
            )}
          </div>
        ) : (
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center">
            <div className="flex items-center justify-center gap-6 sm:gap-8">
              {/* Time Casa */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-14 h-14 rounded-full bg-[#111111] border border-[#222222] p-2 flex items-center justify-center shadow-lg">
                  {!erroEscudoCasa && jogoAtual.escudoCasaUrl ? (
                    <img
                      src={jogoAtual.escudoCasaUrl}
                      alt={jogoAtual.time_casa}
                      onError={() => setErroEscudoCasa(true)}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-xs font-black text-white">
                      {siglaTime(jogoAtual.time_casa)}
                    </span>
                  )}
                </div>
                <span className="text-xs font-black uppercase text-white truncate max-w-[110px]">
                  {jogoAtual.time_casa}
                </span>
              </div>

              {/* Horário / Tempo na ESPN */}
              <div className="flex flex-col items-center justify-center">
                <span className="text-xs font-black text-[#C41E3A] uppercase tracking-widest">
                  VS
                </span>
                <span className="mt-1 text-[10px] font-mono font-bold text-zinc-300 bg-[#111111] border border-[#222222] px-2.5 py-0.5 rounded-full">
                  {jogoAtual.tempoJogo || jogoAtual.status || `Horário: ${jogoAtual.horario}`}
                </span>
              </div>

              {/* Time Fora */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-14 h-14 rounded-full bg-[#111111] border border-[#222222] p-2 flex items-center justify-center shadow-lg">
                  {!erroEscudoFora && jogoAtual.escudoForaUrl ? (
                    <img
                      src={jogoAtual.escudoForaUrl}
                      alt={jogoAtual.time_fora}
                      onError={() => setErroEscudoFora(true)}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-xs font-black text-white">
                      {siglaTime(jogoAtual.time_fora)}
                    </span>
                  )}
                </div>
                <span className="text-xs font-black uppercase text-white truncate max-w-[110px]">
                  {jogoAtual.time_fora}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Rodapé da Área Superior */}
        <div className="relative z-10 flex items-center justify-between text-[10px] text-zinc-400 border-t border-white/10 pt-2">
          <span className="truncate">
            {jogoAtual
              ? `🏟️ ${jogoAtual.estadio} • Horário: ${jogoAtual.horario}`
              : 'Sincronizado em tempo real com a ESPN'}
          </span>
          {jogosAtivos.length > 1 && (
            <span className="text-white font-bold shrink-0 ml-2">
              Jogo {(indiceJogoAtual % jogosAtivos.length) + 1}/{jogosAtivos.length}
            </span>
          )}
        </div>
      </div>

      {/* CONTEÚDO INTERNO DO CARD */}
      <div className="p-4 space-y-4">
        {/* 2. PLACAR VIA ESPN ABAIXO DO PAINEL (Fundo #111 com borda #222) */}
        {jogoAtual ? (
          <div className="bg-[#111111] border border-[#222222] rounded-[16px] p-3.5 text-center space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              {/* Esquerda: escudo + nome do time da casa */}
              <div className="flex flex-col items-center flex-1 min-w-0">
                <div className="w-12 h-12 rounded-full bg-zinc-950 border border-[#222222] p-1.5 flex items-center justify-center shadow-md">
                  {!erroEscudoCasa && jogoAtual.escudoCasaUrl ? (
                    <img
                      src={jogoAtual.escudoCasaUrl}
                      alt={jogoAtual.time_casa}
                      onError={() => setErroEscudoCasa(true)}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-xs font-black text-white">
                      {siglaTime(jogoAtual.time_casa)}
                    </span>
                  )}
                </div>
                <span className="mt-1.5 text-xs sm:text-sm font-extrabold text-white truncate max-w-full">
                  {jogoAtual.time_casa}
                </span>
              </div>

              {/* Centro: Placar real da ESPN */}
              <div className="flex flex-col items-center shrink-0 px-2">
                <div className="bg-[#C41E3A] text-white font-black text-xl sm:text-2xl px-4 py-1.5 rounded-xl tracking-widest shadow-md font-mono">
                  {jogoAtual.placar_casa ?? 0} - {jogoAtual.placar_fora ?? 0}
                </div>
                <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider mt-1">
                  {jogoAtual.tempoJogo || jogoAtual.status || `Horário ${jogoAtual.horario}`}
                </span>
              </div>

              {/* Direita: escudo + nome do time visitante */}
              <div className="flex flex-col items-center flex-1 min-w-0">
                <div className="w-12 h-12 rounded-full bg-zinc-950 border border-[#222222] p-1.5 flex items-center justify-center shadow-md">
                  {!erroEscudoFora && jogoAtual.escudoForaUrl ? (
                    <img
                      src={jogoAtual.escudoForaUrl}
                      alt={jogoAtual.time_fora}
                      onError={() => setErroEscudoFora(true)}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-xs font-black text-white">
                      {siglaTime(jogoAtual.time_fora)}
                    </span>
                  )}
                </div>
                <span className="mt-1.5 text-xs sm:text-sm font-extrabold text-white truncate max-w-full">
                  {jogoAtual.time_fora}
                </span>
              </div>
            </div>

            <p className="text-[11px] sm:text-xs text-white/90 font-semibold border-t border-[#222222] pt-2">
              Brasileirão Série A • {jogoAtual.estadio} • {jogoAtual.horario}
            </p>
          </div>
        ) : (
          <div className="bg-[#111111] border border-[#222222] rounded-[16px] p-4 text-center space-y-1.5">
            <div className="text-xs sm:text-sm font-black uppercase text-zinc-200">
              Sem jogos no momento
            </div>
            <p className="text-[11px] text-zinc-400">
              Assim que uma partida do Brasileirão Série A iniciar na ESPN, o confronto e o placar aparecerão automaticamente aqui de acordo com o horário do jogo.
            </p>
          </div>
        )}

        {/* Se houver mais de um jogo em andamento na ESPN, permite alternar entre eles */}
        {jogosAtivos.length > 1 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-white">
                ⚽ Jogos em Andamento na ESPN ({jogosAtivos.length})
              </span>
              <span className="text-[10px] font-bold text-white/70">
                Muda de acordo com o horário
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {jogosAtivos.map((jg, idx) => {
                const ativo = idx === indiceJogoAtual % jogosAtivos.length;
                return (
                  <button
                    key={jg.id}
                    type="button"
                    onClick={() => {
                      setIndiceJogoAtual(idx);
                      setErroEscudoCasa(false);
                      setErroEscudoFora(false);
                      setApostaConfirmada(false);
                    }}
                    className={`w-full py-2 px-2.5 rounded-xl text-[11px] font-bold border border-[#C41E3A] transition cursor-pointer truncate ${
                      ativo
                        ? 'bg-[#C41E3A] text-white'
                        : 'bg-[#0A0A0A] hover:bg-[#C41E3A]/20 text-white'
                    }`}
                  >
                    {jg.time_casa} {jg.placar_casa}x{jg.placar_fora} {jg.time_fora} ({jg.horario})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. QUEM GANHA? APOSTE AGORA */}
        <div className="bg-[#111111] border border-[#C41E3A] rounded-[16px] p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-white flex items-center gap-1.5">
              <span>🔥</span>
              <span>Quem Ganha? Aposte Agora</span>
            </span>
            <span className="text-[10px] font-bold text-[#C41E3A] uppercase tracking-wider">
              {jogoAtual ? `${jogoAtual.horario}` : 'Aguardando Jogo'}
            </span>
          </div>

          {jogoAtual ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                {/* Opção 1: Time Casa Ganha */}
                <button
                  type="button"
                  onClick={() => {
                    setEscolhaVencedor('CASA');
                    setApostaConfirmada(false);
                  }}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                    escolhaVencedor === 'CASA'
                      ? 'bg-[#C41E3A] text-white border-[#C41E3A] shadow-[0_0_15px_rgba(196,30,58,0.45)] scale-[1.02]'
                      : 'bg-[#0A0A0A] hover:bg-[#C41E3A]/15 text-white border-[#222222] hover:border-[#C41E3A]/60'
                  }`}
                >
                  <span className="text-[11px] font-black truncate max-w-full">
                    {jogoAtual.time_casa}
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
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
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
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                    escolhaVencedor === 'FORA'
                      ? 'bg-[#C41E3A] text-white border-[#C41E3A] shadow-[0_0_15px_rgba(196,30,58,0.45)] scale-[1.02]'
                      : 'bg-[#0A0A0A] hover:bg-[#C41E3A]/15 text-white border-[#222222] hover:border-[#C41E3A]/60'
                  }`}
                >
                  <span className="text-[11px] font-black truncate max-w-full">
                    {jogoAtual.time_fora}
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
                    ? `Vitória do ${jogoAtual.time_casa}`
                    : escolhaVencedor === 'FORA'
                    ? `Vitória do ${jogoAtual.time_fora}`
                    : `Empate (${jogoAtual.time_casa} x ${jogoAtual.time_fora})`}
                  !
                </div>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('secao-jogos-rodada');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="w-full bg-[#C41E3A] hover:bg-[#a81830] active:scale-[0.99] text-white font-black py-3.5 px-4 rounded-xl text-sm uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(196,30,58,0.4)] border border-[#C41E3A]"
            >
              <span>⚡</span>
              <span>Quem Ganha? Aposte Agora</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default BolaoLiveCard;
