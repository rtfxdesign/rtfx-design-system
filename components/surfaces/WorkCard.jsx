import React from 'react';
export function WorkCard({ idx, title, desc, tags = [], status, statusLabel, cta = 'View build', href = '#', thumb, style, onClick }) {
  return (
    <a href={href} onClick={onClick} className="work chamfer" style={style}>
      <div className="inner">
        <div className="thumb">
          {thumb && <div style={{ position: 'absolute', inset: 0 }}>{thumb}</div>}
          {idx && <span className="idx">{idx}</span>}
          {status && <span className={`st status st-${status}`}><span className="dot"></span>{statusLabel}</span>}
        </div>
        <div className="meat">
          <div className="wt">{title}</div>
          <div className="wd">{desc}</div>
          {tags.length > 0 && <div className="row">{tags.map((t, i) => <span key={i} className={t && t.accent ? 'tag tag--accent' : 'tag'}>{t && t.label !== undefined ? t.label : t}</span>)}</div>}
          <div style={{ marginTop: 'var(--s-3)' }}><span className="micro" style={{ color: 'var(--c-accent)' }}>{cta} <span className="arrow">→</span></span></div>
        </div>
      </div>
    </a>
  );
}
