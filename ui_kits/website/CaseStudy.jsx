import React from 'react';
export function CaseStudy({ nav }) {
  const { Topbar, SiteFooter, Button, Status, TickRule, SpecHeader, Tag } = window.RTFXDesignSystem_ceb80c;
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Topbar logoSrc="../../assets/rtfx-wordmark-white.svg"
        links={[{ label: 'Work', active: true, onClick: e => { e.preventDefault(); nav('home'); } }, { label: 'Practice', onClick: e => { e.preventDefault(); nav('home'); } }, { label: 'Archive', href: 'https://rtfx.space/archive/' }, { label: 'Contact', onClick: e => { e.preventDefault(); nav('contact'); } }]}
        right={<Status state="live">Running</Status>} />
      <div className="wrap" style={{ paddingTop: 'var(--s-8)', paddingBottom: 'var(--s-8)' }}>
        <span className="micro" style={{ display: 'block', marginBottom: 'var(--s-5)' }}><a href="#" onClick={e => { e.preventDefault(); nav('home'); }} style={{ color: 'var(--c-ink-3)', textDecoration: 'none' }}>Work</a> <span style={{ color: 'var(--c-rule)' }}>/</span> <span style={{ color: 'var(--c-ink)' }}>001 · Show control system</span></span>
        <h1 className="display-l" style={{ marginBottom: 'var(--s-4)' }}>REVd Cycling</h1>
        <div className="row" style={{ marginBottom: 'var(--s-6)' }}><Tag>LED</Tag><Tag>DMX</Tag><Tag accent>Show control</Tag></div>
        <TickRule style={{ marginBottom: 'var(--s-5)' }} />
        <SpecHeader items={[{ k: 'Client', v: 'REVd Cycling' }, { k: 'Venue', v: 'Hyattsville, MD' }, { k: 'Date', v: '2026.08' }, { k: 'Role', v: 'Show control' }, { k: 'Surface', v: '15 Stream Deck keys' }, { k: 'Status', v: 'Running', live: true }]} style={{ marginBottom: 'var(--s-7)' }} />
        <div className="chamfer" style={{ aspectRatio: '16/9', background: 'var(--c-panel)', marginBottom: 'var(--s-3)', overflow: 'hidden' }}>
          <img src="https://rtfx.space/revd-show-control/media/hero.webp" alt="REVd Cycling rig" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
        <span className="micro" style={{ display: 'block', marginBottom: 'var(--s-7)' }}>Fig 01 · Two-room rig — LED wall + DMX lighting</span>
        <div style={{ maxWidth: 'var(--measure)' }}>
          <p style={{ marginBottom: 'var(--s-4)' }}>A two-room control system that lets instructors drive an LED wall and DMX lighting from fifteen clearly labelled Stream Deck buttons — no operator in the room, no technical layer exposed to the class.</p>
          <p className="body-s">Full write-up at <a href="https://rtfx.space/revd-show-control/">rtfx.space/revd-show-control ↗</a>. Spec sheet current as of 2026.08.</p>
        </div>
        <div className="row" style={{ marginTop: 'var(--s-7)' }}>
          <Button arrow onClick={() => nav('contact')}>Build something like this</Button>
          <Button variant="ghost" onClick={() => nav('home')}>Back to work</Button>
        </div>
      </div>
      <SiteFooter note="RT/FX · Allen Grabo · Creative technology · Washington, DC · rtfx.space" style={{ marginTop: 'auto' }} />
    </div>
  );
}
