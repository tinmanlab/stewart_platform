'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
require('../src/core.js');require('../src/ball.js');
const S=Stewart,B=StewartBall;
function fresh(){const s=S.makeSimulation();B.enable(s,{control:false});return s;}
test('Trail samples are ball-centre world positions, including height during fall',()=>{
 const s=fresh();B.reset(s,[S.deckGeometry(s.g).radius-.008,0]);s.ball.v=[1,0,0];
 for(let i=0;i<700;i++)B.advance(s,.001,{fixed:true});
 assert.equal(s.ball.trailFrame,'world');
 assert(s.ball.trail.every(p=>p.length===3&&p.every(Number.isFinite)));
 const zs=s.ball.trail.map(p=>p[2]);assert(Math.max(...zs)-Math.min(...zs)>.45,'Fall must descend, not be projected onto deck');
 assert.notEqual(s.ball.phase,'contact');
 const history=JSON.stringify(s.ball.trail);s.state.q=S.qEuler(.15,-.1,0);s.state.p[0]+=.1;
 assert.equal(JSON.stringify(s.ball.trail),history,'Old points must not move with the deck');
});
test('Trail owns copies, resets cleanly and respects the bounded history',()=>{
 const s=fresh();B.advance(s,.001,{fixed:true});assert.deepEqual(s.ball.trail[0],s.ball.p);assert.notEqual(s.ball.trail[0],s.ball.p);
 for(let i=0;i<8000;i++)B.advance(s,.001,{fixed:true});assert(s.ball.trail.length<=160);
 B.reset(s);assert.equal(s.ball.trail.length,0);assert.equal(s.ball.trailFrame,'world');
});
test('World history roundtrips; legacy 2D history is cleared, never fabricated',()=>{
 const s=fresh();B.advance(s,.001,{fixed:true});const o=S.snapshot(s);
 assert.equal(o.ball.trailFrame,'world');assert.deepEqual(S.restore(o).ball,o.ball);
 const old=S.snapshot(s);delete old.ball.trailFrame;old.ball.trail=[[.01,-.02],[.03,-.01]];
 const copy=JSON.stringify(old),r=S.restore(old);assert.equal(JSON.stringify(old),copy);
 assert.deepEqual(r.ball.trail,[]);assert.equal(r.ball.trailFrame,'world');assert.deepEqual(r.ball.p,s.ball.p);
});
test('Malformed, untagged and unknown-frame 3D trails are rejected',()=>{
 for(const edit of [o=>o.ball.trail=[[0,0,NaN]],o=>o.ball.trail=[[0,0]],o=>o.ball.trailFrame='camera',o=>delete o.ball.trailFrame]){
  const s=fresh();B.advance(s,.001,{fixed:true});const o=S.snapshot(s);edit(o);assert.throws(()=>S.restore(o),/trail|history/);
 }
});
