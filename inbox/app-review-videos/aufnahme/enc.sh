set -e
D=/Users/domi/Marketing-Maschine/content/inbox/app-review-videos
VF="scale=1920:1200:flags=lanczos,fps=30,format=yuv420p,setsar=1"
ENC="-c:v libx264 -preset slow -crf 22 -profile:v high -pix_fmt yuv420p -an -video_track_timescale 15360 -movflags +faststart"
ffmpeg -v error -y -i out/raw/v1.webm -ss 0.2 -vf "$VF" $ENC $D/teile/v1-A-vorher.mp4
ffmpeg -v error -y -i out/raw/v1c.webm -ss 4.5 -vf "$VF" $ENC $D/teile/v1-C-nachher.mp4
ffmpeg -v error -y -i out/raw/v2.webm -ss 0.2 -vf "$VF" $ENC $D/Meta-Review-2-whatsapp_business_management.mp4
ffmpeg -v error -y -i out/raw/v2.webm -ss 0.2 -to 91.0 -vf "$VF" $ENC $D/teile/v2-A-bis-Schritt6.mp4
ffmpeg -v error -y -i out/raw/v2.webm -ss 91.0 -vf "$VF" $ENC $D/teile/v2-C-ab-Schritt7.mp4
for f in $D/*.mp4 $D/teile/*.mp4; do echo "$(basename $f) $(ffprobe -v error -show_entries format=duration -of csv=p=0 $f)s $(du -h $f|cut -f1)"; done
