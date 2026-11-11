/**
 * SURVIVAL HUB shared analytics (7 games).
 * Uses one immutable Netlify Blob per event and one per anonymous browser ID.
 * This avoids lost-update races from read/modify/write aggregate counters.
 * This reports activity, NOT concurrent online players.
 */
import { createHash } from 'node:crypto';
import { getStore } from '@netlify/blobs';

const GAME_ORIGINS = Object.freeze({
  frostline: 'https://elegant-dusk-d20905.netlify.app',
  emberwood: 'https://astonishing-lokum-b67382.netlify.app',
  outpost: 'https://frostline-outpost-standalone.netlify.app',
  snowwood: 'https://roaring-moonbeam-aaef90.netlify.app',
  lastlight: 'https://singular-cactus-134b11.netlify.app',
  devourer: 'https://darling-haupia-1391a2.netlify.app',
  zebra: null,
});
const GAME_IDS = Object.keys(GAME_ORIGINS);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const METRIC_TYPES = {
  launches: 'launches',
  browsers: 'browsers',
  'game-visits': 'visits',
  'game-visitors': 'visitors',
  'game-starts': 'plays',
  'game-players': 'players',
};
const HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
};
function json(body, status=200, extra={}) {
  return Response.json(body, {status, headers:{...HEADERS,...extra}});
}
function getCors(origin, siteOrigin) {
  const allowed = origin && (origin === siteOrigin || Object.values(GAME_ORIGINS).includes(origin));
  return allowed ? {
    'Access-Control-Allow-Origin':origin,
    'Vary':'Origin',
    'Access-Control-Allow-Methods':'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type',
    'Access-Control-Max-Age':'3600',
  } : {};
}
function store() {
  // Keep the previously used name for continued totals on the same Netlify site.
  return getStore({name:'survival-hub-metrics', consistency:'strong'});
}
async function snapshot() {
  const games = Object.fromEntries(GAME_IDS.map(id=>[id,{
    launches:0,browsers:0,visits:0,visitors:0,plays:0,players:0,
    trackingActive:false,playTrackingActive:false
  }]));
  // One paginated list instead of six list operations per game.
  const listing = await store().list();
  for (const record of listing.blobs) {
    const pieces = String(record.key).split('/');
    if (pieces.length !== 3) continue;
    const [kind,id] = pieces;
    const property = METRIC_TYPES[kind];
    if (property && Object.hasOwn(games,id)) games[id][property]++;
  }
  for (const data of Object.values(games)) {
    data.trackingActive = data.visits > 0;
    data.playTrackingActive = data.plays > 0;
  }
  return {
    games,
    totalLaunches:Object.values(games).reduce((n,g)=>n+g.launches,0),
    totalRealVisits:Object.values(games).reduce((n,g)=>n+g.visits,0),
    totalGameStarts:Object.values(games).reduce((n,g)=>n+g.plays,0),
    measured:'hub-launches-and-opt-in-game-events',
    version:3,
  };
}
export default async function handler(request) {
  const requestURL = new URL(request.url);
  const origin = request.headers.get('origin');
  const cors = getCors(origin,requestURL.origin);
  if (request.method === 'OPTIONS') {
    if (!origin || !cors['Access-Control-Allow-Origin']) {
      return new Response(null,{status:403,headers:HEADERS});
    }
    return new Response(null,{status:204,headers:{...HEADERS,...cors}});
  }
  if (request.method === 'POST' && origin && !cors['Access-Control-Allow-Origin']) {
    return json({error:'Origin not allowed'},403);
  }
  try {
    if (request.method === 'GET') {
      return json(await snapshot(),200,cors);
    }
    if (request.method !== 'POST') {
      return json({error:'Method not allowed'},405,{...cors,Allow:'GET,POST,OPTIONS'});
    }
    if (!(request.headers.get('content-type')||'').includes('application/json')) {
      return json({error:'Content-Type must be application/json'},415,cors);
    }
    const raw = await request.text();
    if (raw.length > 450) return json({error:'Payload too large'},413,cors);
    let body;
    try { body = JSON.parse(raw); }
    catch { return json({error:'Invalid JSON'},400,cors); }
    const {game,browserId,launchId} = body || {};
    const event = body?.event || 'launch';
    if (!Object.hasOwn(GAME_ORIGINS,game) ||
        !UUID_RE.test(browserId||'') || !UUID_RE.test(launchId||'') ||
        !['launch','visit','start'].includes(event)) {
      return json({error:'Invalid tracking event'},400,cors);
    }
    if (origin && event === 'launch' && origin !== requestURL.origin) {
      return json({error:'Launch must come from HUB'},403,cors);
    }
    if (origin && event !== 'launch' &&
        origin !== requestURL.origin && origin !== GAME_ORIGINS[game]) {
      return json({error:'Game origin does not match'},403,cors);
    }
    const hash = createHash('sha256').update(browserId).digest('hex');
    const prefix = event === 'launch' ? 'launches' : event === 'visit' ? 'game-visits' : 'game-starts';
    const unique = event === 'launch' ? 'browsers' : event === 'visit' ? 'game-visitors' : 'game-players';
    const s = store();
    const [record, visitor] = await Promise.all([
      s.set(`${prefix}/${game}/${launchId}`,'1',{onlyIfNew:true}),
      s.set(`${unique}/${game}/${hash}`,'1',{onlyIfNew:true}),
    ]);
    return json({ok:true,event,recorded:record.modified,newBrowser:visitor.modified},200,cors);
  } catch (error) {
    console.error('[SURVIVAL HUB] Stats function failed:',error);
    return json({error:'Analytics service unavailable',code:'STORAGE_ERROR'},503,cors);
  }
}
// Make the endpoint work directly even without rewrite rules.
export const config = { path:'/api/stats' };
