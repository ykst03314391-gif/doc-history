"""人物ページ（data/people/<id>.json）の仕上げチェック。

使い方（リポジトリのルートで）:
    python .claude/skills/person-page/check_person.py <id> [<id> ...]

機械で確かめられる項目だけを見る（JSON として読めるか・index.json との値の一致・
sourceId と出典の対応・リンク先の存在・links の text が説明文にあるか・
「要確認」と toVerify の対応・書かない欄）。文章の調子や出典の確かめ具合は見ない。
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DATA = ROOT / "data"


def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def ids_of(kind, key):
    d = load(DATA / kind / "index.json")
    return {x["id"] for x in d[key]}


PEOPLE = ids_of("people", "people")
BATTLES = ids_of("battles", "battles")
CASTLES = {p.stem for p in (DATA / "castles").glob("*.json") if p.stem != "index"}
ARTICLES = ids_of("articles", "articles")
REF_KINDS = {"person_id": PEOPLE, "battle_id": BATTLES, "castle_id": CASTLES, "article_id": ARTICLES}


def walk(o, path=""):
    """(path, dict) をすべて返す。"""
    if isinstance(o, dict):
        yield path, o
        for k, v in o.items():
            yield from walk(v, f"{path}.{k}" if path else k)
    elif isinstance(o, list):
        for i, v in enumerate(o):
            yield from walk(v, f"{path}[{i}]")


def strings(o):
    if isinstance(o, str):
        yield o
    elif isinstance(o, dict):
        for k, v in o.items():
            if k != "links":
                yield from strings(v)
    elif isinstance(o, list):
        for v in o:
            yield from strings(v)


def check(pid):
    errs, warns = [], []
    path = DATA / "people" / f"{pid}.json"
    try:
        p = load(path)
    except FileNotFoundError:
        return [f"{path} がない"], []
    except json.JSONDecodeError as e:
        return [f"JSON として読めない: {e}"], []

    # index.json との一致
    idx = {x["id"]: x for x in load(DATA / "people" / "index.json")["people"]}
    e = idx.get(pid)
    if not e:
        errs.append("index.json に登録されていない")
    else:
        pairs = [("name", p.get("name")), ("kana", p.get("kana")), ("role", p.get("role")),
                 ("category", p.get("category")), ("tags", p.get("tags")),
                 ("birthYear", (p.get("birth") or {}).get("year")),
                 ("deathYear", (p.get("death") or {}).get("year"))]
        for k, v in pairs:
            if e.get(k) != v:
                errs.append(f"index.json の {k} が個別ファイルと違う（index: {e.get(k)!r} / 個別: {v!r}）")
        for k, src in [("birthEra", "birth"), ("deathEra", "death")]:
            v = (p.get(src) or {}).get("era")
            if v and e.get(k) and e.get(k) != v:
                warns.append(f"index.json の {k} が個別ファイルの {src}.era と違う（{e.get(k)} / {v}）")

    # 書かない欄
    if "history" in p:
        errs.append("history を書いている（更新履歴は廃止）")

    detailed = p.get("role") in ("main", "frozen") or any(k in p for k in ("timeline", "sources"))

    # sourceId と出典
    src_ids = {s["id"] for s in p.get("sources", [])}
    used = set()
    for where, d in walk(p):
        sid = d.get("sourceId")
        if sid is None:
            continue
        for s in sid if isinstance(sid, list) else [sid]:
            used.add(s)
            if s not in src_ids:
                errs.append(f"{where}: sourceId {s!r} が sources にない")
    for s in sorted(src_ids - used):
        warns.append(f"出典 {s!r} がどこからも使われていない")

    # リンク先の存在・links の text
    for where, d in walk(p):
        for k, ids in REF_KINDS.items():
            if k in d and d[k] and d[k] not in ids:
                errs.append(f"{where}: {k} {d[k]!r} のページがない")
        for i, ln in enumerate(d.get("links", []) or []):
            t = ln.get("text", "")
            if t and not any(t in s for s in strings(d)):
                errs.append(f"{where}.links[{i}]: text {t!r} が説明文に出てこない")

    # 原文の引用は {{…}}
    for where, d in walk(p):
        for k, v in d.items():
            if isinstance(v, str) and ("{{" in v) != ("}}" in v):
                errs.append(f"{where}.{k}: {{{{ と }}}} の数が合わない")

    # 「要確認」と toVerify
    mentions = sum(s.count("要確認") for s in strings({k: v for k, v in p.items() if k != "toVerify"}))
    tv = len(p.get("toVerify", []))
    if mentions and not tv:
        errs.append(f"本文に「要確認」が {mentions} か所あるのに toVerify がない")
    elif mentions:
        warns.append(f"本文の「要確認」{mentions} か所 ／ toVerify {tv} 項目（数は一致しなくてよい。対応は目で確かめる）")

    # 分量の上限（SKILL.md の「分量の上限」）
    limits = {"timeline": 30, "family": 15, "retainers": 15, "reputation": 15, "spots": 15, "sources": 50, "toVerify": 30}
    for k, n in limits.items():
        if len(p.get(k, []) or []) > n:
            warns.append(f"{k} が {len(p[k])} 件で、上限 {n} を超えている")

    # 概要ページ（脇役）に詳細を書いていないか
    if not detailed:
        extra = [k for k in ("timeline", "family", "episodes", "sources", "lens") if k in p]
        if extra:
            warns.append(f"脇役（role なし）なのに詳細の欄がある: {', '.join(extra)}")
    lens = p.get("lens") or {}
    if p.get("role") == "main" and lens.get("question") and not lens.get("answer"):
        warns.append("lens.answer（ぱぱねこのまとめ）がまだ無い（論点の記事がそろったら書く）")
    if p.get("role") != "main" and lens.get("view"):
        warns.append("主役でないのに lens.view がある")

    return errs, warns


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    bad = False
    for pid in sys.argv[1:]:
        errs, warns = check(pid)
        print(f"== {pid}: エラー {len(errs)}・注意 {len(warns)}")
        for m in errs:
            print("  ✗", m)
        for m in warns:
            print("  △", m)
        bad |= bool(errs)
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
