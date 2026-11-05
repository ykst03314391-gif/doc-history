# reference/ ― 原典スナップショット置き場（非公開・裏取り用）

サイト編集時に「事実の裏取り」で繰り返し参照する**原典テキストのローカル固定コピー**を置く。

## このフォルダの性格

- **サイトでは配信しない。** `data/` と違い、ページから読み込まれない編集者用の資料。
- **固定スナップショット。** Web上の原典は更新されうるので、参照した版をここに凍結し、再現性を確保する。
- **来歴付き。** 各ファイル先頭に、原典・底本・取得元URL・取得日・ライセンス・校正品質を明記する。

## フォルダ構成（出典元別）

```
reference/
├─ wikisource/  … Wikisource（新字版）翻刻を parse API で取得（13本）
├─ ndl/         … NDL 次世代デジタルライブラリーの OCR 全文（13本・要校正）
├─ jstage/      … J-STAGE 由来の論文（現状なし）      ┐
├─ cinii/       … CiNii の論文書誌メモ（2本）          ├ 論文系は発行年でさらに分ける（例 cinii/2025/）
└─ other/       … 機関リポジトリ/青空文庫/刊本 等      ┘
```

- **史料（wikisource/・ndl/）** は原典テキストを直下に置く。
- **論文系（jstage/・cinii/・other/）** は **発行年のサブフォルダ**（`<年>/<著者-短題>.md`）に分ける。
- 各サブフォルダに用途・置き方の README あり。空フォルダは将来用。

## 収録

### `wikisource/`（Wikisource 翻刻・13本）

| ファイル | 原典 | 史料区分 | sourceId | 主な関連 |
|---|---|---|---|---|
| `wikisource/shincho-koki.txt` | 太田牛一『信長公記』 | **一次史料** | `shincho-koki` | 信長・信忠・光秀・秀吉（信長期） |
| `wikisource/mikawa-monogatari.txt` | 大久保忠教『三河物語』 | 一次寄り（覚書・主観注意） | `mikawa-monogatari` | 家康・松平・戦国全般 |
| `wikisource/tensho-ki.txt` | 大村由己『天正記』（6記） | 一次寄り（同時代・秀吉方の顕彰） | `tensho-ki` | 秀吉・光秀（山崎）・勝家（賤ヶ岳）・別所 |
| `wikisource/koyo-gunkan.txt` | 『甲陽軍鑑』 | 二次（軍学書・要批判） | `koyo-gunkan` | 武田・上杉・川中島 |
| `wikisource/hoan-taikoki.txt` | 小瀬甫庵『太閤記』 | 二次（脚色多） | `hoan-taikoki` | 秀吉・信長 |
| `wikisource/kawasumi-taikoki.txt` | 『川角太閤記』 | 二次（覚書・聞書） | `kawasumi-taikoki` | 秀吉・光秀・本能寺 |
| `wikisource/oji-monogatari.txt` | 『祖父物語（朝日物語）』 | 二次（覚書・逸話） | `oji-monogatari` | 信長・秀吉期の逸話 |
| `wikisource/azai-sandaiki.txt` | 『浅井三代記』 | 二次（軍記・潤色） | `azai-sandaiki` | 浅井・朝倉・姉川 |
| `wikisource/hojo-godaiki.txt` | 三浦浄心『北条五代記』 | 二次（軍記） | `hojo-godaiki` | 後北条氏・小田原 |
| `wikisource/sakuma-gunki.txt` | 『佐久間軍記』 | 二次（軍記） | `sakuma-gunki` | 佐久間氏・織田家臣 |
| `wikisource/keicho-kenmonshu.txt` | 三浦浄心『慶長見聞集』 | 二次（江戸初期随筆） | `keicho-kenmonshu` | 江戸初期風俗（戦国は間接） |
| `wikisource/kanchiron.txt` | 『官地論』 | 二次（軍記） | `kanchiron` | 加賀富樫氏・加賀一向一揆 |
| `wikisource/ihon-odawaraki.txt` | 『異本小田原記』 | 二次（軍記・北条五代記系の異本） | `ihon-odawaraki` | 後北条・小田原 |

### `ndl/`（NDL 次世代デジタルライブラリー OCR・13本／要校正）

| ファイル | 原典 | 史料区分 | sourceId | 主な関連 |
|---|---|---|---|---|
| `ndl/jozan-kidan.txt` | 湯浅常山『常山紀談』(全3巻) | 二次（逸話集・**OCR/要校正**） | `jozan-kidan` | 信長・秀吉・武田・上杉の逸話 |
| `ndl/intoku-taiheiki.txt` | 香川正矩『陰徳太平記』(全81巻) | 二次（軍記・**OCR/要校正**） | `intoku-taiheiki` | 毛利・尼子・中国地方 |
| `ndl/meisho-genkoroku.txt` | 岡谷繁実『名将言行録』(前編上欠) | 二次（言行録・**OCR/要校正**） | `meisho-genkoroku` | 武将全般の言行・逸話 |
| `ndl/tamonin-nikki.txt` | 英俊ほか『多聞院日記』(全5巻・三教書院版) | **一次**（興福寺僧の日記・**OCR/要校正**） | `tamonin-nikki`（未登録） | 秀長・大和郡山・筒井・松永・奈良 |
| `ndl/taiko-soseiki.txt` | 土屋知貞『太閤素生記』(改定史籍集覧 第13冊) | 二次（聞書・**OCR/要校正**） | `taiko-soseiki` | 秀吉の出自・大政所・朝日姫 |
| `ndl/nara-meisho-yaezakura.txt` | 『奈良名所八重桜』(延宝6年刊・全12巻) | 二次（名所記・**版本OCR/誤認識多**） | `nara-meisho-yaezakura`（未登録） | 奈良の寺社縁起・光秀尼の逸話 |
| `ndl/hyuga-komonjo.txt` | 宮崎県 編『日向古文書集成』(1938) | **一次**（古文書の翻刻・写しを含む・**OCR/要校正**） | `hyuga-komonjo` | 九州攻め・島津・北郷・伊東、秀長の家臣福智長通の書状 |
| `ndl/kugyo-bunin.txt` | 『公卿補任』(国史大系本 中編・正親町院〜後陽成院の部分) | 二次扱い（朝廷の公卿名簿・編纂物・**表組みOCRで段が崩れる**） | `kugyo-bunin` | 秀長・秀保・家康ら織豊期の公卿の任官日 |
| `ndl/essa-shiryo.txt` | 高橋義彦 編『越佐史料』巻3〜5（1927〜30） | **一次**（古文書・日記の翻刻）と二次（年譜・軍記）が混在・**OCR/要校正**。各条の出典名で分ける | `essa-shiryo` | 上杉謙信・長尾為景・越後の家臣・川中島・関東出兵 |
| `ndl/hoan-shinchoki.txt` | 太田牛一 輯録・小瀬甫庵 重撰『信長記』（甫庵信長記）巻1（元和8年刊本） | 二次（軍記・脚色多・**版本OCR/誤認識多**） | `hoan-shinchoki`（未登録） | 信長の若年期・信秀の葬儀・平手の諫死 |
| `ndl/hidenaga-image-origins.txt` | 秀長の「名補佐役」像の出どころの抜粋集：藤堂高兌撰『聿脩録』（文政元年序、国訳本1930）・山路愛山『徳川家康』（1915）・渡辺世祐『豊太閤と其家族』（1919）・大友宗麟書状（天正14年卯月6日付、『国史資料集』1943と小宮豊隆『茶と利休』1956の翻刻）・『豊薩軍記』（『日本精英』1913所収） | 二次（家史・近代の史論・研究）と一次（書状の翻刻）が混在・**OCR/要校正**。各節の区分を見る | （なし） | 秀長の人物評価、記事 hidenaga-hosayaku-origin |
| `ndl/tosa-monogatari.txt` | 『土佐物語』上下（黒川真道 編、国史叢書、1914） | 二次（軍記、享保ごろ成立・**OCR/要校正**） | `tosa-monogatari`（未登録） | 長宗我部氏・四国攻め（秀長の和議の取り次ぎ、元親の上京と出仕） |

> - 各ファイルの「── コマ N ──」は NDL デジタルコレクションのコマ番号。画像は git 外の `D:\private\shiryo\<史料名>\` に同じ番号で保存している（`D:\private\shiryo\tools\` の取得スクリプトで再取得可）。

> - **一次史料は `shincho-koki` と `tamonin-nikki`**（`mikawa-monogatari` は当事者覚書で一次寄りだが主観・記憶違いに注意）。残りは**すべて二次史料**（軍記・軍学書・覚書）で、そのまま事実の典拠にはできない。「近世にこう語られた」水準で扱い、一次史料と突き合わせる。
> - 収録範囲メモ：`shincho-koki` 首巻〜巻之十五（本能寺まで）／`koyo-gunkan` 全60品。
> - 入手できなかった史料（フロイス日本史＝訳が著作権保護中、明智軍記・信長記（甫庵。巻1だけ `ndl/` に元和8年刊本の OCR あり）・徳川実紀・古記録類＝Wikisource未収録 等）は [`../docs/sources.md`](../docs/sources.md) に記録。

## 使い方（裏取りワークフロー）

1. DBの記述を検証するとき、まずこのフォルダの原典を全文検索（grep）する。
   - 用語ゆれに注意：例）「桶狭間」は本文に無く、`義元`／`今川義元`や別綴りの地名で書かれる。人名・地名は複数表記で探す。
2. 該当箇所が見つかったら、その記述に出典を紐付ける：
   - 人物 JSON の `sources` に登録（`shincho-koki`）、該当フィールドに `sourceId` を付す。可能なら巻・項目名を `note` に残す。
3. 校正品質「50%」表示のため、**重要記述は旧字版（`信長公記/我自刊我書`）またはNDL画像（pid 781192-4）で最終確認**する。
4. 原典が典拠にならない事柄（例：上杉謙信の生涯は信長公記の対象外）は、無理に紐付けず別史料を待つ。誤ラベルは外す。

詳細な出典方針は [`../docs/sources.md`](../docs/sources.md) を参照。
