import {getStore} from '@edgeone/pages-blob';
// City Devourer v3.1 — EdgeOne fallback for WebRTC.
const PREFIX='city-devourer-v3-1/',NAME='city-devourer-pvp',LIVE=16000,MAX=28;
const respond=(v,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const num=(v,f,min,max)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):f;
const validId=id=>typeof id==='string'&&/^cd[a-z0-9]{6,30}$/.test(id);
const roomName=r=>typeof r==='string'&&/^[\w-]{1,24}$/.test(r)?r:'public';
const read=(store,key)=>store.get(key,{type:'json',consistency:'strong'}).catch(()=>null);
export async function onRequest({request}){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return respond({ok:false,error:'Origin not allowed'},403);
 if(request.method==='GET')return respond({ok:true,service:'City Devourer v3.1 Cloud Relay'});
 if(request.method!=='POST')return respond({ok:false,error:'Method not allowed'},405);
 if(!(request.headers.get('content-type')||'').startsWith('application/json'))return respond({ok:false,error:'JSON required'},415);
 const raw=await request.text();if(raw.length>12500)return respond({ok:false,error:'Payload too large'},413);
 let b;try{b=JSON.parse(raw)}catch{return respond({ok:false,error:'Invalid JSON'},400)}
 if(!b||!validId(b.id))return respond({ok:false,error:'Invalid client ID'},400);
 const room=roomName(b.room),key=PREFIX+room+'/'+b.id;
 try{
  const store=getStore({name:NAME,consistency:'strong'}),now=Date.now();
  if(b.kind==='leave'){await store.delete(key);return respond({ok:true,left:true});}
  if(b.kind!=='state')return respond({ok:false,error:'Invalid kind'},400);
  const events=Array.isArray(b.events)?b.events.slice(-12).filter(e=>e&&e.id===b.id&&e.room===room&&Number.isSafeInteger(e.seq)&&e.seq>0&&['eaten','mega','holeEaten','defeated','reward','respawn'].includes(e.type)&&JSON.stringify(e).length<1500):[];
  const world=b.world&&Array.isArray(b.world.bots)?{
   seq:num(b.world.seq,1,1,1e12),
   bots:b.world.bots.slice(0,24).map(h=>({id:String(h.id||'').slice(0,32),name:String(h.name||'').slice(0,20),color:String(h.color||'#dddddd').slice(0,20),x:num(h.x,0,0,12000),y:num(h.y,0,0,12000),radius:num(h.radius,18,1,350),targetRadius:num(h.targetRadius,18,1,350),mass:num(h.mass,0,0,2e7),score:num(h.score,0,0,1e9),respawn:num(h.respawn,0,0,20)})),
   mega:b.world.mega?{tier:num(b.world.mega.tier,1,1,2000),x:num(b.world.mega.x,6100,0,12000),y:num(b.world.mega.y,6000,0,12000)}:null,
   removed:Array.isArray(b.world.removed)?b.world.removed.slice(-80).filter(v=>typeof v==='string'&&v.length<100):[]
  }:null;
  const me={type:'state',kind:'state',id:b.id,room,seq:num(b.seq,1,1,1e12),name:String(b.name||'Player').slice(0,16).replace(/[<>\u0000-\u001f]/g,''),x:num(b.x,1920,0,12000),y:num(b.y,1920,0,12000),radius:num(b.radius,18,1,350),mass:num(b.mass,0,0,2e7),score:num(b.score,0,0,1e9),shield:num(b.shield,0,0,4),alive:!!b.alive,world,events,updatedAt:now};
  await store.setJSON(key,me);
  const list=await store.list({prefix:PREFIX+room+'/',consistency:'strong'});
  if(list.has_more||list.next_cursor||list.nextCursor)return respond({ok:false,error:'Room size limit'},503);
  const all=list.blobs.filter(v=>v.key!==key).slice(0,MAX*2);
  const arr=await Promise.all(all.map(v=>read(store,v.key)));
  const players=arr.filter(v=>v&&validId(v.id)&&v.room===room&&now-v.updatedAt>=0&&now-v.updatedAt<LIVE).slice(0,MAX-1);
  return respond({ok:true,transport:'edgeone-blob',players,serverTime:now});
 }catch(err){console.warn('City Devourer relay unavailable',err);return respond({ok:false,error:'Relay unavailable'},503)}
}