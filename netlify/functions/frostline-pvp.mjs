/**
 * Frostline casual PvP presence relay.
 * Netlify Blobs provides cross-device fallback when direct WebRTC discovery fails.
 * Each player posts a short batch of timestamped samples (position, velocity, sword phase);
 * the relay returns the other players' latest batches so clients can interpolate smoothly.
 * This is not an authoritative game server and must not be used for ranked PvP.
 */
import {getStore} from '@netlify/blobs';

const ROOM = 'arena-v3-5/';
const VISIBLE_MS = 14000;
const CLEANUP_MS = 90000;
const MAX_PLAYERS = 32;
const MAX_LIST = 96;
const MAX_SAMPLES = 14;
const HEADERS = {'Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff'};
const ID_RE = /^f[a-z0-9]{8,36}$/;
const num = (v, def, lo, hi) => Number.isFinite(Number(v)) ? Math.max(lo,Math.min(hi,Number(v))) : def;
const respond = (body,status=200) => Response.json(body,{status,headers:HEADERS});
const cleanText = (v) => String(v||'นักล่า').replace(/[<>\u0000-\u001f]/g,'').slice(0,28);
const storage = () => getStore({name:'frostline-public-pvp',consistency:'strong'});

export default async function handler(request) {
  if (request.method === 'GET') return respond({ok:true,game:'Frostline',service:'cross-device-pvp-relay',version:3});
  if (request.method !== 'POST') return respond({error:'Method not allowed'},405);
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return respond({error:'Origin not allowed'},403);
  if (!(request.headers.get('content-type')||'').startsWith('application/json')) return respond({error:'JSON required'},415);
  const raw = await request.text();
  if (raw.length > 16000) return respond({error:'Payload too large'},413);
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
    if (body.kind !== 'state' || !body.alive || !Array.isArray(body.samples) || !body.samples.length) return respond({error:'Expected player state'},400);
    const now = Date.now();
    const samples = body.samples.slice(-MAX_SAMPLES).map(s=>({
      t:num(s?.t,now,0,4e12),x:num(s?.x,0,-1800,1800),y:num(s?.y,0,-1800,1800),
      vx:num(s?.vx,0,-1200,1200),vy:num(s?.vy,0,-1200,1200),
      s:num(s?.s,0,-1e9,1e9),w:num(s?.w,6,0,60),h:num(s?.h,100,0,10000)
    })).sort((a,b)=>a.t-b.t);
    const blades = Array.isArray(body.blades) ? body.blades.slice(0,24).map(b=>({
      id:String(b?.id||'').slice(0,100),o:num(b?.o,0,-1e4,1e4),m:num(b?.m,1,.1,5),reach:num(b?.reach,80,35,220),damage:num(b?.damage,12,3,120),
      type:/^ars(0[1-9]|[12][0-9]|30)$/.test(b?.type)?b.type:['main','sword','axe','spear','dagger','scythe','hammer'].includes(b?.type)?b.type:'main',
      rarity:['common','rare','epic','legendary'].includes(b?.rarity)?b.rarity:'common'
    })) : [];
    const me = {
      id:body.id,kind:'state',alive:true,name:cleanText(body.name),
      seq:num(body.seq,0,0,1e12),maxHp:num(body.maxHp,125,1,10000),samples,blades,
      look:{boots:num(body.look?.boots,1,1,8),bag:num(body.look?.bag,1,1,8),
        armor:num(body.look?.armor,1,1,8),furArmor:body.look?.furArmor===true,
        leatherPack:body.look?.leatherPack===true,level:num(body.look?.level,1,1,1000),
        weapon:['steel','bone','ice','blood'].includes(body.look?.weapon)?body.look.weapon:'steel'},
      shots:Array.isArray(body.shots)?body.shots.slice(-18).filter(b=>b&&typeof b.id==='string'&&/^ars(2[1-9]|30)$/.test(b.type)).map(b=>({id:b.id.slice(0,100),type:b.type,x:num(b.x,0,-1800,1800),y:num(b.y,0,-1800,1800),a:num(b.a,0,-100,100),damage:num(b.damage,10,1,600),t:num(b.t,now,now-5000,now+1000)})):[],
      clashes:Array.isArray(body.clashes)?body.clashes.slice(-6).filter(c=>c&&typeof c.id==='string'&&ID_RE.test(c.to||'')).map(c=>({id:c.id.slice(0,100),to:c.to,blade:String(c.blade||'').slice(0,100),type:String(c.type||'main').slice(0,20),t:num(c.t,now,now-5000,now+1000)})):[],
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

