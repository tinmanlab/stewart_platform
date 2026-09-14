"""Publishing regressions: provenance, heading links, preview and error recovery."""
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import unittest
import subprocess
import tarfile
import tempfile
ROOT=Path(__file__).resolve().parents[1]
class Elements(HTMLParser):
    def __init__(self):super().__init__();self.ids=[];self.links=[];self.headings=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.append(a['id'])
        if 'href' in a:self.links.append(a['href'])
        if tag in ['h2','h3']:self.headings.append(a)
class Publishing(unittest.TestCase):
    def test_output_manifest_binds_every_file(self):
        m=json.loads((ROOT/'site/build.json').read_text())
        self.assertRegex(m['source_commit'],r'^[0-9a-f]{40}$')
        files={str(p.relative_to(ROOT/'site')) for p in (ROOT/'site').rglob('*') if p.is_file() and p.name!='build.json'}
        self.assertEqual(files,set(m['files_sha256']))
        for path,sha in m['files_sha256'].items():
            self.assertEqual(hashlib.sha256((ROOT/'site'/path).read_bytes()).hexdigest(),sha,path)
    def test_manifest_survives_pages_archive(self):
        # Mirror the filtering in the commit-pinned upload-pages-artifact action.
        manifest=json.loads((ROOT/'site/build.json').read_text())
        with tempfile.TemporaryDirectory() as folder:
            archive=Path(folder)/'pages.tar'
            subprocess.run(['tar','--dereference','--hard-dereference',
                '--directory',str(ROOT/'site'),'-cf',str(archive),
                '--exclude=.git','--exclude=.github','--exclude=.[^/]*','.'],check=True)
            with tarfile.open(archive) as pages:
                published={member.name.removeprefix('./') for member in pages if member.isfile()}
        self.assertEqual(set(manifest['files_sha256'])|{'build.json'},published,
            'Manifest must describe bytes retained by Pages packaging, not excluded local files')

    def test_readme_decoder_wait_is_bounded_and_keeps_evidence(self):
        from hosted_smoke import wait_for_loaded_image
        class Image:
            def __init__(self):self.calls=0
            def evaluate(self,expression,**options):
                self.calls+=1
                return {'loaded':self.calls>1,'source':'https://camo.example/preview.gif','width':720 if self.calls>1 else 0}
        image=Image()
        result=wait_for_loaded_image(image,timeout=1,poll_interval=0)
        self.assertTrue(result['loaded']);self.assertEqual(result['width'],720);self.assertEqual(image.calls,2)
    def test_readme_undecoded_image_does_not_pass(self):
        from hosted_smoke import wait_for_loaded_image
        class Image:
            def evaluate(self,expression,**options):return {'loaded':False,'source':'broken.gif','width':0}
        with self.assertRaisesRegex(AssertionError,'did not decode'):
            wait_for_loaded_image(Image(),timeout=0,poll_interval=0)
    def test_github_check_does_not_use_page_eval_polling(self):
        import inspect
        from hosted_smoke import check
        source=inspect.getsource(check)
        self.assertNotIn('gh.wait_for_function',source,
            'GitHub CSP rejects page-context eval used by Playwright wait_for_function')

    def test_headings_have_unique_targets(self):
        for p in (ROOT/'site/learn').glob('*.html'):
            doc=Elements();doc.feed(p.read_text())
            self.assertTrue(doc.headings,p.name)
            self.assertTrue(all(h.get('id') for h in doc.headings),p.name)
            self.assertEqual(len(doc.ids),len(set(doc.ids)),p.name)
            for link in doc.links:
                if link.startswith('#'):self.assertIn(link[1:],doc.ids,p.name)
    def test_small_real_preview(self):
        p=ROOT/'site/media/lab-preview.gif'
        self.assertTrue(p.read_bytes().startswith((b'GIF87a',b'GIF89a')))
        self.assertLess(p.stat().st_size,4_000_000)
        self.assertTrue((ROOT/'site/media/lab-preview.png').is_file())
    def test_readme_is_a_short_experiment_entry(self):
        text=(ROOT/'README.md').read_text()
        self.assertLess(len(text.split()),750)
        self.assertIn('lab-preview.gif',text)
        self.assertIn('prefers-reduced-motion',text)
        for lesson in ['ik','fk','compliance','gravity','passive']:self.assertIn('?demo='+lesson,text)
        self.assertEqual(text.count('docs/media/anatomy.svg'),1)
    def test_unknown_paths_have_a_recovery_page(self):
        text=(ROOT/'site/404.html').read_text()
        self.assertIn('Open the simulator',text)
        self.assertIn('https://tinmanlab.github.io/stewart_platform/',text)
if __name__=='__main__':unittest.main()
