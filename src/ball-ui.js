/* Playable experiment controls. The top view is coordinate telemetry, not vision. */
(function(){
'use strict';
const lab=window.lab,S=Stewart,B=StewartBall,A=StewartActuator,$=id=>document.getElementById(id);
const style=document.createElement('style');style.textContent=`
.ball-entry{min-width:64px;white-space:nowrap;background:#176f69!important;color:white!important}.ball-active #lessonBar{display:none}
.ball-active .hud h2{font-size:clamp(22px,2.3vw,34px)}
.ball-top{display:block;width:100%;max-width:300px;aspect-ratio:1;margin:10px auto;border-radius:12px;touch-action:none;cursor:crosshair;background:#edf3f3}
.ball-tools{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:12px 0}.ball-tools button{font-size:12px;padding:10px 6px}
.ball-tools .primary{grid-column:1/-1}.ball-metrics{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}.ball-metrics strong{display:block;font:22px ui-monospace,monospace;color:#125e59}.ball-metrics small{font-size:10px;color:#60777d}
#ballStatus{font:12px/1.6 ui-monospace,monospace;padding:10px 12px;background:#eff5f3;border-radius:8px;white-space:pre-line}
#panel-ball .lead{margin-bottom:8px}#ballHelp{font-size:11px;color:#516b75;line-height:1.6}.ball-row{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:12px 0}.ball-row label{font-size:12px}.ball-row input{max-width:76px}
`;document.head.appendChild(style);
const tab=document.createElement('button');tab.className='tab ball-entry';tab.textContent='Ball Lab';tab.dataset.tab='ball';tab.onclick=()=>lab.openBall();document.querySelector('.tabs').prepend(tab);
const panel=document.createElement('section');panel.className='panel';panel.id='panel-ball';panel.innerHTML=`
<h3>Keep the ball on the plate.</h3><p class="lead">Move the target. The controller tilts the real mechanism—not the ball.</p>
<canvas id="ballTop" class="ball-top" width="500" height="500" tabindex="0" aria-label="Top-view coordinates. Click or drag a target; arrow keys move it by 10 mm."></canvas>
<div class="ball-metrics"><div><small>TARGET ERROR</small><strong id="ballError">—</strong></div><div><small>EDGE MARGIN</small><strong id="ballEdge">—</strong></div></div>
<div class="ball-tools"><button id="ballBalance" class="primary">Balance at center</button><button id="ballCircle">Trace a circle</button><button id="ballPush">Push the ball ↗</button><button id="ballReset">Reset ball & balance</button><button id="ballResetAll">Reset tested setup</button><button id="ballOff">Compare: control OFF</button><button id="ballFall">Try a fall</button><button id="ballPose" style="grid-column:1/-1">Tilt the plate manually →</button></div>
<div id="ballStatus" aria-live="off"></div>
<div class="ball-row"><label for="ballDrive">Drive profile (new run)</label><select id="ballDrive"><option value="servo">24 V servo + sensors</option><option value="ideal">Ideal force comparison</option></select></div>
<div class="ball-row"><label for="ballSensor">Position sensing</label><select id="ballSensor"><option value="ideal">Ideal state</option><option value="sampled">Sampled position</option></select></div>
<div class="ball-row"><label for="ballLatency">Position delay (ms)</label><input id="ballLatency" type="number" min="0" max="200" step="5" value="40"></div>
<div class="ball-row"><label for="ballNoise">Position noise bound (mm)</label><input id="ballNoise" type="number" min="0" max="5" step=".1" value=".7"></div>
<details id="driveParameters"><summary>Drive and sensor parameters</summary>
<div class="ball-row"><label for="ballSpeed">Command speed (mm/s)</label><input id="ballSpeed" type="number" min="20" max="100" step="5" value="60"></div>
<div class="ball-row"><label for="ballCurrent">Current limit (A)</label><input id="ballCurrent" type="number" min=".1" max="5" step=".1" value="2.5"></div>
<div class="ball-row"><label for="ballFrequency">Position sampling (Hz)</label><input id="ballFrequency" type="number" min="20" max="100" step="5" value="50"></div>
<div id="driveStatus" style="font:11px/1.6 ui-monospace,monospace;white-space:pre-line"></div></details>
<p id="ballHelp">Click the 3D deck, or click/drag the top view; arrow keys move the target by 10 mm. Orange is the simulated ball, the red crosshair is the accepted goal (or circle target), blue is the delivered measurement, and purple is the predicted position. The green trail follows the ball in 3D, including falls. The dashed circle is a guide, not a wall. <strong>Pause freezes physics; press Run to see your changes.</strong></p>
<details><summary>What the controls and sensors mean</summary><p class="bodycopy">Ball feedback OFF requests a level plate with motors on; it is not Drives off. Tilt manually keeps the current ball and drive but releases the target to the pose sliders. The Ball Lab tab or Return to ball control resumes automatic control without recreating the mechanism. Reset ball &amp; balance clears the ball, trajectory and observer while preserving the drive and sensor parameters. Reset tested setup starts a fresh 24 V servo run. Save project before resetting or changing drive profile.<br><br>The top view is coordinates, not camera pixels. Ideal state uses exact position and velocity. Sampled position uses capture-time observations and prediction across latency. Changing sensing parameters clears pending observations. Encoder/gyro/FK feedback belongs to the servo profile. All hardware values are assumptions, not calibration.</p></details>
<button id="ballCSV" style="width:100%">Ball CSV (positions + drive)</button><button id="ballExit" style="width:100%;margin-top:8px">Exit to platform workbench (resets) →</button>
`;
document.querySelector('.sidebar').insertBefore(panel,document.querySelector('.statusbar'));
// Persistent return path: never hidden inside a scrolled inspector.
const home=document.createElement('button');home.id='ballHome';home.textContent='Ball Lab';home.onclick=()=>lab.openBall();document.querySelector('.head-actions').prepend(home);
let samples=[],lastSample=-1,lastBall=null,drag=false;
lab.startBall=function(options={}){
 lab.reset(S.createGeometry({payloadMass:0}));lab.setMode('ik');
 if(options.drive!=='ideal')A.enable(lab.sim);
 const preset=options.drive==='ideal'?{}:{sensor:'sampled',frequency:50,latency:.04,noise:.0007,kp:2.5,kd:2.8,maxRate:.24,commandTau:.04};
 B.enable(lab.sim,Object.assign(preset,options));lab.renderer.home();lab.renderer.showGhost=true;lab.renderer.showForces=false;
 $('ghostToggle').classList.add('on');$('forceArrowToggle').classList.remove('on');
 lab.tab('ball');lab.running=!matchMedia('(prefers-reduced-motion: reduce)').matches;
 samples=[];lastSample=-1;sync();lab.updateTelemetry();return true;
};
function resumeBall(center=false){
 if(!lab.sim.ball)return lab.startBall();
 lab.tab('ball');if(lab.sim.halted){lab.toast('Numerical stop: use Reset tested setup.');draw();return false;}
 const b=lab.sim.ball;
 if(b.phase!=='contact')return resetBall();
 lab.setMode('ik');b.settings.control=true;b.nextControl=b.time;
 if(center)B.setTarget(lab.sim,[0,0]);
 sync();lab.updateTelemetry();return true;
}
lab.openBall=()=>resumeBall(false);
function resetBall(){
 if(!lab.sim.ball)return lab.startBall();
 if(lab.sim.halted){lab.toast('Use Reset tested setup after a numerical stop.');return false;}
 lab.setMode('ik');const b=lab.sim.ball;b.settings.control=true;b.settings.path='point';B.reset(lab.sim);
 samples=[];lastSample=-1;sync();lab.tab('ball');lab.updateTelemetry();return true;
}
function sync(){
 const b=lab.sim.ball;document.body.classList.toggle('ball-active',!!b);
 if(b){
  $('ballDrive').value=lab.sim.actuator?'servo':'ideal';
  if(lab.sim.actuator){$('ballSpeed').value=lab.sim.actuator.parameters.velocityLimit*1000;$('ballCurrent').value=lab.sim.actuator.parameters.maxCurrent;}
  $('ballFrequency').value=b.settings.frequency;$('ballSensor').value=b.settings.sensor;
  $('ballLatency').value=b.settings.latency*1000;$('ballNoise').value=b.settings.noise*1000;
 }
 syncLabels();
}
function syncLabels(){
 const b=lab.sim.ball,automatic=!!b&&b.settings.control&&lab.sim.settings.mode==='ik';
 document.body.classList.toggle('ball-active',!!b);
 home.textContent=!b?'Ball Lab':lab.sim.halted?'Ball Lab · reset required':b.phase!=='contact'?'Reset ball & resume':automatic?'Ball Lab':'Return to ball control';
 home.title='Open Ball Lab; resume its controller without losing the drive settings. A fallen ball is reset.';
 if(!b){document.querySelector('.hud h2').textContent='Six legs. Six degrees of freedom.';document.querySelector('.hud .subtitle').textContent='Set a target. Apply forces. Explore the response.';return;}
 $('ballOff').textContent=automatic?'Ball feedback OFF · level plate':'Resume ball feedback';
 $('ballReset').disabled=lab.sim.halted;$('ballPush').disabled=lab.sim.halted||b.phase!=='contact';$('ballFall').disabled=lab.sim.halted;
 $('ballSpeed').disabled=$('ballCurrent').disabled=!lab.sim.actuator;
 for(let id of['ballLatency','ballNoise','ballFrequency']){$(id).disabled=b.settings.sensor==='ideal';$(id).title=b.settings.sensor==='ideal'?'Select Sampled position to use delay, noise and sampling.':'';}
 $('ballCSV').disabled=!samples.length;
 document.querySelector('.hud h2').textContent=automatic?'A ball. A plate. A balancing act.':'Ball feedback suspended.';
 document.querySelector('.hud .subtitle').textContent=automatic?'Change the ball target or push it. Pause freezes physics.':'Use Return to ball control. Manual effort is not ball balancing.';
}
function need(){if(!lab.sim.ball)lab.startBall();return lab.sim.ball;}
$('ballExit').onclick=()=>{lab.reset(S.createGeometry());lab.renderer.showForces=true;$('forceArrowToggle').classList.add('on');lab.tab('control');sync();};
$('ballBalance').onclick=()=>resumeBall(true);
$('ballCircle').onclick=()=>{if(resumeBall()){need().settings.path='circle';sync();}};
$('ballPush').onclick=()=>{if(need().phase==='contact'){B.disturb(lab.sim,[.025,-.012,0]);if(!lab.running)lab.toast('Impulse applied. Press Run to advance the paused simulation.');}};
$('ballReset').onclick=resetBall;$('ballResetAll').onclick=()=>lab.startBall();
$('ballOff').onclick=()=>{
 const b=need();if(!b.settings.control||lab.sim.settings.mode!=='ik'){resumeBall();return;}
 lab.setMode('ik');b.settings.control=false;lab.setTarget(S.homeState(lab.sim.g));sync();lab.updateTelemetry();
};
$('ballPose').onclick=()=>{need();lab.setMode('ik');lab.setTarget(lab.sim.state);lab.tab('control');sync();lab.toast('Pose sliders now own the plate target. Return to ball control resumes balance.');};
$('ballFall').onclick=()=>{let b=need();lab.setMode('ik');lab.setTarget(S.homeState(lab.sim.g));b.settings.control=false;B.reset(lab.sim,[S.deckGeometry(lab.sim.g).radius-.035,0]);B.disturb(lab.sim,[.12,0,0]);sync();};
$('ballSensor').onchange=()=>{let b=need();b.settings.sensor=$('ballSensor').value;b.sensor=B.sensorState(b.time);sync();};
$('ballDrive').onchange=()=>lab.startBall({drive:$('ballDrive').value});
function numberInput(id,oldValue,min,max,apply){
 const input=$(id),v=Number(input.value);
 if(input.value.trim()!==''&&Number.isFinite(v)&&v>=min&&v<=max)apply(v);
 else{input.value=oldValue;lab.toast('Enter a number from '+min+' to '+max+'.');}
}
for(const [id,key,factor,min,max] of [['ballSpeed','velocityLimit',.001,20,100],['ballCurrent','maxCurrent',1,.1,5]])$(id).onchange=()=>{const a=lab.sim.actuator;if(a)numberInput(id,a.parameters[key]/factor,min,max,v=>a.parameters[key]=v*factor);};
for(const [id,key,factor,min,max] of [['ballFrequency','frequency',1,20,100],['ballLatency','latency',.001,0,200],['ballNoise','noise',.001,0,5]])$(id).onchange=()=>{const b=need();numberInput(id,b.settings[key]/factor,min,max,v=>{b.settings[key]=v*factor;b.sensor=B.sensorState(b.time);});};
document.addEventListener('stewart:loaded',sync);
// A short click selects a ball goal only while automatic ball control owns IK.
 // This callback consumes only hits on the actual top face, preserving orbit/pick.
 lab.renderer.onSurfacePick=(x,y)=>{
  const b=lab.sim.ball;
  if(!b||!b.settings.control||lab.sim.settings.mode!=='ik'||lab.sim.halted)return false;
  const xy=lab.renderer.pickDeck(lab.sim,x,y);if(!xy)return false;
  B.setTarget(lab.sim,xy);
  if(Math.hypot(xy[0]-b.goal[0],xy[1]-b.goal[1])>1e-6)lab.toast('Target limited to the inner operating area. The red crosshair shows the accepted goal.');
  return true;
 };
const canvas=$('ballTop');
function targetEvent(e){let b=need(),r=canvas.getBoundingClientRect(),radius=S.deckGeometry(lab.sim.g).radius;B.setTarget(lab.sim,[(e.clientX-r.left-r.width/2)/(r.width*.43)*radius,-(e.clientY-r.top-r.height/2)/(r.height*.43)*radius]);}
canvas.onpointerdown=e=>{drag=true;canvas.setPointerCapture(e.pointerId);targetEvent(e);};canvas.onpointermove=e=>{if(drag)targetEvent(e);};canvas.onpointerup=()=>drag=false;canvas.onpointercancel=()=>drag=false;
canvas.onkeydown=e=>{let delta={ArrowLeft:[-.01,0],ArrowRight:[.01,0],ArrowUp:[0,.01],ArrowDown:[0,-.01]}[e.key];if(delta){e.preventDefault();let b=need();B.setTarget(lab.sim,S.add(b.goal,delta));}};
$('ballCSV').onclick=()=>{
 if(!samples.length){lab.toast('Run the ball experiment before exporting measurements.');return;}const text='time_s,x_m,y_m,target_x_m,target_y_m,measured_x_m,measured_y_m,estimated_x_m,estimated_y_m,peak_current_A,peak_leg_speed_mps,sensor_age_s,edge_margin_m,roll_command_rad,pitch_command_rad,phase\n'+samples.map(r=>r.join(',')).join('\n');
 const url=URL.createObjectURL(new Blob([text],{type:'text/csv'})),a=document.createElement('a');a.href=url;a.download='ball-lab.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
function draw(){
 const b=lab.sim.ball;if(b!==lastBall){lastBall=b;samples=[];lastSample=-1;sync();}
 if(!b){document.body.classList.remove('ball-active');syncLabels();return;}syncLabels();
 const p=B.position(lab.sim),d=S.deckGeometry(lab.sim.g),marker=b.settings.path==='point'?b.goal:b.target,err=Math.hypot(p[0]-marker[0],p[1]-marker[1]),edge=d.radius-b.settings.radius-Math.hypot(...p);
 $('ballError').textContent=(err*1000).toFixed(1)+' mm';$('ballEdge').textContent=(edge*1000).toFixed(1)+' mm';
 const automatic=b.settings.control&&lab.sim.settings.mode==='ik';
 $('ballStatus').textContent=(lab.sim.halted?'NUMERICAL STOP — RESET TESTED SETUP':b.phase==='contact'?'BALL ON DECK':'BALL FELL — RESET BALL & BALANCE')+'\n'+(lab.running?'Running':'PAUSED — press Run to advance')+' / '+(automatic?'Ball feedback ON':'Ball feedback OFF · '+lab.sim.settings.mode)+'\nRoll target '+(b.command[0]*180/Math.PI).toFixed(1)+'° · Pitch target '+(b.command[1]*180/Math.PI).toFixed(1)+'°\n'+(b.sensor.stamp===null?'Position: waiting for first sample':b.settings.sensor+' position · '+(b.sensor.age*1000).toFixed(0)+' ms old');
 const drive=lab.sim.actuator;
 $('driveStatus').textContent=drive?('Generic DC-equivalent screw servo (not calibrated)\n'+drive.parameters.voltage+' V · '+(1000*drive.parameters.lead)+' mm/rev · '+drive.parameters.gear+':1 reduction\nMax |current| across 6 motors '+Math.max(...drive.motors.map(m=>Math.abs(m.current))).toFixed(2)+' A / '+drive.parameters.maxCurrent.toFixed(1)+' A\nMax |speed| across 6 legs '+(1000*Math.max(...drive.motors.map(m=>Math.abs(m.actualVelocity)))).toFixed(1)+' mm/s\nEncoder '+drive.parameters.encoderHz+' Hz · IMU '+drive.parameters.imuHz+' Hz\nEncoder FK '+(drive.fkOK?'valid':'not converged')+' · a_z specific force '+drive.accel[2].toFixed(2)+' m/s²'):'Ideal instantaneous effort; no electrical dynamics.';
 const ctx=canvas.getContext('2d'),c=250,r=215,px=v=>[c+v[0]/d.radius*r,c-v[1]/d.radius*r];ctx.clearRect(0,0,500,500);
 ctx.fillStyle='#dbe5e6';ctx.strokeStyle='#b4c6cd';ctx.lineWidth=2;ctx.beginPath();ctx.arc(c,c,r,0,7);ctx.fill();ctx.stroke();
 ctx.strokeStyle='#c4d2d5';for(let a=-.2;a<=.2;a+=.05){let t=px([a,0])[0];ctx.beginPath();ctx.moveTo(t,60);ctx.lineTo(t,440);ctx.stroke();ctx.beginPath();ctx.moveTo(60,t);ctx.lineTo(440,t);ctx.stroke();}
 ctx.strokeStyle='#b69462';ctx.setLineDash([8,7]);ctx.beginPath();ctx.arc(c,c,r*(d.radius-b.settings.radius-.02)/d.radius,0,7);ctx.stroke();ctx.setLineDash([]);
 ctx.strokeStyle='#78a9a6';ctx.lineWidth=3;ctx.beginPath();b.trail.forEach((v,i)=>{let a=px(S.rotate(S.qconj(lab.sim.state.q),S.sub(v,lab.sim.state.p)));i?ctx.lineTo(...a):ctx.moveTo(...a);});ctx.stroke();
 let t=px(marker);ctx.strokeStyle='#d63535';ctx.lineWidth=4;ctx.beginPath();ctx.arc(...t,12,0,7);ctx.stroke();ctx.beginPath();ctx.moveTo(t[0]-21,t[1]);ctx.lineTo(t[0]+21,t[1]);ctx.moveTo(t[0],t[1]-21);ctx.lineTo(t[0],t[1]+21);ctx.stroke();
 if(b.sensor.estimate){let m=px(b.sensor.estimate);ctx.strokeStyle='#8b58a6';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(m[0],m[1]-12);ctx.lineTo(m[0]+12,m[1]);ctx.lineTo(m[0],m[1]+12);ctx.lineTo(m[0]-12,m[1]);ctx.closePath();ctx.stroke();}
 if(b.sensor.measurement){let m=px(b.sensor.measurement);ctx.strokeStyle='#5a79b5';ctx.lineWidth=3;ctx.strokeRect(m[0]-9,m[1]-9,18,18);}
 let q=px(p);ctx.fillStyle='#d98038';ctx.beginPath();ctx.arc(...q,b.settings.radius/d.radius*r,0,7);ctx.fill();ctx.strokeStyle='#795139';ctx.lineWidth=2;ctx.stroke();
 ctx.fillStyle='#48636c';ctx.font='18px system-ui';ctx.fillText('TOP VIEW · COORDINATES, NOT CAMERA',35,480);
 if(b.time>0&&b.time-lastSample>.045){lastSample=b.time;let m=b.sensor.measurement||['',''],est=b.sensor.estimate||['',''];samples.push([b.time,...p,...b.target,...m,...est,drive?Math.max(...drive.motors.map(m=>Math.abs(m.current))):'',drive?Math.max(...drive.motors.map(m=>Math.abs(m.actualVelocity))):'',b.sensor.age,edge,...b.command,b.phase]);if(samples.length>10000)samples.shift();$('ballCSV').disabled=false;}
}
setInterval(draw,100);
// A reset or an original lesson deliberately drops the separate ball experiment.
document.querySelectorAll('[data-lesson]').forEach(button=>button.addEventListener('click',()=>{document.querySelector('.hud h2').textContent='Six legs. Six degrees of freedom.';document.querySelector('.hud .subtitle').textContent='Set a target. Apply forces. Explore the response.';}));
document.querySelector('.version').textContent='6-SPS · SENSOR / SERVO LAB';
const demo=new URLSearchParams(location.search).get('demo');
if(demo==='ball')lab.startBall();else sync();
})();
