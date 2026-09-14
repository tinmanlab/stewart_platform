/* Explicit, optional averaged motor/screw servo. SI units.
 * Generic educational parameters, not a calibrated product or BLDC/FOC model.
 * Encoder/IMU feedback is sampled; winding-current sensing is ideal in this model.
 */
(function(root){
'use strict';
const S=root.Stewart,{add,sub,scale,dot,norm,cross,rotate,qconj,qmul,qnorm,qexp,qlog,clamp}=S;
const originalSnapshot=S.snapshot,originalRestore=S.restore;
function parameters(o={}){
 const p=Object.assign({voltage:24,resistance:4,inductance:.008,torqueConstant:.08,gear:2,lead:.008,rotorInertia:.000001,
  maxCurrent:2.5,currentGain:3,currentIntegral:2500,currentRate:150,velocityLimit:.06,accelerationLimit:.25,
  positionGain:22,velocityGain:80,velocityIntegral:120,friction:.4,viscous:4,
  encoderHz:250,encoderDelay:.004,encoderResolution:.00001,encoderNoise:.000002,
  velocityFilterHz:30,poseHz:40,imuHz:200,gyroNoise:.0008,gyroBias:.0003,accelNoise:.008},o);
 for(const [k,v] of Object.entries(p))if(typeof v!=='number'||!Number.isFinite(v)||v<0)throw Error('Invalid drive parameter '+k);
 for(const k of ['voltage','resistance','inductance','torqueConstant','gear','lead','maxCurrent','currentRate','velocityLimit','accelerationLimit','encoderHz','poseHz','imuHz','encoderResolution'])if(p[k]<=0)throw Error('Nonpositive drive parameter '+k);
 if(p.resistance<.1||p.resistance>30||p.inductance<.0001||p.inductance>.1||p.torqueConstant<.005||p.torqueConstant>.5||p.positionGain>80||p.velocityGain>500)throw Error('Unsupported motor/servo range');
 if(p.voltage>60||p.maxCurrent>10||p.velocityLimit>.3||p.accelerationLimit>2||p.encoderDelay>.2||p.encoderHz>1000||p.imuHz>1000||p.poseHz>200||p.lead<.001||p.gear>30||p.encoderNoise>.001)throw Error('Drive parameters outside laboratory envelope');
 return p;
}
const forceConstant=p=>p.torqueConstant*2*Math.PI*p.gear/p.lead;
function rng(a){a.rng=(Math.imul(a.rng,1664525)+1013904223)>>>0;return a.rng/4294967296*2-1;}
function voltageCommand(m,ir,measuredVelocity,dt,p){
 const error=ir-m.current,integral=m.currentIntegrator||0;
 const raw=p.resistance*ir+forceConstant(p)*measuredVelocity+p.currentGain*error+integral;
 if(Math.abs(raw)<p.voltage||Math.sign(error)!==Math.sign(raw))m.currentIntegrator=clamp(integral+p.currentIntegral*error*dt,-p.voltage,p.voltage);
 m.voltageLimited=Math.abs(raw)>p.voltage;m.voltage=clamp(raw,-p.voltage,p.voltage);return m.voltage;
}
function electrical(m,request,velocity,dt,p,limit,measuredVelocity=0){
 const K=forceConstant(p),ir=clamp(request,-limit,limit),emf=K*velocity;
 voltageCommand(m,ir,measuredVelocity,dt,p);
 const equilibrium=(m.voltage-emf)/p.resistance;
 m.current=clamp(equilibrium+(m.current-equilibrium)*Math.exp(-dt*p.resistance/p.inductance),-limit,limit);
 m.emf=emf;m.force=K*m.current;m.currentLimited=Math.abs(request)>limit+1e-9;
 return m.force;
}
function imuSample(sim,worldAcceleration=[0,0,0]){
 const a=sim.actuator,p=a.parameters,q=sim.state.q;
 return {gyro:rotate(qconj(q),sim.state.v.slice(3,6)).map((x,i)=>x+p.gyroBias*(i===1?-1:1)+p.gyroNoise*rng(a)),
  accel:rotate(qconj(q),sub(worldAcceleration,[0,0,-sim.g.gravity])).map(x=>x+p.accelNoise*rng(a))};
}
function enable(sim,o={}){
 const p=parameters(o);sim.g.motorReflectedMass=p.rotorInertia*(2*Math.PI*p.gear/p.lead)**2;const lengths=S.kinematics(sim.g,sim.state).lengths;
 const quantized=lengths.map(x=>Math.round(x/p.encoderResolution)*p.encoderResolution);
 const fk=S.forwardKinematics(sim.g,quantized),pose=fk.ok?fk.state:S.homeState(sim.g);
 sim.actuator={schema:'stewart-drive/1',parameters:p,rng:913749,nextEncoder:sim.state.t,nextPose:sim.state.t,nextIMU:sim.state.t,
  queue:[],encoder:{lengths:quantized,velocity:Array(6).fill(0),stamp:sim.state.t},pose:S.cloneState(pose),poseStamp:sim.state.t,fkOK:fk.ok,
  gyro:[0,0,0],accel:[0,0,sim.g.gravity],lastIMUVelocity:sim.state.v.slice(0,3),lastIMUStamp:sim.state.t,
  gravityAllocation:{},lastMode:sim.settings.mode,motors:Array.from({length:6},(_,i)=>({lengthReference:quantized[i],current:0,currentIntegrator:0,voltage:0,emf:0,force:0,request:0,velocityReference:0,integral:0,commandForce:0,mode:'',actualVelocity:0}))};
 return sim.actuator;
}
function sensors(sim,k,dt){
 const a=sim.actuator,p=a.parameters,t=sim.state.t;
 if(dt*Math.max(p.encoderHz,p.imuHz,p.poseHz)>1+1e-8)throw Error('Drive sample rate exceeds the physics timestep');
 if(t+1e-10>=a.nextEncoder){
  a.nextEncoder+=1/p.encoderHz;
  a.queue.push({time:t,deliver:t+p.encoderDelay,lengths:k.lengths.map(x=>Math.round((x+p.encoderNoise*rng(a))/p.encoderResolution)*p.encoderResolution)});
 }
 while(a.queue.length&&a.queue[0].deliver<=t+1e-10){
  const f=a.queue.shift(),delta=f.time-a.encoder.stamp;
  if(delta>1e-8){const gain=1-Math.exp(-2*Math.PI*p.velocityFilterHz*delta);a.encoder.velocity=f.lengths.map((x,i)=>a.encoder.velocity[i]+gain*((x-a.encoder.lengths[i])/delta-a.encoder.velocity[i]));}
  a.encoder.lengths=f.lengths;a.encoder.stamp=f.time;
 }
 if(t+1e-10>=a.nextIMU){
  a.nextIMU+=1/p.imuHz;
  const r=rotate(sim.state.q,[0,0,S.deckGeometry(sim.g).center]),velocity=add(sim.state.v.slice(0,3),cross(sim.state.v.slice(3,6),r));
  const delta=t-a.lastIMUStamp,acc=delta>1e-8?scale(sub(velocity,a.lastIMUVelocity),1/delta):[0,0,0];
  const f=imuSample(sim,acc);a.gyro=f.gyro;a.accel=f.accel;a.lastIMUStamp=t;a.lastIMUVelocity=velocity;
 }
 // Gyro increments are body-frame. Accelerometers are not treated as inclinometry.
 a.pose.q=qnorm(qmul(a.pose.q,qexp(scale(a.gyro,dt))));a.pose.v.splice(3,3,...rotate(a.pose.q,a.gyro));
 if(t+1e-10>=a.nextPose){
  a.nextPose+=1/p.poseHz;
  const fk=S.forwardKinematics(sim.g,a.encoder.lengths,a.pose);a.fkOK=fk.ok;
  if(fk.ok){
   const delta=Math.max(1/p.poseHz,t-a.poseStamp),v=scale(sub(fk.state.p,a.pose.p),1/delta);
   a.pose.v.splice(0,3,...v.map((x,i)=>.6*a.pose.v[i]+.4*x));a.pose.p=fk.state.p;
   const er=qlog(qmul(fk.state.q,qconj(a.pose.q)));a.pose.q=qnorm(qmul(qexp(scale(er,.4)),a.pose.q));a.poseStamp=t;
  }
  const kin=S.kinematics(sim.g,a.pose),G=S.massAndGravity(sim.g,kin).G;
  a.gravityG=G;a.gravityAllocation=S.allocate(sim.g,S.activeColumns(sim.g,kin,sim.joints),scale(G,-1)).map;
 }
}
function prepare(sim,rows,dt,k){
 const a=sim.actuator,p=a.parameters,K=forceConstant(p);sensors(sim,k,dt);
 const target=S.kinematics(sim.g,sim.target).lengths;
 for(let i=0;i<6;i++){
  const r=rows.find(r=>r.id===i+':slider:0'),m=a.motors[i],cfg=sim.joints[i].slider,mode=sim.settings.mode;
  m.actualVelocity=dot(k.J[i],sim.state.v);
  if(!r.active){m.current=0;m.currentIntegrator=0;m.request=0;m.integral=0;m.velocityReference=0;m.mode='passive';continue;}
  if(m.mode!==mode){m.integral=0;m.currentIntegrator=0;m.velocityReference=0;m.lengthReference=a.encoder.lengths[i];m.mode=mode;}
  const measuredVelocity=a.encoder.velocity[i],age=sim.state.t-a.encoder.stamp;
  let demand=0;
  if(mode==='ik'&&age<.15){
   const referenceError=target[i]-m.lengthReference;
   const vg=Math.sign(referenceError)*Math.min(p.velocityLimit,Math.sqrt(2*p.accelerationLimit*Math.abs(referenceError)));
   m.velocityReference+=clamp(vg-m.velocityReference,-p.accelerationLimit*dt,p.accelerationLimit*dt);
   const increment=m.velocityReference*dt;
   if(Math.abs(increment)>=Math.abs(referenceError)&&Math.sign(increment)===Math.sign(referenceError)){m.lengthReference=target[i];m.velocityReference=0;}
   else m.lengthReference+=increment;
   const servoVelocity=clamp(m.velocityReference+p.positionGain*(m.lengthReference-a.encoder.lengths[i]),-p.velocityLimit,p.velocityLimit);
   const ev=servoVelocity-measuredVelocity;
   const ff=sim.settings.gravityComp?(a.gravityAllocation[r.id]||0):0;
   const raw=p.velocityGain*ev+m.integral+ff;
   const limit=Math.min(cfg.max,K*p.maxCurrent);
   if(Math.abs(raw)<limit||Math.sign(ev)!==Math.sign(raw))m.integral=clamp(m.integral+p.velocityIntegral*ev*dt,-limit/2,limit/2);
   demand=p.velocityGain*ev+m.integral+ff;
  }else if(mode==='gravity')demand=(a.gravityAllocation[r.id]||0)-sim.settings.gravityDamping*measuredVelocity;
  else if(mode==='compliance')demand=r.f; // Task demand is calculated from sensed pose in core.js.
  else if(mode==='manual')demand=cfg.manual;
  m.commandForce=demand;
  const ilim=Math.min(p.maxCurrent,cfg.max/K);
  const ir=clamp(demand/K,-ilim,ilim);
  m.request+=clamp(ir-m.request,-p.currentRate*dt,p.currentRate*dt);
  if(mode==='free'||age>=.15){m.request=0;m.integral=0;m.velocityReference=0;}
  voltageCommand(m,clamp(m.request,-ilim,ilim),measuredVelocity,dt,p);
  m.alpha=Math.exp(-dt*p.resistance/p.inductance);m.beta=(1-m.alpha)/p.resistance;m.previousCurrent=m.current;
  // Back-EMF is coupled to NEW mechanical velocity in the implicit plant solve.
  // This damping is the winding equation, not a recursively damped force command.
  r.f=K*(m.alpha*m.current+m.beta*m.voltage);r.d=K*K*m.beta;r.cap=Math.min(cfg.max,K*p.maxCurrent);
  // Never feed net, damped mechanical effort back as winding current.
  rows.push({id:i+':drive-friction',B:r.B,f:-p.friction*Math.tanh(m.actualVelocity/.002),d:p.viscous,cap:Infinity,active:false,type:'friction',i});
 }
}
function complete(sim,forces,velocity,k){
 const a=sim.actuator,K=forceConstant(a.parameters);
 for(let i=0;i<6;i++){const m=a.motors[i];if(sim.joints[i].slider.mode!=='active')continue;
  m.force=forces[i+':slider:0'];m.current=m.force/K;m.actualVelocity=dot(k.J[i],velocity);m.emf=K*m.actualVelocity;
  m.currentLimited=Math.abs(m.current)>=Math.min(a.parameters.maxCurrent,sim.joints[i].slider.max/K)-1e-9;
 }
}
S.snapshot=function(sim){const o=originalSnapshot(sim);if(sim.actuator){o.schema='stewart-lab/2';o.actuator=JSON.parse(JSON.stringify(sim.actuator));}return o;};
S.restore=function(o){if(o.schema==='stewart-lab/2'&&!o.actuator)throw Error('Drive project is missing actuator state');
 const sim=originalRestore(o.schema==='stewart-lab/2'?{...o,schema:'stewart-lab/1'}:o);if(o.actuator){
 const a=o.actuator;if(!a.parameters||Object.keys(parameters()).some(k=>!Object.hasOwn(a.parameters,k)))throw Error('Incomplete saved drive parameters');if(a.schema!=='stewart-drive/1')throw Error('Unknown drive schema');parameters(a.parameters);if(Math.abs(sim.g.motorReflectedMass-a.parameters.rotorInertia*(2*Math.PI*a.parameters.gear/a.parameters.lead)**2)>1e-8)throw Error('Drive rotor inertia mismatch');
 const vec=(v,n)=>Array.isArray(v)&&v.length===n&&v.every(Number.isFinite);
 const fields=['current','currentIntegrator','voltage','emf','force','request','velocityReference','integral','lengthReference','actualVelocity','commandForce'];
 if(!Array.isArray(a.motors)||a.motors.length!==6||a.motors.some(m=>!m||fields.some(k=>!Number.isFinite(m[k]))||typeof m.mode!=='string'))throw Error('Invalid drive motor state');
 for(const k of ['nextEncoder','nextPose','nextIMU','poseStamp','lastIMUStamp','rng'])if(!Number.isFinite(a[k]))throw Error('Invalid drive timestamp');
 if(!a.encoder||!vec(a.encoder.lengths,6)||!vec(a.encoder.velocity,6)||!Number.isFinite(a.encoder.stamp)||!vec(a.gyro,3)||!vec(a.accel,3)||!vec(a.lastIMUVelocity,3))throw Error('Invalid drive sensor state');
 if(!a.pose||!vec(a.pose.p,3)||!vec(a.pose.q,4)||Math.abs(norm(a.pose.q)-1)>.01||!vec(a.pose.v,12)||!vec(a.pose.spin,6))throw Error('Invalid drive pose');
 if(!Array.isArray(a.queue)||a.queue.length>250||a.queue.some(f=>!vec(f.lengths,6)||!Number.isFinite(f.time)||!Number.isFinite(f.deliver)||f.deliver<f.time))throw Error('Invalid encoder queue');
 if(!a.gravityAllocation||Object.values(a.gravityAllocation).some(v=>!Number.isFinite(v))||(a.gravityG&&!vec(a.gravityG,12)))throw Error('Invalid sensed gravity');
 sim.actuator=JSON.parse(JSON.stringify(a));
 }return sim;};
root.StewartActuator={parameters,forceConstant,electrical,imuSample,enable,sensors,prepare,complete};
})(globalThis);
