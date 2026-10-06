import React, { useState } from 'react';
import { usePWAInstall } from './usePWAInstall';
import logoOficial from './assets/images/bolao_elite_logo_1791164462566.jpg';

interface PWAInstallButtonProps {
  variant?: 'banner' | 'compact';
  logoSrc?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'banner',
  logoSrc,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  const iconeLogo = logoSrc || logoOficial;

  // Se o app já estiver instalado e rodando em modo standalone no celular, não exibe o botão de instalar
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      {variant === 'compact' ? (
        <button
          type="button"
          onClick={handleInstallClick}
          className="text-xs bg-zinc-900 hover:bg-zinc-800 border border-[#FF6B00]/60 text-[#FF6B00] px-2.5 py-1.5 rounded-lg cursor-pointer font-black transition flex items-center gap-1.5 shadow-sm"
          title="Instalar Aplicativo Bolões Elite no Celular"
        >
          <img
            src={iconeLogo}
            alt="Bolões Elite"
            className="w-4 h-4 rounded object-contain"
          />
          <span>📲 Instalar App</span>
        </button>
      ) : (
        <div className="w-full mt-4 bg-gradient-to-r from-zinc-900 via-zinc-900 to-black border-2 border-[#FF6B00]/60 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xl shadow-[#FF6B00]/10">
          <div className="flex items-center gap-3 text-left min-w-0">
            <img
              src={iconeLogo}
              alt="Logo Bolões Elite"
              className="w-12 h-12 rounded-xl object-contain border border-[#FF6B00]/50 bg-black p-0.5 shrink-0 shadow-md"
            />
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-wider text-[#FF6B00]">
                📲 APLICATIVO OFICIAL NO CELULAR
              </div>
              <div className="text-xs sm:text-sm font-black text-white truncate">
                Instalar App Bolões Elite
              </div>
              <div className="text-[11px] text-zinc-400 leading-tight">
                Acesso rápido na tela inicial com a logo oficial
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleInstallClick}
            className="bg-[#FF6B00] hover:bg-[#ff7b1a] text-black font-black px-3.5 py-2.5 rounded-xl text-xs uppercase tracking-wider cursor-pointer transition shrink-0 shadow-lg shadow-[#FF6B00]/25 hover:scale-105 active:scale-95 flex items-center gap-1.5"
          >
            <span>📲</span>
            <span>Instalar</span>
          </button>
        </div>
      )}

      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 text-left">
          <div className="bg-zinc-900 border-2 border-[#FF6B00]/70 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <img
                  src={iconeLogo}
                  alt="Logo Bolões Elite"
                  className="w-12 h-12 rounded-xl object-contain border border-[#FF6B00]/60 bg-black p-0.5"
                />
                <div>
                  <span className="text-[10px] font-black uppercase bg-[#FF6B00] text-black px-2 py-0.5 rounded">
                    APP BOLÕES ELITE
                  </span>
                  <h3 className="text-base font-black text-white mt-0.5">
                    Instalar no seu Celular
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="text-zinc-400 hover:text-white text-lg font-black p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {isInstallable && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await install();
                  if (ok) setShowGuideModal(false);
                }}
                className="w-full bg-[#FF6B00] hover:bg-[#ff7b1a] text-black font-black py-3.5 rounded-xl text-xs uppercase tracking-wider cursor-pointer transition shadow-lg shadow-[#FF6B00]/25 flex items-center justify-center gap-2"
              >
                <span>📲</span> INSTALAR AGORA COM 1 CLIQUE
              </button>
            )}

            <div className="space-y-3 text-xs text-zinc-300">
              {isIOS ? (
                <div className="bg-black/70 border border-zinc-800 rounded-2xl p-3.5 space-y-2">
                  <div className="font-black text-[#FF6B00] uppercase text-[11px]">
                    🍎 Como instalar no iPhone / iPad (Safari):
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-zinc-200 leading-relaxed">
                    <li>
                      Toque no botão <strong>Compartilhar</strong> (ícone de quadrado com seta para cima ⬆️) na barra do Safari.
                    </li>
                    <li>
                      Role para baixo e toque em <strong>&quot;Adicionar à Tela de Início&quot;</strong>.
                    </li>
                    <li>
                      Toque em <strong>Adicionar</strong> no canto superior direito. O app ficará na sua tela com a logo do <strong>Bolões Elite</strong>!
                    </li>
                  </ol>
                </div>
              ) : (
                <>
                  <div className="bg-black/70 border border-zinc-800 rounded-2xl p-3.5 space-y-2">
                    <div className="font-black text-[#FF6B00] uppercase text-[11px]">
                      🤖 Como instalar no Android (Chrome):
                    </div>
                    <ol className="list-decimal list-inside space-y-1.5 text-zinc-200 leading-relaxed">
                      <li>
                        Toque nos <strong>3 pontinhos (⋮)</strong> no canto superior direito do navegador Chrome.
                      </li>
                      <li>
                        Toque em <strong>&quot;Instalar aplicativo&quot;</strong> ou <strong>&quot;Adicionar à tela inicial&quot;</strong>.
                      </li>
                      <li>
                        Confirme em <strong>Instalar</strong>. O aplicativo será criado no seu celular com a logo oficial do <strong>Bolões Elite</strong>!
                      </li>
                    </ol>
                  </div>

                  <div className="bg-black/70 border border-zinc-800 rounded-2xl p-3.5 space-y-2">
                    <div className="font-black text-zinc-400 uppercase text-[11px]">
                      🍎 No iPhone / iPad (Safari):
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                      Toque em <strong>Compartilhar (⬆️)</strong> no Safari e escolha <strong>&quot;Adicionar à Tela de Início&quot;</strong>.
                    </p>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl text-xs uppercase cursor-pointer transition"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
};
