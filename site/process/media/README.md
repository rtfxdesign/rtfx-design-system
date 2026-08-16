# Process page — media drop folder

Export your screen recordings with THESE names (≤15MB each: 1080p H.264, ~4Mbps, no audio):
- pixera-01.mp4      Pixera mapping session
- pixera-02.mp4      Pixera outputs / screen config
- companion-01.mp4   Companion / Stream Deck button logic
- resolume-01.mp4    Resolume composition build
- resolume-02.mp4    Resolume live layer / effects
- ae-01.mp4          After Effects loop build
- td-01.mp4          TouchDesigner network
- art-01.mp4         A finished piece (output reel)

Plus og.webp (1200×630 share image).
Add more clips? Duplicate a <figure class="vid"> block in ../index.html and name the file <tool>-NN.mp4.
ffmpeg: ffmpeg -i IN -vf scale=-2:1080 -c:v libx264 -crf 26 -preset slow -an -movflags +faststart OUT.mp4
