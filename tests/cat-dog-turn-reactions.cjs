const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('Cat_vs_Dog_ZebraPortal2026_CoverMatch_v2.2.html', 'utf8');
const extract = (start, end) => html.slice(html.indexOf(start), html.indexOf(end));
const code = [extract('function setTurn(t){', 'function setMode('), extract('function enterReactionStage(r){', 'function hitPlayer('), extract('function nextTurn(){', 'function endGame('), extract('function step(dt){', 'function updateCamera(')].join('\n');
const s = {screen:'play', turn:'cat', round:1, mode:'human', clock:0, hitStop:0, groundFx:[], particles:[], floats:[], shake:0, flash:0, toastTimer:0, bumps:{cat:{n:0,until:0},dog:{n:0,until:0}}, camX:0, camY:0, turnReady:true, botTimer:0, doubleRemaining:0, doubleSecond:false, winTeam:null, reaction:null, ball:null};
const ctx = {s, Math, DOG_X:1340, CAT_X:63, AIM_CAM_X:team=>team==='cat'?0:100, AIM_CAM_Y:0, setMood(){}, updateHud(){}, activeBot:()=>s.mode==='bot'&&s.turn==='dog', laughSound(){}, tone(){}, toast(){}, updateRigMotion(){}, G:660};
vm.createContext(ctx);vm.runInContext(code,ctx);
function advanceUntil(predicate){for(let i=0;i<400;i++){if(predicate())return;s.camX=ctx.AIM_CAM_X(s.reaction?.focus||s.turn);ctx.step(.1)}throw Error('reaction did not finish')}
function reset(team='cat',double=0){Object.assign(s,{turn:team,round:1,clock:0,camX:ctx.AIM_CAM_X(team),reaction:null,ball:null,throwSeq:null,finish:null,winTeam:null,doubleRemaining:double,doubleSecond:false,turnReady:true,pendingMissLaugh:null,botTimer:0})}
for(const [attacker,defender] of [['cat','dog'],['dog','cat']]){
 reset(attacker);ctx.beginReaction('miss',attacker,defender);
 assert.equal(s.reaction.stages[0].mood,'sulk');assert.equal(s.reaction.focus,attacker);assert.equal(s.turn,attacker);
 advanceUntil(()=>s.reaction?.kind==='turnLaugh');
 assert.equal(s.turn,defender);assert.equal(s.reaction.focus,defender);assert.equal(s.reaction.stages[0].mood,'laugh');assert.equal(s.turnReady,false);
 advanceUntil(()=>s.reaction===null);assert.equal(s.turn,defender);
}
reset('cat',1);ctx.beginReaction('wall','cat','dog');advanceUntil(()=>s.reaction===null);
assert.equal(s.turn,'cat');assert.equal(s.doubleSecond,true);assert.equal(s.pendingMissLaugh,'dog');
ctx.beginReaction('miss','cat','dog');advanceUntil(()=>s.reaction?.kind==='turnLaugh');assert.equal(s.turn,'dog');
reset('cat',1);ctx.beginReaction('miss','cat','dog');advanceUntil(()=>s.reaction===null);ctx.beginReaction('hit','cat','dog','body');assert.equal(s.pendingMissLaugh,null);
reset('cat');s.mode='bot';ctx.beginReaction('miss','cat','dog');advanceUntil(()=>s.reaction?.kind==='turnLaugh');assert.equal(s.botTimer,1.05);ctx.step(.1);assert.equal(s.botTimer,1.05);advanceUntil(()=>s.reaction===null);assert.equal(s.turn,'dog');assert.equal(s.botTimer,1.05);
console.log('Cat vs Dog miss reactions and double-throw turn order passed');
