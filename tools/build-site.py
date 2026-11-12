"""公開用のサイトを dist/ に書き出す。

ふだんの確認はリポジトリのルートで `python -m http.server` のまま（このスクリプトは要らない）。
公開するときだけ動かし、できた dist/ の中身を公開先に上げる。

  python tools/build-site.py                     # tools/site.json の baseUrl を使う
  python tools/build-site.py --base-url https://example.com/   # 一時的に URL を指定する

すること：
- 配信するもの（ルートの HTML・favicon.ico・robots.txt と css/ js/ assets/ data/）だけを写す。
  drafts/・reference/・chara/・docs/・tools/ などの編集者用のものは入れない。
- 記事ごとに article-<id>.html を作り、題・説明（summary）・URL を <head> に書き込む。
  SNS のクローラーは JS を動かさないので、article.html?id=… のままでは全記事が同じカードになるため。
  下書き（draft: true）の記事は作らない。
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
    args = ap.parse_args()
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
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()
    for d in COPY_DIRS:
        shutil.copytree(ROOT / d, DIST / d)
    for f in COPY_FILES:
        shutil.copy2(ROOT / f, DIST / f)

    # 2. 記事へのリンクを書き替える
    for p in (DIST / "js").glob("*.js"):
        s = p.read_text(encoding="utf-8")
        t = JS_LINK_RE.sub(r"article-\1.html", s)
        if t != s:
            p.write_text(t, encoding="utf-8", newline="")
    for p in list((DIST / "data").rglob("*.md")) + list((DIST / "data").rglob("*.json")):
        s = p.read_text(encoding="utf-8")
        t = DATA_LINK_RE.sub(lambda m: article_file(m.group(1)), s)
        if t != s:
            p.write_text(t, encoding="utf-8", newline="")

    # 3. 記事ごとのページ
    arts = [a for a in load_json("data/articles/index.json")["articles"] if not a.get("draft")]
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
        if a.get("date"):
            h = set_meta(h, "article:published_time", a["date"], prop=True)
        (DIST / article_file(a["id"])).write_text(h, encoding="utf-8", newline="")

    # 4. ルートの HTML
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

    # 5. sitemap.xml と robots.txt
    if base:
        urls = [("", None)]
        urls += [(p.name, None) for p in sorted(ROOT.glob("*.html"))
                 if p.name not in ("index.html", "404.html", "article.html") and p.name not in DETAIL_PAGES]
        urls += [(article_file(a["id"]), a.get("update") or a.get("date")) for a in arts]
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

    # 6. 書き替え漏れを調べる（article.js 自身の説明と、開発用の article.html は除く）
    left = []
    for p in DIST.rglob("*"):
        if p.suffix in (".js", ".md", ".json", ".html") and p.name not in ("article.js",):
            if "article.html?id=" in p.read_text(encoding="utf-8"):
                left.append(str(p.relative_to(DIST)))
    if left:
        warnings.append("article.html?id= が残っています：" + "、".join(sorted(left)))

    print(f"dist/ に書き出しました（記事 {len(arts)} 本）。")
    for w in warnings:
        print("注意：" + w)
    return 1 if left else 0


if __name__ == "__main__":
    sys.exit(main())
