const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('Cat_vs_Dog_ZebraPortal2026_CoverMatch_v2.2.html','utf8');
const extract=(a,b)=>{const i=html.indexOf(a),j=html.indexOf(b,i);assert(i>=0&&j>i,`Missing ${a}`);return html.slice(i,j)};
const config=extract('const W=1280', '// Keep the active character');
const draw=extract('function drawActor(team){','function drawCan(');
let rendered=[];
const s={screen:'play',turn:'cat',ball:null,reaction:{focus:'cat'},finish:null};
const c={s,Math,moodOf:()=> 'idle',renderCoverMatchedCharacter:(team,x)=>rendered.push({team,x})};
vm.createContext(c);vm.runInContext(config+'\n'+draw+'\nthis.arena={W,WORLD_W,DOG_X,CAT_X,WALL,G,VIEW_MAX_X};',c);
const {W,WORLD_W,DOG_X,CAT_X,WALL,G,VIEW_MAX_X}=c.arena;
assert(WORLD_W>W);assert(DOG_X-CAT_X>1100);assert.equal(WALL.x+WALL.w/2,WORLD_W/2);
assert(VIEW_MAX_X>0);assert(1010*1010/G>DOG_X-CAT_X-200,'maximum throw can reach opponent');
for(const state of [{ball:null,reaction:null,finish:null},{ball:null,reaction:{focus:'cat'},finish:null},{ball:{x:300},reaction:null,finish:null},{ball:null,reaction:null,finish:{focus:'cat'}}]){
 Object.assign(s,state);rendered=[];c.drawActor('cat');c.drawActor('dog');assert.deepEqual(rendered.map(x=>x.team),['cat','dog'],'both characters render regardless of turn or reaction');assert.equal(rendered[1].x,DOG_X);
}
// Exercise real projectile stepping at and beyond the former right boundary.
const sim={screen:'play',turn:'cat',clock:0,hitStop:0,groundFx:[],particles:[],floats:[],bumps:{cat:{n:0,until:0},dog:{n:0,until:0}},turnReady:true,botTimer:0,throwSeq:null,reaction:null,finish:null,wind:0,ball:null};
let hit=null,missed=false;
const v={s:sim,Math,DOG_X,G,GROUND:588,WORLD_W,H:720,WALL,activeBot:()=>false,updateRigMotion(){},hitPlayer:who=>{hit=who;sim.ball=null},miss:()=>{missed=true;sim.ball=null}};
vm.createContext(v);vm.runInContext(extract('function step(dt){','function updateCamera('),v);
const ball=(x,y,from)=>({x,y,from,vx:0,vy:0,r:18,age:0,rotation:0,trail:[]});
sim.ball=ball(W+5,400,'cat');v.step(.01);assert(sim.ball&&!missed,'shot remains in expanded arena beyond former edge');
sim.ball=ball(DOG_X+20,500,'cat');v.step(.01);assert.equal(hit,'dog','shot can hit dog at its new location');
hit=null;sim.ball=ball(100,500,'dog');v.step(.01);assert.equal(hit,'cat','dog can still hit cat');
// Confirm the existing gravity and power limits still allow either side to clear
// the wall and hit the opposing collision box in real projectile-sized steps.
function reachable(from){
 const origin=from==='cat'?{x:224,y:476}:{x:DOG_X+20,y:476};
 const target=from==='cat'?{x:DOG_X+11,y:449,w:150,h:145}:{x:87,y:454,w:152,h:140};
 for(let angle=28;angle<=65;angle+=2)for(let power=600;power<=1010;power+=10){
  let x=origin.x,y=origin.y,vx=(from==='cat'?1:-1)*Math.cos(angle*Math.PI/180)*power,vy=-Math.sin(angle*Math.PI/180)*power;
  for(let i=0;i<600;i++){const dt=1/120,r=18;vy+=G*dt;x+=vx*dt;y+=vy*dt;
   if(x+r>target.x&&x-r<target.x+target.w&&y+r>target.y&&y-r<target.y+target.h)return true;
   if((x+r>WALL.x&&x-r<WALL.x+WALL.w&&y+r>WALL.y&&y-r<588)||y+r>=588||x<-80||x>WORLD_W+80)break;
  }
 }
 return false;
}
assert(reachable('cat'),'cat can hit the dog with a valid shot');
assert(reachable('dog'),'dog can hit the cat with a valid shot');
console.log('Wider arena, reachable throws, collision positions and both actors rendering passed');
