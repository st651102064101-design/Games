const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
(async()=>{
 for(const [file,edge] of [['netlify/functions/frostline-pvp.mjs',false],['edge-functions/api/frostline-pvp.js',true]]){
  let source=fs.readFileSync(file,'utf8').replace(/^import .*;$/m,'').replace('export default async function handler','async function handler').replace('export async function onRequest','async function onRequest').replace('export const config','const config');
  const data=new Map(),store={setJSON:async(k,v)=>data.set(k,v),get:async k=>data.get(k),list:async()=>({blobs:[...data.keys()].map(key=>({key}))}),delete:async k=>data.delete(k)};
  const c={getStore:()=>store,Response,URL,Date,console};vm.runInNewContext(source+';this.api='+(edge?'onRequest':'handler')+';',c);
  const request=async(body)=>{const req=new Request('https://example.com/api/frostline-pvp',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const response=await c.api(edge?{request:req}:req);assert.equal(response.status,200);return response.json();};
  const now=Date.now(),body={kind:'state',id:'fabcdefgh1',alive:true,seq:2,joinedAt:now,roomEpoch:now,maxHp:250,samples:[{t:now,x:0,y:0,h:125}],life:{phase:'rise',at:now,serial:2},growS:1.7,dog:{x:50,y:25,dir:-1,walk:3,moving:false,state:'sacrifice'}};
  await request(body);let saved=data.values().next().value;
  assert.equal(saved.life.phase,'rise');assert.equal(saved.life.serial,2);assert.equal(saved.dog.state,'sacrifice');assert.equal(saved.dog.x,50);assert.equal(saved.growS,1.7);assert.equal(saved.maxHp,250);
  await request({...body,seq:3,dog:null,life:{phase:'dead',at:now,serial:3}});
  const response=await request({...body,id:'fabcdefgh2',life:{phase:'alive',at:now,serial:0},dog:{x:99999,y:-99999,dir:0,walk:'invalid',state:'invalid'}});
  assert.equal(response.players[0].life.phase,'dead','final snapshot remains available for collapse animation');assert.equal(response.players[0].dog,null);assert.equal(response.count,1,'dead player is excluded from presence');
  saved=[...data.values()].find(v=>v.id==='fabcdefgh2');assert.equal(saved.dog.x,10125);assert.equal(saved.dog.y,-10125);assert.equal(saved.dog.state,'follow');assert.equal(saved.dog.walk,0);
  const req=new Request('https://example.com/api/frostline-pvp?presence=1'),presence=await (await c.api(edge?{request:req}:req)).json();assert.equal(presence.count,1);
  console.log('PASS:',file,'pet/lifecycle/scale forwarding, validation, death retention and presence');
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
