import {
  customElement,
  html,
  LitElement,
  TemplateResult,
  state,
} from 'lit-element';
import { query } from 'lit/decorators.js';
import { choose } from 'lit-html/directives/choose.js';
import { classMap } from 'lit-html/directives/class-map.js';
import {
  loadStripe,
  StripeCardElement,
  StripePaymentElement,
} from '@stripe/stripe-js';
import { allCountries } from 'country-region-data';
import { repeat } from 'lit/directives/repeat.js';
import {
  CARD_PROCESSING_FEE,
  FRIENDLY_INITIATION_FEE,
} from '../../common/constants';

import styles from './signup.scss';

import {
  REQUIRED_FIELDS,
  FTE_REQUIRED_FIELDS,
} from '../../signup-worker/src/fields';

const ALPHABET_SUBSIDIARIES = [
  'Google',
  'Wing',
  'Waymo',
  'Calico',
  'Verily',
  'GV',
  'Google Fiber',
  'CapitalG',
  'Intrinsic',
  'Isomorphic Labs',
  'Bellwether',
  'Malta',
  'Tapestry',
  'Other X projects',
];

const WORK_EMAIL_SUFFIXES = [
  '.google',
  'calicolabs.com',
  'capitalg.com',
  'chronicle.security',
  'deepmind.com',
  'fiber.google.com',
  'google.com',
  'googlers.com',
  'gv.com',
  'jigsaw.google.com',
  'loon.com',
  'makanipower.com',
  'nest.com',
  'owlchemylabs.com',
  'rewsprojects.com',
  'sidewalklabs.com',
  'verily.com',
  'waymo.com',
  'waze.com',
  'wing.com',
  'x.company',
  'youtube.com',
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
  private readonly stripeElements = this.stripe.then((stripe) =>
    stripe.elements({
      mode: 'subscription',
      amount: 0,
      currency: 'usd',
      paymentMethodTypes: ['us_bank_account', 'card'],
    }),
  );

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
  @query('[name="birthday"]')
  birthday!: HTMLInputElement;
  @query('[name="tshirt-size"]')
  tshirtSize!: HTMLSelectElement;
  @query('[name="sms-consent"]')
  smsConsent!: HTMLSelectElement;

  // Payment info input elements.
  @query('[name="currency"]')
  currency!: HTMLInputElement;
  @query('[name="signature"]')
  signature!: HTMLInputElement;

  cardElement: StripeCardElement;
  private paymentElement: StripePaymentElement;

  @state()
  lastStripeMethod = '';

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
    (countryData) => countryData[1] === 'US',
  )[2];

  private hourlyRate = 0;
  private hoursPerWeek = 40;
  private readonly weeksPerYear = 52;

  constructor() {
    super();

    if (
      new URLSearchParams(window.location.search).get('redirect_status') ===
      'succeeded'
    ) {
      this.isComplete = true;
    }

    window.fillTestValues = async () => {
      await this.updateComplete;

      this.employmentType.value = 'fte';
      this.signature.value = 'foo';
      this.preferredName.value = 'foo';
      this.personalEmail.value = 'foo@foo.com';
      this.personalPhone.value = 'foo';
      this.mailingAddress1.value = 'foo';
      this.mailingCity.value = 'foo';
      this.mailingRegion.value = 'California';
      this.mailingPostalCode.value = 'foo';
      this.mailingCountry.value = 'United States';
      this.employer.value = 'Google';
      this.siteCode.value = 'foo';
      this.org.value = 'foo';
      this.team.value = 'foo';
      this.jobTitle.value = 'foo';
      this.haveReports.value = 'n';
      this.totalCompensation.value = '250000';
      this.birthday.value = '01/01/1950';
      this.tshirtSize.value = 'other';
      this.smsConsent.value = 'n';
      this.currency.value = 'usd';
      this.signature.value = 'foo';
      this.requestUpdate();
    };
  }

  protected clearInvalidity(event: InputEvent): void {
    (event.target as HTMLInputElement).setCustomValidity('');
  }

  private paymentTemplate(): TemplateResult {
    return html` <h2>Payment</h2>
      ${this.isBankSupported()
        ? ''
        : html` <div class="field full-width">
            <div class="title">
              We cannot register Canadian bank payments from this form yet. If
              you would like to pay with bank withdrawal, please register with a
              card and, once you've done so, email
              <a href="mailto:membership@alphabetworkersunion.org">
                membership@alphabetworkersunion.org</a
              >
              to be sent a secure link to update to bank payments.
            </div>
          </div>`}
      <slot
        class="field full-width"
        name="stripe-payment-container"
        @slotchange=${this.rebindStripePaymentElement}
      ></slot>`;
  }

  render(): TemplateResult {
    return html`
      <div class="completed ${classMap({ 'not-completed': !this.isComplete })}">
        <h2>All done</h2>
        <p>
          The membership committee will review your application and then send a
          welcome email after it's approved.
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
            >Enter the full name you want union members to use when
            communicating with you</span
          >
          <input
            name="preferred-name"
            aria-label="Name"
            ?required=${this.isFieldRequired('preferred-name')}
            autocomplete="off"
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
        <label>
          <span class="title"
            >T-shirt size${this.optionalLabel('tshirt-size')}</span
          >
          <span class="hint"
            ><a
              href="https://worxprinting.coop/wp-content/uploads/2023/08/20230821_Size_Charts.pdf"
              target="_blank"
              >Unisex sizing</a
            ></span
          >
          <div class="select">
            <select
              name="tshirt-size"
              aria-label="T-shirt size (unisex)"
              ?required=${this.isFieldRequired('tshirt-size')}
              autocomplete="off"
            >
              <option value="" selected></option>
              <option value="xs">XS</option>
              <option value="s">Small</option>
              <option value="m">Medium</option>
              <option value="l">Large</option>
              <option value="xl">XL</option>
              <option value="2xl">2XL</option>
              <option value="3xl">3XL</option>
              <option value="4xl">4XL</option>
              <option value="other">Other (none of the above)</option>
            </select>
          </div>
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
            >CWA Local 9009 will use your address to send mail.</span
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
              'mailing-region',
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
                `,
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
            >Yes, I want to receive updates from CWA International. Message &
            data rates may apply. Visit
            <a href="https://www.cwa-union.org/sms-terms" target="_blank"
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
                      html`<option ?selected=${i === 0}>${name}</option>`,
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
            country code followed by a location code (for example, "US-MTV"). If
            you do not work in an office, please enter "REMOTE". If you don't
            know your office location, please enter "OTHER".</span
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
              ${choose(this.isCompCalculatorOpen, [
                [
                  false,
                  // https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/calculate/wght200grad200/48px.svg
                  () =>
                    html`<svg
                      xmlns="http://www.w3.org/2000/svg"
                      height="48"
                      viewBox="0 -960 960 960"
                      width="48"
                    >
                      <path
                        d="M324.385-240.461h38.769v-85.154h85.154v-38.77h-85.154v-84.384h-38.769v84.384H240v38.77h84.385v85.154Zm209.307-32.693h184.616v-38.538H533.692v38.538Zm0-104.154h184.616v-38.769H533.692v38.769Zm32.539-163L624.154-599l59.692 58.692L712-568.231l-59.692-58.154L712-686.077l-28.154-28.154-59.692 58.923-57.923-58.923-28.923 28.154L597-626.385l-59.692 58.154 28.923 27.923Zm-314.308-67.077h182.692v-38.769H251.923v38.769ZM215.384-147q-27.782 0-48.083-20.301T147-215.384v-529.232q0-27.782 20.301-48.083T215.384-813h529.232q27.782 0 48.083 20.301T813-744.616v529.232q0 27.782-20.301 48.083T744.616-147H215.384Zm0-43.769h529.232q9.23 0 16.923-7.692 7.692-7.693 7.692-16.923v-529.232q0-9.23-7.692-16.923-7.693-7.692-16.923-7.692H215.384q-9.23 0-16.923 7.692-7.692 7.693-7.692 16.923v529.232q0 9.23 7.692 16.923 7.693 7.692 16.923 7.692Zm-24.615-578.462v578.462-578.462Z"
                      />
                    </svg>`,
                ],
                [
                  true,
                  // https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/calculate/wght200grad200fill1/48px.svg
                  () =>
                    html`<svg
                      xmlns="http://www.w3.org/2000/svg"
                      height="48"
                      viewBox="0 -960 960 960"
                      width="48"
                    >
                      <path
                        d="M324.385-240.461h38.769v-85.154h85.154v-38.77h-85.154v-84.384h-38.769v84.384H240v38.77h84.385v85.154Zm209.307-32.693h184.616v-38.538H533.692v38.538Zm0-104.154h184.616v-38.769H533.692v38.769Zm32.539-163L624.154-599l59.692 58.692L712-568.231l-59.692-58.154L712-686.077l-28.154-28.154-59.692 58.923-57.923-58.923-28.923 28.154L597-626.385l-59.692 58.154 28.923 27.923Zm-314.308-67.077h182.692v-38.769H251.923v38.769ZM215.384-147q-27.782 0-48.083-20.301T147-215.384v-529.232q0-27.782 20.301-48.083T215.384-813h529.232q27.782 0 48.083 20.301T813-744.616v529.232q0 27.782-20.301 48.083T744.616-147H215.384Z"
                      />
                    </svg>`,
                ],
              ])}
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
            <a href="/faqs#dues" target="_blank">the FAQs</a> for more details.
          </span>
          ${this.duesTemplate()}
        </label>
        ${this.paymentTemplate()}
        <h2>Accept agreement</h2>
        <label class="full-width">
          <span class="title">
            Type your name in the Signature field to accept the
            <a
              href="https://cwa-union.org/for-locals/cwa-constitution"
              target="_blank"
              >membership terms</a
            >
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

  currencyChangeHandler(): void {
    this.updateCurrencyPaymentMethod();
  }

  async updateCurrencyPaymentMethod(): Promise<void> {
    (await this.stripeElements).update({
      currency: this.currency.value,
      paymentMethodTypes: this.isBankSupported()
        ? ['us_bank_account', 'card']
        : ['card'],
    });
    this.requestUpdate();
  }

  personalEmailValidator(): boolean {
    if (this.isWorkEmail(this.personalEmail.value)) {
      this.setInvalid(
        'personal-email',
        'Please enter a non-work email address.',
      );
      this.personalEmail.reportValidity();
      return false;
    }

    return true;
  }

  enableInvalidStyles(): void {
    this.form.classList.add('invalidatable');
  }

  isWorkEmail(email: string): boolean {
    return WORK_EMAIL_SUFFIXES.some((suffix) => email.endsWith(suffix));
  }

  async submit(event: Event): Promise<void> {
    event.preventDefault();
    this.enableInvalidStyles();

    this.isLoading = true;
    const body = new FormData(this.form);
    body.set('payment-method', this.lastStripeMethod);
    const email = this.personalEmail.value;

    // Create a wrapper function once more custom validations are run on this form.
    const customValidationsPassed = this.personalEmailValidator();

    if (!customValidationsPassed) {
      this.isLoading = false;
      return;
    }

    try {
      const stripeElementResult = await (await this.stripeElements).submit();
      if (stripeElementResult.error) {
        throw new Error(stripeElementResult.error.message);
      }

      const result = await fetch(window.SIGNUP_API, { method: 'POST', body });

      if (result.ok) {
        const responseBody = await result.json();
        await (
          await this.stripe
        ).confirmSetup({
          elements: await this.stripeElements,
          clientSecret: responseBody['subscription_client_secret'],
          confirmParams: {
            return_url: window.location.toString(),
            payment_method_data: {
              billing_details: { email },
            },
          },
          redirect: 'if_required',
        });
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

  employmentTypeHandler(): void {
    this.isFirstPartyEmployer = this.employmentType.value !== 'v';
    this.isContractor = this.employmentType.value === 'c';
    this.requestUpdate();
  }

  mailingCountryChangeHandler(): void {
    this.availableRegions = allCountries.find(
      (countryData) => countryData[0] === this.mailingCountry.value,
    )[2];
    this.currency.value =
      this.mailingCountry.value == 'United States' ? 'usd' : 'cad';

    this.updateCurrencyPaymentMethod();
  }

  // TODO(#208): Temporary until bank accounts are supported for Canada.
  private isBankSupported(): boolean {
    return (
      !this.mailingCountry ||
      (this.mailingCountry?.value === 'United States' &&
        this.currency.value === 'usd')
    );
  }

  compChangeHandler(): void {
    this.requestUpdate();
  }

  private stripePaymentContainer: HTMLElement;

  /**
   * Stripe Elements do not work within the ShadowDOM.  To enable it to work
   * properly, this element accepts a slot called `stripe-card-container`.  It
   * only needs to exist, and can be empty.  The stripe element is mounted to
   * that slot element, so that it exists outside of the shadow DOM.
   */
  private async rebindStripePaymentElement(event: Event): Promise<void> {
    this.stripePaymentContainer = (
      event.target as HTMLSlotElement
    ).assignedElements()[0] as HTMLElement;

    if (this.stripePaymentContainer instanceof Element) {
      if (this.paymentElement) {
        this.paymentElement.unmount();
      }
      this.paymentElement = (await this.stripeElements).create('payment', {
        layout: 'tabs',
        paymentMethodOrder: ['us_bank_account', 'card'],
        fields: {
          billingDetails: {
            email: 'never',
          },
        },
      });
      this.paymentElement.mount(this.stripePaymentContainer);

      // Keep track of payment method for re-calculating dues.
      this.paymentElement.on('change', (event) => {
        this.lastStripeMethod = event.value.type;
      });
    }

    this.compChangeHandler();
  }

  compCalculatorClickHandler(): void {
    this.isCompCalculatorOpen = !this.isCompCalculatorOpen;
  }

  private recalculateTotalComp(): void {
    this.totalCompensation.value = String(
      this.hourlyRate * this.hoursPerWeek * this.weeksPerYear,
    );
    this.compChangeHandler();
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
    return this.lastStripeMethod === 'card';
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

  formattedCurrency(): string {
    return this.currency?.value.toUpperCase() ?? '';
  }

  setInvalid(field: string, message: string): void {
    const input = this.form.elements.namedItem(
      field,
    ) as HTMLInputElement | null;
    if (input) {
      input.setCustomValidity(message);
      input.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    } else {
      console.error(message);
      alert(message);
    }
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

declare global {
  interface Window {
    SIGNUP_API: string;
    STRIPE_KEY: string;
    PAYMENT_INTENT_API: string;
    fillTestValues: () => void;
  }
}
