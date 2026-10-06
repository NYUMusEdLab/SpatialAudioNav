#!/usr/bin/env python3
"""Emit Git tree payloads; does not publish or change the working tree."""
import json
from pathlib import Path
import subprocess
import sys

RUNTIME = {'index.html', 'script.js', 'styles.css', 'js', 'audio', 'images', 'favicon.ico'}


def git(*args):
    return subprocess.check_output(['git', *args], text=True)


def snapshot(ref, label, participation=False):
    runtime = {'participation.html', 'participation.css', 'js', 'audio', 'images', 'favicon.ico'} if participation else RUNTIME
    entrypoint = 'participation.html' if participation else 'index.html'
    entries = []
    for entry in git('ls-tree', ref).splitlines():
        info, path = entry.split('\t', 1)
        mode, kind, sha = info.split()
        if path in runtime:
            entries.append(dict(path=path, mode=mode, type=kind, sha=sha))
    assert {entry['path'] for entry in entries} == runtime, 'Missing runtime asset'
    html = git('show', f'{ref}:{entrypoint}')
    banner = '''<nav aria-label="Preview navigation" style="position:fixed;bottom:0;left:0;right:0;z-index:10000;min-height:36px;padding:9px 12px;box-sizing:border-box;background:#13202c;color:#e5ebf0;font:12px system-ui;text-align:center;border-top:1px solid #47586a">LABEL · <a href="../" style="color:#b8e6f5">Compare previews</a> · <a href="../../" style="color:#b8e6f5">Preserved original</a></nav>'''.replace('LABEL', label)
    assert '</body>' in html
    index = next(entry for entry in entries if entry['path'] == entrypoint)
    index['path'] = 'index.html'
    index.pop('sha')
    index['content'] = html.replace('</body>', banner + '\n</body>')
    return entries


if __name__ == '__main__':
    if len(sys.argv) in (3, 4) and sys.argv[1] == '--participation':
        ref = sys.argv[2]
        version = sys.argv[3] if len(sys.argv) == 4 else '03-listen-explore-mix'
        if version not in {'03-listen-explore-mix', '04-brief-accents', '05-room-navigation'}:
            raise SystemExit('Unknown participation preview version')
        label = f'Preview {version[:2]}'
        print(json.dumps({
            version: snapshot(ref, label, participation=True),
            'index.html': Path(__file__).with_name('preview-index.html').read_text(),
            'source_trees': {version: git('rev-parse', f'{ref}^{{tree}}').strip()},
        }))
        raise SystemExit(0)
    if len(sys.argv) != 3:
        raise SystemExit('Usage: build-preview-payload.py PLAYBACK_REF ENGINEER_REF | --participation SOURCE_REF [VERSION]')
    playback, engineer = sys.argv[1:]
    print(json.dumps({
        '01-playback': snapshot(playback, 'Preview 01 · Playback'),
        '02-engineer': snapshot(engineer, 'Preview 02 · Engineer'),
        'index.html': Path(__file__).with_name('preview-index.html').read_text(),
        'source_trees': {key: git('rev-parse', f'{ref}^{{tree}}').strip()
                         for key, ref in [('01-playback', playback), ('02-engineer', engineer)]},
    }))
