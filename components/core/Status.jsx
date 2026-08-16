import React from 'react';
export function Status({ state = 'idle', style, children }) {
  return <span className={`status st-${state}`} style={style}><span className="dot"></span>{children}</span>;
}
