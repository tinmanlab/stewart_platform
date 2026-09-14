'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
require('../src/core.js');require('../src/actuator.js');require('../src/ball.js');
const S=Stewart,A=StewartActuator,B=StewartBall;
const preset={sensor:'sampled',frequency:50,latency:.04,noise:.0007,kp:2.5,kd:2.8,maxRate:.24,commandTau:.04};
const s=S.makeSimulation();A.enable(s);B.enable(s,preset);
let maxVelocity=0,maxCurrent=0,maxVoltage=0,points=[];
function run(seconds){for(let i=0;i<Math.round(seconds/s.settings.dt);i++){
 S.step(s);assert(!s.halted,s.error);
 if(i%10===0){const angle=S.toEuler(s.state.q),p=B.position(s);points.push({t:s.state.t,angle:angle.slice(0,2),p});}
 for(let m of s.actuator.motors){maxVelocity=Math.max(maxVelocity,Math.abs(m.actualVelocity));maxCurrent=Math.max(maxCurrent,Math.abs(m.current));maxVoltage=Math.max(maxVoltage,Math.abs(m.voltage));assert(Math.abs(m.current)<=s.actuator.parameters.maxCurrent+1e-9);assert(Math.abs(m.voltage)<=s.actuator.parameters.voltage+1e-9);assert(Math.abs(m.velocityReference)<=s.actuator.parameters.velocityLimit+1e-9);}
}}
const which=process.argv[2]||'balance';let result={case:which,preset};
if(which==='balance'){
 run(12);assert.equal(s.ball.phase,'contact');const rms=x=>Math.sqrt(x.reduce((a,b)=>a+b*b,0)/x.length);
 const late=points.filter(x=>x.t>8),hp=[];let low=[0,0],alpha=1-Math.exp(-2*Math.PI*3*.01);
 for(let x of points){low=low.map((v,i)=>v+alpha*(x.angle[i]-v));if(x.t>8)hp.push(Math.hypot(x.angle[0]-low[0],x.angle[1]-low[1]));}
 result.ballRmsMm=1000*rms(late.map(x=>Math.hypot(...x.p)));result.tiltHighpassRmsDeg=180/Math.PI*rms(hp);
 assert(result.ballRmsMm<4,result.ballRmsMm);assert(result.tiltHighpassRmsDeg<.04,result.tiltHighpassRmsDeg);assert(maxVelocity<.08,maxVelocity);
}else if(which==='play'){
 run(4);B.setTarget(s,[.056,.09]);run(4);assert.equal(s.ball.phase,'contact');result.targetErrorMm=1000*Math.hypot(...S.sub(B.position(s),s.ball.goal));assert(result.targetErrorMm<12);
 B.disturb(s,[.025,-.012,0]);run(3);assert.equal(s.ball.phase,'contact');result.pushErrorMm=1000*Math.hypot(...S.sub(B.position(s),s.ball.goal));assert(result.pushErrorMm<15);
 s.ball.settings.dropout=1;run(.5);assert(s.ball.sensor.age>.4);assert(Math.hypot(...s.ball.command)<.01,'Stale sensor must return toward level without hidden truth feedback');result.staleAgeS=s.ball.sensor.age;
}else if(which==='circle'){
 s.ball.settings.path='circle';run(14);assert.equal(s.ball.phase,'contact');result.errorMm=1000*Math.hypot(...S.sub(B.position(s),s.ball.target));assert(result.errorMm<15,result.errorMm);
 B.setTarget(s,[0,0]);run(6);result.returnErrorMm=1000*Math.hypot(...B.position(s));assert(result.returnErrorMm<12,result.returnErrorMm);
}else throw Error('Unknown scenario');
Object.assign(result,{passed:true,maxLegSpeedMps:maxVelocity,maxCurrentA:maxCurrent,maxVoltageV:maxVoltage,phase:s.ball.phase});
fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync(`artifacts/realism-${which}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
