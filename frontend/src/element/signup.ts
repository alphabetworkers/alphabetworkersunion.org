import {
  customElement,
  html,
  LitElement,
  TemplateResult,
  state,
} from 'lit-element';
import { query } from 'lit/decorators.js';
import { classMap } from 'lit-html/directives/class-map.js';
import { loadStripe, StripeCardElement, Token } from '@stripe/stripe-js';
import { allCountries } from 'country-region-data';
import { repeat } from 'lit/directives/repeat.js';
import {
  CARD_PROCESSING_FEE,
  FRIENDLY_CARD_PROCESSING_FEE,
  FRIENDLY_INITIATION_FEE,
} from '../../../common/constants';

import styles from './signup.scss';

import {
  REQUIRED_FIELDS,
  FTE_REQUIRED_FIELDS,
} from '../../../signup-worker/src/fields';

const PLAID_LIB_URL = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';

interface PlaidMetadata {
  institution: {
    name: string;
  };
  accounts: {
    name: string;
    id: string;
  }[];
}

interface PlaidToken {
  public_token: string;
  account_name: string;
  account_id: string;
}

let loadingPlaid: Promise<Window['Plaid']> | undefined;
function loadPlaid(): Promise<Window['Plaid']> {
  if (!loadingPlaid) {
    loadingPlaid = new Promise((resolve, reject) => {
      const plaidScript = document.createElement('script');
      plaidScript.addEventListener('load', () => {
        resolve(window.Plaid);
      });
      plaidScript.addEventListener('error', (error) => {
        reject(error);
      });
      plaidScript.src = PLAID_LIB_URL;
      document.body.append(plaidScript);
    });
  }
  return loadingPlaid;
}

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
  @query('name="birthday"]')
  birthday!: HTMLInputElement;
  @query('[name="sms-consent"]')
  smsConsent!: HTMLInputElement;

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

  // TODO(#208): Temporary until bank accounts are supported for Canada.
  @state()
  protected bankSupported = true;

  @state()
  protected paymentMethod: 'bank' | 'card' | 'plaid' = 'plaid';

  @state()
  isFirstPartyEmployer = true;

  @state()
  isLoading = false;

  @state()
  isContractor = false;

  @state()
  isComplete = false;

  @state()
  private isCompCalculatorOpen = false;

  @state()
  private availableRegions = allCountries.find(
    (countryData) => countryData[1] === 'US'
  )[2];

  @state()
  private plaidToken?: PlaidToken;

  private hourlyRate = 0;
  private hoursPerWeek = 40;
  private readonly weeksPerYear = 52;

  private readonly plaid: Promise<Window['Plaid']> = loadPlaid();

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
      this.birthday.value = '01/01/1950';
      this.smsConsent.value = '1';
      this.billingCountry.value = 'US';
      this.routingNumber.value = '110000000';
      this.accountNumber.value = '000123456789';
      this.accountHolderName.value = 'foo';
      this.currency.value = 'usd';
      this.signature.value = 'foo';
    };
  }

  protected setMethod(
    method: 'bank' | 'card' | 'plaid'
  ): (event?: MouseEvent) => unknown {
    return (event?: MouseEvent) => {
      event?.preventDefault();
      this.paymentMethod = method;
    };
  }

  protected isMethod(method: 'bank' | 'card' | 'plaid'): boolean {
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

  private connectedPlaidTemplate(): TemplateResult {
    return html` <div class="field full-width">
      <span class="title">Verified Account</span>
      <span class="hint"></span>
      <p>
        ${this.plaidToken?.account_name}
        <button @click=${this.clearPlaid}>Remove</button>
      </p>
    </div>`;
  }

  private paymentTemplate(): TemplateResult {
    return html` <h2>Payment</h2>
      ${this.bankSupported
        ? ''
        : html` <div class="field full-width">
            <div class="title">
              We cannot register Canadian bank payments from this form yet. If
              you would like to pay with bank withdrawal, please register with a
              card and, once you've done so, email
              <a href="mailto:operations@alphabetworkersunion.org">
                operations@alphabetworkersunion.org</a
              >
              to be sent a secure link to update to bank payments.
            </div>
          </div>`}
      <div class="payment-method-toggle full-width">
        <button
          ?disabled=${!this.bankSupported}
          class=${classMap({ selected: this.isMethod('plaid') })}
          @click=${this.setMethod('plaid')}
        >
          Bank account
        </button>
        <button
          ?disabled=${!this.bankSupported}
          class=${classMap({ selected: this.isMethod('bank') })}
          @click=${this.setMethod('bank')}
        >
          Bank account (manual)
        </button>
        <button
          class=${classMap({ selected: this.isMethod('card') })}
          @click=${this.setMethod('card')}
        >
          Card
        </button>
      </div>
      ${this.paymentMethodTemplate()}`;
  }

  // TODO prevent scrolling from incrementing number fields
  // TODO server-side validation, and accept error responses
  private readonly bankTemplate: TemplateResult = html`<div
      class="field full-width"
    >
      <span class="title">Connect bank</span>
      <span class="hint">
        If you enter your routing or account numbers manually, two microdeposits
        are made into your account. In order to verify your bank account, we
        will need to contact you after those deposits have cleared. This process
        usually takes 2-3 days.
      </span>
    </div>
    <label>
      <span class="title">Routing number</span>
      <span class="hint"> </span>
      <input
        name="routing-number"
        aria-label="Routing number"
        type="number"
        minlength="9"
        required
        autocomplete="cc-number"
      />
    </label>
    <label>
      <span class="title">Account number</span>
      <span class="hint"></span>
      <input
        name="account-number"
        aria-label="Account number"
        type="number"
        minlength="10"
        required
        autocomplete="cc-number"
      />
    </label>
    <label>
      <span class="title">Account holder name</span>
      <input
        name="account-holder-name"
        aria-label="Account holder name"
        required
        autocomplete="cc-name"
      />
    </label>
    <label>
      <span class="title">Country of account</span>
      <div class="select">
        <select name="billing-country" required autocomplete="country">
          <option value="US" selected>US</option>
          <option value="CA">CA</option>
        </select>
      </div>
    </label>`;

  private cardTemplate(): TemplateResult {
    return html`<div class="field full-width">
        <span class="title">Card details</span>
        <span class="hint">
          ${this.bankSupported
            ? html` <em>Please consider using a bank account to pay dues.</em>
                This both saves you the ${FRIENDLY_CARD_PROCESSING_FEE}
                processing fee charge, and also your union's administrative
                overhead by saving the work of getting updated payment
                information when cards expire or are cancelled.`
            : ''}
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
        <input
          name="card-holder-name"
          aria-label="Card holder name"
          required
          autocomplete="cc-name"
        />
      </label>
      <label>
        <span class="title">Billing street address</span>
        <span class="hint"></span>
        <input
          name="billing-address-1"
          aria-label="Address line 1"
          required
          autocomplete="address-line1"
        />
      </label>
      <label>
        <span class="title">Billing street line 2</span>
        <span class="hint"></span>
        <input
          name="billing-address-2"
          aria-label="Address line 2"
          autocomplete="address-line2"
        />
      </label>
      <label>
        <span class="title">Billing city</span>
        <span class="hint"></span>
        <input
          name="billing-city"
          aria-label="Billing City"
          required
          autocomplete="address-level2"
        />
      </label>
      <label>
        <span class="title">Billing state</span>
        <span class="hint"></span>
        <input
          name="billing-state"
          aria-label="Billing State"
          required
          autocomplete="address-level1"
        />
      </label>
      <label>
        <span class="title">Billing postal code</span>
        <span class="hint"></span>
        <input
          name="billing-zip"
          aria-label="Billing Postal Code"
          required
          autocomplete="postal-code"
        />
      </label>
      <label>
        <span class="title">Billing country</span>
        <span class="hint"></span>
        <input
          name="billing-country"
          aria-label="Billing Country"
          required
          autocomplete="country"
        />
      </label>`;
  }

  private readonly plaidTemplate = html` <div class="field full-width">
    <span class="title">Connect bank</span>
    <span class="hint">
      Click Connect bank to use Plaid to instantly connect your bank account.
    </span>
    <button
      @click=${this.openPlaid}
      class="primary"
      type="button"
      type="button"
    >
      Connect bank
    </button>
  </div>`;

  render(): TemplateResult {
    return html`
      <div class="completed ${classMap({ 'not-completed': !this.isComplete })}">
        <h2>All done</h2>
        <p>
          The membership committee will review your application, and we'll send
          your union membership card after it's approved.
        </p>
        <p>Welcome to our union!</p>
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
        <p class="full-width">
          If you have any trouble completing this form, contact the Membership
          Committee at
          <a href="mailto:membership@alphabetworkersunion.org"
            >membership@alphabetworkersunion.org</a
          >.
        </p>
        <h2>Let's get to know you</h2>
        <label class="full-width">
          <span class="title">Name${this.optionalLabel('preferred-name')}</span>
          <span class="hint"
            >Enter the name you want union members to use when communicating
            with you</span
          >
          <input
            name="preferred-name"
            aria-label="Name"
            ?required=${this.isFieldRequired('preferred-name')}
            autocomplete="name"
          />
        </label>
        <label>
          <span class="title">Pronouns${this.optionalLabel('pronouns')}</span>
          <span class="hint">So we know how to address you</span>
          <input
            name="pronouns"
            aria-label="Pronouns"
            ?required=${this.isFieldRequired('pronouns')}
          />
        </label>
        <label>
          <span class="title"
            >Preferred language${this.optionalLabel('preferred-language')}</span
          >
          <span class="hint">So we know how to talk to you</span>
          <input
            name="preferred-language"
            aria-label="Preferred language"
            ?required=${this.isFieldRequired('preferred-language')}
          />
        </label>
        <label>
          <span class="title">Birthday${this.optionalLabel('birthday')}</span>
          <span class="hint"></span>
          <input
            name="birthday"
            type="date"
            aria-label="Birthday"
            ?required=${this.isFieldRequired('birthday')}
          />
        </label>
        <h2>How can we contact you?</h2>
        <label>
          <span class="title"
            >Personal email${this.optionalLabel('personal-email')}</span
          >
          <span class="hint">This will be our primary method of contact.</span>
          <input
            name="personal-email"
            type="email"
            aria-label="Personal email"
            ?required=${this.isFieldRequired('personal-email')}
            autocomplete="email"
          />
        </label>
        <label>
          <span class="title"
            >Personal phone${this.optionalLabel('personal-phone')}</span
          >
          <span class="hint"
            >We sometimes contact each other via phone call or text message,
            particularly if we can't reach you via any other methods.</span
          >
          <input
            name="personal-phone"
            type="tel"
            aria-label="Personal phone"
            ?required=${this.isFieldRequired('personal-phone')}
            autocomplete="tel"
          />
        </label>
        <label>
          <span class="title"
            >Mailing address${this.optionalLabel('mailing-address-1')}</span
          >
          <span class="hint"
            >CWA Local 1400 needs your address to send you paper ballots.</span
          >
          <input
            name="mailing-address-1"
            aria-label="Mailing address"
            ?required=${this.isFieldRequired('mailing-address-1')}
            autocomplete="address-line1"
          />
        </label>
        <label>
          <span class="title"
            >Address line 2${this.optionalLabel('mailing-address-2')}</span
          >
          <span class="hint">Apt, unit, etc.</span>
          <input
            name="mailing-address-2"
            aria-label="Mailing address"
            ?required=${this.isFieldRequired('mailing-address-2')}
            autocomplete="address-line2"
          />
        </label>
        <label>
          <span class="title">City${this.optionalLabel('mailing-city')}</span>
          <span class="hint"></span>
          <input
            name="mailing-city"
            aria-label="City"
            ?required=${this.isFieldRequired('mailing-city')}
            autocomplete="address-level2"
          />
        </label>
        <label>
          <span class="title"
            >Country${this.optionalLabel('mailing-country')}</span
          >
          <span class="hint"
            >Only workers in the US or Canada are currently eligible for AWU
            membership</span
          >
          <div class="select">
            <select
              name="mailing-country"
              aria-label="Country"
              ?required=${this.isFieldRequired('mailing-country')}
              autocomplete="country"
              @input=${this.mailingCountryChangeHandler}
            >
              <option value="United States">United States</option>
              <option value="Canada">Canada</option>
            </select>
          </div>
        </label>
        <label>
          <span class="title"
            >State/province/territory${this.optionalLabel(
              'mailing-region'
            )}</span
          >
          <span class="hint"></span>
          <div class="select">
            <select
              class="region-select"
              name="mailing-region"
              aria-label="Region"
              ?required=${this.isFieldRequired('mailing-region')}
              autocomplete="address-level1"
            >
              ${repeat(
                this.availableRegions,
                (regionData) => regionData[1],
                (regionData) => html`
                  <option value=${regionData[0]}>${regionData[0]}</option>
                `
              )}
            </select>
          </div>
        </label>
        <label>
          <span class="title"
            >Postal code${this.optionalLabel('mailing-postal-code')}</span
          >
          <span class="hint"></span>
          <input
            name="mailing-postal-code"
            aria-label="Postal code"
            ?required=${this.isFieldRequired('mailing-postal-code')}
            autocomplete="postal-code"
          />
        </label>
        <label>
          <span class="title"
            >Would you like SMS
            updates?${this.optionalLabel('sms-consent')}</span
          >
          <span class="hint"
            >Yes, I want to receive updates about my union and other
            union-related news from CWA. Message & data rates may apply. Visit
            <a href="https://www.cwa-union.org/sms-terms"
              >https://www.cwa-union.org/sms-terms</a
            >
            for Terms & Conditions and Privacy Policy.
          </span>
          <div class="select">
            <select
              name="sms-consent"
              aria-label="Opt in to SMS and email?"
              ?required=${this.isFieldRequired('sms-consent')}
              autocomplete="off"
            >
              <option value="n">No</option>
              <option value="y" selected>Yes</option>
            </select>
          </div>
        </label>
        <h2>Where do you work?</h2>
        <label>
          <span class="title"
            >Employment type${this.optionalLabel('employment-type')}</span
          >
          <span class="hint"
            >So we know what kind of workers are in our union. If you're not
            sure, "Vendor employee (V)" is probably the right answer.</span
          >
          <div class="select">
            <select
              name="employment-type"
              @input=${this.employmentTypeHandler}
              ?required=${this.isFieldRequired('employment-type')}
              autocomplete="off"
            >
              <option value="fte" selected>Full-time employee (FTE)</option>
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
                  : 'employer'}${this.optionalLabel('employer')}</span
              >
              <span class="hint"></span>
              <div class="select">
                <select
                  name="employer"
                  ?required=${this.isFieldRequired('employer')}
                  autocomplete="organization"
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
                >Vendor employer${this.optionalLabel('employer')}</span
              >
              <span class="hint"></span>
              <input
                name="employer"
                aria-label="Employer"
                ?required=${this.isFieldRequired('employer')}
                autocomplete="organization"
              />
            </label>`}
        <label>
          <span class="title">Job title${this.optionalLabel('job-title')}</span>
          <span class="hint"
            >We want to know what kinds of workers are in our union</span
          >
          <input
            name="job-title"
            aria-label="Job Title"
            required=${this.isFieldRequired('job-title')}
            autocomplete="organization-title"
          />
        </label>
        <label>
          <span class="title">Team name${this.optionalLabel('team')}</span>
          <span class="hint">So we can connect you with your coworkers</span>
          <input
            name="team"
            aria-label="Team name"
            ?required=${this.isFieldRequired('team')}
            autocomplete="off"
          />
        </label>
        <label>
          <span class="title">Organization${this.optionalLabel('org')}</span>
          <span class="hint"
            >The larger team/department/organization of which your team is a
            part.</span
          >
          <input
            name="org"
            aria-label="Organization"
            ?required=${this.isFieldRequired('org')}
            autocomplete="off"
          />
        </label>
        <label>
          <span class="title"
            >Product area (PA)${this.optionalLabel('product-area')}</span
          >
          <span class="hint"></span>
          <input
            name="product-area"
            aria-label="Product Area"
            ?required=${this.isFieldRequired('product-area')}
            autocomplete="off"
          />
        </label>
        <label>
          <span class="title">Site code${this.optionalLabel('site-code')}</span>
          <span class="hint"
            >So we can connect you with your local chapters. Site code is a
            country code followed by a location code (for example,
            "US-MTV").</span
          >
          <input
            name="site-code"
            aria-label="Site code"
            ?required=${this.isFieldRequired('site-code')}
            autocomplete="off"
          />
        </label>
        <label>
          <span class="title"
            >Building code${this.optionalLabel('building-code')}</span
          >
          <span class="hint"
            >So we can connect you with your local coworkers.</span
          >
          <input
            name="building-code"
            aria-label="Building code"
            ?required=${this.isFieldRequired('building-code')}
            autocomplete="off"
          />
        </label>
        <label>
          <span class="title"
            >Do other workers report up to
            you?${this.optionalLabel('have-reports')}</span
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
              ?required=${this.isFieldRequired('have-reports')}
              autocomplete="off"
            >
              <option value="n" selected>No</option>
              <option value="y">Yes</option>
            </select>
          </div>
        </label>
        <label>
          <span class="title"
            >Work email${this.optionalLabel('work-email')}</span
          >
          <span class="hint"
            >Used to verify your employment in most cases. We will never contact
            this address.</span
          >
          <input
            name="work-email"
            type="email"
            aria-label="Work email"
            ?required=${this.isFieldRequired('work-email')}
            autocomplete="off"
          />
        </label>
        <h2>Membership dues</h2>
        <div class="field">
          <span class="title"
            >Annual total compensation
            (TC)${this.optionalLabel('total-compensation')}</span
          >
          <span class="hint"
            >Your annual total compensation is used to calculate your monthly
            union dues. Enter how much you make in a year. If you don't have an
            annual salary, click the Calculator icon. We expect members to be
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
              ?required=${this.isFieldRequired('total-compensation')}
              @input=${this.compChangeHandler}
              autocomplete="off"
            />
            <div class="select">
              <select
                name="currency"
                ?required=${this.isFieldRequired('currency')}
                @input=${this.currencyChangeHandler}
                autocomplete="transaction-currency"
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
              <input
                type="number"
                @input=${this.hourlyRateChangeHandler}
                autocomplete="off"
              />
              <span class="hint">Hourly rate</span>
            </label>
            &times;
            <label>
              <input
                type="number"
                value="40"
                @input=${this.hoursPerWeekChangeHandler}
                autocomplete="off"
              />
              <span class="hint">Hours per week</span>
            </label>
          </div>
        </div>
        <label>
          <span class="title">Calculated dues</span>
          <span class="hint"
            >Annual dues are 1% of your TC, plus processing fee if you opt to
            pay with a card. This is billed monthly, and is pooled and
            democratically controlled by you and your fellow members. See
            <a href="/power/faq/#how-much-are-dues">the FAQ</a> for more details.
            </span
          >
          ${this.duesTemplate()}
        </label>
        ${this.plaidToken
          ? this.connectedPlaidTemplate()
          : this.paymentTemplate()}
        <h2>Accept agreement</h2>
        <label class="full-width">
          <span class="title">
            Type your name in the Signature field to accept the membership terms
            of the Communications Workers of America, under which AWU-CWA is
            formed. You also authorize a one-time ${FRIENDLY_INITIATION_FEE}
            initiation fee, and the regular charge of your calculated dues.
            <em
              >Nothing is charged until the Membership Committee reviews and
              accepts your membership application.</em
            >
          </span>
          <input
            name="signature"
            aria-label="Signature"
            placeholder="Signature"
            ?required=${this.isFieldRequired('signature')}
            autocomplete="off"
          />
        </label>
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
    // TODO add CAPTCHA?

    this.isLoading = true;
    const fields = new SpliceableUrlSearchParams(new FormData(this.form));
    try {
      let body: FormData;
      if (this.plaidToken) {
        body = fields.getRemainder();
        body.set('plaid-public-token', this.plaidToken.public_token);
        body.set('plaid-account-id', this.plaidToken.account_id);
      } else {
        const [token, remainingFields] = await (this.paymentMethod === 'bank'
          ? this.bankAccountToken(fields)
          : this.cardToken(fields));
        body = remainingFields;
        body.set('stripe-payment-token', token.id);
      }
      body.set('payment-method', this.paymentMethod);

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
    this.requestUpdate();
  }

  mailingCountryChangeHandler(): void {
    this.availableRegions = allCountries.find(
      (countryData) => countryData[0] === this.mailingCountry.value
    )[2];
    this.currency.value =
      this.mailingCountry.value == 'United States' ? 'usd' : 'cad';
    if (this.billingCountry != null) {
      this.billingCountry.value = this.mailingCountry.value;
    }
    // TODO(#208): Temporary until bank accounts are supported for Canada.
    if (this.mailingCountry.value === 'Canada') {
      this.paymentMethod = 'card';
      this.bankSupported = false;
    } else {
      this.bankSupported = true;
    }
    this.requestUpdate();
  }

  compChangeHandler(): void {
    this.requestUpdate();
  }

  currencyChangeHandler(): void {
    this.requestUpdate();
    if (this.billingCountry != null) {
      switch (this.currency.value) {
        case 'usd':
          this.billingCountry.value = 'United States';
          break;
        case 'cad':
          this.billingCountry.value = 'Canada';
          break;
      }
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

  isPayingWithCard(): boolean {
    return this.paymentMethod === 'card';
  }

  duesTemplate(): TemplateResult {
    if (!this.totalCompensation?.value) {
      return html``;
    }

    const tc = '$' + this.totalCompensation.value + '/yr';
    return this.isPayingWithCard()
      ? html`<div class="dues">
          ${tc} &times; 1% &div; 12
          <span class="dues-card-multiplier">
            &times; ${1 + CARD_PROCESSING_FEE}</span
          >
          = <strong>${this.formattedDues()}</strong>/mo
        </div>`
      : html` <div class="dues">
          ${tc} &times; 1% &div; 12 =
          <strong>${this.formattedDues()}</strong>/mo
        </div>`;
  }

  formattedDues(): string {
    const comp = Number(this.totalCompensation?.value);
    const cardMultiplier = this.isPayingWithCard()
      ? 1 + CARD_PROCESSING_FEE
      : 1;

    if (!Number.isNaN(comp)) {
      return `$${Math.floor((Math.floor(comp) / 100 / 12) * cardMultiplier)}`;
    } else {
      return '';
    }
  }

  paymentMethodTemplate(): TemplateResult {
    switch (this.paymentMethod) {
      case 'bank':
        return this.bankTemplate;
      case 'card':
        return this.cardTemplate();
      case 'plaid':
        return this.plaidTemplate;
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

  async openPlaid(): Promise<void> {
    // TODO re-use client token when possible.
    const { link_token } = await (
      await fetch(window.PLAID_TOKEN_API, { method: 'post' })
    ).json();
    const handler = (await this.plaid).create({
      token: link_token,
      onSuccess: (public_token: string, metadata: PlaidMetadata) => {
        this.plaidToken = {
          public_token,
          account_name: `${metadata.institution.name} ${metadata.accounts[0].name}`,
          account_id: metadata.accounts[0].id,
        };
      },
      onExit: () => {
        // TODO if exit, user probably could not find their financial institution.  Show the account number fields instead.
        // TODO re-use this iframe when possible, instead of re-creating every time.  Must silently recover if the token expires.
        handler.destroy();
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    handler.open();
  }

  clearPlaid(): void {
    this.plaidToken = undefined;
  }

  isFte(): boolean {
    return (
      this.employmentType?.value === 'fte' ||
      this.employmentType?.value === undefined
    );
  }

  isFieldRequired(name: string): boolean {
    return (
      REQUIRED_FIELDS.includes(name) ||
      (this.isFte() && FTE_REQUIRED_FIELDS.includes(name))
    );
  }

  optionalLabel(name: string): string {
    return this.isFieldRequired(name) ? '' : ' (optional)';
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
    PLAID_TOKEN_API: string;
    STRIPE_KEY: string;
    fillTestValues: () => void;
  }
}
