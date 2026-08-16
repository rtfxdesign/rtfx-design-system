import React from 'react';
export function SiteFooter({ note = 'RTFX Design LLC · rtfx.space', motto = 'Manu et machina', style }) {
  return (
    <footer style={{ padding: 'var(--s-8) 0 var(--s-7)', color: 'var(--c-ink-3)', ...style }}>
      <div className="wrap">
        <div className="tickrule" style={{ marginBottom: 'var(--s-5)' }}></div>
        <span className="micro">{note}</span>
        {motto && <span className="label" style={{ color: 'var(--c-accent)', marginTop: 'var(--s-2)', display: 'block' }}>{motto}</span>}
      </div>
    </footer>
  );
}
