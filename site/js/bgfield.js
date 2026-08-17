// RT/FX hero background — the v1 particle field, ported from the 2026-08-13
// deploy (Next.js chunk 14fycqmyghavi). Glow-sprite particles with feedback
// trails: each frame the canvas fades via destination-out, then draws additive,
// so motion leaves a wake. The pointer charges and flings nearby particles;
// fast movement stretches them along their velocity.
//
// v1 ran six colors. v2's system is single-accent, so the sprites are warm
// white and ink gray with amber reserved for charged particles - the discipline
// rule kept, the feel restored. The original palette is one array swap away.
(function(){
var els=document.querySelectorAll('#bgfield,canvas.bgfield');
for(var e=0;e<els.length;e++)initField(els[e]);
function initField(cv){
var ctx=cv.getContext('2d');if(!ctx)return;
var rm=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var host=cv.parentElement;
var W=0,H=0,P=[],raf=0,last=0,running=true;
var ptr={x:-9e3,y:-9e3,px:-9e3,py:-9e3,active:false,speed:0};

// pre-rendered glow sprites: [r,g,b]. neutral bodies + amber for charge.
function sprite(r,g,b){
var c=document.createElement('canvas');c.width=c.height=96;
var o=c.getContext('2d');
var gr=o.createRadialGradient(48,48,0,48,48,48);
gr.addColorStop(0,'rgba(255,255,255,.95)');
gr.addColorStop(.09,'rgba('+r+','+g+','+b+',.8)');
gr.addColorStop(.26,'rgba('+r+','+g+','+b+',.3)');
gr.addColorStop(.55,'rgba('+r+','+g+','+b+',.07)');
gr.addColorStop(1,'rgba('+r+','+g+','+b+',0)');
o.fillStyle=gr;o.fillRect(0,0,96,96);
return c;
}
var NEUTRAL=[sprite(255,240,214),sprite(163,163,163),sprite(110,110,110)];
var AMBER=sprite(255,176,32),SOFT=sprite(255,217,160);

function build(){
var r=cv.getBoundingClientRect();W=r.width;H=r.height;
if(W<10||H<10)return;
var dpr=Math.min(window.devicePixelRatio||1,1.75);
cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);
ctx.setTransform(dpr,0,0,dpr,0,0);
var n=Math.max(21,Math.min(54,Math.round(W*H/26667)));
P=[];
for(var i=0;i<n;i++)P.push({
x:Math.random()*W,y:Math.random()*H,
vx:(Math.random()-.5)*.34,vy:(Math.random()-.5)*.34,
size:Math.pow(Math.random(),3)*17+3,
body:NEUTRAL[i%NEUTRAL.length],
charge:Math.random()*.22,seed:i*.73
});
}
// clicking the hero adds a particle: born charged (amber), with a small
// outward kick so the arrival reads. The population is capped - each birth
// past the cap retires the oldest particle, so the field never overgrows.
var MAX=140,seedN=1000;
function spawn(x,y){
P.push({
x:x,y:y,
vx:(Math.random()-.5)*2.4,vy:(Math.random()-.5)*2.4,
size:Math.pow(Math.random(),2)*14+4,
body:NEUTRAL[Math.floor(Math.random()*NEUTRAL.length)],
charge:1,seed:(seedN++)*.73
});
if(P.length>MAX)P.shift();
}

function tick(now){
var dt=last?Math.min(3.5,Math.max(.2,(now-last)/16.667)):1;last=now;
// feedback: fade what is already there, then add light on top
ctx.globalCompositeOperation='destination-out';
ctx.fillStyle='rgba(0,0,0,'+(rm?1:1-Math.pow(.86,dt))+')';
ctx.fillRect(0,0,W,H);
ctx.globalCompositeOperation='lighter';
ptr.speed*=Math.pow(.9,dt);
for(var i=0;i<P.length;i++){
var p=P[i];
if(!rm){
p.vx+=.006*Math.cos(now*19e-5+p.seed)*dt;
p.vy+=.006*Math.sin(now*16e-5+p.seed*1.7)*dt;
if(ptr.active){
var dx=p.x-ptr.x,dy=p.y-ptr.y,d=Math.hypot(dx,dy)||1;
if(d<260){
var f=Math.pow(1-d/260,2)*(.42+.045*ptr.speed)*dt;
p.vx+=dx/d*f;p.vy+=dy/d*f;
p.charge=Math.min(1,p.charge+f*.45);
}
}
var damp=Math.pow(.978,dt);
p.vx*=damp;p.vy*=damp;
p.x+=p.vx*dt;p.y+=p.vy*dt;
p.charge*=Math.pow(.965,dt);
}
if(p.x<-70)p.x=W+70;if(p.x>W+70)p.x=-70;
if(p.y<-70)p.y=H+70;if(p.y>H+70)p.y=-70;
var img=p.charge>.55?AMBER:(p.charge>.3?SOFT:p.body);
var g=p.size*(1+p.charge*1.3);
var tw=rm?1:.84+.16*Math.sin(now*.001+p.seed*3.1);
ctx.globalAlpha=Math.min(.58,(.25+.4*p.charge)*tw);
var sp=Math.hypot(p.vx,p.vy);
if(sp>.3){
var st=Math.min(6,1+sp*1.6);
ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(p.vy,p.vx));
ctx.drawImage(img,-g*st,-g,2*g*st,2*g);ctx.restore();
}else ctx.drawImage(img,p.x-g,p.y-g,2*g,2*g);
}
ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
if(!rm&&running)raf=requestAnimationFrame(tick);
}

function move(e){
var r=cv.getBoundingClientRect();
var x=e.clientX-r.left,y=e.clientY-r.top;
if(ptr.active)ptr.speed=Math.min(28,Math.hypot(x-ptr.px,y-ptr.py));
ptr.px=ptr.x;ptr.py=ptr.y;ptr.x=x;ptr.y=y;ptr.active=true;
}
function leave(){ptr.active=false;ptr.speed=0}

build();
if('IntersectionObserver'in window){
new IntersectionObserver(function(es){es.forEach(function(e){
running=e.isIntersecting;
if(running&&!raf&&!rm){last=0;raf=requestAnimationFrame(tick)}
else if(!running&&raf){cancelAnimationFrame(raf);raf=0}
})},{threshold:.05}).observe(cv);
}
if('ResizeObserver'in window)new ResizeObserver(build).observe(cv);
if(host){
host.addEventListener('pointermove',move);
host.addEventListener('pointerleave',leave);
host.addEventListener('pointerdown',function(e){
var r=cv.getBoundingClientRect();
spawn(e.clientX-r.left,e.clientY-r.top);
});
}
raf=requestAnimationFrame(tick);
}
})();
