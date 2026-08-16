# Grace Church — media drop folder

The page references these EXACT filenames from your Drive `GraceChurch` folder.
Copy compressed exports here:

Videos (transcode, keep the same filename; ≤15MB: 1080p H.264, ~4Mbps, no audio):
- 20241126_210141000_iOS.MOV   (install week)
- 20241218_034627000_iOS.MOV   (commissioning night)
- IMG_7499.mov   (system running)

Images:
- IMG_6896.JPEG   (drop as-is or recompress ≤500KB)
- 20241127_011558312_iOS.jpg   (export the .dng of the same name as JPEG)

ffmpeg: ffmpeg -i IN -vf scale=-2:1080 -c:v libx264 -crf 26 -preset slow -an -movflags +faststart OUT
Captions on the page are dated from file timestamps — fix any that misread the content.
(_pending-poster.png + placeholder images are stand-ins; overwrite freely.)
