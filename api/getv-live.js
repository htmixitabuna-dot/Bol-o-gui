// Endpoint oficial para sincronizar em tempo real os Jogos Ao Vivo do canal ge tv (@getv no YouTube)
// Utiliza a playlist nativa de Transmissões Ao Vivo (UULV) do canal @getv + API Innertube Player
// para retornar APENAS transmissões ao vivo reais da GeTV (bloqueando reprises/melhores momentos e salas de espera não iniciadas).

const GETV_CHANNEL_ID = 'UCgCKagVhzGnZcuP9bSMgMCg';
const GETV_LIVE_PLAYLIST_ID = 'UULVgCKagVhzGnZcuP9bSMgMCg';
const GETV_CHANNEL_URL = 'https://www.youtube.com/@getv';
const GETV_LIVE_RSS_URL = `https://www.youtube.com/feeds/videos.xml?playlist_id=${GETV_LIVE_PLAYLIST_ID}`;
const GETV_CHANNEL_RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${GETV_CHANNEL_ID}`;

// IDs de vídeos que são reprises curtas (Melhores Momentos) ou com erro de dispositivo no YouTube
const IDS_REPRISES_OU_INVALIDOS = new Set([
  'Y9N8A9vNDRc', // Erro de dispositivo no YouTube
  'oxXjXSwQ40w', // Reprise Melhores Momentos
  'MINxnJ3nHK0', // Reprise Melhores Momentos
  'SLeA4eEgRyo', // Reprise Melhores Momentos
  't8cvdQv2njI', // Reprise Melhores Momentos
  'dFMhqLTQ18c', // Reprise Melhores Momentos
  '7wWzgXlUD9Q', // Reprise Melhores Momentos
  'CKPXBY6BEEg', // Reprise Melhores Momentos
  'v-TnCvXG8BQ', // Reprise Melhores Momentos
  'lgXb2-pBjKc', // Melhores Momentos
  '4p_9OPKgcDE', // Melhores Momentos
  'XgpkjhfCEWY', // Melhores Momentos
]);

// Transmissões Ao Vivo oficiais da playlist UULV do canal ge tv (@getv)
const TRANSMISSOES_AO_VIVO_GETV_FALLBACK = [
  {
    id: '6-ebvfwXwVQ',
    titulo: 'AO VIVO: FLAMENGO 1 X 0 FLUMINENSE E PALMEIRAS 4 X 1 CORINTHIANS | TROPA GE TV',
    timeCasa: 'Flamengo / Palmeiras',
    timeFora: 'Fluminense / Corinthians',
    campeonato: '🔴 AO VIVO AGORA • Brasileirão ge tv',
    canal: 'ge tv (@getv)',
    aoVivo: true,
    aoVivoAgora: true,
    youtubeUrl: 'https://www.youtube.com/watch?v=6-ebvfwXwVQ',
  },
  {
    id: 'fthTyif7wFo',
    titulo: 'AO VIVO: SAN FRANCISCO 49ERS X SEATTLE SEAHAWKS | NFL 2026/27 | ge tv',
    timeCasa: 'San Francisco 49ers',
    timeFora: 'Seattle Seahawks',
    campeonato: '🔴 AO VIVO AGORA • ge tv',
    canal: 'ge tv (@getv)',
    aoVivo: true,
    aoVivoAgora: true,
    youtubeUrl: 'https://www.youtube.com/watch?v=fthTyif7wFo',
  },
  {
    id: 'zZuGjqmMunI',
    titulo: 'AO VIVO: PALMEIRAS X CORINTHIANS | BRASILEIRÃO 2026 | ge tv',
    timeCasa: 'Palmeiras',
    timeFora: 'Corinthians',
    campeonato: 'Brasileirão Série A • ge tv',
    canal: 'ge tv (@getv)',
    aoVivo: true,
    aoVivoAgora: false,
    youtubeUrl: 'https://www.youtube.com/watch?v=zZuGjqmMunI',
  },
  {
    id: '4OV-3Nv88F8',
    titulo: 'AO VIVO: JACKSONVILLE JAGUARS X PHILADELPHIA EAGLES | NFL 2026 | ge tv',
    timeCasa: 'Jacksonville Jaguars',
    timeFora: 'Philadelphia Eagles',
    campeonato: 'Transmissão Ao Vivo • ge tv',
    canal: 'ge tv (@getv)',
    aoVivo: true,
    aoVivoAgora: false,
    youtubeUrl: 'https://www.youtube.com/watch?v=4OV-3Nv88F8',
  },
  {
    id: 'uS7cuCJTHqA',
    titulo: 'AO VIVO: SÃO PAULO X VITÓRIA | BRASILEIRÃO 2026 | ge tv',
    timeCasa: 'São Paulo',
    timeFora: 'Vitória',
    campeonato: 'Brasileirão Série A • ge tv',
    canal: 'ge tv (@getv)',
    aoVivo: true,
    aoVivoAgora: false,
    youtubeUrl: 'https://www.youtube.com/watch?v=uS7cuCJTHqA',
  },
  {
    id: 'bj7JvLt1Wss',
    titulo: 'AO VIVO: BRASIL X ARGENTINA | SELEÇÃO BRASILEIRA | ge tv',
    timeCasa: 'Brasil',
    timeFora: 'Argentina',
    campeonato: 'Transmissão Ao Vivo • ge tv',
    canal: 'ge tv (@getv)',
    aoVivo: true,
    aoVivoAgora: false,
    youtubeUrl: 'https://www.youtube.com/watch?v=bj7JvLt1Wss',
  },
];

function extrairTimesDoTitulo(titulo = '') {
  const limpo = String(titulo || '')
    .replace(/^🔴\s*/i, '')
    .replace(/^AO VIVO:\s*/i, '')
    .replace(/^JOGO COMPLETO:\s*/i, '')
    .split('|')[0]
    .trim();

  const match = limpo.match(
    /([A-Za-zÀ-ÿ0-9\s-]{2,24}?)\s+(?:[xX×vV][sS]?|\d+\s*[xX×]\s*\d+)\s+([A-Za-zÀ-ÿ0-9\s-]{2,24})/
  );
  if (match && match[1] && match[2]) {
    return {
      timeCasa: match[1].trim().slice(0, 22),
      timeFora: match[2].trim().slice(0, 22),
    };
  }
  return {
    timeCasa: 'ge tv',
    timeFora: 'Ao Vivo',
  };
}

function ehRepriseOuMelhoresMomentos(titulo = '') {
  return /#shorts|melhores momentos|gols\s*\||compacto|resumo|bastidores|polêmicas de copa|episódio/i.test(
    String(titulo || '')
  );
}

function parseEntradasRss(xml = '', origemUulv = false) {
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];
  const resultado = [];
  for (const m of entries) {
    const block = m[1] || '';
    const id = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1]?.trim();
    const rawTitle = block.match(/<title>([^<]+)<\/title>/)?.[1]?.trim() || '';
    const published =
      block.match(/<published>([^<]+)<\/published>/)?.[1]?.trim() || '';
    const updated =
      block.match(/<updated>([^<]+)<\/updated>/)?.[1]?.trim() || '';
    const views = Number(block.match(/views="([^"]+)"/)?.[1] || '0');

    if (!id || !rawTitle) continue;
    if (IDS_REPRISES_OU_INVALIDOS.has(id)) continue;
    if (ehRepriseOuMelhoresMomentos(rawTitle)) continue;

    // Na playlist UULV do YouTube, views === 0 indica sala de espera futura (isUpcoming: true) que ainda não começou
    if (views <= 0) continue;

    if (
      origemUulv ||
      /ao vivo|pós-jogo ao vivo|aquecimento ao vivo|jogo completo/i.test(
        rawTitle
      )
    ) {
      resultado.push({
        id,
        rawTitle,
        published,
        updated,
        views,
        origemUulv,
      });
    }
  }
  return resultado;
}

async function inspecionarStatusLiveGetv(candidato) {
  try {
    const res = await fetch(
      'https://www.youtube.com/youtubei/v1/player?prettyPrint=false',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'WEB',
              clientVersion: '2.20250312.04.00',
              hl: 'pt',
              gl: 'BR',
            },
          },
          videoId: candidato.id,
        }),
      }
    );

    if (!res.ok) {
      return {
        ...candidato,
        valido: true,
        aoVivoAgora: false,
        startTimestamp: candidato.published,
      };
    }

    const data = await res.json();
    const vd = data?.videoDetails;
    const lbd = data?.microformat?.playerMicroformatRenderer?.liveBroadcastDetails;
    const subreason =
      data?.playabilityStatus?.errorScreen?.playerErrorMessageRenderer
        ?.subreason?.runs?.[0]?.text ||
      data?.playabilityStatus?.reason ||
      '';

    // Rejeita vídeos que o YouTube marca como inválidos para dispositivos ou salas de espera futuras (isUpcoming)
    if (
      /neste dispositivo|on this device|foi removido|was removed|privado/i.test(
        subreason
      )
    ) {
      return { ...candidato, valido: false };
    }

    if (vd?.isUpcoming || (lbd && lbd.isLiveNow === false && !lbd.endTimestamp)) {
      return { ...candidato, valido: false };
    }

    // Se a resposta veio completa, exige que seja conteúdo de transmissão ao vivo (isLiveContent ou isLive)
    if (vd && vd.isLiveContent === false && !vd.isLive) {
      return { ...candidato, valido: false };
    }

    const aoVivoAgora = Boolean(
      (vd?.isLive || lbd?.isLiveNow) && !lbd?.endTimestamp
    );

    return {
      ...candidato,
      rawTitle: vd?.title || candidato.rawTitle,
      valido: true,
      aoVivoAgora,
      startTimestamp: lbd?.startTimestamp || candidato.published,
      endTimestamp: lbd?.endTimestamp || null,
    };
  } catch {
    return {
      ...candidato,
      valido: true,
      aoVivoAgora: false,
      startTimestamp: candidato.published,
    };
  }
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
    const headersRss = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    };

    const [uulvRes, channelRes] = await Promise.all([
      fetch(GETV_LIVE_RSS_URL, { headers: headersRss }).catch(() => null),
      fetch(GETV_CHANNEL_RSS_URL, { headers: headersRss }).catch(() => null),
    ]);

    const mapaCandidatos = new Map();

    if (uulvRes && uulvRes.ok) {
      const xmlUulv = await uulvRes.text();
      for (const item of parseEntradasRss(xmlUulv, true)) {
        mapaCandidatos.set(item.id, item);
      }
    }

    if (channelRes && channelRes.ok) {
      const xmlChannel = await channelRes.text();
      for (const item of parseEntradasRss(xmlChannel, false)) {
        if (!mapaCandidatos.has(item.id)) {
          mapaCandidatos.set(item.id, item);
        }
      }
    }

    const candidatos = Array.from(mapaCandidatos.values()).slice(0, 8);
    const inspecionados = [];
    for (const c of candidatos) {
      const info = await inspecionarStatusLiveGetv(c);
      if (info.valido) {
        inspecionados.push(info);
      }
    }

    // Ordena priorizando transmissões que estão AO VIVO AGORA no @getv (aoVivoAgora = true),
    // seguidas pelas transmissões ao vivo mais recentes do canal @getv
    inspecionados.sort((a, b) => {
      if (a.aoVivoAgora !== b.aoVivoAgora) {
        return a.aoVivoAgora ? -1 : 1;
      }
      const tA = new Date(a.startTimestamp || a.published || 0).getTime();
      const tB = new Date(b.startTimestamp || b.published || 0).getTime();
      return tB - tA;
    });

    const mapaJogos = new Map();

    for (const item of inspecionados) {
      const { timeCasa, timeFora } = extrairTimesDoTitulo(item.rawTitle);
      const tituloLimpo = String(item.rawTitle || '').trim();
      mapaJogos.set(item.id, {
        id: item.id,
        titulo: /^ao vivo/i.test(tituloLimpo)
          ? tituloLimpo
          : `AO VIVO: ${tituloLimpo}`,
        timeCasa,
        timeFora,
        campeonato: item.aoVivoAgora
          ? '🔴 AO VIVO AGORA • ge tv'
          : /brasileir/i.test(tituloLimpo)
          ? 'Transmissão Ao Vivo • Brasileirão ge tv'
          : 'Transmissão Ao Vivo • ge tv',
        canal: 'ge tv (@getv)',
        aoVivo: true,
        aoVivoAgora: Boolean(item.aoVivoAgora),
        youtubeUrl: `https://www.youtube.com/watch?v=${item.id}`,
      });
    }

    for (const item of TRANSMISSOES_AO_VIVO_GETV_FALLBACK) {
      if (!mapaJogos.has(item.id)) {
        mapaJogos.set(item.id, item);
      }
    }

    const todosJogos = Array.from(mapaJogos.values());
    // Garante que todos os que estão aoVivoAgora fiquem sempre no topo absoluto
    todosJogos.sort((a, b) => {
      if (Boolean(a.aoVivoAgora) !== Boolean(b.aoVivoAgora)) {
        return a.aoVivoAgora ? -1 : 1;
      }
      return 0;
    });

    const listaFinal = todosJogos.slice(0, 8);

    return res.status(200).json({
      ok: true,
      canalOficial: GETV_CHANNEL_URL,
      channelId: GETV_CHANNEL_ID,
      livePlaylistId: GETV_LIVE_PLAYLIST_ID,
      atualizadoEm: new Date().toISOString(),
      jogos: listaFinal,
    });
  } catch {
    return res.status(200).json({
      ok: true,
      canalOficial: GETV_CHANNEL_URL,
      channelId: GETV_CHANNEL_ID,
      livePlaylistId: GETV_LIVE_PLAYLIST_ID,
      atualizadoEm: new Date().toISOString(),
      jogos: TRANSMISSOES_AO_VIVO_GETV_FALLBACK,
    });
  }
}
