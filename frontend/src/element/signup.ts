import {
  customElement,
  html,
  css,
  LitElement,
  TemplateResult,
  internalProperty,
  queryAssignedNodes,
} from 'lit-element';
import { query } from 'lit-element/lib/decorators.js';
import { classMap } from 'lit-html/directives/class-map.js';
import {
  loadStripe,
  StripeCardElement,
  Token,
  StripeError,
} from '@stripe/stripe-js';

/**
 * Signup element.
 *
 * Testing ACH:
 * https://stripe.com/docs/ach#testing-ach
 *
 * Testing card:
 * https://stripe.com/docs/testing#cards
 */
@customElement('awu-signup')
export class Signup extends LitElement {
  private readonly stripe = loadStripe(window.STRIPE_KEY);

  @query('[name="total-compensation"]')
  totalComp!: HTMLInputElement;

  // Payment info input elements.
  @query('[name="card-holder-name"]')
  cardHolderName: HTMLInputElement;
  @query('[name="billing-address-1"]')
  billingAddress1: HTMLInputElement;
  @query('[name="billing-address-2"]')
  billingAddress2: HTMLInputElement;
  @query('[name="billing-city"]')
  billingCity: HTMLInputElement;
  @query('[name="billing-state"]')
  billingState: HTMLInputElement;
  @query('[name="billing-zip"]')
  billingZip: HTMLInputElement;
  @query('[name="billing-country"]')
  billingCountry: HTMLSelectElement;
  @query('[name="routing-number"]')
  routingNumber: HTMLInputElement;
  @query('[name="account-number"]')
  accountNumber: HTMLInputElement;
  @query('[name="account-holder-name"]')
  accountHolderName: HTMLInputElement;
  @query('[name="currency"]')
  currency!: HTMLInputElement;

  @query('#card')
  cardContainer!: HTMLElement;

  cardElement: StripeCardElement;

  @internalProperty()
  protected paymentMethod: 'bank' | 'card' = 'bank';

  protected setMethod(
    method: 'bank' | 'card'
  ): (event?: MouseEvent) => unknown {
    return (event?: MouseEvent) => {
      event?.preventDefault();
      this.paymentMethod = method;
    };
  }

  protected isMethod(method: 'bank' | 'card'): boolean {
    return this.paymentMethod === method;
  }

  /**
   * Stripe Elements do not work within the ShadowDOM.  To enable it to work
   * properly, this element accepts a slot called `stripe-card-container`.  It
   * only needs to exist, and can be empty.  The stripe element is mounted to
   * that slot element, so that it exists outside of the shadow DOM.
   */
  private async rebindStripeElement(event: Event): Promise<void> {
    const container = (event.target as HTMLSlotElement).assignedElements()[0];
    if (this.cardElement) {
      this.cardElement.unmount();
    }
    if (container instanceof HTMLElement) {
      this.cardElement = (await this.stripe).elements().create('card');
      this.cardElement.mount(container);
    }
  }

  private readonly bankTemplate: TemplateResult = html` <input
      name="routing-number"
      placeholder="Routing number"
      type="number"
      minlength="9"
      value="110000000"
      required
    />
    <input
      name="account-number"
      placeholder="Account number"
      type="number"
      minlength="10"
      value="000123456789"
      required
    />
    <input
      name="account-holder-name"
      placeholder="Account holder name"
      required
    />
    <select name="billing-country" required>
      <!-- TODO guess based on other fields -->
      <option selected>US</option>
      <option>CA</option>
    </select>`;

  private readonly cardTemplate: TemplateResult = html` <slot
      name="stripe-card-container"
      @slotchange=${this.rebindStripeElement}
    ></slot>
    <input
      name="card-holder-name"
      placeholder="Card holder name"
      required
      value="foo"
    />
    <input
      name="billing-address-1"
      placeholder="Address line 1"
      required
      value="foo"
    />
    <input name="billing-address-2" placeholder="Address line 2" value="foo" />
    <input
      name="billing-city"
      placeholder="Billing City"
      required
      value="foo"
    />
    <input
      name="billing-state"
      placeholder="Billing State"
      required
      value="foo"
    />
    <input
      name="billing-zip"
      placeholder="Billing Postal Code"
      required
      value="foo"
    />
    <input
      name="billing-country"
      placeholder="Billing Country"
      required
      value="foo"
    />`;

  render(): TemplateResult {
    // TODO improve rendering of invalid fields
    return html`
      <input
        name="total-compensation"
        placeholder="Total Compensation"
        required
        value="250000"
      />
      <select name="currency" required>
        <!-- TODO guess based on other fields -->
        <option selected value="usd">USD</option>
        <option value="cad">CAD</option>
      </select>
      <div class="payment-method-toggle">
        <button
          class=${classMap({ selected: this.isMethod('bank') })}
          @click=${this.setMethod('bank')}
        >
          Bank Account
        </button>
        <button
          class=${classMap({ selected: this.isMethod('card') })}
          @click=${this.setMethod('card')}
        >
          Card
        </button>
      </div>
      ${this.paymentMethod === 'bank' ? this.bankTemplate : this.cardTemplate}
      <button @click=${this.submit}>Submit</button>
    `;
  }

  static get styles() {
    return css`
      :host {
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
      }

      .payment-method-toggle {
        display: flex;
        flex-direction: row;
      }

      .payment-method-toggle button {
        background: white;
        border: 0;
        outline: 0;
        margin: 3px;
        padding: 6px;
      }

      .payment-method-toggle button.selected {
        outline: 3px solid #000;
      }
      input[type='number'] {
        -webkit-appearance: textfield;
        -moz-appearance: textfield;
        appearance: textfield;
      }
      input[type='number']::-webkit-inner-spin-button,
      input[type='number']::-webkit-outer-spin-button {
        -webkit-appearance: none;
      }
    `;
  }

  async submit(): Promise<void> {
    try {
      const token = await (this.paymentMethod === 'bank'
        ? this.bankAccountToken()
        : this.cardToken());

      const result = await fetch(window.SIGNUP_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          'total-compensation': this.totalComp.value,
          currency: this.currency.value,
          'stripe-payment-token': token.id,
        }).toString(),
      });
      // TODO verify response, do something with success or failure
      console.log(await result.text());
    } catch (e) {
      const error = e as StripeError;
      console.error(error);
      // TODO do something better with error handling
      alert(error.message);
    }
  }

  async cardToken(): Promise<Token> {
    const stripe = await this.stripe;
    const result = await stripe.createToken(this.cardElement, {
      name: this.cardHolderName.value,
      address_line1: this.billingAddress1.value,
      address_line2: this.billingAddress2.value,
      address_city: this.billingCity.value,
      address_state: this.billingState.value,
      address_zip: this.billingZip.value,
      address_country: this.billingCountry.value,
      currency: this.currency.value,
    });
    if (result.token) {
      return result.token;
    } else {
      return Promise.reject(result.error);
    }
  }

  async bankAccountToken(): Promise<Token> {
    const stripe = await this.stripe;
    const result = await stripe.createToken('bank_account', {
      country: this.billingCountry.value,
      currency: this.currency.value,
      routing_number: this.routingNumber.value,
      account_number: this.accountNumber.value,
      account_holder_name: this.accountHolderName.value,
      account_holder_type: 'individual',
    });
    if (result.token) {
      return result.token;
    } else {
      return Promise.reject(result.error);
    }
  }
}

declare global {
  interface Window {
    SIGNUP_API: string;
    STRIPE_KEY: string;
  }
}
