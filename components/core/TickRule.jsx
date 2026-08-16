import React from 'react';
export function TickRule({ vertical = false, dim = false, style }) {
  return <div className={vertical ? 'tickrule tickrule--v' : 'tickrule'} style={dim ? { opacity: .5, ...style } : style}></div>;
}
