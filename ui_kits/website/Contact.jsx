import React from 'react';
export function Contact({ nav }) {
  const { Topbar, SiteFooter, Button, Status, TickRule, SpecHeader } = window.RTFXDesignSystem_ceb80c;
  return (
    <div className="bg-grid" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Topbar logoSrc="../../assets/rtfx-wordmark-white.svg"
        links={[{ label: 'Work', onClick: e => { e.preventDefault(); nav('home'); } }, { label: 'Practice', onClick: e => { e.preventDefault(); nav('home'); } }, { label: 'Archive', href: 'https://rtfx.space/archive/' }, { label: 'Contact', active: true }]}
        right={<Status state="ok">Available for select work</Status>} />
      <div className="wrap" style={{ paddingTop: 'var(--s-9)', paddingBottom: 'var(--s-8)' }}>
        <span className="label" style={{ display: 'block', marginBottom: 'var(--s-6)' }}>03 · Contact</span>
        <h1 className="display-xl" style={{ fontSize: 'var(--t-display-l)' }}>SOMETHING IN MIND?</h1>
        <p style={{ maxWidth: 'var(--measure)', marginTop: 'var(--s-5)', color: 'var(--c-ink-2)' }}>
          Send the room, the dates, and what it needs to feel like. You get a straight answer about whether I'm the right operator for it.
        </p>
        <div className="row" style={{ marginTop: 'var(--s-6)', marginBottom: 'var(--s-7)' }}>
          <Button variant="fill" href="mailto:rtfxdesign@gmail.com">rtfxdesign@gmail.com ↗</Button>
          <Button variant="ghost" href="https://www.instagram.com/allengrabo">Instagram ↗</Button>
        </div>
        <TickRule style={{ marginBottom: 'var(--s-5)' }} />
        <SpecHeader items={[{ k: 'Base', v: 'Washington, DC' }, { k: 'Range', v: 'DMV + travel' }, { k: 'Archive', v: 'rtfx.space/archive' }, { k: 'Status', v: 'Available', live: true }]} />
      </div>
      <SiteFooter note="RT/FX · Allen Grabo · Creative technology · Washington, DC · rtfx.space" style={{ marginTop: 'auto' }} />
    </div>
  );
}
