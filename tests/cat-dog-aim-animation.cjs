const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('Cat_vs_Dog_ZebraPortal2026_CoverMatch_v2.2.html','utf8');
function section(start,end){const a=html.indexOf(start),b=html.indexOf(end,a);assert(a>=0&&b>a,`Missing ${start}`);return html.slice(a,b)}
const script=section('function dragAimTarget(', 'function point(')+section('function characterTransform(', 'function renderCoverMatchedCharacter(')+section('throwHandWorld=function(team){','// Ready/windup frames');
const s={screen:'play',turn:'cat',clock:0,angle:48,drag:null,aimMotion:0};
const ctx={s,Math,DOG_X:1340,CAT_X:63,clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),rigMotion:{cat:null,dog:null},actorFrame:()=>({pose:2,nextPose:2,blend:0}),moodOf:()=> 'aim',throwHandWorld(){}};
vm.createContext(ctx);vm.runInContext(script,ctx);
assert.equal(ctx.dragAimTarget(),0);
const resting=ctx.throwHandWorld('cat');
s.drag={start:{x:0,y:0},end:{x:20,y:-20}};ctx.updateDragAim(.2);const light=s.aimMotion;
s.drag.end={x:220,y:-100};ctx.updateDragAim(.5);assert(s.aimMotion>light+.3,'larger drag increases windup');
const low=ctx.characterTransform('cat','aim',0,{pose:2});s.angle=75;const high=ctx.characterTransform('cat','aim',0,{pose:2});assert.notEqual(low.lean,high.lean,'aim angle changes pose');
const drawn=ctx.throwHandWorld('cat');assert(Math.hypot(drawn.x-resting.x,drawn.y-resting.y)>2,'guide follows animated paw');
s.turn='dog';assert.equal(ctx.dragAimTarget(),0,'cat drag animation is inactive on dog turn');
s.turn='cat';s.drag=null;ctx.updateDragAim(.5);assert(s.aimMotion<.02,'release/cancel returns pose to rest');
console.log('Cat drag aim animation, angle, paw position and cancellation passed');
