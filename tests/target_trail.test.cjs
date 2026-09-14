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
 for(let i=0;i<8000;i++)B.advance(s,.001,{fixed:true});assert(s.ball.trail.length<=160);assert.equal(s.ball.deckTrail.length,s.ball.trail.length);assert(s.ball.deckTrail.every(p=>p.length===2&&p.every(Number.isFinite)));
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

test('Top-view history records deck XY at sampling time, not at repaint time',()=>{
 const s=fresh();s.state.p=[.04,-.03,.61];s.state.q=S.qEuler(.12,-.09,.2);B.reset(s,[.06,-.04]);
 B.advance(s,.001,{fixed:true});
 assert(Array.isArray(s.ball.deckTrail),'Capture-time deck history is required');
 assert.deepEqual(s.ball.deckTrail[0],B.position(s));
 assert.deepEqual(s.ball.trail[0],s.ball.p);
 const first=s.ball.deckTrail[0].slice(),world=s.ball.trail[0].slice();
 s.state.q=S.qEuler(-.1,.17,-.2);s.state.p[0]+=.08;
 assert.deepEqual(s.ball.deckTrail[0],first);assert.deepEqual(s.ball.trail[0],world);
 for(let i=0;i<42;i++)B.advance(s,.001,{fixed:true});
 assert.deepEqual(s.ball.deckTrail[0],first,'Later plate motion must not rewrite historical XY');
 assert.equal(s.ball.deckTrail.length,s.ball.trail.length);
 assert.notEqual(s.ball.deckTrail[0],s.ball.trail[0]);
 B.reset(s);assert.deepEqual(s.ball.deckTrail,[]);
});
test('Deck history roundtrips; old world-only files do not invent local history',()=>{
 const s=fresh();B.advance(s,.001,{fixed:true});
 assert(Array.isArray(s.ball.deckTrail),'Capture-time deck history is required');
 const saved=S.snapshot(s);assert.deepEqual(S.restore(saved).ball,saved.ball);
 delete saved.ball.deckTrail;const original=JSON.stringify(saved),restored=S.restore(saved);
 assert.deepEqual(restored.ball.trail,saved.ball.trail);assert.deepEqual(restored.ball.deckTrail,[]);
 assert.deepEqual(restored.ball.p,saved.ball.p);assert.equal(JSON.stringify(saved),original);
});
test('Invalid deck XY histories are rejected instead of reaching canvas',()=>{
 for(const bad of [null,[[0,0,1]],[[NaN,0]],Array.from({length:161},()=>[0,0])]){
  const s=fresh(),saved=S.snapshot(s);saved.ball.deckTrail=bad;
  assert.throws(()=>S.restore(saved),/deck|trail|history/);
 }
});
