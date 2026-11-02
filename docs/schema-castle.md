# 城（castle）スキーマ設計 v0.1

城を 1 件 1 ファイルで扱う。一覧は `data/castles/index.json`、詳細は `data/castles/<id>.json`（詳細を書いた城だけ）。
一覧は `castles.html`（武将一覧 `people.html` と同じカード形式）、詳細は `castle.html?id=<id>`。

## 一覧（index.json の各要素）

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | string | 一意なID（例：`azuchi`）。将来の詳細ページ `castle.html?id=` 用 |
| `name` | string | 城名 |
| `kana` | string | 読みがな |
| `alias` | string? | 別名（例：岐阜城 → `稲葉山城`） |
| `type` | string | 縄張りの分類（`山城` / `平山城` / `平城`） |
| `prefecture` / `city` | string | 現在の所在地 |
| `province` | string | 令制国（例：`越後国`）。一覧の地域別（地域の下に国を並べる）に使う |
| `lat` / `lng` | number | 城の座標。一覧で同じ見出しの中を北から並べるのに使う |
| `builtYear` | number \| null | 築城年（西暦）。不詳なら `null` |
| `builder` | string? | 築城者（`builtYear` があるときに併記） |
| `builtNote` | string? | `builtYear` が `null` のときに代わりに表示する補足 |
| `summary` | string | 一言紹介 |
| `relatedPeople` | string[] | ゆかりの人物の `person_id`。人物DBにある人だけリンク表示 |
| `relatedBattles` | string[] | 関連する合戦の `battle_id`。合戦DBにあるものだけリンク表示 |
| `tags` | string[] | タグ（大名家・旧国名・史跡指定など）。一覧の「国宝」は `国宝`、「日本100名城」は `日本100名城` / `続日本100名城` のタグで判定する |
| `detail` | boolean? | `true` なら `<id>.json` があり、カードの城名と「詳しく見る」から詳細ページへリンクする |
| `photo` | Photo? | 城の写真。一覧カード右上に `thumb`（角丸の正方形）、詳細ページの見出し右に `src` を表示し、クレジットを添える |

### Photo（写真）
```
Photo = {
  "src": string,        // assets/img/castles/<id>.jpg（幅720px）
  "thumb": string,      // assets/img/castles/thumbs/<id>.jpg（160×160）
  "caption": string,
  "note"?: string,      // 復興天守・模擬天守など、戦国期の姿でない場合は必ず書く
  "own"?: true,         // 管理人が自分で撮った写真
  "taken"?: string,     // 撮影日 "2026-11" / "2026-11-02"（own のとき。季節・整備の状況で見え方が変わるため）
  "author"?: string,    // 撮影者（Commons の作者名。own のときは省略すると「戦国クロニクル」と出す）
  "license"?: string,   // "CC BY-SA 4.0" / "CC0" / "パブリックドメイン" など（own でなければ必須。own は省略すると CC BY 4.0）
  "licenseUrl"?: string,
  "source"?: { "name": string, "url": string }  // Commons のファイルページ（own でなければ必須）
}
```
> 建物の写真には撮影者の著作権があるので、他人の写真は CC0・パブリックドメイン・CC BY・CC BY-SA のものだけを使う。CCの写真は「作者・ライセンス（リンク）・出典・縮小・トリミングしたこと」を表示する（城一覧の下の「写真の出典」と詳細ページのキャプション）。
>
> 自分で撮った写真は `own: true` にし、`source` は書かない。表記は「撮影：戦国クロニクル（2026年11月） ／ CC BY 4.0」になる（転載可、2026-11-02 に管理人が決定）。`license` は省略すると CC BY 4.0（条文へのリンク付き）を出す。載せる前の確認は `.claude/rules/own-photo.md`。表記の組み立ては城・合戦・記事で共用の `js/photo.js`。

## 詳細（<id>.json）

| フィールド | 型 | 説明 |
|---|---|---|
| `id` / `name` / `kana` / `alias`? / `type` / `summary` | | 一覧と同じ意味 |
| `built` | `{ year?, era?, builder?, note?, uncertain? }` | 築城。`uncertain: true` で「諸説あり」 |
| `abandoned` | 同上（`builder` なし） | 廃城。現存・未廃城なら省略（「—」表示） |
| `lords` | `{ name, person_id?, role?, from?, to?, note?, uncertain?, sourceId? }[]` | 歴代城主。`role` は「城代」など。`person_id` があれば人物ページへリンク |
| `changes` | `{ year?, toYear?, era?, kind?, title, description?, quote?, uncertain?, sourceId? }[]` | 増改築の歴史（年代順）。`kind` は「築城・改修・増築・廃城・破却・再建・復元・調査・整備・保存」など。期間なら `toYear` も書く。`quote` は翻刻と照合した原文だけ |
| `features` | `{ title, body, sourceId? }[]` | 城としての特徴（縄張り・石垣・立地など） |
| `scale` | `{ elevation?, mountain?, extent?, note?, sourceId? }` | 大きさ（標高m・山名・縄張りの範囲）。`elevation` がなければ `mountain` を「立地」として表示 |
| `place` | `{ name?, prefecture, city, address?, lat?, lng? }` | 所在地。`lat`/`lng` があれば OpenStreetMap を埋め込む（合戦ページと同じ） |
| `battles` | `{ year?, era?, name, battle_id?, description?, quote?, uncertain?, sourceId? }[]` | この城で起きた合戦。`battle_id` が合戦DBにあればリンク。`quote` は史料の原文（翻刻と照合したものだけ） |
| `present` | `{ status?, designations?: {year, title}[], description?: string[] }` | 現在の様子・史跡指定など |
| `visit` | `{ asOf, checkedWith?, hoursTitle?, hours?: {season, period, time, last?}[], hoursNote?, closed?, fee?, feeNote?, sourceId? }` | 見学情報。**変わりやすいので `asOf`（確認日）必須**。見出し直下に「◯年◯月◯日 時点の情報（`checkedWith`）」を表示（既定は「公式サイトで確認」）。公式で確認できなかったときは `checkedWith` にその旨を書く。`hoursTitle` 既定は「入城時間」。`last` が一つもなければ最終登城の列は出さない |
| `access` | `{ mode, route, time?, note? }[]` | 交通アクセス（`mode`＝電車・バス・車など） |
| `accessSourceId` | string? | アクセス情報の出典 |
| `official` | `{ url, name }`? | 公式サイト（実在を確認したURLのみ。捏造しない） |
| `spots` | Spot[] | 周辺の見どころ（合戦スキーマと同形式） |
| `relatedPeople` | string[] | 関連人物の `person_id` |
| `links` | { text, person_id? / battle_id? / castle_id? }[] | 説明文（城主・増改築・特徴・合戦・現在の様子・見どころの説明、築城・廃城の注記）の中の語をサイト内ページへのリンクにする（項目ごとに各語の最初の1か所）。合戦スキーマの `links` と同じ形 |
| `sources` | Source[] | 出典（人物スキーマと同形式。`note` も表示） |
| `tags` / `updatedAt` | | 他スキーマと同じ |

記事のメタに `relatedCastles[]`（城の `id`）を書くと、城ページに「関連する考察・記事」として表示する。

## 表示仕様

- 一覧：`castles.html` … `index.json` の並び順（おおむね東→西）でカード表示
  - 2行目：分類 ／ 所在地 ／ 築城年（築城者）または `builtNote`
  - ゆかりの人物・合戦を人物ページ／合戦ページへのリンクで表示
  - 検索：城名・かな・別名・分類・所在地・築城者・紹介文・タグ・ゆかりの人物名
- 詳細：`castle.html?id=<id>` … 基本情報 → 歴代城主 → 増改築の歴史 → 城としての特徴 → 所在地（地図） → この城で起きた合戦 → 現在の様子 → 見学情報 → 交通アクセス → 周辺の見どころ → 関連記事 → 出典

> ⚠️ 他のDBと同じく、現状のデータは仮置き（一般知識ベースの暫定値・出典未検証）。
