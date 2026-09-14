"""Check the generated website and documentation links without external services."""
from __future__ import annotations
import hashlib
import json
from html.parser import HTMLParser
from pathlib import Path
import re
import subprocess
import unittest
from urllib.parse import unquote,urlsplit
import xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
SITE=ROOT/'site'
class Links(HTMLParser):
    def __init__(self):super().__init__();self.links=[];self.images=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        self.links.extend(a[k] for k in ['href','src','poster'] if k in a)
        if tag=='img':self.images.append(a)
class EducationalSite(unittest.TestCase):
    def test_required_entry_points(self):
        for name in ['index.html','ko/index.html','learn/index.html','learn/START_HERE.html','learn/EXPERIMENTS.html','learn/GALLERY.html','learn/THEORY.html','learn/REFERENCES.html','learn/VALIDATION.html','build.json','LICENSE']:
            self.assertTrue((SITE/name).is_file(),name)
    def test_local_site_links_and_alt_text(self):
        for page in SITE.rglob('*.html'):
            if 'ko' in page.parts:continue # Immutable historical UI is not a maintained doc.
            parsed=Links();parsed.feed(page.read_text())
            for image in parsed.images:self.assertTrue(image.get('alt','').strip(),str(page))
            for url in parsed.links:
                path=urlsplit(url)
                if path.scheme or path.netloc or not path.path:continue
                target=(page.parent/unquote(path.path)).resolve()
                self.assertTrue(target.is_relative_to(SITE.resolve()),str(target))
                self.assertTrue(target.exists(),f'{page.name}: missing {url}')
    def test_readme_local_links(self):
        text=(ROOT/'README.md').read_text()
        urls=re.findall(r'\]\(([^)]+)\)|(?:href|src)="([^"]+)"',text)
        for a,b in urls:
            u=urlsplit(a or b)
            if not u.scheme and not u.netloc and u.path:
                self.assertTrue((ROOT/unquote(u.path)).exists(),a or b)
    def test_build_binding_and_no_external_app_dependencies(self):
        m=json.loads((SITE/'build.json').read_text())
        self.assertEqual(hashlib.sha256((SITE/'index.html').read_bytes()).hexdigest(),m['english_html_sha256'])
        for path,digest in m['source_sha256'].items():self.assertEqual(hashlib.sha256((ROOT/path).read_bytes()).hexdigest(),digest)
        text=(SITE/'index.html').read_text()
        self.assertNotRegex(text,r'<script[^>]+src=')
        self.assertNotRegex(text,r'/\*__[A-Z]+__\*/')
    def test_original_diagram_accessibility(self):
        for path in (ROOT/'docs/media').glob('*.svg'):
            root=ET.fromstring(path.read_text());ns={'s':'http://www.w3.org/2000/svg'}
            self.assertIsNotNone(root.find('s:title',ns),path.name)
            self.assertIsNotNone(root.find('s:desc',ns),path.name)
    def test_recorded_videos_have_captions_and_duration(self):
        for name in ['01-ik-fk','02-compliance','03-passive']:
            self.assertTrue((SITE/'media'/(name+'.vtt')).read_text().startswith('WEBVTT'))
            for extension in ['.webm','.mp4']:
                video=SITE/'media'/(name+extension)
                self.assertTrue(video.is_file(),str(video))
                info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','json',str(video)],text=True))
                self.assertAlmostEqual(float(info['format']['duration']),12,places=2)
if __name__=='__main__':unittest.main()
