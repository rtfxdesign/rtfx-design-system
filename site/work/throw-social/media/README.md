# Throw Social — media drop folder

The page references these EXACT filenames from your Drive `throwsocial` folder.
Copy them here (compress first — see below):

Videos (compress to ≤15MB each: 1080p, H.264, ~4Mbps, strip audio):
- thrill09.mp4   (hero)
- resolume07.mp4, resolume08.mp4, resolume09.mp4   (playback section)
- thrill01.mp4, thrill05.mp4, thrill07.mp4, thrill10.mp4   (live section)

Images (export as compressed PNG/WebP ≤500KB, keep the same filename):
- IMG_3778.png   (LED screen-config screenshot)
- Untitled-20251229-223959-0406-2x.png   (content frame)
- Screenshot 2025-12-29 222946.png   (playback layout)

Also add: og.webp — 1200×630 crop of a thrill clip frame, used as the share image.
(_pending-poster.png and the three placeholder PNGs here are stand-ins — overwrite/delete freely.)

FFmpeg one-liner per video:
ffmpeg -i IN.mp4 -vf scale=-2:1080 -c:v libx264 -crf 26 -preset slow -an -movflags +faststart OUT.mp4
