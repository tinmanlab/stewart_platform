/* Sphere/deck contact and nested ball control. SI units; no renderer dependency.
 * First-order partitioned impulses; see docs/BALL_LAB.md for model boundaries. */
(function(root){
'use strict';
const S=root.Stewart;
const {add,sub,scale,dot,norm,cross,rotate,qconj,qmul,qexp,qnorm,clamp,solveSPD,pointJac,mv}=S;
const baseStep=S.step,baseSnapshot=S.snapshot,baseRestore=S.restore;
const xyz=(s,v)=>rotate(qconj(s.q),v);
function settings(o={}){
 const z=Object.assign({mass:.12,radius:.026,inertiaRatio:.4,mu:.45,rollingDrag:.015,
  control:true,path:'point',kp:4.5,kd:3.6,maxTilt:.14,maxRate:.7,
  sensor:'ideal',frequency:60,latency:.035,noise:.0007,dropout:0},o);
 for(const k of ['mass','radius','inertiaRatio','mu','rollingDrag','kp','kd','maxTilt','maxRate','frequency','latency','noise','dropout'])
  if(!Number.isFinite(z[k])||z[k]<0)throw Error('Invalid ball setting: '+k);
 if(z.mass<.01||z.mass>1||z.radius<.008||z.radius>.06||z.inertiaRatio<.1||z.inertiaRatio>1||z.mu>1.5||z.maxTilt>.25||z.maxRate>2||z.frequency<5||z.frequency>240||z.latency>1||z.noise>.02||z.dropout>1)throw Error('Ball settings outside educational range');
 if(!['ideal','sampled'].includes(z.sensor)||!['point','circle'].includes(z.path)||typeof z.control!=='boolean')throw Error('Invalid ball mode');
 return z;
}
function position(sim){return xyz(sim.state,sub(sim.ball.p,sim.state.p)).slice(0,2);}
function localVelocity(sim){const s=sim.state,b=sim.ball;return xyz(s,sub(sub(b.v,s.v.slice(0,3)),cross(s.v.slice(3,6),sub(b.p,s.p)))).slice(0,2);}
function enable(sim,o={}){
 if(sim.g.payloadMass!==0)throw Error('Ball Lab requires zero attached payload');
 sim.ball={settings:settings(o)};reset(sim);return sim.ball;
}
function reset(sim,xy=[-.10,.065]){
 if(xy.length!==2||!xy.every(Number.isFinite)||Math.hypot(...xy)>S.deckGeometry(sim.g).radius)throw Error('Spawn must lie on the deck');
 const set=sim.ball?.settings||settings(),deck=S.deckGeometry(sim.g),r=rotate(sim.state.q,[...xy,deck.top+set.radius]);
 sim.ball={settings:set,p:add(sim.state.p,r),v:add(sim.state.v.slice(0,3),cross(sim.state.v.slice(3,6),r)),w:sim.state.v.slice(3,6),q:[1,0,0,0],
  phase:'contact',time:0,nextControl:0,target:[0,0],goal:[0,0],targetVelocity:[0,0],targetAcceleration:[0,0],command:[0,0],
  sensor:{queue:[],nextSample:0,delivered:0,measurement:null,velocity:[0,0],stamp:null,age:0,rng:1234567},
  contact:{normalImpulse:0,tangentImpulse:[0,0,0],impulse:[0,0,0],platformImpulse:[0,0,0]},trail:[],lastTrail:-1};
 return sim.ball;
}
function setTarget(sim,xy){
 const b=sim.ball,max=S.deckGeometry(sim.g).radius-b.settings.radius-.055;
 if(!Array.isArray(xy)||xy.length!==2||!xy.every(Number.isFinite))return false;
 const n=Math.hypot(...xy);b.goal=n>max?scale(xy,max/n):xy.slice();b.settings.path='point';return true;
}
function random(b){let s=b.sensor;s.rng=(1664525*s.rng+1013904223)>>>0;return s.rng/4294967296;}
function observe(sim){
 const b=sim.ball,s=b.sensor,set=b.settings,t=b.time;
 if(set.sensor==='ideal'){
  const p=position(sim);s.measurement=p;s.velocity=localVelocity(sim);s.stamp=t;s.age=0;s.delivered++;return;
 }
 if(t+1e-10>=s.nextSample){
  const p=position(sim);s.nextSample+=1/set.frequency;
  if(random(b)>=set.dropout)s.queue.push({time:t,deliver:t+set.latency,p:p.map(x=>x+(random(b)*2-1)*set.noise)});
 }
 while(s.queue.length&&s.queue[0].deliver<=t+1e-10){
  const v=s.queue.shift();
  if(s.measurement&&v.time>s.stamp){const dt=v.time-s.stamp;s.velocity=s.velocity.map((x,i)=>.65*x+.35*(v.p[i]-s.measurement[i])/dt);}
  s.measurement=v.p;s.stamp=v.time;s.delivered++;
 }
 s.age=s.stamp===null?t:t-s.stamp;
}
function control(sim,dt){
 const b=sim.ball,set=b.settings;if(b.time+1e-10<b.nextControl)return;dt=.01;b.nextControl=b.time+dt;
 if(set.path==='circle'){
  const t=b.time,w=.55,r=.08;b.target=[r*Math.cos(w*t),r*Math.sin(w*t)];b.targetVelocity=[-r*w*Math.sin(w*t),r*w*Math.cos(w*t)];b.targetAcceleration=scale(b.target,-w*w);
 }else{b.target=b.goal.slice();b.targetVelocity=[0,0];b.targetAcceleration=[0,0];}
 const s=b.sensor;let tilt=[0,0];
 if(set.control&&s.measurement&&s.age<.25&&b.phase==='contact'){
  const a=b.target.map((v,i)=>set.kp*(v-s.measurement[i])+set.kd*(b.targetVelocity[i]-s.velocity[i])+b.targetAcceleration[i]);
  const factor=(sim.g.gravity||9.81)/(1+set.inertiaRatio);tilt=[-a[1]/factor,a[0]/factor];
  const n=norm(tilt);if(n>set.maxTilt)tilt=scale(tilt,set.maxTilt/n);
 }
 b.command=b.command.map((v,i)=>v+clamp(tilt[i]-v,-set.maxRate*dt,set.maxRate*dt));
 const goal=S.homeState(sim.g);goal.q=S.qEuler(...b.command,0);
 if(S.feasible(sim.g,goal).ok)sim.target=goal;
}
function disturb(sim,impulse=[.025,0,0]){
 if(!sim.ball||!Array.isArray(impulse)||impulse.length!==3||!impulse.every(Number.isFinite)||norm(impulse)>.5)return false;
 sim.ball.v=add(sim.ball.v,scale(impulse,1/sim.ball.settings.mass));return true;
}
function advance(sim,dt,{fixed=false}={}){
 const b=sim.ball;if(!b)return;
 const set=b.settings,s=sim.state,deck=S.deckGeometry(sim.g),normal=rotate(s.q,[0,0,1]),axes=[normal,rotate(s.q,[1,0,0]),rotate(s.q,[0,1,0])];
 const inertia=set.inertiaRatio*set.mass*set.radius**2;
 b.v=add(b.v,[0,0,-sim.g.gravity*dt]);
 const local=xyz(s,sub(b.p,s.p));
 const gap=local[2]-deck.top-set.radius;
 if(Math.hypot(local[0],local[1])>deck.radius&&b.phase==='contact')b.phase='fallen';
 b.contact={normalImpulse:0,tangentImpulse:[0,0,0],impulse:[0,0,0],platformImpulse:[0,0,0]};
 if(b.phase==='contact'&&gap<.003){
  const rb=scale(normal,-set.radius),cp=add(b.p,rb),rp=sub(cp,s.p),J=pointJac(rp);
  const M=sim.last?.M||S.dynamics(sim.g,s,false).M;
  const rows=axes.map(a=>Array.from({length:12},(_,j)=>a.reduce((v,x,i)=>v+x*J[i][j],0)));
  const inv=rows.map(row=>fixed?S.zeros():solveSPD(M,row));
  const A=axes.map((a,i)=>axes.map((c,j)=>dot(a,c)/set.mass+dot(cross(rb,a),cross(rb,c))/inertia+(fixed?0:dot(rows[i],inv[j]))));
  const apply=(dir,amount)=>{
   const P=scale(axes[dir],amount);b.v=add(b.v,scale(P,1/set.mass));b.w=add(b.w,scale(cross(rb,P),1/inertia));
   if(!fixed)s.v=sub(s.v,scale(inv[dir],amount));
  };
  const slip=()=>sub(add(b.v,cross(b.w,rb)),fixed?[0,0,0]:mv(J,s.v));
  let impulse=[0,0,0];
  for(let iter=0;iter<4;iter++){
   let v=slip();const n=Math.max(0,impulse[0]-(dot(v,normal)+.18*Math.min(0,gap)/dt)/A[0][0]);apply(0,n-impulse[0]);impulse[0]=n;
   v=slip();const tx=dot(v,axes[1]),ty=dot(v,axes[2]),det=A[1][1]*A[2][2]-A[1][2]**2;
   let tang=[impulse[1]-(A[2][2]*tx-A[1][2]*ty)/det,impulse[2]-(A[1][1]*ty-A[1][2]*tx)/det];
   const mag=norm(tang),limit=set.mu*n;if(mag>limit)tang=scale(tang,limit/Math.max(mag,1e-15));
   apply(1,tang[0]-impulse[1]);apply(2,tang[1]-impulse[2]);impulse[1]=tang[0];impulse[2]=tang[1];
  }
  const P=add(scale(normal,impulse[0]),add(scale(axes[1],impulse[1]),scale(axes[2],impulse[2])));
  b.contact={normalImpulse:impulse[0],tangentImpulse:add(scale(axes[1],impulse[1]),scale(axes[2],impulse[2])),impulse:P,platformImpulse:scale(P,-1)};
  // Small isotropic rolling loss, bounded by the relative kinetic state; no attraction.
  const drag=Math.exp(-set.rollingDrag*dt);b.w=scale(b.w,drag);
 }
 b.p=add(b.p,scale(b.v,dt));b.q=qnorm(qmul(qexp(scale(b.w,dt)),b.q));
 if(b.phase!=='contact'&&b.p[2]<set.radius-.02){
  b.p[2]=set.radius-.02;if(b.v[2]<0)b.v[2]*=-.12;b.v[0]*=.97;b.v[1]*=.97;b.w=scale(b.w,.97);b.phase='ground';
 }
 b.time+=dt;
 if(b.time-b.lastTrail>.04){b.trail.push(position(sim));if(b.trail.length>160)b.trail.shift();b.lastTrail=b.time;}
 if(![...b.p,...b.v,...b.w,...b.q].every(Number.isFinite))throw Error('Non-finite ball state');
}
S.step=function(sim,dt=sim.settings.dt){
 if(!sim.ball)return baseStep(sim,dt);if(sim.halted)return sim.last;
 try{if(!Number.isFinite(dt)||dt<=0||dt>.003)throw Error('Invalid ball timestep');observe(sim);control(sim,dt);const last=baseStep(sim,dt);if(!sim.halted)advance(sim,dt);return last;}
 catch(e){sim.halted=true;sim.error=e.message;return sim.last;}
};
S.snapshot=function(sim){const o=baseSnapshot(sim);if(sim.ball)o.ball=JSON.parse(JSON.stringify(sim.ball));return o;};
S.restore=function(o){const sim=baseRestore(o);if(o.ball){
 const b=o.ball;
 if(!b.settings||Object.keys(settings()).some(k=>!Object.hasOwn(b.settings,k)))throw Error('Incomplete saved ball settings');
 settings(b.settings);
 for(const [k,n] of [['p',3],['v',3],['w',3],['q',4],['target',2],['goal',2],['command',2]])
  if(!Array.isArray(b[k])||b[k].length!==n||!b[k].every(Number.isFinite))throw Error('Invalid saved ball '+k);
 if(!['contact','fallen','ground'].includes(b.phase)||!Number.isFinite(b.time)||b.time<0||Math.abs(norm(b.q)-1)>.01||sim.g.payloadMass!==0)throw Error('Invalid saved ball state');
 if(!b.sensor||!Array.isArray(b.sensor.queue)||b.sensor.queue.length>300||!Array.isArray(b.trail)||b.trail.length>160)throw Error('Invalid ball sensor/trail state');
 const vector=(v,n)=>Array.isArray(v)&&v.length===n&&v.every(Number.isFinite);
 const sensor=b.sensor;
 if(!vector(sensor.velocity,2)||(sensor.measurement!==null&&!vector(sensor.measurement,2))||(sensor.stamp!==null&&!Number.isFinite(sensor.stamp))||!Number.isFinite(sensor.nextSample)||!Number.isFinite(sensor.age)||!Number.isInteger(sensor.delivered)||!Number.isInteger(sensor.rng))throw Error('Invalid ball sensor state');
 if(sensor.queue.some(v=>!v||!Number.isFinite(v.time)||!Number.isFinite(v.deliver)||v.deliver<v.time||!vector(v.p,2)))throw Error('Invalid ball sensor queue');
 if(!b.trail.every(v=>vector(v,2))||!Number.isFinite(b.nextControl)||!Number.isFinite(b.lastTrail)||!vector(b.targetVelocity,2)||!vector(b.targetAcceleration,2))throw Error('Invalid ball history');
 for(const k of ['impulse','platformImpulse','tangentImpulse'])if(!vector(b.contact?.[k],3))throw Error('Invalid ball contact data');
 if(!Number.isFinite(b.contact.normalImpulse)||b.contact.normalImpulse<0)throw Error('Invalid ball normal impulse');
 sim.ball=JSON.parse(JSON.stringify(b));
 }return sim;};
root.StewartBall={settings,enable,reset,position,localVelocity,setTarget,disturb,observe,control,advance};
})(globalThis);
