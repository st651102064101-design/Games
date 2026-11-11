/**
 * Frostline casual PvP presence relay.
 * Netlify Blobs provides cross-device fallback when direct WebRTC discovery fails.
 * This is not an authoritative game server and must not be used for ranked PvP.
 */
import {getStore} from '@netlify/blobs';

const ROOM = 'arena-v3-3/';
const VISIBLE_MS = 14000;
const CLEANUP_MS = 90000;
const MAX_PLAYERS = 32;
const MAX_LIST = 96;
const HEADERS = {'Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff'};
const ID_RE = /^f[a-z0-9]{8,36}$/;
const num = (v, def, lo, hi) => Number.isFinite(Number(v)) ? Math.max(lo,Math.min(hi,Number(v))) : def;
const respond = (body,status=200) => Response.json(body,{status,headers:HEADERS});
const cleanText = (v) => String(v||'นักล่า').replace(/[<>\u0000-\u001f]/g,'').slice(0,28);
const storage = () => getStore({name:'frostline-public-pvp',consistency:'strong'});

export default async function handler(request) {
  if (request.method === 'GET') return respond({ok:true,game:'Frostline',service:'cross-device-pvp-relay',version:1});
  if (request.method !== 'POST') return respond({error:'Method not allowed'},405);
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return respond({error:'Origin not allowed'},403);
  if (!(request.headers.get('content-type')||'').startsWith('application/json')) return respond({error:'JSON required'},415);
  const raw = await request.text();
  if (raw.length > 5500) return respond({error:'Payload too large'},413);
  let body;
  try { body = JSON.parse(raw); } catch { return respond({error:'Invalid JSON'},400); }
  if (!body || !ID_RE.test(body.id||'')) return respond({error:'Invalid player ID'},400);
  const key = ROOM + body.id;
  try {
    const store = storage();
    if (body.kind === 'leave') {
      await store.delete(key);
      return respond({ok:true,left:true});
    }
    if (body.kind !== 'state' || !body.alive) return respond({error:'Expected player state'},400);
    const now = Date.now();
    const blades = Array.isArray(body.blades) ? body.blades.slice(0,24).map(b=>({
      a:num(b.a,0,-100000,100000),reach:num(b.reach,80,35,220),damage:num(b.damage,12,3,120)
    })) : [];
    const me = {
      id:body.id,kind:'state',alive:true,name:cleanText(body.name),
      x:num(body.x,0,-1800,1800),y:num(body.y,0,-1800,1800),
      hp:num(body.hp,100,0,10000),maxHp:num(body.maxHp,125,1,10000),
      angle:num(body.angle,0,-100000,100000),count:num(body.count,1,1,24),
      reach:num(body.reach,80,40,220),damage:num(body.damage,15,3,120),blades,
      updatedAt:now
    };
    await store.setJSON(key, me);
    const listing = await store.list({prefix:ROOM});
    // Cap reads to keep server costs bounded for the casual public arena.
    const entries = listing.blobs.filter(b=>b.key !== key).slice(0,MAX_LIST);
    const values = await Promise.all(entries.map(async b=>{
      try { return {key:b.key,value:await store.get(b.key,{type:'json'})}; }
      catch { return null; }
    }));
    const active = [], stale = [];
    for (const item of values) {
      if (!item?.value || !ID_RE.test(item.value.id||'')) continue;
      const age = now - Number(item.value.updatedAt||0);
      if (age >= 0 && age < VISIBLE_MS && item.value.alive) active.push(item.value);
      else if (age > CLEANUP_MS && stale.length < 3) stale.push(item.key);
    }
    if (stale.length) await Promise.allSettled(stale.map(k=>store.delete(k)));
    return respond({ok:true,transport:'netlify',players:active.slice(0,MAX_PLAYERS-1),count:active.length+1,serverTime:now});
  } catch(error) {
    console.error('[Frostline] PvP fallback error:',error);
    return respond({ok:false,error:'Server presence temporarily unavailable'},503);
  }
}

export const config = {path:'/api/frostline-pvp'};
