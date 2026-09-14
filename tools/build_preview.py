"""Create a lightweight, automatic README preview from the three real recordings.

No synthetic motion: each four-second segment is a 3x edit of a recorded lesson.
FFmpeg is already used by record_demos.py; no additional Python dependency.
"""
from pathlib import Path
import json
import subprocess
import tempfile
ROOT = Path(__file__).resolve().parents[1]
MEDIA = ROOT/'docs/media'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
SCENES = [
    ('01-ik-fk', ['01  MOVE', 'Pose to leg lengths', 'Six motors cooperate.', 'IK + PD tracking', 'Then solve FK back', 'to a platform pose.']),
    ('02-compliance', ['02  PUSH', 'A robot can yield', '16 N / 800 N per m', '= 20 mm at rest', 'Release the force.', 'Watch it recover.']),
    ('03-passive', ['03  COMPARE', 'Motors or springs?', 'Gravity compensation', 'supports the weight.', 'Passive joints use', 'stiffness + damping.']),
]

def command(args):
    subprocess.run(['ffmpeg','-y','-loglevel','error',*args],check=True)

def build():
    with tempfile.TemporaryDirectory(prefix='stewart-preview-') as td:
        tmp=Path(td)
        for index,(name,lines) in enumerate(SCENES):
            filters=['setpts=PTS/3','fps=10','crop=1066:620:0:66','scale=600:350:flags=lanczos','pad=960:540:20:146:color=0xf1f6f5']
            labels=[('STEWART PLATFORM LAB',32,27,30,BOLD,'0x142f3d'),('Move it. Push it. Understand the response.',32,73,20,FONT,'0x42636a'),('Actual physics recordings / edited playback / not a speed benchmark',32,513,13,FONT,'0x526a72')]
            for j,line in enumerate(lines):
                labels.append((line,646,151+j*46,22 if j<2 else 17,BOLD if j<2 else FONT,'0x086f66' if j==0 else '0x163440'))
            for i,(text,x,y,size,font,color) in enumerate(labels):
                textfile=tmp/f'text-{index}-{i}.txt';textfile.write_text(text)
                filters.append(f'drawtext=fontfile={font}:textfile={textfile}:x={x}:y={y}:fontsize={size}:fontcolor={color}')
            command(['-i',str(MEDIA/(name+'.mp4')),'-vf',','.join(filters),'-an','-c:v','libx264','-pix_fmt','yuv420p',str(tmp/f'{index}.mp4')])
        (tmp/'concat.txt').write_text(''.join(f"file '{tmp/i}'\n" for i in ['0.mp4','1.mp4','2.mp4']))
        command(['-f','concat','-safe','0','-i',str(tmp/'concat.txt'),'-c','copy','-movflags','+faststart',str(MEDIA/'lab-preview.mp4')])
        command(['-i',str(MEDIA/'lab-preview.mp4'),'-filter_complex','fps=10,scale=840:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3','-loop','0',str(MEDIA/'lab-preview.gif')])
        command(['-ss','2','-i',str(MEDIA/'lab-preview.mp4'),'-frames:v','1',str(MEDIA/'lab-preview.png')])
    size=(MEDIA/'lab-preview.gif').stat().st_size
    if size>4_000_000:
        raise ValueError(f'README preview exceeds 4 MB budget: {size}')
    report={'input':'three real browser recordings','editing':'each clip condensed 3x; not a runtime benchmark','gif_bytes':size,'dimensions':[840,472]}
    (ROOT/'artifacts').mkdir(exist_ok=True)
    (ROOT/'artifacts/preview.json').write_text(json.dumps(report,indent=2))
    print('Built README preview:',size,'bytes')

if __name__=='__main__':build()
