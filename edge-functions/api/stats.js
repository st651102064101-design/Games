// SURVIVAL HUB shared analytics for EdgeOne Pages (Edge Function).
// Route: /api/stats   Storage: KV namespace bound to the project as `STATS_KV`.
// One immutable KV key per event (no read-modify-write races), plus one key per
// anonymous browser per game for the "unique" counters. Counts activity, not live players.

const GAME_IDS = ['frostline','emberwood','outpost','snowwood','lastlight','devourer','zebra','catdog'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEADERS = {'Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff'};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {status, headers:{...HEADERS,'Content-Type':'application/json; charset=utf-8'}});
}

function corsFor(origin, siteOrigin) {
  // Games are served from the same EdgeOne site as the hub, so only same-origin is allowed.
  return origin && origin === siteOrigin ? {
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '3600',
  } : {};
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Lists every key under a prefix (KV list is paginated).
async function countPrefix(kv, prefix) {
  let n = 0, cursor;
  do {
    const page = await kv.list({prefix, cursor});
    n += (page.keys || []).length;
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return n;
}

async function snapshot(kv) {
  const games = Object.fromEntries(GAME_IDS.map(id => [id, {
    launches:0, browsers:0, visits:0, visitors:0, plays:0, players:0,
    trackingActive:false, playTrackingActive:false,
  }]));
  const kinds = {launches:'launches', browsers:'browsers', visits:'game-visits', visitors:'game-visitors', plays:'game-starts', players:'game-players'};
  for (const id of GAME_IDS) {
    for (const [prop, kind] of Object.entries(kinds)) {
      games[id][prop] = await countPrefix(kv, `${kind}/${id}/`);
    }
    games[id].trackingActive = games[id].visits > 0;
    games[id].playTrackingActive = games[id].plays > 0;
  }
  const sum = key => Object.values(games).reduce((n, g) => n + g[key], 0);
  return {
    games,
    totalLaunches: sum('launches'),
    totalRealVisits: sum('visits'),
    totalGameStarts: sum('plays'),
    measured: 'hub-launches-and-opt-in-game-events',
    version: 4,
  };
}

export default async function onRequest(context) {
  const request = context.request;
  const kv = context.env && context.env.STATS_KV;
  const requestURL = new URL(request.url);
  const origin = request.headers.get('origin');
  const cors = corsFor(origin, requestURL.origin);

  if (request.method === 'OPTIONS') {
    if (!origin || !cors['Access-Control-Allow-Origin']) return new Response(null, {status:403, headers:HEADERS});
    return new Response(null, {status:204, headers:{...HEADERS, ...cors}});
  }
  if (!kv) return json({error:'Analytics storage not bound (STATS_KV)', code:'STORAGE_ERROR'}, 503);

  try {
    if (request.method === 'GET') {
      const body = await snapshot(kv);
      return new Response(JSON.stringify(body), {status:200, headers:{...HEADERS, ...cors, 'Content-Type':'application/json; charset=utf-8'}});
    }
    if (request.method !== 'POST') return json({error:'Method not allowed'}, 405);
    if (origin && !cors['Access-Control-Allow-Origin']) return json({error:'Origin not allowed'}, 403);
    if (!(request.headers.get('content-type') || '').includes('application/json')) {
      return json({error:'Content-Type must be application/json'}, 415);
    }
    const raw = await request.text();
    if (raw.length > 450) return json({error:'Payload too large'}, 413);
    let body;
    try { body = JSON.parse(raw); } catch { return json({error:'Invalid JSON'}, 400); }

    const {game, browserId, launchId} = body || {};
    const event = body?.event || 'launch';
    if (!GAME_IDS.includes(game) || !UUID_RE.test(browserId || '') || !UUID_RE.test(launchId || '') ||
        !['launch','visit','start'].includes(event)) {
      return json({error:'Invalid tracking event'}, 400);
    }
    if (event === 'launch' && origin && origin !== requestURL.origin) {
      return json({error:'Launch must come from HUB'}, 403);
    }

    const hash = await sha256Hex(browserId);
    const prefix = event === 'launch' ? 'launches' : event === 'visit' ? 'game-visits' : 'game-starts';
    const unique = event === 'launch' ? 'browsers' : event === 'visit' ? 'game-visitors' : 'game-players';
    const eventKey = `${prefix}/${game}/${launchId}`;
    const uniqueKey = `${unique}/${game}/${hash}`;

    const seenEvent = await kv.get(eventKey);
    if (seenEvent === null) await kv.put(eventKey, '1');
    const seenUnique = await kv.get(uniqueKey);
    const newBrowser = seenUnique === null;
    if (newBrowser) await kv.put(uniqueKey, '1');

    return json({ok:true, event, recorded: seenEvent === null, newBrowser}, 200);
  } catch (error) {
    console.error('[SURVIVAL HUB] Stats function failed:', error);
    return json({error:'Analytics service unavailable', code:'STORAGE_ERROR'}, 503);
  }
}
