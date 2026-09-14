'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
require('../src/core.js');
assert.equal(typeof Stewart.deckGeometry,'function','Shared deck/contact geometry is required');
assert(fs.existsSync(require('node:path').join(__dirname,'../src/ball.js')),'Ball contact module must exist');
require('../src/ball.js');
const S=Stewart, B=StewartBall;
const tests=[];
function test(name,fn){fn();tests.push(name);console.log('PASS',name);}
function run(sim,t){for(let i=0;i<Math.round(t/sim.settings.dt);i++)S.step(sim);assert(!sim.halted,sim.error);}
function fresh(o={}){let sim=S.makeSimulation();B.enable(sim,o);return sim;}
test('Clear deck physically above top spherical centers',()=>{
 let g=S.createGeometry(),deck=S.deckGeometry(g);
 assert.equal(g.payloadMass,0);assert(deck.bottom>.026);
 for(let a of g.P)assert(deck.bottom-a[2]>.026);
});
test('Solid sphere stationary-incline rolling reference',()=>{
 let sim=fresh({control:false,rollingDrag:0});sim.state.q=S.qEuler(0,.1,0);B.reset(sim,[0,0]);
 let start=sim.ball.p.slice();for(let i=0;i<100;i++)B.advance(sim,.001,{fixed:true});
 let velocity=S.rotate(S.qconj(sim.state.q),sim.ball.v)[0];
 assert(Math.abs(velocity-(5/7)*sim.g.gravity*Math.sin(.1)*.1)<.003,velocity);
 assert(sim.ball.p[0]>start[0]);
});
test('Contact has bounded friction and opposite platform impulse',()=>{
 let sim=fresh({control:false});sim.ball.v=[.3,-.2,-.05];
 B.advance(sim,.001);
 let c=sim.ball.contact;
 assert(c.normalImpulse>=0);assert(S.norm(c.tangentImpulse)<=sim.ball.settings.mu*c.normalImpulse+1e-10);
 assert(S.norm(S.add(c.impulse,c.platformImpulse))<1e-10);
 assert(S.norm(sim.state.v)>0,'Ball must react on the platform');
});
test('No hidden edge wall: outward moving sphere falls',()=>{
 let sim=fresh({control:false});B.reset(sim,[S.deckGeometry(sim.g).radius-.008,0]);sim.ball.v=[1,0,0];run(sim,.8);
 assert(sim.ball.phase==='fallen'||sim.ball.phase==='ground');assert(sim.ball.p[0]>.3);
});
test('Off-centre balance and explicit target tracking',()=>{
 let sim=fresh();run(sim,6);let p=B.position(sim);assert(Math.hypot(...p)<.009,JSON.stringify(p));
 B.setTarget(sim,[.08,-.05]);run(sim,6);p=B.position(sim);assert(Math.hypot(p[0]-.08,p[1]+.05)<.012,JSON.stringify(p));
});
test('Repeatable reset and ball project roundtrip',()=>{
 let sim=fresh();run(sim,.2);B.reset(sim);let a=JSON.stringify(sim.ball),plate=S.cloneState(sim.state);
 B.disturb(sim,[.03,0,0]);run(sim,.1);sim.state=S.cloneState(plate);B.reset(sim);assert.equal(JSON.stringify(sim.ball),a);
 let restored=S.restore(S.snapshot(sim));assert.deepEqual(restored.ball,sim.ball);
 let bad=S.snapshot(sim);bad.ball.p[0]=Infinity;assert.throws(()=>S.restore(bad));
});
test('Sampled sensor delivers delayed measurements only',()=>{
 let sim=fresh({sensor:'sampled',latency:.05,noise:0});
 for(let i=0;i<40;i++)S.step(sim);
 assert.equal(sim.ball.sensor.delivered,0);
 run(sim,.1);assert(sim.ball.sensor.delivered>0);assert(sim.ball.sensor.age>=.049);
});
test('Circle and recovery across declared initial states',()=>{
 for(let xy of [[.10,0],[-.10,0],[0,.10],[0,-.10],[.07,.07]]){
  let sim=fresh();B.reset(sim,xy);run(sim,5);assert(sim.ball.phase==='contact');assert(Math.hypot(...B.position(sim))<.012);
 }
 let sim=fresh();sim.ball.settings.path='circle';run(sim,14);assert(sim.ball.phase==='contact');
 let p=B.position(sim),target=sim.ball.target;assert(Math.hypot(p[0]-target[0],p[1]-target[1])<.025);
 B.disturb(sim,[.025,0,0]);sim.ball.settings.path='point';B.setTarget(sim,[0,0]);run(sim,6);assert(Math.hypot(...B.position(sim))<.012);
});
test('Declared sampled rate, dropout and controller-off counterexample',()=>{
 let sim=fresh({sensor:'sampled',frequency:50,latency:0,noise:0});run(sim,.1);
 assert.equal(sim.ball.sensor.delivered,5);assert(Math.abs(sim.ball.nextControl-.1)<1e-8);
 sim=fresh({sensor:'sampled',dropout:1});run(sim,.4);assert.equal(sim.ball.sensor.delivered,0);assert.deepEqual(sim.ball.command,[0,0]);
 sim=fresh({control:false});run(sim,3);assert(Math.hypot(...B.position(sim))>.07,'Off is not secretly stabilizing the ball');
});
fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/ball-tests.json',JSON.stringify({passed:tests.length,tests},null,2));
