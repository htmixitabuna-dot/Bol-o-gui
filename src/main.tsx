import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import ImportarJogosAdmin from './ImportarJogosAdmin.tsx';
import { BOLAO_ELITE_ICON_DATA_URL } from './pwaIconDataUrl';
import './index.css';

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const isIOSDevice =
    /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);

  if (isIOSDevice) {
    // Em iOS Safari, remove o link do manifest externo para forçar o uso imediato
    // do apple-touch-icon embutido em Base64 (evita o ícone "B" escuro quando o iOS
    // tenta baixar o manifest sem cookies em segundo plano).
    document.querySelectorAll('link[rel="manifest"]').forEach((el) => el.remove());
  }

  document.querySelectorAll('link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"]').forEach((el) => {
    el.setAttribute('href', BOLAO_ELITE_ICON_DATA_URL);
  });
}

registerSW({ immediate: true });

function isImportarJogosUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const path = (window.location.pathname || '').toLowerCase();
  const hash = (window.location.hash || '').toLowerCase();
  const search = (window.location.search || '').toLowerCase();
  return (
    path.startsWith('/admin/importar-jogos') ||
    hash.includes('/admin/importar-jogos') ||
    search.includes('importar-jogos')
  );
}

function RootRouter() {
  const [mostrarImportador, setMostrarImportador] = useState<boolean>(isImportarJogosUrl);
  const [emPainelAdm, setEmPainelAdm] = useState<boolean>(false);

  useEffect(() => {
    const syncRoute = () => {
      setMostrarImportador(isImportarJogosUrl());
    };
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('hashchange', syncRoute);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('hashchange', syncRoute);
    };
  }, []);

  useEffect(() => {
    if (mostrarImportador) {
      setEmPainelAdm(false);
      return;
    }
    const checkAdminPanel = () => {
      const text = document.body?.innerText || '';
      setEmPainelAdm(
        text.includes('ADM - BOLÕES ELITE') ||
          text.includes('GERENCIAR CONFRONTOS') ||
          text.includes('Gerenciar Confrontos') ||
          text.includes('Cadastrar Novo Bolão') ||
          text.includes('Adicionar Confronto')
      );
    };
    checkAdminPanel();
    const observer = new MutationObserver(checkAdminPanel);
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
    return () => observer.disconnect();
  }, [mostrarImportador]);

  if (mostrarImportador) {
    return (
      <ImportarJogosAdmin
        onVoltar={() => {
          if (typeof window !== 'undefined' && window.history?.pushState) {
            window.history.pushState({}, '', '/admin');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
          setMostrarImportador(false);
        }}
      />
    );
  }

  return (
    <>
      <App />
      {emPainelAdm && (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && window.history?.pushState) {
                window.history.pushState({}, '', '/admin/importar-jogos');
              }
              setMostrarImportador(true);
            }}
            className="bg-[#FF6B00] hover:bg-[#ff7b1a] text-black font-black px-4 py-2.5 rounded-full text-xs uppercase tracking-wider shadow-xl shadow-[#FF6B00]/30 border-2 border-black cursor-pointer flex items-center gap-1.5 transition hover:scale-105"
            title="Atalho isolado: /admin/importar-jogos"
          >
            <span>⚡</span> Jogos do Dia (1 Clique)
          </button>
        </div>
      )}
    </>
  );
}

createRoot(document.getElementById('root')!).render(<RootRouter />);
