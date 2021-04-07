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

import { REQUIRED_FIELDS } from '../../../signup-worker/src/fields';

const ALPHABET_SUBSIDIARIES = [
  'Google',
  'Alphabet',
  'X',
  'Wing',
  'Waymo',
  'YouTube TV',
  'DeepMind',
  'Calico',
  'Verily',
  'Sidewalk Labs',
  'Firebase',
  'GV',
  'Google Fiber',
  'Google Nest',
  'Google Canada Corporation',
  'Vevo',
  'Jigsaw',
  'Baarzo',
  'Waze Mobile Limited',
  'Alphabet Capital US',
  'Google Argentina',
  'Channel Intelligence',
  'Appurify',
  'Google Spain',
  'Google Ireland Holdings',
  'Neverware',
  'Actifio',
  'CapitalG',
  'Makani',
  'Zync',
  'ITA Software',
  'Stackdriver',
  'Owlchemy Labs',
  'Google Environment',
  'Cask Data',
  'Anvato',
  'Jibe Mobile',
  'Adometry',
  'Google Netherlands',
  'BufferBox',
  'Google Norway',
  'Keyhole',
  'Google Mexico',
  'Google Czech Republic',
  'DevOps Research and Assessments',
  'Pulse.io',
  'Google Italy',
  'Chronicle',
  'Google France',
  'Fly Labs',
  'Google Austria',
  'Google New Zealand',
];

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
  @query('[name="pronouns"]')
  pronouns!: HTMLInputElement;
  @query('[name="preferred-language"]')
  preferredLanguage!: HTMLInputElement;
  @query('[name="personal-email"]')
  personalEmail!: HTMLInputElement;
  @query('[name="personal-phone"]')
  personalPhone!: HTMLInputElement;
  @query('[name="mailing-address-1"]')
  mailingAddress1!: HTMLInputElement;
  @query('[name="mailing-address-2"]')
  mailingAddress2!: HTMLInputElement;
  @query('[name="mailing-city"]')
  mailingCity!: HTMLInputElement;
  @query('[name="mailing-region"]')
  mailingRegion!: HTMLInputElement;
  @query('[name="mailing-postal-code"]')
  mailingPostalCode!: HTMLInputElement;
  @query('[name="mailing-country"]')
  mailingCountry!: HTMLInputElement;
  @query('[name="work-email"]')
  workEmail!: HTMLInputElement;
  @query('[name="employment-type"]')
  employmentType!: HTMLInputElement;
  @query('[name="employer"]')
  employer!: HTMLInputElement;
  @query('[name="site-code"]')
  siteCode!: HTMLInputElement;
  @query('[name="building-code"]')
  buildingCode!: HTMLInputElement;
  @query('[name="product-area"]')
  productArea!: HTMLInputElement;
  @query('[name="org"]')
  org!: HTMLInputElement;
  @query('[name="team"]')
  team!: HTMLInputElement;
  @query('[name="job-title"]')
  jobTitle!: HTMLInputElement;
  @query('[name="have-reports"]')
  haveReports!: HTMLInputElement;
  @query('[name="total-compensation"]')
  totalCompensation!: HTMLInputElement;

  // Payment info input elements.
  @query('[name="card-holder-name"]')
  cardHolderName: HTMLInputElement;
  @query('[name="billing-address-1"]')
  billingAddress1: HTMLInputElement;
  @query('[name="billing-address-2"]')
  billingAddress2: HTMLInputElement;
  @query('[name="billing-city"]')
  billingCity: HTMLInputElement;
  @query('[name="billing-region"]')
  billingRegion: HTMLInputElement;
  @query('[name="billing-postal-code"]')
  billingPostalCode: HTMLInputElement;
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
      this.employmentType.value = 'fte';
      this.signature.value = 'foo';
      this.preferredName.value = 'foo';
      this.personalEmail.value = 'foo@foo';
      this.personalPhone.value = 'foo';
      this.mailingAddress1.value = 'foo';
      this.mailingCity.value = 'foo';
      this.mailingRegion.value = 'foo';
      this.mailingPostalCode.value = 'foo';
      this.mailingCountry.value = 'foo';
      this.employer.value = 'Google';
      this.siteCode.value = 'foo';
      this.org.value = 'foo';
      this.team.value = 'foo';
      this.jobTitle.value = 'foo';
      this.haveReports.value = 'n';
      this.totalCompensation.value = '250000';
      this.billingCountry.value = 'US';
      this.routingNumber.value = '110000000';
      this.accountNumber.value = '000123456789';
      this.accountHolderName.value = 'foo';
      this.currency.value = 'usd';
      this.signature.value = 'foo';
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
      <span class="hint">
        We encourage you to use a bank account instead though, so that less is
        lost to transaction fees. If you still want to use a card, debit cards
        allow lower fees than credit cards.
      </span>
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
          your union membership card after it's approved.
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
        <label class="full-width">
          <span class="title"
            >Preferred name${optionalLabel('preferred-name')}</span
          >
          <span class="hint">So we know what to call you</span>
          <input
            name="preferred-name"
            aria-label="Preferred Name"
            ?required=${REQUIRED_FIELDS.includes('preferred-name')}
          />
        </label>
        <label>
          <span class="title">Pronouns${optionalLabel('pronouns')}</span>
          <span class="hint">So we know how to address you</span>
          <input
            name="pronouns"
            aria-label="Pronouns"
            ?required=${REQUIRED_FIELDS.includes('pronouns')}
          />
        </label>
        <label>
          <span class="title"
            >Preferred language${optionalLabel('preferred-language')}</span
          >
          <span class="hint">So we know how to talk to you</span>
          <input
            name="preferred-language"
            aria-label="Preferred language"
            ?required=${REQUIRED_FIELDS.includes('preferred-language')}
          />
        </label>
        <h2>How can we contact you?</h2>
        <label>
          <span class="title"
            >Personal email${optionalLabel('personal-email')}</span
          >
          <span class="hint">This will be our primary method of contact.</span>
          <input
            name="personal-email"
            type="email"
            aria-label="Personal email"
            ?required=${REQUIRED_FIELDS.includes('personal-email')}
          />
        </label>
        <label>
          <span class="title"
            >Personal phone${optionalLabel('personal-phone')}</span
          >
          <span class="hint"
            >In case we need to contact you with low latency (rare).</span
          >
          <input
            name="personal-phone"
            type="tel"
            aria-label="Personal phone"
            ?required=${REQUIRED_FIELDS.includes('personal-phone')}
          />
        </label>
        <label>
          <span class="title"
            >Mailing address${optionalLabel('mailing-address-1')}</span
          >
          <span class="hint"
            >CWA Local 1400 needs your address to send you paper ballots.</span
          >
          <input
            name="mailing-address-1"
            aria-label="Mailing address"
            ?required=${REQUIRED_FIELDS.includes('mailing-address-1')}
          />
        </label>
        <label>
          <span class="title"
            >Address line 2${optionalLabel('mailing-address-2')}</span
          >
          <span class="hint">Apt, unit, etc.</span>
          <input
            name="mailing-address-2"
            aria-label="Mailing address"
            ?required=${REQUIRED_FIELDS.includes('mailing-address-2')}
          />
        </label>
        <label>
          <span class="title">City${optionalLabel('mailing-city')}</span>
          <span class="hint"></span>
          <input
            name="mailing-city"
            aria-label="City"
            ?required=${REQUIRED_FIELDS.includes('mailing-city')}
          />
        </label>
        <label>
          <span class="title">Region${optionalLabel('mailing-region')}</span>
          <span class="hint"></span>
          <input
            name="mailing-region"
            aria-label="Region"
            ?required=${REQUIRED_FIELDS.includes('mailing-region')}
          />
        </label>
        <label>
          <span class="title"
            >Postal code${optionalLabel('mailing-postal-code')}</span
          >
          <span class="hint"></span>
          <input
            name="mailing-postal-code"
            aria-label="Postal code"
            ?required=${REQUIRED_FIELDS.includes('mailing-postal-code')}
          />
        </label>
        <label>
          <span class="title">Country${optionalLabel('mailing-country')}</span>
          <span class="hint"></span>
          <input
            name="mailing-country"
            aria-label="Country"
            ?required=${REQUIRED_FIELDS.includes('mailing-country')}
          />
        </label>
        <h2>Where do you work?</h2>
        <label>
          <span class="title"
            >Employment type${optionalLabel('employment-type')}</span
          >
          <span class="hint"
            >So we know what kind of workers are in our union.</span
          >
          <div class="select">
            <select
              name="employment-type"
              @input=${this.employmentTypeHandler}
              ?required=${REQUIRED_FIELDS.includes('employment-type')}
            >
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
                ${this.employmentType?.value === 'c'
                  ? 'client'
                  : 'employer'}${optionalLabel('employer')}</span
              >
              <span class="hint"></span>
              <div class="select">
                <select
                  name="employer"
                  ?required=${REQUIRED_FIELDS.includes('employer')}
                >
                  ${ALPHABET_SUBSIDIARIES.map(
                    (name, i) =>
                      html`<option ?selected=${i === 0}>${name}</option>`
                  )}
                </select>
              </div>
            </label>`
          : html` <label>
              <span class="title"
                >Vendor employer${optionalLabel('employer')}</span
              >
              <span class="hint"></span>
              <input
                name="employer"
                aria-label="Employer"
                ?required=${REQUIRED_FIELDS.includes('employer')}
              />
            </label>`}
        <label>
          <span class="title">Job title${optionalLabel('job-title')}</span>
          <span class="hint"
            >We want to know what kinds of workers are in our union</span
          >
          <input
            name="job-title"
            aria-label="Job Title"
            ?required=${REQUIRED_FIELDS.includes('job-title')}
          />
        </label>
        <label>
          <span class="title">Team name${optionalLabel('team')}</span>
          <span class="hint">Lets us connect you with your coworkers</span>
          <input
            name="team"
            aria-label="Team name"
            ?required=${REQUIRED_FIELDS.includes('team')}
          />
        </label>
        <label>
          <span class="title">Organization${optionalLabel('org')}</span>
          <span class="hint"
            >The larger team/department/organization of which your team is a
            part.</span
          >
          <input
            name="org"
            aria-label="Organization"
            ?required=${REQUIRED_FIELDS.includes('org')}
          />
        </label>
        <label>
          <span class="title"
            >Product area (PA)${optionalLabel('product-area')}</span
          >
          <span class="hint">Lets us connect you with your coworkers</span>
          <input
            name="product-area"
            aria-label="Product Area"
            ?required=${REQUIRED_FIELDS.includes('product-area')}
          />
        </label>
        <label>
          <span class="title">Site code${optionalLabel('site-code')}</span>
          <span class="hint"
            >So we can connect you with your local workplace units. Site code is
            a country code followed by a location code (e.g. "US-MTV").</span
          >
          <input
            name="site-code"
            aria-label="Site code"
            ?required=${REQUIRED_FIELDS.includes('site-code')}
          />
        </label>
        <label>
          <span class="title"
            >Building code${optionalLabel('building-code')}</span
          >
          <span class="hint"
            >So we can connect you with your local coworkers.</span
          >
          <input
            name="building-code"
            aria-label="Building code"
            ?required=${REQUIRED_FIELDS.includes('building-code')}
          />
        </label>
        <label>
          <span class="title"
            >Do you have reports?${optionalLabel('have-reports')}</span
          >
          <span class="hint"
            >Individuals with (non-intern/student researcher) reports face a
            different risk profile when joining a union. If you do, we will
            reach out to you with more info.</span
          >
          <div class="select">
            <select
              name="have-reports"
              aria-label="Do you have reports?"
              ?required=${REQUIRED_FIELDS.includes('have-reports')}
            >
              <option value="n" selected>No</option>
              <option value="y">Yes</option>
            </select>
          </div>
        </label>
        <label>
          <span class="title">Work email${optionalLabel('work-email')}</span>
          <span class="hint"
            >Used to verify your employment in most cases. We will never contact
            this address.</span
          >
          <input
            name="work-email"
            type="email"
            aria-label="Work email"
            ?required=${REQUIRED_FIELDS.includes('work-email')}
          />
        </label>
        <h2>Monthly dues</h2>
        <div class="field">
          <span class="title"
            >Total Compensation (TC)${optionalLabel('total-compensation')}</span
          >
          <span class="hint"
            >Annual. Used to calculate your union dues. We expect members to be
            honest, but this is the honor system: we won't check.</span
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
              ?required=${REQUIRED_FIELDS.includes('total-compensation')}
              @input=${this.compChangeHandler}
            />
            <div class="select">
              <select
                name="currency"
                ?required=${REQUIRED_FIELDS.includes('currency')}
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
            <span class="times">&times;</span>
            <label>
              <input
                type="number"
                value="40"
                @input=${this.hoursPerWeekChangeHandler}
              />
              <span class="hint">Hours per week</span>
            </label>
            <span class="times">&times;</span>
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
          <span class="title"
            >Accept Agreement${optionalLabel('signature')}</span
          >
          <span class="hint"
            >Type in your name below to agree to the
            <a href="">membership terms</a> of the Communications Workers of
            America, under whom AWU is formed. You also authorize the regular
            charge of your dues and one-time $5 initiation fee</span
          >
          <input
            name="signature"
            aria-label="Signature"
            ?required=${REQUIRED_FIELDS.includes('signature')}
          />
        </label>
        <div class="field full-width">
          <span class="hint"
            >A one-time $5 signup fee will be charged after your application is
            approved, and dues will be charged on the 5th of each month.</span
          >
        </div>
        <div class="actions">
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
    this.totalCompensation.value = String(
      this.hourlyRate * this.hoursPerWeek * this.weeksPerYear
    );
    this.requestUpdate();
  }

  hourlyRateChangeHandler(event: InputEvent): void {
    this.hourlyRate = Number((event.target as HTMLInputElement).value);
    this.recalculateTotalComp();
  }

  hoursPerWeekChangeHandler(event: InputEvent): void {
    this.hoursPerWeek = Number((event.target as HTMLInputElement).value);
    this.recalculateTotalComp();
  }

  weeksPerYearChangeHandler(event: InputEvent): void {
    this.weeksPerYear = Number((event.target as HTMLInputElement).value);
    this.recalculateTotalComp();
  }

  formattedDues(): string {
    const comp = Number(this.totalCompensation?.value);
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

function optionalLabel(name: string): string {
  return REQUIRED_FIELDS.includes(name) ? '' : ' (optional)';
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
