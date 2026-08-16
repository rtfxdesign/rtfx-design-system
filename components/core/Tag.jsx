import React from 'react';
export function Tag({ accent = false, style, children }) {
  return <span className={accent ? 'tag tag--accent' : 'tag'} style={style}>{children}</span>;
}
