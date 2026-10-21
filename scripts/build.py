#!/usr/bin/env python3
"""Build the portable root page from editable dist sources (no external packages)."""
import base64,json,pathlib,re
repo=pathlib.Path(__file__).resolve().parents[1]
root=repo/'dist'
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
surface_code='\n'.join((root/name).read_text().replace('export ','') for name in ['surface-materials.js','surface-editor.js'])
app=re.sub(r'^import .*?;\n','',(root/'app.js').read_text(),flags=re.M)
js='(()=>{const THREE=(()=>{'+three+'})();const OrbitControls=(()=>{'+orbit+'})();'+format_code+'\n'+surface_code+'\n'+walk_code+'\n'+app+'})();'
css='\n'.join(line for line in (root/'style.css').read_text().splitlines() if not line.startswith('@import'))
html=(root/'index.html').read_text().replace('<link rel="stylesheet" href="style.css">','<style>'+css+'</style>')
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
