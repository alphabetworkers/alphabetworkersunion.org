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
        <form
          action=""
          method="post"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            alignItems: 'stretch',
            maxWidth: 'min(400px, 90vw)',
            margin: '0 auto',
          }}
        >
          <h1
            style={{
              textAlign: 'center',
              margin: 0,
            }}
          >
            Login to the<br>AWU-CWA</br> dues profile
          </h1>
          <p
            style={{
              padding: '0 12px',
              margin: 0,
            }}
          >
            Enter the <em>personal</em> email associated with your account. We'll send you a link to log in right away.
          </p>
          <input
            type="email"
            name="email"
            style={{
              fontSize: '1.4em',
              padding: 12,
              borderRadius: 8,
              border: 'solid 2px #444',
            }}
          />
          <button
            type="submit"
            style={{
              fontSize: '1.4em',
              background: '#ed1c24',
              padding: 12,
              border: 0,
              borderRadius: 12,
              color: 'white',
            }}
          >
            Send Login Link
          </button>
          <p
            style={{
              fontSize: '0.6em',
              opacity: 0.7,
            }}
          >
            If you encounter issues, contact the membership committee at
            <br />
            <a href="mailto:committee-membership@union.groups.io">committee-membership@union.groups.io</a>.
          </p>
        </form>
      ),
    ),
  );
}
