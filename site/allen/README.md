# allen.rtfx.space — link page

Single-page, self-hosted "linktree" for QR codes and NFC tags. Lives at
`site/allen/` so it deploys with the main Netlify site as `rtfx.space/allen/`.

## Files
- `index.html` — the page. Tokens are inlined; no JS; fonts from Google Fonts.
- `rtfx-wordmark-white.svg`, `rtfx-mark-x-white.svg` — logo cuts (copied from `/assets`).
- `files/allen_grabo.vcf` — "Save contact" card (name, org, email, URLs, IG, YT).
- `files/allen_rtfx_space_qr.svg` / `_2048.png` — QR, black on white, for print.
- `files/allen_rtfx_space_qr_onblack.svg` / `_2048.png` — QR, white on black, for screens.
  All four encode `https://allen.rtfx.space/` (version 3, ECC level Q).

## Editing links
Each link is one `<li>` in `index.html`. Keep exactly one `.lk--primary`
(the amber card) per page. Glyphs: `→` internal, `↗` external/mail, `↓` download.

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
