import React from 'react';
const WORK = [
  { idx: '001', title: 'REVd Cycling', cat: 'Show control system', desc: 'A two-room control system that lets instructors drive an LED wall and DMX lighting from fifteen clearly labelled Stream Deck buttons.', tags: ['LED', 'DMX', { label: 'Show control', accent: true }], img: 'https://rtfx.space/revd-show-control/media/hero.webp', status: 'live', statusLabel: 'Running', screen: 'case' },
  { idx: '002', title: 'Porsche Studio Portland', cat: 'Immersive experience center', desc: 'A Pixera-driven multi-surface environment built for automotive storytelling, live events, and dependable daily operation.', tags: ['Pixera', 'Multi-surface'], img: 'https://rtfx.space/case-studies/porsche/porsche-room.webp', href: 'https://rtfx.space/work/porsche-studio-portland/' },
  { idx: '003', title: 'Shifting Realities', cat: 'Immersive exhibition retrofit', desc: 'A 13-projector installation converted into three independent experiential zones through Mosaic, Pixera Director, calibration, and systems design.', tags: ['13 projectors', 'Mosaic'], img: 'https://rtfx.space/case-studies/shifting-realities/portal-zone.webp', href: 'https://rtfx.space/work/shifting-realities/' },
  { idx: '004', title: 'Congressional Black Caucus Week', cat: 'Live production', desc: 'A multi-venue production week connecting custom content, LED systems, rapid changeovers, and live show continuity.', tags: ['LED', 'Novastar'], img: 'https://rtfx.space/case-studies/cbc-week/ballroom-stage.webp', href: 'https://rtfx.space/work/cbc-week/' },
  { idx: '005', title: 'Club STFU', cat: 'Venue visual system', desc: 'A complete club visual language spanning LED integration, projection, custom content, system support, and live VJ performance.', tags: ['LED', 'Projection', 'VJ'], img: 'https://rtfx.space/case-studies/stfu/neon-room.webp', href: 'https://rtfx.space/work/club-stfu/' },
  { idx: '006', title: 'Generation Grace Church', cat: 'Technical integration', desc: 'An 18-panel LED and programmable lighting system designed for performance, recording, and repeatable local operation.', tags: ['18-panel LED', 'Lighting'], img: 'https://rtfx.space/case-studies/grace-church/finished-stage.webp', href: 'https://rtfx.space/work/grace-church/' },
];
const TOOLS = ['TouchDesigner', 'Pixera', 'Resolume', 'OSC', 'Python', 'FFmpeg', 'NDI', 'Companion', 'Generative AI'];
const PRACTICE = [
  ['01', 'Immersive visuals', 'Projection-mapped content, multi-wall environments, live visuals, and site-specific motion.'],
  ['02', 'Creative technology', 'Generative systems, AI-assisted workflows, interactive media, sensors, and custom interfaces.'],
  ['03', 'Playback systems', 'Pixera, Resolume, signal flow, media servers, show control, and calm technical execution.'],
  ['04', 'Technical direction', 'System design, troubleshooting, documentation, crew coordination, and operational handoff.'],
];
export function Home({ nav }) {
  const { Topbar, SiteFooter, Button, Status, TickRule, SectionHead, WorkCard, Tag } = window.RTFXDesignSystem_ceb80c;
  return (
    <div className="bg-grid" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Topbar logoSrc="../../assets/rtfx-wordmark-white.svg"
        links={[{ label: 'Work', active: true, href: '#work' }, { label: 'Practice', href: '#practice' }, { label: 'Archive', href: 'https://rtfx.space/archive/' }, { label: 'Contact', onClick: e => { e.preventDefault(); nav('contact'); } }]}
        right={<Status state="ok">Available for select work</Status>} />
      <div className="wrap" style={{ paddingTop: 'var(--s-9)', paddingBottom: 'var(--s-8)' }}>
        <span className="label" style={{ display: 'block', marginBottom: 'var(--s-6)' }}>Allen Grabo · Creative technologist · Washington, DC</span>
        <h1 className="display-xl">VISUAL SYSTEMS<br />FOR REAL SPACE.</h1>
        <p style={{ maxWidth: 'var(--measure)', marginTop: 'var(--s-5)', color: 'var(--c-ink-2)', fontSize: 17 }}>
          Immersive content, projection mapping, generative systems, and technical direction for experiences that need to feel alive.
        </p>
        <div className="row" style={{ marginTop: 'var(--s-6)' }}>
          <Button variant="fill" href="#work">View selected work ↓</Button>
          <Button variant="ghost" href="https://drive.google.com/file/d/1V6RVt09aBGgeDL_l349xogfKxCWcVkfp/view?usp=sharing">Résumé ↗</Button>
        </div>
        <TickRule style={{ marginTop: 'var(--s-7)' }} />
      </div>
      <section id="work" style={{ padding: 'var(--s-8) 0', borderBottom: '1px solid var(--c-rule-soft)' }}>
        <div className="wrap">
          <SectionHead num="01" title="Selected work" note="Systems that change the feeling of a room. I create the content, shape the visual language, map it into the room, build the technical system, and help run it live." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 'var(--s-5)' }}>
            {WORK.map(w => (
              <WorkCard key={w.idx} idx={w.idx} status={w.status} statusLabel={w.statusLabel} title={w.title}
                desc={w.desc} tags={w.tags} cta={w.screen ? 'View build' : 'Explore project'}
                href={w.href || '#'} onClick={w.screen ? (e => { e.preventDefault(); nav(w.screen); }) : undefined}
                thumb={<img src={w.img} alt={w.cat} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />} />))}
          </div>
          <div style={{ marginTop: 'var(--s-6)' }}><Button arrow href="https://rtfx.space/archive/">Enter the field archive</Button></div>
        </div>
      </section>
      <section id="practice" style={{ padding: 'var(--s-8) 0' }}>
        <div className="wrap">
          <SectionHead num="02" title="Practice" note="Creative vision. Technical calm." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 1, background: 'var(--c-rule-soft)', border: '1px solid var(--c-rule-soft)', marginBottom: 'var(--s-5)' }}>
            {PRACTICE.map(([n, t, d]) => (
              <div key={n} style={{ background: 'var(--c-panel)', padding: 'var(--s-5)' }}>
                <span className="label" style={{ display: 'block', marginBottom: 'var(--s-3)', color: 'var(--c-accent)' }}>{n}</span>
                <div className="heading" style={{ marginBottom: 8 }}>{t}</div>
                <p className="body-s">{d}</p>
              </div>))}
          </div>
          <div className="row">{TOOLS.map(t => <Tag key={t}>{t}</Tag>)}</div>
        </div>
      </section>
      <SiteFooter note="RT/FX · Allen Grabo · Creative technology · Washington, DC · rtfx.space" style={{ marginTop: 'auto' }} />
    </div>
  );
}
