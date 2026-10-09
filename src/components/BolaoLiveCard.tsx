import React, { useState, useRef, useEffect } from 'react';
import Hls from 'hls.js';

export interface CanalAoVivo {
  id: string;
  nome: string;
  timeCasa: string;
  timeFora: string;
  hlsUrl: string;
  aoVivo: boolean;
  placarCasa: number;
  placarFora: number;
  tempo: string;
  legenda: string;
  escudoCasa: string;
  escudoFora: string;
}

export const CANAIS: CanalAoVivo[] = [
  {
    id: 'cazetv',
    nome: 'CazéTV',
    timeCasa: 'Vasco',
    timeFora: 'Fluminense',
    hlsUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    aoVivo: true,
    placarCasa: 2,
    placarFora: 1,
    tempo: "67'",
    legenda: 'Brasileirão • Clássico dos Gigantes • Maracanã',
    escudoCasa: 'https://logodetimes.com/times/vasco-da-gama/logo-vasco-da-gama-256.png',
    escudoFora: 'https://logodetimes.com/times/fluminense/logo-fluminense-256.png',
  },
  {
    id: 'fifa',
    nome: 'FIFA+',
    timeCasa: 'Brasil',
    timeFora: 'Argentina',
    hlsUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    aoVivo: true,
    placarCasa: 1,
    placarFora: 0,
    tempo: "54'",
    legenda: 'Eliminatórias da Copa • Superclássico • Maracanã',
    escudoCasa: 'https://a.espncdn.com/i/teamlogos/countries/500/bra.png',
    escudoFora: 'https://a.espncdn.com/i/teamlogos/countries/500/arg.png',
  },
  {
    id: 'nsports',
    nome: 'N Sports',
    timeCasa: 'Corinthians',
    timeFora: 'Palmeiras',
    hlsUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    aoVivo: false,
    placarCasa: 1,
    placarFora: 1,
    tempo: 'ENCERRADO',
    legenda: 'Brasileirão • Derby Paulista • Neo Química Arena',
    escudoCasa: 'https://logodetimes.com/times/corinthians/logo-corinthians-256.png',
    escudoFora: 'https://logodetimes.com/times/palmeiras/logo-palmeiras-256.png',
  },
  {
    id: 'goat',
    nome: 'Canal GOAT',
    timeCasa: 'Flamengo',
    timeFora: 'Botafogo',
    hlsUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    aoVivo: true,
    placarCasa: 2,
    placarFora: 2,
    tempo: "79'",
    legenda: 'Brasileirão • Clássico da Rivalidade • Maracanã',
    escudoCasa: 'https://logodetimes.com/times/flamengo/logo-flamengo-256.png',
    escudoFora: 'https://logodetimes.com/times/botafogo/logo-botafogo-256.png',
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

export function BolaoLiveCard({ onConfirmarPalpite }: BolaoLiveCardProps) {
  const [canalAtivo, setCanalAtivo] = useState<CanalAoVivo>(CANAIS[0]);
  const [videoSrc, setVideoSrc] = useState<string>(CANAIS[0].hlsUrl);
  const [emTransicao, setEmTransicao] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [palpiteCasa, setPalpiteCasa] = useState<string | number>(2);
  const [palpiteFora, setPalpiteFora] = useState<string | number>(1);
  const [palpiteConfirmado, setPalpiteConfirmado] = useState<boolean>(false);

  const [erroEscudoCasa, setErroEscudoCasa] = useState<boolean>(false);
  const [erroEscudoFora, setErroEscudoFora] = useState<boolean>(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;

    const finalizarTransicao = () => {
      setEmTransicao(false);
    };

    const iniciarReproducao = () => {
      video.muted = true;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            finalizarTransicao();
          })
          .catch(() => {
            finalizarTransicao();
          });
      } else {
        finalizarTransicao();
      }
    };

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hlsRef.current = hls;
      hls.loadSource(videoSrc);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        iniciarReproducao();
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
          finalizarTransicao();
        }
      });
    } else {
      video.src = videoSrc;
      video.addEventListener('loadedmetadata', iniciarReproducao, { once: true });
      iniciarReproducao();
    }

    const timer = window.setTimeout(finalizarTransicao, 300);

    return () => {
      window.clearTimeout(timer);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [videoSrc, canalAtivo.id]);

  const selecionarCanal = (canal: CanalAoVivo) => {
    if (canal.id === canalAtivo.id) return;
    setEmTransicao(true);
    setCanalAtivo(canal);
    setVideoSrc(canal.hlsUrl);
    setErroEscudoCasa(false);
    setErroEscudoFora(false);
    setPalpiteConfirmado(false);
  };

  const handleConfirmarPalpite = (e: React.FormEvent) => {
    e.preventDefault();
    const golsCasaNum = Math.max(0, Number(palpiteCasa) || 0);
    const golsForaNum = Math.max(0, Number(palpiteFora) || 0);
    setPalpiteConfirmado(true);

    const dadosPalpite: DadosPalpiteLive = {
      timeCasa: canalAtivo.timeCasa,
      timeFora: canalAtivo.timeFora,
      golsCasa: golsCasaNum,
      golsFora: golsForaNum,
      placarPalpite: `${golsCasaNum}x${golsForaNum}`,
      escolha:
        golsCasaNum > golsForaNum
          ? 'CASA'
          : golsForaNum > golsCasaNum
          ? 'FORA'
          : 'EMPATE',
      valor: 10,
      canal: canalAtivo.nome,
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

  const siglaTime = (nome: string) =>
    (nome || '').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'FC';

  return (
    <div className="w-full bg-[#0A0A0A] text-white border border-[#C41E3A] rounded-[16px] overflow-hidden shadow-[0_12px_35px_rgba(196,30,58,0.18)]">
      {/* 1. PLAYER NATIVO HLS DENTRO DA ÁREA DO JOGADOR (w-full h-[210px]) */}
      <div className="relative w-full h-[210px] rounded-t-[16px] overflow-hidden bg-black border-b border-[#C41E3A]">
        {/* Badges Superiores (AO VIVO pulsante quando aoVivo=true + Nome do Canal) */}
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2 pointer-events-none">
          {canalAtivo.aoVivo ? (
            <span className="bg-[#C41E3A] text-white text-xs font-extrabold px-3 py-1 rounded-full tracking-wider uppercase shadow-lg flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              AO VIVO {canalAtivo.tempo}
            </span>
          ) : (
            <span className="bg-zinc-900/90 border border-zinc-700 text-zinc-300 text-xs font-extrabold px-3 py-1 rounded-full tracking-wider uppercase shadow-lg flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-zinc-500" />
              {canalAtivo.tempo}
            </span>
          )}
          <span className="bg-black/85 border border-[#C41E3A] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
            {canalAtivo.nome}
          </span>
        </div>

        {/* Tag <video> nativa com HLS.js */}
        <video
          ref={videoRef}
          className={`w-full h-[210px] object-cover block transition-opacity duration-300 ease-in-out ${
            emTransicao ? 'opacity-20' : 'opacity-100'
          }`}
          autoPlay
          muted
          playsInline
          controls
          loop
        />
      </div>

      {/* CONTEÚDO INTERNO DO CARD */}
      <div className="p-4 space-y-4">
        {/* 2. PLACAR E NOMES ATUALIZANDO CONFORME CANAL SELECIONADO */}
        <div
          className={`bg-black/90 border border-[#C41E3A] rounded-[16px] p-3.5 text-center space-y-2.5 transition-all duration-300 ${
            emTransicao ? 'opacity-60 scale-[0.99]' : 'opacity-100 scale-100'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            {/* Time Casa */}
            <div className="flex flex-col items-center flex-1 min-w-0">
              <div className="w-12 h-12 rounded-full bg-zinc-950 border border-[#C41E3A] p-1.5 flex items-center justify-center shadow-md">
                {!erroEscudoCasa ? (
                  <img
                    src={canalAtivo.escudoCasa}
                    alt={canalAtivo.timeCasa}
                    onError={() => setErroEscudoCasa(true)}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-xs font-black text-white">
                    {siglaTime(canalAtivo.timeCasa)}
                  </span>
                )}
              </div>
              <span className="mt-1.5 text-xs sm:text-sm font-extrabold text-white truncate max-w-full">
                {canalAtivo.timeCasa}
              </span>
            </div>

            {/* Placar central com fundo vermelho #C41E3A */}
            <div className="flex flex-col items-center shrink-0 px-2">
              <div className="bg-[#C41E3A] text-white font-black text-xl sm:text-2xl px-4 py-1.5 rounded-xl tracking-widest shadow-md font-mono">
                {canalAtivo.placarCasa}-{canalAtivo.placarFora}
              </div>
              <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider mt-1">
                {canalAtivo.aoVivo ? 'Placar ao Vivo' : 'Placar Final'}
              </span>
            </div>

            {/* Time Fora */}
            <div className="flex flex-col items-center flex-1 min-w-0">
              <div className="w-12 h-12 rounded-full bg-zinc-950 border border-[#C41E3A] p-1.5 flex items-center justify-center shadow-md">
                {!erroEscudoFora ? (
                  <img
                    src={canalAtivo.escudoFora}
                    alt={canalAtivo.timeFora}
                    onError={() => setErroEscudoFora(true)}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-xs font-black text-white">
                    {siglaTime(canalAtivo.timeFora)}
                  </span>
                )}
              </div>
              <span className="mt-1.5 text-xs sm:text-sm font-extrabold text-white truncate max-w-full">
                {canalAtivo.timeFora}
              </span>
            </div>
          </div>

          <p className="text-[11px] sm:text-xs text-white/90 font-semibold border-t border-[#C41E3A]/40 pt-2">
            {canalAtivo.legenda}
          </p>
        </div>

        {/* 3. CANAIS AO VIVO (TROCA DE CANAL INTERNA VIA SETSTATE) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-white">
              📺 Canais Ao Vivo
            </span>
            <span className="text-[10px] font-bold text-white/70">
              {canalAtivo.nome} • {canalAtivo.timeCasa} x {canalAtivo.timeFora}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {CANAIS.map((canal) => {
              const ativo = canalAtivo.id === canal.id;
              return (
                <button
                  key={canal.id}
                  type="button"
                  onClick={() => selecionarCanal(canal)}
                  className={`w-full py-2.5 px-2.5 rounded-xl text-[11px] sm:text-xs font-bold border border-[#C41E3A] transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 truncate ${
                    ativo
                      ? 'bg-[#C41E3A] text-white shadow-[0_0_15px_rgba(196,30,58,0.45)]'
                      : 'bg-[#0A0A0A] hover:bg-[#C41E3A]/20 text-white'
                  }`}
                >
                  {canal.aoVivo && (
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 animate-pulse ${
                        ativo ? 'bg-white' : 'bg-[#C41E3A]'
                      }`}
                    />
                  )}
                  <span className="truncate">{canal.nome}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. MEU PALPITE DO BOLÃO */}
        <form
          onSubmit={handleConfirmarPalpite}
          className="bg-black/90 border border-[#C41E3A] rounded-[16px] p-3.5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-white">
              ⚽ Meu Palpite do Bolão
            </span>
            <span className="text-[10px] font-bold text-white/80">
              Bolão de Amigos
            </span>
          </div>

          <div className="flex items-center justify-center gap-2 sm:gap-3 py-1">
            <label
              htmlFor="palpite-casa-input"
              className="text-xs sm:text-sm font-extrabold text-white truncate"
            >
              {canalAtivo.timeCasa}
            </label>

            <input
              id="palpite-casa-input"
              type="number"
              min="0"
              max="20"
              value={palpiteCasa}
              onChange={(e) => {
                setPalpiteCasa(e.target.value);
                setPalpiteConfirmado(false);
              }}
              className="w-12 h-11 bg-[#0A0A0A] border border-[#C41E3A] rounded-xl text-center text-base font-black text-white focus:outline-none focus:ring-2 focus:ring-[#C41E3A] font-mono"
            />

            <span className="text-sm font-black text-[#C41E3A]">X</span>

            <input
              id="palpite-fora-input"
              type="number"
              min="0"
              max="20"
              value={palpiteFora}
              onChange={(e) => {
                setPalpiteFora(e.target.value);
                setPalpiteConfirmado(false);
              }}
              className="w-12 h-11 bg-[#0A0A0A] border border-[#C41E3A] rounded-xl text-center text-base font-black text-white focus:outline-none focus:ring-2 focus:ring-[#C41E3A] font-mono"
            />

            <label
              htmlFor="palpite-fora-input"
              className="text-xs sm:text-sm font-extrabold text-white truncate"
            >
              {canalAtivo.timeFora}
            </label>
          </div>

          <button
            type="submit"
            className="w-full bg-[#C41E3A] hover:bg-[#a81830] active:scale-[0.99] text-white font-black py-3.5 px-4 rounded-xl text-sm uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(196,30,58,0.4)] border border-[#C41E3A]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4 shrink-0"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z"
                clipRule="evenodd"
              />
            </svg>
            <span>Confirma Palpite - R$10</span>
          </button>

          {palpiteConfirmado && (
            <div className="bg-[#C41E3A]/20 border border-[#C41E3A] rounded-xl p-2.5 text-center text-xs font-bold text-white">
              ✅ Palpite registrado: {canalAtivo.timeCasa} {palpiteCasa} x{' '}
              {palpiteFora} {canalAtivo.timeFora}! Finalize o pagamento de R$10
              para validar.
            </div>
          )}

          <p className="text-[11px] text-white/80 text-center font-medium leading-snug">
            Palpite confirmado após o pagamento • Apenas entre amigos
          </p>
        </form>
      </div>
    </div>
  );
}

export default BolaoLiveCard;
