const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('Cat_vs_Dog_ZebraPortal2026_CoverMatch_v2.2.html','utf8');
const bar=html.slice(html.indexOf('<div class="controlbar">'),html.indexOf('</div>\n</div>\n<div class="toast"'));
for(const [id,label] of [['soundButton','เสียง'],['pauseButton','พัก'],['resetButton','เริ่มใหม่']]){
 const match=bar.match(new RegExp(`<button[^>]*id="${id}"[^>]*>[\\s\\S]*?<\\/button>`));
 assert(match,`${id} is present`);assert(match[0].includes('<svg'),'control uses a clear SVG');assert(match[0].includes(label),'control has a short Thai label');assert(match[0].includes('aria-label='),'control remains accessible');
}
const a=html.indexOf('function setSoundEnabled('),b=html.indexOf('function burst(',a);assert(a>=0&&b>a,'sound toggle keeps its visual state');
let chime=0;const button={dataset:{},attrs:{},setAttribute(k,v){this.attrs[k]=v}};const s={sound:true};const ctx={s,$:()=>button,twinkle:()=>chime++};vm.createContext(ctx);vm.runInContext(html.slice(a,b),ctx);
ctx.setSoundEnabled(false);assert.equal(s.sound,false);assert.equal(button.dataset.muted,'true');assert.equal(button.attrs['aria-label'],'เปิดเสียง');assert.equal(chime,0);
ctx.setSoundEnabled(true);assert.equal(s.sound,true);assert.equal(button.dataset.muted,'false');assert.equal(button.attrs['aria-label'],'ปิดเสียง');assert.equal(chime,1);
console.log('SVG controls, labels and sound toggle state passed');
