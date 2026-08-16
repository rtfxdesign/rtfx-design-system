// RT/FX interactive type fields — hero + section headers. "Move to disturb the field."
window.RTFXField={init:function(cv){
if(cv.__inited)return;cv.__inited=1;
var rm=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var ctx=cv.getContext('2d');
var TEXT=cv.dataset.text||'RT/FX';
var HERO=cv.dataset.mode==='hero';
var P=[],W=0,H=0,DPR=Math.min(window.devicePixelRatio||1,2);
var px=-9e3,py=-9e3,raf=0,running=false,idleFrames=0;
function build(){
W=cv.clientWidth;H=cv.clientHeight;if(W<10||H<10)return;
cv.width=W*DPR;cv.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0);
var off=document.createElement('canvas');off.width=W;off.height=H;
var o=off.getContext('2d');
o.fillStyle='#fff';o.textBaseline='middle';
function font(s){o.font='700 '+s+'px "Martian Mono",monospace'}
function fit(t,startH,maxW){var s=startH;font(s);while(o.measureText(t).width>maxW&&s>8){s-=2;font(s)}return s}
if(HERO){
o.textAlign='center';
var small=W<640;
if(small){var s1=fit('INFRASTRUCTURE',H*0.34,W*0.94);font(Math.min(s1*1.6,H*0.34));o.fillText('ART',W/2,H*0.3);font(s1);o.fillText('INFRASTRUCTURE',W/2,H*0.68);}
else{fit(TEXT,H*0.5,W*0.94);o.fillText(TEXT,W/2,H*0.52);}
}else{
o.textAlign='left';
fit(TEXT,H*0.72,W*0.98);
o.fillText(TEXT,1,H*0.55);
}
var data=o.getImageData(0,0,W,H).data;
P=[];
var step=HERO?Math.max(2,Math.round(W/340)):2;
for(var y=0;y<H;y+=step)for(var x=0;x<W;x+=step){
if(data[(y*W+x)*4+3]>128)P.push({x:x,y:y,hx:x,hy:y,vx:0,vy:0,heat:0});
}
drawStatic();
}
function drawStatic(){
ctx.clearRect(0,0,W,H);ctx.fillStyle=HERO?'#A3A3A3':'#FAFAFA';
for(var i=0;i<P.length;i++){var p=P[i];ctx.fillRect(p.x-0.75,p.y-0.75,1.5,1.5);}
}
function tick(){
raf=0;var moved=false;
ctx.clearRect(0,0,W,H);
var base=HERO?'#A3A3A3':'#FAFAFA';
var R=HERO?Math.max(70,W*0.07):Math.max(46,H*0.85),R2=R*R;
for(var i=0;i<P.length;i++){
var p=P[i];
var dx=p.x-px,dy=p.y-py,d2=dx*dx+dy*dy;
if(d2<R2&&d2>0.01){var d=Math.sqrt(d2),f=(1-d/R)*3.2;p.vx+=dx/d*f;p.vy+=dy/d*f;p.heat=1;}
p.vx+=(p.hx-p.x)*0.025;p.vy+=(p.hy-p.y)*0.025;
p.vx*=0.86;p.vy*=0.86;
p.x+=p.vx;p.y+=p.vy;
if(p.heat>0.004){p.heat*=0.96;moved=true}else p.heat=0;
if(Math.abs(p.vx)+Math.abs(p.vy)>0.05)moved=true;
if(p.heat>0.05){ctx.fillStyle=p.heat>0.5?'#FFB020':'#FFD9A0';}else ctx.fillStyle=base;
ctx.fillRect(p.x-0.75,p.y-0.75,1.5,1.5);
}
idleFrames=moved?0:idleFrames+1;
if(running&&idleFrames<30)raf=requestAnimationFrame(tick);
}
function wake(){if(!raf&&running&&!rm){idleFrames=0;raf=requestAnimationFrame(tick)}}
function pt(e){var r=cv.getBoundingClientRect();var t=e.touches?e.touches[0]:e;px=t.clientX-r.left;py=t.clientY-r.top;wake()}
function off2(){px=-9e3;py=-9e3;wake()}
if(!rm){
cv.addEventListener('mousemove',pt);
cv.addEventListener('touchmove',pt,{passive:true});
cv.addEventListener('mouseleave',off2);
cv.addEventListener('touchend',off2);
if('IntersectionObserver'in window){new IntersectionObserver(function(es){es.forEach(function(e){running=e.isIntersecting;if(running)wake();else if(raf){cancelAnimationFrame(raf);raf=0}})},{threshold:.1}).observe(cv);}else running=true;
}
var rt;window.addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(build,150)});
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(build);
build();
},
initAll:function(root){var els=(root||document).querySelectorAll('canvas[data-text]');for(var i=0;i<els.length;i++)window.RTFXField.init(els[i])}
};
document.addEventListener('DOMContentLoaded',function(){window.RTFXField.initAll(document)});
