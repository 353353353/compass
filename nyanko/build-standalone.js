#!/usr/bin/env node
/* ===========================================================================
 *  index.html / style.css / js/*.js を1枚の HTML にまとめる。
 *
 *    node nyanko/build-standalone.js            → nyanko/standalone.html
 *    node nyanko/build-standalone.js --body-only <出力先>
 *        → <head>/<body> タグを持たない断片（アーティファクト公開用）
 *
 *  外部ファイルを一切参照しないので、どこに置いても・メールに添付しても遊べる。
 * ======================================================================== */

const fs = require('fs');
const path = require('path');

const dir = __dirname;
const read = f => fs.readFileSync(path.join(dir, f), 'utf8');

const html = read('index.html');
const css = read('style.css');

// <script src="js/xxx.js"></script> を実体に置き換える
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)];
if (!scripts.length) throw new Error('index.html に外部スクリプトの参照が見つかりません');

// 置換は必ず関数で行う。文字列を渡すと $$ や $& が特殊記号として解釈され、
// ui.js の `const $$ = ...` が `const $ = ...` に化けて壊れる。
let out = html.replace('<link rel="stylesheet" href="style.css">', () => `<style>\n${css}\n</style>`);
for (const [tag, src] of scripts) {
  const code = read(src);
  if (code.includes('</script>')) throw new Error(`${src} に </script> が含まれています`);
  out = out.replace(tag, () => `<script>\n${code}\n</script>`);
}

const banner = '<!-- 自動生成ファイル。編集せず build-standalone.js を実行し直してください。 -->\n';

if (process.argv[2] === '--body-only') {
  const dest = process.argv[3];
  if (!dest) throw new Error('--body-only には出力先のパスが必要です');
  const title = (out.match(/<title>([^<]*)<\/title>/) || [, 'にゃんこウォーズ'])[1];
  const style = out.match(/<style>[\s\S]*?<\/style>/)[0];
  const body = out.match(/<body>([\s\S]*)<\/body>/)[1];
  fs.writeFileSync(dest, `<title>${title}</title>\n${style}\n${body}\n`);
  console.log(`${dest} を書き出しました`);
} else {
  const dest = path.join(dir, 'standalone.html');
  fs.writeFileSync(dest, out.replace('<!DOCTYPE html>', () => '<!DOCTYPE html>\n' + banner));
  const kb = (fs.statSync(dest).size / 1024).toFixed(0);
  console.log(`standalone.html を書き出しました (${kb} KB)`);
}
