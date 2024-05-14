import { VNode } from 'preact';
import { render } from 'preact-render-to-string';

const doctype = '<!DOCTYPE html>';

export function makeHtmlResponse(body: string) {
  return new Response(body, { headers: { 'content-type': 'text/html' } });
}

export function renderDocument(content: VNode) {
  return (
    doctype +
    render(
      <html lang="en">
        <head>
          <title>AWU-CWA: Login</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>{`
            body {
              font-size: 1.4em;
              font-family: sans-serif;
            }
          `}</style>
        </head>
        <body>{content}</body>
      </html>,
    )
  );
}
