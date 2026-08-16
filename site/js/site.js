(function(){
var rm=window.matchMedia('(prefers-reduced-motion: reduce)');
// ambient video loops: autoplay in view unless reduced motion; button always works
var vids=Array.prototype.slice.call(document.querySelectorAll('.vid video'));
function btnOf(v){var f=v.closest('.vid');return f?f.querySelector('.vplay'):null}
function setBtn(v,playing){var b=btnOf(v);if(b){b.textContent=playing?'❚❚ Pause':'▶ Play clip';b.setAttribute('aria-pressed',String(playing))}}
vids.forEach(function(v){v.muted=true;v.loop=true;v.setAttribute('playsinline','');
function pend(){var b=btnOf(v);if(b){b.textContent='Media pending';b.disabled=true}}v.addEventListener('error',pend,true);if(v.error||v.networkState===3)pend();
var b=btnOf(v);if(b)b.addEventListener('click',function(){if(v.paused){v.dataset.user='1';v.play().then(function(){setBtn(v,true)}).catch(function(){})}else{v.pause();v.dataset.user='0';setBtn(v,false)}});});
if('IntersectionObserver'in window){var io=new IntersectionObserver(function(es){es.forEach(function(e){var v=e.target;if(v.dataset.user)return;if(e.isIntersecting&&!rm.matches){v.play().then(function(){setBtn(v,true)}).catch(function(){})}else{if(!v.paused){v.pause();setBtn(v,false)}}})},{threshold:.35});
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
})();
