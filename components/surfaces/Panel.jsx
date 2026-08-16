import React from 'react';
export function Panel({ inline = 'none', small = false, padding = 'var(--s-5)', style, innerStyle, children }) {
  const cls = small ? 'chamfer-sm' : 'chamfer';
  const inl = inline === 'static' ? ' inline-fx inline-static' : inline === 'hover' ? ' inline-fx' : '';
  return <div className={`cham-box ${cls}`} style={style}><div className={`in ${cls}${inl}`} style={{ padding, ...innerStyle }}>{children}</div></div>;
}
