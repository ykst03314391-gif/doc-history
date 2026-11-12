"""公開用のサイトを dist/ に書き出す。

ふだんの確認はリポジトリのルートで `python -m http.server` のまま（このスクリプトは要らない）。
公開するときだけ動かし、できた dist/ の中身を公開先に上げる。

  python tools/build-site.py                     # tools/site.json の baseUrl を使う
  python tools/build-site.py --base-url https://example.com/   # 一時的に URL を指定する
  python tools/build-site.py --as-of 2026-12-20  # その日に公開済みになっている記事で書き出す（見通しの確認用）

すること：
- 記事は、data/articles/index.json の publish（公開日、YYYY-MM-DD）が書き出しの日（--as-of）までのものだけを出す。
  publish が無い記事・下書き（draft: true）は出さない（書き忘れた記事がうっかり出ないように）。
  出さない記事は、本文の .md を消し、ほかの記事の本文からのリンクは文字だけにする。
  dist の index.json からは、公開を待つ記事を題名ごと外す（下書きは人物ページの「考察（執筆中）」の予告のため残す）。
  一覧・人物ページ・トピック・出典一覧の JS は、index.json に無い記事と下書きにはリンクを出さない。
- 配信するもの（ルートの HTML・favicon.ico・robots.txt と css/ js/ assets/ data/）だけを写す。
  drafts/・reference/・chara/・docs/・tools/ などの編集者用のものは入れない。
- 記事ごとに article-<id>.html を作り、題・説明（summary）・URL を <head> に書き込む。
  SNS のクローラーは JS を動かさないので、article.html?id=… のままでは全記事が同じカードになるため。
- サイト内の記事へのリンク（JS が組み立てるものと、記事本文・データの中のもの）を
  article.html?id=<id> から article-<id>.html に書き替える。
- baseUrl があれば、各ページに og:image・og:url・canonical を絶対 URL で入れ、sitemap.xml を作り、
  robots.txt に Sitemap の行を足し、404.html のパスをサイトの頭からの形にする。
"""
import argparse
import html
import json
import re
import shutil
import sys
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
SITE_NAME = "ぱぱねこの戦国見立て"
COPY_DIRS = ["css", "js", "assets", "data"]
COPY_FILES = ["favicon.ico", "robots.txt"]
OGP_IMAGE = "assets/img/ogp.png"
# id で中身が替わる詳細ページ。sitemap にはデータの id ごとに載せ、og:url は付けない
DETAIL_PAGES = {
    "person.html": ("data/people/index.json", "people"),
    "battle.html": ("data/battles/index.json", "battles"),
    "castle.html": ("data/castles/index.json", "castles"),
    "clan.html": ("data/clans/index.json", "clans"),
    "topic.html": ("data/topics/index.json", "topics"),
}

# JS が組み立てるリンク： article.html?id=${…} → article-${…}.html
JS_LINK_RE = re.compile(r"article\.html\?id=(\$\{[^}]*\})")
# 本文・データの中のリンク： article.html?id=<id> → article-<id>.html（#… はそのまま後ろに残る）
DATA_LINK_RE = re.compile(r"article\.html\?id=([a-z0-9-]+)")


def article_file(aid):
    return f"article-{aid}.html"


def load_json(rel):
    return json.loads((ROOT / rel).read_text(encoding="utf-8"))


def attr(s):
    return html.escape(s, quote=True)


def set_meta(head, key, value, prop=False):
    """<meta name|property="key" content="…"> を書き替える。無ければ </head> の前に足す。"""
    a = "property" if prop else "name"
    tag = f'<meta {a}="{key}" content="{attr(value)}">'
    pat = re.compile(rf'<meta {a}="{re.escape(key)}" content="[^"]*">')
    if pat.search(head):
        return pat.sub(lambda _: tag, head, count=1)
    return head.replace("</head>", f"  {tag}\n</head>", 1)


def add_link(head, rel, href):
    tag = f'<link rel="{rel}" href="{attr(href)}">'
    return head.replace("</head>", f"  {tag}\n</head>", 1)


def with_abs(head, base, page_url=None, image=OGP_IMAGE):
    """baseUrl があるときだけ、og:image と（決まった URL のあるページには）og:url・canonical を入れる。"""
    if not base:
        return head
    head = set_meta(head, "og:image", base + image, prop=True)
    if page_url is not None:
        head = set_meta(head, "og:url", base + page_url, prop=True)
        head = add_link(head, "canonical", base + page_url)
    return head


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-url", help="公開先の URL（末尾の / まで）。省くと tools/site.json の baseUrl")
    ap.add_argument("--as-of", help="この日（YYYY-MM-DD）に公開済みの記事で書き出す。省くと今日")
    args = ap.parse_args()
    as_of = args.as_of or date.today().isoformat()
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", as_of):
        sys.exit("--as-of は YYYY-MM-DD で書いてください")
    base = args.base_url
    if base is None:
        cfg = ROOT / "tools" / "site.json"
        base = json.loads(cfg.read_text(encoding="utf-8")).get("baseUrl", "") if cfg.exists() else ""
    if base and not base.endswith("/"):
        base += "/"
    warnings = []
    if not base:
        warnings.append("baseUrl が空なので、og:image・og:url・canonical・sitemap.xml は作っていません（公開先が決まったら tools/site.json に書く）。")

    # 1. 写す
    # dist/ そのものは消さず中身だけを消す（確認用のサーバーが dist/ で動いていても書き出せるように）
    DIST.mkdir(exist_ok=True)
    for child in DIST.iterdir():
        shutil.rmtree(child) if child.is_dir() else child.unlink()
    for d in COPY_DIRS:
        shutil.copytree(ROOT / d, DIST / d)
    for f in COPY_FILES:
        shutil.copy2(ROOT / f, DIST / f)

    # 2. 出す記事を決める
    art_data = load_json("data/articles/index.json")
    all_arts = art_data["articles"]
    def is_public(a):
        pub = a.get("publish")
        return not a.get("draft") and bool(pub) and str(pub) <= as_of
    arts = [a for a in all_arts if is_public(a)]
    public_ids = {a["id"] for a in arts}
    hidden = [a for a in all_arts if a["id"] not in public_ids]
    hidden_ids = {a["id"] for a in hidden}
    for a in hidden:
        md = DIST / "data" / "articles" / f"{a['id']}.md"
        if md.exists():
            md.unlink()
    # 下書き（draft: true）は人物ページに「考察（執筆中）」と予告が出るので残す。
    # 書き上がっていて公開を待つだけの記事は、題名ごと index.json から外す（予告で先の記事の題を出さないため）
    art_data["articles"] = [a for a in all_arts if a["id"] in public_ids or a.get("draft")]
    # 一覧・トップに出す日付（date）は、書いた日ではなく公開日にする
    for a in arts:
        a["date"] = str(a["publish"])
    (DIST / "data" / "articles" / "index.json").write_text(
        json.dumps(art_data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    # 出さない記事への本文中のリンク [文字](article.html?id=<id>…) は、文字だけにする
    hidden_link_re = re.compile(r"\[([^\]]*)\]\(article\.html\?id=(" + "|".join(map(re.escape, sorted(hidden_ids))) + r")(?:#[^)]*)?\)") if hidden_ids else None

    # 3. 記事へのリンクを書き替える
    for p in (DIST / "js").glob("*.js"):
        s = p.read_text(encoding="utf-8")
        t = JS_LINK_RE.sub(r"article-\1.html", s)
        if t != s:
            p.write_text(t, encoding="utf-8", newline="")
    for p in list((DIST / "data").rglob("*.md")) + list((DIST / "data").rglob("*.json")):
        s = p.read_text(encoding="utf-8")
        t = hidden_link_re.sub(r"\1", s) if hidden_link_re else s
        t = DATA_LINK_RE.sub(lambda m: article_file(m.group(1)), t)
        if t != s:
            p.write_text(t, encoding="utf-8", newline="")

    # 4. 記事ごとのページ
    template = (ROOT / "article.html").read_text(encoding="utf-8")
    for a in arts:
        title = f"{a['title']} ｜ {SITE_NAME}"
        desc = a.get("summary", "")
        h = template
        h = re.sub(r"<title>.*?</title>", lambda _: f"<title>{html.escape(title)}</title>", h, count=1)
        h = set_meta(h, "description", desc)
        h = set_meta(h, "article-id", a["id"])
        h = set_meta(h, "og:title", a["title"], prop=True)
        h = set_meta(h, "og:description", desc, prop=True)
        h = with_abs(h, base, article_file(a["id"]))
        h = set_meta(h, "article:published_time", str(a["publish"]), prop=True)
        (DIST / article_file(a["id"])).write_text(h, encoding="utf-8", newline="")

    # 5. ルートの HTML
    for p in sorted(ROOT.glob("*.html")):
        s = p.read_text(encoding="utf-8")
        if p.name == "404.html":
            if base:
                # どの階層の URL で 404 になっても崩れないよう、相対パスをサイトの頭からの形にする
                root_path = urlparse(base).path
                s = re.sub(r'(href|src)="(?!https?:|//|#|/|mailto:)([^"]+)"', lambda m: f'{m.group(1)}="{root_path}{m.group(2)}"', s)
        else:
            page_url = None if p.name in DETAIL_PAGES or p.name == "article.html" else ("" if p.name == "index.html" else p.name)
            s = with_abs(s, base, page_url)
        (DIST / p.name).write_text(s, encoding="utf-8", newline="")

    # 6. sitemap.xml と robots.txt
    if base:
        urls = [("", None)]
        urls += [(p.name, None) for p in sorted(ROOT.glob("*.html"))
                 if p.name not in ("index.html", "404.html", "article.html") and p.name not in DETAIL_PAGES]
        urls += [(article_file(a["id"]), str(a["publish"])) for a in arts]
        for page, (rel, key) in DETAIL_PAGES.items():
            for item in load_json(rel).get(key, []):
                if not item.get("draft"):
                    urls.append((f"{page}?id={item['id']}", None))
        lines = ['<?xml version="1.0" encoding="UTF-8"?>',
                 '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
        for u, lastmod in urls:
            lm = f"<lastmod>{lastmod}</lastmod>" if lastmod and re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(lastmod)) else ""
            lines.append(f"  <url><loc>{html.escape(base + u)}</loc>{lm}</url>")
        lines.append("</urlset>")
        (DIST / "sitemap.xml").write_text("\n".join(lines) + "\n", encoding="utf-8")
        with open(DIST / "robots.txt", "a", encoding="utf-8") as f:
            f.write(f"\nSitemap: {base}sitemap.xml\n")

    # 7. 書き替え漏れと、出さない記事へのリンクが残っていないかを調べる（article.js 自身の説明は除く）
    left, dead = [], set()
    for p in DIST.rglob("*"):
        if p.suffix in (".js", ".md", ".json", ".html") and p.name != "article.js":
            text = p.read_text(encoding="utf-8")
            if "article.html?id=" in text:
                left.append(str(p.relative_to(DIST)))
            if p.name != "index.json" or p.parent.name != "articles":
                for m in re.finditer(r"article-([a-z0-9-]+)\.html", text):
                    if m.group(1) not in public_ids:
                        dead.add(f"{p.relative_to(DIST)} → {m.group(1)}")
    if left:
        warnings.append("article.html?id= が残っています：" + "、".join(sorted(left)))
    if dead:
        warnings.append("出さない記事へのリンクが残っています：" + "、".join(sorted(dead)))

    print(f"dist/ に書き出しました（{as_of} 時点で公開の記事 {len(arts)} 本）。")
    if hidden:
        print("出さなかった記事：")
        for a in hidden:
            print(f"  {a['id']}（公開日 {a.get('publish') or 'なし'}）")
    for w in warnings:
        print("注意：" + w)
    return 1 if left or dead else 0


if __name__ == "__main__":
    sys.exit(main())
