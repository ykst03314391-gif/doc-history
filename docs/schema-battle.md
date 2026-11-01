# 合戦（battle）スキーマ設計 v0.1

「桶狭間の戦い」「本能寺の変」など、合戦・政変を 1 件 1 ファイルで扱う。
`data/battles/<id>.json` に格納し、一覧は `data/battles/index.json` に持つ。

## 相互参照の要（battle_id）

合戦の `id` は、以下から既に参照されている。合戦ページを作ると自動でつながる。

- 人物の年表イベント（`timeline[].battle_id`）→ 合戦ページへリンク
- 記事のメタ（`relatedBattles[]`）→ 合戦ページに「関連する考察・記事」を表示

## 一覧（index.json の各要素）

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | string | 一意なID（例：`okehazama`）。人物の `battle_id` と一致させる |
| `name` | string | 合戦名 |
| `kana` | string | 読みがな |
| `year` | number | 主な年（一覧の並び順に使う） |
| `summary` | string | 一言紹介 |
| `prefecture` | string | 主な所在地の都道府県 |
| `province` | string | 主な戦場の令制国（例：`尾張国`）。詳細の `place.name` の先頭の国名と合わせる。一覧の地域別・国別に使う。何か国にもわたる攻めも主な戦場の国を1つ書く |
| `lat` / `lng` | number | 主な戦場の座標（詳細の `place` と同じ値）。一覧で同じ国の中を北から並べるのに使う |
| `sides` | { name, outcome }[] | 対戦した陣営と勝敗（詳細の `sides` から `name` と `outcome` だけを写す）。一覧カードに「織田軍（勝）× 今川軍（負）」の形で出す。詳細を直したらこちらも直す |
| `photo` | Photo? | 古戦場・史跡の写真。形は城の `photo`（schema-castle.md）と同じで、画像は `assets/img/battles/<id>.jpg`（幅720px）と `thumbs/<id>.jpg`（160×160）。戦場が城一覧の城と同じなら、その城の写真をそのまま使ってよい |

## 詳細（<id>.json）

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | string | 一覧と対応 |
| `name` / `kana` | string | 合戦名・読み |
| `summary` | string | 一言紹介 |
| `date` | DateInfo | 発生時期（`year` / `month` / `day` / `era` / `note`） |
| `place` | Place | 場所（`name` / `prefecture` / `city` / `address`? / `lat`? / `lng`?）。`address`＝古戦場の現代の住所、`lat`/`lng`＝座標。あれば詳細ページに「古戦場（現在地）」として住所＋地図（OpenStreetMap 埋め込み・APIキー不要）を表示 |
| `description` | string[] | 解説本文（段落の配列） |
| `links` | { text, person_id? / battle_id? / castle_id? }[] | 説明文（解説・結果・史跡・時系列・逸話の説明）の中の語をサイト内ページへのリンクにする（段落・項目ごとに各語の最初の1か所）。人物の年表の `links` と同じ形 |
| `sides` | Side[] | 対戦した陣営 |
| `result` | string | 結果の要約 |
| `spots` | Spot[] | 関連する史跡（`type` / `name` / `prefecture` / `city` / `description` / `url`? / `urlName`?）。`url` があれば「公式：〈`urlName`〉 ↗」の形で**公式サイト名つき**リンクを表示（史跡・資料館の**実在する公式ページ**のみ。URLは捏造しない）。詳細ページに「関連する史跡」として表示 |
| `relatedPeople` | string[] | 関連人物の `person_id`（補助） |
| `sources` | Source[] | 出典（人物スキーマと同形式） |
| `tags` | string[] | タグ |
| `updatedAt` | string | 更新日 |

### Side（陣営）
```
{ "name": string,               // 陣営名（例：織田軍）
  "outcome"?: "勝利" | "敗北" | "引き分け" | "決着つかず",
  "commanders"?: [ { "person_id"?: string, "name": string } ],   // 大将・総大将
  "participants"?: [ { "person_id"?: string, "name": string } ], // 従軍した主な武将
  "note"?: string }
```
> `commanders` は総大将・主将。`participants` はそのほかの従軍した主な武将。
> どちらも `person_id` があれば人物ページへリンクする。

## 表示仕様

- 一覧：`battles.html` … `index.json` からカード表示。並べ方は年代順／50音順／地域別／国別（地域・国は `province`、同じ国の中は北から）。下に写真の出典
- 詳細：`battle.html?id=<id>` …
  - 見出し（名前・日付・場所・要約）
  - **対戦した陣営**（勝敗つき、武将は人物ページへリンク）
  - 解説本文
  - 関連する考察・記事（`relatedBattles` で紐付く記事）
  - 出典

## 今後の拡張予定

- 合戦の経過を時系列（ミニ年表）で表す
- 地図表示（`place` の緯度経度）
- 「地域から探す」に合戦（古戦場）を組み込む
