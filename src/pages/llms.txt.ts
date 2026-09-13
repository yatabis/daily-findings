import { SITE_URL, SITE_TITLE } from "../lib/publication.mjs";

export function GET() {
  const body = `# ${SITE_TITLE}

> yatabisの関心に沿って、ChatGPTのウォッチタスクが収集したAI・ローカル推論・モデル・ツールの更新と所感を公開するログです。

各Findingでは、概要は参照元の情報の要約、所感はその情報への評価・解釈です。記録日は収集時点の日付であり、情報源の公開日や最終更新日時ではありません。

TRYは試す価値がある候補、WATCHは継続して追う価値があるもの、HOLDは現時点では保留するものです。TRYは実測済みを意味しません。詳しい根拠は各Findingの情報源で確認してください。

## URLs

- Site: ${SITE_URL}
- RSS: ${SITE_URL}rss.xml
- Sitemap: ${SITE_URL}sitemap.xml
- Source: https://github.com/yatabis/daily-findings
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
