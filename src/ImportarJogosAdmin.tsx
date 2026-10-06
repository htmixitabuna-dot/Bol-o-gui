import React, { useState, useEffect } from 'react';
import {
  db,
  collection,
  onSnapshot,
  upsertJogoInDb,
  deleteJogoFromDb,
  upsertJogoDisponivelInDb,
  deleteJogoDisponivelFromDb,
  JogoDisponivelItem,
} from './firebase';
import { TIMES_PADRAO, getEscudoPadrao, Jogo } from './App';

const getHojeISO = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const gerarUuidSimples = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/[^a-zA-Z0-9_-]/g, '_');
  }
  return `jd_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
};

const SUGESTOES_SERIE_A_PADRAO: Array<{
  time_casa: string;
  time_fora: string;
  campeonato: string;
  horario: string;
}> = [
  { time_casa: 'Flamengo', time_fora: 'Palmeiras', campeonato: 'Brasileirão Série A', horario: '16:00' },
  { time_casa: 'Corinthians', time_fora: 'São Paulo', campeonato: 'Brasileirão Série A', horario: '16:00' },
  { time_casa: 'Bahia', time_fora: 'Vitória', campeonato: 'Brasileirão Série A', horario: '18:30' },
  { time_casa: 'Atlético-MG', time_fora: 'Cruzeiro', campeonato: 'Brasileirão Série A', horario: '18:30' },
  { time_casa: 'Grêmio', time_fora: 'Internacional', campeonato: 'Brasileirão Série A', horario: '18:30' },
  { time_casa: 'Botafogo', time_fora: 'Fluminense', campeonato: 'Brasileirão Série A', horario: '20:00' },
  { time_casa: 'Vasco da Gama', time_fora: 'Santos', campeonato: 'Brasileirão Série A', horario: '20:00' },
  { time_casa: 'Fortaleza', time_fora: 'Ceará', campeonato: 'Brasileirão Série A', horario: '21:30' },
];

interface JogoSugeridoCard extends JogoDisponivelItem {
  escudoCasaUrl?: string;
  escudoForaUrl?: string;
  origem?: 'thesportsdb' | 'football-data' | 'banco' | 'sugestao';
}

function EscudoTime({ nome, badgeUrl, size = 36 }: { nome: string; badgeUrl?: string; size?: number }) {
  const padrao = getEscudoPadrao(nome);
  const src = padrao || badgeUrl || '';

  if (!src) {
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-[#FF6B00] text-black font-black text-[10px] rounded-full flex items-center justify-center shrink-0 shadow select-none"
      >
        {(nome || 'TIM').substring(0, 3).toUpperCase()}
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className="bg-white rounded-full p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-sm border border-zinc-200/30"
    >
      <img
        src={src}
        alt={nome}
        className="w-full h-full object-contain"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          if (e.currentTarget.parentElement) {
            e.currentTarget.parentElement.className =
              'bg-[#FF6B00] text-black font-black text-[10px] rounded-full flex items-center justify-center shrink-0 shadow';
            e.currentTarget.parentElement.innerHTML = (nome || 'TIM').substring(0, 3).toUpperCase();
          }
        }}
      />
    </div>
  );
}

class ImportarJogosErrorBoundary extends React.Component<
  { children: React.ReactNode; onVoltar: () => void },
  { hasError: boolean; errorMsg: string }
> {
  constructor(props: { children: React.ReactNode; onVoltar: () => void }) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      errorMsg: error instanceof Error ? error.message : 'Erro inesperado na tela de importação.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center space-y-4">
            <div className="text-3xl">⚠️</div>
            <h2 className="text-lg font-black text-white">Modo Seguro Ativado</h2>
            <p className="text-xs text-zinc-400">
              Ocorreu um erro isolado nesta página, mas o Bolão principal continua funcionando normalmente.
            </p>
            <button
              type="button"
              onClick={this.props.onVoltar}
              className="w-full bg-[#FF6B00] text-black font-black py-3 rounded-xl text-xs uppercase cursor-pointer"
            >
              ← Voltar ao Bolão Principal
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ImportarJogosContent({ onVoltar }: { onVoltar: () => void }) {
  const [aba, setAba] = useState<'sugeridos' | 'manual'>('sugeridos');
  const [dataFiltro, setDataFiltro] = useState<string>(getHojeISO);
  const [carregandoApi, setCarregandoApi] = useState<boolean>(false);
  const [jogosApi, setJogosApi] = useState<JogoSugeridoCard[]>([]);
  const [jogosDisponiveisDb, setJogosDisponiveisDb] = useState<JogoDisponivelItem[]>([]);
  const [jogosBolaoAtivos, setJogosBolaoAtivos] = useState<Jogo[]>([]);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [erroApiMsg, setErroApiMsg] = useState<string>('');
  const [adicionandoId, setAdicionandoId] = useState<string>('');

  // Opcional: Token Football-Data.org caso o ADM queira usar
  const [mostrarConfigToken, setMostrarConfigToken] = useState<boolean>(false);
  const [footballDataToken, setFootballDataToken] = useState<string>(() => {
    try {
      return localStorage.getItem('elite_fd_token_v1') || '';
    } catch {
      return '';
    }
  });

  // ABA 2: Adicionar Manual Rápido (2 campos principais: Casa x Fora + Horário opcional)
  const [manualCasa, setManualCasa] = useState<string>('Flamengo');
  const [manualFora, setManualFora] = useState<string>('Palmeiras');
  const [manualHorario, setManualHorario] = useState<string>('16:00');
  const [manualCampeonato, setManualCampeonato] = useState<string>('Brasileirão Série A');

  // Lote rápido de 4 jogos (fallback / atalho rápido)
  const [loteRapido, setLoteRapido] = useState<
    Array<{ casa: string; fora: string; horario: string; campeonato: string }>
  >([
    { casa: '', fora: '', horario: '16:00', campeonato: 'Brasileirão Série A' },
    { casa: '', fora: '', horario: '18:30', campeonato: 'Brasileirão Série A' },
    { casa: '', fora: '', horario: '20:00', campeonato: 'Brasileirão Série A' },
    { casa: '', fora: '', horario: '21:30', campeonato: 'Brasileirão Série A' },
  ]);

  const mostrarFeedback = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 4000);
  };

  // Escuta a tabela existente 'jogos' e a tabela nova 'jogos_disponiveis'
  useEffect(() => {
    const unsubJogos = onSnapshot(
      collection(db, 'jogos'),
      (snap) => {
        const lista: Jogo[] = [];
        snap.forEach((docSnap) => {
          lista.push(docSnap.data() as Jogo);
        });
        lista.sort((a, b) => String(a.id).localeCompare(String(b.id)));
        setJogosBolaoAtivos(lista);
        try {
          localStorage.setItem('elite_jogos_v11', JSON.stringify(lista));
        } catch {
          // ignore storage errors
        }
      },
      () => {
        // Fallback localStorage se offline
        try {
          const local = localStorage.getItem('elite_jogos_v11');
          if (local) setJogosBolaoAtivos(JSON.parse(local));
        } catch {
          // ignore
        }
      }
    );

    const unsubDisponiveis = onSnapshot(
      collection(db, 'jogos_disponiveis'),
      (snap) => {
        const lista: JogoDisponivelItem[] = [];
        snap.forEach((docSnap) => {
          lista.push(docSnap.data() as JogoDisponivelItem);
        });
        setJogosDisponiveisDb(lista);
      },
      () => {}
    );

    return () => {
      unsubJogos();
      unsubDisponiveis();
    };
  }, []);

  // Busca jogos sugeridos do dia (TheSportsDB 100% grátis sem key + Football-Data opcional)
  const buscarJogosDoDia = async (dataAlvo: string) => {
    setCarregandoApi(true);
    setErroApiMsg('');
    const encontrados: JogoSugeridoCard[] = [];

    try {
      // 1. Tenta TheSportsDB (100% grátis, sem API key)
      const urlsSportsDb = [
        `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${encodeURIComponent(dataAlvo)}&s=Soccer`,
        `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${encodeURIComponent(dataAlvo)}`,
      ];

      for (const url of urlsSportsDb) {
        try {
          const resp = await fetch(url);
          if (resp.ok) {
            const data = await resp.json();
            const events = Array.isArray(data?.events) ? data.events : [];
            for (const ev of events) {
              const sport = String(ev?.strSport || '').toLowerCase();
              if (sport && sport !== 'soccer' && sport !== 'football') continue;
              const casa = String(ev?.strHomeTeam || '').trim();
              const fora = String(ev?.strAwayTeam || '').trim();
              if (!casa || !fora) continue;
              const idEv = `tsdb_${ev?.idEvent || `${casa}_${fora}_${dataAlvo}`}`.replace(/[^a-zA-Z0-9_-]/g, '_');
              if (encontrados.some((x) => x.id === idEv)) continue;

              const horarioRaw = String(ev?.strTimeLocal || ev?.strTime || '16:00').slice(0, 5);
              encontrados.push({
                id: idEv,
                time_casa: casa,
                time_fora: fora,
                campeonato: String(ev?.strLeague || 'Futebol Internacional').trim(),
                horario: horarioRaw || '16:00',
                data: String(ev?.dateEvent || dataAlvo),
                adicionado_ao_bolao: false,
                escudoCasaUrl: ev?.strHomeTeamBadge || getEscudoPadrao(casa),
                escudoForaUrl: ev?.strAwayTeamBadge || getEscudoPadrao(fora),
                origem: 'thesportsdb',
              });
            }
          }
        } catch {
          // Continua silenciosamente para próxima fonte
        }
      }

      // 2. Se houver token do football-data.org configurado, tenta buscar também
      if (footballDataToken.trim()) {
        try {
          const fdResp = await fetch(
            `https://api.football-data.org/v4/matches?dateFrom=${encodeURIComponent(dataAlvo)}&dateTo=${encodeURIComponent(dataAlvo)}`,
            {
              headers: {
                'X-Auth-Token': footballDataToken.trim(),
              },
            }
          );
          if (fdResp.ok) {
            const fdData = await fdResp.json();
            const matches = Array.isArray(fdData?.matches) ? fdData.matches : [];
            for (const m of matches) {
              const casa = String(m?.homeTeam?.shortName || m?.homeTeam?.name || '').trim();
              const fora = String(m?.awayTeam?.shortName || m?.awayTeam?.name || '').trim();
              if (!casa || !fora) continue;
              const idFd = `fd_${m?.id || `${casa}_${fora}_${dataAlvo}`}`.replace(/[^a-zA-Z0-9_-]/g, '_');
              if (encontrados.some((x) => x.id === idFd)) continue;

              let horarioFd = '16:00';
              if (m?.utcDate) {
                const dt = new Date(m.utcDate);
                if (!isNaN(dt.getTime())) {
                  horarioFd = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                }
              }

              encontrados.push({
                id: idFd,
                time_casa: casa,
                time_fora: fora,
                campeonato: String(m?.competition?.name || 'Campeonato').trim(),
                horario: horarioFd,
                data: dataAlvo,
                adicionado_ao_bolao: false,
                escudoCasaUrl: m?.homeTeam?.crest || getEscudoPadrao(casa),
                escudoForaUrl: m?.awayTeam?.crest || getEscudoPadrao(fora),
                origem: 'football-data',
              });
            }
          }
        } catch {
          // Continua com os jogos já carregados
        }
      }

      setJogosApi(encontrados);

      // Salva/sincroniza na tabela nova 'jogos_disponiveis' sem bloquear a UI
      for (const item of encontrados.slice(0, 25)) {
        const jaExiste = jogosDisponiveisDb.find((d) => d.id === item.id);
        if (!jaExiste) {
          upsertJogoDisponivelInDb({
            id: item.id,
            time_casa: item.time_casa,
            time_fora: item.time_fora,
            campeonato: item.campeonato,
            horario: item.horario,
            data: item.data,
            adicionado_ao_bolao: false,
          }).catch(() => {});
        }
      }
    } catch {
      setErroApiMsg('A busca externa falhou no momento. Use as sugestões abaixo ou a aba Adicionar Manual Rápido.');
    } finally {
      setCarregandoApi(false);
    }
  };

  useEffect(() => {
    buscarJogosDoDia(dataFiltro);
  }, [dataFiltro]);

  // Verifica se um jogo já está na tabela existente 'jogos' do bolão
  const jaEstaNoBolao = (casa: string, fora: string, itemId?: string): boolean => {
    const cNorm = casa.trim().toLowerCase();
    const fNorm = fora.trim().toLowerCase();
    const inJogos = jogosBolaoAtivos.some(
      (j) => j.casa.trim().toLowerCase() === cNorm && j.fora.trim().toLowerCase() === fNorm
    );
    if (inJogos) return true;
    if (itemId) {
      const inDisp = jogosDisponiveisDb.find((d) => d.id === itemId);
      if (inDisp?.adicionado_ao_bolao) return true;
    }
    return false;
  };

  // AÇÃO PRINCIPAL: 1 Clique -> Faz INSERT na tabela EXISTENTE 'jogos' (sem criar colunas novas)
  // e marca adicionado_ao_bolao = true na tabela nova 'jogos_disponiveis'
  const adicionarJogoAoBolao = async (params: {
    id?: string;
    time_casa: string;
    time_fora: string;
    campeonato?: string;
    horario?: string;
    data?: string;
    escudoCasaUrl?: string;
    escudoForaUrl?: string;
  }) => {
    const casaLimpo = params.time_casa.trim();
    const foraLimpo = params.time_fora.trim();

    if (!casaLimpo || !foraLimpo) {
      mostrarFeedback('⚠️ Informe o Time Casa e o Time Fora!');
      return;
    }
    if (casaLimpo.toLowerCase() === foraLimpo.toLowerCase()) {
      mostrarFeedback('⚠️ Escolha dois times diferentes!');
      return;
    }
    if (jogosBolaoAtivos.length >= 10) {
      mostrarFeedback('⚠️ O bolão já atingiu o limite máximo de 10 confrontos ativos!');
      return;
    }

    const dispId = (params.id || gerarUuidSimples()).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
    setAdicionandoId(dispId);

    try {
      const horarioStr = (params.horario || '16:00').trim();
      const dataStr = (params.data || dataFiltro || getHojeISO()).trim();
      const campeonatoStr = (params.campeonato || 'Brasileirão Série A').trim();

      const escudoCasa = getEscudoPadrao(casaLimpo) || params.escudoCasaUrl || '';
      const escudoFora = getEscudoPadrao(foraLimpo) || params.escudoForaUrl || '';

      // 1. Insere na tabela EXISTENTE 'jogos' usando apenas as colunas que já existem
      const novoJogoId = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const novoJogoBolao: Jogo = {
        id: novoJogoId,
        casa: casaLimpo,
        fora: foraLimpo,
        escudoCasa,
        escudoFora,
        data: horarioStr,
        estadio: campeonatoStr || 'Estádio Principal',
      };

      await upsertJogoInDb(novoJogoBolao);

      // Atualiza também o localStorage para sincronia imediata com a tela principal
      const novaListaJogos = [...jogosBolaoAtivos, novoJogoBolao];
      setJogosBolaoAtivos(novaListaJogos);
      try {
        localStorage.setItem('elite_jogos_v11', JSON.stringify(novaListaJogos));
      } catch {
        // ignore
      }

      // 2. Salva/atualiza na tabela NOVA 'jogos_disponiveis' com adicionado_ao_bolao = true
      await upsertJogoDisponivelInDb({
        id: dispId,
        time_casa: casaLimpo,
        time_fora: foraLimpo,
        campeonato: campeonatoStr,
        horario: horarioStr,
        data: dataStr,
        adicionado_ao_bolao: true,
      }).catch(() => {});

      mostrarFeedback(`✅ ${casaLimpo} x ${foraLimpo} adicionado ao Bolão com 1 clique!`);
    } catch (err) {
      console.error('Erro ao adicionar jogo ao bolão:', err);
      mostrarFeedback('⚠️ Erro ao salvar confronto no banco. Tente novamente.');
    } finally {
      setAdicionandoId('');
    }
  };

  // Monta a lista combinada para a ABA 1 ("Jogos Sugeridos Hoje")
  const sugestoesSerieACards: JogoSugeridoCard[] = SUGESTOES_SERIE_A_PADRAO.map((s, idx) => {
    const idFixo = `seriea_${dataFiltro}_${idx}_${s.time_casa}_${s.time_fora}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    return {
      id: idFixo,
      time_casa: s.time_casa,
      time_fora: s.time_fora,
      campeonato: s.campeonato,
      horario: s.horario,
      data: dataFiltro,
      adicionado_ao_bolao: false,
      escudoCasaUrl: getEscudoPadrao(s.time_casa),
      escudoForaUrl: getEscudoPadrao(s.time_fora),
      origem: 'sugestao',
    };
  });

  const jogosDoBancoHoje: JogoSugeridoCard[] = jogosDisponiveisDb
    .filter((d) => !d.data || d.data === dataFiltro)
    .map((d) => ({
      ...d,
      escudoCasaUrl: getEscudoPadrao(d.time_casa),
      escudoForaUrl: getEscudoPadrao(d.time_fora),
      origem: 'banco',
    }));

  const todosSugeridosMap = new Map<string, JogoSugeridoCard>();
  for (const item of [...jogosApi, ...jogosDoBancoHoje, ...sugestoesSerieACards]) {
    const chave = `${item.time_casa.trim().toLowerCase()}__${item.time_fora.trim().toLowerCase()}`;
    if (!todosSugeridosMap.has(chave)) {
      todosSugeridosMap.set(chave, item);
    }
  }
  const listaSugeridosFinal = Array.from(todosSugeridosMap.values());

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 pb-24">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* TOPO DA PÁGINA ISOLADA */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#FF6B00]/15 border border-[#FF6B00]/40 flex items-center justify-center text-2xl shrink-0">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-[#FF6B00] text-black px-2 py-0.5 rounded">
                  ATALHO ADM • MODO SEGURO
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">/admin/importar-jogos</span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-white mt-0.5">
                Jogos do Dia Clicáveis (1 Clique p/ o Bolão)
              </h1>
              <p className="text-xs text-zinc-400">
                Clique em qualquer jogo abaixo para inserir direto na tabela de confrontos ativos ({jogosBolaoAtivos.length}/10).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onVoltar}
              className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs cursor-pointer transition flex items-center gap-1.5"
            >
              <span>←</span> Voltar ao Site / Painel ADM
            </button>
          </div>
        </div>

        {/* AVISO FLUTUANTE DE FEEDBACK */}
        {statusMsg && (
          <div className="bg-green-950/90 border border-green-500 text-green-200 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-lg">
            <span>{statusMsg}</span>
            <button
              type="button"
              onClick={() => setStatusMsg('')}
              className="text-green-300 hover:text-white ml-3 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* SELETOR DE ABAS (ABA 1 e ABA 2) */}
        <div className="grid grid-cols-2 gap-2 bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800">
          <button
            type="button"
            onClick={() => setAba('sugeridos')}
            className={`py-3 px-4 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 ${
              aba === 'sugeridos'
                ? 'bg-[#FF6B00] text-black shadow-lg shadow-[#FF6B00]/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>📅</span> ABA 1: Jogos Sugeridos Hoje ({listaSugeridosFinal.length})
          </button>

          <button
            type="button"
            onClick={() => setAba('manual')}
            className={`py-3 px-4 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 ${
              aba === 'manual'
                ? 'bg-[#FF6B00] text-black shadow-lg shadow-[#FF6B00]/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>⚡</span> ABA 2: Adicionar Manual Rápido
          </button>
        </div>

        {/* ===================================================================
            ABA 1: JOGOS SUGERIDOS HOJE (TheSportsDB Grátis + Sugestões Série A)
           =================================================================== */}
        {aba === 'sugeridos' && (
          <div className="space-y-4">
            {/* Barra de Data e Atualização */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs font-bold text-zinc-400">Data dos Jogos:</label>
                <input
                  type="date"
                  value={dataFiltro}
                  onChange={(e) => setDataFiltro(e.target.value || getHojeISO())}
                  className="bg-black border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white font-bold outline-none focus:border-[#FF6B00]"
                />
                <button
                  type="button"
                  onClick={() => buscarJogosDoDia(dataFiltro)}
                  disabled={carregandoApi}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer transition"
                >
                  {carregandoApi ? '🔄 Buscando...' : '🔄 Atualizar Jogos de Hoje'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMostrarConfigToken(!mostrarConfigToken)}
                  className="text-[11px] text-zinc-400 hover:text-[#FF6B00] underline cursor-pointer"
                >
                  {mostrarConfigToken ? 'Ocultar Token Football-Data' : '⚙️ Usar Token Football-Data (Opcional)'}
                </button>
              </div>
            </div>

            {mostrarConfigToken && (
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-3.5 space-y-2">
                <div className="text-xs font-bold text-zinc-300">
                  Token Grátis football-data.org (Opcional — TheSportsDB já funciona 100% grátis sem token):
                </div>
                <div className="flex gap-2">
                  <input
                    value={footballDataToken}
                    onChange={(e) => {
                      setFootballDataToken(e.target.value);
                      try {
                        localStorage.setItem('elite_fd_token_v1', e.target.value);
                      } catch {
                        // ignore
                      }
                    }}
                    placeholder="Cole aqui seu X-Auth-Token se desejar..."
                    className="flex-1 bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none focus:border-[#FF6B00]"
                  />
                  <button
                    type="button"
                    onClick={() => buscarJogosDoDia(dataFiltro)}
                    className="bg-[#FF6B00] text-black font-black px-4 py-2 rounded-lg text-xs uppercase cursor-pointer"
                  >
                    Buscar
                  </button>
                </div>
              </div>
            )}

            {erroApiMsg && (
              <div className="bg-amber-950/60 border border-amber-700/80 text-amber-200 p-3 rounded-xl text-xs">
                ℹ️ {erroApiMsg}
              </div>
            )}

            {/* Lista de Jogos Clicáveis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {listaSugeridosFinal.map((item) => {
                const adicionado = jaEstaNoBolao(item.time_casa, item.time_fora, item.id);
                const estaSalvando = adicionandoId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border transition flex flex-col justify-between gap-3 ${
                      adicionado
                        ? 'bg-green-950/20 border-green-700/60'
                        : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 border-b border-zinc-800/80 pb-2">
                      <span className="font-bold text-[#FF6B00] uppercase truncate max-w-[200px]">
                        🏆 {item.campeonato}
                      </span>
                      <span className="bg-black px-2 py-0.5 rounded text-zinc-300 font-mono">
                        ⏰ {item.horario} • {item.data}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 py-1">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <EscudoTime nome={item.time_casa} badgeUrl={item.escudoCasaUrl} size={38} />
                        <span className="font-black text-sm text-white truncate">{item.time_casa}</span>
                      </div>

                      <span className="text-xs font-black text-[#FF6B00] px-1.5">X</span>

                      <div className="flex items-center justify-end gap-2.5 flex-1 min-w-0 text-right">
                        <span className="font-black text-sm text-white truncate">{item.time_fora}</span>
                        <EscudoTime nome={item.time_fora} badgeUrl={item.escudoForaUrl} size={38} />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={adicionado || estaSalvando || jogosBolaoAtivos.length >= 10}
                      onClick={() =>
                        adicionarJogoAoBolao({
                          id: item.id,
                          time_casa: item.time_casa,
                          time_fora: item.time_fora,
                          campeonato: item.campeonato,
                          horario: item.horario,
                          data: item.data,
                          escudoCasaUrl: item.escudoCasaUrl,
                          escudoForaUrl: item.escudoForaUrl,
                        })
                      }
                      className={`w-full py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 ${
                        adicionado
                          ? 'bg-green-600/20 text-green-300 border border-green-600/50 cursor-default'
                          : jogosBolaoAtivos.length >= 10
                          ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                          : 'bg-[#FF6B00] hover:bg-[#ff7b1a] text-black cursor-pointer shadow-md shadow-[#FF6B00]/15'
                      }`}
                    >
                      {adicionado ? (
                        <>
                          <span>✅</span> JÁ ADICIONADO AO BOLÃO
                        </>
                      ) : estaSalvando ? (
                        <span>⏳ ADICIONANDO...</span>
                      ) : (
                        <>
                          <span>➕</span> ADICIONAR AO BOLÃO (1 CLIQUE)
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================================
            ABA 2: ADICIONAR MANUAL RÁPIDO (2 Campos: Casa x Fora + Lote 4 Jogos)
           =================================================================== */}
        {aba === 'manual' && (
          <div className="space-y-5">
            {/* Card Principal: 2 Campos Casa x Fora */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div>
                  <h2 className="text-base font-black text-white">⚡ Adicionar Manual Rápido (Casa x Fora)</h2>
                  <p className="text-xs text-zinc-400">
                    Digite ou clique nos times abaixo para inserir direto na tabela de jogos do bolão.
                  </p>
                </div>
                <span className="text-xs font-bold text-[#FF6B00]">{jogosBolaoAtivos.length}/10 no Bolão</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Campo 1: Time Casa */}
                <div className="bg-black/60 border border-zinc-800 p-3.5 rounded-xl space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <EscudoTime nome={manualCasa} size={40} />
                    <div className="flex-1">
                      <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
                        Time Casa (Mandante)
                      </label>
                      <input
                        value={manualCasa}
                        onChange={(e) => setManualCasa(e.target.value)}
                        placeholder="Ex: Flamengo"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-xs text-white font-bold outline-none focus:border-[#FF6B00]"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto pt-1">
                    {TIMES_PADRAO.map((t) => (
                      <button
                        key={`casa_${t.nome}`}
                        type="button"
                        onClick={() => setManualCasa(t.nome)}
                        className={`text-[10px] px-2 py-1 rounded-md border font-bold cursor-pointer transition ${
                          manualCasa.trim().toLowerCase() === t.nome.toLowerCase()
                            ? 'bg-[#FF6B00] text-black border-[#FF6B00]'
                            : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-600'
                        }`}
                      >
                        {t.nome}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Campo 2: Time Fora */}
                <div className="bg-black/60 border border-zinc-800 p-3.5 rounded-xl space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <EscudoTime nome={manualFora} size={40} />
                    <div className="flex-1">
                      <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
                        Time Fora (Visitante)
                      </label>
                      <input
                        value={manualFora}
                        onChange={(e) => setManualFora(e.target.value)}
                        placeholder="Ex: Palmeiras"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-xs text-white font-bold outline-none focus:border-[#FF6B00]"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto pt-1">
                    {TIMES_PADRAO.map((t) => (
                      <button
                        key={`fora_${t.nome}`}
                        type="button"
                        onClick={() => setManualFora(t.nome)}
                        className={`text-[10px] px-2 py-1 rounded-md border font-bold cursor-pointer transition ${
                          manualFora.trim().toLowerCase() === t.nome.toLowerCase()
                            ? 'bg-[#FF6B00] text-black border-[#FF6B00]'
                            : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-600'
                        }`}
                      >
                        {t.nome}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Horário</label>
                  <input
                    value={manualHorario}
                    onChange={(e) => setManualHorario(e.target.value)}
                    placeholder="Ex: 16:00"
                    className="w-full bg-black border border-zinc-800 rounded-lg p-2.5 text-xs text-white outline-none focus:border-[#FF6B00]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Campeonato / Local</label>
                  <input
                    value={manualCampeonato}
                    onChange={(e) => setManualCampeonato(e.target.value)}
                    placeholder="Ex: Brasileirão Série A"
                    className="w-full bg-black border border-zinc-800 rounded-lg p-2.5 text-xs text-white outline-none focus:border-[#FF6B00]"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  adicionarJogoAoBolao({
                    time_casa: manualCasa,
                    time_fora: manualFora,
                    horario: manualHorario,
                    campeonato: manualCampeonato,
                    data: dataFiltro,
                  })
                }
                disabled={jogosBolaoAtivos.length >= 10}
                className="w-full bg-[#FF6B00] hover:bg-[#ff7b1a] disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-black py-3.5 rounded-xl text-xs sm:text-sm uppercase tracking-wider cursor-pointer transition shadow-lg shadow-[#FF6B00]/20"
              >
                ➕ ADICIONAR AO BOLÃO AGORA
              </button>
            </div>

            {/* Grade de 4 Inputs Simples: Time Casa x Time Fora + Horário */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-black text-white">
                📋 Preenchimento Rápido (4 Confrontos: Time Casa x Time Fora + Horário)
              </h3>
              <div className="space-y-2.5">
                {loteRapido.map((linha, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-black/60 p-2.5 rounded-xl border border-zinc-800"
                  >
                    <input
                      value={linha.casa}
                      onChange={(e) => {
                        const copia = [...loteRapido];
                        copia[idx] = { ...copia[idx], casa: e.target.value };
                        setLoteRapido(copia);
                      }}
                      placeholder={`Jogo ${idx + 1}: Time Casa`}
                      className="sm:col-span-4 bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-white font-bold outline-none focus:border-[#FF6B00]"
                    />
                    <div className="sm:col-span-1 text-center text-xs font-black text-[#FF6B00]">X</div>
                    <input
                      value={linha.fora}
                      onChange={(e) => {
                        const copia = [...loteRapido];
                        copia[idx] = { ...copia[idx], fora: e.target.value };
                        setLoteRapido(copia);
                      }}
                      placeholder={`Jogo ${idx + 1}: Time Fora`}
                      className="sm:col-span-4 bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-white font-bold outline-none focus:border-[#FF6B00]"
                    />
                    <input
                      value={linha.horario}
                      onChange={(e) => {
                        const copia = [...loteRapido];
                        copia[idx] = { ...copia[idx], horario: e.target.value };
                        setLoteRapido(copia);
                      }}
                      placeholder="16:00"
                      className="sm:col-span-1 bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-300 font-mono outline-none focus:border-[#FF6B00]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        adicionarJogoAoBolao({
                          time_casa: linha.casa,
                          time_fora: linha.fora,
                          horario: linha.horario,
                          campeonato: linha.campeonato,
                          data: dataFiltro,
                        });
                      }}
                      className="sm:col-span-2 bg-[#FF6B00] hover:bg-[#ff7b1a] text-black font-black py-2 px-3 rounded-lg text-[11px] uppercase cursor-pointer transition"
                    >
                      + Bolão
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            RESUMO DOS JOGOS ATIVOS NA TABELA EXISTENTE 'jogos' DO BOLÃO
           =================================================================== */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              <h3 className="text-xs font-black uppercase tracking-wider text-white">
                Confrontos Ativos no Bolão ({jogosBolaoAtivos.length}/10)
              </h3>
            </div>
            <span className="text-[11px] text-zinc-400">Tabela existente: jogos</span>
          </div>

          {jogosBolaoAtivos.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-4">
              Nenhum jogo ativo no bolão ainda. Clique em &quot;Adicionar ao Bolão&quot; acima para inserir!
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {jogosBolaoAtivos.map((j) => (
                <div
                  key={j.id}
                  className="bg-black border border-zinc-800 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <EscudoTime nome={j.casa} badgeUrl={j.escudoCasa} size={26} />
                    <span className="font-bold text-white truncate">{j.casa}</span>
                    <span className="text-[#FF6B00] font-black">x</span>
                    <span className="font-bold text-white truncate">{j.fora}</span>
                    <EscudoTime nome={j.fora} badgeUrl={j.escudoFora} size={26} />
                    <span className="text-[10px] text-zinc-500 font-mono">({j.data})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      deleteJogoFromDb(j.id).catch(() => {});
                      const rest = jogosBolaoAtivos.filter((x) => x.id !== j.id);
                      setJogosBolaoAtivos(rest);
                      try {
                        localStorage.setItem('elite_jogos_v11', JSON.stringify(rest));
                      } catch {
                        // ignore
                      }
                    }}
                    className="text-red-400 hover:text-red-300 text-[11px] font-bold px-2 py-1 rounded cursor-pointer shrink-0"
                    title="Remover confronto"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ImportarJogosAdmin({ onVoltar }: { onVoltar?: () => void }) {
  const handleVoltar = () => {
    if (onVoltar) {
      onVoltar();
      return;
    }
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <ImportarJogosErrorBoundary onVoltar={handleVoltar}>
      <ImportarJogosContent onVoltar={handleVoltar} />
    </ImportarJogosErrorBoundary>
  );
}
