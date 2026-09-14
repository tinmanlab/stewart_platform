/* Minimal offline WebGL renderer; physics remains entirely in core.js. */
(function(root){'use strict';const S=root.Stewart;
const mul=(a,b)=>{let r=new Float32Array(16);for(let c=0;c<4;c++)for(let i=0;i<4;i++)for(let k=0;k<4;k++)r[c*4+i]+=a[k*4+i]*b[c*4+k];return r;};
function model(p,q,sc){let [w,x,y,z]=q,sx=sc[0],sy=sc[1],sz=sc[2];return new Float32Array([(1-2*(y*y+z*z))*sx,2*(x*y+w*z)*sx,2*(x*z-w*y)*sx,0,2*(x*y-w*z)*sy,(1-2*(x*x+z*z))*sy,2*(y*z+w*x)*sy,0,2*(x*z+w*y)*sz,2*(y*z-w*x)*sz,(1-2*(x*x+y*y))*sz,0,...p,1]);}
function perspective(fov,aspect,n,f){let t=1/Math.tan(fov/2);return new Float32Array([t/aspect,0,0,0,0,t,0,0,0,0,(f+n)/(n-f),-1,0,0,2*f*n/(n-f),0]);}
function lookAt(eye,target){let z=S.unit(S.sub(eye,target)),x=S.unit(S.cross([0,0,1],z)),y=S.cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-S.dot(x,eye),-S.dot(y,eye),-S.dot(z,eye),1]);}
function rgb(hex){return[(hex>>16&255)/255,(hex>>8&255)/255,(hex&255)/255];}
function sphere(segments=20,rings=12){let v=[],n=[];function p(a,b){return[Math.sin(b)*Math.cos(a),Math.sin(b)*Math.sin(a),Math.cos(b)];}for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){let a=i*2*Math.PI/segments,b=(i+1)*2*Math.PI/segments,c=j*Math.PI/rings,d=(j+1)*Math.PI/rings,pts=[p(a,c),p(b,c),p(b,d),p(a,c),p(b,d),p(a,d)];for(let pt of pts){v.push(...pt);n.push(...pt);}}return{v,n};}
function cylinder(seg=32){let v=[],n=[];function tri(pts,norms){pts.forEach((p,i)=>{v.push(...p);n.push(...norms[i]);});}for(let i=0;i<seg;i++){let a=i*2*Math.PI/seg,b=(i+1)*2*Math.PI/seg,na=[Math.cos(a),Math.sin(a),0],nb=[Math.cos(b),Math.sin(b),0],p=[na[0],na[1],-.5],q=[nb[0],nb[1],-.5],r=[nb[0],nb[1],.5],s=[na[0],na[1],.5];tri([p,q,r],[na,nb,nb]);tri([p,r,s],[na,nb,na]);tri([[0,0,.5],s,r],Array(3).fill([0,0,1]));tri([[0,0,-.5],q,p],Array(3).fill([0,0,-1]));}return{v,n};}
function box(){let v=[],n=[],faces=[[[1,0,0],[[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5],[.5,-.5,.5]]],[[-1,0,0],[[-.5,.5,-.5],[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5]]],[[0,1,0],[[-.5,.5,-.5],[.5,.5,-.5],[.5,.5,.5],[-.5,.5,.5]]],[[0,-1,0],[[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,-.5,.5],[.5,-.5,.5]]],[[0,0,1],[[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]]],[[0,0,-1],[[-.5,.5,-.5],[.5,.5,-.5],[.5,-.5,-.5],[-.5,-.5,-.5]]]];for(let [nm,ps]of faces)for(let i of[0,1,2,0,2,3]){v.push(...ps[i]);n.push(...nm);}return{v,n};}
class Renderer{
 constructor(canvas,onPick){this.canvas=canvas;this.gl=canvas.getContext('webgl',{antialias:true,alpha:false,preserveDrawingBuffer:true});this.onPick=onPick;this.azimuth=.8;this.elevation=.43;this.distance=1.9;this.target=[0,0,.27];this.showForces=true;this.showGhost=true;this.lastKin=null;
 if(!this.gl){this.cpu=true;this.ctx=canvas.getContext('2d');if(!this.ctx)throw Error('Neither WebGL nor Canvas2D is available.');this.meshData={sphere:sphere(12,8),cylinder:cylinder(16),hex:cylinder(6),box:box()};this.bindEvents();return;}
 let gl=this.gl,vs=`attribute vec3 aPosition;attribute vec3 aNormal;uniform mat4 uMVP;uniform mat4 uModel;uniform mat3 uNormal;varying vec3 vN;varying vec3 vP;void main(){vec4 p=uModel*vec4(aPosition,1.);vP=p.xyz;vN=uNormal*aNormal;gl_Position=uMVP*vec4(aPosition,1.);}`,fs=`precision mediump float;varying vec3 vN;varying vec3 vP;uniform vec3 uColor;uniform vec3 uEye;uniform float uMetal;void main(){vec3 n=normalize(vN);vec3 l=normalize(vec3(-.4,-.8,1.4));float d=max(0.,dot(n,l));float d2=max(0.,dot(n,normalize(vec3(.8,.3,.6))));vec3 h=normalize(l+normalize(uEye-vP));float spec=pow(max(0.,dot(n,h)),38.)*uMetal;vec3 c=uColor*(.40+.5*d+.18*d2)+vec3(spec*.5);gl_FragColor=vec4(c,1.);}`;
 const shader=(type,src)=>{let s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};let p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,vs));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));this.program=p;gl.useProgram(p);this.loc={};for(let a of['aPosition','aNormal'])this.loc[a]=gl.getAttribLocation(p,a);for(let a of['uMVP','uModel','uNormal','uColor','uEye','uMetal'])this.loc[a]=gl.getUniformLocation(p,a);
 this.meshes={sphere:this.mesh(sphere()),cylinder:this.mesh(cylinder()),hex:this.mesh(cylinder(6)),box:this.mesh(box())};gl.enable(gl.DEPTH_TEST);gl.clearColor(.918,.937,.944,1);this.bindEvents();
 }
 mesh({v,n}){let gl=this.gl,ob={count:v.length/3};for(let [key,data]of[['v',v],['n',n]]){ob[key]=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,ob[key]);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);}return ob;}
 bindEvents(){let c=this.canvas,down=null; c.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,az:this.azimuth,el:this.elevation,moved:false};c.setPointerCapture(e.pointerId);});c.addEventListener('pointermove',e=>{if(!down)return;let dx=e.clientX-down.x,dy=e.clientY-down.y;if(Math.abs(dx)+Math.abs(dy)>4)down.moved=true;this.azimuth=down.az-dx*.007;this.elevation=S.clamp(down.el+dy*.006,.08,1.45);});c.addEventListener('pointerup',e=>{if(down&&!down.moved&&this.onPick&&this.lastKin){let rect=c.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top,best=null,min=32;for(let l of this.lastKin.legs)for(let[type,pos]of[['base',l.b],['top',l.a],['slider',S.scale(S.add(l.b,l.a),.5)]]){let p=this.project(pos),d=Math.hypot(p[0]-x,p[1]-y);if(d<min){min=d;best={i:l.index,type};}}if(best)this.onPick(best);}down=null;});c.addEventListener('wheel',e=>{e.preventDefault();this.distance=S.clamp(this.distance*Math.exp(e.deltaY*.001),.6,5);},{passive:false});c.addEventListener('dblclick',()=>this.home());c.addEventListener('contextmenu',e=>e.preventDefault());}

 drawCPU(type,p,q,sc,color,metal){
  if(type==='box'&&p[2]<0)return; // Ground / grid are rendered before depth-sorted 3D objects.
  const mesh=this.meshData[type],world=[],projected=[],normals=[],light=S.unit([-.4,-.8,1.4]),light2=S.unit([.8,.3,.6]),base=rgb(color);
  for(let i=0;i<mesh.v.length;i+=3){let v=S.add(p,S.rotate(q,[mesh.v[i]*sc[0],mesh.v[i+1]*sc[1],mesh.v[i+2]*sc[2]]));world.push(v);projected.push(this.project(v));normals.push(S.unit(S.rotate(q,[mesh.n[i]/sc[0],mesh.n[i+1]/sc[1],mesh.n[i+2]/sc[2]])));}
  for(let i=0;i<world.length;i+=3){let center=S.scale(S.add(S.add(world[i],world[i+1]),world[i+2]),1/3),n=S.unit(S.add(S.add(normals[i],normals[i+1]),normals[i+2])),view=S.unit(S.sub(this.eye,center));if(S.dot(n,view)<-.04)continue;let intensity=.40+.50*Math.max(0,S.dot(n,light))+.18*Math.max(0,S.dot(n,light2)),half=S.unit(S.add(light,view)),spec=Math.pow(Math.max(0,S.dot(n,half)),38)*metal*.5,c=base.map(x=>Math.round(255*S.clamp(x*intensity+spec,0,1)));
   this.tris.push({p:[projected[i],projected[i+1],projected[i+2]],depth:(projected[i][2]+projected[i+1][2]+projected[i+2][2])/3,color:`rgb(${c[0]},${c[1]},${c[2]})`});}
 }
 flushCPU(){let ctx=this.ctx;this.tris.sort((a,b)=>b.depth-a.depth);for(let t of this.tris){ctx.beginPath();ctx.moveTo(t.p[0][0],t.p[0][1]);ctx.lineTo(t.p[1][0],t.p[1][1]);if(t.line){ctx.strokeStyle=t.color;ctx.lineWidth=t.width;ctx.stroke();}else{ctx.lineTo(t.p[2][0],t.p[2][1]);ctx.closePath();ctx.fillStyle=t.color;ctx.strokeStyle=t.color;ctx.lineWidth=.45;ctx.fill();ctx.stroke();}}}
 home(){this.azimuth=.8;this.elevation=.43;this.distance=1.9;this.target=[0,0,.27];}
 project(p){let m=this.vp;if(!m)return[0,0];let a=[...p,1],q=[0,0,0,0];for(let i=0;i<4;i++)for(let j=0;j<4;j++)q[i]+=m[j*4+i]*a[j];return[(q[0]/q[3]+1)*this.width/2,(-q[1]/q[3]+1)*this.height/2,q[2]/q[3]];}
 draw(type,p,q,sc,color,metal=.3){if(this.cpu){this.drawCPU(type,p,q,sc,color,metal);return;}let gl=this.gl,mesh=this.meshes[type],m=model(p,q,sc),nm=model([0,0,0],q,sc.map(x=>1/x));gl.uniformMatrix4fv(this.loc.uModel,false,m);gl.uniformMatrix4fv(this.loc.uMVP,false,mul(this.vp,m));gl.uniformMatrix3fv(this.loc.uNormal,false,new Float32Array([nm[0],nm[1],nm[2],nm[4],nm[5],nm[6],nm[8],nm[9],nm[10]]));gl.uniform3fv(this.loc.uColor,rgb(color));gl.uniform1f(this.loc.uMetal,metal);for(let[a,b]of[['aPosition','v'],['aNormal','n']]){gl.bindBuffer(gl.ARRAY_BUFFER,mesh[b]);gl.vertexAttribPointer(this.loc[a],3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(this.loc[a]);}gl.drawArrays(gl.TRIANGLES,0,mesh.count);}
 segment(a,b,r,color,metal=.2){let d=S.sub(b,a),len=S.norm(d);if(len<1e-8)return;if(this.cpu&&r<=.0025){let pa=this.project(a),pb=this.project(b);this.tris.push({line:true,p:[pa,pb],depth:(pa[2]+pb[2])/2,color:'#'+color.toString(16).padStart(6,'0'),width:Math.max(1.1,r*1500/this.distance)});return;}this.draw('cylinder',S.scale(S.add(a,b),.5),(d[2]/len<-.999999?[0,1,0,0]:S.fromZ(S.scale(d,1/len))),[r,r,len],color,metal);}
 sphere(p,r,color){this.draw('sphere',p,[1,0,0,0],[r,r,r],color,.7);}
 arrow(p,v,color,max=.19){let L=S.norm(v);if(L<1e-8)return;let len=Math.min(max,L),n=S.scale(v,1/L),end=S.add(p,S.scale(n,len));this.segment(p,end,.0022,color,0);let axis=Math.abs(n[2])<.9?[0,0,1]:[1,0,0],side=S.scale(S.unit(S.cross(n,axis)),.008),rear=S.sub(end,S.scale(n,.018));this.segment(end,S.add(rear,side),.0022,color,0);this.segment(end,S.sub(rear,side),.0022,color,0);}
 ring(p,q,r,color){for(let i=0;i<48;i++){if(i%3===2)continue;let a=i*Math.PI*2/48,b=(i+1)*Math.PI*2/48;this.segment(S.add(p,S.rotate(q,[r*Math.cos(a),r*Math.sin(a),0])),S.add(p,S.rotate(q,[r*Math.cos(b),r*Math.sin(b),0])),.0016,color,0);}}
 render(sim,selected){let gl=this.gl,rect=this.canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.5);this.width=rect.width;this.height=rect.height;let w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}if(!this.cpu){gl.viewport(0,0,w,h);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);}
 let ce=Math.cos(this.elevation);this.eye=S.add(this.target,[this.distance*ce*Math.cos(this.azimuth),this.distance*ce*Math.sin(this.azimuth),this.distance*Math.sin(this.elevation)]);this.vp=mul(perspective(.63,w/h,.02,20),lookAt(this.eye,this.target));if(!this.cpu)gl.uniform3fv(this.loc.uEye,this.eye);else{this.tris=[];let ctx=this.ctx;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#eaf0f3';ctx.fillRect(0,0,this.width,this.height);for(let i=-14;i<=14;i++){ctx.strokeStyle=i===0?'#b5c8d2':'#d4dfe5';ctx.lineWidth=.7;for(let pair of[[[i*.1,-1.4,-.02],[i*.1,1.4,-.02]],[[-1.4,i*.1,-.02],[1.4,i*.1,-.02]]]){let a=this.project(pair[0]),b=this.project(pair[1]);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();}}}
 let g=sim.g,s=sim.state,k=S.kinematics(g,s);this.lastKin=k;let id=[1,0,0,0];
 this.draw('box',[0,0,-.035],id,[6,6,.025],0xe4eaf0,0);
 // Grid is geometry, so it depth-tests against the simulated mechanism.
 for(let i=-10;i<=10;i++){let c=i===0?0xb9cbd4:0xd1dce2;this.draw('box',[i*.10,0,-.020],id,[.0013,2,.001],c,0);this.draw('box',[0,i*.10,-.020],id,[2,.0013,.001],c,0);}
 if(this.cpu)this.draw('hex',[0,0,.022],S.qexp([0,0,Math.PI/6]),[g.baseRadius*1.2,g.baseRadius*1.2,.06],0x58707c,.6);
 else {this.draw('hex',[0,0,.014],S.qexp([0,0,Math.PI/6]),[g.baseRadius*1.2,g.baseRadius*1.2,.044],0x253d4b,.65);
 this.draw('hex',[0,0,.039],S.qexp([0,0,Math.PI/6]),[g.baseRadius*1.16,g.baseRadius*1.16,.012],0x58707c,.6);}
 for(let i=0;i<6;i++){let b=g.B[i];this.draw('cylinder',[b[0],b[1],.060],id,[.038,.038,.035],0xa9b9bf,.8);this.draw('hex',[b[0],b[1],.082],id,[.029,.029,.012],0x344e5c,.8);}
 // Platform's reference frame, mass and inertia correspond to this disk.
 this.draw('cylinder',s.p,s.q,[g.topRadius*1.12,g.topRadius*1.12,g.plateThickness],0xd0d7da,.8);
 if(!this.cpu)this.draw('cylinder',S.add(s.p,S.rotate(s.q,[0,0,g.plateThickness/2+.001])),s.q,[g.topRadius*1.11,g.topRadius*1.11,.004],0x82979f,.7);
 if(g.payloadMass>0){this.draw('box',S.add(s.p,S.rotate(s.q,[0,0,g.payloadZ])),s.q,[.12,.09,.09],0x18394b,.55);this.draw('box',S.add(s.p,S.rotate(s.q,[0,0,g.payloadZ+.046])),s.q,[.08,.045,.003],0x54c9b1,.25);}
 for(let l of k.legs){let i=l.index,j=sim.joints[i],col=j.slider.mode==='active'?0x159d9a:0xde9b42,bc=j.base.mode==='active'?0x2cbcab:0xe2ac5d,tc=j.top.mode==='active'?0x2cbcab:0xe2ac5d;
  let barrelEnd=S.add(l.b,S.scale(l.n,g.barrelLength)),rodStart=S.sub(l.a,S.scale(l.n,g.rodLength));
  if(this.cpu){
   // Omit internally hidden overlaps in the painter fallback, preserving external dimensions.
   let a=S.add(l.b,S.scale(l.n,.058)),b=S.add(l.b,S.scale(l.n,Math.min(.17,g.barrelLength-.025))),c=S.add(l.b,S.scale(l.n,g.barrelLength-.025));
   this.segment(l.b,a,g.barrelRadius,0x334e60,.8);this.segment(a,b,g.barrelRadius*1.04,col,.55);this.segment(b,c,g.barrelRadius,0x334e60,.8);this.segment(c,barrelEnd,g.barrelRadius*1.14,0x142d3f,.6);
   if(l.length>g.barrelLength)this.segment(barrelEnd,l.a,g.rodRadius,0xd8e0e5,1);
  }else{
   this.segment(l.b,barrelEnd,g.barrelRadius,0x334e60,.8);this.segment(S.add(l.b,S.scale(l.n,.058)),S.add(l.b,S.scale(l.n,.17)),g.barrelRadius*1.04,col,.55);
   this.segment(S.add(l.b,S.scale(l.n,g.barrelLength-.025)),barrelEnd,g.barrelRadius*1.14,0x142d3f,.6);this.segment(rodStart,l.a,g.rodRadius,0xd8e0e5,1);
  }this.sphere(l.b,.023,bc);this.sphere(l.a,.019,tc);
  this.draw('cylinder',S.add(s.p,S.rotate(s.q,S.add(g.P[i],[0,0,.020]))),s.q,[.026,.026,.017],0x374e5e,.8);
  this.draw('hex',S.add(s.p,S.rotate(s.q,S.add(g.P[i],[0,0,.031]))),s.q,[.012,.012,.01],0xbdcbd0,.9);
  if(selected&&selected.i===i){let p=selected.type==='base'?l.b:selected.type==='top'?l.a:S.scale(S.add(l.b,barrelEnd),.5);this.ring(p,l.q,.038,0xe8893f);}
  if(this.showForces&&sim.last){let f=sim.last.forces[i+':slider:0']||0;this.arrow(l.a,S.scale(l.n,f*.0015),f>=0?0x159d9a:0xc76442,.14);}
 }
 if(this.showGhost){this.ring(sim.target.p,sim.target.q,g.topRadius*1.16,0xb98253);this.arrow(sim.target.p,S.rotate(sim.target.q,[.10,0,0]),0xc66d65);this.arrow(sim.target.p,S.rotate(sim.target.q,[0,.10,0]),0x56a183);this.arrow(sim.target.p,S.rotate(sim.target.q,[0,0,.10]),0x637dcc);}
 let anchor=[-.52,-.30,.012];this.arrow(anchor,[.10,0,0],0xc26d68);this.arrow(anchor,[0,.10,0],0x5aa185);this.arrow(anchor,[0,0,.10],0x758ed0);
 if(sim.settings.external.some(x=>x!==0))this.arrow(s.p,S.scale(sim.settings.external.slice(0,3),.006),0xdc7550,.22);
 if(this.cpu)this.flushCPU();
 }
}
root.StewartRenderer=Renderer;
})(globalThis);
