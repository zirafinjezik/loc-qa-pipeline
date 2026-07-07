"""Unit tests for convert_language_code. Run: python -m unittest scripts.test_convert -v
(or from scripts/: python -m unittest test_convert)"""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(__file__))
from convert_language_code import convert_language_code

SAMPLE = os.path.join(os.path.dirname(__file__), "sample.tmx")

TINY = (
    '<?xml version="1.0" encoding="utf-8"?>\n'
    '<tmx version="1.4"><header srclang="en-US" adminlang="en-US" o-tmf="x"/>\n'
    "<body>\n"
    '<tu><tuv xml:lang="en-US"><seg>Hello</seg></tuv>'
    '<tuv xml:lang="de-DE"><seg>Hallo</seg></tuv></tu>\n'
    "<tu><tuv xml:lang='en-US'><seg>Bye</seg></tuv>"
    '<tuv xml:lang="de-DE"><seg>Tschüss</seg></tuv></tu>\n'
    "</body></tmx>\n"
)


class TestConvert(unittest.TestCase):
    def test_counts_and_targets_only_matching_values(self):
        out, count = convert_language_code(TINY, "en-US", "en-GB")
        # header srclang + adminlang + two tuv xml:lang
        self.assertEqual(count, 4)
        self.assertNotIn("en-US", out)
        self.assertEqual(out.count("en-GB"), 4)
        # untouched language stays
        self.assertEqual(out.count("de-DE"), 2)

    def test_single_quoted_attributes_are_converted(self):
        out, _ = convert_language_code(TINY, "en-US", "en-GB")
        self.assertIn("xml:lang='en-GB'", out)

    def test_everything_else_is_byte_identical(self):
        out, _ = convert_language_code(TINY, "en-US", "en-GB")
        self.assertEqual(out.replace("en-GB", "en-US"), TINY)

    def test_no_match_returns_zero_and_unchanged_text(self):
        out, count = convert_language_code(TINY, "fr-FR", "fr-CA")
        self.assertEqual(count, 0)
        self.assertEqual(out, TINY)

    def test_code_in_segment_text_is_not_touched(self):
        doc = '<header srclang="en-US"/><seg>Set locale to en-US in settings.</seg>'
        out, count = convert_language_code(doc, "en-US", "en-GB")
        self.assertEqual(count, 1)
        self.assertIn("Set locale to en-US in settings.", out)

    def test_prefix_codes_do_not_partial_match(self):
        doc = '<tuv xml:lang="en-USX"><seg>x</seg></tuv>'
        out, count = convert_language_code(doc, "en-US", "en-GB")
        self.assertEqual(count, 0)
        self.assertEqual(out, doc)

    def test_sample_file_round_trip(self):
        with open(SAMPLE, encoding="utf-8") as f:
            content = f.read()
        out, count = convert_language_code(content, "en-US", "en-GB")
        self.assertGreater(count, 0)
        self.assertEqual(out.replace("en-GB", "en-US"), content)


if __name__ == "__main__":
    unittest.main()
