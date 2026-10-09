import React, { useState, useRef, useEffect } from 'react';

const CANAIS_OFICIAIS = [
  {
    id: 'cazetv',
    label: 'CazéTV (YouTube)',
    src: 'https://www.youtube.com/embed/ZMdCp6vN8Ws?playsinline=1&modestbranding=1&rel=0&enablejsapi=1',
    backups: [
      'https://www.youtube.com/embed/lNIx05N77DY?playsinline=1&modestbranding=1&rel=0&enablejsapi=1',
      'https://www.youtube.com/embed/_Lk5a5OR0vc?playsinline=1&modestbranding=1&rel=0&start=1800&enablejsapi=1',
    ],
  },
  {
    id: 'fifaplus',
    label: 'FIFA+ (Grátis)',
    src: 'https://www.youtube.com/embed/36dP-6iM95M?playsinline=1&modestbranding=1&rel=0&enablejsapi=1',
    backups: [
      'https://www.youtube.com/embed/tn0IBBcaw6Q?playsinline=1&modestbranding=1&rel=0&enablejsapi=1',
      'https://www.youtube.com/embed/b7PtZOQ6Wro?playsinline=1&modestbranding=1&rel=0&enablejsapi=1',
    ],
  },
  {
    id: 'nsports',
    label: 'N Sports - Ao vivo agora',
    src: 'https://www.youtube.com/embed/rm06XtTDw3I?playsinline=1&modestbranding=1&rel=0&start=1200&enablejsapi=1',
    backups: [
      'https://www.youtube.com/embed/JUF6rCh1Zrk?playsinline=1&modestbranding=1&rel=0&start=1500&enablejsapi=1',
      'https://www.youtube.com/embed/AQS3N_esijU?playsinline=1&modestbranding=1&rel=0&start=1200&enablejsapi=1',
    ],
  },
  {
    id: 'goat',
    label: 'Canal GOAT - Gratuito',
    src: 'https://www.youtube.com/embed/CTNlXPwPHbA?playsinline=1&modestbranding=1&rel=0&start=1500&enablejsapi=1',
    backups: [
      'https://www.youtube.com/embed/eH5rSxUObnI?playsinline=1&modestbranding=1&rel=0&start=1500&enablejsapi=1',
      'https://www.youtube.com/embed/ZiLdsJWExG4?playsinline=1&modestbranding=1&rel=0&start=1500&enablejsapi=1',
    ],
  },
];

const ESCUDO_FLAMENGO =
  'https://logodetimes.com/times/flamengo/logo-flamengo-256.png';
const ESCUDO_PALMEIRAS =
  'https://logodetimes.com/times/palmeiras/logo-palmeiras-256.png';

export function BolaoLiveCard({
  tempoAoVivo = "AO VIVO 67'",
  timeCasa = 'Flamengo',
  timeFora = 'Palmeiras',
  escudoCasa = ESCUDO_FLAMENGO,
  escudoFora = ESCUDO_PALMEIRAS,
  placarCasa = 1,
  placarFora = 0,
  legenda = 'Brasileirão • Rodada 28 • Estádio Maracanã',
  onConfirmarPalpite,
}) {
  const [canalAtivo, setCanalAtivo] = useState(CANAIS_OFICIAIS[0]);
  const [indiceSinal, setIndiceSinal] = useState(0);
  const [iframeSrc, setIframeSrc] = useState(CANAIS_OFICIAIS[0].src);
  const [playerIniciado, setPlayerIniciado] = useState(false);
  const iframeRef = useRef(null);

  const [palpiteCasa, setPalpiteCasa] = useState(2);
  const [palpiteFora, setPalpiteFora] = useState(1);
  const [palpiteConfirmado, setPalpiteConfirmado] = useState(false);

  const [erroEscudoCasa, setErroEscudoCasa] = useState(false);
  const [erroEscudoFora, setErroEscudoFora] = useState(false);

  const enviarComandoPlayer = (func, args = []) => {
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func, args }),
          '*'
        );
      }
    } catch {
      // ignore cross-origin postMessage errors
    }
  };

  useEffect(() => {
    const handleBlur = () => {
      if (document.activeElement === iframeRef.current) {
        setPlayerIniciado(true);
      }
    };

    const handleMessage = (event) => {
      if (typeof event.data !== 'string') return;
      try {
        const data = JSON.parse(event.data);
        if (
          data?.event === 'onStateChange' &&
          (data?.info === 1 || data?.info === 3)
        ) {
          setPlayerIniciado(true);
        }
        if (
          data?.event === 'infoDelivery' &&
          (data?.info?.playerState === 1 || data?.info?.playerState === 3)
        ) {
          setPlayerIniciado(true);
        }
        if (data?.event === 'onError') {
          const listaSinais = [canalAtivo.src, ...(canalAtivo.backups || [])];
          const proximoIndice = (indiceSinal + 1) % listaSinais.length;
          if (proximoIndice !== indiceSinal) {
            setIndiceSinal(proximoIndice);
            setIframeSrc(`${listaSinais[proximoIndice]}&autoplay=1`);
          }
        }
      } catch {
        // ignore non-JSON messages
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('message', handleMessage);
    };
  }, [canalAtivo, indiceSinal]);

  const selecionarCanal = (canal) => {
    setCanalAtivo(canal);
    setIndiceSinal(0);
    setPlayerIniciado(true);
    const urlComAutoplay = canal.src.includes('autoplay=1')
      ? canal.src
      : `${canal.src}&autoplay=1`;
    setIframeSrc(urlComAutoplay);
  };

  const alternarSinalDoCanal = () => {
    const listaSinais = [canalAtivo.src, ...(canalAtivo.backups || [])];
    const proximoIndice = (indiceSinal + 1) % listaSinais.length;
    setIndiceSinal(proximoIndice);
    setPlayerIniciado(true);
    setIframeSrc(`${listaSinais[proximoIndice]}&autoplay=1`);
  };

  const handleIframeLoad = () => {
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }),
          '*'
        );
        if (playerIniciado) {
          enviarComandoPlayer('playVideo');
        }
      }
    } catch {
      // ignore
    }
  };

  const iniciarPlayNoApp = () => {
    setPlayerIniciado(true);
    enviarComandoPlayer('playVideo');
    if (!iframeSrc.includes('autoplay=1')) {
      setIframeSrc(`${canalAtivo.src}&autoplay=1`);
    }
  };

  const handleConfirmarPalpite = (e) => {
    e.preventDefault();
    const golsCasaNum = Math.max(0, Number(palpiteCasa) || 0);
    const golsForaNum = Math.max(0, Number(palpiteFora) || 0);
    setPalpiteConfirmado(true);

    const dadosPalpite = {
      timeCasa,
      timeFora,
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
      canal: canalAtivo.label,
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
      {/* 1. HEADER AO VIVO */}
      <div className="relative w-full h-[200px] rounded-t-[16px] overflow-hidden bg-black border-b border-[#C41E3A]">
        {/* Label "AO VIVO 67'" vermelho com fundo #C41E3A */}
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2 pointer-events-none">
          <span className="bg-[#C41E3A] text-white text-xs font-extrabold px-3 py-1 rounded-full tracking-wider uppercase shadow-lg flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            {tempoAoVivo}
          </span>
          <span className="bg-black/80 border border-[#C41E3A] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
            {canalAtivo.label}
          </span>
        </div>

        {/* Player de vídeo embed do YouTube DENTRO DO APP (playsinline) */}
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          onLoad={handleIframeLoad}
          title={`Transmissão Ao Vivo - ${timeCasa} vs ${timeFora}`}
          className="w-full h-[200px] rounded-t-[16px] border-0 block"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          playsInline
        />

        {/* Play button centralizado vermelho (permite toque direto no player no 1º clique e some ao iniciar) */}
        {!playerIniciado && (
          <div
            aria-hidden="true"
            className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/25 pointer-events-none transition"
          >
            <span className="w-14 h-14 rounded-full bg-[#C41E3A] text-white flex items-center justify-center shadow-[0_0_25px_rgba(196,30,58,0.9)] border border-white/40">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-7 h-7 ml-0.5"
              >
                <path d="M8 5.14v14l11-7-11-7z" />
              </svg>
            </span>
            <span className="mt-2 text-[11px] font-bold text-white bg-black/85 border border-[#C41E3A] px-3 py-0.5 rounded-full">
              Toque para Assistir no App
            </span>
          </div>
        )}
      </div>

      {/* CONTEÚDO INTERNO DO CARD */}
      <div className="p-4 space-y-4">
        {/* 2. PLACAR AO VIVO */}
        <div className="bg-black/90 border border-[#C41E3A] rounded-[16px] p-3.5 text-center space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            {/* Flamengo escudo */}
            <div className="flex flex-col items-center flex-1 min-w-0">
              <div className="w-12 h-12 rounded-full bg-zinc-950 border border-[#C41E3A] p-1.5 flex items-center justify-center shadow-md">
                {!erroEscudoCasa ? (
                  <img
                    src={escudoCasa}
                    alt={timeCasa}
                    onError={() => setErroEscudoCasa(true)}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-xs font-black text-white">FLA</span>
                )}
              </div>
              <span className="mt-1.5 text-xs sm:text-sm font-extrabold text-white truncate max-w-full">
                {timeCasa}
              </span>
            </div>

            {/* Placar central 1-0 com fundo vermelho #C41E3A */}
            <div className="flex flex-col items-center shrink-0 px-2">
              <div className="bg-[#C41E3A] text-white font-black text-xl sm:text-2xl px-4 py-1.5 rounded-xl tracking-widest shadow-md font-mono">
                {placarCasa}-{placarFora}
              </div>
              <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider mt-1">
                Placar ao Vivo
              </span>
            </div>

            {/* Palmeiras escudo */}
            <div className="flex flex-col items-center flex-1 min-w-0">
              <div className="w-12 h-12 rounded-full bg-zinc-950 border border-[#C41E3A] p-1.5 flex items-center justify-center shadow-md">
                {!erroEscudoFora ? (
                  <img
                    src={escudoFora}
                    alt={timeFora}
                    onError={() => setErroEscudoFora(true)}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-xs font-black text-white">PAL</span>
                )}
              </div>
              <span className="mt-1.5 text-xs sm:text-sm font-extrabold text-white truncate max-w-full">
                {timeFora}
              </span>
            </div>
          </div>

          {/* Legenda "Brasileirão • Rodada 28 • Estádio Maracanã" */}
          <p className="text-[11px] sm:text-xs text-white/90 font-semibold border-t border-[#C41E3A]/40 pt-2">
            {legenda}
          </p>
        </div>

        {/* 3. CANAIS OFICIAIS GRATUITOS */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-white">
              📺 Canais Oficiais Gratuitos
            </span>
            <button
              type="button"
              onClick={alternarSinalDoCanal}
              className="text-[10px] font-bold text-white bg-black/80 hover:bg-[#C41E3A] border border-[#C41E3A] px-2.5 py-0.5 rounded-full transition cursor-pointer"
            >
              🔄 Trocar Sinal ({indiceSinal + 1}/3)
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {CANAIS_OFICIAIS.map((canal) => {
              const ativo = canalAtivo.id === canal.id;
              return (
                <button
                  key={canal.id}
                  type="button"
                  onClick={() => selecionarCanal(canal)}
                  className={`w-full py-2.5 px-2.5 rounded-xl text-[11px] sm:text-xs font-bold border border-[#C41E3A] transition cursor-pointer text-center truncate ${
                    ativo
                      ? 'bg-[#C41E3A] text-white shadow-[0_0_15px_rgba(196,30,58,0.45)]'
                      : 'bg-[#0A0A0A] hover:bg-[#C41E3A]/20 text-white'
                  }`}
                >
                  {canal.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. MEU PALPITE (SEM ODDS, É BOLÃO) */}
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

          {/* Input estilo bolão: Flamengo [ 2 ] X Palmeiras [ 1 ] */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 py-1">
            <label
              htmlFor="palpite-casa-input"
              className="text-xs sm:text-sm font-extrabold text-white truncate"
            >
              {timeCasa}
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
              {timeFora}
            </label>
          </div>

          {/* Botão grande: "Confirma Palpite - R$10" background #C41E3A, texto branco, ícone cadeado */}
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
              ✅ Palpite registrado: {timeCasa} {palpiteCasa} x {palpiteFora}{' '}
              {timeFora}! Finalize o pagamento de R$10 para validar.
            </div>
          )}

          {/* Texto pequeno embaixo: "Palpite confirmado após o pagamento • Apenas entre amigos" */}
          <p className="text-[11px] text-white/80 text-center font-medium leading-snug">
            Palpite confirmado após o pagamento • Apenas entre amigos
          </p>
        </form>
      </div>
    </div>
  );
}

export default BolaoLiveCard;
