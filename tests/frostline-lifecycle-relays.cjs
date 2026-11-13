const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
(async()=>{
 for(const [file,edge] of [['netlify/functions/frostline-pvp.mjs',false],['edge-functions/api/frostline-pvp.js',true]]){
  let source=fs.readFileSync(file,'utf8').replace(/^import .*;$/m,'').replace('export default async function handler','async function handler').replace('export async function onRequest','async function onRequest').replace('export const config','const config');
  const data=new Map(),store={setJSON:async(k,v)=>data.set(k,v),get:async k=>data.get(k),list:async({prefix=''}={})=>({blobs:[...data.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))}),delete:async k=>data.delete(k)};
  const c={getStore:()=>store,Response,URL,Date,console};vm.runInNewContext(source+';this.api='+(edge?'onRequest':'handler')+';',c);
  const request=async(body)=>{const req=new Request('https://example.com/api/frostline-pvp',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const response=await c.api(edge?{request:req}:req);assert.equal(response.status,200);return response.json();};
  const now=Date.now(),body={kind:'state',id:'fabcdefgh1',alive:true,seq:2,joinedAt:now,roomEpoch:now,maxHp:250,samples:[{t:now,x:0,y:0,h:125}],life:{phase:'rise',at:now,serial:2},growS:1.7,dog:{x:50,y:25,dir:-1,walk:3,moving:false,state:'sacrifice'}};
  body.blades=Array.from({length:60},(_,i)=>({id:'blade-'+i,type:'ars11',reach:48,durability:175,wear:.5,fire:{recoil:3,flash:.08,reload:1}}));
  body.blades[0].damage=300;
  body.flights=[{id:body.id+'f1',t:now,x:30,y:20,z:100,vx:200,vy:-40,vz:150,a:.3,spin:4,life:3,type:'ars11',rarity:'legendary',scale:1.7,wc:'ice'}];
  body.pose={dash:{x0:0,y0:0,x1:200,y1:50,out:.2,inDur:.25,age:.1},hurt:{age:.1,nx:1,force:150,zone:'legs'}};
  body.clashes=[{id:'exact-clash',to:'fabcdefgh2',blade:'blade-1',blades:['blade-1','blade-2'],amount:2,wears:[{id:'blade-3',wear:.5}],x:0,y:0,t:now}];
  body.bears=[{id:body.id+'b1',beast:'bear',x:99999,y:40,hp:900,maxHp:1000,facing:.4,damage:20,attackSerial:5,woundSerial:7,wounds:[{id:'cut1',x:9,y:8,a:.2,at:now,size:5}],attack:{id:'bite1',kind:'bite',hit:[body.id],at:now,windup:.5,active:.28,recovery:.65}}];
  body.bearActions=[{id:body.id+'u1',bear:body.id+'b1',weapon:'blade1',damage:25,x:40,y:30,t:now}];
  body.bearHits=[{id:'bite1:hit',to:'fabcdefgh2',t:now,x:40,y:30,r:13,a:0,kind:'bite',damage:20,force:100}];
  await request(body);let saved=data.values().next().value;
  assert.equal(saved.bears.length,1);assert.equal(saved.bears[0].x,10125);assert.equal(saved.bears[0].wounds[0].id,'cut1');assert.equal(saved.bears[0].attack.kind,'bite');assert.equal(saved.bears[0].attack.hit[0],body.id);assert.equal(saved.bears[0].woundSerial,7);assert.equal(saved.bears[0].attackSerial,5);assert.equal(saved.bearActions[0].damage,25);assert.equal(saved.bearHits[0].to,'fabcdefgh2');

  assert.equal(saved.blades.length,60);assert.equal(saved.blades[0].damage,300);assert.equal(saved.blades[0].durability,175);assert.equal(saved.blades[0].wear,.5);assert.equal(saved.clashes[0].wears[0].wear,.5);assert.equal(saved.blades[0].fire.recoil,3);assert.equal(saved.flights[0].z,100);assert.equal(saved.flights[0].rarity,'legendary');assert.equal(saved.flights[0].scale,1.7);assert.equal(saved.flights[0].wc,'ice');assert.equal(saved.pose.dash.x1,200);assert.equal(saved.pose.hurt.zone,'legs');assert.equal(saved.clashes[0].blades[1],'blade-2');

  assert.equal(saved.life.phase,'rise');assert.equal(saved.life.serial,2);assert.equal(saved.dog.state,'sacrifice');assert.equal(saved.dog.x,50);assert.equal(saved.growS,1.7);assert.equal(saved.maxHp,250);
  await request({...body,seq:3,dog:null,life:{phase:'dead',at:now,serial:3}});
  const response=await request({...body,id:'fabcdefgh2',life:{phase:'alive',at:now,serial:0},dog:{x:99999,y:-99999,dir:0,walk:'invalid',state:'invalid'}});
  assert.equal(response.players[0].life.phase,'dead','final snapshot remains available for collapse animation');assert.equal(response.players[0].dog,null);assert.equal(response.count,1,'dead player is excluded from presence');
  saved=[...data.values()].find(v=>v.id==='fabcdefgh2');assert.equal(saved.dog.x,10125);assert.equal(saved.dog.y,-10125);assert.equal(saved.dog.state,'follow');assert.equal(saved.dog.walk,0);
  const req=new Request('https://example.com/api/frostline-pvp?presence=1'),presence=await (await c.api(edge?{request:req}:req)).json();assert.equal(presence.count,1);
  await request({...body,seq:10,npcs:[{id:'bot1',generation:2,name:'Shared bot',x:30,y:40,hp:180,maxHp:240,blades:6,level:7,bladeLayout:[{id:'bot1:2:4',base:1,o:.95,v:-2}],warp:{x0:0,y0:0,x1:100,y1:100,age:.1}}],blades:[{id:'tier8',type:'ars11',durability:800,wear:7}]});
  await request({...body,seq:9,dog:null});
  saved=[...data.values()].find(v=>v.id===body.id);assert.equal(saved.seq,10);assert.equal(saved.npcs[0].generation,2);assert.equal(saved.npcs[0].bladeLayout[0].id,'bot1:2:4');assert.equal(saved.npcs[0].bladeLayout[0].o,.95);assert.equal(saved.npcs[0].warp.x1,100);assert.equal(saved.blades[0].durability,800);assert.equal(saved.blades[0].wear,7);
  const separate=await request({...body,id:'fbandtest01',matchBand:3});assert.equal(separate.players.length,0,'different upgrade bands must not exchange state');
  const sameBand=await request({...body,id:'fbandtest02',matchBand:3});assert.equal(sameBand.players.length,1);assert.equal(sameBand.players[0].id,'fbandtest01');
  await request({kind:'leave',id:'fbandtest01',matchBand:3});assert.equal([...data.values()].some(v=>v.id==='fbandtest01'),false);
  console.log('PASS:',file,'pet/lifecycle/scale forwarding, validation, death retention and presence');
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
