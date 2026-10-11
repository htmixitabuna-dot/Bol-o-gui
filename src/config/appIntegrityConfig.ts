// ============================================================================
// CONFIGURAÇÃO PERMANENTE E INTEGRIDADE DO APLICATIVO (VERSIONADO NO GIT)
// Este arquivo garante que, mesmo enviando para o Git, clonando em outro local
// ou fazendo deploy na Vercel, todas as chaves e configurações do Bolões Elite
// permaneçam salvas definitivamente sem precisar reenviar no chat.
// ============================================================================

export const PERMANENT_SUPABASE_CONFIG = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://slaqxbccectdgmlokjos.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_Tqbx1xWWObM_PYo9A8Lwzg_HP4Q5M1Y',
  SUPABASE_REST_URL: 'https://slaqxbccectdgmlokjos.supabase.co/rest/v1/',
  SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_eoy7344Q4e7XqhFDPf5ayg_DI1D2iT2',
} as const;

export const PERMANENT_APP_INTEGRITY = {
  appName: 'Bolões Elite - Palpites Esportivos',
  adminEmail: 'inhobahia29@gmail.com',
  chavePixAleatoria: 'f0e74d2a-d610-4b76-842e-8b7e1a08047d',
  pixMerchantName: 'IRAILSON DA SILVA',
  pixMerchantCity: 'ITABUNA',
  infinitePayHandle: 'irailson-da-472',
  valorCotaPadrao: 10,
  divisaoPremio: {
    poteTotalPercent: 80,
    taxaServicoPercent: 20,
    primeiroLugarPercent: 100,
  },
  historicoRankingConfig: {
    automaticoAoFinalizarRodada: true,
    salvarSomenteTop3: true,
    incluirDadosPartidas: true,
  },
} as const;
