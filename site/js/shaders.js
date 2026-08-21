/* RT/FX — custom shaders deck. Runs the real REVd Wire ISF shaders in WebGL:
   fetches each .fs from shaders/isf/, parses the ISF JSON header, shims the
   ISF surface (RENDERSIZE/TIME/PASSINDEX/bufA/IMG_NORM_PIXEL), and drives the
   patches' own audio inputs from a live FFT - sim by default, test tracks or
   mic on demand. Persistent bufA passes get a ping-pong framebuffer pair. */
(function(){
'use strict';
var deckRoot=document.getElementById('vDeck');if(!deckRoot)return;

/* ---- channel table. file -> shaders/isf/<file>.fs; nodes counted from the
   actual .wire patches; map = honest band semantics; set = static overrides
   (palette 3 is the Tempo amber zone, closest to the site's own accent);
   mods = host-side modulation for inputs the patch fed from FFT externally. */
var S=[
{id:'cadencetach',file:'cadencetach',name:'CadenceTach',nodes:15,bpm:true,
 map:[['bass','Dial sweep'],['mid','Tick glow'],['high','Needle jitter']],
 params:['Dial rings','RPM speed','Glow'],
 set:{stage:.6,color1:[1,.69,.125,1],color2:[.35,.16,0,1],color3:[1,.851,.627,1],color4:[1,.42,0,1]}},
{id:'wavescope',file:'wavescope',name:'WaveScope',nodes:12,bpm:true,
 map:[['bass','Centre warp'],['mid','Trace ripple'],['high','Rim sparkle']],
 params:['Depth traces','Spread','Scan grid'],set:{palette:3,stage:.6}},
{id:'maskspoke',file:'maskspoke',name:'mask_spoke',kind:'Luma mask',bpm:true,
 map:[['bass','Spoke width'],['mid','Rotation'],['high','Edge']],
 params:['Spokes','Rotation rate','Edge softness']}
];
var TRACKS=[
 {id:'house',label:'House',bpm:130,src:'../assets/audio/house130.mp3'},
 {id:'dnb',label:'DnB',bpm:174,src:'../assets/audio/dnb174.mp3'},
 {id:'techno',label:'Deep techno',bpm:126,src:'../assets/audio/deeptechno126.mp3'}
];

/* ---- signal engine: sim / track / mic -> bass, mid, high, beat pulse, and
   a running beat transport for the patches' "Transport Beat" inputs. */
var sig={bass:0,mid:0,high:0,beat:0};
var mode='sim',simBpm=124,actx=null,analyser=null,fdata=null,bins=null,micNode=null,curTrack=-1;
var lastBeat=0,ema=.2,beatPos=0,beatIvl=.48,lastT=0;
var pk=[.25,.25,.25];
function h1(n){var s=Math.sin(n*127.1)*43758.5453;return s-Math.floor(s)}
function simUpdate(t){
  var bps=simBpm/60,ph=(t*bps)%1,bar=Math.floor(t*bps);
  var acc=(bar%4===0)?1:.72;
  sig.bass=Math.min(1,Math.pow(1-ph,2.6)*(.5+.5*h1(bar))*acc+.06);
  sig.mid=Math.max(0,Math.min(1,.34+.24*Math.sin(t*1.3)+.16*Math.sin(t*4.7+1.2)+.1*(h1(Math.floor(t*2))-.5)));
  var ph8=(t*bps*2)%1,st8=Math.floor(t*bps*2);
  sig.high=Math.min(1,Math.pow(1-ph8,5)*(.25+.6*h1(st8*3+7)));
  sig.beat=Math.pow(1-ph,7);
}
function fftUpdate(now){
  analyser.getByteFrequencyData(fdata);
  function avg(a,b){var s=0;for(var i=a;i<=b;i++)s+=fdata[i];return s/((b-a+1)*255)}
  var raw=[avg(bins[0],bins[1]),avg(bins[2],bins[3]),avg(bins[4],bins[5])];
  for(var i=0;i<3;i++)pk[i]=Math.max(pk[i]*.9995,raw[i],.12);
  sig.bass=Math.min(1,raw[0]/pk[0]);sig.mid=Math.min(1,raw[1]/pk[1]);sig.high=Math.min(1,raw[2]/pk[2]);
  ema=ema*.96+raw[0]*.04;
  if(raw[0]>ema*1.45&&raw[0]>.18&&now-lastBeat>230){
    if(lastBeat)beatIvl=beatIvl*.7+Math.min(1.2,(now-lastBeat)/1000)*.3;
    sig.beat=1;lastBeat=now;
  }
  sig.beat*=.92;
}
function advanceTransport(t){
  var dt=Math.min(.1,t-lastT);lastT=t;
  beatPos+=mode==='mic'?dt/Math.max(.25,beatIvl):dt*(simBpm/60);
}
function curBpm(){return mode==='mic'?Math.round(60/Math.max(.25,beatIvl)):simBpm}
function ensureCtx(){
  if(actx)return;
  actx=new (window.AudioContext||window.webkitAudioContext)();
  analyser=actx.createAnalyser();analyser.fftSize=2048;analyser.smoothingTimeConstant=.72;
  fdata=new Uint8Array(analyser.frequencyBinCount);
  var hz=actx.sampleRate/2/analyser.frequencyBinCount;
  function bi(f){return Math.max(0,Math.min(analyser.frequencyBinCount-1,Math.round(f/hz)))}
  bins=[bi(25),bi(150),bi(151),bi(2000),bi(2001),bi(10000)];
}
var chip=document.getElementById('sigChip');
function setChip(cls,txt){chip.className='status '+cls;chip.innerHTML='<span class="dot"></span>'+txt}
function stopTrack(){
  if(curTrack>=0){var tr=TRACKS[curTrack];tr.el.pause();tr.node.disconnect();tr.btn.setAttribute('aria-pressed','false');curTrack=-1;}
}
function toSim(){stopTrack();if(micNode)micNode.disconnect();mode='sim';setChip('st-idle','Signal · Sim')}
function enableMic(){
  ensureCtx();actx.resume();
  var attach=function(){stopTrack();micNode.connect(analyser);mode='mic';setChip('st-live','Signal · Mic live')};
  if(micNode){attach();return;}
  navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false}})
    .then(function(stream){micNode=actx.createMediaStreamSource(stream);attach()})
    .catch(function(){setChip('st-idle','Mic blocked · Sim')});
}
function playTrack(i){
  var tr=TRACKS[i];
  if(curTrack===i){toSim();return;}
  ensureCtx();actx.resume();
  if(micNode)micNode.disconnect();
  stopTrack();
  if(!tr.el){
    tr.el=new Audio(tr.src);tr.el.loop=false;
    tr.node=actx.createMediaElementSource(tr.el);tr.node.connect(actx.destination);
    tr.el.addEventListener('ended',function(){if(curTrack===i)toSim()});
    tr.el.addEventListener('error',function(){tr.btn.classList.add('pend');tr.btn.querySelector('.bt').textContent='· clip missing';if(curTrack===i)toSim()});
  }
  tr.node.connect(analyser);
  tr.el.currentTime=0;tr.el.play();
  curTrack=i;mode='track';simBpm=tr.bpm;
  tr.btn.setAttribute('aria-pressed','true');
  setChip('st-live','Signal · '+tr.label+' '+tr.bpm);
}
var trackRow=document.getElementById('trackRow');
TRACKS.forEach(function(tr,i){
  var b=document.createElement('button');
  b.type='button';b.className='btn btn--ghost tbtn';b.setAttribute('aria-pressed','false');
  b.innerHTML='▶ '+tr.label+'<span class="bt">'+tr.bpm+' BPM</span>';
  b.addEventListener('click',function(){playTrack(i)});
  tr.btn=b;trackRow.appendChild(b);
});
document.getElementById('micBtn').addEventListener('click',enableMic);

/* ---- ISF loading: header JSON + body, shim prelude, uniform table */
function parseIsf(src){
  var m=src.match(/\/\*\s*(\{[\s\S]*?\})\s*\*\//);
  if(!m)throw new Error('no ISF header');
  var head=JSON.parse(m[1]);
  var body=src.slice(src.indexOf(m[0])+m[0].length);
  var persistent=(head.PASSES||[]).some(function(p){return p&&p.PERSISTENT});
  return {inputs:head.INPUTS||[],persistent:persistent,body:body};
}
function glslDecl(inp){
  var t=inp.TYPE;
  if(t==='float')return 'uniform float '+inp.NAME+';';
  if(t==='long')return 'uniform int '+inp.NAME+';';
  if(t==='bool')return 'uniform bool '+inp.NAME+';';
  if(t==='color')return 'uniform vec4 '+inp.NAME+';';
  if(t==='point2D')return 'uniform vec2 '+inp.NAME+';';
  return '';
}
function prelude(isf){
  return 'precision highp float;\n'
    +'uniform vec2 u_res;uniform float u_time;uniform int u_pass;\n'
    +'#define RENDERSIZE u_res\n#define TIME u_time\n#define PASSINDEX u_pass\n'
    +'#define isf_FragNormCoord (gl_FragCoord.xy/u_res)\n'
    +(isf.persistent?'uniform sampler2D bufA;\n':'')
    +'#define IMG_NORM_PIXEL(img,c) texture2D(img,c)\n'
    +'#define IMG_PIXEL(img,c) texture2D(img,(c)/u_res)\n'
    +isf.inputs.map(glslDecl).join('\n')+'\n';
}
/* value a given input should carry this frame; a band binding beats the knob,
   the knob beats the preset */
function bandValue(inp,band){
  var mn=inp.MIN!==undefined?inp.MIN:0,mx=inp.MAX!==undefined?inp.MAX:1;
  return mn+(sig[band]||0)*(mx-mn);
}
function inputValue(sh,inp){
  var n=inp.NAME,base=inp.DEFAULT;
  if(sh.set&&sh.set.hasOwnProperty(n))base=sh.set[n];
  if(sh.user&&sh.user.hasOwnProperty(n))base=sh.user[n];
  if(sh.bind&&sh.bind[n])base=bandValue(inp,sh.bind[n]);
  if(sh.mods&&sh.mods[n])return sh.mods[n](sig,base);
  var l=(inp.LABEL||'');
  if(n==='bass'||n==='Audio_Low')return sig.bass;
  if(n==='mid'||n==='Audio_Mid')return sig.mid;
  if(n==='high'||n==='Audio_High')return sig.high;
  if(n==='Audio_Level')return (sig.bass+sig.mid+sig.high)/3;
  if(n==='Beat_Pulse')return sig.beat;
  if(n==='beat')return /transport/i.test(l)?beatPos:sig.beat;
  if(n==='Beat_Transport')return beatPos;
  if(n==='bpm')return curBpm();
  return base;
}

/* ---- WebGL: single context, per-shader programs, ping-pong feedback */
var canvas=document.getElementById('dCv');
var gl=canvas.getContext('webgl',{antialias:false,alpha:false});
var halfExt=gl&&gl.getExtension('OES_texture_half_float');
if(gl&&halfExt)gl.getExtension('OES_texture_half_float_linear');
var vs=null,progs={},bufs={},loads={};
if(gl){
  vs=gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs,'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}');gl.compileShader(vs);
  var qb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,qb);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
}
function loadShader(sh){
  if(loads[sh.id])return loads[sh.id];
  return loads[sh.id]=fetch('isf/'+sh.file+'.fs').then(function(r){
    if(!r.ok)throw new Error('HTTP '+r.status);
    return r.text();
  }).then(function(src){
    var isf=parseIsf(src);
    var fs=gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs,prelude(isf)+isf.body);gl.compileShader(fs);
    if(!gl.getShaderParameter(fs,gl.COMPILE_STATUS)){
      throw new Error(sh.id+' compile: '+gl.getShaderInfoLog(fs));
    }
    var p=gl.createProgram();gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(sh.id+' link: '+gl.getProgramInfoLog(p));
    var loc=gl.getAttribLocation(p,'p');
    var u={};['u_res','u_time','u_pass','bufA'].forEach(function(n){u[n]=gl.getUniformLocation(p,n)});
    isf.inputs.forEach(function(inp){inp.loc=gl.getUniformLocation(p,inp.NAME)});
    return progs[sh.id]={p:p,loc:loc,u:u,isf:isf};
  }).catch(function(e){
    console.error('[shaders]',e.message||e);
    var row=dList.children[S.indexOf(sh)];if(row)row.classList.add('pend');
    return null;
  });
}
function mkTex(w,h){
  var t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  var type=halfExt?halfExt.HALF_FLOAT_OES:gl.UNSIGNED_BYTE;
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,type,null);
  var f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);
  if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE&&type!==gl.UNSIGNED_BYTE){
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  return {t:t,f:f};
}
function feedbackFor(id,w,h){
  var b=bufs[id];
  if(b&&b.w===w&&b.h===h)return b;
  if(b){[b.a,b.b].forEach(function(x){gl.deleteTexture(x.t);gl.deleteFramebuffer(x.f)});}
  return bufs[id]={w:w,h:h,a:mkTex(w,h),b:mkTex(w,h),flip:false};
}
function setUniforms(pr,t,pass){
  gl.uniform2f(pr.u.u_res,canvas.width,canvas.height);
  gl.uniform1f(pr.u.u_time,t);
  if(pr.u.u_pass)gl.uniform1i(pr.u.u_pass,pass);
  pr.isf.inputs.forEach(function(inp){
    if(!inp.loc)return;
    var v=inputValue(curShader,inp);
    if(inp.TYPE==='float')gl.uniform1f(inp.loc,v);
    else if(inp.TYPE==='long')gl.uniform1i(inp.loc,v|0);
    else if(inp.TYPE==='bool')gl.uniform1i(inp.loc,v?1:0);
    else if(inp.TYPE==='color')gl.uniform4f(inp.loc,v[0],v[1],v[2],v[3]===undefined?1:v[3]);
    else if(inp.TYPE==='point2D')gl.uniform2f(inp.loc,v[0],v[1]);
  });
}
function draw(t){
  var pr=progs[curShader.id];if(!pr)return;
  var dpr=Math.min(window.devicePixelRatio||1,1.5);
  var w=Math.round(canvas.clientWidth*dpr),h=Math.round(canvas.clientHeight*dpr);
  if(!w||!h)return;
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  gl.useProgram(pr.p);
  gl.enableVertexAttribArray(pr.loc);gl.vertexAttribPointer(pr.loc,2,gl.FLOAT,false,0,0);
  if(pr.isf.persistent){
    var fb=feedbackFor(curShader.id,w,h);
    var read=fb.flip?fb.a:fb.b,write=fb.flip?fb.b:fb.a;
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,read.t);
    if(pr.u.bufA)gl.uniform1i(pr.u.bufA,0);
    gl.bindFramebuffer(gl.FRAMEBUFFER,write.f);
    gl.viewport(0,0,w,h);setUniforms(pr,t,0);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gl.bindTexture(gl.TEXTURE_2D,write.t);
    gl.viewport(0,0,w,h);setUniforms(pr,t,1);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    fb.flip=!fb.flip;
  }else{
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gl.viewport(0,0,w,h);setUniforms(pr,t,0);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  }
}

/* ---- deck UI */
var BAND={bass:'B',mid:'M',high:'H',beat:'BT'};
function nn(i){return String(i+1).padStart(2,'0')}
function mapRows(sh){return sh.map.map(function(r){return '<span class="map"><span class="bd">'+BAND[r[0]]+'</span><span class="bar"><b data-band="'+r[0]+'"></b></span><span>→ '+r[1]+'</span></span>'}).join('')}
function specLine(sh){return '<span class="spec">'+(sh.nodes?'Wire patch · <em>'+sh.nodes+' nodes</em> · ':'')+'<em>1920×1080</em> · <em>Wire · ISF</em>'+(sh.bpm?' · <em>BPM sync</em>':'')+'</span>'}
/* knobs - built from the shader's own ISF header (real ranges, real labels).
   Audio-driven inputs stay off the panel: the FFT owns them. */
var AUDIO_IN=/^(bass|mid|high|beat|bpm|Audio_|Beat_)/;
function knobBase(sh,inp){
  if(sh.user&&sh.user.hasOwnProperty(inp.NAME))return sh.user[inp.NAME];
  if(sh.set&&sh.set.hasOwnProperty(inp.NAME))return sh.set[inp.NAME];
  return inp.DEFAULT;
}
function fmtV(v){return (Math.round(v*100)/100).toString()}
var boundKnobs=[];
function buildKnobs(sh,isf){
  var host=document.getElementById('dKnobs');
  host.innerHTML='';boundKnobs=[];
  sh.user=sh.user||{};sh.bind=sh.bind||{};
  isf.inputs.forEach(function(inp){
    if(AUDIO_IN.test(inp.NAME))return;
    if(inp.TYPE!=='float'&&inp.TYPE!=='long')return;
    var row=document.createElement('div');row.className='knob';
    var label=(inp.LABEL||inp.NAME).replace(/\s*\(.*\)$/,'');
    if(inp.TYPE==='long'&&inp.VALUES){
      var sel=document.createElement('select');
      inp.VALUES.forEach(function(v,k){
        var o=document.createElement('option');o.value=v;o.textContent=(inp.LABELS&&inp.LABELS[k])||v;sel.appendChild(o);
      });
      sel.value=knobBase(sh,inp);
      sel.addEventListener('change',function(){sh.user[inp.NAME]=+sel.value});
      row.innerHTML='<span class="kl">'+label+'</span>';
      row.appendChild(sel);
    }else{
      var min=inp.MIN!==undefined?inp.MIN:0,max=inp.MAX!==undefined?inp.MAX:1;
      var r=document.createElement('input');r.type='range';
      r.min=min;r.max=max;r.step=(max-min)/200;
      r.value=sh.bind[inp.NAME]?bandValue(inp,sh.bind[inp.NAME]):knobBase(sh,inp);
      r.disabled=!!sh.bind[inp.NAME];
      var kv=document.createElement('span');kv.className='kv';kv.textContent=fmtV(+r.value);
      r.addEventListener('input',function(){sh.user[inp.NAME]=+r.value;kv.textContent=fmtV(+r.value)});
      // B/M/H: hand the parameter to an FFT band; click again to take it back
      var kb=document.createElement('span');kb.className='kb';
      ['bass','mid','high'].forEach(function(band){
        var bb=document.createElement('button');bb.type='button';bb.className='kbb';
        bb.textContent=band.charAt(0).toUpperCase();
        bb.title='Drive '+label+' from the '+band+' band';
        bb.setAttribute('aria-pressed',String(sh.bind[inp.NAME]===band));
        bb.addEventListener('click',function(){
          if(sh.bind[inp.NAME]===band)delete sh.bind[inp.NAME];
          else sh.bind[inp.NAME]=band;
          r.disabled=!!sh.bind[inp.NAME];
          if(!sh.bind[inp.NAME]){r.value=knobBase(sh,inp);kv.textContent=fmtV(+r.value)}
          var sibs=kb.children;
          for(var q=0;q<sibs.length;q++)sibs[q].setAttribute('aria-pressed',String(sh.bind[inp.NAME]===['bass','mid','high'][q]));
        });
        kb.appendChild(bb);
      });
      var top=document.createElement('span');top.className='kl';
      var lt=document.createElement('span');lt.textContent=label;
      var right=document.createElement('span');right.className='kr';
      right.appendChild(kb);right.appendChild(kv);
      top.appendChild(lt);top.appendChild(right);
      row.appendChild(top);row.appendChild(r);
      boundKnobs.push({sh:sh,inp:inp,r:r,kv:kv});
    }
    host.appendChild(row);
  });
  var reset=document.createElement('button');
  reset.type='button';reset.className='btn btn--ghost kreset';reset.textContent='Reset';
  reset.addEventListener('click',function(){sh.user={};sh.bind={};buildKnobs(sh,isf)});
  host.appendChild(reset);
}
var dList=document.getElementById('dList');
S.forEach(function(sh,i){
  var b=document.createElement('button');b.className='chr';b.type='button';
  b.innerHTML='<span class="cn">'+nn(i)+'</span><span><span class="ct">'+sh.name+'</span><span class="ck">'+(sh.kind||'Generative')+(sh.bpm?' · BPM':'')+'</span></span><span class="bar"><b data-ch="'+i+'"></b></span>';
  b.addEventListener('click',function(){selectDeck(i)});
  dList.appendChild(b);
});
var curShader=S[0],meterEls=[];
function selectDeck(i){
  curShader=S[i];
  document.getElementById('dIdx').textContent=nn(i);
  document.getElementById('dName').textContent=curShader.name;
  document.getElementById('dSpec').innerHTML=specLine(curShader);
  document.getElementById('dMaps').innerHTML=mapRows(curShader);
  var rows=dList.querySelectorAll('.chr');
  for(var j=0;j<rows.length;j++){if(j===i)rows[j].setAttribute('aria-current','true');else rows[j].removeAttribute('aria-current')}
  meterEls=[].slice.call(document.querySelectorAll('.map .bar b')).concat(
           [].slice.call(document.querySelectorAll('#mmaster b')),
           [].slice.call(document.querySelectorAll('.chr .bar b')));
  var sh=curShader;
  loadShader(sh).then(function(pr){if(pr&&curShader===sh)buildKnobs(sh,pr.isf)});
}
selectDeck(0);

/* ---- loop: always running, paused only while off-viewport */
var visible=true,t0=performance.now(),rafId=0;
function schedule(){if(!rafId)rafId=requestAnimationFrame(frame)}
if('IntersectionObserver'in window){
  new IntersectionObserver(function(es){
    visible=es[0].isIntersecting;
    if(visible)schedule();
  },{threshold:.05}).observe(deckRoot);
}
function frame(now){
  rafId=0;
  if(!visible)return;
  var t=(now-t0)/1000;
  if((mode==='mic'||mode==='track')&&analyser)fftUpdate(now);else simUpdate(t);
  advanceTransport(t);
  if(gl)draw(t);
  for(var i=0;i<meterEls.length;i++){
    var el=meterEls[i];
    if(el.offsetParent===null)continue;
    var band=el.dataset.band;
    if(band){
      var master=!!el.parentNode&&el.parentNode.parentNode&&el.parentNode.parentNode.id==='mmaster';
      var v=Math.max(master?.06:.03,sig[band]||0).toFixed(3);
      el.style.transform=master?('scaleY('+v+')'):('scaleX('+v+')');
    }else if(el.dataset.ch!==undefined){
      var sh=S[+el.dataset.ch],s=0,n=0;
      for(var k=0;k<sh.map.length;k++){var b2=sh.map[k][0];if(sig[b2]!==undefined){s+=sig[b2];n++}}
      el.style.transform='scaleX('+Math.max(.03,n?s/n:0).toFixed(3)+')';
    }
  }
  // band-bound knobs ride their band live
  for(var bi2=0;bi2<boundKnobs.length;bi2++){
    var bk=boundKnobs[bi2];
    if(bk.sh!==curShader)continue;
    var bband=bk.sh.bind[bk.inp.NAME];
    if(!bband)continue;
    var bv=bandValue(bk.inp,bband);
    bk.r.value=bv;bk.kv.textContent=fmtV(bv);
  }
  schedule();
}
// fullscreen toggle on the monitor
var fsBtn=document.getElementById('shFs'),cvWrap=canvas.parentNode;
if(fsBtn){
  fsBtn.addEventListener('click',function(){
    if(document.fullscreenElement||document.webkitFullscreenElement){
      (document.exitFullscreen||document.webkitExitFullscreen).call(document);
    }else{
      var req=cvWrap.requestFullscreen||cvWrap.webkitRequestFullscreen;
      if(req)req.call(cvWrap);
    }
  });
  document.addEventListener('fullscreenchange',function(){
    fsBtn.textContent=document.fullscreenElement?'✕ Exit':'⛶ Fullscreen';
  });
}
// forced single frame regardless of visibility - console/testing hook
window.__shFrame=function(){var v=visible;visible=true;frame(performance.now());visible=v};
if(!gl){
  document.getElementById('dName').textContent='WebGL unavailable';
}else{
  schedule();
}
})();
