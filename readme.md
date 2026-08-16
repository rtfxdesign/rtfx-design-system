# RTFX Design System

Design system for **rtfx design / RT/FX** (RTFX Design LLC) — **Allen Grabo**, creative technologist, Washington, DC. Positioning: "Visual systems for real space" — immersive content, projection mapping, generative systems, playback/show control, and technical direction. Motto: **Manu et machina** ("by hand and machine"). The brand voice is "graphic design meets hardware": black-first, mono display type, amber signal accent, geometry machined out of the wordmark itself.

**Naming:** the live site renders the name as `RT/FX`; brand kit v0.4 (newer) locks the lowercase `rtfx` wordmark. Use the kit's mark; `RT/FX` may appear in running text/footers.

## Sources
- `uploads/rtfx-brand-kit-v04.html` — **ground truth.** Brand kit v0.4 (2026.08.15), palette locked "P1 Signal". All tokens, motifs, and component patterns here are copied from it verbatim.
- `uploads/` logo/export set (SVG + PNG) — copied into `assets/`.
- **www.rtfx.space** (live site, fetched 2026.08) — real copy, project inventory, practice areas, contact. Case-study imagery is hotlinked from it in the UI kit.
- No Figma or codebase was provided.

## CONTENT FUNDAMENTALS
- **Register:** technical shop-floor. Terse, declarative, load-bearing sentences. State the rule, then the reason ("Cut on top-left and bottom-right only, never all four. The asymmetry is the signature.").
- **Brand name:** lowercase `rtfx` in the mark; ALL-CAPS `RTFX` inside micro/label runs ("RTFX/BRAND KIT"). Never "Rtfx".
- **Casing:** body is sentence case. Labels/micro are UPPERCASE mono with wide tracking. Display headlines may be caps ("SIGNAL LOCKED / ASSETS CUT").
- **Numbers are content:** counts and specs carry the voice — "44-panel wall, 96 fixtures, one operator surface". Dates as `2026.08.15` / `2026.08`. Sections numbered `01`, `02`…
- **Person:** first-person singular operator voice ("I"), direct "you" to the reader. Reads as a tool name / a command, not a corporation.
- **CTAs:** verb-first, small, uppercase mono, with a direction glyph: "View selected work ↓", "Explore project ↗", "View build →", "Back to top ↑".
- **Headline pattern (live site):** short declarative pairs, often with an italic turn — "Visual systems for real space.", "Creative vision. Technical calm.", "Collected from inside the room.", "Something in mind?".
- **Card pattern:** dim category label above the title ("Show control system", "Immersive experience center"), then a one-sentence system description heavy on concrete counts ("13-projector installation", "fifteen clearly labelled Stream Deck buttons", "18-panel LED").
- **No emoji.** Unicode glyphs act as icons: `→ ● ✓ ✗ ☐`.
- **Motto:** "Manu et machina" — footer, lockups, sign-offs; set as `.label` in accent.

## VISUAL FOUNDATIONS
- **Color:** pure black canvas (`--c-bg #000000`), near-black panels (`#0A0A0A`), raised wells (`#141414`), 1px rules (`#262626` / soft `#1A1A1A`); ink scale `#FAFAFA / #A3A3A3 / #6E6E6E`. One accent: **amber `#FFB020`** (work-light, rack-LED energy), soft voice `#FFD9A0`, hot status `#FF8A00`, text on fills is black. Do/don't green `#3DDC6B`, red `#FF4D4D` (docs only). **Discipline rule: one accent element per viewport** — amber marks the thing to click or the thing currently true, never decoration.
- **Type:** Martian Mono (display, 300–800; tight negative tracking −.035…−.055em) + Space Grotesk (body, 15px/1.65). Micro/label layer: 10–11px uppercase mono, +.16…+.2em tracking. Display clamps: xl `clamp(38px,7vw,88px)` l `54px` m `34px`. **Layout rule:** never set the wordmark next to a Martian headline at comparable scale — wordmark small in nav, or wordmark huge with no headline.
- **Spacing:** 4px base scale `--s-1…--s-9` (4→96). Gutter `clamp(20px,4vw,64px)`, measure `64ch`, section padding `--s-9`.
- **Geometry (the logo's DNA):** no border-radius anywhere. **M-A Chamfer** — 12px corner cut on TL+BR only (7px on buttons/tags) via clip-path; bordered chamfers nest a 1px `.cham-box`. **M-B Tick rule** — graduated ruler divider (minor ticks ink-3, majors every 5th in amber); once per screen, major breaks only. **M-C Inline** — 5px offset inner 1px contour; white = hover/focus, amber = featured/static.
- **Backgrounds:** flat black + optional faint 64px drafting grid (`.bg-grid`, white @ 2.6%). No gradients, no photography treatments defined; thumbs/placeholders use repeating 135° hatch stripes (#0E0E0E/#121212).
- **Borders:** 1px hairlines everywhere; grids show 1px gaps by giving the wrapper `background:rule-soft; gap:1px`.
- **Shadows:** none. Flat panels only; the sole inset is a 1px white@10% ring on color chips. Depth = surface steps (bg→panel→raise), not elevation.
- **Transparency/blur:** rgba white at .026 (grid), .22 (inline hover); topbar is `rgba(0,0,0,.92)` + `backdrop-filter:blur(14px)` — the only blur.
- **Motion:** `--m-snap 160ms steps(3)` for UI state (mechanical, stepped — not smooth), `--m-draw 340ms cubic-bezier(.16,1,.3,1)` for reveals, `--m-glitch 200ms` reserved for RGB-shift moments. Hovers: fill swaps (outline→filled), border lightens, arrow translates 4px, inline contour appears. No press states defined yet. Full `prefers-reduced-motion` kill.
- **Cards ("work" pattern):** 1px rule border → amber border on hover, chamfered, panel fill, hatched 16:10 thumb with index + status overlay, mono title, dim description, chamfered tags, amber "View build →".
- **Imagery:** none provided. Never put the mark on mid-tone photography without a solid plate; when photos arrive, expect dark, cool-neutral, amber-accented grading (TBD).

## ICONOGRAPHY
- **No icon set.** The brand deliberately uses unicode glyphs as icons: `→ ↗ ↘ ↓ ↑` (directional link/CTA glyphs — ↗ marks external/mail links on the live site), `●` (status dots, via CSS square/currentColor), `✓ ✗` (do/don't), `☐` (checklists). Status dots are 7px **squares**, not circles.
- **No emoji, ever.**
- **Logo assets are the only SVGs** (see `assets/`): wordmark (detailed + solid cuts, white/black/currentColor), `x` glyph mark (detailed + solid), favicon set, OG image, PNG ladder (200/400/800/1600).
- Wordmark size ladder: **140px+** full detail · **40–140px** solid cut · **<40px** `x` glyph only · absolute minimum full wordmark 90px.
- Clear space = cap height of the `x` on all sides.
- If pictographic icons are ever needed, source a 1–1.5px-stroke geometric mono set and confirm first — nothing is chosen yet.

## Components (from the kit — nothing invented)
`components/core/` — Button (outline/fill/ghost), Tag (+accent), Status (live/ok/idle), TickRule (h/v).
`components/surfaces/` — Panel (bordered chamfer + inline states), WorkCard, SpecHeader (case-study spec grid), SectionHead (numbered).
`components/site/` — Topbar (sticky blur nav), SiteFooter (tick rule + motto).
No form controls exist in the kit; none are built. **Intentional additions: none.**

## UI kits
`ui_kits/website/` — rtfx.space portfolio site: Home, Case study, Contact (click-through via `index.html`). Kit visual patterns + real content from the live site: six documented projects (REVd Cycling, Porsche Studio Portland, Shifting Realities, CBC Week, Club STFU, Generation Grace Church), four practice areas, tool tags (TouchDesigner, Pixera, Resolume, OSC, Python, FFmpeg, NDI, Companion, Generative AI), contact rtfxdesign@gmail.com · instagram.com/allengrabo.

## Index
- `styles.css` → imports `tokens/` (fonts, colors, typography, spacing, geometry, motion, base)
- `assets/` — all logo cuts + favicons + OG (filenames preserved from the export set)
- `guidelines/` — specimen cards (Design System tab)
- `components/{core,surfaces,site}/` — React primitives + per-directory card
- `ui_kits/website/` — site screens + interactive index
- `SKILL.md` — agent skill entry point

## CAVEATS
- **Fonts load from Google Fonts CDN** (`tokens/fonts.css` @import). No font binaries were provided — supply WOFF2s to self-host and I'll write real `@font-face` rules.
- UI-kit case imagery is **hotlinked from rtfx.space** (webp) — copy files into `assets/` for offline use if wanted.
- Press/active states and a pictographic icon set are undefined in v0.4 — flagged above, not invented. Live-site photography reads warm/amber-lit rooms on black, consistent with the palette.

## Local Studio

RTFX Studio is the local editing and publishing control surface for the portfolio. It is intentionally not exposed as a public admin page: it edits this checkout, prepares media with the local FFmpeg installation, commits changes to GitHub, validates a Netlify preview, and then publishes the static site.

1. Check out `main` and make sure it is current with GitHub.
2. Double-click `run-studio.bat`, or run `npm run studio`.
3. Open `http://localhost:3000`.
4. Use **Art Gallery** to add or remove work. Images become 1920 px WebP + JPEG; videos become 1080p H.264 MP4 with fast-start and a WebP poster.
5. Use **Projects** to edit project copy, replace a hero image, or prepare additional project media.
6. Use **Publish portfolio** when ready. Studio will refuse to publish from any branch other than `main`, refuse unrelated changes outside `site/`, push the site commit to GitHub, validate a Netlify draft URL, and then update `https://rtfx.space`.

Studio auto-detects FFmpeg from `FFMPEG_PATH`, the local HeavyM installation, or the system `PATH`. Run `npm test` for the local safety and API checks.
