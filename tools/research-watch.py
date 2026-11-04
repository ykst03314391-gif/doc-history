"""研究動向の候補を拾う（週1回の定期タスクから呼ぶ）。

主役（data/people/index.json の role "main"）の名前で、NDLサーチ（図書・雑誌記事索引）と
J-STAGE（歴史の雑誌だけ）を検索し、まだ docs/研究動向/ と docs/未見の文献.md に
出ていない候補を、そのまま Markdown の箇条書きで標準出力に出す。
選別（研究か一般書か、どの記事に関わるか）は、これを読んだ Claude がする。

使い方: python -I tools/research-watch.py [--months 3]
"""
import argparse, datetime, glob, json, os, re, sys, urllib.parse, urllib.request

sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = {'User-Agent': 'sengoku-chronicle-research-watch/0.1'}

# 落とすもの（題名・版元で判断。小説・漫画・ガイドなど）
NOISE = re.compile(r'転生|生まれ変わ|異世界|漫画|まんが|マンガ|コミック|小説|ガイドブック|THE BOOK|メモリアルブック|'
                   r'ナックルズ|御朱印|ビジネス|成果|戦略|処世術|開運|パワースポット|怪談|雑学|ゆる4コマ')
# J-STAGE で残す雑誌（歴史・史料に関わるもの）
JSTAGE_JOURNAL = re.compile(r'史|郷土|紀要|文書館|博物館|茶の湯|語文|連歌|Japan Review|城|書陵部|地方')


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read().decode('utf-8')


def tag(p, s):
    m = re.search(p, s, re.S)
    return m.group(1).strip() if m else ''


def clean(s):
    ja = re.search(r'<ja>(.*?)</ja>', s, re.S)
    en = re.search(r'<en>(.*?)</en>', s, re.S)
    if ja and re.sub(r'<.*?>|<!\[CDATA\[|\]\]>|\s', '', ja.group(1)):
        s = ja.group(1)
    elif en:
        s = en.group(1)
    return re.sub(r'<!\[CDATA\[|\]\]>|<.*?>|\s+', ' ', s).strip()


def known_text():
    files = glob.glob(os.path.join(ROOT, 'docs', '研究動向', '*.md')) + [os.path.join(ROOT, 'docs', '未見の文献.md')]
    files += glob.glob(os.path.join(ROOT, 'data', 'articles', '*.md')) + glob.glob(os.path.join(ROOT, 'drafts', '*.md'))
    return ''.join(open(f, encoding='utf-8').read() for f in files if os.path.exists(f))


def norm(s):
    return re.sub(r'[\s　:：・「」『』〈〉()（）!！?？、。,.―-]', '', s)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--months', type=int, default=3)
    a = ap.parse_args()
    since = (datetime.date.today() - datetime.timedelta(days=31 * a.months))
    people = json.load(open(os.path.join(ROOT, 'data', 'people', 'index.json'), encoding='utf-8'))['people']
    mains = [p['name'] for p in people if p.get('role') == 'main']
    known = norm(known_text())
    seen = set()
    print(f'# 研究動向の候補（{datetime.date.today()} 取得、{since:%Y-%m} 以降）\n')
    print('主役：' + '・'.join(mains) + '\n')
    for q in mains:
        out = []
        for dpid, kind in [(None, '図書'), ('zassaku', '雑誌記事')]:
            params = {'any': q, 'cnt': 300, 'from': f'{since:%Y-%m}'}
            if dpid:
                params['dpid'] = dpid
            try:
                s = get('https://ndlsearch.ndl.go.jp/api/opensearch?' + urllib.parse.urlencode(params))
            except Exception as e:
                out.append(f'- （NDL {kind} の取得に失敗：{e}）')
                continue
            for it in re.findall(r'<item>(.*?)</item>', s, re.S):
                title = tag(r'<title>(.*?)</title>', it)
                cat = tag(r'<category>(.*?)</category>', it)
                if kind == '図書' and cat not in ('図書', ''):
                    continue
                pub = tag(r'<dc:publisher>(.*?)</dc:publisher>', it)
                if not title or NOISE.search(title + pub):
                    continue
                k = norm(title)
                if k in seen or (len(k) >= 6 and k in known):
                    continue
                seen.add(k)
                out.append(f'- [NDL {kind}] {tag(r"<dcterms:issued[^>]*>(.*?)</dcterms:issued>", it)}｜{title}｜'
                           f'{tag(r"<author>(.*?)</author>", it)[:60]}｜{pub}｜{tag(r"<link>(.*?)</link>", it)}')
        try:
            s = get('https://api.jstage.jst.go.jp/searchapi/do?' + urllib.parse.urlencode(
                {'service': 3, 'text': q, 'pubyearfrom': since.year, 'count': 200}))
            for e in re.findall(r'<entry>(.*?)</entry>', s, re.S):
                title = clean(tag(r'<article_title>(.*?)</article_title>', e))
                journal = clean(tag(r'<material_title>(.*?)</material_title>', e))
                if not title or not JSTAGE_JOURNAL.search(journal):
                    continue
                k = norm(title)
                if k in seen or (len(k) >= 6 and k in known):
                    continue
                seen.add(k)
                out.append(f'- [J-STAGE] {tag(r"<pubyear>(.*?)</pubyear>", e)}｜{title}｜'
                           f'{clean(tag(r"<author>(.*?)</author>", e))[:40]}｜{journal}｜{tag(r"<link[^>]*href=\"(.*?)\"", e)}')
        except Exception as e:
            out.append(f'- （J-STAGE の取得に失敗：{e}）')
        print(f'## {q}（{len(out)}件）\n')
        print('\n'.join(out) if out else '- 新しい候補なし')
        print()


if __name__ == '__main__':
    main()
