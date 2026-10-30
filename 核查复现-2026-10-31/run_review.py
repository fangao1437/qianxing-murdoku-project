"""Usage: python run_review.py REPO_ROOT EMPTY_OUTPUT_DIR. Requires git/lua/node."""
import pathlib,sys,subprocess,json,urllib.request,statistics,hashlib
repo=pathlib.Path(sys.argv[1]).resolve();root=pathlib.Path(sys.argv[2]).resolve();here=pathlib.Path(__file__).resolve().parent
if root.exists() and any(root.iterdir()): raise SystemExit('Output directory must be empty')
root.mkdir(parents=True,exist_ok=True)
prefix='成果-家具教程与性能-584至588-2026-10-29'
def run(args,cwd,timeout=120):return subprocess.run(args,cwd=cwd,capture_output=True,timeout=timeout)
def text(p):return (p.stdout+p.stderr).decode('utf8','replace')
def save(n,x):(root/n).write_text(json.dumps(x,ensure_ascii=False,indent=2),encoding='utf8')
reg={};bound={};samples={'before':{},'after':{}}
for label,rev in [('before','738183b2944d8c1c1a036cc334c891996f611e5a'),('after','5e53156341a1300f4cf2dab19d41dff478c97033')]:
 base=root/label;base.mkdir();p=run(['git','ls-tree','-rz','--name-only',rev,'--',*[prefix+'/'+d for d in ['lua','tests','tools','dist']]],repo);assert p.returncode==0,text(p)
 for name in p.stdout.decode().strip('\0').split('\0'):
  dest=base/pathlib.PurePosixPath(name).relative_to(prefix);dest.parent.mkdir(parents=True,exist_ok=True);p=run(['git','show',rev+':'+name],repo);assert p.returncode==0,text(p);dest.write_bytes(p.stdout)
 rows=[]
 for f in sorted((base/'tests').glob('*.lua')):
  p=run(['lua',str(f.relative_to(base))],base,30);s=text(p);rows.append({'name':f.name,'exit':p.returncode,'fail_lines':[x for x in s.splitlines()if '[FAIL]'in x or 'stack traceback'in x],'output':s})
 old=(base/'dist/client_script.lua').read_bytes();p=run(['lua','tools/bundle_client_script.lua'],base);new=(base/'dist/client_script.lua').read_bytes()
 reg[label]={'tests':rows,'bundle':{'exit':p.returncode,'output':text(p),'exact_equal':old==new,'normalized_equal':old.replace(b'\r\n',b'\n')==new.replace(b'\r\n',b'\n'),'original_sha256':hashlib.sha256(old).hexdigest()}}
 p=run(['lua',str(here/'boundary.lua')],base);assert p.returncode==0,text(p);bound[label]={'exit':p.returncode,'output':text(p)}
save('regression-results.json',reg)
a=bound['before']['output'].splitlines();b=bound['after']['output'].splitlines();assert len(a)==len(b)
save('boundary-results.json',{'runs':bound,'line_counts':[len(a),len(b)],'differences':[{'before':x,'after':y}for x,y in zip(a,b)if x!=y]})
for i in range(5):
 for label in (['before','after']if i%2==0 else ['after','before']):
  p=run(['lua',str(here/'bench.lua')],root/label);assert p.returncode==0,text(p)
  for line in p.stdout.decode().splitlines():
   n,u,b=line.split('|');samples[label].setdefault(n,[]).append({'us':float(u),'bytes':float(b)})
summary={n:{label:{'median_us':statistics.median(x['us']for x in samples[label][n]),'median_bytes':statistics.median(x['bytes']for x in samples[label][n])}for label in samples}for n in samples['before']}
save('benchmark-results.json',{'summary':summary,'samples':samples,'rounds':5,'iterations':100000,'allocation_iterations':10000,'pieces':5,'runtime':text(run(['lua','-v'],root))})
u='https://raw.githubusercontent.com/fangao1437/qianxing-murdoku-tool/01dc1aa565c1980df11480f719b323f6703a1087/dsh-plugin-qianxing-art-pipeline/src/compress.js'
(root/'compress.js').write_bytes(urllib.request.urlopen(u,timeout=30).read());p=run(['node',str(here/'compress-check.cjs'),str(root/'compress.js'),str(root/'compression-results.json')],root,240);assert p.returncode==0,text(p)
print('Completed. Inspect regression failures and boundary differences; not a blanket pass.')
