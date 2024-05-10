const SENDGRID_ENDPOINT = 'https://api.sendgrid.com/v3';

export function sendLoginEmail(email: string, env: Env): Promise<void> {
  const template_id = env.SENDGRID_LOGIN_TEMPLATE;
  if (!template_id) {
    throw new Error('SENDGRID_LOGIN_TEMPLATE is needed to send login link emails.');
  }
  // TODO generate a JWT.
  const loginLink = 'https://alphabetworkersunion.org';
  return send(
    {
      from: {
        email: 'noreply@alphabetworkersunion.org',
        name: 'Alphabet Workers Union',
      },
      personalizations: [
        {
          to: [{ email }],
          dynamic_template_data: { loginLink },
        },
      ],
      template_id,
    },
    env,
  );
}

/**
 * Payload is a JSON object matching the schema for V3.
 *
 * https://docs.sendgrid.com/api-reference/mail-send/mail-send#body
 */
async function send(payload: unknown, env: Env): Promise<void> {
  try {
    const response = await fetch(`${SENDGRID_ENDPOINT}/mail/send`, {
      method: 'POST',
      headers: sendgridHeaders(env),
      body: JSON.stringify(payload),
    });
    console.log('payload', JSON.stringify(payload));

    console.log(response);
    if (response.ok) {
      console.log('ok', await response.text());
      return;
    } else {
      console.error('else', await response.text());
      return Promise.reject('Sendgrid email failed.');
    }
  } catch (e) {
    console.error('e', e);
  }
}

function sendgridHeaders(env: Env): Record<string, string> {
  const token = env.SENDGRID_API_KEY;
  if (!token) {
    throw new Error('SENDGRID_API_KEY is needed to send login link emails.');
  }

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}
