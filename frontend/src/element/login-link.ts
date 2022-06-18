import {
  customElement,
  html,
  LitElement,
  TemplateResult,
  state,
} from 'lit-element';
import { query } from 'lit/decorators.js';
import { classMap } from 'lit-html/directives/class-map.js';

import styles from './signup.scss';

/**
 * LoginLink element.
 *
 * Testing ACH:
 * https://stripe.com/docs/ach#testing-ach
 *
 * Testing card:
 * https://stripe.com/docs/testing#cards
 */
@customElement('awu-login-link')
export class LoginLink extends LitElement {
  static styles = styles;

  @query('form')
  form!: HTMLFormElement;

  @state()
  isLoading = false;
  @state()
  isComplete = false;

  render(): TemplateResult {
    return html`
      <div class="completed ${classMap({ 'not-completed': !this.isComplete })}">
        <h2>Check your inbox</h2>
        <p>
          If that email is associated with a membership, we will send you an
          email with a login link.
        </p>
        <p>
          If you don't get a link, make sure you entered the correct email
          address. Otherwise, contact the Membership Committee at
          <a href="mailto:membership@alphabetworkersunion.org"
            >membership@alphabetworkersunion.org</a
          >
        </p>
      </div>
      <form
        @submit=${this.submit}
        class="form ${classMap({
          disabled: this.isLoading,
          complete: this.isComplete,
        })}"
      >
        <h2>What is your email?</h2>
        <label class="full-width">
          <span class="hint"
            >Enter the email address you used when you joined.</span
          >
          <input
            name="email"
            aria-label="Email"
            required
            autocomplete="email"
          />
        </label>
        <div class="actions">
          <span class="spacer"></span>
          <button type="submit" class="primary submit">Submit</button>
        </div>
      </form>
    `;
  }

  async submit(event: Event): Promise<void> {
    event.preventDefault();

    this.isLoading = true;
    const body = new FormData(this.form);
    const uid = crypto.randomUUID();
    body.set('uid', uid);
    try {
      const result = await fetch(window.LOGIN_LINK_TOKEN_API, {
        method: 'POST',
        body,
      });

      if (result.ok) {
        // TODO: save uid to cookie
        this.isComplete = true;
      } else {
        const { error } = await result.json();
        console.error(error);
        throw error;
      }
      this.isComplete = true;
    } catch (e) {
      if (e) {
        console.error(e);
        alert(e);
      }
    } finally {
      this.isLoading = false;
    }
  }
}

declare global {
  interface Window {
    LOGIN_LINK_TOKEN_API: string;
  }

  // TODO: update Typescript version to get randomUUID in the type def.
  interface Crypto {
    randomUUID(): string;
  }
}
