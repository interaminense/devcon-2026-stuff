"""Inlines the screenshots of today's blog page into the proposal."""

import base64
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).parent
SHOTS = pathlib.Path(sys.argv[1])
MIME = {'.jpg': 'image/jpeg', '.png': 'image/png'}


def inline(match):
	path = SHOTS / match.group(1)

	return f'data:{MIME[path.suffix]};base64,{base64.b64encode(path.read_bytes()).decode()}'


page = re.sub(r'\{\{([\w.-]+)\}\}', inline, (HERE / 'template.html').read_text())
(HERE / 'blog-cx-refresh.html').write_text(page)
print(len(page))
