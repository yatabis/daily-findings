# daily-findings

AI関連の定期ウォッチで見つかった更新のうち、あとから参照したいものを保存・公開するためのリポジトリです。

## 使い方

現在は、ChatGPTで動かしている各種ウォッチ系スケジュールタスクの出力を蓄積することを想定しています。

各ウォッチの実行結果をすべて保存するのではなく、何かしらの更新や変化があった場合だけ `Finding` を追加します。

## Finding

Findingは、あるウォッチで見つかった1件の更新を表します。

主な項目は次のとおりです。

- 観測日
- タイトル
- 概要
- どのウォッチから出たか
- 必要に応じた判断（`TRY` / `WATCH` / `HOLD`）
- 情報源
- タグ
- 関連するFinding

データ形式は `schema/finding.schema.json` で定義します。

## ディレクトリ

```text
content/
  findings/
schema/
  finding.schema.json
```

## 今後

Cloudflare上のWeb UI、API、WebMCP、AEO関連の計測などを追加していく予定です。

構成や実装方式はまだ決めていません。
