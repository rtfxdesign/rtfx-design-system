import React from 'react';
export function SpecHeader({ items = [], style }) {
  return <div className="csh-grid" style={style}>{items.map((it, i) => <div key={i} className="csh-cell"><span className="k">{it.k}</span><span className="v" style={it.live ? { color: 'var(--c-live)' } : undefined}>{it.live ? '● ' : ''}{it.v}</span></div>)}</div>;
}
