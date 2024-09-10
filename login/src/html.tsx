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
            :root {
              --black: black;
              --yellow: #ffdc5d;
              --yellow-faded: #ffdf5d33;
              --gray-2: #eee;
              --primary: #b0171d;
              --gray-1: #4f4f4f;
              --bright-red: #ed1c24;
              --white: white;
              --border-radius: 16px;
              --container-padding: 24px;
              --text-padding: 12px;
            }

            body {
              padding-top: 18px;
              font-size: 1.4em;
              font-family: sans-serif;
              background-color: var(--gray-2);
            }
          `}</style>
        </head>
        <body>{content}</body>
      </html>,
    )
  );
}
