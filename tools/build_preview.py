"""The README hero is the real ball experiment, not a decorative animation."""
from pathlib import Path
import json,shutil,subprocess
ROOT=Path(__file__).resolve().parents[1];MEDIA=ROOT/'docs/media'
def build():
    video=MEDIA/'04-ball.mp4'
    if not video.is_file():raise FileNotFoundError('Run tools/record_demos.py first; a real ball recording is required')
    shutil.copyfile(video,MEDIA/'lab-preview.mp4');shutil.copyfile(MEDIA/'04-ball.vtt',MEDIA/'lab-preview.vtt')
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(video),'-filter_complex','fps=8,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle','-loop','0',str(MEDIA/'lab-preview.gif')],check=True,timeout=90)
    shutil.copyfile(MEDIA/'04-ball.png',MEDIA/'lab-preview.png')
    size=(MEDIA/'lab-preview.gif').stat().st_size
    if size>4_000_000:raise ValueError('Hero exceeds 4 MB budget')
    (ROOT/'artifacts').mkdir(exist_ok=True);(ROOT/'artifacts/preview.json').write_text(json.dumps({'input':'04-ball.mp4 actual contact/control simulation','gif_bytes':size,'duration_s':12,'edited_playback':True},indent=2));print('Ball hero:',size,'bytes')
if __name__=='__main__':build()
