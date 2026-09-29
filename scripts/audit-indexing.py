#!/usr/bin/env python3
"""Fetch initial HTML, never execute JS. Usage: python3 scripts/audit-indexing.py [origin] [--strict]."""
import concurrent.futures, json, sys, urllib.request, urllib.error, urllib.parse
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from datetime import datetime, timezone
ORIGIN = (sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else 'https://www.usereviewflo.com').rstrip('/')
CANONICAL = 'https://www.usereviewflo.com'
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args): return None
opener = urllib.request.build_opener(NoRedirect)
class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.canonicals=[]; self.robots=[]; self.og=[]; self.links=[]; self.h1=0; self.skip=0; self.words=0; self.json_ld=[]; self.in_json_ld=False; self.json_text=""
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag == 'link' and a.get('rel') == 'canonical': self.canonicals.append(a.get('href'))
        if tag == 'meta' and a.get('name') in ('robots','googlebot'): self.robots.append(a.get('content',''))
        if tag == 'meta' and a.get('property') == 'og:url': self.og.append(a.get('content'))
        if tag == 'a' and a.get('href'): self.links.append(a['href'])
        if tag == 'h1': self.h1+=1
        if tag in ('script','style'): self.skip+=1
        if tag == 'script' and a.get('type') == 'application/ld+json': self.in_json_ld=True; self.json_text=''
    def handle_endtag(self,tag):
        if tag == 'script' and self.in_json_ld:
            try: self.json_ld.append(json.loads(self.json_text))
            except ValueError: self.json_ld.append({'parse_error':True})
            self.in_json_ld=False
        if tag in ('script','style'): self.skip=max(0,self.skip-1)
    def handle_data(self,data):
        if self.in_json_ld: self.json_text+=data
        if not self.skip: self.words+=len(data.split())
def fetch(url):
    try:
        try: r=opener.open(urllib.request.Request(url,headers={'User-Agent':'ReviewFlo-SEO-Audit/1.0'}),timeout=30)
        except urllib.error.HTTPError as e: r=e
        with r: return r.status, dict(r.headers.items()), r.read().decode('utf-8','replace')
    except Exception as e: return 0,{},str(e)
def audit(url):
    chain=[]; current=url
    for _ in range(8):
        status,headers,html=fetch(current); headers={k.lower():v for k,v in headers.items()}
        if status in (301,302,303,307,308) and 'location' in headers:
            target=urllib.parse.urljoin(current,headers['location']); chain.append({'status':status,'from':current,'to':target}); current=target
        else: break
    p=Page(); p.feed(html)
    return {'url':url,'status':status,'final_url':current,'redirects':chain,'canonical':p.canonicals,'robots':p.robots,'x_robots_tag':headers.get('x-robots-tag'),'og_url':p.og,'h1_count':p.h1,'initial_html_words':p.words,'links':p.links,'json_ld':p.json_ld}
s,_,xml=fetch(ORIGIN+'/sitemap.xml')
if s != 200: raise SystemExit('Sitemap returned '+str(s))
entries=ET.fromstring(xml).findall('{*}url')
urls=[entry.find('{*}loc').text for entry in entries]
targets=[ORIGIN+urllib.parse.urlsplit(u).path for u in urls]
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool: rows=list(pool.map(audit,targets))
errors=[]
for expected,row,entry in zip(urls,rows,entries):
    if row['status'] != 200 or row['redirects']: errors.append(row['url']+': not a direct 200')
    if row['canonical'] != [expected]: errors.append(row['url']+': canonical mismatch or duplicate')
    if row['og_url'] != [expected]: errors.append(row['url']+': og:url mismatch or missing')
    if 'noindex' in ','.join(row['robots']+[row['x_robots_tag'] or '']).lower(): errors.append(row['url']+': noindex')
    if 'https://usereviewflo.com' in json.dumps(row['json_ld']): errors.append(row['url']+': noncanonical JSON-LD host')
    if any(urllib.parse.urlsplit(href).netloc == 'usereviewflo.com' for href in row['links']): errors.append(row['url']+': noncanonical internal link host')
    if row['h1_count'] == 0 or row['initial_html_words'] < 50: errors.append(row['url']+': missing initial content')
    lastmod=entry.find('{*}lastmod'); row['lastmod']=lastmod.text if lastmod is not None else None
    if lastmod is None: errors.append(row['url']+': missing lastmod')
    elif datetime.fromisoformat(lastmod.text.replace('Z','+00:00')).date() > datetime.now(timezone.utc).date(): errors.append(row['url']+': future lastmod')
# Traverse actual initial-HTML links through sitemap pages from the homepage.
by_path={urllib.parse.urlsplit(r['url']).path.rstrip('/') or '/':r for r in rows}
seen=set(); todo=['/']
while todo:
    path=todo.pop()
    if path in seen or path not in by_path: continue
    seen.add(path)
    for href in by_path[path]['links']:
        u=urllib.parse.urlsplit(urllib.parse.urljoin(ORIGIN+path,href))
        if u.netloc in (urllib.parse.urlsplit(ORIGIN).netloc,urllib.parse.urlsplit(CANONICAL).netloc): todo.append(u.path.rstrip('/') or '/')
unreachable=sorted(set(by_path)-seen)
errors.extend(p+': unreachable from homepage' for p in unreachable)
for r in rows: del r['links']
probes=['/robots.txt','/login','/join?plan=pro','/dashboard','/settings','/admin','/auth/verify','/join/callback','/seo-audit-missing-918273','/seo-audit-missing-918273/feedback','/for/seo-audit-missing-918273','/blog/seo-audit-missing-918273','/privacy','/pricing/','/for-barbers', '/privacy/', '/for-barbers/', '/account', '/reset-password', '/update-password', '/auth/magic-landing', '/join/set-password', '/dashboard/reviews', '/admin/analytics', '/obsidian-auto', '/obsidian-auto/feedback', '/obsidian-auto/templates', '/obsidian-auto/follow-up']
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: extra=list(pool.map(audit,[ORIGIN+p for p in probes]))
for r in extra:
    del r['links']
    path=urllib.parse.urlsplit(r['url']).path
    if path == '/robots.txt':
        if r['status'] != 200 or CANONICAL+'/sitemap.xml' not in fetch(r['url'])[2]: errors.append(path+': missing robots sitemap reference')
    elif 'seo-audit-missing' in path:
        if r['status'] != 404: errors.append(path+': expected real 404')
    elif path in ['/privacy','/privacy/','/pricing/','/for-barbers','/for-barbers/']:
        if len(r['redirects']) != 1 or r['redirects'][0]['status'] not in (301,308): errors.append(path+': expected one permanent redirect')
    elif r['status'] not in (200,404) or 'noindex' not in ','.join(r['robots']+[r['x_robots_tag'] or '']): errors.append(path+': missing private-page noindex or unexpected status')
print(json.dumps({'checked_at':datetime.now(timezone.utc).isoformat(),'origin':ORIGIN,'sitemap_count':len(rows),'errors':errors,'unreachable':unreachable,'sitemap':rows,'probes':extra},indent=2))
if '--strict' in sys.argv and errors: sys.exit(1)
