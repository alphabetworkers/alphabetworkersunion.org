import { makeHtmlResponse, renderDocument } from './html';
export function loginPage(params: URLSearchParams): Response {
  const linkSent = params.has('link_sent');
  return makeHtmlResponse(
    renderDocument(
      linkSent ? (
        <>
          <div>Login link sent, this tab can be closed.</div>
          <a href=".">Start over</a>
        </>
      ) : (
        <form action="" method="post">
          <input type="email" name="email" />
          <button type="submit">Send Login Link</button>
        </form>
      ),
    ),
  );
}
