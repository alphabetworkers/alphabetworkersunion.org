import { makeHtmlResponse, renderDocument } from './html';
export function loginPage(params: URLSearchParams): Response {
  const linkSent = params.has('link_sent');
  return makeHtmlResponse(
    renderDocument(
      linkSent ? (
        <div
          style={{
            background: 'var(--white)',
            borderRadius: 'var(--border-radius)',
            padding: 'var(--container-padding)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            maxWidth: 'min(400px, 90vw)',
            margin: '0 auto',
          }}
        >
          <p style={{ margin: '0' }}>
            If your email was associated with a membership, a login link has been sent.
            <br />
            <br />
            This tab may be closed.
            <br />
            <br />
            <a href=".">Start over</a>
          </p>
        </div>
      ) : (
        <form
          action=""
          method="post"
          style={{
            background: 'var(--white)',
            borderRadius: 'var(--border-radius)',
            padding: 'var(--container-padding)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--container-padding)',
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
              padding: '0 var(--text-padding)',
              margin: 0,
            }}
          >
            Enter the <em>personal</em> email associated with your account. We'll send you a link to log in.
          </p>
          <input
            type="email"
            name="email"
            style={{
              fontSize: '1.4em',
              padding: 'var(--text-padding)',
              borderRadius: 'var(--border-radius)',
              border: 'solid 2px var(--gray-1)',
            }}
          />
          <button
            type="submit"
            style={{
              fontSize: '1.1em',
              background: 'var(--primary)',
              padding: '20px 30px',
              border: 0,
              borderRadius: 50,
              color: 'var(--white)',
            }}
          >
            Send Login Link
          </button>
          <p
            style={{
              fontSize: '0.6em',
              opacity: 0.7,
              padding: 'var(--text-padding)',
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
