// Offline media renderer, NOT browser QA. Uses the built game and its own drawing/physics.
// Usage: node render-preview.mjs <canvas-module-dir> <output-dir>
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { JSDOM } from 'jsdom';
const requireCanvas=createRequire(`${process.argv[2]}/package.json`);
const {createCanvas,GlobalFonts}=requireCanvas('@napi-rs/canvas');
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf','system-ui');
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf','sans-serif');
const out=process.argv[3];
const assets=new URL('../dist/assets/',import.meta.url);
const bundle=readFileSync(new URL(readdirSync(assets).find(n=>n.endsWith('.js')),assets),'utf8');
const encode=(name,w,h)=>spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate','30','-vcodec','png','-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',`${out}/${name}.mp4`],{stdio:['pipe','inherit','inherit']});
const land=createCanvas(1920,1080),port=createCanvas(1080,1620);
const lc=land.getContext('2d'),pc=port.getContext('2d');
const le=encode('preview-landscape-body',1920,1080),pe=encode('preview-portrait-body',1080,1620);
const finished=[once(le,'close'),once(pe,'close')];
const clips=[{site:0,rank:0,angle:18,power:85,kind:'standard'}, {site:5,rank:1,angle:25,power:85,kind:'standard'}, {site:8,rank:3,angle:35,power:70,kind:'magnet'}];
for(const [clipIndex,c] of [...clips,...clips].entries()) {
 const dom=new JSDOM('<div id="app"></div>',{url:'https://scrapshot.test',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;let callback,now=100;const scene=createCanvas(3000,1680);
 const sc=scene.getContext("2d");sc.scale(3,3);
 // Omit in-canvas labels in promotional camera crops to avoid clipped HUD text.
 sc.fillText=()=>{};
 w.matchMedia=()=>({matches:false});
 w.HTMLCanvasElement.prototype.getContext=()=>scene.getContext('2d');
 w.requestAnimationFrame=cb=>{callback=cb;return 1;};
 w.localStorage.setItem('scrapshot.muted','true');
 w.localStorage.setItem('scrapshot.progress.v1',JSON.stringify({schema:3,unlocked:c.site,best:[],coins:0,toolsUnlocked:2,upgrades:{impact:c.rank,magazine:0}}));
 w.eval(bundle);
 const el=id=>w.document.getElementById(id);
 const range=(id,value)=>{el(id).value=String(value);el(id).dispatchEvent(new w.Event('input'));};
 range('angle',c.angle);range('power',c.power);w.document.querySelector(`[data-kind="${c.kind}"]`).click();
 for(let n=0;n<120;n++){now+=1000/60;callback(now);}
 for(let f=0;f<85;f++) {
  if(f===18)el('fire').click();
  for(let n=0;n<2;n++){now+=1000/60;callback(now);}
  lc.drawImage(scene,0,0,1920,1080);
  // Portrait is a camera crop of the same real simulation, from launcher to impact.
  const travel=Math.max(0,Math.min(1,(f-14)/48));
  const cropX=50+travel*550;
  // The portrait crop is resized without stretching: source width must match 2:3.
  pc.drawImage(scene,cropX*3,150*3,410*2/3*3,410*3,0,0,1080,1620);
  for(const [ctx,width,size] of [[lc,1920,55],[pc,1080,74]]) {
   ctx.fillStyle='#173e35';ctx.font=`900 ${size}px sans-serif`;ctx.fillText('SCRAPSHOT',width===1920?60:42,100);
  }
  if(f===60){writeFileSync(`${out}/frame-${clipIndex}-landscape.png`,land.toBuffer('image/png'));writeFileSync(`${out}/frame-${clipIndex}-portrait.png`,port.toBuffer('image/png'));}
  for(const [child,canvas] of [[le,land],[pe,port]]) if(!child.stdin.write(canvas.toBuffer('image/png'))) await once(child.stdin,'drain');
 }
 dom.window.close();
}
le.stdin.end();pe.stdin.end();
for(const r of await Promise.all(finished))if(r[0]!==0)throw new Error('Video encoding failed');
console.log('Rendered 17 seconds per orientation at 30 fps, real-time simulation.');
