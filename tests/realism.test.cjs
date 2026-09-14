'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
require('../src/core.js');
assert(fs.existsSync(__dirname+'/../src/actuator.js'),'Missing explicit electromechanical actuator model');
require('../src/actuator.js');require('../src/ball.js');
const S=Stewart,A=StewartActuator,B=StewartBall;
let passed=[];function test(name,fn){fn();passed.push(name);console.log('PASS',name);}
function run(s,t){for(let i=0;i<Math.round(t/s.settings.dt);i++){S.step(s);assert(!s.halted,s.error);}}
test('Motor circuit retains constant DC force; force is not recursively damped',()=>{
 let m={current:0,voltage:0};const p=A.parameters();for(let n=0;n<1000;n++)A.electrical(m,1,0,.001,p,2.5);
 assert(Math.abs(m.current-1)<1e-6);assert(m.voltage<=p.voltage);
 const faster={current:0,voltage:0};for(let n=0;n<1000;n++)A.electrical(faster,2,p.voltage/A.forceConstant(p)*1.5,.001,p,2.5);
 assert(faster.current<0,'Back-EMF must reduce available motoring current');
});
test('Explicit servo profile survives JSON and does not alter the legacy ideal plant',()=>{
 let s=S.makeSimulation();assert(!s.actuator);A.enable(s);run(s,.06);
 assert.equal(S.snapshot(s).schema,'stewart-lab/2');
 const copy=S.restore(JSON.parse(JSON.stringify(S.snapshot(s))));assert.deepEqual(copy.actuator,s.actuator);
 const bad=S.snapshot(s);bad.actuator.motors[0].current=NaN;assert.throws(()=>S.restore(bad));
 const incomplete=S.snapshot(s);delete incomplete.actuator.parameters.lead;assert.throws(()=>S.restore(incomplete));
 const noCurrent=S.snapshot(s);delete noCurrent.actuator.motors[0].current;assert.throws(()=>S.restore(noCurrent));
});
test('Reflected rotor kinetic energy and winding equation are consistent',()=>{
 const s=S.makeSimulation();A.enable(s);s.state.v=[.03,-.02,.01,.04,-.05,.02,0,0,0,0,0,0];
 const d=S.dynamics(s.g,s.state),zero={...s.g,motorReflectedMass:0},d0=S.dynamics(zero,s.state);
 const extra=.5*s.g.motorReflectedMass*S.mv(d.k.J,s.state.v).reduce((a,x)=>a+x*x,0);
 assert(Math.abs(.5*S.dot(s.state.v,S.mv(d.M,s.state.v))-.5*S.dot(s.state.v,S.mv(d0.M,s.state.v))-extra)<1e-10);
 const dt=.001;S.step(s);for(const m of s.actuator.motors)if(!m.currentLimited){const expected=m.alpha*m.previousCurrent+m.beta*(m.voltage-m.emf);assert(Math.abs(m.current-expected)<1e-8);}
});
test('Delayed constant-velocity measurements are compared at their capture timestamp',()=>{
 let s=S.makeSimulation();B.enable(s,{sensor:'sampled',frequency:50,latency:.04,noise:0});
 for(let n=0;n<1000;n++){s.ball.time=n*.001;s.ball.p=S.add(s.state.p,[.10*n*.001,0,S.deckGeometry(s.g).top+s.ball.settings.radius]);B.observe(s);}
 assert(Math.abs(s.ball.sensor.velocity[0]-.10)<.002);
 assert(Math.abs(s.ball.sensor.estimate[0]-.0999)<.0005);
});
test('IMU specific force is not passed off as a tilt measurement',()=>{
 let s=S.makeSimulation();A.enable(s,{encoderNoise:0,gyroNoise:0,gyroBias:0,accelNoise:0});
 const sample=A.imuSample(s,[0,0,2]);assert(Math.abs(sample.accel[2]-(s.g.gravity+2))<1e-10);
 assert.deepEqual(sample.gyro,[0,0,0]);
});
test('Passive sockets share fixed housings and bounded tilt geometry',()=>{
 const s=S.makeSimulation(),x=S.socketGeometry(s.g,s.state);assert.equal(x.length,12);
 for(const j of x){assert(j.angle<1e-7);assert(j.mouthRadius<j.ballRadius);assert(j.limit>0);assert(j.neckRadius<j.mouthRadius);}
 s.state.q=S.qEuler(.15,-.1,0);const moved=S.socketGeometry(s.g,s.state);
 assert(moved.some(j=>j.angle>.04));assert.deepEqual(x[0].axis,moved[0].axis,'Base housing must not track the leg');
});
fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/realism-unit.json',JSON.stringify({passed},null,2));
