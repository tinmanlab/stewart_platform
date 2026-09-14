/* Stewart Platform Lab. SI units. Quaternion convention [w,x,y,z].
 * Reduced-coordinate, finite-mass 6-SPS rigid-body dynamics, 12 generalized speeds.
 * No rendering dependency. See docs/THEORY.md for assumptions and equations. */
(function(root){'use strict';
const N=12, TAU=Math.PI*2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const add=(a,b)=>a.map((x,i)=>x+b[i]), sub=(a,b)=>a.map((x,i)=>x-b[i]);
const scale=(a,s)=>a.map(x=>x*s), dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const norm=a=>Math.hypot(...a), cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>scale(a,1/Math.max(norm(a),1e-15));
const zeros=(n=N)=>Array(n).fill(0), matrix=(m=N,n=N)=>Array.from({length:m},()=>zeros(n));
const qconj=q=>[q[0],-q[1],-q[2],-q[3]];
function qmul(a,b){return[a[0]*b[0]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3],a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2],a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[1],a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0]];}
const qnorm=q=>scale(q,1/Math.max(norm(q),1e-15));
function qexp(v){let a=norm(v),s=a<1e-9?.5-a*a/48:Math.sin(a/2)/a;return qnorm([Math.cos(a/2),...scale(v,s)]);}
function qlog(q){q=qnorm(q);if(q[0]<0)q=scale(q,-1);let s=norm(q.slice(1));return s<1e-10?scale(q.slice(1),2):scale(q.slice(1),2*Math.atan2(s,clamp(q[0],-1,1))/s);}
function rotate(q,v){let u=q.slice(1),t=scale(cross(u,v),2);return add(v,add(scale(t,q[0]),cross(u,t)));}
function fromZ(n){let a=1+n[2];if(a<1e-8)throw Error('Leg orientation chart singularity near -Z. Reset to a valid assembly.');return qnorm([a,-n[1],n[0],0]);}
function qEuler(r,p,y){return qmul(qexp([0,0,y]),qmul(qexp([0,p,0]),qexp([r,0,0])));}
function toEuler(q){let [w,x,y,z]=q;return[Math.atan2(2*(w*x+y*z),1-2*(x*x+y*y)),Math.asin(clamp(2*(w*y-z*x),-1,1)),Math.atan2(2*(w*z+x*y),1-2*(y*y+z*z))];}
const mv=(A,x)=>A.map(r=>dot(r,x));
function solve(A,b){const n=b.length;let a=A.map((r,i)=>[...r,b[i]]);
 for(let j=0;j<n;j++){let k=j;for(let i=j+1;i<n;i++)if(Math.abs(a[i][j])>Math.abs(a[k][j]))k=i;
  if(Math.abs(a[k][j])<1e-15)throw Error('Singular linear system');[a[j],a[k]]=[a[k],a[j]];
  for(let i=j+1;i<n;i++){let f=a[i][j]/a[j][j];a[i][j]=0;for(let k=j+1;k<=n;k++)a[i][k]-=f*a[j][k];}}
 let x=zeros(n);for(let i=n-1;i>=0;i--){let v=a[i][n];for(let j=i+1;j<n;j++)v-=a[i][j]*x[j];x[i]=v/a[i][i];}return x;}
function solveSPD(A,b){const n=b.length,L=matrix(n,n),d=A.map((r,i)=>Math.sqrt(Math.max(r[i],1e-18))),z=zeros(n);
 for(let i=0;i<n;i++)for(let j=0;j<=i;j++){let x=A[i][j]/(d[i]*d[j]);for(let k=0;k<j;k++)x-=L[i][k]*L[j][k];if(i===j){if(x<=0 || !Number.isFinite(x))throw Error('Mass/damping matrix is not positive definite');L[i][j]=Math.sqrt(x);}else L[i][j]=x/L[j][j];}
 for(let i=0;i<n;i++){let x=b[i]/d[i];for(let j=0;j<i;j++)x-=L[i][j]*z[j];z[i]=x/L[i][i];}
 let y=zeros(n);for(let i=n-1;i>=0;i--){let x=z[i];for(let j=i+1;j<n;j++)x-=L[j][i]*y[j];y[i]=x/L[i][i];}return y.map((x,i)=>x/d[i]);}
function eigenSym(A){let n=A.length,a=A.map(r=>r.slice());for(let k=0;k<100;k++){let p=0,q=1,m=0;for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(Math.abs(a[i][j])>m){m=Math.abs(a[i][j]);p=i;q=j;}if(m<1e-12)break;
 let t=.5*Math.atan2(2*a[p][q],a[q][q]-a[p][p]),c=Math.cos(t),s=Math.sin(t),ap=a[p][p],aq=a[q][q],pq=a[p][q];
 for(let i=0;i<n;i++)if(i!==p&&i!==q){let x=a[i][p],y=a[i][q];a[i][p]=a[p][i]=c*x-s*y;a[i][q]=a[q][i]=s*x+c*y;}
 a[p][p]=c*c*ap-2*s*c*pq+s*s*aq;a[q][q]=s*s*ap+2*s*c*pq+c*c*aq;a[p][q]=a[q][p]=0;}
 return a.map((r,i)=>r[i]).sort((a,b)=>a-b);}
function createGeometry(o={}){
 const g=Object.assign({baseRadius:.38,topRadius:.26,homeZ:.55,baseZ:.085,basePair:12,topPair:12,platformMass:4,payloadMass:0,payloadZ:.075,deckOffset:.062,socketLimit:.52,motorReflectedMass:0,plateThickness:.028,barrelMass:.35,rodMass:.2,barrelLength:.4,rodLength:.4,barrelRadius:.018,rodRadius:.010,minLength:.40,maxLength:.76,gravity:9.81},o);
 for(const k of ['baseRadius','topRadius','homeZ','platformMass','barrelMass','rodMass','barrelLength','rodLength','barrelRadius','rodRadius','plateThickness'])if(!Number.isFinite(g[k])||g[k]<=0)throw Error('Invalid positive geometry value: '+k);
 for(const k of ['baseZ','basePair','topPair','payloadMass','payloadZ','deckOffset','minLength','maxLength','gravity'])if(!Number.isFinite(g[k]))throw Error('Invalid finite geometry value: '+k);
 if(!Number.isFinite(g.motorReflectedMass)||g.motorReflectedMass<0||g.motorReflectedMass>100)throw Error('Invalid reflected motor inertia');
 if(!Number.isFinite(g.socketLimit)||g.socketLimit<=0||g.socketLimit>Math.PI)throw Error('Invalid socket travel');
 if(g.deckOffset<0||g.deckOffset>.2)throw Error('Invalid deck offset');
 if(g.gravity<0||g.payloadMass<0||g.minLength<=.1||g.minLength>=g.maxLength||g.homeZ<=g.baseZ+.1||g.barrelLength+g.rodLength<g.maxLength)throw Error('Invalid mass, assembly height, or stroke / physical overlap.');
 let b=g.basePair*Math.PI/180,p=g.topPair*Math.PI/180;
 g.B=[-b,b,TAU/3-b,TAU/3+b,2*TAU/3-b,2*TAU/3+b].map(t=>[g.baseRadius*Math.cos(t),g.baseRadius*Math.sin(t),g.baseZ]);
 g.P=[-Math.PI/3+p,Math.PI/3-p,Math.PI/3+p,Math.PI-p,Math.PI+p,5*Math.PI/3-p].map(t=>[g.topRadius*Math.cos(t),g.topRadius*Math.sin(t),0]);return g;
}
function deckGeometry(g){const center=g.deckOffset||0;return{radius:g.topRadius*1.12,center,top:center+g.plateThickness/2,bottom:center-g.plateThickness/2};}
// Socket opening axes are fixed to their owning plates at the reference assembly.
function socketGeometry(g,s,k=kinematics(g,s)){
 let joints=[];for(let l of k.legs){let home=unit(sub(add([0,0,g.homeZ],g.P[l.index]),g.B[l.index]));
  for(let type of ['base','top']){let axis=type==='base'?home:rotate(s.q,scale(home,-1)),stem=scale(l.n,type==='base'?1:-1);
   joints.push({i:l.index,type,center:type==='base'?l.b:l.a,axis,stem,angle:Math.acos(clamp(dot(axis,stem),-1,1)),limit:g.socketLimit,
    ballRadius:.018,innerRadius:.0183,outerRadius:.024,neckRadius:.0045,mouthAngle:Math.PI/3,mouthRadius:.0183*Math.sin(Math.PI/3)});
  }
 }return joints;
}
function homeState(g){return{p:[0,0,g.homeZ],q:[1,0,0,0],spin:zeros(6),v:zeros(),t:0};}
function cloneState(s){return{p:s.p.slice(),q:s.q.slice(),spin:s.spin.slice(),v:s.v.slice(),t:s.t};}
function shift(s,v,h){let x=cloneState(s);x.p=add(x.p,scale(v.slice(0,3),h));x.q=qnorm(qmul(qexp(scale(v.slice(3,6),h)),x.q));x.spin=x.spin.map((a,i)=>a+h*v[6+i]);return x;}
const basis=[[1,0,0],[0,1,0],[0,0,1]];
function pointJac(r){let J=matrix(3,N);for(let a=0;a<3;a++){J[a][a]=1;let c=cross(basis[a],r);for(let k=0;k<3;k++)J[k][3+a]=c[k];}return J;}
function angularJac(){let J=matrix(3,N);for(let a=0;a<3;a++)J[a][3+a]=1;return J;}
function col(J,j){return[J[0][j],J[1][j],J[2][j]];}
function inertiaApply(body,v){let local=rotate(qconj(body.q),v);return rotate(body.q,local.map((x,i)=>x*body.inertia[i]));}
function kinematics(g,s){
 const lengths=[],J=[],legs=[],bodies=[],Jp=angularJac();
 const rp=g.topRadius*1.12,m=g.platformMass,h=g.plateThickness;
 const rd=rotate(s.q,[0,0,deckGeometry(g).center]);
 bodies.push({name:'platform',mass:m,pos:add(s.p,rd),q:s.q,Jv:pointJac(rd),Jw:Jp,inertia:[m*(3*rp*rp+h*h)/12,m*(3*rp*rp+h*h)/12,m*rp*rp/2]});
 if(g.payloadMass>0){let r=rotate(s.q,[0,0,deckGeometry(g).center+g.payloadZ]),m=g.payloadMass,w=.12,d=.09,h=.09;bodies.push({name:'payload',mass:m,pos:add(s.p,r),q:s.q,Jv:pointJac(r),Jw:Jp,inertia:[m*(d*d+h*h)/12,m*(w*w+h*h)/12,m*(w*w+d*d)/12]});}
 for(let i=0;i<6;i++){
  let r=rotate(s.q,g.P[i]),a=add(s.p,r),d=sub(a,g.B[i]),L=norm(d);if(L<1e-6)throw Error('Zero leg length');let n=scale(d,1/L),Ja=pointJac(r),Jn=matrix(3,N),Jw=matrix(3,N),Jl=zeros();
  for(let j=0;j<6;j++){let da=col(Ja,j),dl=dot(n,da);Jl[j]=dl;let dn=scale(sub(da,scale(n,dl)),1/L),w=sub(cross(n,dn),scale(n,(n[0]*dn[1]-n[1]*dn[0])/Math.max(1e-8,1+n[2])));for(let k=0;k<3;k++){Jn[k][j]=dn[k];Jw[k][j]=w[k];}}
  for(let k=0;k<3;k++)Jw[k][6+i]=n[k];
  let q=qmul(fromZ(n),qexp([0,0,s.spin[i]])),Jrel=Jw.map((row,k)=>row.map((v,j)=>v-Jp[k][j]));
  legs.push({index:i,n,r,a,b:g.B[i],length:L,q,relative:qmul(qconj(s.q),q),Jw,Jrel,Jn,Ja});lengths.push(L);J.push(Jl);
  let Jvl=Jn.map(row=>scale(row,g.barrelLength/2)),Jvu=Ja.map((row,k)=>row.map((v,j)=>v-g.rodLength/2*Jn[k][j]));
  for(const b of [{name:'barrel',mass:g.barrelMass,len:g.barrelLength,rad:g.barrelRadius,pos:add(g.B[i],scale(n,g.barrelLength/2)),Jv:Jvl},{name:'rod',mass:g.rodMass,len:g.rodLength,rad:g.rodRadius,pos:sub(a,scale(n,g.rodLength/2)),Jv:Jvu}]){
   let I=b.mass*(3*b.rad*b.rad+b.len*b.len)/12;bodies.push({name:b.name+i,mass:b.mass,pos:b.pos,q,Jv:b.Jv,Jw,inertia:[I,I,b.mass*b.rad*b.rad/2]});}
 }
 return{lengths,J,legs,bodies};
}
function massAndGravity(g,k){let M=matrix(),G=zeros();
 for(const b of k.bodies){let IW=Array.from({length:N},(_,j)=>inertiaApply(b,col(b.Jw,j)));
  for(let i=0;i<N;i++){G[i]-=b.mass*g.gravity*b.Jv[2][i];for(let j=0;j<=i;j++){let x=b.mass*dot(col(b.Jv,i),col(b.Jv,j))+dot(col(b.Jw,i),IW[j]);M[i][j]+=x;if(i!==j)M[j][i]+=x;}}}
 for(const row of k.J)for(let i=0;i<N;i++)for(let j=0;j<N;j++)M[i][j]+=g.motorReflectedMass*row[i]*row[j];
 return{M,G};}
function dynamics(g,s,needBias=true){let k=kinematics(g,s),{M,G}=massAndGravity(g,k),h=zeros();
 if(needBias&&norm(s.v)>1e-9){let eps=1e-5/Math.max(1,norm(s.v)),kp=kinematics(g,shift(s,s.v,eps)),km=kinematics(g,shift(s,s.v,-eps));
  for(let bi=0;bi<k.bodies.length;bi++){let b=k.bodies[bi],bp=kp.bodies[bi],bm=km.bodies[bi],a=zeros(3),alpha=zeros(3),w=mv(b.Jw,s.v);
   for(let aidx=0;aidx<3;aidx++)for(let j=0;j<N;j++){a[aidx]+=(bp.Jv[aidx][j]-bm.Jv[aidx][j])*s.v[j]/(2*eps);alpha[aidx]+=(bp.Jw[aidx][j]-bm.Jw[aidx][j])*s.v[j]/(2*eps);}
   let torque=add(inertiaApply(b,alpha),cross(w,inertiaApply(b,w)));for(let j=0;j<N;j++)h[j]+=b.mass*dot(col(b.Jv,j),a)+dot(col(b.Jw,j),torque);
  }
  if(g.motorReflectedMass)for(let i=0;i<6;i++){let acceleration=kp.J[i].reduce((v,x,j)=>v+(x-km.J[i][j])*s.v[j]/(2*eps),0);for(let j=0;j<N;j++)h[j]+=g.motorReflectedMass*k.J[i][j]*acceleration;}
 }return{k,M,G,h};}
function condition(g,k){let A=k.J.map(r=>r.slice(0,6).map((v,j)=>j<3?v:v/g.topRadius)),AtA=matrix(6,6);for(let i=0;i<6;i++)for(let j=0;j<6;j++)AtA[i][j]=A.reduce((s,r)=>s+r[i]*r[j],0);let e=eigenSym(AtA),s=e.map(x=>Math.sqrt(Math.max(0,x)));return{singularValues:s,rank:s.filter(x=>x>1e-6).length,condition:s[0]>1e-10?s[5]/s[0]:Infinity};}
function forwardKinematics(g,lengths,seed=homeState(g)){
 if(!Array.isArray(lengths)||lengths.length!==6||lengths.some(x=>!Number.isFinite(x)||x<=0))return{ok:false,residual:Infinity,iterations:0,reason:'Invalid six lengths'};
 let s=cloneState(seed),res=Infinity;for(let it=0;it<65;it++){
  let k=kinematics(g,s),e=sub(lengths,k.lengths);res=norm(e);if(res<1e-9)return{ok:true,state:s,residual:res,iterations:it,condition:condition(g,k).condition};
  let J=k.J.map(r=>r.slice(0,6).map((v,j)=>j<3?v:v/g.topRadius)),H=matrix(6,6),rhs=zeros(6);
  for(let i=0;i<6;i++)for(let a=0;a<6;a++){rhs[a]+=J[i][a]*e[i];for(let b=0;b<6;b++)H[a][b]+=J[i][a]*J[i][b];}for(let a=0;a<6;a++)H[a][a]+=1e-9;
  let dx=solveSPD(H,rhs).map((v,j)=>j<3?v:v/g.topRadius),v=[...dx,...zeros(6)],mag=Math.max(norm(dx.slice(0,3))/.08,norm(dx.slice(3))/.25,1);v=scale(v,1/mag);
  let accepted=false;for(let step=1;step>1e-4;step*=.5){let cand=shift(s,v,step);if(norm(sub(lengths,kinematics(g,cand).lengths))<res){s=cand;accepted=true;break;}}if(!accepted)break;
 }return{ok:false,state:s,residual:res,iterations:65,reason:'Local FK did not converge; change seed or lengths'};
}
function feasible(g,s){let k=kinematics(g,s),c=condition(g,k),travel=socketGeometry(g,s,k).some(j=>j.angle>j.limit),bad=k.lengths.map((x,i)=>x<g.minLength||x>g.maxLength?i+1:0).filter(Boolean);return{ok:!travel&&bad.length===0&&s.p[2]>.13&&c.condition<200,stroke:bad,condition:c.condition,rank:c.rank,reason:travel?'Ball-socket angular travel exceeded':bad.length?'Stroke exceeded: L'+bad.join(', L'):s.p[2]<=.13?'Platform below clearance':c.condition>=200?'Near kinematic singularity':''};}
function makeJointConfig(g,s){let k=kinematics(g,s);return k.legs.map((l,i)=>({
 slider:{mode:'active',k:1200,c:45,kp:8000,kd:95,rest:k.lengths[i],max:350,manual:0},
 base:{mode:'passive',k:0,c:.025,kp:16,kd:.3,rest:l.q.slice(),max:8,manual:[0,0,0]},
 top:{mode:'passive',k:0,c:.025,kp:16,kd:.3,rest:l.relative.slice(),max:8,manual:[0,0,0]}
}));}
function captureRest(joints,g,s){let k=kinematics(g,s);k.legs.forEach((l,i)=>{joints[i].slider.rest=k.lengths[i];joints[i].base.rest=l.q.slice();joints[i].top.rest=l.relative.slice();});}
function activeColumns(g,k,joints){let cols=[];for(let i=0;i<6;i++){if(joints[i].slider.mode==='active')cols.push({id:i+':slider:0',B:k.J[i],cap:joints[i].slider.max,i,type:'slider',axis:0});for(let type of ['base','top'])if(joints[i][type].mode==='active')for(let a=0;a<3;a++)cols.push({id:i+':'+type+':'+a,B:(type==='base'?k.legs[i].Jw:k.legs[i].Jrel)[a],cap:joints[i][type].max,i,type,axis:a});}return cols;}
function allocate(g,cols,tau){let n=cols.length,result=zeros(n),free=Array.from({length:n},(_,i)=>i),res=tau.slice(),rs=[1,1,1,...Array(9).fill(1/g.topRadius)];
 for(let iter=0;iter<=Math.min(n,18)&&free.length;iter++){
  let A=free.map(i=>cols[i].B.map((v,j)=>v*cols[i].cap*rs[j])),H=matrix(),y=res.map((v,j)=>v*rs[j]);
  for(let a=0;a<N;a++)for(let b=0;b<N;b++)H[a][b]=A.reduce((s,c)=>s+c[a]*c[b],0);
  let reg=Math.max(1e-10,Math.max(...H.map((r,i)=>r[i]))*1e-11);for(let a=0;a<N;a++)H[a][a]+=reg;
  let sol=solveSPD(H,y),z=A.map(c=>dot(c,sol)),max=1,which=-1;z.forEach((v,j)=>{if(Math.abs(v)>max){max=Math.abs(v);which=j;}});
  if(which<0){free.forEach((i,j)=>result[i]=z[j]*cols[i].cap);free=[];break;}
  let idx=free[which],f=Math.sign(z[which])*cols[idx].cap;result[idx]=f;res=sub(res,scale(cols[idx].B,f));free.splice(which,1);
 }
 let achieved=zeros();cols.forEach((c,i)=>achieved=add(achieved,scale(c.B,result[i])));return{values:result,map:Object.fromEntries(cols.map((c,i)=>[c.id,result[i]])),residual:sub(tau,achieved),residualNorm:norm(sub(tau,achieved).map((v,i)=>v*rs[i])),saturated:result.filter((x,i)=>Math.abs(x)>=cols[i].cap*.999).length};}
function orientationError(type,rest,leg,s){return type==='base'?qlog(qmul(rest,qconj(leg.q))):rotate(s.q,qlog(qmul(rest,qconj(leg.relative))));}
function jointRows(g,s,k,joints,settings,target,alloc){let rows=[],kt=kinematics(g,target),mode=settings.mode;
 for(let i=0;i<6;i++){
  let cfg=joints[i].slider,active=cfg.mode==='active',f=0,d=0;
  if(!active){f=cfg.k*(cfg.rest-k.lengths[i]);d=cfg.c;}
  else if(mode==='ik'){f=cfg.kp*(kt.lengths[i]-k.lengths[i])+(alloc.map[i+':slider:0']||0);d=cfg.kd;}
  else if(mode==='gravity'){f=alloc.map[i+':slider:0']||0;d=settings.gravityDamping;}
  else if(mode==='compliance'){f=alloc.map[i+':slider:0']||0;}
  else if(mode==='manual')f=cfg.manual;
  rows.push({id:i+':slider:0',B:k.J[i],f,d,cap:active?cfg.max:Infinity,active,type:'slider',i,axis:0});
  for(let type of ['base','top']){let cfg=joints[i][type],active=cfg.mode==='active',e=orientationError(type,active?(type==='base'?kt.legs[i].q:kt.legs[i].relative):cfg.rest,k.legs[i],s),Bs=type==='base'?k.legs[i].Jw:k.legs[i].Jrel;
   for(let a=0;a<3;a++){let f=0,d=0;if(!active){f=cfg.k*e[a];d=cfg.c;}else if(mode==='ik'){f=cfg.kp*e[a]+(alloc.map[i+':'+type+':'+a]||0);d=cfg.kd;}else if(mode==='gravity'||mode==='compliance'){f=alloc.map[i+':'+type+':'+a]||0;d=mode==='gravity'?.03:.02;}else if(mode==='manual')f=cfg.manual[a];
    rows.push({id:i+':'+type+':'+a,B:Bs[a],f,d,cap:active?cfg.max:Infinity,active,type,i,axis:a});}
  }
 }
 return rows;
}
function passiveTau(g,s,k,joints){let z=zeros(),dummy={mode:'free',gravityDamping:0},rows=jointRows(g,s,k,joints,dummy,s,{map:{}});for(let r of rows)if(!r.active)z=add(z,scale(r.B,r.f-r.d*dot(r.B,s.v)));return z;}
function stopRows(g,s,k){let rows=[];
 for(let j of socketGeometry(g,s,k)){if(j.angle<=j.limit)continue;const axis=unit(cross(j.stem,j.axis)),J=j.type==='base'?k.legs[j.i].Jw:k.legs[j.i].Jrel;
  const B=Array.from({length:N},(_,a)=>axis.reduce((v,x,i)=>v+x*J[i][a],0));rows.push({B,f:80*(j.angle-j.limit),d:dot(B,s.v)<0?1.2:0,cap:Infinity,id:j.i+':'+j.type+':socket-stop'});}
for(let i=0;i<6;i++){let L=k.lengths[i],v=dot(k.J[i],s.v);if(L<g.minLength)rows.push({B:k.J[i],f:40000*(g.minLength-L),d:v<0?180:0,cap:Infinity,id:'lower-stop'+i});if(L>g.maxLength)rows.push({B:k.J[i],f:40000*(g.maxLength-L),d:v>0?180:0,cap:Infinity,id:'upper-stop'+i});}
 for(let a=0;a<6;a++){let t=a*TAU/6,r=rotate(s.q,[g.topRadius*1.1*Math.cos(t),g.topRadius*1.1*Math.sin(t),deckGeometry(g).bottom]),p=add(s.p,r);if(p[2]<.045){let B=pointJac(r)[2];rows.push({B,f:60000*(.045-p[2]),d:dot(B,s.v)<0?180:0,cap:Infinity,id:'floor'+a});}}return rows;}
function defaultSettings(){return{mode:'ik',gravityComp:true,gravityDamping:2,translationK:900,translationD:95,rotationK:65,rotationD:8,external:[0,0,0,0,0,0],dt:.001};}
function makeSimulation(g=createGeometry()){let s=homeState(g);return{g,state:s,target:cloneState(s),joints:makeJointConfig(g,s),settings:defaultSettings(),last:null,halted:false,error:null};}
function controlDemand(sim,d){let set=sim.settings,tau=zeros();if(set.mode==='gravity'||((set.mode==='ik'||set.mode==='compliance')&&set.gravityComp))tau=scale(sim.actuator?.gravityG||d.G,-1);
 if(set.mode==='compliance'){let feedback=sim.actuator?sim.actuator.pose:sim.state;let ep=sub(sim.target.p,feedback.p),er=qlog(qmul(sim.target.q,qconj(feedback.q)));for(let a=0;a<3;a++){tau[a]+=set.translationK*ep[a]-set.translationD*feedback.v[a];tau[3+a]+=set.rotationK*er[a]-set.rotationD*feedback.v[3+a];}}
 return tau;}
function step(sim,dt=sim.settings.dt){if(sim.halted)return sim.last;try{
 const s=sim.state,g=sim.g,d=dynamics(g,s),cols=activeColumns(g,d.k,sim.joints),demand=controlDemand(sim,d),allocation=(sim.settings.mode==='manual'||sim.settings.mode==='free')?{values:zeros(cols.length),map:{},residualNorm:0,residual:zeros(),saturated:0}:allocate(g,cols,demand);
 let rows=jointRows(g,s,d.k,sim.joints,sim.settings,sim.target,allocation);if(sim.actuator)root.StewartActuator.prepare(sim,rows,dt,d.k);let stops=stopRows(g,s,d.k),all=[...rows,...stops],base=add(sub(d.G,d.h),[...sim.settings.external,...zeros(6)]),vnext=s.v.slice(),q0=mv(d.M,s.v);
 // Active-set backward damping. Saturated motors contribute bounded effort, not unbounded damping.
 for(let it=0;it<4;it++){let A=d.M.map(r=>r.slice()),rhs=add(q0,scale(base,dt));for(let r of all){let predicted=r.f-r.d*dot(r.B,vnext),saturated=Math.abs(predicted)>r.cap,f=saturated?clamp(predicted,-r.cap,r.cap):r.f,c=saturated?0:r.d;
  for(let a=0;a<N;a++){rhs[a]+=dt*r.B[a]*f;if(c)for(let b=0;b<N;b++)A[a][b]+=dt*c*r.B[a]*r.B[b];}}
  let vn=solveSPD(A,rhs);if(norm(sub(vn,vnext))<1e-9){vnext=vn;break;}vnext=vn;
 }
 let forceMap={},actualTau=zeros(),sat=0;for(let r of rows){let f=clamp(r.f-r.d*dot(r.B,vnext),-r.cap,r.cap);forceMap[r.id]=f;actualTau=add(actualTau,scale(r.B,f));if(r.active&&Math.abs(f)>=r.cap*.999)sat++;}
 if(sim.actuator)root.StewartActuator.complete(sim,forceMap,vnext,d.k);
 let next=shift(s,vnext,dt);next.v=vnext;next.t=s.t+dt;if(![...next.p,...next.q,...next.v].every(Number.isFinite)||norm(next.v.slice(0,3))>30||norm(next.v.slice(3,6))>80)throw Error('Numerical safety stop: motion exceeded simulation bounds. Reset / reduce gains.');
 sim.state=next;sim.last={...d,forces:forceMap,allocation,saturated:sat,acceleration:scale(sub(vnext,s.v),1/dt),actualTau,stopCount:stops.length};return sim.last;
 }catch(e){sim.halted=true;sim.error=e.message;return sim.last;}}
function impulse(sim,linear=[0,0,0],angular=[0,0,0]){let d=dynamics(sim.g,sim.state,false),dv=solveSPD(d.M,[...linear,...angular,...zeros(6)]);sim.state.v=add(sim.state.v,dv);}
function energy(g,s,joints){let d=dynamics(g,s,false),T=.5*dot(s.v,mv(d.M,s.v)),V=d.k.bodies.reduce((v,b)=>v+b.mass*g.gravity*b.pos[2],0);
 if(joints)for(let i=0;i<6;i++){let c=joints[i].slider;if(c.mode==='passive')V+=.5*c.k*(d.k.lengths[i]-c.rest)**2;for(let type of ['base','top']){let c=joints[i][type];if(c.mode==='passive')V+=.5*c.k*norm(orientationError(type,c.rest,d.k.legs[i],s))**2;}}
 return{kinetic:T,potential:V,total:T+V};}
function inverseDynamics(sim,acceleration=zeros()){let d=dynamics(sim.g,sim.state),p=passiveTau(sim.g,sim.state,d.k,sim.joints),tau=sub(sub(sub(add(mv(d.M,acceleration),d.h),d.G),p),[...sim.settings.external,...zeros(6)]);return{tau,...allocate(sim.g,activeColumns(sim.g,d.k,sim.joints),tau)};}
function snapshot(sim){return{schema:'stewart-lab/1',geometry:sim.g,state:cloneState(sim.state),target:cloneState(sim.target),joints:JSON.parse(JSON.stringify(sim.joints)),settings:{...sim.settings,external:sim.settings.external.slice()}};}
function restore(o){if(o.schema!=='stewart-lab/1')throw Error('Unsupported project schema');let sim=makeSimulation(createGeometry({...o.geometry,deckOffset:o.geometry.deckOffset??0,socketLimit:o.geometry.socketLimit??Math.PI}));
 for(let state of [o.state,o.target]){if(!state||state.p.length!==3||state.q.length!==4||state.spin.length!==6||state.v.length!==12||![...state.p,...state.q,...state.spin,...state.v,state.t].every(Number.isFinite))throw Error('Invalid state data');if(Math.abs(norm(state.q)-1)>.01)throw Error('Quaternion must be normalized');}
 if(!Array.isArray(o.joints)||o.joints.length!==6)throw Error('Invalid joint definitions');for(let j of o.joints)for(let type of ['slider','base','top']){let c=j[type];if(!c||!['active','passive'].includes(c.mode))throw Error('Invalid actuation mode');for(let f of ['k','c','kp','kd','max'])if(!Number.isFinite(c[f])||c[f]<0||c[f]>1e6)throw Error('Invalid joint coefficient');if(type==='slider'){if(!Number.isFinite(c.rest)||!Number.isFinite(c.manual))throw Error('Invalid slider rest / effort');}else if(!Array.isArray(c.rest)||c.rest.length!==4||!c.rest.every(Number.isFinite)||Math.abs(norm(c.rest)-1)>.01||!Array.isArray(c.manual)||c.manual.length!==3||!c.manual.every(Number.isFinite))throw Error('Invalid spherical rest / effort');}
 if(!['ik','gravity','compliance','manual','free'].includes(o.settings.mode)||!Array.isArray(o.settings.external)||o.settings.external.length!==6||!o.settings.external.every(Number.isFinite))throw Error('Invalid control settings');for(let f of ['gravityDamping','translationK','translationD','rotationK','rotationD','dt'])if(!Number.isFinite(o.settings[f])||o.settings[f]<0||o.settings[f]>1e5)throw Error('Invalid setting '+f);if(o.settings.dt<.0002||o.settings.dt>.003)throw Error('Unsafe timestep');
 sim.state=cloneState(o.state);sim.target=cloneState(o.target);sim.joints=JSON.parse(JSON.stringify(o.joints));sim.settings={...o.settings,external:o.settings.external.slice()};kinematics(sim.g,sim.state);return sim;}
root.Stewart={N,clamp,add,sub,scale,dot,norm,cross,unit,zeros,matrix,qconj,qmul,qnorm,qexp,qlog,rotate,fromZ,qEuler,toEuler,mv,solve,solveSPD,eigenSym,createGeometry,deckGeometry,socketGeometry,homeState,cloneState,shift,pointJac,inertiaApply,kinematics,massAndGravity,dynamics,condition,forwardKinematics,feasible,makeJointConfig,captureRest,activeColumns,allocate,orientationError,jointRows,passiveTau,defaultSettings,makeSimulation,step,impulse,energy,inverseDynamics,snapshot,restore};
})(globalThis);
