"""The maintained experience must be English; the Korean release is immutable."""
import hashlib
import sys
import re
import unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from build import korean_original
class EnglishRelease(unittest.TestCase):
    def test_english_source(self):
        for p in (ROOT / 'src').iterdir():
            with self.subTest(path=p.name):
                self.assertIsNone(re.search('[\uac00-\ud7a3\u3400-\u9fff]', p.read_text()), 'Untranslated source: '+p.name)
    def test_document_language(self):
        self.assertIn('<html lang="en">', (ROOT/'src/shell.html').read_text())
    def test_original_preserved(self):
        self.assertEqual(hashlib.sha256(korean_original()).hexdigest(), 'a9e3ed420a902c0c6dc24a87596c380c4cb9d63280104ad7cd2a389d8cfdc870')
if __name__ == '__main__': unittest.main()
