/* Playable experiment controls. The top view is coordinate telemetry, not vision. */
(function(){
'use strict';
const lab=window.lab,S=Stewart,B=StewartBall,$=id=>document.getElementById(id);
const style=document.createElement('style');style.textContent=`
.ball-entry{min-width:64px;white-space:nowrap;background:#176f69!important;color:white!important}.ball-active #lessonBar{display:none}
.ball-active .hud h2{font-size:clamp(22px,2.3vw,34px)}
.ball-top{display:block;width:100%;max-width:300px;aspect-ratio:1;margin:10px auto;border-radius:12px;touch-action:none;cursor:crosshair;background:#edf3f3}
.ball-tools{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:12px 0}.ball-tools button{font-size:12px;padding:10px 6px}
.ball-tools .primary{grid-column:1/-1}.ball-metrics{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}.ball-metrics strong{display:block;font:22px ui-monospace,monospace;color:#125e59}.ball-metrics small{font-size:10px;color:#60777d}
#ballStatus{font:12px/1.6 ui-monospace,monospace;padding:10px 12px;background:#eff5f3;border-radius:8px;white-space:pre-line}
#panel-ball .lead{margin-bottom:8px}#ballHelp{font-size:11px;color:#516b75;line-height:1.6}.ball-row{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:12px 0}.ball-row label{font-size:12px}.ball-row input{max-width:76px}
`;document.head.appendChild(style);
const tab=document.createElement('button');tab.className='tab ball-entry';tab.textContent='Ball Lab';tab.dataset.tab='ball';tab.onclick=()=>{if(!lab.sim.ball)lab.startBall();else lab.tab('ball');};document.querySelector('.tabs').prepend(tab);
const panel=document.createElement('section');panel.className='panel';panel.id='panel-ball';panel.innerHTML=`
<h3>Keep the ball on the plate.</h3><p class="lead">Move the target. The controller tilts the real mechanism—not the ball.</p>
<canvas id="ballTop" class="ball-top" width="500" height="500" tabindex="0" aria-label="Top-view coordinates. Click or drag a target; arrow keys move it by 10 mm."></canvas>
<div class="ball-metrics"><div><small>TARGET ERROR</small><strong id="ballError">—</strong></div><div><small>EDGE MARGIN</small><strong id="ballEdge">—</strong></div></div>
<div class="ball-tools"><button id="ballBalance" class="primary">Balance at center</button><button id="ballCircle">Trace a circle</button><button id="ballPush">Push the ball ↗</button><button id="ballReset">Reset ball</button><button id="ballResetAll">Reset all</button><button id="ballOff">Compare: control OFF</button><button id="ballFall">Try a fall</button></div>
<div id="ballStatus" role="status"></div>
<div class="ball-row"><label for="ballSensor">Position sensing</label><select id="ballSensor"><option value="ideal">Ideal state</option><option value="sampled">Sampled position</option></select></div>
<div class="ball-row"><label for="ballLatency">Sensor delay (ms)</label><input id="ballLatency" type="number" min="0" max="200" step="5" value="35"></div>
<div class="ball-row"><label for="ballNoise">Noise bound (mm)</label><input id="ballNoise" type="number" min="0" max="5" step=".1" value=".7"></div>
<p id="ballHelp">Orange: ball · teal: target · blue: delivered measurement. Click the top view or use arrow keys. The dashed circle is a guide, not a wall. OFF keeps the plate level with its motors on. Reset ball respawns relative to the current plate; Reset all restores the reference setup. Ideal mode uses exact position and velocity. Sampled mode estimates velocity from delivered positions. This inset is not a camera.</p>
<button id="ballCSV" style="width:100%">Export ball measurements CSV</button><button id="ballExit" style="width:100%;margin-top:8px">Classic experiments →</button>
`;
document.querySelector('.sidebar').append(panel);
let samples=[],lastSample=-1,lastBall=null,drag=false;
lab.startBall=function(options={}){
 lab.reset(S.createGeometry({payloadMass:0}));lab.setMode('ik');B.enable(lab.sim,options);lab.renderer.home();
 lab.tab('ball');lab.running=!matchMedia('(prefers-reduced-motion: reduce)').matches;
 samples=[];lastSample=-1;sync();lab.updateTelemetry();return true;
};
function sync(){
 const b=lab.sim.ball;document.body.classList.toggle('ball-active',!!b);
 if(!b){document.querySelector('.hud h2').textContent='Six legs. Six degrees of freedom.';document.querySelector('.hud .subtitle').textContent='Set a target. Apply forces. Explore the response.';return;}
 $('ballSensor').value=b.settings.sensor;$('ballLatency').value=b.settings.latency*1000;$('ballNoise').value=b.settings.noise*1000;
 $('ballOff').textContent=b.settings.control?'Compare: control OFF':'Recover: control ON';
 const title=document.querySelector('.hud h2'),subtitle=document.querySelector('.hud .subtitle');
 title.textContent='A ball. A plate. A balancing act.';subtitle.textContent='Click a target, add a push, or switch the controller off.';
}
function need(){if(!lab.sim.ball)lab.startBall();return lab.sim.ball;}
$('ballExit').onclick=()=>{lab.reset(S.createGeometry());lab.running=!matchMedia('(prefers-reduced-motion: reduce)').matches;lab.tab('control');document.body.classList.remove('ball-active');document.querySelector('.hud h2').textContent='Six legs. Six degrees of freedom.';document.querySelector('.hud .subtitle').textContent='Set a target. Apply forces. Explore the response.';};
$('ballBalance').onclick=()=>{need().settings.control=true;B.setTarget(lab.sim,[0,0]);sync();};
$('ballCircle').onclick=()=>{let b=need();b.settings.control=true;b.settings.path='circle';sync();};
$('ballPush').onclick=()=>{need();B.disturb(lab.sim,[.025,-.012,0]);};
$('ballReset').onclick=()=>{need();B.reset(lab.sim);samples=[];lastSample=-1;sync();};
$('ballResetAll').onclick=()=>lab.startBall();
$('ballOff').onclick=()=>{let b=need();b.settings.control=!b.settings.control;sync();};
$('ballFall').onclick=()=>{let b=need();b.settings.control=false;B.reset(lab.sim,[S.deckGeometry(lab.sim.g).radius-.035,0]);B.disturb(lab.sim,[.12,0,0]);sync();};
$('ballSensor').onchange=()=>{let b=need();b.settings.sensor=$('ballSensor').value;b.sensor={queue:[],nextSample:b.time,delivered:0,measurement:null,velocity:[0,0],stamp:null,age:0,rng:1234567};};
for(const [id,k,scale,max]of[['ballLatency','latency',.001,200],['ballNoise','noise',.001,5]])$(id).onchange=()=>{const v=Number($(id).value);if(Number.isFinite(v)&&v>=0&&v<=max)need().settings[k]=v*scale;else sync();};
const canvas=$('ballTop');
function targetEvent(e){let b=need(),r=canvas.getBoundingClientRect(),radius=S.deckGeometry(lab.sim.g).radius;B.setTarget(lab.sim,[(e.clientX-r.left-r.width/2)/(r.width*.43)*radius,-(e.clientY-r.top-r.height/2)/(r.height*.43)*radius]);}
canvas.onpointerdown=e=>{drag=true;canvas.setPointerCapture(e.pointerId);targetEvent(e);};canvas.onpointermove=e=>{if(drag)targetEvent(e);};canvas.onpointerup=()=>drag=false;canvas.onpointercancel=()=>drag=false;
canvas.onkeydown=e=>{let delta={ArrowLeft:[-.01,0],ArrowRight:[.01,0],ArrowUp:[0,.01],ArrowDown:[0,-.01]}[e.key];if(delta){e.preventDefault();let b=need();B.setTarget(lab.sim,S.add(b.goal,delta));}};
$('ballCSV').onclick=()=>{
 if(!samples.length)return;const text='time_s,x_m,y_m,target_x_m,target_y_m,measured_x_m,measured_y_m,sensor_age_s,edge_margin_m,roll_command_rad,pitch_command_rad,phase\n'+samples.map(r=>r.join(',')).join('\n');
 const url=URL.createObjectURL(new Blob([text],{type:'text/csv'})),a=document.createElement('a');a.href=url;a.download='ball-lab.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
function draw(){
 const b=lab.sim.ball;if(b!==lastBall){lastBall=b;samples=[];lastSample=-1;sync();}
 if(!b){document.body.classList.remove('ball-active');return;}
 const p=B.position(lab.sim),d=S.deckGeometry(lab.sim.g),err=Math.hypot(p[0]-b.target[0],p[1]-b.target[1]),edge=d.radius-b.settings.radius-Math.hypot(...p);
 $('ballError').textContent=(err*1000).toFixed(1)+' mm';$('ballEdge').textContent=(edge*1000).toFixed(1)+' mm';
 $('ballStatus').textContent=(b.phase==='contact'?'ON THE DECK':'BALL FELL — RESET TO RETRY')+'\n'+(b.settings.control?'Outer loop ON':'Outer loop OFF · level hold')+' / '+b.settings.sensor+'\nRoll '+(b.command[0]*180/Math.PI).toFixed(1)+'° · Pitch '+(b.command[1]*180/Math.PI).toFixed(1)+'° · '+(b.sensor.age*1000).toFixed(0)+' ms old';
 const ctx=canvas.getContext('2d'),c=250,r=215,px=v=>[c+v[0]/d.radius*r,c-v[1]/d.radius*r];ctx.clearRect(0,0,500,500);
 ctx.fillStyle='#dbe5e6';ctx.strokeStyle='#b4c6cd';ctx.lineWidth=2;ctx.beginPath();ctx.arc(c,c,r,0,7);ctx.fill();ctx.stroke();
 ctx.strokeStyle='#c4d2d5';for(let a=-.2;a<=.2;a+=.05){let t=px([a,0])[0];ctx.beginPath();ctx.moveTo(t,60);ctx.lineTo(t,440);ctx.stroke();ctx.beginPath();ctx.moveTo(60,t);ctx.lineTo(440,t);ctx.stroke();}
 ctx.strokeStyle='#b69462';ctx.setLineDash([8,7]);ctx.beginPath();ctx.arc(c,c,r*(d.radius-b.settings.radius-.02)/d.radius,0,7);ctx.stroke();ctx.setLineDash([]);
 ctx.strokeStyle='#78a9a6';ctx.lineWidth=3;ctx.beginPath();b.trail.forEach((v,i)=>{let a=px(v);i?ctx.lineTo(...a):ctx.moveTo(...a);});ctx.stroke();
 let t=px(b.target);ctx.strokeStyle='#168b7e';ctx.lineWidth=4;ctx.beginPath();ctx.arc(...t,12,0,7);ctx.stroke();ctx.beginPath();ctx.moveTo(t[0]-21,t[1]);ctx.lineTo(t[0]+21,t[1]);ctx.moveTo(t[0],t[1]-21);ctx.lineTo(t[0],t[1]+21);ctx.stroke();
 if(b.sensor.measurement){let m=px(b.sensor.measurement);ctx.strokeStyle='#5a79b5';ctx.lineWidth=3;ctx.strokeRect(m[0]-9,m[1]-9,18,18);}
 let q=px(p);ctx.fillStyle='#d98038';ctx.beginPath();ctx.arc(...q,b.settings.radius/d.radius*r,0,7);ctx.fill();ctx.strokeStyle='#795139';ctx.lineWidth=2;ctx.stroke();
 ctx.fillStyle='#48636c';ctx.font='18px system-ui';ctx.fillText('TOP VIEW · COORDINATES, NOT CAMERA',35,480);
 if(b.time-lastSample>.045){lastSample=b.time;let m=b.sensor.measurement||['',''];samples.push([b.time,...p,...b.target,...m,b.sensor.age,edge,...b.command,b.phase]);if(samples.length>10000)samples.shift();}
}
setInterval(draw,100);
// A reset or an original lesson deliberately drops the separate ball experiment.
document.querySelectorAll('[data-lesson]').forEach(button=>button.addEventListener('click',()=>{document.querySelector('.hud h2').textContent='Six legs. Six degrees of freedom.';document.querySelector('.hud .subtitle').textContent='Set a target. Apply forces. Explore the response.';}));
document.querySelector('.version').textContent='6-SPS · BALL LAB / v1.2';
const demo=new URLSearchParams(location.search).get('demo');
if(demo==='ball')lab.startBall();
})();
