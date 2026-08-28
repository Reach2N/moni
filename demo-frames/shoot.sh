#!/bin/zsh
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
D=/Users/mense/moni/demo-frames
for f in "$@"; do
  "$CH" --headless=new --disable-gpu --allow-file-access-from-files --hide-scrollbars --force-device-scale-factor=2 \
    --window-size=1080,1440 --screenshot="$D/out/$f.png" "file://$D/build/$f.html" 2>/dev/null
done
echo "shot: $@"
