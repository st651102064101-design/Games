// Real Chromium integration tests. The evaluation hook exists only in the local
// test response; the shipped HTML has no gameplay mutation/test API.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'Frostline_v3_4_holes.html'),'utf8');
const testHTML=html.replace('})()\n</script>','window.__gameEval=code=>eval(code);\n})()\n</script>');
assert.notEqual(testHTML,html);
const records=new Map(),store={setJSON:async(k,v)=>records.set(k,v),get:async k=>records.get(k),delete:async k=>records.delete(k),list:async()=>({blobs:[...records.keys()].map(key=>({key}))})};
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
 assert.equal(await run(page,'game.p.maxHp'),250);assert.equal(await run(page,'userZoom'),.6);
 await run(page,"applyFieldItem('armor')");assert.equal(await run(page,'game.p.maxHp'),266);
 check('250 starting HP, doubled armor health, default zoom 0.6');
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
  const far=bladeBodyContact(0,0,0,48,'ars11',1,145,0,24,0);
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
 assert.equal(await run(page,'cameraTiltTarget'),90);assert.equal(await run(page,'userZoom'),.6);
 for(let y=350;y<=570;y+=20){await pointer(page,'pointermove',10,300,y,true);await pointer(page,'pointermove',11,500,y);}
 assert.equal(await run(page,'cameraTiltTarget'),0);
 await pointer(page,'pointerup',10,300,570,true);await pointer(page,'pointerup',11,500,570);
 await pointer(page,'pointerdown',12,300,500,true);await pointer(page,'pointerdown',13,500,500);
 await pointer(page,'pointermove',12,240,500,true);await pointer(page,'pointermove',13,560,500);
 assert.ok(await run(page,'userZoom')>.6);await pointer(page,'pointercancel',12,240,500,true);await pointer(page,'pointercancel',13,560,500);
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

 // A second isolated browser context exercises the HTTP relay, not BroadcastChannel.
 const context2=await browser.newContext({viewport:{width:960,height:760}});
 await context2.addInitScript(()=>{Object.defineProperty(navigator,'onLine',{get:()=>false});for(const key of ['frostline_guide_complete','frostline_warp_guide_v2','frostline_howto_illustrated_v2'])localStorage.setItem(key,'1');localStorage.setItem('frostline_name','Observer');localStorage.setItem('frostline_audio_v1','{"master":0,"music":0}');});
 const observer=await context2.newPage();observer.on('pageerror',e=>errors.push(e.message));await observer.goto(url);await observer.locator('#playBtn').click();await calm(observer);
 await run(page,'newGame();');await calm(page);
 await run(page,"PLAYER_NAME='Hero';game.p.x=80;game.p.y=0;game.dog.x=120;game.dog.y=20;cameraTilt=cameraTiltTarget=0;userZoom=.6;paused=false;game.p.inv=999;sendMyState(1);syncCloud();");
 await run(observer,'paused=false;game.p.inv=999;sendMyState(1);syncCloud();');
 await observer.waitForFunction(()=>window.__gameEval("[...peers.values()].some(r=>r.name==='Hero'&&r.dog)"),null,{timeout:8000});
 const heroId=await run(page,'CLIENT_ID');
 check('another browser receives the remote pet via the actual HTTP relay sanitizer');
 await run(page,'game.p.hp=0;endGame();');
 await observer.waitForFunction(id=>window.__gameEval(`peers.get('${id}')?.life?.phase==='rescue'`),heroId,{timeout:5000});
 assert.equal(await run(observer,`!!peers.get('${heroId}').reviveFx`),true);
 await page.waitForFunction(()=>window.__gameEval("mode==='playing'&&game.dog?.state==='sacrifice'"));
 await observer.waitForFunction(id=>window.__gameEval(`peers.get('${id}')?.life?.phase==='rise'&&peers.get('${id}')?.dog?.state==='sacrifice'`),heroId,{timeout:5000});
 assert.equal(await run(page,'game.p.hp'),125);
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
 assert.deepEqual(errors,[]);check('no JavaScript errors on desktop, mobile, death or all character renderers');
 fs.writeFileSync(path.join(artifacts,'results.json'),JSON.stringify({passed,errors},null,2));
 console.log(`\n${passed.length} browser integration checks passed.`);
})().catch(e=>{console.error(e);console.error('Browser errors:',errors);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
