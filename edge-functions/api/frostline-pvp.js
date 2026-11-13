function bearFields(body,now){
 const text=v=>String(v||'').slice(0,100),valid=v=>typeof v==='string'&&/^f[a-z0-9]{8,36}b\d+$/.test(v),coord=v=>num(v,0,-10125,10125);
 const wound=w=>({id:text(w.id),x:num(w.x,0,-35,50),y:num(w.y,0,-25,25),a:num(w.a,0,-100,100),at:num(w.at,now,now-30000,now+1000),size:num(w.size,3,1,12)});
 const attack=a=>a&&['swat','bite','charge','press'].includes(a.kind)?{id:text(a.id),hit:Array.isArray(a.hit)?a.hit.slice(0,64).filter(id=>typeof id==='string').map(text):[],kind:a.kind,side:a.side<0?-1:1,at:num(a.at,now,now-6000,now+1000),windup:num(a.windup,.5,.3,1),active:num(a.active,.28,.15,.8),recovery:num(a.recovery,.65,.3,1.5)}:null;
 return {bears:Array.isArray(body.bears)?body.bears.slice(0,32).filter(m=>m&&valid(m.id)&&['bear','polar'].includes(m.beast)).map(m=>({id:m.id,x:coord(m.x),y:coord(m.y),facing:num(m.facing,0,-1e6,1e6),walk:num(m.walk,0,-1e9,1e9),hp:num(m.hp,1,0,1e6),maxHp:num(m.maxHp,1,1,1e6),r:num(m.r,26,15,60),speed:num(m.speed,65,10,200),damage:num(m.damage,18,1,200),beast:m.beast,boss:!!m.boss,titan:!!m.titan,elite:!!m.elite,stage:num(m.stage,1,1,10000),attackSerial:num(m.attackSerial,0,0,1e12),woundSerial:num(m.woundSerial,0,0,1e12),wounds:Array.isArray(m.wounds)?m.wounds.slice(-8).filter(w=>w&&typeof w.id==='string').map(wound):[],hurt:m.hurt?{at:num(m.hurt.at,now,now-3000,now+1000),nx:num(m.hurt.nx,1,-1,1),ny:num(m.hurt.ny,0,-1,1),force:num(m.hurt.force,0,0,140)}:null,attack:attack(m.attack)})):null,
 bearActions:Array.isArray(body.bearActions)?body.bearActions.slice(-48).filter(e=>e&&typeof e.id==='string'&&e.id.startsWith(body.id+'u')&&valid(e.bear)).map(e=>({id:text(e.id),bear:e.bear,weapon:text(e.weapon),damage:num(e.damage,0,0,1800),x:coord(e.x),y:coord(e.y),a:num(e.a,0,-100,100),phase:num(e.phase,0,-1e9,1e9),t:num(e.t,now,now-6000,now+1000),bleed:e.bleed===true})):[],
 bearDeaths:Array.isArray(body.bearDeaths)?body.bearDeaths.slice(-48).filter(e=>e&&valid(e.id)).map(e=>({id:e.id,t:num(e.t,now,now-6000,now+1000),x:coord(e.x),y:coord(e.y),boss:!!e.boss,stage:num(e.stage,1,1,10000)})):[],
 bearHits:Array.isArray(body.bearHits)?body.bearHits.slice(-32).filter(e=>e&&typeof e.id==='string'&&/^f[a-z0-9]{8,36}$/.test(e.to)).map(e=>({id:text(e.id),to:e.to,t:num(e.t,now,now-6000,now+1000),x:coord(e.x),y:coord(e.y),r:num(e.r,12,8,25),a:num(e.a,0,-100,100),kind:['swat','bite','charge','press'].includes(e.kind)?e.kind:'swat',damage:num(e.damage,18,1,230),force:num(e.force,100,0,300)})):[]};
}
function npcFields(body,now){
 const boundedId=v=>typeof v==='string'?v.slice(0,100):'';
 return {npcs:Array.isArray(body.npcs)?body.npcs.slice(0,24).filter(b=>b&&/^bot\d+$/.test(b.id)).map(b=>({id:b.id,name:String(b.name||b.id).slice(0,25),generation:num(b.generation,0,0,1e9),x:num(b.x,0,-10125,10125),y:num(b.y,0,-10125,10125),s:num(b.s,0,-1e9,1e9),hp:num(b.hp,240,0,1e6),maxHp:num(b.maxHp,240,1,1e6),blades:num(b.blades,4,0,10000),bladeLayout:Array.isArray(b.bladeLayout)?b.bladeLayout.slice(0,60).filter(w=>w&&typeof w.id==='string'&&w.id.startsWith(b.id+':')).map(w=>({id:w.id.slice(0,100),base:num(w.base,0,0,7),o:num(w.o,0,-1,8),v:num(w.v,0,-20,20)})):null,level:num(b.level,1,1,10000),dead:num(b.dead,0,0,6),dir:b.dir<0?-1:1,walk:num(b.walk,0,-1e9,1e9),mx:num(b.mx,0,-1200,1200),my:num(b.my,0,-1200,1200),hurt:cleanPose({hurt:b.hurt}).hurt,warp:cleanPose({dash:b.warp}).dash})):null,
 npcActions:Array.isArray(body.npcActions)?body.npcActions.slice(-48).filter(e=>e&&typeof e.id==='string'&&e.id.startsWith(body.id+'n')&&/^bot\d+$/.test(e.bot)).map(e=>({id:boundedId(e.id),bot:e.bot,generation:num(e.generation,0,0,1e9),damage:num(e.damage,0,0,6000),loss:num(e.loss,0,0,60),bladeIds:Array.isArray(e.bladeIds)?e.bladeIds.slice(0,60).filter(id=>typeof id==='string'&&id.startsWith(e.bot+':')).map(id=>id.slice(0,100)):[],t:num(e.t,now,now-6000,now+1000)})):[],
 npcAwards:Array.isArray(body.npcAwards)?body.npcAwards.slice(-48).filter(e=>e&&typeof e.id==='string'&&e.id.startsWith(body.id+'a')).map(e=>({id:boundedId(e.id),to:boundedId(e.to),t:num(e.t,now,now-6000,now+1000)})):[]};
}
function cleanPose(p){
 const d=p?.dash,h=p?.hurt;
 return {dash:d&&Number.isFinite(d.age)?{x0:num(d.x0,0,-10125,10125),y0:num(d.y0,0,-10125,10125),x1:num(d.x1,0,-10125,10125),y1:num(d.y1,0,-10125,10125),out:num(d.out,.2,.1,1),inDur:num(d.inDur,.25,.1,1),age:num(d.age,0,0,2)}:null,
 hurt:h&&Number.isFinite(h.age)?{serial:num(h.serial,0,0,1e12),kind:h.kind==='clash'?'clash':'hurt',zone:['head','shoulder','torso','legs'].includes(h.zone)?h.zone:'torso',x:num(h.x,0,-10125,10125),y:num(h.y,0,-10125,10125),age:num(h.age,0,0,2),nx:num(h.nx,1,-1,1),force:num(h.force,0,0,1000)}:null};
}
/**
 * Frostline EdgeOne Makers cross-device PvP fallback.
 * Route /api/frostline-pvp, uses zero-config @edgeone/pages-blob with strong reads.
 * P2P remains primary; this is a best-effort, non-authoritative relay.
 */
import {getStore} from '@edgeone/pages-blob';
const ROOM='arena-v3-6/',STORE='frostline-public-pvp',LIVE=14000,MAX=32;
const validId=id=>typeof id==='string'&&/^f[a-z0-9]{8,36}$/.test(id);
const num=(v,f,min,max)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):f;
const ok=(obj,status=200)=>Response.json(obj,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const cleanName=v=>String(v||'นักล่า').replace(/[<>\u0000-\u001f]/g,'').slice(0,25);

const LOOT_TYPES=new Set(['weapon','ability','coin','plus','speed','xp','meat','hide','bone','claw','frost']);
const cleanLootWeapon=w=>{
 if(!w||typeof w!=='object')return null;
 if(w.id&&w.type===undefined)return {id:String(w.id).slice(0,45)};
 if(!/^ars(0[1-9]|[12][0-9]|30)$/.test(w.type||''))return null;
 return {id:String(w.id||'loot').slice(0,80),type:w.type,rarity:['common','rare','epic','legendary'].includes(w.rarity)?w.rarity:'common',
  damage:num(w.damage,12,1,600),reach:num(w.reach,90,35,180),rate:num(w.rate,1,.3,2.5),
  crit:num(w.crit,5,0,60),element:['normal','ice','fire','bleed'].includes(w.element)?w.element:'normal',
  fromBoss:w.fromBoss===true};
};
const cleanLootCoords=d=>({
 x:num(d.x,0,-10125,10125),y:num(d.y,0,-10125,10125),
 type:LOOT_TYPES.has(d.type)?d.type:'xp',
 amt:num(d.amt,1,1,100),weapon:cleanLootWeapon(d.weapon)
});
const cleanLootDrop=d=>{
 if(!d||typeof d.id!=='string'||!/^[a-zA-Z0-9_:-]{3,100}$/.test(d.id)||!LOOT_TYPES.has(d.type))return null;
 return {id:d.id,...cleanLootCoords(d),glow:num(d.glow,0,0,7),vx:num(d.vx,0,-1200,1200),
  vy:num(d.vy,0,-1200,1200),age:num(d.age,0,-1,160),bounce:num(d.bounce,.35,.1,.8)};
};
const cleanLootEvent=(e,now)=>{
 if(!e||typeof e.id!=='string'||!/^[a-zA-Z0-9_:-]{3,100}$/.test(e.id)||!['add','del','req'].includes(e.op))return null;
 const drop=e.op==='del'?(typeof e.drop?.id==='string'?{id:e.drop.id.slice(0,100)}:null)
  :e.op==='req'&&e.drop&&LOOT_TYPES.has(e.drop.type)?cleanLootCoords(e.drop):cleanLootDrop(e.drop);
 if(!drop)return null;
 return {id:e.id,op:e.op,drop,t:num(e.t,now,now-10000,now+1000)};
};

const getData=(store,key)=>store.get(key,{type:'json',consistency:'strong'}).catch(()=>null);
export async function onRequest({request}){
 const origin=request.headers.get('origin');
 if(origin&&origin!==new URL(request.url).origin)return ok({ok:false,error:'Origin not allowed'},403);
 if(!['POST','GET'].includes(request.method))return ok({ok:false,error:'Method not allowed'},405);
 try{
  const store=getStore({name:STORE,consistency:'strong'}),now=Date.now();
  if(request.method==='GET'){
   const result=await store.list({prefix:ROOM,consistency:'strong'});
   const vals=await Promise.all(result.blobs.slice(0,64).map(x=>getData(store,x.key)));
   return ok({ok:true,transport:'edgeone-blob',count:vals.filter(v=>v?.alive&&v.life?.phase!=='dead'&&validId(v.id)&&now-v.updatedAt>=0&&now-v.updatedAt<LIVE).length,serverTime:now});
  }
  if(!(request.headers.get('content-type')||'').startsWith('application/json'))return ok({ok:false,error:'JSON required'},415);
  const raw=await request.text();if(raw.length>196608)return ok({ok:false,error:'Payload too large'},413);
  let body;try{body=JSON.parse(raw)}catch{return ok({ok:false,error:'Invalid JSON'},400)}
  if(!body||!validId(body.id))return ok({ok:false,error:'Invalid player ID'},400);
  const matchBand=num(body.matchBand,0,0,3)|0,roomPrefix=ROOM+'band-'+matchBand+'/';const key=roomPrefix+body.id;
  if(body.kind==='leave'){await store.delete(key);return ok({ok:true,left:true})}
  if(body.kind!=='state'||!body.alive||!Array.isArray(body.samples)||!body.samples.length)
   return ok({ok:false,error:'State samples required'},400);
  const samples=body.samples.slice(-14).map(s=>({
   t:num(s?.t,now,0,4e12),x:num(s?.x,0,-10125,10125),y:num(s?.y,0,-10125,10125),
   vx:num(s?.vx,0,-1200,1200),vy:num(s?.vy,0,-1200,1200),
   s:num(s?.s,0,-1e9,1e9),w:num(s?.w,6,-620,620),h:num(s?.h,100,0,10000),
   em:typeof s?.em==='string'&&s.em.length<=24?s.em:'',es:num(s?.es,0,0,1e8)
  })).sort((a,b)=>a.t-b.t);
  const weapon=v=>/^ars(0[1-9]|[12][0-9]|30)$/.test(v)?v:'ars01';
  const blades=Array.isArray(body.blades)?body.blades.slice(0,60).map(b=>({
   id:String(b?.id||'').slice(0,100),o:num(b?.o,0,-1e4,1e4),m:num(b?.m,1,.1,5),
   reach:num(b?.reach,80,35,220),damage:num(b?.damage,12,0,600),
   durability:num(b?.durability,100,100,800),wear:num(b?.wear,0,0,8),fire:b?.fire?{recoil:num(b.fire.recoil,0,-2,8),flash:num(b.fire.flash,0,0,.15),reload:num(b.fire.reload,0,0,5)}:null,speed:num(b?.speed,6,-620,620),count:num(b?.count,1,1,10000),type:weapon(b?.type),
   rarity:['common','rare','epic','legendary'].includes(b?.rarity)?b.rarity:'common'
  })):[];
  let me={matchBand,
   kind:'state',id:body.id,alive:true,name:cleanName(body.name),
   seq:num(body.seq,0,0,1e12),maxHp:num(body.maxHp,250,1,10000),
      life:{phase:['alive','rescue','down','rise','dead'].includes(body.life?.phase)?body.life.phase:'alive',at:num(body.life?.at,now,0,4e12),serial:num(body.life?.serial,0,0,1e9)},
      growS:num(body.growS,1,1,1.7),...npcFields(body,now),...bearFields(body,now),
      flights:Array.isArray(body.flights)?body.flights.slice(-128).filter(f=>f&&typeof f.id==='string'&&f.id.startsWith(body.id+'f')).map(f=>({id:f.id.slice(0,100),t:num(f.t,now,now-6000,now+1000),x:num(f.x,0,-10125,10125),y:num(f.y,0,-10125,10125),z:num(f.z,0,0,800),vx:num(f.vx,0,-1200,1200),vy:num(f.vy,0,-1200,1200),vz:num(f.vz,0,-1200,1200),a:num(f.a,0,-1e5,1e5),spin:num(f.spin,0,-100,100),life:num(f.life,0,0,3.2),stuck:f.stuck===true,waterDepth:num(f.waterDepth,0,0,15),rarity:['common','rare','epic','legendary'].includes(f.rarity)?f.rarity:'common',scale:num(f.scale,1,1,1.7),wc:['steel','bone','ice','blood'].includes(f.wc)?f.wc:'steel',type:f.type==='main'?'main':/^ars(0[1-9]|[12][0-9]|30)$/.test(f.type)?f.type:'ars11'})):[],
      pose:cleanPose(body.pose),
      dog:body.dog&&Number.isFinite(body.dog.x)&&Number.isFinite(body.dog.y)?{x:num(body.dog.x,0,-10125,10125),y:num(body.dog.y,0,-10125,10125),dir:body.dog.dir<0?-1:1,walk:num(body.dog.walk,0,-1e9,1e9),moving:body.dog.moving===true,state:body.dog.state==='sacrifice'?'sacrifice':'follow'}:null,
    weaponTotal:num(body.weaponTotal,0,0,10000),joinedAt:num(body.joinedAt,now,now-28800000,now+60000),roomEpoch:num(body.roomEpoch,now,now-28800000,now+60000),
    lootEvents:Array.isArray(body.lootEvents)?body.lootEvents.slice(-28).map(e=>cleanLootEvent(e,now)).filter(Boolean):[],
    lootSnapshot:Array.isArray(body.lootSnapshot)?body.lootSnapshot.slice(0,36).map(cleanLootDrop).filter(Boolean):[],
   samples,blades,look:{
    boots:num(body.look?.boots,1,1,8),bag:num(body.look?.bag,1,1,8),armor:num(body.look?.armor,1,1,8),
    furArmor:body.look?.furArmor===true,leatherPack:body.look?.leatherPack===true,
    level:num(body.look?.level,1,1,1000),weapon:['steel','bone','ice','blood'].includes(body.look?.weapon)?body.look.weapon:'steel',
    skin:String(body.look?.skin||'scout').slice(0,24)
   },
   shots:Array.isArray(body.shots)?body.shots.slice(-18).filter(b=>b&&typeof b.id==='string'&&/^ars(2[1-9]|30)$/.test(b.type)).map(b=>({
    id:b.id.slice(0,100),type:b.type,x:num(b.x,0,-10125,10125),y:num(b.y,0,-10125,10125),
    a:num(b.a,0,-100,100),damage:num(b.damage,10,1,600),rays:b.rays===8?8:1,
    t:num(b.t,now,now-5000,now+1000)
   })):[],
   clashes:Array.isArray(body.clashes)?body.clashes.slice(-18).filter(c=>c&&typeof c.id==='string'&&validId(c.to)).map(c=>({
    id:c.id.slice(0,100),to:c.to,blade:String(c.blade||'').slice(0,100),wears:Array.isArray(c.wears)?c.wears.slice(0,60).filter(w=>w&&typeof w.id==='string').map(w=>({id:w.id.slice(0,100),wear:num(w.wear,0,0,8)})):[],...(Array.isArray(c.blades)?{blades:c.blades.slice(0,24).filter(v=>typeof v==='string').map(v=>v.slice(0,100))}:{}),type:String(c.type||'ars01').slice(0,20),
    x:num(c.x,0,-10125,10125),y:num(c.y,0,-10125,10125),amount:num(c.amount,1,1,24),t:num(c.t,now,now-5000,now+1000)
   })):[],updatedAt:now
  };
  const previous=await store.get(key,{type:'json'}).catch(()=>null);if(previous&&(previous.joinedAt>me.joinedAt||previous.joinedAt===me.joinedAt&&previous.seq>me.seq))me=previous;await store.setJSON(key,me);
  const listing=await store.list({prefix:roomPrefix,consistency:'strong'});
  const entries=listing.blobs.filter(b=>b.key!==key).slice(0,64);
  const values=await Promise.all(entries.map(b=>getData(store,b.key)));
  const active=[],stale=[];
  for(let i=0;i<values.length;i++){
   const v=values[i];if(!v||!validId(v.id))continue;
   const age=now-v.updatedAt;
   if(age>=0&&age<LIVE&&v.alive)active.push(v);
   else if(age>90000&&stale.length<3)stale.push(entries[i].key);
  }
  if(stale.length)await Promise.allSettled(stale.map(key=>store.delete(key)));
  return ok({ok:true,transport:'edgeone-blob',players:active.slice(0,MAX-1),count:active.filter(v=>v.life?.phase!=='dead').length+(me.life.phase==='dead'?0:1),serverTime:now});
 }catch(err){
  console.warn('[Frostline EdgeOne] relay failed',err);
  return ok({ok:false,error:'Relay temporarily unavailable'},503);
 }
}
