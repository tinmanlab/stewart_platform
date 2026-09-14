/* Procedural hardware presentation. Joint centers and the flat rolling surface
 * come from the solver. Decorative mounts are lumped into entered body masses. */
(function(root){
'use strict';
const S=root.Stewart,R=root.StewartRenderer;
function torus(major=.76,minor=.24,segments=24,sides=8){
 const v=[],n=[];const pt=(a,b)=>[(major+minor*Math.cos(b))*Math.cos(a),(major+minor*Math.cos(b))*Math.sin(a),minor*Math.sin(b)];
 const normal=(a,b)=>[Math.cos(b)*Math.cos(a),Math.cos(b)*Math.sin(a),Math.sin(b)];
 for(let i=0;i<segments;i++)for(let j=0;j<sides;j++){
  const a=i*2*Math.PI/segments,c=(i+1)*2*Math.PI/segments,b=j*2*Math.PI/sides,d=(j+1)*2*Math.PI/sides;
  for(const [x,y]of[[a,b],[c,b],[c,d],[a,b],[c,d],[a,d]]){v.push(...pt(x,y));n.push(...normal(x,y));}
 }return{v,n};
}
function beveledDisk(){
 const v=[],n=[],seg=48,profile=[[.985,-.5],[1,-.36],[1,.36],[.985,.5]];
 function triangle(points,normal){for(let p of points){v.push(...p);n.push(...normal);}}
 for(let i=0;i<seg;i++){
  const a=i*2*Math.PI/seg,b=(i+1)*2*Math.PI/seg;
  for(let j=0;j<profile.length-1;j++){
   const [r,z]=profile[j],[r2,z2]=profile[j+1],p=[r*Math.cos(a),r*Math.sin(a),z],q=[r*Math.cos(b),r*Math.sin(b),z],t=[r2*Math.cos(b),r2*Math.sin(b),z2],u=[r2*Math.cos(a),r2*Math.sin(a),z2],normal=S.unit([Math.cos((a+b)/2)*(z2-z),Math.sin((a+b)/2)*(z2-z),r-r2]);
   triangle([p,q,t],normal);triangle([p,t,u],normal);
  }
  // Tessellated caps avoid large-triangle painter-order artifacts in Canvas fallback.
  for(const sign of[-1,1])for(let ring=0;ring<12;ring++){
   const r0=.985*ring/12,r1=.985*(ring+1)/12,z=sign*.5,p=[r0*Math.cos(a),r0*Math.sin(a),z],q=[r1*Math.cos(a),r1*Math.sin(a),z],t=[r1*Math.cos(b),r1*Math.sin(b),z],u=[r0*Math.cos(b),r0*Math.sin(b),z];
   triangle([p,q,t],[0,0,sign]);if(ring)triangle([p,t,u],[0,0,sign]);
  }
 }return{v,n};
}
// A single flat cap avoids subpixel cracks in the Canvas painter fallback.
// Above-deck views use ordered base / mechanism / deck / ball layers; GPU keeps depth testing.
const drawCPU=R.prototype.drawCPU;
R.prototype.drawCPU=function(type,p,q,sc,color,metal){
 drawCPU.call(this,type,p,q,sc,color,metal);
 if(type==='bevel'){
  this.flushCPU();this.tris=[];const ctx=this.ctx,normal=S.rotate(q,[0,0,1]);
  if(S.dot(normal,S.sub(this.eye,p))<=0)return;
  const light=S.unit([-.4,-.8,1.4]),light2=S.unit([.8,.3,.6]),bright=.40+.5*Math.max(0,S.dot(normal,light))+.18*Math.max(0,S.dot(normal,light2));
  const rgb=[color>>16&255,color>>8&255,color&255].map(c=>Math.round(Math.min(255,c*bright)));
  ctx.fillStyle=`rgb(${rgb.join(',')})`;ctx.beginPath();
  for(let i=0;i<48;i++){const a=i*Math.PI/24,v=this.project(S.add(p,S.rotate(q,[.985*sc[0]*Math.cos(a),.985*sc[1]*Math.sin(a),sc[2]/2])));i?ctx.lineTo(v[0],v[1]):ctx.moveTo(v[0],v[1]);}
  ctx.closePath();ctx.fill();
 }
};
R.prototype.hardwareMeshes=function(){
 if(this.hardwareReady)return;
 for(let [name,m]of[['bearing',torus()],['bevel',beveledDisk()]]){if(this.cpu)this.meshData[name]=m;else this.meshes[name]=this.mesh(m);}
 this.hardwareReady=true;
};
// Paused scenes do not need another full software rasterization every animation frame.
// Camera, viewport, target, joint mode and force-overlay changes still invalidate the cache.
const render=R.prototype.render;
R.prototype.render=function(sim,selected){
 const rect=this.canvas.getBoundingClientRect(),key=[this.azimuth,this.elevation,this.distance,...this.target,rect.width,rect.height,globalThis.devicePixelRatio||1,this.showGhost,this.showForces,selected?.i,selected?.type,...sim.settings.external,...sim.joints.flatMap(j=>[j.slider.mode,j.base.mode,j.top.mode])].join('|');
 const last=this.lastRendered;
 if(last&&last.sim===sim&&last.state===sim.state&&last.target===sim.target&&last.ball===sim.ball&&last.preview===this.previewPose&&last.key===key)return;
 render.call(this,sim,selected);this.lastRendered={sim,state:sim.state,target:sim.target,ball:sim.ball,preview:this.previewPose,key};
};
R.prototype.home=function(){this.azimuth=.88;this.elevation=.58;this.distance=1.65;this.target=[0,0,.34];};
R.prototype.renderMechanism=function(sim,selected){
 this.hardwareMeshes();
 const g=sim.g,s=sim.state,k=S.kinematics(g,s),d=S.deckGeometry(g),id=[1,0,0,0],at=(p)=>S.add(s.p,S.rotate(s.q,p));this.lastKin=k;
 this.draw('box',[0,0,-.039],id,[6,6,.027],0xe4eaf0,0);
 for(let i=-9;i<=9;i++){let col=i===0?0xb7c7d0:0xd9e2e7;this.draw('box',[i*.1,0,-.022],id,[.001,1.8,.001],col,0);this.draw('box',[0,i*.1,-.022],id,[1.8,.001,.001],col,0);}
 this.draw('bevel',[0,0,.013],id,[g.baseRadius*1.17,g.baseRadius*1.17,.045],0x263b49,.65);
 if(!this.cpu)this.draw('bevel',[0,0,.037],id,[g.baseRadius*1.13,g.baseRadius*1.13,.010],0x728793,.65);
 for(let i=0;i<3;i++){
  const t=(i*2/3+.25)*Math.PI,p=[Math.cos(t)*g.baseRadius*.84,Math.sin(t)*g.baseRadius*.84,-.011];
  this.draw('cylinder',p,id,[.040,.040,.025],0x17252b,.2);
 }
 if(this.cpu){this.flushCPU();this.tris=[];}
 for(let l of k.legs){
  const i=l.index,active=sim.joints[i].slider.mode==='active',band=active?0x148d8b:0xcb9345;
  const radial=S.unit([g.P[i][0],g.P[i][1],0]),tangent=[-radial[1],radial[0],0],pin=S.rotate(s.q,tangent),mountQ=S.qmul(s.q,S.qexp([0,0,Math.atan2(radial[1],radial[0])])),pinQ=S.fromZ(pin);
  // Under-deck clevis: two cheeks, a through-pin and a spherical bearing eye.
  const h=Math.max(.054,d.bottom+.022),zc=(d.bottom-.022)/2;
  for(let side of[-1,1]){
   const p=at(S.add(g.P[i],S.add(S.scale(tangent,side*.031),[0,0,zc])));
   this.draw('box',p,mountQ,[.047,.010,h],0x5d7481,.7);
   this.draw('hex',S.add(l.a,S.scale(pin,side*.039)),pinQ,[.009,.009,.007],0xb7c6cc,.85);
  }
  this.segment(S.sub(l.a,S.scale(pin,.041)),S.add(l.a,S.scale(pin,.041)),.0065,0xe1e8e9,1);
  this.draw('bearing',l.a,pinQ,[.023,.023,.023],0x344f5d,.75);this.sphere(l.a,.012,0xbcd0d6);
  const bt=S.unit([-l.b[1],l.b[0],0]),bq=S.fromZ(bt),baseQ=S.qexp([0,0,Math.atan2(l.b[1],l.b[0])]);
  this.draw('bevel',[l.b[0],l.b[1],.051],id,[.039,.033,.022],0x58717e,.7);
  for(let side of[-1,1]){
   this.draw('box',S.add(l.b,S.add(S.scale(bt,side*.030),[0,0,-.012])),baseQ,[.048,.010,.055],0x6d8490,.7);
   this.draw('hex',S.add(l.b,S.scale(bt,side*.038)),bq,[.009,.009,.008],0xc4d2d7,.8);
  }
  this.segment(S.sub(l.b,S.scale(bt,.043)),S.add(l.b,S.scale(bt,.043)),.0065,0xd1dce0,1);
  this.draw('bearing',l.b,bq,[.023,.023,.023],0x2d4957,.75);this.sphere(l.b,.012,0xbcd0d6);
  const begin=S.add(l.b,S.scale(l.n,.051)),end=S.add(l.b,S.scale(l.n,g.barrelLength)),rodTip=S.sub(l.a,S.scale(l.n,.032));
  this.segment(l.b,begin,.011,0xbccbd2,.85);
  this.segment(begin,end,g.barrelRadius*1.10,0x334d5d,.75);
  this.segment(S.add(l.b,S.scale(l.n,.080)),S.add(l.b,S.scale(l.n,.155)),g.barrelRadius*1.12,band,.55);
  this.segment(S.sub(end,S.scale(l.n,.027)),end,g.barrelRadius*1.22,0x203945,.75);
  this.segment(end,rodTip,g.rodRadius,0xd7e0e5,1);
  this.segment(rodTip,S.sub(l.a,S.scale(l.n,.018)),g.rodRadius*1.16,0x93a9b3,1);
  if(selected&&selected.i===i){let p=selected.type==='base'?l.b:selected.type==='top'?l.a:S.scale(S.add(begin,end),.5);this.ring(p,l.q,.031,0xd6954b);}
  if(this.showForces&&sim.last&&!sim.ball){let f=sim.last.forces[i+':slider:0']||0;this.arrow(l.a,S.scale(l.n,f*.0015),f>=0?0x148d8b:0xc66b4a,.14);}
 }
 if(this.cpu){this.flushCPU();this.tris=[];}
 // Unit bevel cap radius is .985: compensate so the contact disk and flat cap match.
 const radius=d.radius/.985;
 this.draw('bevel',at([0,0,d.center]),s.q,[radius,radius,g.plateThickness],0xc8d2d6,.85);
 // The bevel cap IS the contact surface: no nearly coplanar duplicate skin.
 // Flush engraved fiducials, not protruding obstacles.
 for(let i=0;i<4;i++){
  const a=i*Math.PI/2,p=[Math.cos(a)*d.radius*.85,Math.sin(a)*d.radius*.85,d.top+.0004];
  this.segment(at(S.add(p,[-.008,0,0])),at(S.add(p,[.008,0,0])),.0006,0x98aaae);
  this.segment(at(S.add(p,[0,-.008,0])),at(S.add(p,[0,.008,0])),.0006,0x98aaae);
 }
 if(this.cpu){this.flushCPU();this.tris=[];}
 if(g.payloadMass>0){this.draw('box',at([0,0,d.center+g.payloadZ]),s.q,[.12,.09,.09],0x23414f,.5);}
 if(sim.ball){
  const b=sim.ball,top=d.top+.001;
  this.ring(at([0,0,top]),s.q,d.radius-b.settings.radius-.02,0xc6a875);
  this.ring(at([...b.target,top+.001]),s.q,.018,0x118b83);
  for(let i=Math.max(1,b.trail.length-100);i<b.trail.length;i++)this.segment(at([...b.trail[i-1],top+.002]),at([...b.trail[i],top+.002]),.0011,0x6fa7a4);
  this.draw('sphere',b.p,b.q,[b.settings.radius,b.settings.radius,b.settings.radius],0xdf7f35,.55);
  // Three colored meridians make physical rolling visible.
  const qs=[id,S.qexp([Math.PI/2,0,0]),S.qexp([0,Math.PI/2,0])];
  for(const q of qs)this.ring(b.p,S.qmul(b.q,q),b.settings.radius*1.004,0x5b3c2c);
 }else if(this.showGhost){
  const target=this.previewPose||sim.target,p=S.add(target.p,S.rotate(target.q,[0,0,d.top]));this.ring(p,target.q,d.radius*1.01,0xbd8644);
  this.arrow(p,S.rotate(target.q,[.1,0,0]),0xc66d65);this.arrow(p,S.rotate(target.q,[0,.1,0]),0x56a183);
 }
 const anchor=[-.48,-.31,.012];this.arrow(anchor,[.1,0,0],0xc26d68);this.arrow(anchor,[0,.1,0],0x5aa185);this.arrow(anchor,[0,0,.1],0x758ed0);
 if(sim.settings.external.some(x=>x!==0))this.arrow(at([0,0,d.top+.01]),S.scale(sim.settings.external.slice(0,3),.006),0xdc7550,.22);
};
})(globalThis);
