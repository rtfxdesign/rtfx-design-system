(function(){
var rm=window.matchMedia('(prefers-reduced-motion: reduce)');
// ambient video loops: autoplay in view unless reduced motion; button always works
var vids=Array.prototype.slice.call(document.querySelectorAll('.vid video'));
function btnOf(v){var f=v.closest('.vid');return f?f.querySelector('.vplay'):null}
function setBtn(v,playing){var b=btnOf(v);if(b){b.textContent=playing?'❚❚ Pause':'▶ Play clip';b.setAttribute('aria-pressed',String(playing))}}
// data-sound (art-page loops with audio) opts a clip out of the blanket mute;
// playback is still click-to-play, so sound only ever starts from a gesture.
vids.forEach(function(v){v.muted=!v.dataset.sound;v.loop=true;v.setAttribute('playsinline','');
// only one audible clip at a time - starting a sound loop pauses the others
if(v.dataset.sound)v.addEventListener('play',function(){vids.forEach(function(o){if(o!==v&&o.dataset.sound&&!o.paused){o.pause();o.dataset.user='0';setBtn(o,false)}})});
function pend(){var b=btnOf(v);if(b){b.textContent='Media pending';b.disabled=true}}v.addEventListener('error',pend,true);if(v.error||v.networkState===3)pend();
var b=btnOf(v);if(b)b.addEventListener('click',function(){if(v.paused){v.dataset.user='1';v.play().then(function(){setBtn(v,true)}).catch(function(){})}else{v.pause();v.dataset.user='0';setBtn(v,false)}});});
// autoplay is reserved for the scene-setting hero clip on a case page.
// Everything else - gallery grid, documentation sections - waits for a click:
// with dozens of clips per page, scroll-autoplay was streaming hundreds of MB
// to anyone who merely browsed past.
document.querySelectorAll('.hero-media video').forEach(function(v){v.dataset.auto='1'});
if('IntersectionObserver'in window){var io=new IntersectionObserver(function(es){es.forEach(function(e){var v=e.target;if(v.dataset.user)return;if(e.isIntersecting&&!rm.matches){if(v.dataset.auto)v.play().then(function(){setBtn(v,true)}).catch(function(){})}else{if(!v.paused){v.pause();setBtn(v,false)}}})},{threshold:.35});
vids.forEach(function(v){io.observe(v)});}
// gallery scroll nav
document.querySelectorAll('.gal').forEach(function(g){var t=g.querySelector('.track');if(!t)return;
g.querySelectorAll('[data-go]').forEach(function(b){b.addEventListener('click',function(){var f=t.querySelector('figure');var dx=(f?f.getBoundingClientRect().width:400)+12;t.scrollBy({left:b.dataset.go==='n'?dx:-dx,behavior:rm.matches?'auto':'smooth'})})})});
// archive filters
var chips=document.querySelectorAll('.chip[data-f]');
chips.forEach(function(c){c.addEventListener('click',function(){chips.forEach(function(x){x.setAttribute('aria-pressed',String(x===c))});var f=c.dataset.f;
document.querySelectorAll('.ai[data-cat]').forEach(function(it){it.hidden=(f!=='all'&&it.dataset.cat!==f)})})});
// random pools: show 6 of N
document.querySelectorAll('[data-pool]').forEach(function(w){var items=Array.prototype.slice.call(w.querySelectorAll('[data-p]'));if(items.length<=6)return;var idx=items.map(function(_,i){return i});for(var i=idx.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=idx[i];idx[i]=idx[j];idx[j]=t}var show=idx.slice(0,6);items.forEach(function(el,i){el.hidden=show.indexOf(i)<0})});
// X-Route: logo-derived signal paths for selected project cards
var signalMarkup='<span class="signal-layer" aria-hidden="true"><svg viewBox="0 0 100 62.5" preserveAspectRatio="none"><path class="signal-trace" pathLength="1" d="M-4 9H17L31 23H45L62 43H80L104 59"/><path class="signal-trace" pathLength="1" d="M104 7H84L64 27H54L38 48H21L11 57H-4"/><path class="signal-trace" pathLength="1" d="M0 33H21L29 41H38"/><path class="signal-trace" pathLength="1" d="M100 35H82L74 27H64"/><path class="signal-mark" pathLength="1" d="M35 14L63 48H78"/><path class="signal-mark" pathLength="1" d="M66 14L38 48H23"/><circle class="signal-node" style="--signal-delay:180ms" cx="17" cy="9" r="1.15"/><circle class="signal-node" style="--signal-delay:240ms" cx="31" cy="23" r="1.15"/><circle class="signal-node" style="--signal-delay:300ms" cx="62" cy="43" r="1.15"/><circle class="signal-node" style="--signal-delay:210ms" cx="84" cy="7" r="1.15"/><circle class="signal-node" style="--signal-delay:280ms" cx="64" cy="27" r="1.15"/><circle class="signal-node" style="--signal-delay:340ms" cx="38" cy="48" r="1.15"/></svg></span><span class="signal-scan" aria-hidden="true"></span>';
function xrCorner(el,e){var r=el.getBoundingClientRect();var h=e.clientX<r.left+r.width/2?"l":"r";var v=e.clientY<r.top+r.height/2?"t":"b";el.dataset.signalCorner=h+v}
document.querySelectorAll(".grid-work .work").forEach(function(card){var thumb=card.querySelector(".thumb");if(!thumb)return;thumb.insertAdjacentHTML("beforeend",signalMarkup);card.addEventListener("pointerenter",function(e){xrCorner(card,e)})});
// gallery frames and home teasers get the same effect, armed on first hover -
// injecting the SVG into hundreds of figures upfront would bloat the DOM for
// figures most visitors never touch.
[[".arch .ai",".ph"],[".teaser [data-p]",".ph"]].forEach(function(pair){
document.querySelectorAll(pair[0]).forEach(function(host){
host.addEventListener("pointerenter",function(e){
var t=host.querySelector(pair[1]);
if(t&&!t.querySelector(".signal-layer"))t.insertAdjacentHTML("beforeend",signalMarkup);
xrCorner(host,e);
});
});
});
})();
// lightbox — work and gallery pages. Click a figure image to view it full size.
// Videos join the same sequence: the muted inline loop is a preview, the
// viewer is where a clip plays at size with native controls (and sound).
(function(){
if(!/\/(work|gallery|revd-show-control)\//.test(location.pathname))return;
var items=[].slice.call(document.querySelectorAll('main figure img, main figure video')).filter(function(el){return !el.closest('a')});
if(!items.length)return;
function isVid(el){return el.tagName==='VIDEO'}
// a thumbnail stands in for a full-resolution original; open the original.
function fullSrc(im){return (im.currentSrc||im.src).replace(/\/thumbs\//,'/')}
function frameOf(im){var f=im.closest('figure');return f&&f.dataset.frame||''}
function capOf(im){var f=im.closest('figure'),c=f&&f.querySelector('figcaption');return (c?c.textContent:'').trim()||im.alt||im.getAttribute('aria-label')||''}
// gallery frames carry records in frames.json/events.json (deployed beside the
// page); the viewer shows what is known - event, date, location, subject.
var META=null;
if(/\/gallery\//.test(location.pathname)){
Promise.all([fetch('frames.json').then(function(r){return r.json()}),fetch('events.json').then(function(r){return r.json()})])
.then(function(a){META={frames:a[0].frames,events:a[1].events};refreshMeta()}).catch(function(){});
}
function metaLine(fr){
if(!META||!fr)return'';
var r=META.frames[fr];if(!r)return'';
var ev=r.event&&META.events[r.event];
var bits=[];
if(ev&&ev.name)bits.push(ev.name);
// month and year only, in the site's date register (2025.05) - the day is
// recorded in frames.json but is more precision than a caption needs.
var d=r.date||(ev&&ev.date);
if(d){var p=String(d).split('-');bits.push(p.length>1?p[0]+'.'+p[1]:p[0]);}
var loc=r.location||(ev&&ev.location);if(loc)bits.push(loc);
if(r.subject)bits.push(r.subject);
return bits.join(' · ');
}
var dlg=document.createElement('dialog');dlg.className='lb';dlg.setAttribute('aria-label','Image viewer');
dlg.innerHTML='<div class="lb-in">'
+'<div class="lb-bar"><span class="lb-count"></span><button type="button" class="lb-x">Close ✗</button></div>'
+'<div class="lb-stage"><button type="button" class="lb-nav lb-prev" aria-label="Previous image">←</button>'
+'<img alt=""><video controls loop muted playsinline hidden></video><button type="button" class="lb-nav lb-next" aria-label="Next image">→</button></div>'
+'<figcaption class="lb-cap"><span class="t"></span><span class="m"></span></figcaption></div>';
document.body.appendChild(dlg);
var stage=dlg.querySelector('.lb-stage img'),stageV=dlg.querySelector('.lb-stage video'),count=dlg.querySelector('.lb-count'),
capT=dlg.querySelector('.lb-cap .t'),capM=dlg.querySelector('.lb-cap .m'),
prev=dlg.querySelector('.lb-prev'),next=dlg.querySelector('.lb-next');
var i=0,last=null;
function pad(n){return (n<10?'0':'')+n}
function show(n){
i=(n+items.length)%items.length;var im=items[i];
capM.textContent='';
if(isVid(im)){
// hand the stream to the viewer copy — pause the inline loop through its
// button so its label and user-intent state stay truthful.
if(!im.paused){var f=im.closest('.vid'),b=f&&f.querySelector('.vplay');if(b)b.click();else im.pause()}
stage.hidden=true;stage.removeAttribute('src');
stageV.hidden=false;stageV.poster=im.poster||'';stageV.src=im.currentSrc||im.src;
stageV.play().catch(function(){});
}else{
stageV.hidden=true;stageV.pause();stageV.removeAttribute('src');stageV.load();
stage.hidden=false;
stage.src=fullSrc(im);stage.alt=im.alt||'';
}
// where a frame has an accession number that number is its identity, and a
// position counter beside it would just be a second, conflicting number.
var fr=frameOf(im);
if(fr){count.innerHTML='Frame <b>'+fr+'</b>';capT.textContent=metaLine(fr)}
else{count.innerHTML='<b>'+pad(i+1)+'</b> / '+pad(items.length);capT.textContent=capOf(im)}
var one=items.length<2;prev.disabled=one;next.disabled=one;
syncHash(im);
// preload neighbours — images only; prefetching a neighbouring mp4 would
// spend the bandwidth the click-to-play policy exists to protect.
[1,-1].forEach(function(d){var nb=items[(i+d+items.length)%items.length];if(!isVid(nb)){var p=new Image();p.src=fullSrc(nb)}});
}
// report the size of what is actually on screen, not of the page thumbnail
stage.addEventListener('load',function(){capM.textContent=stage.naturalWidth?stage.naturalWidth+' × '+stage.naturalHeight:''});
stageV.addEventListener('loadedmetadata',function(){capM.textContent=stageV.videoWidth?stageV.videoWidth+' × '+stageV.videoHeight:''});
// keep the address bar on the frame being viewed, so it can be linked to.
// replaceState, not a hash assignment - stepping through 254 frames must not
// fill the back button with 254 entries.
function syncHash(im){
if(!history.replaceState)return;
var f=im?frameOf(im):'';
var base=location.pathname+location.search;
history.replaceState(null,'',f?base+'#f'+f:base);
}
function open(n){last=document.activeElement;show(n);if(!dlg.open)dlg.showModal()}
// metadata may arrive after a frame is already open
function refreshMeta(){if(dlg.open){var im=items[i],fr=frameOf(im);if(fr)capT.textContent=metaLine(fr)}}
// not every engine fires dialog's close event, so tear down from close() as well.
function cleanup(){stage.removeAttribute('src');stageV.pause();stageV.removeAttribute('src');stageV.load();capM.textContent='';syncHash(null);if(last&&last.focus)last.focus()}
function close(){if(dlg.open){dlg.close();cleanup()}}
items.forEach(function(im,n){
im.classList.add('lb-open');im.setAttribute('role','button');im.setAttribute('tabindex','0');
if(!im.getAttribute('aria-label'))im.setAttribute('aria-label','View "'+(im.alt||'image')+'" full size');
im.addEventListener('click',function(){if(isVid(im)&&im.error)return;open(n)});
im.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();open(n)}});
});
prev.addEventListener('click',function(){show(i-1)});
next.addEventListener('click',function(){show(i+1)});
dlg.querySelector('.lb-x').addEventListener('click',close);
dlg.addEventListener('click',function(e){if(e.target===dlg)close()}); // backdrop
dlg.addEventListener('keydown',function(e){
if(e.target===stageV)return; // native controls own the keys while focused (seek, volume)
if(e.key==='ArrowLeft'){e.preventDefault();show(i-1)}
else if(e.key==='ArrowRight'){e.preventDefault();show(i+1)}
});
dlg.addEventListener('close',cleanup); // covers Escape, which closes natively
// a frame number is an address: /gallery/#f147 lands on that frame, open.
// the figure carries the same id, so the page scrolls there behind the viewer.
(function(){
var m=/^#f(\d+)$/.exec(location.hash);if(!m)return;
for(var k=0;k<items.length;k++){if(frameOf(items[k])===m[1]){open(k);return}}
})();
})();
// gallery filters — two facets, Event and Subject, combined with AND.
// A frame with no value for a facet only shows under that facet's "All".
(function(){
var wrap=document.querySelector('.filters');if(!wrap)return;
var state={event:'all',subject:'all'};
var figs=[].slice.call(document.querySelectorAll('.ai[data-frame]'));
var count=document.getElementById('filter-count');
function apply(){
var shown=0;
figs.forEach(function(f){
var okE=state.event==='all'||f.dataset.event===state.event;
var okS=state.subject==='all'||f.dataset.subject===state.subject;
f.hidden=!(okE&&okS);if(okE&&okS)shown++;
});
if(count)count.textContent=(state.event==='all'&&state.subject==='all')?'':shown+' of '+figs.length+' frames';
}
wrap.addEventListener('click',function(e){
var c=e.target.closest('.chip');if(!c||!c.dataset.facet)return;
state[c.dataset.facet]=c.dataset.v;
[].forEach.call(wrap.querySelectorAll('.chip[data-facet="'+c.dataset.facet+'"]'),function(x){
x.setAttribute('aria-pressed',String(x===c));
});
apply();
});
})();
