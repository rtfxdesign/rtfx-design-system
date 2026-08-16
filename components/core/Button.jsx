import React from 'react';
export function Button({ variant = 'outline', arrow = false, disabled = false, href, onClick, style, children }) {
  const cls = 'btn' + (variant === 'fill' ? ' btn--fill' : variant === 'ghost' ? ' btn--ghost' : '');
  if (href && !disabled) return <a href={href} onClick={onClick} className={cls} style={style}>{children}{arrow && <span>→</span>}</a>;
  return <button className={cls} style={style} onClick={onClick} disabled={disabled || undefined}>{children}{arrow && <span>→</span>}</button>;
}
