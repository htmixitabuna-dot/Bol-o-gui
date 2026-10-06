import React, { useState, useEffect } from 'react';
import {
  db,
  collection,
  onSnapshot,
  upsertJogoInDb,
  deleteJogoFromDb,
  upsertJogoDisponivelInDb,
  JogoDisponivelItem,
} from './supabase';
import { TIMES_PADRAO, getEscudoPadrao, Jogo } from './App';

const getHojeISO = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const formatarDataParaEspn = (dataStr: string): string => {
  const limpo = (dataStr || '').trim();
  // Se vier no formato DD/MM/YYYY (ex: 06/10/2026 -> 20261006)
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(limpo)) {
    const [dd, mm, yyyy] = limpo.split('/');
    return `${yyyy}${mm}${dd}`;
  }
  // Se vier no formato YYYY-MM-DD (ex: 2026-10-06 -> 20261006)
  if (/^\d{4}-\d{2}-\d{2}$/.test(limpo)) {
    return limpo.replace(/-/g, '');
  }
  // Se já vier YYYYMMDD
  if (/^\d{8}$/.test(limpo)) {
    return limpo;
  }
  return getHojeISO().replace(/-/g, '');
};

const gerarUuidSimples = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/[^a-zA-Z0-9_-]/g, '_');
  }
  return `jd_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
};

interface JogoEspnCard extends JogoDisponivelItem {
  escudoCasaUrl?: string;
  escudoForaUrl?: string;
  origem: 'espn';
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
  const [jogosEspn, setJogosEspn] = useState<JogoEspnCard[]>([]);
  const [jogosDisponiveisDb, setJogosDisponiveisDb] = useState<JogoDisponivelItem[]>([]);
  const [jogosBolaoAtivos, setJogosBolaoAtivos] = useState<Jogo[]>([]);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [erroApiMsg, setErroApiMsg] = useState<string>('');
  const [adicionandoId, setAdicionandoId] = useState<string>('');
  const [modoRascunho, setModoRascunho] = useState<boolean>(false);

  // ABA 2: Adicionar Manual Rápido (sem mock de times)
  const [manualCasa, setManualCasa] = useState<string>('');
  const [manualFora, setManualFora] = useState<string>('');
  const [manualHorario, setManualHorario] = useState<string>('16:00');
  const [manualCampeonato, setManualCampeonato] = useState<string>('Brasileirão Série A');

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

  // Escuta a tabela existente 'jogos' e a tabela 'jogos_disponiveis'
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

  // Busca exclusivamente na API pública da ESPN (sem token, sem mocks/fallbacks)
  const buscarJogosDoDia = async (dataAlvo: string) => {
    setCarregandoApi(true);
    setErroApiMsg('');
    setJogosEspn([]);

    const datesParam = formatarDataParaEspn(dataAlvo);
    const urlEspn = `https://site.api.espn.com/apis/site/v2/sports/soccer/bra.1/scoreboard?dates=${encodeURIComponent(datesParam)}`;

    try {
      const resp = await fetch(urlEspn);
      if (!resp.ok) {
        setJogosEspn([]);
        return;
      }

      const data = await resp.json();
      const events = Array.isArray(data?.events) ? data.events : [];

      if (events.length === 0) {
        setJogosEspn([]);
        return;
      }

      const encontrados: JogoEspnCard[] = [];

      for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        const comp = ev?.competitions?.[0];
        const competitors = comp?.competitors || [];

        const casa = String(competitors[0]?.team?.displayName || '').trim();
        const fora = String(competitors[1]?.team?.displayName || '').trim();
        if (!casa || !fora) continue;

        const rawDate = ev?.date || comp?.date || '';
        let horarioFormatado = '';
        if (rawDate) {
          const dt = new Date(rawDate);
          if (!isNaN(dt.getTime())) {
            horarioFormatado = dt.toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            });
          } else {
            horarioFormatado = String(rawDate);
          }
        }

        const idEv = `espn_${ev?.id || `${datesParam}_${i}_${casa}_${fora}`}`.replace(/[^a-zA-Z0-9_-]/g, '_');

        encontrados.push({
          id: idEv,
          time_casa: casa,
          time_fora: fora,
          campeonato: 'Brasileirão Série A',
          horario: horarioFormatado || '16:00',
          data: dataAlvo,
          adicionado_ao_bolao: false,
          escudoCasaUrl: competitors[0]?.team?.logo || getEscudoPadrao(casa),
          escudoForaUrl: competitors[1]?.team?.logo || getEscudoPadrao(fora),
          origem: 'espn',
        });
      }

      setJogosEspn(encontrados);
    } catch {
      setJogosEspn([]);
      setErroApiMsg('Erro ao consultar a API da ESPN no momento.');
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

      const novoJogoId = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const bolaoIdSalvo = (() => {
        try {
          return localStorage.getItem('elite_bolao_preparo_id') || 'bolao_1';
        } catch {
          return 'bolao_1';
        }
      })();
      const tituloBolaoSalvo = (() => {
        try {
          return localStorage.getItem('elite_titulo_novo_bolao') || 'Novo Bolão da Rodada';
        } catch {
          return 'Novo Bolão da Rodada';
        }
      })();

      const novoJogoBolao: Jogo = {
        id: novoJogoId,
        casa: casaLimpo,
        fora: foraLimpo,
        escudoCasa,
        escudoFora,
        data: horarioStr,
        estadio: campeonatoStr || 'Estádio Principal',
        publicado: !modoRascunho,
        bolaoId: bolaoIdSalvo,
        tituloBolao: tituloBolaoSalvo,
      };

      await upsertJogoInDb(novoJogoBolao);

      const novaListaJogos = [...jogosBolaoAtivos, novoJogoBolao];
      setJogosBolaoAtivos(novaListaJogos);
      try {
        localStorage.setItem('elite_jogos_v11', JSON.stringify(novaListaJogos));
      } catch {
        // ignore
      }

      await upsertJogoDisponivelInDb({
        id: dispId,
        time_casa: casaLimpo,
        time_fora: foraLimpo,
        campeonato: campeonatoStr,
        horario: horarioStr,
        data: dataStr,
        adicionado_ao_bolao: true,
      }).catch(() => {});

      mostrarFeedback(
        modoRascunho
          ? `✅ ${casaLimpo} x ${foraLimpo} salvo no Novo Bolão! (Liberado apenas quando publicar)`
          : `✅ ${casaLimpo} x ${foraLimpo} adicionado e publicado no Bolão!`
      );
    } catch (err) {
      console.error('Erro ao adicionar jogo ao bolão:', err);
      mostrarFeedback('⚠️ Erro ao salvar confronto no banco. Tente novamente.');
    } finally {
      setAdicionandoId('');
    }
  };

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
                  ESPN OFICIAL • BRASILEIRÃO SÉRIE A
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">/admin/importar-jogos</span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-white mt-0.5">
                Jogos Oficiais do Brasileirão (ESPN)
              </h1>
              <p className="text-xs text-zinc-400">
                Confrontos reais da ESPN em tempo real ({jogosBolaoAtivos.length}/10 ativos no bolão).
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

        {/* MODO DE SALVAMENTO DO NOVO BOLÃO */}
        <div className="bg-zinc-900/90 border border-amber-500/40 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-amber-300">
              📋 Modo de Cadastro ao Clicar em Adicionar:
            </p>
            <p className="text-[11px] text-zinc-400">
              {modoRascunho
                ? 'Os jogos ficam SALVOS e PRONTOS no ADM, sendo liberados apenas quando você clicar em PUBLICAR.'
                : 'Os jogos adicionados já ficam visíveis imediatamente para os jogadores.'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setModoRascunho(true)}
              className={`px-3 py-2 rounded-xl text-[11px] font-black uppercase cursor-pointer transition ${
                modoRascunho
                  ? 'bg-amber-500 text-black shadow'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              🔒 Deixar Pronto/Salvo
            </button>
            <button
              type="button"
              onClick={() => setModoRascunho(false)}
              className={`px-3 py-2 rounded-xl text-[11px] font-black uppercase cursor-pointer transition ${
                !modoRascunho
                  ? 'bg-green-600 text-white shadow'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              🚀 Publicar Direto
            </button>
          </div>
        </div>

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
            <span>📅</span> Jogos ESPN Hoje ({jogosEspn.length})
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
            <span>⚡</span> Adicionar Manual Rápido
          </button>
        </div>

        {/* ===================================================================
            ABA 1: JOGOS REAIS DA ESPN (SEM MOCKS / SEM FALLBACKS FALSOS)
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
                  {carregandoApi ? '🔄 Buscando na ESPN...' : '🔄 Atualizar Jogos da ESPN'}
                </button>
              </div>

              <div className="text-[11px] text-zinc-400 font-mono">
                ESPN API • dates={formatarDataParaEspn(dataFiltro)}
              </div>
            </div>

            {erroApiMsg && (
              <div className="bg-amber-950/60 border border-amber-700/80 text-amber-200 p-3 rounded-xl text-xs">
                ℹ️ {erroApiMsg}
              </div>
            )}

            {carregandoApi ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-xs text-zinc-400">
                🔄 Consultando jogos oficiais do Brasileirão na ESPN...
              </div>
            ) : jogosEspn.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-2">
                <div className="text-3xl">⚽</div>
                <div className="text-sm sm:text-base font-black text-white">
                  Nenhum jogo oficial do Brasileirão hoje - Data FIFA
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {jogosEspn.map((item) => {
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
            )}
          </div>
        )}

        {/* ===================================================================
            ABA 2: ADICIONAR MANUAL RÁPIDO
           =================================================================== */}
        {aba === 'manual' && (
          <div className="space-y-5">
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
                        placeholder="Digite o Time Casa"
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
                        placeholder="Digite o Time Fora"
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-2 gap-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              <h3 className="text-xs font-black uppercase tracking-wider text-white">
                Confrontos Cadastrados no Bolão ({jogosBolaoAtivos.length}/10)
              </h3>
            </div>
            {jogosBolaoAtivos.some((j) => j.publicado === false) && (
              <button
                type="button"
                onClick={async () => {
                  const atualizados = jogosBolaoAtivos.map((j) => ({ ...j, publicado: true }));
                  setJogosBolaoAtivos(atualizados);
                  try {
                    localStorage.setItem('elite_jogos_v11', JSON.stringify(atualizados));
                  } catch {
                    // ignore
                  }
                  await Promise.all(atualizados.map((j) => upsertJogoInDb(j).catch(() => {})));
                  mostrarFeedback('🚀 BOLÃO PUBLICADO! Todos os jogos salvos foram liberados para os jogadores!');
                }}
                className="bg-green-600 hover:bg-green-500 text-white font-black px-3.5 py-1.5 rounded-xl text-[11px] uppercase cursor-pointer transition shadow"
              >
                🚀 Publicar Bolão Salvo p/ Jogadores
              </button>
            )}
          </div>

          {jogosBolaoAtivos.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-4">
              Nenhum jogo cadastrado no bolão ainda.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {jogosBolaoAtivos.map((j) => (
                <div
                  key={j.id}
                  className={`bg-black border rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs ${
                    j.publicado === false ? 'border-amber-500/40' : 'border-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <EscudoTime nome={j.casa} badgeUrl={j.escudoCasa} size={26} />
                    <span className="font-bold text-white truncate">{j.casa}</span>
                    <span className="text-[#FF6B00] font-black">x</span>
                    <span className="font-bold text-white truncate">{j.fora}</span>
                    <EscudoTime nome={j.fora} badgeUrl={j.escudoFora} size={26} />
                    <span
                      className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 ${
                        j.publicado === false
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-green-500/20 text-green-300 border border-green-500/40'
                      }`}
                    >
                      {j.publicado === false ? 'SALVO' : 'PUBLICADO'}
                    </span>
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
