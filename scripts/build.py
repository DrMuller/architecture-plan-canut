#!/usr/bin/env python3
"""Build the portable root page from editable dist sources (no external packages)."""
import base64,hashlib,json,pathlib,re
repo=pathlib.Path(__file__).resolve().parents[1]
root=repo/'dist'
# Version local modules too: WebViews may otherwise keep stale module responses.
local_sources=sorted(root.glob('*.js'))+[root/'style.css',root/'index.html']
normalize=lambda text:re.sub(r'\?v=[0-9a-f]{12}', '', text)
version=hashlib.sha256(''.join(normalize(p.read_text()) for p in local_sources).encode()).hexdigest()[:12]
for source in root.glob('*.js'):
    text=normalize(source.read_text())
    updated=re.sub(r"from '(\./[^/'?]+\.js)'",lambda m:"from '"+m[1]+"?v="+version+"'",text)
    if source.read_text()!=updated:source.write_text(updated)
entry=root/'index.html'
text=normalize(entry.read_text())
text=re.sub(r'((?:src|href)=")((?:app|shared-sync)\.js|style\.css)(")',lambda m:m[1]+m[2]+'?v='+version+m[3],text)
if entry.read_text()!=text:entry.write_text(text)
three=(root/'vendor/three.module.js').read_text()
match=re.search(r'export\s*\{([^}]+)\};?\s*$',three)
assert match,'Three.js export block missing'
entries=[]
for entry in match.group(1).split(','):
    parts=entry.strip().split(' as ')
    entries.append(parts[1]+':'+parts[0] if len(parts)==2 else parts[0])
three=three[:match.start()]+'\nreturn {'+','.join(entries)+'};'
orbit=(root/'vendor/OrbitControls.js').read_text()
orbit=re.sub(r"import\s*\{([^}]+)\}\s*from 'three';",r'const {\1}=THREE;',orbit)
orbit=re.sub(r'export\s*\{\s*OrbitControls\s*\};?','return OrbitControls;',orbit)
format_code=(root/'design-format.js').read_text().replace('export ','')
walk_code=re.sub(r'^import .*?;\n','',(root/'walkthrough.js').read_text(),flags=re.M).replace('export ','')
surface_code='\n'.join(re.sub(r'^import .*?;\n','',(root/name).read_text(),flags=re.M).replace('export ','') for name in ['surface-materials.js','surface-editor.js','furniture-models.js'])
app=re.sub(r'^import .*?;\n','',(root/'app.js').read_text(),flags=re.M)
js='(()=>{const THREE=(()=>{'+three+'})();const OrbitControls=(()=>{'+orbit+'})();'+format_code+'\n'+surface_code+'\n'+walk_code+'\n'+app+'})();'
css='\n'.join(line for line in (root/'style.css').read_text().splitlines() if not line.startswith('@import'))
html=normalize((root/'index.html').read_text()).replace('<link rel="stylesheet" href="style.css">','<style>'+css+'</style>')
html=re.sub(r'<script type="importmap">.*?</script>','',html)
image='data:image/png;base64,'+base64.b64encode((root/'plan.png').read_bytes()).decode()
html=html.replace('src="plan.png"','src="'+image+'"')
html=html.replace('<script type="module" src="app.js"></script>','<script>'+js.replace('</script','<\\/script')+'</script>')
session_code=(root/'shared-session.js').read_text().replace('export ','')
sync_code=re.sub(r'^import .*?;\n','',(root/'shared-sync.js').read_text(),flags=re.M)
html=html.replace('<script type="module" src="shared-sync.js"></script>','<script>'+session_code+sync_code+'</script>')
for name in ['shared-config.js']:
    if (root/name).exists():html=html.replace('<script src="'+name+'"></script>','<script>'+(root/name).read_text().replace('</script','<\\/script')+'</script>')
(repo/'index.html').write_text(html)
print('Built index.html from dist sources.')
