import {
  customElement,
  html,
  LitElement,
  TemplateResult,
  internalProperty,
} from 'lit-element';
import { query } from 'lit-element/lib/decorators.js';
import { classMap } from 'lit-html/directives/class-map.js';
import {
  loadStripe,
  StripeCardElement,
  Token,
  StripeError,
} from '@stripe/stripe-js';

import styles from './signup.scss';

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
  static styles = styles;

  private readonly stripe = loadStripe(window.STRIPE_KEY);

  @query('[name="preferred-name"]')
  preferredName!: HTMLInputElement;
  @query('[name="preferred-language"]')
  preferredLanguage!: HTMLInputElement;
  @query('[name="personal-email"]')
  personalEmail!: HTMLInputElement;
  @query('[name="employment-type"]')
  employmentType!: HTMLInputElement;
  @query('[name="first-party-employer"]')
  firstPartyEmployer!: HTMLInputElement;
  @query('[name="third-party-employer"]')
  thirdPartyEmployer!: HTMLInputElement;
  @query('[name="team"]')
  team!: HTMLInputElement;
  @query('[name="job-title"]')
  jobTitle!: HTMLInputElement;
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

  @internalProperty()
  isFirstPartyEmployer = true;

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
      this.cardElement = (await this.stripe).elements().create('card', {
        style: {
          base: {
            fontSize: '24px',
          },
        },
      });
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
    <div class="select">
      <select name="billing-country" required>
        <!-- TODO guess based on other fields -->
        <option selected>US</option>
        <option>CA</option>
      </select>
    </div>`;

  private readonly cardTemplate: TemplateResult = html` <div
      class="card-container"
    >
      <slot
        name="stripe-card-container"
        @slotchange=${this.rebindStripeElement}
      ></slot>
    </div>
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
        name="preferred-name"
        placeholder="Preferred Name"
        required
        value="bobby"
      />
      <input
        name="preferred-language"
        placeholder="Preferred language"
        required
        value="English"
      />
      <input
        name="personal-email"
        placeholder="Personal email"
        required
        value="x@y.z"
      />
      <div class="select">
        <select
          name="employment-type"
          required
          @input=${this.employmentTypeHandler}
        >
          <option selected value="fte">Full-Time Employee (FTE)</option>
          <option value="t">Temporary worker (T)</option>
          <option value="v">Vendor employee (V)</option>
          <option value="c">Contractor (C)</option>
        </select>
      </div>
      ${this.isFirstPartyEmployer
        ? html`<div class="select">
            <select name="first-party-employer" required>
              <option selected>Google</option>
              <option>Alphabet</option>
              <option>Waymo</option>
              <option>Verily</option>
              <option>TODO more</option>
            </select>
          </div>`
        : null}
      ${!this.isFirstPartyEmployer
        ? html`<input
            name="third-party-employer"
            placeholder="Employer"
            required
            value="EXOS"
          />`
        : null}
      <input
        name="team"
        placeholder="Team Name"
        required
        value="Capacity Solutions"
      />
      <input
        name="job-title"
        placeholder="Job Title"
        required
        value="Software Engineer III"
      />
      <div class="dollar-input">
        <input
          name="total-compensation"
          placeholder="Total Compensation"
          class="dollar-input"
          required
          value="250000"
          @input=${this.compChangeHandler}
        />
        <div class="select">
          <select name="currency" required @input=${this.currencyChangeHandler}>
            <!-- TODO guess based on other fields -->
            <option selected value="usd">USD</option>
            <option value="cad">CAD</option>
          </select>
        </div>
      </div>
      <div class="dues">
        &times; 1% &div; 12 =
        <strong>${this.formattedDues()}</strong>/mo
      </div>
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
      <button @click=${this.submit} class="primary submit">Submit</button>
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
          'stripe-payment-token': token.id,
          'preferred-name': this.preferredName.value,
          'preferred-language': this.preferredLanguage.value,
          'personal-email': this.personalEmail.value,
          'employment-type': this.employmentType.value,
          'first-party-employer': this.firstPartyEmployer.value,
          'third-party-employer': this.thirdPartyEmployer.value,
          team: this.team.value,
          'job-title': this.jobTitle.value,
          'total-compensation': this.totalComp.value,
          currency: this.currency.value,
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

  employmentTypeHandler(): void {
    this.isFirstPartyEmployer = this.employmentType.value !== 'v';
  }

  compChangeHandler(): void {
    this.requestUpdate();
  }

  currencyChangeHandler(): void {
    this.requestUpdate();
    switch (this.currency.value) {
      case 'usd':
        this.billingCountry.value = 'US';
        break;
      case 'cad':
        this.billingCountry.value = 'CA';
        break;
    }
  }

  formattedTotalComp(): string {
    // TODO add commmas
    const comp = Number(this.totalComp?.value);
    if (!Number.isNaN(comp)) {
      return `$${Math.floor(comp)}`;
    } else {
      return '$0';
    }
  }

  formattedDues(): string {
    // TODO add commas
    const comp = Number(this.totalComp?.value);
    if (!Number.isNaN(comp)) {
      return `$${Math.floor(Math.floor(comp) / 100 / 12)}`;
    } else {
      return '$0';
    }
  }

  formattedCurrency(): string {
    return this.currency?.value.toUpperCase() ?? '';
  }
}

declare global {
  interface Window {
    SIGNUP_API: string;
    STRIPE_KEY: string;
  }
}
