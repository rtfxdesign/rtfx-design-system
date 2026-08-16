import React from 'react';
export function Topbar({ mark = 'RTFX', suffix, logoSrc, links = [], right, style }) {
  return (
    <div className="topbar" style={style}>
      <div className="topbar-in">
        {logoSrc ? <a href="#" style={{ display: 'block', lineHeight: 0 }}><img src={logoSrc} alt="rtfx" style={{ width: 120, height: 'auto', display: 'block' }} /></a> : <span className="tb-mark">{mark}{suffix && <em>{suffix}</em>}</span>}
        {links.length > 0 && <nav style={{ display: 'flex', gap: 'var(--s-5)' }}>{links.map((l, i) => <a key={i} href={l.href || '#'} onClick={l.onClick} className="micro" style={{ color: l.active ? 'var(--c-accent)' : 'var(--c-ink-2)', textDecoration: 'none' }}>{l.label}</a>)}</nav>}
        {right && <span className="tb-lock">{right}</span>}
      </div>
    </div>
  );
}
