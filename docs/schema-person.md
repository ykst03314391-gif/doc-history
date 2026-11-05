# 人物データ スキーマ設計 v0.1

戦国武将など「人物」1人分のデータ構造を定義する。
`data/people/<id>.json` に 1 人 1 ファイルで格納する想定。

## 設計方針

- **相互参照は ID で行う**：人物・城・合戦などは文字列 ID で相互リンクする（例：家臣団は名前ではなく `person_id` の配列）。これにより「逆引き検索」「家臣団からの逆リンク」を機械的に生成できる。
- **出典を紐付けられる**：諸説ある情報も扱うため、主要な記述に出典（`sources`）を関連付けられる構造にする。
- **地域情報を持たせる**：史跡・博物館などに `prefecture` / `city` を付け、「地域から探す」機能に使う。
- **時系列は配列**：官位・領地などの「変遷」は、年つきの配列で持つ。
- **未確定・諸説あり**を表現できる：`uncertain: true` や `note` で補足する。

## トップレベル構造

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | string | 一意なID（例：`oda-nobunaga`） |
| `name` | string | 正式・代表的な氏名 |
| `kana` | string | 読みがな |
| `category` | string? | `"other"` で武将ではない人物（武将の家族など）。無指定は武将。`index.json` にも同じ値を書く |
| `role` | string? | 人物の段階（CLAUDE.md の「進め方」）。`"main"` は主役（考察記事を書く人物）、`"frozen"` は主役でないのに詳細まで書いてある凍結中の人物、無指定は脇役。`index.json` にも同じ値を書く（下記） |
| `summary` | string | 一言紹介（一覧カード・クイズ・SEO 用の短い要約） |
| `lens` | Lens? | この人物への問い（ページ全体で捉え直す大きな問いと、論点を束ねた答え）。「捉え直す」の組の先頭に出す（下記） |
| `aliases` | Alias[] | 幼名・通称・実名・法名などの名乗り。改めた順（古い順）に並べ、ページ冒頭に「改名」として矢印でつないで出す |
| `nameHistory` | NameEntry[] | 呼び名の変遷（史料での呼ばれ方を時系列で） |
| `kamon` | Kamon | 家紋 |
| `birth` | DateInfo | 生年（月日は不明可） |
| `death` | DateInfo | 没年 |
| `birthplace` | Place | 出生地 |
| `ranks` | Rank[] | 官位の変遷（時系列） |
| `family` | Relation[] | 親・子・親戚などの関係（家系図の元データ） |
| `lords` | Service[] | 仕えた人（主君） |
| `retainers` | Retainer[] | 家臣団（出仕期間・備考を持てる） |
| `yoriki` | Retainer[] | 与力（主君から付けられた大名。家臣ではないので家臣団と分ける）。形は Retainer と同じ |
| `yorikiNote` | { text: string, sourceId?: string } | 与力欄の補足（名前の分からない与力がいたことなど）。一覧の下に出す |
| `territories` | Territory[] | 領地変遷（時系列） |
| `timeline` | Event[] | 個人の年表 |
| `episodes` | Episode[] | 逸話・エピソード |
| `questions` | Question[] | 諸説・疑問（諸説ある事柄や「なぜ？」という問い）。題名と短い説明だけを書き、詳しくは考察記事で論じる |
| `achievements` | Achievement[] | 成し遂げたこと |
| `reputation` | Reputation[] | 人物評価（存命時・死去後、または同時代・江戸・明治・昭和・現代の時代別） |
| `references` | Reference[] | 参考書籍（アフィリエイト対象） |
| `portrait` | Portrait? | 肖像画。見出しの右に表示（下記） |
| `papaneko` | { src, caption?, note?, credit? }? | ぱぱねこ版のその人物の絵（`assets/img/chara/<person_id>.svg`）。肖像画の右に並べて出し、表記（省略時「イラスト：ぱぱねこの戦国見立て（AIで作成）」、管理人の手描きなら `credit` に「イラスト：ぱぱねこの戦国見立て」）はページ末尾の「画像の出典」に出す。キャプションには「（イメージ）」を付ける |
| `spots` | Spot[] | ゆかりの地（城跡・銅像・刀剣・肖像画・博物館・名物など） |
| `graves` | Graves | 墓所（現存・諸説あり・不明・なしを必ず明示する） |
| `images` | Image[] | 人物画像 |
| `sources` | Source[] | 出典の一覧（本文から `sourceId` で参照）。各出典の `note` も出典欄に表示する |
| `toVerify` | VerifyItem[] | 要確認（調査メモ）。まだ原典・原本で確かめられていない事柄と、確かめるのに当たる資料。ページの最後（出典の下）に備考として出す |
| `sourcesChecked` | boolean | 出典を1つずつ当たり、確認状況を各出典の `note` に書き終えた人物は `true`。ページ上部の「⚠ 仮置きデータ」の注記が「出典の確認状況」の案内に替わる |
| `tags` | string[] | 分類タグ（例：`織田家`, `三英傑`） |
| `updatedAt` | string | 最終更新日（ISO 8601） |

### ページの並び（欄の組）
人物ページは、ヘッダー（名前・生没年・要約・基本情報）の後に、欄を次の5つの組に分けて並べる（`js/person.js` の `GROUPS`）。組の見出しは README の人物データベースの問いかけによる。中身のない欄・組は出さない。目次も組ごとに入れ子にする。

| 組 | 欄（この順） |
|---|---|
| 捉え直す ― 本当にそうか？ | この人物への問い（`lens`）・人物評価・諸説・疑問・関連する考察・記事 |
| どんな人だっけ？ ― 事績と生涯 | 成し遂げたこと・年表・領地の変遷・逸話・エピソード |
| 誰だっけ？ ― 家系・主従・呼び名 | 家系・親族・仕えた人・家臣団・与力・官位・呼び名の変遷 |
| もっと知りたい！ ― 読む本・行く現地 | 参考書籍・ゆかりの地・史跡 |
| 出典と確認状況 | 出典・要確認（調査メモ） |

考察が主役なので「捉え直す」を先頭に置き、データの欄はその後ろに脚注として置く。

### 説明文の中の原文の引用
説明文（`note`・`description`・`body`・`text` など）で史料の原文をそのまま引くときは、「」ではなく `{{…}}` で書く（例：`日記は{{美濃守ハハヤ大力次第也}}と書く`）。表示では「…」で括って藍色にし、地の文や、書名・用語・現代語訳を括った「」と見分ける。原文の表記どおりの呼び名（`{{美濃守殿}}` など）も含む。

## サブ構造の定義

### Alias（別名）
```
{ "type": "幼名" | "通称" | "実名" | "法名" | "法号" | "戒名" | "その他", "value": string,
  "year"?: number,   // 改めた年（西暦）。表示では名乗りの後に（1584）と添える。改めた年が分からず初見の年を入れるときは note にそう書く
  "note"?: string }
```
> 表示は「改名」の行で、配列の順に「→」でつなぐ（例：小竹 → 小一郎 → 長秀 → 羽柴秀長（1584））。並べ替えはしないので、データを古い順に置く。他人からの呼び名（北条方の「長尾輝虎」など）は改名ではないので入れず、`nameHistory` や `reputation` に書く。

### Kamon（家紋）
```
{ "name": string, "clan_id"?: string, "note"?: string, "links"?: Link[] }   // 例: 織田木瓜
```
> `clan_id` を付けると、その大名家の家紋の絵（`data/clans/index.json` の `kamonImage`）を家紋名の前に出し、作者・ライセンス・出典を添える。絵は大名家と共用で、人物ごとには持たない。家の紋と違う紋を使った人物には付けない。

### DateInfo（年月日 / 月日は不明可）
```
{ "year"?: number, "month"?: number, "day"?: number,
  "era"?: string,        // 和暦（例: 天文3年）
  "uncertain"?: boolean, // 諸説あり
  "note"?: string,
  "sourceId"?: string }
```

### Portrait（肖像画）
```
Portrait = {
  "src": string,            // assets/img/portraits/<person_id>.jpg（幅480px程度のJPEG）
  "caption"?: string,       // 作品名（例：「豊臣秀長像」「伝 狩野光信筆」）
  "holder"?: string,        // 所蔵（寺社・博物館など。模写なら模写本の所蔵と原本の所蔵を併記）
  "note"?: string,          // 補足（「江戸時代の浮世絵（想像図）」「部分」など）
  "source": { "name": string, "url": string },   // 入手元（Wikimedia Commons のファイルページなど）
  "license": string         // 「パブリックドメイン」など
}
```
> 使うのは**著作権の切れた平面の作品（江戸時代以前の肖像画・浮世絵）**だけ。立体物の写真や近現代の作品は使わない。
> 同時代の肖像でないもの（後世の想像図）は `note` に必ず書く。
> 肖像画が見つからない人物は `portrait` を省く。人物ページと一覧には「画像なし」の絵（`assets/img/portraits/noimage.svg`）を自動で表示する。
> 一覧（`data/people/index.json`）には `thumb` に顔を切り出した正方形サムネイル（`assets/img/portraits/thumbs/<person_id>.jpg`、160×160）を書くと、武将一覧のカード右上に丸く表示する。

> 一覧（`data/people/index.json`）に `update: { date, items }`（最後に手を入れた日付〔YYYY-MM-DD〕と、何を直したかを短く書いた箇条の配列）を書くと、人物名から探す（`people.html`）の上に「最近更新した人物」として日付の新しい順に3人まで並べる。箇条は2つまで出し、3つ以上あれば「ほか」を添える。残すのは最後の更新だけで、次に手を入れたら書き換える（履歴は持たない）。

> 一覧（`data/people/index.json`）の `role` が `"main"` の人物は、人物名から探す（`people.html`）の上の「考察の主役」に2列で並べ、下の一覧からは外す。下の一覧（`others.html` も同じ）は、記事（`data/articles/index.json` の `relatedPeople`。`draft` の記事は数えない）か主役の個別データ（中の `person_id`）に出てくる人物を先に並べ、カードに「登場する記事」（2本まで。なければ「主役ページ」）を出す。どこにも出てこない人物は末尾の「記事にまだ出てこない人物」にまとめる。`"frozen"` の人物は、詳細ページの仮置きの注記の頭に「この人物は詳しく書き足していません」の断り書きを出す。主役を増やしたら `role` を `"main"` にする（凍結中の人物なら `"frozen"` を書き換える）。

> 一覧（`data/people/index.json`）の `category` が `"other"` の人物は武将一覧（`people.html`）に出さず、「その他の人物」（`others.html`）に並べる。`"other"` にするのは、武将ではない人物（家族・茶人など）と、主な武将の周りに名前の出てくる脇役の武将（どれを移すかは管理人が決める）。個別ファイルにも同じ `category` を書く。どちらも読み（`kana`）の50音順で、行ごとに見出しを付ける。

> 一覧（`data/people/index.json`）の生没年は `birthYear`/`deathYear`（西暦）に加え、`birthEra`/`deathEra` に個別JSONの `birth.era`/`death.era` と同じ和暦を書く。カードには「天文9年（1540） 〜 天正19年1月22日（1591）」の形で表示する（和暦が無ければ西暦のみ）。

### Place / Spot（場所）
```
Place = { "name": string, "prefecture"?: string, "city"?: string, "lat"?: number, "lng"?: number }

Spot = {
  "type": "城跡" | "銅像" | "刀剣" | "肖像画" | "博物館" | "資料館" | "名物" | "神社仏閣" | "その他",
  "name": string,
  "prefecture"?: string, "city"?: string,
  "lat"?: number, "lng"?: number,
  "description"?: string,   // 所蔵先の博物館名などもここに記す（例：「福岡市博物館蔵、国宝」）
  "sourceId"?: string,
  "castle_id"?: string,     // 城DBに詳細ページがある城跡なら、名前を城ページへのリンクにする
  "url"?: string,           // 公式サイトや自治体の紹介ページ。名前を外部リンクにする（castle_id があればそちらを優先）
  "urlLabel"?: string       // url がその場所自体のページでないとき（観光案内の一覧、上位組織のトップ、所蔵先など）、リンク先を示す
}
```
> `Spot` に地域を持たせることで「地域から探す」「逆引き（この人物→行くべき場所）」の両方に使える。
> 地図：`lat`/`lng` か `castle_id` のある場所（墓所の `places` も含む）は、「ゆかりの地・史跡」の欄の上の地図に番号付きのピンで示す（番号は墓所→ゆかりの地の表示順）。座標が建物そのものでなく町の中心などのおおよその位置なら `"approx": true`（ピンの吹き出しに「おおよそ」と出す）。所蔵品（刀剣・名物など）は所蔵先の位置に置く。
> 刀剣・肖像画は所蔵する博物館の所在地を `prefecture` / `city` に入れると、その地域からも辿れる。
> **墓所は `graves` フィールドで別管理する**（不明・なしも明示するため）。表示は「ゆかりの地・史跡」の先頭にまとめ、状態と注記の下に墓所の場所を並べる。`spots` に同じ名前の場所があれば、墓所の側だけを出す（`spots` は「地域から探す」でも使うので消さなくてよい）。

### NameEntry（呼び名の変遷）
```
{ "year"?: number, "era"?: string,   // era は和暦や「幼少期」など。year が無ければ era だけを出す
  "value": string, "note"?: string, "sourceId"?: string, "uncertain"?: boolean }
```
> `nameHistory` に時系列で並べ、「呼び名の変遷」として「誰だっけ？」の組の最後に出す。史料がその時期に実際どう呼んでいるかを書く（`aliases` は一覧、こちらは移り変わり）。

### Rank（官位変遷）
```
{ "year"?: number, "title": string, "note"?: string, "sourceId"?: string }
```

### Relation（家系・関係）
```
{ "relation": "父" | "母" | "養父" | "養母" | "義父" | "兄" | "弟" | "姉" | "妹" | "夫" | "妻" | "正室" | "継室" | "側室"
              | "子" | "娘" | "養子" | "養女" | "叔父" | "甥" | "従兄弟" | "その他",
              // 正室・継室・側室の別が分かれば「妻」より具体的に書く。娘を他の子と分けて示したいときは「娘」
  "person_id"?: string,   // サイト内に人物ページがある場合
  "name": string,         // ページが無い場合の表示名
  "note"?: string,
  "sourceId"?: string | string[], // 関係・注記の根拠（sources の id）。リンク先の人物ページで出典を示せる場合は付けない
  "article_id"?: string } // この関係を論じた考察記事の id。注記の横に「考察」リンクを出す。記事が下書き（draft）の間はリンクにせず「考察（執筆中）」と予告する
                          // 同じ記事を家系の欄の末尾の疑問（questions の place: "family"）でつないでいるときは付けない
```

### Service（仕えた主君）
```
{ "person_id"?: string, "name": string, "from"?: number, "to"?: number, "note"?: string,
  "sourceId"?: string }   // 仕えた期間（主に始まりの年）の根拠（sources の id）
```

### Retainer（家臣）
```
{ "person_id"?: string,   // サイト内に人物ページがある場合
  "name": string,         // ページが無い場合の表示名
  "from"?: number, "to"?: number,   // 出仕〜離反/死去などの期間
  "note"?: string,        // 例: 「本能寺の変で謀反」
  "sourceId"?: string }   // 家臣だったことの根拠（sources の id）
```
> 単なる ID 配列にせず期間・備考を持たせることで、離反（例：明智光秀）や出仕時期を記録できる。
> 与力（例：秀長に付けられた筒井定次・長宗我部元親）は `retainers` に入れず `yoriki` に分ける。付けられた側の人物では、`lords` にその主君を書く。

### Territory（領地変遷）
```
{ "year"?: number, "name": string, "prefecture"?: string | string[], "note"?: string, "sourceId"?: string | string[],
  "province"?: string | string[],   // 地図で塗る国（例 "大和国"）。国全体を領したとき
  "district"?: string | string[],   // 地図で塗る郡（例 "但馬国朝来郡"）。国の一部だけのときは province より優先して郡だけを塗る
                                    // 郡と国全体が混じるときは国名も並べる（例 ["伊勢国安濃郡", "伊賀国"]）
  "until"?: number,                 // 手放した・移った年。地図では淡く点線で描き、一覧は「1580〜1585年」と出す（死去まで持っていたなら書かない）
  "untilNote"?: string,             // 手放した事情（国替え・改易など）と根拠
  "mapNote"?: string,               // 地図の補足（塗らなかった範囲とその理由など）。その時点の地図の説明に添える
  "place"?: string, "lat"?: number, "lng"?: number, "approx"?: boolean }   // ピンの地点
```
> 同じ時に一緒に与えられた国・郡は、項目を分けずに1つの項目にまとめる（地図で同じ番号・同じ色になる）。
> 国の一部しか領していない（城代・数郡の拝領など）のに province だけを入れると国全体が塗られてしまう。その場合は district で郡を指定する。郡名は `assets/geo/districts.geojson` の name（1920年の郡名）に合わせる。

### Event（年表項目）
```
{ "year": number, "month"?: number, "day"?: number,
  "toYear"?: number,      // 出来事ではなく期間についての注記（記録の空白など）。「1541〜1572年」と出し、年表では控えめに表示する
  "title": string, "description"?: string,
  "battle_id"?: string,   // 合戦ページへのリンク
  "castle_id"?: string,   // 城ページへのリンク（城代・城主就任など。battle_id があればそちらを優先）
  "links"?: [ { "text": string, "person_id"?: string, "battle_id"?: string, "castle_id"?: string } ],
                          // description の中の語をサイト内ページへのリンクにする（各語の最初の1か所）
  "place"?: string, "lat"?: number, "lng"?: number, "approx"?: boolean,
                          // 年表の上の地図に置く地点。無ければ castle_id の城、battle_id の合戦の地点（各 index.json の lat/lng）を使う
  "sourceId"?: string | string[] }
```
> 記録の空白：史料に現れない期間は伝承で埋めず、`toYear` を付けた項目を1つ置いて、なぜ空白なのかと、よく語られる話の出どころを書く（例：豊臣秀長の1541〜1572年）。
> 年表の地図：地点の分かる出来事に年表の番号を付け、地図にピンを立てる（近い地点はまとめる）。城・合戦の地点が出来事の場所とずれるとき（城とは別の場所での出来事など）は `lat`/`lng` を書く。
> 例：`"links": [{ "text": "浅井新八", "person_id": "asai-shinpachi" }]` で、説明文の「浅井新八」が人物ページへのリンクになる。
> `links` は年表のほか、注記・説明を持つほかの項目（呼び名の変遷・官位・家系・主君・家臣団・与力と yorikiNote・領地の note と untilNote・成し遂げたこと・人物評価・逸話・問い・ゆかりの地・墓所・参考書籍・出典・要確認）にも同じ形で書ける。リンクになるのはその項目の注記・説明（人物評価は本文の段落ごと）の中の語。

### Episode（逸話）
```
{ "title": string, "body": string, "uncertain"?: boolean, "sourceId"?: string }
```

### Question（諸説・疑問）
```
{ "title": string,            // 問いの形の題名（例：「秀吉とは異父兄弟なのか？」）
  "text": string,             // 何が分かれているか・何が分からないかの短い説明（2〜3文）
  "sourceId"?: string | string[],
  "article_id"?: string,      // 詳しく論じる考察記事の id。説明の下にリンクを出す。下書き（draft）の間は「考察（執筆中）」と予告する
  "aspect"?: string,          // place "lens" のときだけ。大きな問いのどの面を確かめる論点か（例：「兄との関係」）。札に「論点1：兄との関係」と出す
  "place"?: string }          // 置き場所。"lens" は「この人物への問い」の下、"lensSide" は大きな問いと並ぶ問い（論点に分けず、title を見出しにした欄を大きな問いの欄のすぐ後に立てる。秀長：大河ドラマの秀長像）、"family"・"nameHistory" などの欄の名前はその欄の末尾（「この欄をめぐる疑問」）。
                              // 無いとき、または置き場所の欄（lens なら `lens`）が無いときは「諸説・疑問」に出す
```
> 結論はここに書かず、記事に回す。人物ページは「どんな論点があるか」の目次の役目にとどめる。
> 人物像そのものを問い直す問い（秀長：補佐役で満足していたか・大和の名君か・長生きしていたら）は `"lens"`、素性の謎は関わる欄へ（異父弟か・実子はいたか → `"family"`、改名の理由 → `"nameHistory"`）。

### Lens（この人物への問い）
```
{ "title": string,       // 欄の見出し（例：「「補佐役」という秀長像は当たっているのか」）
  "question": string,    // ページ全体で捉え直す大きな問い。place: "lens" の論点が、問いのどの面を確かめるのかを各論点の aspect に書く
  "answer"?: string,     // 論点を束ねた問いへの答え（
 で段落）。最後の論点の下に「ぱぱねこのまとめ」の開閉ボタン（ふだんは閉じる）で出す
  "view"?: string }      // 筆者の見立て（
 で段落）。管理人が書いたときだけ、まとめの中で答えのあとに「ぱぱねこの見立て」の囲みで出す。Claude は書かない
```
> 答えと見立ての書き分けは記事と同じ。**答え**は史料を根拠に示せる読み（論点の記事の「先に答えを言うと」・結論を束ねる。「〜だった」と言い切ってよい）、**見立て**は史料の外へ一歩出る管理人の私見（「私は〜と見る」）。答えは Claude がたたき台を書いて管理人が確定し、見立ては管理人だけが書く。どちらも管理人の判断なので、札にぱぱねこの顔が付く。
> 問いを立てていない人物（概要ページなど）は `lens` を書かない。その場合、「捉え直す」の組は人物評価・諸説・疑問だけになるか、出ない。

### Achievement（成し遂げたこと）
```
{ "title": string, "description"?: string, "sourceId"?: string }
```

### VerifyItem（要確認・調査メモ）
```
{ "section"?: string,          // ページのどの欄の話か（例：「呼び名」「官位」）。見出しの左に出す
  "title": string,             // 何を確かめるか（例：「「長秀」の終見の日付」）
  "text": string,              // 何が分かっていないか・食い違っているか
  "checkWith"?: string[] }     // 確かめるのに当たる資料（書名・頁・所蔵先など）
```
> 本文の注記には「要確認（ページ末尾の調査メモ）」とだけ書き、詳しい中身と確認先はここにまとめる。確かめ終えたら本文を直し、項目を消す。

### Reference（参考書籍・アフィリエイト）
```
{ "title": string, "author"?: string, "publisher"?: string, "year"?: number,
  "isbn"?: string, "affiliateUrl"?: string, "note"?: string }
```

### Image（画像）
```
{ "src": string, "caption"?: string, "credit"?: string, "license"?: string }
```

### Reputation（人物評価）
```
{ "era": "存命時" | "死去後" | "同時代" | "江戸" | "明治" | "昭和" | "現代" | string,
  "title"?: string,       // 項目の小見出し（例：「熊野の木の一件」）
  "body": string,         // その時代における評価・人物像
  "sourceId"?: string }
```
> 時代ごとに評価がどう変わってきたかを示す。戦国期の同時代評価から、江戸の軍記物、近代の再評価、現代の研究による見直しまで。
> 「存命時」「死去後」の2区分で書いてもよい（豊臣秀長など）。同じ era が続く項目はラベルを最初の1つだけ表示するので、出典ごとに項目を分けて並べる。

### Graves（墓所）
```
{ "status": "現存" | "諸説あり" | "不明" | "なし",   // 必ず記す
  "note"?: string, "sourceId"?: string | string[],   // note の典拠
  "places"?: [
    { "name": string, "prefecture"?: string, "city"?: string,
      "description"?: string, "sourceId"?: string, "url"?: string, "urlLabel"?: string }
  ] }
```
> 墓所は「わからない」ことも情報。遺骸が見つかっていない・供養塔が各地にある等を `status` と `note` で明示する。

### Source（出典）
```
{ "id": string,          // 本文から sourceId で参照
  "title": string,
  "author"?: string,
  "publisher"?: string,
  "year"?: number | string,  // 刊行年・成立年。成立がはっきりしない史料は文字列で書く（例「江戸時代初期成立（池田家文庫本に慶長15年〈1610〉の奥書）」）
  "page"?: string,
  "url"?: string,
  "urlLabel"?: string,    // url が資料そのものでないとき（NDLサーチの書誌、刊本の別の巻、出版社の紹介、報道発表など）、リンク先を示す
  "note"?: string,        // この資料がこの人について伝えることと、確かめた程度（「原本画像と照合」「原典は未確認で、〇〇の引用による」「本は未見」など）
  "type"?: "史料" | "書籍" | "研究書" | "論文" | "寄稿" | "ネット記事" | "その他",  // 出典の種別。枠だけの札で出す
  "primary"?: "一次資料" | "二次資料" | "研究" }   // 資料の区分。塗りつぶしの札で出す
```
| `primary` | 中身 | `type` の例 |
|---|---|---|
| 一次資料 | 当事者・同時代に近い立場が残した記録（日記・書状・石塔銘、『信長公記』など） | 史料 |
| 二次資料 | 後世に編纂された軍記・伝記・逸話集（甫庵太閤記・森家先代実録など） | 史料・書籍 |
| 研究 | 研究者の著書・論文・研究者本人の寄稿。事実そのものではなく「誰がどう読んだか」の典拠なので、説の持ち主と頁を `note` に書く | 研究書・論文・寄稿 |
| （付けない） | Wikipedia などの概要、小説、展覧会の出品目録 | ネット記事・書籍・その他 |

> 区分の決め方と確認の程度の書き方は `docs/sources.md`（「研究・論文の参照」）と `.claude/skills/person-page/SKILL.md` を参照。小説家・ライターの一般向け記事、ドラマ解説は出典にしない。

## 今後の拡張予定

- 合戦（battle）・城（castle）・大名家（clan）のスキーマを別途定義し、`*_id` で相互参照する
- 「世代別比較」用に、生没年から自動でグルーピングできるようにする（当面は `birth.year` から算出）
- 「官位変遷」を横断表示して比較する（位階を構造化して高低を比較可能にする案）
- **グループ（group）エンティティ**：武田十六将・徳川四天王など、順序やメンバーが確定した集団を表現する（当面は `tags` で代用）
- **「信長の野望、実は間違ってる？」等の考察**：人物データではなく記事（article）側で管理する方針
