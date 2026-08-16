/* @ds-bundle: {"format":4,"namespace":"RTFXDesignSystem_ceb80c","components":[{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Status","sourcePath":"components/core/Status.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"TickRule","sourcePath":"components/core/TickRule.jsx"},{"name":"SiteFooter","sourcePath":"components/site/SiteFooter.jsx"},{"name":"Topbar","sourcePath":"components/site/Topbar.jsx"},{"name":"Panel","sourcePath":"components/surfaces/Panel.jsx"},{"name":"SectionHead","sourcePath":"components/surfaces/SectionHead.jsx"},{"name":"SpecHeader","sourcePath":"components/surfaces/SpecHeader.jsx"},{"name":"WorkCard","sourcePath":"components/surfaces/WorkCard.jsx"},{"name":"CaseStudy","sourcePath":"ui_kits/website/CaseStudy.jsx"},{"name":"Contact","sourcePath":"ui_kits/website/Contact.jsx"},{"name":"Home","sourcePath":"ui_kits/website/Home.jsx"}],"sourceHashes":{"components/core/Button.jsx":"aeab18981d4c","components/core/Status.jsx":"3047d941805a","components/core/Tag.jsx":"11b5b9f98d70","components/core/TickRule.jsx":"a44fbe096fae","components/site/SiteFooter.jsx":"bd06ff9bb743","components/site/Topbar.jsx":"3d0cf8e7d165","components/surfaces/Panel.jsx":"1d88b0895cec","components/surfaces/SectionHead.jsx":"d25f6e702966","components/surfaces/SpecHeader.jsx":"0f8ad421a914","components/surfaces/WorkCard.jsx":"0566e74c8877","site/js/field.js":"18d45eba8a53","site/js/site.js":"9da14f12c810","ui_kits/website/CaseStudy.jsx":"2055514722df","ui_kits/website/Contact.jsx":"9e9a53010ef2","ui_kits/website/Home.jsx":"a0d1f48dd30b"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.RTFXDesignSystem_ceb80c = window.RTFXDesignSystem_ceb80c || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Button.jsx
try { (() => {
function Button({
  variant = 'outline',
  arrow = false,
  disabled = false,
  href,
  onClick,
  style,
  children
}) {
  const cls = 'btn' + (variant === 'fill' ? ' btn--fill' : variant === 'ghost' ? ' btn--ghost' : '');
  if (href && !disabled) return /*#__PURE__*/React.createElement("a", {
    href: href,
    onClick: onClick,
    className: cls,
    style: style
  }, children, arrow && /*#__PURE__*/React.createElement("span", null, "\u2192"));
  return /*#__PURE__*/React.createElement("button", {
    className: cls,
    style: style,
    onClick: onClick,
    disabled: disabled || undefined
  }, children, arrow && /*#__PURE__*/React.createElement("span", null, "\u2192"));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Status.jsx
try { (() => {
function Status({
  state = 'idle',
  style,
  children
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: `status st-${state}`,
    style: style
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), children);
}
Object.assign(__ds_scope, { Status });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Status.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function Tag({
  accent = false,
  style,
  children
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: accent ? 'tag tag--accent' : 'tag',
    style: style
  }, children);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/core/TickRule.jsx
try { (() => {
function TickRule({
  vertical = false,
  dim = false,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: vertical ? 'tickrule tickrule--v' : 'tickrule',
    style: dim ? {
      opacity: .5,
      ...style
    } : style
  });
}
Object.assign(__ds_scope, { TickRule });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/TickRule.jsx", error: String((e && e.message) || e) }); }

// components/site/SiteFooter.jsx
try { (() => {
function SiteFooter({
  note = 'RTFX Design LLC · rtfx.space',
  motto = 'Manu et machina',
  style
}) {
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      padding: 'var(--s-8) 0 var(--s-7)',
      color: 'var(--c-ink-3)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tickrule",
    style: {
      marginBottom: 'var(--s-5)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "micro"
  }, note), motto && /*#__PURE__*/React.createElement("span", {
    className: "label",
    style: {
      color: 'var(--c-accent)',
      marginTop: 'var(--s-2)',
      display: 'block'
    }
  }, motto)));
}
Object.assign(__ds_scope, { SiteFooter });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/site/SiteFooter.jsx", error: String((e && e.message) || e) }); }

// components/site/Topbar.jsx
try { (() => {
function Topbar({
  mark = 'RTFX',
  suffix,
  logoSrc,
  links = [],
  right,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "topbar",
    style: style
  }, /*#__PURE__*/React.createElement("div", {
    className: "topbar-in"
  }, logoSrc ? /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      display: 'block',
      lineHeight: 0
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: logoSrc,
    alt: "rtfx",
    style: {
      width: 120,
      height: 'auto',
      display: 'block'
    }
  })) : /*#__PURE__*/React.createElement("span", {
    className: "tb-mark"
  }, mark, suffix && /*#__PURE__*/React.createElement("em", null, suffix)), links.length > 0 && /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      gap: 'var(--s-5)'
    }
  }, links.map((l, i) => /*#__PURE__*/React.createElement("a", {
    key: i,
    href: l.href || '#',
    onClick: l.onClick,
    className: "micro",
    style: {
      color: l.active ? 'var(--c-accent)' : 'var(--c-ink-2)',
      textDecoration: 'none'
    }
  }, l.label))), right && /*#__PURE__*/React.createElement("span", {
    className: "tb-lock"
  }, right)));
}
Object.assign(__ds_scope, { Topbar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/site/Topbar.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/Panel.jsx
try { (() => {
function Panel({
  inline = 'none',
  small = false,
  padding = 'var(--s-5)',
  style,
  innerStyle,
  children
}) {
  const cls = small ? 'chamfer-sm' : 'chamfer';
  const inl = inline === 'static' ? ' inline-fx inline-static' : inline === 'hover' ? ' inline-fx' : '';
  return /*#__PURE__*/React.createElement("div", {
    className: `cham-box ${cls}`,
    style: style
  }, /*#__PURE__*/React.createElement("div", {
    className: `in ${cls}${inl}`,
    style: {
      padding,
      ...innerStyle
    }
  }, children));
}
Object.assign(__ds_scope, { Panel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/Panel.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/SectionHead.jsx
try { (() => {
function SectionHead({
  num,
  title,
  note,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "sec-head",
    style: style
  }, /*#__PURE__*/React.createElement("span", {
    className: "sec-num"
  }, num), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "display-m"
  }, title), note && /*#__PURE__*/React.createElement("p", {
    className: "sec-note"
  }, note)));
}
Object.assign(__ds_scope, { SectionHead });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/SectionHead.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/SpecHeader.jsx
try { (() => {
function SpecHeader({
  items = [],
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "csh-grid",
    style: style
  }, items.map((it, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "csh-cell"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, it.k), /*#__PURE__*/React.createElement("span", {
    className: "v",
    style: it.live ? {
      color: 'var(--c-live)'
    } : undefined
  }, it.live ? '● ' : '', it.v))));
}
Object.assign(__ds_scope, { SpecHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/SpecHeader.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/WorkCard.jsx
try { (() => {
function WorkCard({
  idx,
  title,
  desc,
  tags = [],
  status,
  statusLabel,
  cta = 'View build',
  href = '#',
  thumb,
  style,
  onClick
}) {
  return /*#__PURE__*/React.createElement("a", {
    href: href,
    onClick: onClick,
    className: "work chamfer",
    style: style
  }, /*#__PURE__*/React.createElement("div", {
    className: "inner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "thumb"
  }, thumb && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0
    }
  }, thumb), idx && /*#__PURE__*/React.createElement("span", {
    className: "idx"
  }, idx), status && /*#__PURE__*/React.createElement("span", {
    className: `st status st-${status}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), statusLabel)), /*#__PURE__*/React.createElement("div", {
    className: "meat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wt"
  }, title), /*#__PURE__*/React.createElement("div", {
    className: "wd"
  }, desc), tags.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "row"
  }, tags.map((t, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: t && t.accent ? 'tag tag--accent' : 'tag'
  }, t && t.label !== undefined ? t.label : t))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--s-3)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "micro",
    style: {
      color: 'var(--c-accent)'
    }
  }, cta, " ", /*#__PURE__*/React.createElement("span", {
    className: "arrow"
  }, "\u2192"))))));
}
Object.assign(__ds_scope, { WorkCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/WorkCard.jsx", error: String((e && e.message) || e) }); }

// site/js/field.js
try { (() => {
// RT/FX interactive type fields — hero + section headers. "Move to disturb the field."
window.RTFXField = {
  init: function (cv) {
    if (cv.__inited) return;
    cv.__inited = 1;
    var rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var ctx = cv.getContext('2d');
    var TEXT = cv.dataset.text || 'RT/FX';
    var HERO = cv.dataset.mode === 'hero';
    var P = [],
      W = 0,
      H = 0,
      DPR = Math.min(window.devicePixelRatio || 1, 2);
    var px = -9e3,
      py = -9e3,
      raf = 0,
      running = false,
      idleFrames = 0;
    function build() {
      W = cv.clientWidth;
      H = cv.clientHeight;
      if (W < 10 || H < 10) return;
      cv.width = W * DPR;
      cv.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var off = document.createElement('canvas');
      off.width = W;
      off.height = H;
      var o = off.getContext('2d');
      o.fillStyle = '#fff';
      o.textBaseline = 'middle';
      function font(s) {
        o.font = '700 ' + s + 'px "Martian Mono",monospace';
      }
      function fit(t, startH, maxW) {
        var s = startH;
        font(s);
        while (o.measureText(t).width > maxW && s > 8) {
          s -= 2;
          font(s);
        }
        return s;
      }
      if (HERO) {
        o.textAlign = 'center';
        var small = W < 640;
        if (small) {
          var s1 = fit('INFRASTRUCTURE', H * 0.34, W * 0.94);
          font(Math.min(s1 * 1.6, H * 0.34));
          o.fillText('ART', W / 2, H * 0.3);
          font(s1);
          o.fillText('INFRASTRUCTURE', W / 2, H * 0.68);
        } else {
          fit(TEXT, H * 0.5, W * 0.94);
          o.fillText(TEXT, W / 2, H * 0.52);
        }
      } else {
        o.textAlign = 'left';
        fit(TEXT, H * 0.72, W * 0.98);
        o.fillText(TEXT, 1, H * 0.55);
      }
      var data = o.getImageData(0, 0, W, H).data;
      P = [];
      var step = HERO ? Math.max(2, Math.round(W / 340)) : 2;
      for (var y = 0; y < H; y += step) for (var x = 0; x < W; x += step) {
        if (data[(y * W + x) * 4 + 3] > 128) P.push({
          x: x,
          y: y,
          hx: x,
          hy: y,
          vx: 0,
          vy: 0,
          heat: 0
        });
      }
      drawStatic();
    }
    function drawStatic() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = HERO ? '#A3A3A3' : '#FAFAFA';
      for (var i = 0; i < P.length; i++) {
        var p = P[i];
        ctx.fillRect(p.x - 0.75, p.y - 0.75, 1.5, 1.5);
      }
    }
    function tick() {
      raf = 0;
      var moved = false;
      ctx.clearRect(0, 0, W, H);
      var base = HERO ? '#A3A3A3' : '#FAFAFA';
      var R = HERO ? Math.max(70, W * 0.07) : Math.max(46, H * 0.85),
        R2 = R * R;
      for (var i = 0; i < P.length; i++) {
        var p = P[i];
        var dx = p.x - px,
          dy = p.y - py,
          d2 = dx * dx + dy * dy;
        if (d2 < R2 && d2 > 0.01) {
          var d = Math.sqrt(d2),
            f = (1 - d / R) * 3.2;
          p.vx += dx / d * f;
          p.vy += dy / d * f;
          p.heat = 1;
        }
        p.vx += (p.hx - p.x) * 0.025;
        p.vy += (p.hy - p.y) * 0.025;
        p.vx *= 0.86;
        p.vy *= 0.86;
        p.x += p.vx;
        p.y += p.vy;
        if (p.heat > 0.004) {
          p.heat *= 0.96;
          moved = true;
        } else p.heat = 0;
        if (Math.abs(p.vx) + Math.abs(p.vy) > 0.05) moved = true;
        if (p.heat > 0.05) {
          ctx.fillStyle = p.heat > 0.5 ? '#FFB020' : '#FFD9A0';
        } else ctx.fillStyle = base;
        ctx.fillRect(p.x - 0.75, p.y - 0.75, 1.5, 1.5);
      }
      idleFrames = moved ? 0 : idleFrames + 1;
      if (running && idleFrames < 30) raf = requestAnimationFrame(tick);
    }
    function wake() {
      if (!raf && running && !rm) {
        idleFrames = 0;
        raf = requestAnimationFrame(tick);
      }
    }
    function pt(e) {
      var r = cv.getBoundingClientRect();
      var t = e.touches ? e.touches[0] : e;
      px = t.clientX - r.left;
      py = t.clientY - r.top;
      wake();
    }
    function off2() {
      px = -9e3;
      py = -9e3;
      wake();
    }
    if (!rm) {
      cv.addEventListener('mousemove', pt);
      cv.addEventListener('touchmove', pt, {
        passive: true
      });
      cv.addEventListener('mouseleave', off2);
      cv.addEventListener('touchend', off2);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) {
          es.forEach(function (e) {
            running = e.isIntersecting;
            if (running) wake();else if (raf) {
              cancelAnimationFrame(raf);
              raf = 0;
            }
          });
        }, {
          threshold: .1
        }).observe(cv);
      } else running = true;
    }
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(build, 150);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);
    build();
  },
  initAll: function (root) {
    var els = (root || document).querySelectorAll('canvas[data-text]');
    for (var i = 0; i < els.length; i++) window.RTFXField.init(els[i]);
  }
};
document.addEventListener('DOMContentLoaded', function () {
  window.RTFXField.initAll(document);
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "site/js/field.js", error: String((e && e.message) || e) }); }

// site/js/site.js
try { (() => {
(function () {
  var rm = window.matchMedia('(prefers-reduced-motion: reduce)');
  // ambient video loops: autoplay in view unless reduced motion; button always works
  var vids = Array.prototype.slice.call(document.querySelectorAll('.vid video'));
  function btnOf(v) {
    var f = v.closest('.vid');
    return f ? f.querySelector('.vplay') : null;
  }
  function setBtn(v, playing) {
    var b = btnOf(v);
    if (b) {
      b.textContent = playing ? '❚❚ Pause' : '▶ Play clip';
      b.setAttribute('aria-pressed', String(playing));
    }
  }
  vids.forEach(function (v) {
    v.muted = true;
    v.loop = true;
    v.setAttribute('playsinline', '');
    function pend() {
      var b = btnOf(v);
      if (b) {
        b.textContent = 'Media pending';
        b.disabled = true;
      }
    }
    v.addEventListener('error', pend, true);
    if (v.error || v.networkState === 3) pend();
    var b = btnOf(v);
    if (b) b.addEventListener('click', function () {
      if (v.paused) {
        v.dataset.user = '1';
        v.play().then(function () {
          setBtn(v, true);
        }).catch(function () {});
      } else {
        v.pause();
        v.dataset.user = '0';
        setBtn(v, false);
      }
    });
  });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target;
        if (v.dataset.user) return;
        if (e.isIntersecting && !rm.matches) {
          v.play().then(function () {
            setBtn(v, true);
          }).catch(function () {});
        } else {
          if (!v.paused) {
            v.pause();
            setBtn(v, false);
          }
        }
      });
    }, {
      threshold: .35
    });
    vids.forEach(function (v) {
      io.observe(v);
    });
  }
  // gallery scroll nav
  document.querySelectorAll('.gal').forEach(function (g) {
    var t = g.querySelector('.track');
    if (!t) return;
    g.querySelectorAll('[data-go]').forEach(function (b) {
      b.addEventListener('click', function () {
        var f = t.querySelector('figure');
        var dx = (f ? f.getBoundingClientRect().width : 400) + 12;
        t.scrollBy({
          left: b.dataset.go === 'n' ? dx : -dx,
          behavior: rm.matches ? 'auto' : 'smooth'
        });
      });
    });
  });
  // archive filters
  var chips = document.querySelectorAll('.chip[data-f]');
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      chips.forEach(function (x) {
        x.setAttribute('aria-pressed', String(x === c));
      });
      var f = c.dataset.f;
      document.querySelectorAll('.ai[data-cat]').forEach(function (it) {
        it.hidden = f !== 'all' && it.dataset.cat !== f;
      });
    });
  });
  // random pools: show 6 of N
  document.querySelectorAll('[data-pool]').forEach(function (w) {
    var items = Array.prototype.slice.call(w.querySelectorAll('[data-p]'));
    if (items.length <= 6) return;
    var idx = items.map(function (_, i) {
      return i;
    });
    for (var i = idx.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = idx[i];
      idx[i] = idx[j];
      idx[j] = t;
    }
    var show = idx.slice(0, 6);
    items.forEach(function (el, i) {
      el.hidden = show.indexOf(i) < 0;
    });
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "site/js/site.js", error: String((e && e.message) || e) }); }

// ui_kits/website/CaseStudy.jsx
try { (() => {
function CaseStudy({
  nav
}) {
  const {
    Topbar,
    SiteFooter,
    Button,
    Status,
    TickRule,
    SpecHeader,
    Tag
  } = window.RTFXDesignSystem_ceb80c;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement(Topbar, {
    logoSrc: "../../assets/rtfx-wordmark-white.svg",
    links: [{
      label: 'Work',
      active: true,
      onClick: e => {
        e.preventDefault();
        nav('home');
      }
    }, {
      label: 'Practice',
      onClick: e => {
        e.preventDefault();
        nav('home');
      }
    }, {
      label: 'Archive',
      href: 'https://rtfx.space/archive/'
    }, {
      label: 'Contact',
      onClick: e => {
        e.preventDefault();
        nav('contact');
      }
    }],
    right: /*#__PURE__*/React.createElement(Status, {
      state: "live"
    }, "Running")
  }), /*#__PURE__*/React.createElement("div", {
    className: "wrap",
    style: {
      paddingTop: 'var(--s-8)',
      paddingBottom: 'var(--s-8)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "micro",
    style: {
      display: 'block',
      marginBottom: 'var(--s-5)'
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      nav('home');
    },
    style: {
      color: 'var(--c-ink-3)',
      textDecoration: 'none'
    }
  }, "Work"), " ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--c-rule)'
    }
  }, "/"), " ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--c-ink)'
    }
  }, "001 \xB7 Show control system")), /*#__PURE__*/React.createElement("h1", {
    className: "display-l",
    style: {
      marginBottom: 'var(--s-4)'
    }
  }, "REVd Cycling"), /*#__PURE__*/React.createElement("div", {
    className: "row",
    style: {
      marginBottom: 'var(--s-6)'
    }
  }, /*#__PURE__*/React.createElement(Tag, null, "LED"), /*#__PURE__*/React.createElement(Tag, null, "DMX"), /*#__PURE__*/React.createElement(Tag, {
    accent: true
  }, "Show control")), /*#__PURE__*/React.createElement(TickRule, {
    style: {
      marginBottom: 'var(--s-5)'
    }
  }), /*#__PURE__*/React.createElement(SpecHeader, {
    items: [{
      k: 'Client',
      v: 'REVd Cycling'
    }, {
      k: 'Venue',
      v: 'Hyattsville, MD'
    }, {
      k: 'Date',
      v: '2026.08'
    }, {
      k: 'Role',
      v: 'Show control'
    }, {
      k: 'Surface',
      v: '15 Stream Deck keys'
    }, {
      k: 'Status',
      v: 'Running',
      live: true
    }],
    style: {
      marginBottom: 'var(--s-7)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "chamfer",
    style: {
      aspectRatio: '16/9',
      background: 'var(--c-panel)',
      marginBottom: 'var(--s-3)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "https://rtfx.space/revd-show-control/media/hero.webp",
    alt: "REVd Cycling rig",
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      display: 'block'
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "micro",
    style: {
      display: 'block',
      marginBottom: 'var(--s-7)'
    }
  }, "Fig 01 \xB7 Two-room rig \u2014 LED wall + DMX lighting"), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--measure)'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      marginBottom: 'var(--s-4)'
    }
  }, "A two-room control system that lets instructors drive an LED wall and DMX lighting from fifteen clearly labelled Stream Deck buttons \u2014 no operator in the room, no technical layer exposed to the class."), /*#__PURE__*/React.createElement("p", {
    className: "body-s"
  }, "Full write-up at ", /*#__PURE__*/React.createElement("a", {
    href: "https://rtfx.space/revd-show-control/"
  }, "rtfx.space/revd-show-control \u2197"), ". Spec sheet current as of 2026.08.")), /*#__PURE__*/React.createElement("div", {
    className: "row",
    style: {
      marginTop: 'var(--s-7)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    arrow: true,
    onClick: () => nav('contact')
  }, "Build something like this"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    onClick: () => nav('home')
  }, "Back to work"))), /*#__PURE__*/React.createElement(SiteFooter, {
    note: "RT/FX \xB7 Allen Grabo \xB7 Creative technology \xB7 Washington, DC \xB7 rtfx.space",
    style: {
      marginTop: 'auto'
    }
  }));
}
Object.assign(__ds_scope, { CaseStudy });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/CaseStudy.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Contact.jsx
try { (() => {
function Contact({
  nav
}) {
  const {
    Topbar,
    SiteFooter,
    Button,
    Status,
    TickRule,
    SpecHeader
  } = window.RTFXDesignSystem_ceb80c;
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-grid",
    style: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement(Topbar, {
    logoSrc: "../../assets/rtfx-wordmark-white.svg",
    links: [{
      label: 'Work',
      onClick: e => {
        e.preventDefault();
        nav('home');
      }
    }, {
      label: 'Practice',
      onClick: e => {
        e.preventDefault();
        nav('home');
      }
    }, {
      label: 'Archive',
      href: 'https://rtfx.space/archive/'
    }, {
      label: 'Contact',
      active: true
    }],
    right: /*#__PURE__*/React.createElement(Status, {
      state: "ok"
    }, "Available for select work")
  }), /*#__PURE__*/React.createElement("div", {
    className: "wrap",
    style: {
      paddingTop: 'var(--s-9)',
      paddingBottom: 'var(--s-8)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "label",
    style: {
      display: 'block',
      marginBottom: 'var(--s-6)'
    }
  }, "03 \xB7 Contact"), /*#__PURE__*/React.createElement("h1", {
    className: "display-xl",
    style: {
      fontSize: 'var(--t-display-l)'
    }
  }, "SOMETHING IN MIND?"), /*#__PURE__*/React.createElement("p", {
    style: {
      maxWidth: 'var(--measure)',
      marginTop: 'var(--s-5)',
      color: 'var(--c-ink-2)'
    }
  }, "Send the room, the dates, and what it needs to feel like. You get a straight answer about whether I'm the right operator for it."), /*#__PURE__*/React.createElement("div", {
    className: "row",
    style: {
      marginTop: 'var(--s-6)',
      marginBottom: 'var(--s-7)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "fill",
    href: "mailto:rtfxdesign@gmail.com"
  }, "rtfxdesign@gmail.com \u2197"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    href: "https://www.instagram.com/allengrabo"
  }, "Instagram \u2197")), /*#__PURE__*/React.createElement(TickRule, {
    style: {
      marginBottom: 'var(--s-5)'
    }
  }), /*#__PURE__*/React.createElement(SpecHeader, {
    items: [{
      k: 'Base',
      v: 'Washington, DC'
    }, {
      k: 'Range',
      v: 'DMV + travel'
    }, {
      k: 'Archive',
      v: 'rtfx.space/archive'
    }, {
      k: 'Status',
      v: 'Available',
      live: true
    }]
  })), /*#__PURE__*/React.createElement(SiteFooter, {
    note: "RT/FX \xB7 Allen Grabo \xB7 Creative technology \xB7 Washington, DC \xB7 rtfx.space",
    style: {
      marginTop: 'auto'
    }
  }));
}
Object.assign(__ds_scope, { Contact });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Contact.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Home.jsx
try { (() => {
const WORK = [{
  idx: '001',
  title: 'REVd Cycling',
  cat: 'Show control system',
  desc: 'A two-room control system that lets instructors drive an LED wall and DMX lighting from fifteen clearly labelled Stream Deck buttons.',
  tags: ['LED', 'DMX', {
    label: 'Show control',
    accent: true
  }],
  img: 'https://rtfx.space/revd-show-control/media/hero.webp',
  status: 'live',
  statusLabel: 'Running',
  screen: 'case'
}, {
  idx: '002',
  title: 'Porsche Studio Portland',
  cat: 'Immersive experience center',
  desc: 'A Pixera-driven multi-surface environment built for automotive storytelling, live events, and dependable daily operation.',
  tags: ['Pixera', 'Multi-surface'],
  img: 'https://rtfx.space/case-studies/porsche/porsche-room.webp',
  href: 'https://rtfx.space/work/porsche-studio-portland/'
}, {
  idx: '003',
  title: 'Shifting Realities',
  cat: 'Immersive exhibition retrofit',
  desc: 'A 13-projector installation converted into three independent experiential zones through Mosaic, Pixera Director, calibration, and systems design.',
  tags: ['13 projectors', 'Mosaic'],
  img: 'https://rtfx.space/case-studies/shifting-realities/portal-zone.webp',
  href: 'https://rtfx.space/work/shifting-realities/'
}, {
  idx: '004',
  title: 'Congressional Black Caucus Week',
  cat: 'Live production',
  desc: 'A multi-venue production week connecting custom content, LED systems, rapid changeovers, and live show continuity.',
  tags: ['LED', 'Novastar'],
  img: 'https://rtfx.space/case-studies/cbc-week/ballroom-stage.webp',
  href: 'https://rtfx.space/work/cbc-week/'
}, {
  idx: '005',
  title: 'Club STFU',
  cat: 'Venue visual system',
  desc: 'A complete club visual language spanning LED integration, projection, custom content, system support, and live VJ performance.',
  tags: ['LED', 'Projection', 'VJ'],
  img: 'https://rtfx.space/case-studies/stfu/neon-room.webp',
  href: 'https://rtfx.space/work/club-stfu/'
}, {
  idx: '006',
  title: 'Generation Grace Church',
  cat: 'Technical integration',
  desc: 'An 18-panel LED and programmable lighting system designed for performance, recording, and repeatable local operation.',
  tags: ['18-panel LED', 'Lighting'],
  img: 'https://rtfx.space/case-studies/grace-church/finished-stage.webp',
  href: 'https://rtfx.space/work/grace-church/'
}];
const TOOLS = ['TouchDesigner', 'Pixera', 'Resolume', 'OSC', 'Python', 'FFmpeg', 'NDI', 'Companion', 'Generative AI'];
const PRACTICE = [['01', 'Immersive visuals', 'Projection-mapped content, multi-wall environments, live visuals, and site-specific motion.'], ['02', 'Creative technology', 'Generative systems, AI-assisted workflows, interactive media, sensors, and custom interfaces.'], ['03', 'Playback systems', 'Pixera, Resolume, signal flow, media servers, show control, and calm technical execution.'], ['04', 'Technical direction', 'System design, troubleshooting, documentation, crew coordination, and operational handoff.']];
function Home({
  nav
}) {
  const {
    Topbar,
    SiteFooter,
    Button,
    Status,
    TickRule,
    SectionHead,
    WorkCard,
    Tag
  } = window.RTFXDesignSystem_ceb80c;
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-grid",
    style: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement(Topbar, {
    logoSrc: "../../assets/rtfx-wordmark-white.svg",
    links: [{
      label: 'Work',
      active: true,
      href: '#work'
    }, {
      label: 'Practice',
      href: '#practice'
    }, {
      label: 'Archive',
      href: 'https://rtfx.space/archive/'
    }, {
      label: 'Contact',
      onClick: e => {
        e.preventDefault();
        nav('contact');
      }
    }],
    right: /*#__PURE__*/React.createElement(Status, {
      state: "ok"
    }, "Available for select work")
  }), /*#__PURE__*/React.createElement("div", {
    className: "wrap",
    style: {
      paddingTop: 'var(--s-9)',
      paddingBottom: 'var(--s-8)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "label",
    style: {
      display: 'block',
      marginBottom: 'var(--s-6)'
    }
  }, "Allen Grabo \xB7 Creative technologist \xB7 Washington, DC"), /*#__PURE__*/React.createElement("h1", {
    className: "display-xl"
  }, "VISUAL SYSTEMS", /*#__PURE__*/React.createElement("br", null), "FOR REAL SPACE."), /*#__PURE__*/React.createElement("p", {
    style: {
      maxWidth: 'var(--measure)',
      marginTop: 'var(--s-5)',
      color: 'var(--c-ink-2)',
      fontSize: 17
    }
  }, "Immersive content, projection mapping, generative systems, and technical direction for experiences that need to feel alive."), /*#__PURE__*/React.createElement("div", {
    className: "row",
    style: {
      marginTop: 'var(--s-6)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "fill",
    href: "#work"
  }, "View selected work \u2193"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    href: "https://drive.google.com/file/d/1V6RVt09aBGgeDL_l349xogfKxCWcVkfp/view?usp=sharing"
  }, "R\xE9sum\xE9 \u2197")), /*#__PURE__*/React.createElement(TickRule, {
    style: {
      marginTop: 'var(--s-7)'
    }
  })), /*#__PURE__*/React.createElement("section", {
    id: "work",
    style: {
      padding: 'var(--s-8) 0',
      borderBottom: '1px solid var(--c-rule-soft)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement(SectionHead, {
    num: "01",
    title: "Selected work",
    note: "Systems that change the feeling of a room. I create the content, shape the visual language, map it into the room, build the technical system, and help run it live."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))',
      gap: 'var(--s-5)'
    }
  }, WORK.map(w => /*#__PURE__*/React.createElement(WorkCard, {
    key: w.idx,
    idx: w.idx,
    status: w.status,
    statusLabel: w.statusLabel,
    title: w.title,
    desc: w.desc,
    tags: w.tags,
    cta: w.screen ? 'View build' : 'Explore project',
    href: w.href || '#',
    onClick: w.screen ? e => {
      e.preventDefault();
      nav(w.screen);
    } : undefined,
    thumb: /*#__PURE__*/React.createElement("img", {
      src: w.img,
      alt: w.cat,
      style: {
        width: '100%',
        height: '100%',
        objectFit: 'cover'
      }
    })
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--s-6)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    arrow: true,
    href: "https://rtfx.space/archive/"
  }, "Enter the field archive")))), /*#__PURE__*/React.createElement("section", {
    id: "practice",
    style: {
      padding: 'var(--s-8) 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement(SectionHead, {
    num: "02",
    title: "Practice",
    note: "Creative vision. Technical calm."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))',
      gap: 1,
      background: 'var(--c-rule-soft)',
      border: '1px solid var(--c-rule-soft)',
      marginBottom: 'var(--s-5)'
    }
  }, PRACTICE.map(([n, t, d]) => /*#__PURE__*/React.createElement("div", {
    key: n,
    style: {
      background: 'var(--c-panel)',
      padding: 'var(--s-5)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "label",
    style: {
      display: 'block',
      marginBottom: 'var(--s-3)',
      color: 'var(--c-accent)'
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    className: "heading",
    style: {
      marginBottom: 8
    }
  }, t), /*#__PURE__*/React.createElement("p", {
    className: "body-s"
  }, d)))), /*#__PURE__*/React.createElement("div", {
    className: "row"
  }, TOOLS.map(t => /*#__PURE__*/React.createElement(Tag, {
    key: t
  }, t))))), /*#__PURE__*/React.createElement(SiteFooter, {
    note: "RT/FX \xB7 Allen Grabo \xB7 Creative technology \xB7 Washington, DC \xB7 rtfx.space",
    style: {
      marginTop: 'auto'
    }
  }));
}
Object.assign(__ds_scope, { Home });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Home.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Status = __ds_scope.Status;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.TickRule = __ds_scope.TickRule;

__ds_ns.SiteFooter = __ds_scope.SiteFooter;

__ds_ns.Topbar = __ds_scope.Topbar;

__ds_ns.Panel = __ds_scope.Panel;

__ds_ns.SectionHead = __ds_scope.SectionHead;

__ds_ns.SpecHeader = __ds_scope.SpecHeader;

__ds_ns.WorkCard = __ds_scope.WorkCard;

__ds_ns.CaseStudy = __ds_scope.CaseStudy;

__ds_ns.Contact = __ds_scope.Contact;

__ds_ns.Home = __ds_scope.Home;

})();
