"""Fetch an official Node runtime and verify its published SHA-256 before extraction."""
import argparse
import hashlib
import io
from pathlib import Path
import tarfile
import urllib.request
import zipfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--platform', choices=['darwin', 'win', 'linux'], required=True)
parser.add_argument('--arch', choices=['arm64', 'x64'], required=True)
parser.add_argument('--version', default='22.22.2')
args = parser.parse_args()
prefix = f'node-v{args.version}-{args.platform}-{args.arch}'
name = prefix + ('.zip' if args.platform == 'win' else '.tar.gz')
base = f'https://nodejs.org/dist/v{args.version}/'
with urllib.request.urlopen(base + 'SHASUMS256.txt', timeout=60) as response:
    expected = dict((line.split()[1], line.split()[0]) for line in response.read().decode().splitlines())[name]
with urllib.request.urlopen(base + name, timeout=120) as response:
    archive = response.read()
if hashlib.sha256(archive).hexdigest() != expected:
    raise RuntimeError('Node runtime SHA-256 mismatch')
root = Path('.release-runtime')
root.mkdir(exist_ok=True)
binary = 'node.exe' if args.platform == 'win' else 'node'
source = 'node.exe' if args.platform == 'win' else 'bin/node'
if args.platform == 'win':
    with zipfile.ZipFile(io.BytesIO(archive)) as files:
        payload = {binary: files.read(f'{prefix}/{source}'), 'LICENSE': files.read(f'{prefix}/LICENSE')}
else:
    with tarfile.open(fileobj=io.BytesIO(archive), mode='r:gz') as files:
        payload = {binary: files.extractfile(f'{prefix}/{source}').read(), 'LICENSE': files.extractfile(f'{prefix}/LICENSE').read()}
for filename, contents in payload.items():
    (root / filename).write_bytes(contents)
(root / binary).chmod(0o755)
print(f'Verified {name}')
