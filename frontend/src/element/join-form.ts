import {
  customElement,
  LitElement,
  html,
  css,
  CSSResult,
  TemplateResult,
} from 'lit-element';
import { query } from 'lit/decorators.js';
import { classMap } from 'lit-html/directives/class-map.js';

const FORM_URL = 'https://cwa1400.unioni.se/signup';

@customElement('awu-join-form')
export class JoinForm extends LitElement {
  @query('iframe')
  iframe!: HTMLIFrameElement;

  private isOpen = false;

  constructor() {
    super();

    window.addEventListener(
      'message',
      () => {
        // Iframe emits a message when it the dialog closes
        this.isOpen = false;
        this.requestUpdate();
      },
      false
    );
  }

  static get styles(): CSSResult {
    return css`
      button {
        padding: 0;
        margin: 0;
        display: inline-block;
        background: none;
        border: none;
        outline: none;
      }

      iframe {
        display: none;
        width: 100vw;
        height: 100vh;
        position: fixed;
        top: 0;
        left: 0;
        z-index: 10000;
        border: none;
      }

      iframe.visible {
        display: block;
      }
    `;
  }

  render(): TemplateResult {
    return html` <button @click="${this.triggerOpen}"><slot>Join</slot></button
      ><br />
      <iframe
        class=${classMap({ visible: this.isOpen })}
        src="${FORM_URL}"
        scrolling="no"
        frameborder="0"
        allowtransparency="true"
      ></iframe>`;
  }

  triggerOpen(): void {
    this.isOpen = true;
    this.iframe.contentWindow.postMessage({ unioni_overlay: true }, '*');
    this.requestUpdate();
  }
}
