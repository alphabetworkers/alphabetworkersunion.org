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

  @query('form')
  form!: HTMLFormElement;
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
  @query('[name="signature"]')
  signature!: HTMLInputElement;

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

  @internalProperty()
  private isCompCalculatorOpen = false;

  private hourlyRate = 0;
  private hoursPerWeek = 40;
  private weeksPerYear = 52;

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
      this.signature.value = 'x';
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

  protected clearInvalidity(event: InputEvent): void {
    (event.target as HTMLInputElement).setCustomValidity('');
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
  // TODO server-side validation, and accept error responses
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
          <option value="US" selected>US</option>
          <option value="CA">CA</option>
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
    return html`
      <div class="completed ${classMap({ 'not-completed': !this.isComplete })}">
        <h2>All done</h2>
        <p>
          The membership committee will review your application, and we'll send
          your union membership card when it's approved.
        </p>
        <p>Welcome to the union!</p>
      </div>
      <form
        @input=${this.clearInvalidity}
        @invalid=${this.enableInvalidStyles}
        @submit=${this.submit}
        class="form ${classMap({
          disabled: this.isLoading,
          complete: this.isComplete,
        })}"
      >
        <h2>Let's get to know you</h2>
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
        <h2>How can we contact you?</h2>
        <label>
          <span class="title">Personal email</span>
          <span class="hint"
            >We'll need this to contact you. Please don't use your work
            email.</span
          >
          <input name="personal-email" aria-label="Personal email" required />
        </label>
        <h2>Where do you work?</h2>
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
        <h2>Monthly dues</h2>
        <div class="field">
          <span class="title">Total Annual Compensation (TC)</span>
          <span class="hint"
            >Used to calculate your union dues. We expect members to be honest,
            but this is the honor system: we won't check.</span
          >
          <div class="dollar-input">
            <button
              type="button"
              class="compensation-calculator-button"
              title="Compensation calculator"
              aria-label="Compensation calculator"
              @click=${this.compCalculatorClickHandler}
            >
              &#x1F5A9;
            </button>
            <span class="input-dollar-symbol"></span>
            <input
              type="number"
              name="total-compensation"
              aria-label="Total Annual Compensation"
              min="0"
              required
              @input=${this.compChangeHandler}
            />
            <div class="select">
              <select
                name="currency"
                required
                @input=${this.currencyChangeHandler}
              >
                <option value="usd" selected>USD</option>
                <option value="cad">CAD</option>
              </select>
            </div>
          </div>
          <div
            class="compensation-calculator ${classMap({
              visible: this.isCompCalculatorOpen,
            })}"
          >
            <label>
              <input type="number" @input=${this.hourlyRateChangeHandler} />
              <span class="hint">Hourly rate</span>
            </label>
            &times;
            <label>
              <input
                type="number"
                value="40"
                @input=${this.hoursPerWeekChangeHandler}
              />
              <span class="hint">Hours per week</span>
            </label>
            &times;
            <label>
              <input
                type="number"
                value="52"
                @input=${this.weeksPerYearChangeHandler}
              />
              <span class="hint">Weeks per year</span>
            </label>
          </div>
        </div>
        <label>
          <span class="title">Monthly dues</span>
          <span class="hint"
            >Dues are 1% of your TC. This is billed monthly, and is pooled and
            democratically controlled by you and your fellow members.</span
          >
          <div class="dues">
            TC &times; 1% &div; 12 =
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
        <label class="full-width">
          <span class="title">Accept Agreement</span>
          <span class="hint"
            >Type in your name below to agree to the
            <a href="">membership terms</a> of the Communications Workers of
            America, under whom AWU is formed. You also authorize the regular
            charge of your dues and one-time $5 initiation fee</span
          >
          <input name="signature" aria-label="Signature" required />
        </label>
        <div class="field full-width">
          <span class="hint"
            >A one-time $5 signup fee will be charged when your application is
            approved, and dues will be charged on the 5th of each month.</span
          >
        </div>
        <div class="actions">
          <!--<button class="secondary">Back</button>-->
          <span class="spacer"></span>
          <button type="submit" class="primary submit">Submit</button>
        </div>
      </form>
    `;
  }

  enableInvalidStyles(): void {
    this.form.classList.add('invalidatable');
  }

  async submit(event: Event): Promise<void> {
    event.preventDefault();
    this.enableInvalidStyles();
    // TODO add CAPTCHA

    this.isLoading = true;
    const fields = new SpliceableUrlSearchParams(new FormData(this.form));
    try {
      const [token, body] = await (this.paymentMethod === 'bank'
        ? this.bankAccountToken(fields)
        : this.cardToken(fields));

      body.set('stripe-payment-token', token.id);
      const result = await fetch(window.SIGNUP_API, { method: 'POST', body });

      if (result.ok) {
        this.isComplete = true;
      } else {
        const { error } = await result.json();
        console.error(error);
        if (error.param) {
          this.setInvalid(error.param, error.message);
          throw false;
        } else {
          throw error.message;
        }
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

  async cardToken(
    data: SpliceableUrlSearchParams
  ): Promise<[Token, URLSearchParams]> {
    const stripe = await this.stripe;
    const result = await stripe.createToken(this.cardElement, {
      name: data.splice('card-holder-name') as string,
      address_line1: data.splice('billing-address-1') as string,
      address_line2: data.splice('billing-address-2') as string,
      address_city: data.splice('billing-city') as string,
      address_state: data.splice('billing-state') as string,
      address_zip: data.splice('billing-zip') as string,
      address_country: data.splice('billing-country') as string,
      currency: data.get('currency') as string,
    });
    if (result.token) {
      return [result.token, data.getRemainder()];
    } else {
      console.error(result);
      let message = '';
      switch (result.error.param) {
        case 'card[name]':
          this.setInvalid('card-holder-name', result.error.message);
          break;
        case 'card[address_line1]':
          this.setInvalid('billing-address-1', result.error.message);
          break;
        case 'card[address_line2]':
          this.setInvalid('billing-address-2', result.error.message);
          break;
        case 'card[address_city]':
          this.setInvalid('billing-city', result.error.message);
          break;
        case 'card[address_zip]':
          this.setInvalid('billing-zip', result.error.message);
          break;
        case 'card[address_country]':
          this.setInvalid('billing-country', result.error.message);
          break;
        case 'currency':
          this.setInvalid('currency', result.error.message);
          break;
        default:
          message = result.error.message;
      }
      return Promise.reject(message);
    }
  }

  async bankAccountToken(
    data: SpliceableUrlSearchParams
  ): Promise<[Token, URLSearchParams]> {
    const stripe = await this.stripe;
    const result = await stripe.createToken('bank_account', {
      country: data.splice('billing-country') as string,
      currency: data.get('currency') as string,
      routing_number: data.splice('routing-number') as string,
      account_number: data.splice('account-number') as string,
      account_holder_name: data.splice('account-holder-name') as string,
      account_holder_type: 'individual',
    });
    if (result.token) {
      return [result.token, data.getRemainder()];
    } else {
      console.error(result);
      let message = '';
      switch (result.error.param) {
        case 'bank_account[country]':
          this.setInvalid('billing-country', result.error.message);
          break;
        case 'bank_account[currency]':
          this.setInvalid('currency', result.error.message);
          break;
        case 'bank_account[routing_number]':
          this.setInvalid('routing-number', result.error.message);
          break;
        case 'bank_account[account_number]':
          this.setInvalid('account-number', result.error.message);
          break;
        case 'bank_account[account_holder_name]':
          this.setInvalid('account-holder-name', result.error.message);
          break;
        default:
          message = result.error.message;
      }
      return Promise.reject(message);
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

  compCalculatorClickHandler(): void {
    this.isCompCalculatorOpen = !this.isCompCalculatorOpen;
  }

  private recalculateTotalComp(): void {
    this.totalComp.value = String(
      this.hourlyRate * this.hoursPerWeek * this.weeksPerYear
    );
  }

  hourlyRateChangeHandler(event: InputEvent): void {
    this.hourlyRate = Number((event.target as HTMLInputElement).value);
    this.recalculateTotalComp();
  }

  hoursPerWeekChangeHandler(): void {
    this.hoursPerWeek = Number((event.target as HTMLInputElement).value);
    this.recalculateTotalComp();
  }

  weeksPerYearChangeHandler(): void {
    this.weeksPerYear = Number((event.target as HTMLInputElement).value);
    this.recalculateTotalComp();
  }

  formattedDues(): string {
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

  setInvalid(field: string, message: string): void {
    const input = this.form.elements.namedItem(field) as HTMLInputElement;
    input.setCustomValidity(message);
    input.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }
}

/**
 * URLSearchParams wrapper that can remove any accessed field.  Useful for
 * pulling out fields that need to be tokenized and not uploaded directly.
 */
class SpliceableUrlSearchParams {
  private readonly original: URLSearchParams;
  private readonly remainder: URLSearchParams;
  constructor(original: URLSearchParams | FormData) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- https://github.com/microsoft/TypeScript/issues/30584
    this.original = new URLSearchParams(original as any);
    this.remainder = new URLSearchParams(this.original);
  }

  get(field: string): string | null {
    return this.original.get(field);
  }

  splice(field: string): string | null {
    this.remainder.delete(field);
    return this.get(field);
  }

  getRemainder(): URLSearchParams {
    return new URLSearchParams(this.remainder);
  }
}

declare global {
  interface Window {
    SIGNUP_API: string;
    STRIPE_KEY: string;
    fillTestValues: () => void;
  }
}
