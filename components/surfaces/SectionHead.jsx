import React from 'react';
export function SectionHead({ num, title, note, style }) {
  return <div className="sec-head" style={style}><span className="sec-num">{num}</span><div><h2 className="display-m">{title}</h2>{note && <p className="sec-note">{note}</p>}</div></div>;
}
