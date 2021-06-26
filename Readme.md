# C:DDA JSON eXtractor
C:DDAのmod翻訳支援ツールです。  
JSONから翻訳対象の文字列を抜き出してpo形式で出力します。

## 使い方
### Windowsの場合
1. modsフォルダにjsonファイルを入れます。
2. cdda-json-string-extractor-win.exeを実行します。
3. mods.poに文字列の一覧が出力されます。

## カスタマイズ
翻訳対象のJSONデータはtargets.jsonで定義しており、ここを修正すると対象を変更できます。  
正規表現を使って検索しているので、知識のある方なら比較的容易に直せると思います。
