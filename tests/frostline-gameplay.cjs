// Real Chromium integration tests. The evaluation hook exists only in the local
// test response; the shipped HTML has no gameplay mutation/test API.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'Frostline_v3_4_holes.html'),'utf8');
const testHTML=html.replace('})()\n</script>','window.__gameEval=code=>eval(code);\n})()\n</script>');
assert.notEqual(testHTML,html);
const records=new Map(),store={setJSON:async(k,v)=>records.set(k,v),get:async k=>records.get(k),delete:async k=>records.delete(k),list:async({prefix='' }={})=>({blobs:[...records.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))})};
const relaySource=fs.readFileSync(path.join(root,'netlify/functions/frostline-pvp.mjs'),'utf8').replace("import {getStore} from '@netlify/blobs';",'').replace('export default async function handler','async function handler').replace('export const config','const config');
const sandbox={getStore:()=>store,Response,URL,Date,console};
vm.runInNewContext(relaySource+';this.handler=handler;',sandbox);
const server=http.createServer(async(req,res)=>{
 try{
  if(req.url.startsWith('/api/frostline-pvp')){
   let body='';for await(const data of req)body+=data;
   const response=await sandbox.handler(new Request('http://127.0.0.1:'+server.address().port+req.url,{method:req.method,headers:req.headers,...(req.method==='POST'?{body}:{})}));
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;
  }
  if(req.url==='/'||req.url.startsWith('/Frostline')){res.writeHead(200,{'Content-Type':'text/html'});res.end(testHTML);return;}
  const filename=path.join(root,path.basename(req.url.split('?')[0]));
  if(fs.existsSync(filename)&&fs.statSync(filename).isFile()){res.end(fs.readFileSync(filename));return;}
  res.writeHead(404);res.end();
 }catch(e){res.writeHead(500);res.end(String(e));}
});
const errors=[],passed=[];
let browser;
const check=(label)=>{passed.push(label);console.log('PASS:',label);};
async function run(page,code){return page.evaluate(code=>window.__gameEval(code),code);}
async function pointer(page,type,id,x,y,primary=false){await page.locator('#game').dispatchEvent(type,{pointerId:id,pointerType:'touch',isPrimary:primary,clientX:x,clientY:y,button:0,buttons:type==='pointerup'?0:1,bubbles:true});}
async function calm(page){await run(page,`game.intro=null;game.mobs=[];game.bots=[];game.nextBotBalance=Infinity;game.spawning=999;game.holes=[];game.holeCd=999;game.rackTimer=999;game.p.x=0;game.p.y=0;game.p.mx=game.p.my=0;game.p.kvx=game.p.kvy=0;game.p.inv=0;game.p.bladeCd=0;cam.x=cam.y=0;game.dog.x=-50;game.dog.y=20;game.obsGrid=new Map();game.obstacles=[];game.drops=[];game.air={next:99999,boxes:[],plane:null};paused=true;`);}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:960,height:760},hasTouch:true});
 await context.addInitScript(()=>{
  Object.defineProperty(navigator,'onLine',{get:()=>false});
  for(const key of ['frostline_guide_complete','frostline_warp_guide_v2','frostline_howto_illustrated_v2'])localStorage.setItem(key,'1');
  localStorage.setItem('frostline_audio_v1',JSON.stringify({master:0,music:0,combat:0,environment:0,interface:0}));
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.waitForFunction(()=>!!window.__gameEval);
 await page.locator('#playBtn').click();await calm(page);
 assert.equal(await run(page,'game.p.maxHp'),250);assert.equal(await run(page,'userZoom'),.42);
 await run(page,"applyFieldItem('armor')");assert.equal(await run(page,'game.p.maxHp'),266);
 check('250 starting HP, doubled armor health, default zoom 0.42');
 // Five physical projectiles cross the player in a single update.
 const bullets=await run(page,`(()=>{
  peers.clear();game.weapons=Array.from({length:5},(_,i)=>({id:'shield'+i,type:'ars11',rarity:'common',damage:30}));game.activeLength=-1;shots.length=0;
  for(let i=0;i<5;i++)emitShot({damage:20},ARSENAL[20],-40,0,0,'enemy','burst'+i);
  const hp=game.p.hp;updateArsenal(.05);
  const result={hpBefore:hp,hpAfter:game.p.hp,weapons:game.weapons.length,shots:shots.length};
  emitShot({damage:20},ARSENAL[20],-40,0,0,'enemy','sixth');updateArsenal(.05);result.afterSixth=game.p.hp;return result;
 })()`);
 assert.equal(bullets.hpAfter,bullets.hpBefore);assert.equal(bullets.weapons,0);assert.equal(bullets.shots,0);assert.ok(bullets.afterSixth<bullets.hpBefore);
 await run(page,`game.p.inv=0;game.weapons=[{id:'rocket-shield',type:'ars11',rarity:'common'}];game.activeLength=-1;window.hpBeforeRocket=game.p.hp;explodeRocket({owner:'enemy',damage:200,blast:600,vx:100,vy:0},0,0);`);
 assert.equal(await run(page,'game.p.hp===window.hpBeforeRocket&&game.weapons.length===0'),true);
 check('five bullets remove exactly five swords without HP loss; sixth and RPG rules');
 const melee=await run(page,`(()=>{
  peers.clear();game.weapons=[];game.activeLength=-1;game.p.x=125;game.p.y=0;game.p.inv=0;game.p.bladeCd=0;game.p.hp=250;
  peers.set('enemy',{id:'enemy',x:0,y:0,s:0,w:0,init:1,last:performance.now(),life:{phase:'alive'},bl:[{id:'blade',o:0,m:1,reach:48,damage:40,type:'ars11',speed:0}]});
  pushFromBlades(game.p,.016);const tipHp=game.p.hp;
  const far=bladeBodyContact(0,0,0,48,'ars11',1,165,0,24,0);
  const swept=bladeBodyContact(0,0,Math.PI,48,'ars11',1,0,100,24,Math.PI);
  peers.clear();game.p.inv=0;game.p.bladeCd=0;game.p.hp=250;game.p.x=0;game.p.y=0;
  return {tipHp,far:!!far,swept:!!swept};
 })()`);
 assert.ok(melee.tipHp<250);assert.equal(melee.far,false);assert.equal(melee.swept,true);
 check('tip and near-tip contact damages unarmed player; fast sweep cannot tunnel');
 const loot=await run(page,`(()=>{const random=Math.random;let accepted=0,rejected=0;try{for(const type of SHARED_DROP_TYPES){game.drops=[];Math.random=()=>.499;spawnDrop(0,0,type,1,type==='weapon'?{type:'ars11'}:null);accepted+=game.drops.length;game.drops=[];Math.random=()=>.5;spawnDrop(0,0,type,1,type==='weapon'?{type:'ars11'}:null);rejected+=game.drops.length;}}finally{Math.random=random;}return {accepted,rejected,total:SHARED_DROP_TYPES.size};})()`);
 assert.equal(loot.accepted,loot.total);assert.equal(loot.rejected,0);
 check('every pickup type uses the same 50% authority-side drop threshold');
 // Browser event dispatch executes the real pointer handlers in registration order.
 await run(page,'paused=false;game.p.inv=999;game.sprintCd=0;clearInput();');
 await pointer(page,'pointerdown',1,100,550,true);await pointer(page,'pointermove',1,175,550,true);await page.waitForTimeout(150);
 await pointer(page,'pointerdown',2,650,360);await pointer(page,'pointerup',2,650,360);
 assert.equal(await run(page,'input.pointerId'),1);assert.ok(await run(page,'input.dx')>.5);
 await page.waitForTimeout(80);await pointer(page,'pointerdown',3,650,360);await pointer(page,'pointerup',3,650,360);
 assert.ok(await run(page,'game.sprintCd')>59);assert.equal(await run(page,'input.pointerId'),1);assert.ok(await run(page,'input.dx')>.5);
 await pointer(page,'pointerup',1,175,550,true);await page.waitForTimeout(500);
 check('secondary finger double-tap warps while the original movement finger stays active');
 // Pair drag to the full endpoint, then back; pinch independently changes zoom.
 await run(page,'clearInput();cameraTiltTarget=0;game.dash=null;');
 await pointer(page,'pointerdown',10,300,550,true);await pointer(page,'pointerdown',11,500,550);
 for(let y=530;y>=330;y-=20){await pointer(page,'pointermove',10,300,y,true);await pointer(page,'pointermove',11,500,y);}
 assert.equal(await run(page,'cameraTiltTarget'),90);assert.equal(await run(page,'userZoom'),.42);
 for(let y=350;y<=570;y+=20){await pointer(page,'pointermove',10,300,y,true);await pointer(page,'pointermove',11,500,y);}
 assert.equal(await run(page,'cameraTiltTarget'),0);
 await pointer(page,'pointerup',10,300,570,true);await pointer(page,'pointerup',11,500,570);
 await pointer(page,'pointerdown',12,300,500,true);await pointer(page,'pointerdown',13,500,500);
 await pointer(page,'pointermove',12,240,500,true);await pointer(page,'pointermove',13,560,500);
 assert.ok(await run(page,'userZoom')>.42);await pointer(page,'pointercancel',12,240,500,true);await pointer(page,'pointercancel',13,560,500);
 assert.equal(await run(page,'game.life.phase'),'alive');
 check('two-finger tilt reaches 90° and returns to 0°; pinch and cancellation do not kill or warp');
 // A real multi-touch stream also keeps the joystick captured during the warp.
 await run(page,'clearInput();game.sprintCd=0;game.dash=null;');
 const cdp=await context.newCDPSession(page),finger=(id,x,y)=>({id,x,y,radiusX:4,radiusY:4,force:1});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger(1,100,550)]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[finger(1,175,550)]});
 await page.waitForTimeout(160);
 for(let i=0;i<2;i++){
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger(1,175,550),finger(2,650,360)]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[finger(2,650,360)]});
  if(i===0)await page.waitForTimeout(70);
 }
 assert.ok(await run(page,'game.sprintCd')>59);assert.ok(await run(page,'input.dx')>.5);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 check('native Chromium multi-touch stream preserves movement during secondary-finger warp');
 // Name/weapon badge rendering must survive low graphics and extreme pitch.
 const labels=await run(page,`(()=>{paused=true;graphicsLow=true;cameraTilt=90;worldTiltActive=true;const log=[],old=ctx.fillText;ctx.fillText=function(t,...args){log.push({t:String(t),font:this.font});old.call(this,t,...args);};try{labelQ=[];lang='en';drawYouLabel(game.p);labelQ.push(['Opponent',0,52,'#fff','900 11px system-ui']);drawWeaponCount(game.p,5);flushLabels();}finally{ctx.fillText=old;worldTiltActive=false;lang='th';}return log;})()`);
 assert.ok(labels.some(l=>l.t==='You'));assert.ok(labels.some(l=>l.t==='Opponent'));assert.ok(labels.some(l=>l.t==='5'));
 await run(page,`for(const skin of CHARACTER_SKINS)drawPlayer({...game.p,skin:skin.id});for(const spec of WILDLIFE_CATALOG)drawWildlifeShape({x:0,y:0,walk:1,phase:0,dir:1},spec);for(const spec of ARSENAL)drawWeaponModel(0,0,0,{type:spec.id,rarity:'common'});`);
 check('all skins, 50 animal designs, 30 weapons and low-quality name/count labels render');
 const physics=await run(page,`(()=>{
  function simulate(hz){const a={x:0,y:0,walk:0};for(let i=0;i<hz;i++){a.x+=120/hz;a.walk+=6/hz;updateActorMotion(a,1/hz);}return a.motion;}
  const a=simulate(30),b=simulate(120);
  return {leanDelta:Math.abs(a.lean-b.lean),liftDelta:Math.abs(a.lift-b.lift),lean:a.lean};
 })()`);
 assert.ok(physics.leanDelta<.025&&physics.liftDelta<.5&&physics.lean>0);
 check('damped character motion remains stable at 30 and 120 updates per second');
 const bot=await run(page,`(()=>{const b={x:0,y:0,blades:4,items:4,level:1,xp:0,nextXP:25,hp:240,maxHp:240,lootThink:0};game.drops=[];game.lootDead=new Set();for(let i=0;i<8;i++){const d={id:'bot-test-'+i,x:0,y:0,age:1,type:'plus',amt:2};game.drops.push(d);b.lootThink=0;botLoot(b,.1);}return {level:b.level,blades:b.blades,remaining:game.drops.length};})()`);
 assert.ok(bot.level>1&&bot.blades===20&&bot.remaining===0);
 check('bots collect shared loot once and gain uncapped experience and weapons');
 const clashResult=await run(page,`(()=>{
  peers.clear();game.p.x=0;game.p.y=0;game.swordPhase=0;game.growS=1;game.flyWeapons=[];
  game.weapons=Array.from({length:60},(_,i)=>({id:'contact-'+i,type:'ars11',rarity:'common',damage:30,slot:i}));game.activeLength=-1;game.ringSize=60;
  const r={id:'zzzz',x:140,y:0,s:0,init:1,last:performance.now(),growS:1,weaponTotal:60,bl:Array.from({length:60},(_,i)=>({id:'other-'+i,o:i*TAU/60,m:1,reach:48,type:'ars11',speed:spinSpeed()}))};
  const count=ownBlades().length,hits=sweptBladePairs(game.p,r,.033).length;
  clashActors(game.p,r,.033,true);const lost=60-game.weapons.length;
  const result={count,hits,lost,flights:game.flyWeapons.length,otherLost:60-r.weaponTotal,packets:clashes.slice(-3).flatMap(c=>c.blades||[]).length};
  game.weapons=[];game.activeLength=-1;clashes.length=0;game.p.kvx=game.p.kvy=0;return result;
 })()`);
 assert.equal(clashResult.count,60);assert.ok(clashResult.hits>=6&&clashResult.lost>=6);assert.equal(clashResult.flights,clashResult.lost*2);assert.equal(clashResult.otherLost,clashResult.lost);
 check('sixty visible blades use swept pair contacts and every lost blade produces its own flight');
 const geometry=await run(page,`({cross:bladeContact([-10,0,10,0],[0,-10,0,10],1),miss:bladeContact([-10,0,10,0],[0,50,0,60],1)})`);
 assert.equal(geometry.cross.x,0);assert.equal(geometry.cross.y,0);assert.equal(geometry.miss,null);
 check('contact effects originate at actual blade intersection; separated blades never collide');
 const debris=await run(page,`(()=>{game.flyWeapons=[];const f={id:'sourcef1',source:'source',t:Date.now(),x:0,y:0,z:50,vx:100,vy:0,vz:-100,a:0,spin:5,life:3.2,type:'ars11'};receivePhysicsState({id:'source',flights:[f]});receivePhysicsState({id:'source',flights:[f]});const size=game.flyWeapons.length;updateFlyingWeaponPhysics(.1);return {size,z:game.flyWeapons[0].z,x:game.flyWeapons[0].x};})()`);
 assert.equal(debris.size,1);assert.ok(debris.z<50&&debris.z>=0&&debris.x>0);
 check('remote debris is deduplicated and continues ballistic motion with gravity');
 const appearance=await run(page,`(()=>{const savedCtx=ctx,savedScale=bladeScale;let identical=true;try{for(const spec of ARSENAL)for(const rarity of RARITIES){const w={type:spec.id,rarity:rarity.id};const render=loose=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=320;ctx=canvas.getContext('2d');ctx.translate(160,160);bladeScale=1.7;if(loose)drawLooseWeapon(0,0,.3,w,1.7);else drawWeaponModel(0,0,.3,w);return canvas.toDataURL();};if(render(false)!==render(true))identical=false;}}finally{ctx=savedCtx;bladeScale=savedScale;}game.flyWeapons=[];game.growS=1.7;game.weapons=[{id:'visual-drop',type:'ars11',rarity:'legendary',damage:30}];game.activeLength=-1;dropOwnBlade('visual-drop',0,0);const f=game.flyWeapons[0],wire=ownMeta().flights[0];return {identical,scale:WEAPON_SIZE,length:bladeLen({type:'ars11'}),base:BLADE_LEN[combatSpec({type:'ars11'}).shape],rarity:f.rarity,grow:f.scale,wire};})()`);
 assert.equal(appearance.identical,true);assert.equal(appearance.scale,1.2);assert.equal(appearance.length,appearance.base*1.2);assert.equal(appearance.rarity,'legendary');assert.equal(appearance.grow,1.7);assert.equal(appearance.wire.rarity,'legendary');assert.equal(appearance.wire.scale,1.7);
 check('all weapon types and rarities render pixel-identically loose or orbiting; destroyed blades preserve rarity and source growth with 20% geometry enlargement');
 const labelPosition=await run(page,`(()=>{labelQ=[];drawYouLabel(game.p);const offset=labelQ[0][2]-game.p.y;labelQ=[];return offset;})()`);
 assert.equal(labelPosition,18);check('name anchor stays at the feet instead of following the weapon radius');
 await run(page,`for(const skin of CHARACTER_SKINS)drawHeroPose({...game.p,x:0,y:0,skin:skin.id},{...BOT_LOOK,skin:skin.id},{life:{phase:'dead'},deathT0:now-.5,growS:1});`);
 check('articulated collapse renders every character skin with bounded body sections');
 const settling=await run(page,`(()=>{function simulate(hz){game.flyWeapons=[{x:0,y:0,z:70,vx:0,vy:0,vz:0,a:0,spin:1,life:3.2,type:'ars16'}];for(let i=0;i<hz;i++)updateFlyingWeaponPhysics(1/hz);return {...game.flyWeapons[0]};}return {slow:simulate(30),fast:simulate(120)};})()`);
 assert.ok(settling.slow.z>=0&&settling.fast.z>=0);assert.ok(Math.abs(settling.slow.z-settling.fast.z)<4);
 check('fixed-substep debris settling remains stable at thirty and one-hundred-twenty Hz');


 // A second isolated browser context exercises the HTTP relay, not BroadcastChannel.
 const context2=await browser.newContext({viewport:{width:960,height:760}});
 await context2.addInitScript(()=>{Object.defineProperty(navigator,'onLine',{get:()=>false});for(const key of ['frostline_guide_complete','frostline_warp_guide_v2','frostline_howto_illustrated_v2'])localStorage.setItem(key,'1');localStorage.setItem('frostline_name','Observer');localStorage.setItem('frostline_audio_v1','{"master":0,"music":0}');});
 const observer=await context2.newPage();observer.on('pageerror',e=>errors.push(e.message));await observer.goto(url);await observer.locator('#playBtn').click();await calm(observer);
 await run(page,'newGame();');await calm(page);
 await run(page,"PLAYER_NAME='Hero';game.p.x=80;game.p.y=0;game.dog.x=120;game.dog.y=20;cameraTilt=cameraTiltTarget=0;userZoom=DEFAULT_ZOOM;paused=false;game.p.inv=999;sendMyState(1);syncCloud();");
 await run(observer,'paused=false;game.p.inv=999;sendMyState(1);syncCloud();');
 await observer.waitForFunction(()=>window.__gameEval("[...peers.values()].some(r=>r.name==='Hero'&&r.dog)"),null,{timeout:8000});
 const heroId=await run(page,'CLIENT_ID');
 check('another browser receives the remote pet via the actual HTTP relay sanitizer');
 const context3=await browser.newContext({viewport:{width:960,height:760},storageState:await context2.storageState()});
 await context3.addInitScript(()=>Object.defineProperty(navigator,'onLine',{get:()=>false}));
 const spectator=await context3.newPage();spectator.on('pageerror',e=>errors.push(e.message));await spectator.goto(url);await spectator.locator('#playBtn').click();await calm(spectator);
 await run(spectator,'game.p.x=700;game.p.inv=999;paused=false;sendMyState(1);syncCloud();');
 const flightIDs=await run(page,`(()=>{game.flyWeapons=[];for(let i=0;i<20;i++)spawnClashFlight(80+i,20,80,0,'ars11');lastMetaAt=0;sendMyState(1);syncCloud();return game.flyWeapons.map(f=>f.id);})()`);
 for(const view of [observer,spectator])await view.waitForFunction(ids=>window.__gameEval('game.flyWeapons')?.filter(f=>ids.includes(f.id)).length===ids.length,flightIDs,{timeout:8000});
 check('owner, opponent and third-party spectator share all twenty flight IDs through HTTP relay');
 const leaderId=await run(observer,'CLIENT_ID');
 await run(observer,`sendMyState(1);syncCloud();`);
 for(const view of [page,spectator])await view.waitForFunction(id=>window.__gameEval('lootAuthorityId()')===id,leaderId,{timeout:8000});
 await run(observer,`game.bots=[{id:'bot77',name:'Shared NPC',generation:7,x:1000,y:1000,tx:1000,ty:1000,s:0,hp:200,maxHp:240,blades:6,items:6,level:12,xp:0,nextXP:200,dead:0,dir:1,walk:0,retarget:999,warpCd:999,inv:999,hitCd:999}];sendMyState(1);syncCloud();`);
 for(const view of [page,spectator])await view.waitForFunction(()=>window.__gameEval("game.bots.some(b=>b.id==='bot77'&&b.generation===7&&b.level===12&&b.blades===6)"),null,{timeout:8000});
 await run(observer,`game.bots[0].dead=6;game.bots[0].hp=0;sendMyState(1);syncCloud();`);
 for(const view of [page,spectator])await view.waitForFunction(()=>window.__gameEval("game.bots.some(b=>b.id==='bot77'&&b.dead>0&&b.hp===0)"),null,{timeout:8000});
 check('one elected NPC simulation shares bot level, blades, generation and death with two isolated remote browsers');
 await run(observer,'game.bots=[];game.mobs=[];');
 const sharedBear=await run(observer,`(()=>{const m={id:8001,beast:'bear',x:500,y:500,r:26,hp:1000,maxHp:1000,speed:0,damage:10,facing:0,walk:0};game.mobs=[m];applyBearWound(m,100,{x:510,y:508,a:.5});sendMyState(1);syncCloud();return bearKey(m);})()`);
 for(const view of [page,spectator])await view.waitForFunction(id=>window.__gameEval('game.mobs').some(m=>m.bearId===id&&m.hp===900&&m.wounds?.length===1),sharedBear,{timeout:8000});
 await run(page,`game.weapons=[];game.activeLength=-1;game.p.x=500;game.p.y=500;sendMyState(1);syncCloud();`);await page.waitForTimeout(700);
 await run(page,`(()=>{const m=game.mobs.find(m=>m.bearId==='${sharedBear}');woundBear(m,25,{x:m.x,y:m.y,a:0,phase:4},{id:'remote-cut'});sendMyState(1);syncCloud();})()`);
 await observer.waitForFunction(()=>window.__gameEval('game.mobs.some(m=>m.id===8001&&m.hp===875)'),null,{timeout:8000});
 for(const view of [page,spectator])await view.waitForFunction(id=>window.__gameEval('game.mobs').some(m=>m.bearId===id&&m.hp===875&&m.wounds?.length===2),sharedBear,{timeout:8000});
 check('three isolated browsers share one wounded bear and a remote cut is applied once by the host through HTTP');
 const attackId=await run(observer,`(()=>{const m=game.mobs.find(m=>m.id===8001);startBearAttack(m,{x:600,y:500},'charge');sendMyState(1);syncCloud();return m.bearAttack.id;})()`);
 for(const view of [page,spectator])await view.waitForFunction(id=>window.__gameEval('game.mobs').some(m=>m.bearAttack?.id===id),attackId,{timeout:8000});
 const priorKills=await run(page,'game.kills');await run(observer,`(()=>{const m=game.mobs.find(m=>m.id===8001);m.hp=0;kill(m);game.mobs=[];sendMyState(1);syncCloud();})()`);
 await page.waitForFunction(k=>window.__gameEval('game.kills')===k+1,priorKills,{timeout:8000});await page.waitForTimeout(600);assert.equal(await run(page,'game.kills'),priorKills+1);check('shared bear attack IDs reach both observers and repeated death snapshots cannot pay a second reward');

 await run(observer,'game.mobs=[];');await run(page,'game.p.x=80;game.p.y=0;');
 await context3.close();

 await run(page,'game.p.hp=0;endGame();');
 await observer.waitForFunction(id=>window.__gameEval(`peers.get('${id}')?.life?.phase==='rescue'`),heroId,{timeout:5000});
 assert.equal(await run(observer,`!!peers.get('${heroId}').reviveFx`),true);
 await page.waitForFunction(()=>window.__gameEval("mode==='playing'&&game.dog?.state==='sacrifice'"));
 await observer.waitForFunction(id=>window.__gameEval(`peers.get('${id}')?.life?.phase==='rise'&&peers.get('${id}')?.dog?.state==='sacrifice'`),heroId,{timeout:5000});
 assert.equal(await run(page,'game.p.hp===Math.ceil(game.p.maxHp*.5)'),true);
 const artifacts=path.resolve(root,'../test-artifacts');fs.mkdirSync(artifacts,{recursive:true});
 await observer.waitForTimeout(250);
 await observer.screenshot({path:path.join(artifacts,'remote-revive.png')});
 await page.waitForFunction(()=>window.__gameEval('game.dog===null'),null,{timeout:4000});
 await observer.waitForFunction(id=>window.__gameEval(`peers.get('${id}')?.dog===null`),heroId,{timeout:6000});
 check('first death falls, revives with glow, sacrifices the dog and removes it on both clients');
 await run(page,'game.p.inv=0;game.p.hp=0;endGame();');
 await observer.waitForFunction(id=>window.__gameEval(`['down','dead'].includes(peers.get('${id}')?.life?.phase)`),heroId,{timeout:5000});
 await page.waitForFunction(()=>window.frostlineInfo.mode==='dead');
 await observer.waitForFunction(id=>window.__gameEval(`peers.get('${id}')?.life?.phase==='dead'`),heroId,{timeout:6000});
 assert.equal(await run(page,'game.petReviveUsed'),true);
 check('second death is final and the observer sees the collapse/final state');
 const stale=await run(observer,`(()=>{const r=peers.get('${heroId}');receiveLife(r,{joinedAt:r.lifeRun,life:{phase:'alive',serial:0,at:0},dog:{x:0,y:0}});return r.life.phase;})()`);
 assert.equal(stale,'dead');check('late lifecycle packets cannot restore a dead player or pet');
 const stalePet=await run(observer,`(()=>{const r={lifeRun:1,lifeSeq:20,life:{phase:'rise',serial:2},dog:null};receiveLife(r,{joinedAt:1,seq:19,life:{phase:'rise',serial:2,at:Date.now()},dog:{x:0,y:0}});return r.dog;})()`);
 assert.equal(stalePet,null);
 await run(observer,`newGame();game.p.inv=999;`);await calm(observer);await run(observer,'paused=false;game.p.inv=999;');
 for(let i=0;i<2;i++){
  await pointer(observer,'pointerdown',31+i*2,350,500,true);await pointer(observer,'pointerdown',32+i*2,500,500);
  await pointer(observer,'pointerup',31+i*2,350,500,true);await pointer(observer,'pointerup',32+i*2,500,500);
  if(i===0)await observer.waitForTimeout(70);
 }
 assert.equal(await run(observer,'mode'),'dying');
 check('existing deliberate two-finger double-tap gesture still works independently');
 await observer.waitForFunction(()=>window.frostlineInfo.mode==='playing');
 await run(observer,'cameraTilt=cameraTiltTarget=90;graphicsLow=false;');await observer.screenshot({path:path.join(artifacts,'camera-90.png')});
 await run(observer,'cameraTilt=cameraTiltTarget=0;');await observer.setViewportSize({width:390,height:844});await observer.screenshot({path:path.join(artifacts,'mobile.png')});

 await run(page,`writeMeta({coins:200,durabilityTier:1});game.coins=200;game.durabilityTier=1;showMetaShop('weapons');`);
 assert.equal(await page.locator('[data-buy]').count(),1);assert.equal(await page.locator('[data-buy="ars30"]').count(),0);
 await page.locator('[data-buy="durability"]').click();
 const purchase=await run(page,'({coins:loadSave().coins,tier:loadSave().durabilityTier,canBuyGun:buyItem("ars30")})');
 assert.equal(purchase.coins,150);assert.equal(purchase.tier,2);assert.equal(purchase.canBuyGun,false);
 check('shop sells a sequential permanent durability tier instead of firearms and charges exactly once');
 await page.screenshot({path:path.join(artifacts,'durability-shop.png')});
 await run(page,'hideMetaShop();newGame();');await calm(page);
 const upgraded=await run(page,`(()=>{game.weapons=[{id:'upgraded',type:'ars11',rarity:'common'}];game.activeLength=-1;game.p.bladeWear=new Map();const hp=game.p.hp;absorbProjectile(game.p,{damage:80,vx:100,vy:0,owner:'enemy'});const afterFirst=game.weapons.length;absorbProjectile(game.p,{damage:80,vx:100,vy:0,owner:'enemy'});return {tier:game.durabilityTier,max:weaponDurability(game.p,{}),afterFirst,afterSecond:game.weapons.length,hpUnchanged:game.p.hp===hp,ground:ARSENAL.map(w=>weaponDurability({},randWeapon(false,w.id)))};})()`);
 assert.equal(upgraded.tier,2);assert.equal(upgraded.max,200);assert.equal(upgraded.afterFirst,1);assert.equal(upgraded.afterSecond,0);assert.equal(upgraded.hpUnchanged,true);assert.ok(upgraded.ground.every(x=>x===100));
 check('all ground weapon types share base durability 100; purchased tier survives a new round and absorbs extra hits');
 const limits=await run(page,`(()=>{writeMeta({coins:0,durabilityTier:2});const poor=buyDurabilityTier();writeMeta({coins:999999,durabilityTier:8});const full=buyDurabilityTier();writeMeta({coins:150,durabilityTier:2});return {poor,full};})()`);
 assert.equal(limits.poor,false);assert.equal(limits.full,false);check('insufficient funds and maximum tier cannot create an upgrade');
 await calm(page);
 const phases=await run(page,`(()=>{peers.clear();game.stage=1;game.phase=1;game.phaseClock=0;game.nextEvent=Infinity;game.stageKills=0;game.bossSpawned=false;game.bossDefeated=false;let a=advanceRun(30);game.phase=a.phase;a=advanceRun(30);game.phase=a.phase;const gated=advanceRun(1);game.bossDefeated=true;const next=advanceRun(1);return {gated,next};})()`);
 assert.equal(phases.gated.stage,1);assert.equal(phases.gated.phase,3);assert.equal(phases.next.stage,2);assert.equal(phases.next.phase,1);
 check('new rounds advance through fight and recovery, then require a defeated boss before the next stage');
 const bossGate=await run(page,`(()=>{game.stage=1;game.phase=3;game.phaseClock=0;game.stageKills=0;game.bossSpawned=false;game.bossDefeated=false;game.mobs=[];advanceRun(4);const boss=game.mobs.find(m=>m.boss),before=game.kills;kill(boss);kill(boss);return {spawned:!!boss,kills:game.kills-before,bosses:game.missionStats.bosses,defeated:game.bossDefeated};})()`);
 assert.equal(bossGate.spawned,true);assert.equal(bossGate.kills,1);assert.equal(bossGate.bosses,1);assert.equal(bossGate.defeated,true);check('boss appears without fabricated kills and defeat/reward handling cannot run twice');
 const rewards=await run(page,`(()=>{game.missionStats={kills:24,items:20,air:0,bosses:0};game.missionClaimed=new Set();const before=game.coins;updateRunGoals();const once=game.coins-before;updateRunGoals();return {once,twice:game.coins-before};})()`);
 assert.equal(rewards.once,50);assert.equal(rewards.twice,50);check('skipped objective milestones are paid once without duplicate rewards');
 const skills=await run(page,`(()=>{game.pendingLevels=1;showLevelChoice();const id=game.skillChoices[0],before=game.perks[id]||0,first=chooseRunSkill(id),again=chooseRunSkill(id);return {first,again,pending:game.pendingLevels,playing:mode==='playing',gained:(game.perks[id]||0)-before};})()`);
 assert.equal(skills.first,true);assert.equal(skills.again,false);assert.equal(skills.pending,0);assert.equal(skills.playing,true);assert.equal(skills.gained,1);check('nonblocking skill choice consumes one earned level and rejects repeat clicks');
 const cap=await run(page,`(()=>{game.weapons=Array.from({length:60},(_,i)=>({id:'cap'+i,type:'ars11',damage:10,rarity:'common'}));game.activeLength=-1;const speed=spinSpeed();offerWeapon({id:'new',type:'ars11',damage:40,rarity:'rare'});resolveWeaponOffer(true);const count=game.weapons.length,replaced=game.weapons.some(w=>w.id==='new');game.weapons.push(...Array.from({length:40},(_,i)=>({id:'legacy'+i,type:'ars11'})));return {count,replaced,speed,legacySpeed:spinSpeed()};})()`);
 assert.equal(cap.count,60);assert.equal(cap.replaced,true);assert.equal(cap.speed,cap.legacySpeed);assert.ok(cap.speed<=32);check('full orbit offers a replacement and legacy reserves cannot accelerate visible weapons');
 const npc=await run(page,`(()=>{peers.clear();game.joinedAt=1;const id='fnpctest01';peers.set(id,{id,init:1,last:performance.now(),joinedAt:2,x:0,y:0,life:{phase:'alive'},bl:[]});game.bots=[{id:'bot1',generation:2,x:0,y:0,blades:0,hp:200,maxHp:240,dead:0}];const packet={id,npcActions:[{id:id+'n1',bot:'bot1',generation:2,damage:50,loss:0,t:Date.now()}]};receiveNpcMessages(packet);receiveNpcMessages(packet);const hp=game.bots[0].hp;packet.npcActions=[{id:id+'n2',bot:'bot1',generation:1,damage:1000,loss:0,t:Date.now()}];receiveNpcMessages(packet);return {hp,staleHp:game.bots[0].hp};})()`);
 assert.equal(npc.hp,150);assert.equal(npc.staleHp,150);check('shared NPC damage is idempotent and an earlier life cannot damage a respawn');
 const weighted=await run(page,`(()=>{const savedNow=now;const actor={impact:{kind:'clash',force:260,t0:now}};const first=orbitRate(actor,20);now+=.15;const recovering=orbitRate(actor,20);now+=.5;const restored=orbitRate(actor,20);now=savedNow;const inherited=inheritedFlight({x:0,y:0,mx:100,my:0},{a:0,speed:5,reach:60,rarity:'epic'});spawnClashFlight(60,0,0,0,'ars11',inherited);const f=game.flyWeapons.at(-1);return {first,recovering,restored,vx:f.vx,vy:f.vy,a:f.a};})()`);
 assert.ok(weighted.first<0);assert.ok(weighted.recovering>0&&weighted.recovering<20);assert.equal(weighted.restored,20);assert.ok(weighted.vx>100);assert.equal(weighted.vy,300);assert.equal(weighted.a,0);check('clash physically reverses then restores orbit drive; detached blades inherit tangential velocity and owner momentum');
 await calm(page);
 const cuts=await run(page,`(()=>{peers.clear();game.growS=1;game.swordPhase=0;game.combatDt=1/120;const w={id:'bear-blade',type:'ars11',damage:10,rarity:'common',slot:0};game.weapons=[w];game.activeLength=-1;game.ringSize=1;const m={id:9001,beast:'bear',x:swordRange()+35,y:0,r:26,hp:1000,maxHp:1000,speed:50,damage:10,facing:0};const before={x:m.x,y:m.y};hitWithExtraWeapon(m,w,0,1);const first=m.hp;for(let i=0;i<120;i++){now+=1/120;hitWithExtraWeapon(m,w,0,1);}const held=m.hp;game.swordPhase=Math.PI;hitWithExtraWeapon(m,w,0,1);now+=.2;game.swordPhase=TAU;hitWithExtraWeapon(m,w,0,1);return {first,held,last:m.hp,before,after:{x:m.x,y:m.y},wounds:m.wounds.length,bleed:m.bleed||0};})()`);
 assert.equal(cuts.first,970);assert.equal(cuts.held,970);assert.equal(cuts.last,940);assert.deepEqual(cuts.after,cuts.before);assert.equal(cuts.wounds,2);assert.equal(cuts.bleed,0);check('bear cuts create wounds without moving the bear onto the blade; continuous overlap cannot repeat damage, but a new crossing can');
 const attacks=await run(page,`(()=>{mySamples=[];game.p.hp=250;game.p.inv=0;game.p.x=47;game.p.y=0;game.mobs=[];const m={id:9002,beast:'bear',x:0,y:0,r:26,hp:1000,maxHp:1000,speed:50,damage:20,facing:0};startBearAttack(m,game.p,'bite');bearStrike(m);const before=game.p.hp;now+=.64;bearStrike(m);const once=game.p.hp;game.p.inv=0;bearStrike(m);const twice=game.p.hp;now+=1;game.p.x=-90;startBearAttack(m,game.p,'swat');game.p.x=500;now+=.64;game.p.inv=0;bearStrike(m);const dodge=game.p.hp;return {before,once,twice,dodge,jump:m.jump||null,projectiles:bearShots.length};})()`);
 assert.equal(attacks.before,250);assert.ok(attacks.once<250);assert.equal(attacks.twice,attacks.once);assert.equal(attacks.dodge,attacks.once);assert.equal(attacks.jump,null);assert.equal(attacks.projectiles,0);check('bear bite only damages during actual contact once; moving out of a committed swat avoids damage and no leap or ranged shot is produced');
 const stability=await run(page,`(()=>{function simulate(hz){const m={id:9100+hz,beast:'bear',x:0,y:0,r:26,hp:10000,maxHp:10000,speed:0,damage:1,facing:0,kvx:100,kvy:0,bearAttack:{id:'test',kind:'bite',side:1,t0:now,windup:100,active:.28,recovery:.65,hit:[]}};for(let i=0;i<hz;i++){now+=1/hz;tickBear(m,1/hz);}return {x:m.x,y:m.y,z:m.jumpHeight||0};}return {slow:simulate(30),fast:simulate(120)};})()`);
 assert.ok(Math.abs(stability.slow.x-stability.fast.x)<3);assert.ok(stability.slow.x<30&&stability.fast.x<30);assert.equal(stability.slow.z,0);check('grounded bear knockback damps stably at 30 and 120 Hz without orbiting or airborne motion');
 await run(page,`game.p.x=0;game.p.y=0;cam.x=cam.y=0;userZoom=.8;screenScale=1.1;game.elapsed=90;game.announceTimer=0;$('announce').classList.remove('visible');game.mobs=Array.from({length:4},(_,i)=>({id:9200+i,beast:i===3?'polar':'bear',x:-220+i*145,y:100,r:26,hp:500,maxHp:1000,speed:50,damage:10,facing:.25,walk:1,boss:i===3,wounds:[],attackCooldown:0}));for(const m of game.mobs){applyBearWound(m,40,{x:m.x+10,y:m.y+8,a:.5});startBearAttack(m,{x:m.x+100,y:m.y},['swat','bite','charge','press'][m.id-9200]);m.bearAttack.t0=now-.64;}paused=true;`);
 await page.waitForTimeout(150);await page.screenshot({path:path.join(artifacts,'bear-combat.png')});check('wounded brown and polar bears render grounded swat, bite, charge and press poses');
 const bladeLoads=await run(page,`(()=>{peers.clear();game.p.x=game.p.y=0;game.growS=1;const results=[];for(const count of [1,10,60])for(const hz of [30,60,120]){game.weapons=Array.from({length:count},(_,i)=>({id:'load'+count+'-'+i,type:'ars11',rarity:'common',damage:1,slot:i}));game.activeLength=-1;game.ringSize=count;game.swordPhase=0;game.combatDt=1/hz;const m={id:9300+count+hz,beast:'bear',x:swordRange()+35,y:0,r:26,hp:10000,maxHp:10000,speed:0,damage:1,facing:0,bearAttack:{id:'hold',kind:'bite',side:1,t0:now,windup:100,active:.28,recovery:.65,hit:[]}};const origin={x:m.x,y:m.y};for(let i=0;i<hz;i++){now+=1/hz;game.swordPhase+=spinSpeed()/hz;tickBear(m,1/hz);for(const w of allActiveWeapons())hitWithExtraWeapon(m,w,0,count);}results.push({count,hz,hp:m.hp,distance:Math.hypot(m.x-origin.x,m.y-origin.y),wounds:(m.wounds||[]).length});}return results;})()`);
 assert.equal(bladeLoads.length,9);assert.ok(bladeLoads.every(r=>r.hp<10000&&Number.isFinite(r.distance)&&r.distance<160&&r.wounds<=8));check('bear combat remains bounded with 1, 10 and 60 rotating blades at 30, 60 and 120 Hz');
 const handover=await run(page,`(()=>{peers.clear();game.joinedAt=2;const id='fbeartest01';peers.set(id,{id,joinedAt:1,init:1,last:performance.now(),life:{phase:'alive'}});const raw={id:id+'b1',beast:'bear',x:0,y:0,r:26,hp:500,maxHp:1000,speed:50,damage:10,woundSerial:7,attackSerial:5,wounds:[],attack:{id:id+'b1a5',kind:'bite',side:1,at:Date.now(),windup:.5,active:.28,recovery:.65,hit:[CLIENT_ID]}};receiveBearMessages({id,seq:99999,bears:[raw]});const m=game.mobs.find(isNaturalBear),keptHit=m.bearAttack.hit.includes(CLIENT_ID);peers.clear();startBearAttack(m,{x:100,y:0},'bite');applyBearWound(m,10,{x:1,y:0,a:0});game.bearReceivedAt=performance.now()-7000;updateSharedBear(m,.016);return {keptHit,attack:m.bearAttack.id,wound:m.wounds.at(-1).id,stale:m.stale,hp:m.hp};})()`);
 assert.equal(handover.keptHit,true);assert.equal(handover.attack,'fbeartest01b1a6');assert.equal(handover.wound,'fbeartest01b1w8');assert.equal(handover.stale,true);assert.equal(handover.hp,490);check('bear ownership transfer preserves attack/wound serials and prior victims; stale snapshots cannot fabricate a death');
 const coreContact=await run(page,`(()=>{peers.clear();game.bots=[];game.p.x=game.p.y=0;game.p.hp=250;game.p.inv=game.p.bladeCd=0;game.growS=1;game.weapons=[];game.activeLength=-1;const enemy={id:'fcoretest01',name:'Enemy',x:0,y:0,s:0,w:5,init:1,last:performance.now(),growS:1,life:{phase:'alive'},bl:[{id:'coreblade',o:0,m:1,reach:48,damage:24,type:'ars11',speed:5}]};peers.set(enemy.id,enemy);pushBodies(game.p);const separation=Math.hypot(game.p.x,game.p.y);pushFromBlades(game.p,.016);const hp=game.p.hp;game.p.hp=250;game.p.inv=game.p.bladeCd=0;game.weapons=[{id:'myguard',type:'ars11',damage:10,rarity:'common',slot:0}];game.activeLength=-1;game.ringSize=1;game.swordPhase=Math.PI/2;pushFromBlades(game.p,.016);const open=game.p.hp;game.p.hp=250;game.p.inv=game.p.bladeCd=0;game.swordPhase=0;const blocked=bladeGuardContact(bladeSegments()[0]);pushFromBlades(game.p,.016);return {separation,hp,open,blocked,guardHp:game.p.hp};})()`);
 assert.ok(Math.abs(coreContact.separation-44)<1e-6);assert.equal(coreContact.hp,226);assert.equal(coreContact.open,226);assert.equal(coreContact.blocked,true);assert.equal(coreContact.guardHp,250);check('overlapping players separate at body size; the inner hilt can hit, carrying a blade is not immunity, and actual blade contact blocks');
 const growth=await run(page,`(()=>{game.level=49;game.xp=0;game.nextXP=1;game.p.maxHp=250;game.p.hp=200;earnXP(1);return {level:game.level,hp:game.p.maxHp};})()`);
 assert.equal(growth.level,50);assert.equal(growth.hp,251);check('levels remain uncapped while late-level health growth diminishes instead of adding eight HP forever');
 const walls=await run(page,`(()=>{peers.clear();game.bots=[];game.growS=1;game.obsGrid=null;game.p.mx=game.p.my=0;const id='fwalltest01';peers.set(id,{id,x:0,y:0,init:1,last:performance.now(),life:{phase:'alive'},growS:1});const results=[];for(const fixture of [{p:{x:30,y:0},obs:[{x:70,y:0}]},{p:{x:0,y:20},obs:[{x:-52,y:0},{x:52,y:0}]},{p:{x:15,y:10},obs:[{x:80,y:0},{x:0,y:90}]}]){game.obstacles=fixture.obs;Object.assign(game.p,fixture.p);pushBodies(game.p);const first={x:game.p.x,y:game.p.y};for(let i=0;i<30;i++)pushBodies(game.p);results.push({blocked:bodyObstacleOverlap(game.p.x,game.p.y,22),distance:Math.hypot(game.p.x,game.p.y),drift:Math.hypot(game.p.x-first.x,game.p.y-first.y)});}game.obstacles=[];game.obsGrid=new Map();peers.clear();return results;})()`);
 assert.ok(walls.every(r=>!r.blocked&&r.distance>=43.9&&r.drift<.01));check('body resolution slides around walls and door-width corridors without penetrating props or jittering over repeated frames');
 const records=await run(page,`(()=>{game.combatStats=undefined;recordCombat('damage',24,'melee');recordCombat('damage',10,'bear:bite');recordCombat('guard');recordCombat('absorbed');for(let i=0;i<22;i++)saveCombatRun();const runs=JSON.parse(localStorage.getItem('frostline_combat_runs'));const zones=[];for(const [x,y] of [[game.p.x,game.p.y-30],[game.p.x+20,game.p.y],[game.p.x,game.p.y+20]]){applyImpact(game.p,100,0,x,y);zones.push(game.p.impact.zone);}return {stats:runs[0],count:runs.length,zones};})()`);
 assert.equal(records.count,20);assert.equal(records.stats.damage,34);assert.equal(records.stats.hits,2);assert.equal(records.stats.guards,1);assert.equal(records.stats.absorbed,1);assert.deepEqual(records.zones,['head','shoulder','legs']);check('local combat summaries retain twenty rounds with damage sources and blocks; contact positions select distinct hurt zones');
 assert.deepEqual(errors,[]);check('no JavaScript errors on desktop, mobile, death or all character renderers');
 fs.writeFileSync(path.join(artifacts,'results.json'),JSON.stringify({passed,errors},null,2));
 console.log(`\n${passed.length} browser integration checks passed.`);
})().catch(e=>{console.error(e);console.error('Browser errors:',errors);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
