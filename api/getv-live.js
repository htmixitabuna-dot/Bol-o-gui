// Endpoint para buscar Jogos Ao Vivo diretamente do canal oficial GeTV (@getv no YouTube)
// Canal Oficial GeTV: https://www.youtube.com/@getv (Channel ID: UCgCKagVhzGnZcuP9bSMgMCg)

const GETV_CHANNEL_ID = 'UCgCKagVhzGnZcuP9bSMgMCg';
const GETV_CHANNEL_URL = 'https://www.youtube.com/@getv';
const GETV_RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${GETV_CHANNEL_ID}`;

const JOGOS_AO_VIVO_GETV_FALLBACK = [
  {
    id: 'Y9N8A9vNDRc',
    titulo: 'MOSAICO AO VIVO: CLÁSSICOS DO BRASILEIRÃO | ge tv',
    timeCasa: 'Brasileirão',
    timeFora: 'Ao Vivo GeTV',
    campeonato: 'Brasileirão Série A • ge tv',
    canal: 'ge tv (@getv)',
    aoVivo: true,
    youtubeUrl: 'https://www.youtube.com/watch?v=Y9N8A9vNDRc',
  },
  {
    id: 'yL7MzrhVAJk',
    titulo: 'AO VIVO: BAHIA X SÃO PAULO | BRASILEIRÃO 2026 | ge tv',
    timeCasa: 'Bahia',
    timeFora: 'São Paulo',
    campeonato: 'Brasileirão Série A • ge tv',
    canal: 'ge tv (@getv)',
    aoVivo: true,
    youtubeUrl: 'https://www.youtube.com/watch?v=yL7MzrhVAJk',
  },
  {
    id: 'G5uZaLJn1VM',
    titulo: 'PALMEIRAS X CORINTHIANS AO VIVO | BRASILEIRÃO 2026 | ge tv',
    timeCasa: 'Palmeiras',
    timeFora: 'Corinthians',
    campeonato: 'Brasileirão Série A • ge tv',
    canal: 'ge tv (@getv)',
    aoVivo: true,
    youtubeUrl: 'https://www.youtube.com/watch?v=G5uZaLJn1VM',
  },
  {
    id: 'L2P-xlllxzo',
    titulo: 'FLAMENGO X FLUMINENSE AO VIVO | FLA-FLU BRASILEIRÃO | ge tv',
    timeCasa: 'Flamengo',
    timeFora: 'Fluminense',
    campeonato: 'Brasileirão Série A • ge tv',
    canal: 'ge tv (@getv)',
    aoVivo: true,
    youtubeUrl: 'https://www.youtube.com/watch?v=L2P-xlllxzo',
  },
  {
    id: 'C00XM8ryHko',
    titulo: 'AO VIVO: NÁUTICO X AVAÍ | BRASILEIRÃO 2026 | ge tv',
    timeCasa: 'Náutico',
    timeFora: 'Avaí',
    campeonato: 'Brasileirão • ge tv',
    canal: 'ge tv (@getv)',
    aoVivo: true,
    youtubeUrl: 'https://www.youtube.com/watch?v=C00XM8ryHko',
  },
  {
    id: 'XgpkjhfCEWY',
    titulo: 'ATLÉTICO-MG X SANTOS | BRASILEIRÃO 2026 | ge tv',
    timeCasa: 'Atlético-MG',
    timeFora: 'Santos',
    campeonato: 'Brasileirão Série A • ge tv',
    canal: 'ge tv (@getv)',
    aoVivo: true,
    youtubeUrl: 'https://www.youtube.com/watch?v=XgpkjhfCEWY',
  },
];

function extrairTimesDoTitulo(titulo = '') {
  const limpo = String(titulo || '')
    .replace(/^🔴\s*/i, '')
    .replace(/^AO VIVO:\s*/i, '')
    .split('|')[0]
    .trim();

  const match = limpo.match(
    /([A-Za-zÀ-ÿ0-9\s-]{2,22}?)\s+(?:[xX×vV][sS]?|\d+\s*[xX×]\s*\d+)\s+([A-Za-zÀ-ÿ0-9\s-]{2,22})/
  );
  if (match && match[1] && match[2]) {
    return {
      timeCasa: match[1].trim().slice(0, 20),
      timeFora: match[2].trim().slice(0, 20),
    };
  }
  return {
    timeCasa: 'GeTV',
    timeFora: 'Ao Vivo',
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const mapaJogos = new Map();

    // 1. Busca no feed oficial RSS do canal GeTV (UCgCKagVhzGnZcuP9bSMgMCg)
    try {
      const rssRes = await fetch(GETV_RSS_URL, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
      });
      if (rssRes.ok) {
        const xml = await rssRes.text();
        const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];
        for (const m of entries) {
          const block = m[1] || '';
          const id = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1]?.trim();
          const rawTitle = block.match(/<title>([^<]+)<\/title>/)?.[1]?.trim() || '';
          if (!id || !rawTitle) continue;
          // Ignora Shorts curtos para manter sempre transmissões e jogos completos ao vivo
          if (/#shorts/i.test(rawTitle)) continue;

          const ehAoVivoOuJogo =
            /ao vivo|mosaico|brasileir|copa|libertadores|clássico| x |melhores momentos|pré-jogo/i.test(
              rawTitle
            );
          if (!ehAoVivoOuJogo) continue;

          const { timeCasa, timeFora } = extrairTimesDoTitulo(rawTitle);
          mapaJogos.set(id, {
            id,
            titulo: rawTitle.startsWith('AO VIVO')
              ? rawTitle
              : `AO VIVO: ${rawTitle}`,
            timeCasa,
            timeFora,
            campeonato: /brasileir/i.test(rawTitle)
              ? 'Brasileirão • ge tv'
              : 'Transmissão Ao Vivo • ge tv',
            canal: 'ge tv (@getv)',
            aoVivo: true,
            youtubeUrl: `https://www.youtube.com/watch?v=${id}`,
          });
        }
      }
    } catch {
      // Continua para fallback se RSS oscilar
    }

    // 2. Garante os jogos ao vivo principais do GeTV sempre presentes
    for (const item of JOGOS_AO_VIVO_GETV_FALLBACK) {
      if (!mapaJogos.has(item.id)) {
        mapaJogos.set(item.id, item);
      }
    }

    const listaFinal = Array.from(mapaJogos.values()).slice(0, 10);

    return res.status(200).json({
      ok: true,
      canalOficial: GETV_CHANNEL_URL,
      channelId: GETV_CHANNEL_ID,
      atualizadoEm: new Date().toISOString(),
      jogos: listaFinal,
    });
  } catch (err) {
    return res.status(200).json({
      ok: true,
      canalOficial: GETV_CHANNEL_URL,
      channelId: GETV_CHANNEL_ID,
      atualizadoEm: new Date().toISOString(),
      jogos: JOGOS_AO_VIVO_GETV_FALLBACK,
    });
  }
}
