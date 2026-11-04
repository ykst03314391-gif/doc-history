"""ほかのページの説明文のうち、この人物の名前が出てくるのにリンクのない項目を一覧にする（帰りのリンク探し）。

使い方（リポジトリのルートで）:
    python .claude/skills/person-page/find_mentions.py <id> [呼び名 ...]

探す名前は、その人物の name と aliases の値（2文字以上）に、引数で足した呼び名を加えたもの。
data/people・data/battles・data/castles・data/clans の個別ファイルを見る（index.json と本人のファイルは除く）。
同じ呼び名の別人もありうるので、張る前に文脈で確かめる。
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DATA = ROOT / "data"
KINDS = ["people", "battles", "castles", "clans"]


def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def walk(o, path=""):
    if isinstance(o, dict):
        yield path, o
        for k, v in o.items():
            yield from walk(v, f"{path}.{k}" if path else k)
    elif isinstance(o, list):
        for i, v in enumerate(o):
            yield from walk(v, f"{path}[{i}]")


def own_strings(d):
    """その項目の直下の文字列（子の項目は別に見るので含めない）。"""
    out = []
    for k, v in d.items():
        if k in ("id", "src", "url", "sourceId", "thumb"):
            continue
        if isinstance(v, str):
            out.append((k, v))
        elif isinstance(v, list):  # 合戦の description のような文字列の配列
            out += [(f"{k}[{i}]", x) for i, x in enumerate(v) if isinstance(x, str)]
    return out


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    pid = sys.argv[1]
    me = load(DATA / "people" / f"{pid}.json")
    names = {me["name"]} | {a["value"] for a in me.get("aliases", []) if a.get("value")} | set(sys.argv[2:])
    names = sorted((n for n in names if len(n) >= 2), key=len, reverse=True)
    print("探す名前:", "・".join(names))
    hits = 0
    for kind in KINDS:
        for f in sorted((DATA / kind).glob("*.json")):
            if f.stem == "index" or (kind == "people" and f.stem == pid):
                continue
            for where, d in walk(load(f)):
                linked = {l.get("text") for l in d.get("links", []) or [] if l.get("person_id") == pid}
                if kind == "people" and where == "":
                    continue  # 人物の summary などはリンクを表示しない
                if d.get("person_id") == pid:
                    continue  # 家系・主君などの項目そのものがこの人を指している
                for k, v in own_strings(d):
                    found = [n for n in names if n in v and not any(n in t for t in linked if t)]
                    # 長い名前に含まれる短い名前（「武田信玄」の中の「信玄」）は重ねて出さない
                    found = [n for n in found if not any(n != m and n in m and m in v for m in found)]
                    if found and not linked:
                        hits += 1
                        i = v.find(found[0])
                        snippet = v[max(0, i - 20): i + len(found[0]) + 20].replace("\n", " ")
                        print(f"{f.relative_to(ROOT)}  {where}.{k}  「{found[0]}」 …{snippet}…")
    print(f"リンクのない箇所: {hits}")


if __name__ == "__main__":
    main()
