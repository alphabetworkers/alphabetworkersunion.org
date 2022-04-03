const SENDGRID_API = 'https://api.sendgrid.com/v3/'

/**
 * Sendgrid api doesn't work in the cloudflare worker environment, so
 * re-implementing the API calls directly.
 */
export class SendgridClient {
  private readonly headers: { [key: string]: string }

  /**
   * Instantiate a client instance.  No overhead in destroying or creating, it
   * only stores an API key.
   */
  constructor(key: string) {
    this.headers = Object.freeze({
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    })
  }

  sendWelcomeEmail(name: string, toEmail: string) {
    const params = JSON.stringify({
      from: {
        email: 'noreply@alphabetworkersunion.org',
        name: 'Alphabet Workers Union',
      },
      personalizations: [
        {
          to: [
            {
              email: toEmail,
              name: name,
            },
          ],
          dynamic_template_data: {
            name: name,
          },
        },
      ],
      template_id: SENDGRID_DYNAMIC_TEMPLATE,
    })
    return fetch(`${SENDGRID_API}mail/send`, {
      method: 'POST',
      headers: this.headers,
      body: params,
    }).then(processResponse())
  }
}

function processResponse(): (response: Response) => Promise<Response> {
  return async (response: Response) => {
    if (response.ok) {
      return response
    } else {
      console.error('Confirmation email failed with: ', response.statusText)
      return response
    }
  }
}

/**
 * Create a new re-usable instance.
 */
export const sendgridClient = new SendgridClient(SENDGRID_API_KEY)
