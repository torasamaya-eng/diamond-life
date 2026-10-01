"""Reproducible Wikipedia draft cohort extraction; no game imports or writes.

HTML cache and per-player evidence go to reports/. Missing totals are errors,
never silently treated as zero. Recent/active careers are flagged separately.
"""
import concurrent.futures, hashlib, json, re, time, urllib.parse
import requests
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / 'reports/draft11-wiki-cache'
CACHE.mkdir(parents=True, exist_ok=True)
UA = 'DiamondLifeResearch/1.0 (local historical draft distribution study)'

def fetch(title):
    url = 'https://ja.wikipedia.org/wiki/' + urllib.parse.quote(title)
    path = CACHE / (hashlib.sha256(title.encode()).hexdigest() + '.html')
    if path.exists(): return path.read_text(encoding='utf-8'), url
    for attempt in range(3):
        try:
            response = requests.get(url, headers={'User-Agent': UA}, timeout=35)
            response.raise_for_status(); html = response.content.decode('utf-8')
            path.write_text(html, encoding='utf-8')
            return html, url
        except Exception as error:
            # Missing pages and throttling are evidence gaps, not retry targets.
            if isinstance(error,requests.HTTPError) and error.response.status_code in (403,404,429): raise
            if attempt == 2: raise
            time.sleep(2 + attempt * 2)

class Tables(HTMLParser):
    def __init__(self):
        super().__init__(); self.tables=[]; self.depth=0; self.cell=None; self.heading=None; self.context=''; self.skip=0
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag in ('h2','h3','h4'): self.heading=[]
        if tag=='table':
            self.depth+=1
            if self.depth==1: self.table={'context':self.context,'rows':[]}; self.row=None
        if self.depth==1:
            if tag=='tr': self.row=[]
            if tag in ('td','th'):
                self.cell={'text':[],'links':[], 'rowspan':int(a.get('rowspan','1')), 'colspan':int(a.get('colspan','1'))}
            href=a.get('href','')
            if href.startswith('https://ja.wikipedia.org/wiki/'): href=href.replace('https://ja.wikipedia.org','',1)
            if tag=='a' and self.cell is not None and href.startswith(('/wiki/','./')):
                self.cell['links'].append(urllib.parse.unquote(href[6:] if href.startswith('/wiki/') else href[2:]).split('#')[0].split('?')[0])
            if tag=='sup': self.skip+=1
    def handle_data(self, text):
        if self.heading is not None: self.heading.append(text)
        if self.depth==1 and self.cell is not None and not self.skip: self.cell['text'].append(text)
    def handle_endtag(self, tag):
        if tag in ('h2','h3','h4') and self.heading is not None:
            self.context=''.join(self.heading).replace('[編集]','').strip(); self.heading=None
        if self.depth==1:
            if tag=='sup' and self.skip: self.skip-=1
            if tag in ('td','th') and self.cell is not None:
                self.cell['text']=re.sub(r'\s+','', ''.join(self.cell['text'])); self.row.append(self.cell); self.cell=None
            if tag=='tr' and self.row is not None: self.table['rows'].append(self.row); self.row=None
        if tag=='table':
            if self.depth==1: self.tables.append(self.table)
            self.depth-=1

def tables(html):
    p=Tables(); p.feed(html); return p.tables

def grid(table):
    rows=[]; spans={}
    for ri,raw in enumerate(table['rows']):
        row={k:v for (r,k),v in spans.items() if r==ri}; col=0
        for c in raw:
            while col in row: col+=1
            for dr in range(c['rowspan']):
                for dc in range(c['colspan']):
                    spans[(ri+dr,col+dc)]=c
                    if dr==0: row[col+dc]=c
            col+=c['colspan']
        rows.append([row.get(k,{'text':'','links':[]}) for k in range(max(row,default=-1)+1)])
    return rows

def cohort(year, development=False):
    title=f'{year}年度新人選手選択会議_(日本プロ野球)'; html,url=fetch(title); out=[]
    for tab in tables(html):
        raw=tab['rows']
        header=next((r for r in raw if any('選手名'==c['text'] for c in r)),None)
        if header is None: continue
        # Club tables only: excludes duplicated twelve-club overview grids.
        head=[c['text'] for c in header]
        ni=head.index('選手名'); pi=next((i for i,h in enumerate(head) if h in ('順位','指名順位')),None)
        if pi is None: continue
        phase=False
        for row in raw:
            if len(row)==1:
                phase='育成' in row[0]['text']; continue
            if len(row)<=ni: continue
            label=row[pi]['text']; dev='育成' in label or phase
            if dev!=development: continue
            if not re.search(r'\d',label) and '希望' not in label and '自由' not in label: continue
            if any('拒否' in c['text'] or '無効' in c['text'] for c in row): continue
            name=row[ni]['text']; links=row[ni]['links']
            if '選択権なし' in name or '選択終了' in name: continue
            if not links: raise ValueError(f'Missing player link: {year} {name}')
            rank=int(re.search(r'\d+',label).group()) if re.search(r'\d+',label) else 1
            out.append({'year':year,'name':name,'title':links[0],'rank':rank,'development':dev,'draftLabel':label,'draftUrl':url})
    if not out: raise ValueError(f'No cohort rows: {year} development={development}')
    return out

FIELDS={'試合':'games','登板':'games','打数':'ab','安打':'hits','二塁打':'doubles','三塁打':'triples','本塁打':'hr','四球':'bb','死球':'hbp','犠飛':'sf','勝利':'wins','セーブ':'saves','与四球':'bba','被安打':'ha','自責点':'er'}
def clean(s): return s.replace('丨','ー').replace(',','')
def num(s):
    s=clean(s)
    if s in ('--','-','---','----',''): return 0
    if not re.fullmatch(r'\d+(\.\d+)?',s): raise ValueError('Non-numeric count '+s)
    return float(s) if '.' in s else int(s)
def extract_stats(tab):
    g=grid(tab); head=next((r for r in g if any(c['text']=='年度' for c in r) and any(c['text'] in ('安打','自責点') for c in r)),None)
    if head is None: return None
    headers=[clean(c['text']) for c in head]; rows=[]
    for row in g:
        label=row[0]['text'] if row else ''
        if not re.match(r'^(通算|NPB|MLB)[：:]',label): continue
        if len(row)!=len(headers): raise ValueError(f'Total/header width mismatch {label}')
        s={v:0 for v in FIELDS.values()}; s['outs']=0
        for h,c in zip(headers,row):
            if h in FIELDS: s[FIELDS[h]]=num(c['text'])
            if h=='投球回':
                # Baseball fractions (.1/.2) are outs, not decimal innings.
                innings=clean(c['text'])
                if not re.fullmatch(r'\d+(\.[012])?',innings): raise ValueError('Invalid innings '+innings)
                whole,_,fraction=innings.partition('.'); s['outs']=int(whole)*3+int(fraction or 0)
        rows.append({'label':label,'stats':s,'raw':dict(zip(headers,[c['text'] for c in row]))})
    if not rows: return None # CPBL-only table is outside the NPB + MLB comparison.
    # Combined total and its NPB/MLB components must not be counted twice.
    components=[r for r in rows if r['label'].startswith(('NPB','MLB'))]
    selected=components or rows[-1:]
    total={k:sum(r['stats'][k] for r in selected) for k in selected[0]['stats']}
    return {'total':total,'evidence':selected}

def classification(s,pitch):
    pa=s['ab']+s['bb']+s['hbp']+s['sf']
    ops=((s['hits']+s['bb']+s['hbp'])/pa if pa else 0)+(s['hits']+s['doubles']+2*s['triples']+3*s['hr'])/s['ab'] if s['ab'] else 0
    era=s['er']*27/s['outs'] if s['outs'] else 0
    productive=(s['outs']>0 and era<=4.2) if pitch else (s['ab']>0 and ops>=.72)
    for name,wins,saves,hits,hr in [('レジェンド',250,400,2800,500),('スーパースター',180,280,2200,350),('スター',120,180,1600,230)]:
        if productive and ((s['wins']>=wins or s['saves']>=saves) if pitch else (s['hits']>=hits or s['hr']>=hr)): return name
    return 'その他'

def player_evidence(player):
    try:
        html,url=fetch(player['title']); p=Tables(); p.feed(html); results=[]
        for tab in p.tables:
            if tab['context'] not in ('年度別投手成績','年度別打撃成績'): continue
            stats=extract_stats(tab)
            if stats is not None: stats['role']='投手' if tab['context']=='年度別投手成績' else '野手'; results.append(stats)
        if not results:
            # Zero appearances is accepted only with an explicit article statement.
            text=re.sub(r'<[^>]+>','',html)
            if not re.search(r'一軍(?:公式戦)?(?:出場|試合出場)(?:なし|はなし)|一軍での出場はなかった|一軍出場はなかった|一軍公式戦出場は無かった|1度も一軍で登板することがない',text):
                raise ValueError('No professional stats and no explicit zero-appearance statement')
        order={'その他':0,'スター':1,'スーパースター':2,'レジェンド':3}
        labels=[classification(r['total'],r['role']=='投手') for r in results]
        result=max(labels,key=order.get) if labels else 'その他'
        rev=re.search(r'(?:oldid[=:]|wgRevisionId["\s:]+)(\d+)',html)
        # Active careers are right-censored; list separately, never call them failures.
        recent=any(re.search(r'^(2024|2025|2026)$',r[0]['text']) for t in p.tables if t['context'] in ('年度別投手成績','年度別打撃成績') for r in t['rows'] if r)
        return {**player,'playerUrl':url,'revision':rev.group(1) if rev else None,'classification':result,'recentCareer':recent,'records':results}
    except Exception as e: return {**player,'error':str(e)}

if __name__=='__main__':
    import sys
    if '--inspect' in sys.argv:
        title=sys.argv[-1]; html,url=fetch(title)
        for t in tables(html):
            if any('選手名'==c['text'] for row in t['rows'][:1] for c in row) or '年度別' in t['context']:
                print(t['context']); print([[c['text'] for c in r] for r in grid(t)][:4]); print([[c['text'] for c in r] for r in grid(t)][-3:])
    else:
        players=[]
        for year in range(1991,2003): players+=cohort(year)
        for year in range(2005,2010): players+=cohort(year,True)
        path=ROOT/'reports/draft11-wiki-cohort.json'; path.write_text(json.dumps(players,ensure_ascii=False,indent=2),encoding='utf-8')
        print('cohort',len(players),flush=True)
        evidence=[]
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            for i,r in enumerate(executor.map(player_evidence,players),1):
                evidence.append(r)
                if i%40==0: print('players',i,'errors',sum('error' in p for p in evidence),flush=True)
        path=ROOT/'reports/draft11-wiki-evidence.json'; path.write_text(json.dumps(evidence,ensure_ascii=False,indent=2),encoding='utf-8')
        print('complete',len(evidence),'errors',sum('error' in p for p in evidence),flush=True)
