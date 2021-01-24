import {
  CSSResult,
  customElement,
  eventOptions,
  html,
  internalProperty,
  LitElement,
  query,
  TemplateResult,
  unsafeCSS,
} from 'lit-element';

import { polyfill } from 'smoothscroll-polyfill';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const homeSliderCss = require('./home-slider.scss');

polyfill();

/**
 * The number of milliseconds to wait in between auto-advancing the banner to
 * the next state.
 */
const AUTO_ADVANCE_INTERVAL_MS = 1500;

@customElement('home-slider')
export class HomeSlider extends LitElement {
  @query('.we-are')
  weAre: HTMLElement;

  @query('.who')
  who: HTMLElement;

  @internalProperty() weArePreviousDisabled = false;
  @internalProperty() weAreNextDisabled = false;
  @internalProperty() whoPreviousDisabled = false;
  @internalProperty() whoNextDisabled = false;

  /**
   * The timer ID returned from window.setInterval for the auto-advance timer.
   * This will be used in a clearInterval call to clear the interval whenever
   * we want to cancel the auto-advance logic.
   */
  private autoAdvanceTimer = 0;

  static get styles(): CSSResult {
    return unsafeCSS(homeSliderCss);
  }

  render(): TemplateResult {
    return html`
      <div class="static-item">We are</div>
      <div class="dynamic-item we-are">
        <div
          class="scroll-container"
          @touchstart=${this.cancelAutoAdvance}
          @wheel=${this.cancelAutoAdvance}
          @scroll=${this.recomputeButtonsEnabled}
        >
          <slot name="we-are"></slot>
        </div>
        <button
          class="scroll-button scroll-back"
          aria-label="Previous"
          title="Previous"
          ?disabled=${this.weArePreviousDisabled}
          aria-disabled=${this.weArePreviousDisabled ? 'true' : 'false'}
          @click=${this.onScrollButtonClick('back')}
        >
          &and;
        </button>
        <button
          class="scroll-button scroll-forward"
          aria-label="Next"
          title="Next"
          ?disabled=${this.weAreNextDisabled}
          aria-disabled=${this.weAreNextDisabled ? 'true' : 'false'}
          @click=${this.onScrollButtonClick('forward')}
        >
          &or;
        </button>
      </div>
      <div class="static-item">who</div>
      <div class="dynamic-item who">
        <div
          class="scroll-container"
          @touchstart=${this.cancelAutoAdvance}
          @wheel=${this.cancelAutoAdvance}
          @scroll=${this.recomputeButtonsEnabled}
        >
          <slot name="who"></slot>
        </div>
        <button
          class="scroll-button scroll-back"
          aria-label="Previous"
          title="Previous"
          ?disabled=${this.whoPreviousDisabled}
          aria-disabled=${this.whoPreviousDisabled ? 'true' : 'false'}
          @click=${this.onScrollButtonClick('back')}
        >
          &and;
        </button>
        <button
          class="scroll-button scroll-forward"
          aria-label="Next"
          title="Next"
          ?disabled=${this.whoNextDisabled}
          aria-disabled=${this.whoNextDisabled ? 'true' : 'false'}
          @click=${this.onScrollButtonClick('forward')}
        >
          &or;
        </button>
      </div>
    `;
  }

  async firstUpdated(): Promise<void> {
    // Make sure we're past the first render, otherwise Chrome won't calculate
    // the scroll deltas properly.
    await new Promise((r) => setTimeout(r, 0));
    this.resetLayout();
    window.addEventListener('resize', () => this.resetLayout());
  }

  /**
   * Returns an event handler for a click on the scroll button for a particular
   * direction.
   *
   * Note that this is not itself an event handler, it's a second-order function
   * that *returns* one.
   */
  onScrollButtonClick(direction: 'back' | 'forward'): (event: Event) => void {
    return (event: Event) => {
      this.cancelAutoAdvance();
      if (direction === 'back') {
        return this.previous((event.currentTarget as Element).parentElement);
      } else {
        return this.next((event.currentTarget as Element).parentElement);
      }
    };
  }

  /**
   * Cancels the auto-advance timer.  This should be called whenever the user
   * interacts with the element in some way.
   */
  @eventOptions({ passive: true })
  cancelAutoAdvance(): void {
    window.clearInterval(this.autoAdvanceTimer);
  }

  /**
   * Recomputes the enabled state of the next and previous buttons for the two
   * scroll containers.  This is called whenever the scroll position of one of
   * the containers changes, whether due to the buttons being pressed or due to
   * manual scroll interaction (mouse wheel or touch swipe).
   */
  @eventOptions({ passive: true })
  recomputeButtonsEnabled(): void {
    const weAreContainer = this.getScrollMetrics(this.weAre).container;
    const whoContainer = this.getScrollMetrics(this.who).container;
    switch (this.orientation) {
      case 'horizontal':
        this.weArePreviousDisabled =
          weAreContainer.scrollTop <=
          Number.parseFloat(getComputedStyle(weAreContainer).paddingTop);
        this.weAreNextDisabled =
          weAreContainer.scrollTop + weAreContainer.clientHeight >=
          weAreContainer.scrollHeight;

        this.whoPreviousDisabled =
          whoContainer.scrollTop <=
          Number.parseFloat(getComputedStyle(whoContainer).paddingTop);
        this.whoNextDisabled =
          whoContainer.scrollTop + whoContainer.clientHeight >=
          whoContainer.scrollHeight;
        break;
      case 'vertical':
        this.weArePreviousDisabled =
          weAreContainer.scrollLeft <=
          Number.parseFloat(getComputedStyle(weAreContainer).paddingLeft);
        this.weAreNextDisabled =
          weAreContainer.scrollLeft + weAreContainer.clientWidth >=
          weAreContainer.scrollWidth;

        this.whoPreviousDisabled =
          whoContainer.scrollLeft <=
          Number.parseFloat(getComputedStyle(whoContainer).paddingLeft);
        this.whoNextDisabled =
          whoContainer.scrollLeft + whoContainer.clientWidth >=
          whoContainer.scrollWidth;
        break;
    }
  }

  private get orientation(): 'horizontal' | 'vertical' {
    return this.who.querySelector('slot').scrollWidth <= this.who.offsetWidth
      ? 'horizontal'
      : 'vertical';
  }

  private resetLayout(): void {
    const weAreContainer = this.getScrollMetrics(this.weAre).container;
    const whoContainer = this.getScrollMetrics(this.who).container;
    weAreContainer.scrollTo({ left: 0, top: 0 });
    whoContainer.scrollTo({
      left: whoContainer.scrollWidth,
      top: whoContainer.scrollHeight,
    });
    if (this.autoAdvanceTimer) {
      window.clearInterval(this.autoAdvanceTimer);
    }
    this.autoAdvanceTimer = window.setInterval(() => {
      this.next(this.weAre, { loop: false });
      this.previous(this.who, { loop: false });
    }, AUTO_ADVANCE_INTERVAL_MS);
  }

  /**
   * Scrolls the scrolling region in `element` to show the next text element in
   * the sequence.
   *
   * @param element The element containing the scrolling region.  This should be
   *     either `this.weAre` or `this.who`.
   * @param options If specified and `loop` has a value of `true`, then a call
   *     to `next` when the scrolling region is already showing the last element
   *     will scroll it back up to the first one.
   */
  private next(element: HTMLElement, options?: { loop: boolean }) {
    const { container, lineHeightPx } = this.getScrollMetrics(element);
    switch (this.orientation) {
      case 'horizontal':
        if (
          container.scrollHeight - container.scrollTop >=
          lineHeightPx + container.clientHeight
        ) {
          container.scrollBy({ top: lineHeightPx, behavior: 'smooth' });
        } else if (options?.loop) {
          container.scrollTo({ top: 0, behavior: 'smooth' });
        }
        break;
      case 'vertical':
        if (
          container.scrollWidth - container.scrollLeft >=
          container.clientWidth
        ) {
          container.scrollBy({
            left: container.clientWidth,
            behavior: 'smooth',
          });
        } else if (options?.loop) {
          container.scrollTo({ left: 0, behavior: 'smooth' });
        }
        break;
    }
  }

  /**
   * Scrolls the scrolling region in `element` to show the previous text element
   * in the sequence.
   *
   * @param element The element containing the scrolling region.  This should be
   *     either `this.weAre` or `this.who`.
   * @param options If specified and `loop` has a value of `true`, then a call
   *     to `previous` when the scrolling region is already showing the first
   *     element will scroll it back down to the last one.
   */
  private previous(element: HTMLElement, options?: { loop: boolean }) {
    const { container, lineHeightPx } = this.getScrollMetrics(element);
    switch (this.orientation) {
      case 'horizontal':
        if (container.scrollTop > lineHeightPx) {
          container.scrollBy({ top: -lineHeightPx, behavior: 'smooth' });
        } else if (options?.loop) {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth',
          });
        }
        break;
      case 'vertical':
        if (container.scrollWidth > container.clientWidth) {
          container.scrollBy({
            left: -container.clientWidth,
            behavior: 'smooth',
          });
        } else if (options?.loop) {
          container.scrollTo({
            left: container.scrollWidth,
            behavior: 'smooth',
          });
        }
        break;
    }
  }

  /**
   * Returns the scroll container and line height (in pixels) associated with
   * `element`, which should be a dynamic-element div.
   */
  private getScrollMetrics(
    element: HTMLElement
  ): { container: Element; lineHeightPx: number } {
    const container = element.querySelector('.scroll-container');
    // Bit of a hack here, this only works because the computed line height
    // happens to be in pixels.
    const lineHeightPx = Number.parseFloat(
      getComputedStyle(container).lineHeight
    );
    return { container, lineHeightPx };
  }
}
