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
  @query('[name="product-area"]')
  productArea!: HTMLInputElement;
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

  @internalProperty()
  isLoading = false;

  @internalProperty()
  isContractor = false;

  @internalProperty()
  isComplete = false;

  constructor() {
    super();
    // TODO debugging tool, remove later
    window.fillTestValues = () => {
      this.preferredName.value = 'a';
      this.preferredLanguage.value = 'b';
      this.personalEmail.value = 'c@d.e';
      this.employmentType.value = 'fte';
      this.firstPartyEmployer.value = 'Google';
      this.productArea.value = 'Core Data';
      this.jobTitle.value = 'Software Engineer III';
      this.totalComp.value = '250000';
      this.billingCountry.value = 'US';
      this.routingNumber.value = '110000000';
      this.accountNumber.value = '000123456789';
      this.accountHolderName.value = 'f';
      this.currency.value = 'usd';
    };
  }

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

  // TODO prevent scrolling from incrementing number fields
  // TODO add better validation, both client and from server-side
  private readonly bankTemplate: TemplateResult = html` <label>
      <span class="title">Routing number</span>
      <input
        name="routing-number"
        aria-label="Routing number"
        type="number"
        minlength="9"
        required
      />
    </label>
    <label>
      <span class="title">Account number</span>
      <input
        name="account-number"
        aria-label="Account number"
        type="number"
        minlength="10"
        required
      />
    </label>
    <label>
      <span class="title">Account holder name</span>
      <input
        name="account-holder-name"
        aria-label="Account holder name"
        required
      />
    </label>
    <label>
      <span class="title">Country of account</span>
      <div class="select">
        <select name="billing-country" required>
          <!-- TODO guess based on other fields -->
          <option selected>US</option>
          <option>CA</option>
        </select>
      </div>
    </label>`;

  private readonly cardTemplate: TemplateResult = html` <div
      class="field full-width"
    >
      <span class="title">Card details</span>
      <span class="hint"
        >We encourage you to use a bank account instead though, so that less is
        lost to transaction fees</span
      >
      <div class="card-container">
        <slot
          name="stripe-card-container"
          @slotchange=${this.rebindStripeElement}
        ></slot>
      </div>
    </div>
    <label>
      <span class="title">Card holder name</span>
      <span class="hint"></span>
      <input name="card-holder-name" aria-label="Card holder name" required />
    </label>
    <label>
      <span class="title">Billing street address</span>
      <span class="hint"></span>
      <input name="billing-address-1" aria-label="Address line 1" required />
    </label>
    <label>
      <span class="title">Billing street line 2</span>
      <span class="hint"></span>
      <input name="billing-address-2" aria-label="Address line 2" />
    </label>
    <label>
      <span class="title">Billing city</span>
      <span class="hint"></span>
      <input name="billing-city" aria-label="Billing City" required />
    </label>
    <label>
      <span class="title">Billing state</span>
      <span class="hint"></span>
      <input name="billing-state" aria-label="Billing State" required />
    </label>
    <label>
      <span class="title">Billing postal code</span>
      <span class="hint"></span>
      <input name="billing-zip" aria-label="Billing Postal Code" required />
    </label>
    <label>
      <span class="title">Billing country</span>
      <span class="hint"></span>
      <input name="billing-country" aria-label="Billing Country" required />
    </label>`;

  render(): TemplateResult {
    // TODO improve rendering of invalid fields
    return html`
      <div class="completed ${classMap({ 'not-completed': !this.isComplete })}">
        <h2>All done</h2>
        <p>
          The membership committee will review your application, and we'll send
          your union membership card when it's approved.
        </p>
        <p>Welcome to the union!</p>
      </div>
      <div
        class="form ${classMap({
          disabled: this.isLoading,
          complete: this.isComplete,
        })}"
      >
        <label>
          <span class="title">Preferred name</span>
          <span class="hint">So we know what to call you</span>
          <input name="preferred-name" aria-label="Preferred Name" required />
        </label>
        <label>
          <span class="title">Preferred language (optional)</span>
          <span class="hint">So we know how to talk to you</span>
          <input name="preferred-language" aria-label="Preferred language" />
        </label>
        <label>
          <span class="title">Personal email</span>
          <span class="hint"
            >We'll need this to contact you. Please don't use your work
            email.</span
          >
          <input name="personal-email" aria-label="Personal email" required />
        </label>
        <label>
          <span class="title">Employement type (optional)</span>
          <span class="hint"></span>
          <div class="select">
            <select name="employment-type" @input=${this.employmentTypeHandler}>
              <option value="fte" selected>Full-Time Employee (FTE)</option>
              <option value="t">Temporary worker (T)</option>
              <option value="v">Vendor employee (V)</option>
              <option value="c">Contractor (C)</option>
            </select>
          </div>
        </label>
        ${this.isFirstPartyEmployer
          ? html` <label>
              <span class="title"
                >Alphabet
                ${this.employmentType?.value === 'c' ? 'client' : 'employer'}
                (optional)</span
              >
              <span class="hint"></span>
              <div class="select">
                <select name="first-party-employer">
                  <option selected>Google</option>
                  <option>Alphabet</option>
                  <option>Waymo</option>
                  <option>Verily</option>
                  <option>TODO more</option>
                </select>
              </div>
            </label>`
          : html` <label>
              <span class="title">Vendor employer (optional)</span>
              <span class="hint"></span>
              <input name="third-party-employer" aria-label="Employer" />
            </label>`}
        <label>
          <span class="title">Product area (PA) (optional)</span>
          <span class="hint">Lets us connect you with your coworkers</span>
          <input name="product-area" aria-label="Product Area" />
        </label>
        <label>
          <span class="title">Job title (optional)</span>
          <span class="hint"
            >We want to know what kinds of workers are in our union</span
          >
          <input name="job-title" aria-label="Job Title" />
        </label>
        <label>
          <span class="title">Total Compensation (TC)</span>
          <span class="hint"
            >Used to calculate your union dues. We expect members to be honest,
            but this is the honor system: we won't check.</span
          >
          <div class="dollar-input">
            <input
              name="total-compensation"
              aria-label="Total Compensation"
              class="dollar-input"
              required
              @input=${this.compChangeHandler}
            />
            <div class="select">
              <select
                name="currency"
                required
                @input=${this.currencyChangeHandler}
              >
                <!-- TODO guess based on other fields -->
                <option value="usd" selected>USD</option>
                <option value="cad">CAD</option>
              </select>
            </div>
          </div>
        </label>
        <label>
          <span class="title">Monthly dues</span>
          <span class="hint"
            >Dues are 1% of your TC. This is billed monthly, and is pooled and
            democratically controlled by you and your fellow members.</span
          >
          <div class="dues">
            &times; 1% &div; 12 =
            <strong>${this.formattedDues()}</strong>/mo
          </div>
        </label>
        <div class="payment-method-toggle full-width">
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
        <div class="full-width">
          <p>&lt;!-- TODO: signature? --&gt;</p>
        </div>
        <div class="field full-width">
          <span class="hint"
            >A one-time $5 signup fee will be charged when your application is
            approved, and dues will be charged on the 5th of each month.</span
          >
        </div>
        <div class="actions">
          <!--<button class="secondary">Back</button>-->
          <span class="spacer"></span>
          <button @click=${this.submit} class="primary submit">Submit</button>
        </div>
      </div>
    `;
  }

  async submit(): Promise<void> {
    this.isLoading = true;
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
          'first-party-employer': this.firstPartyEmployer?.value,
          'third-party-employer': this.thirdPartyEmployer?.value,
          'product-area': this.productArea.value,
          'job-title': this.jobTitle.value,
          'total-compensation': this.totalComp.value,
          currency: this.currency.value,
        }).toString(),
      });

      // TODO verify response, do something with success or failure
      console.log(await result.text());
      this.isComplete = true;
    } catch (e) {
      const error = e as StripeError;
      console.error(error);
      // TODO do something better with error handling
      alert(error.message);
    } finally {
      this.isLoading = false;
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
    this.isContractor = this.employmentType.value === 'c';
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
    fillTestValues: () => void;
  }
}
