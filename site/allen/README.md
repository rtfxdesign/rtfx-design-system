# allen.rtfx.space — link page

Single-page, self-hosted "linktree" for QR codes and NFC tags. Lives at
`site/allen/` so it deploys with the main Netlify site as `rtfx.space/allen/`.

## Files
- `index.html` — the page. Loads the shared `css/site.css` by absolute URL (so it works at the subdomain root), reuses the site topbar/footer, and arms the X-Route hover on each link row with a small inline script. Photo is desaturated at rest and saturates on hover. The name is a particle field (`js/field.js`, `data-align="center"`). From 900px the page is two columns: identity left, actions right.
- `allen.webp` / `allen.jpg` — headshot, 480×480 (from the 1011px PNG master; WebP first, JPEG fallback).
- `aeg-sig-white.png` — signature, cropped to the ink.
- `rtfx-wordmark-white.svg` — logo (copied from `/assets`).
- `files/allen_grabo.vcf` — "Add contact to phone" card (name, title, cell, email, URLs, IG, YT). CRLF line endings.
- `files/allen_rtfx_space_qr.svg` / `_2048.png` — QR, black on white, for print.
- `files/allen_rtfx_space_qr_onblack.svg` / `_2048.png` — QR, white on black, for screens.
  All four encode `https://allen.rtfx.space/` (version 3, ECC level Q).

## Editing links
Each link is one `<li><a class="ai">` in `index.html`. Keep exactly one `.fill`
(the amber row) per page. Glyphs: `↗` external, `↓` download.
`rtfx.space/resume/` is a 302 in `netlify.toml` to `assets/allen-grabo-resume.pdf`.

## Making allen.rtfx.space live (one-time, manual)
1. Netlify → the rtfx.space site → Domain management → Add domain alias
   `allen.rtfx.space`.
2. Cloudflare → rtfx.space DNS → add `CNAME allen → <site-name>.netlify.app`,
   proxy OFF (grey cloud) so Netlify can issue the certificate.
3. The rule in `netlify.toml` (`https://allen.rtfx.space/* → /allen/:splat`,
   status 200) then serves this folder at the subdomain root.
   Until then the page is reachable at `https://rtfx.space/allen/`.

## Regenerating the QR
```
pip install segno
python3 -c "import segno;q=segno.make('https://allen.rtfx.space/',error='q');q.save('files/allen_rtfx_space_qr.svg',scale=12,border=4)"
```

## NFC
Write a single NDEF URI record `https://allen.rtfx.space/` with NFC Tools
(iOS/Android). NTAG213 (144 bytes) is enough; lock the tag after writing.
