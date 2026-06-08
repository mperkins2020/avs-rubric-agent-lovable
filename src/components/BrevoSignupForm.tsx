import { useEffect, useRef } from "react";

const BREVO_STYLES = `
@font-face { font-display: block; font-family: Roboto; src: url(https://assets.brevo.com/font/Roboto/Latin/normal/normal/7529907e9eaf8ebb5220c5f9850e3811.woff2) format("woff2"), url(https://assets.brevo.com/font/Roboto/Latin/normal/normal/25c678feafdc175a70922a116c9be3e7.woff) format("woff") }
@font-face { font-display: fallback; font-family: Roboto; font-weight: 600; src: url(https://assets.brevo.com/font/Roboto/Latin/medium/normal/6e9caeeafb1f3491be3e32744bc30440.woff2) format("woff2"), url(https://assets.brevo.com/font/Roboto/Latin/medium/normal/71501f0d8d5aa95960f6475d5487d4c2.woff) format("woff") }
@font-face { font-display: fallback; font-family: Roboto; font-weight: 700; src: url(https://assets.brevo.com/font/Roboto/Latin/bold/normal/3ef7cf158f310cf752d5ad08cd0e7e60.woff2) format("woff2"), url(https://assets.brevo.com/font/Roboto/Latin/bold/normal/ece3a1d82f18b60bcce0211725c476aa.woff) format("woff") }
:where(.sib-form-message-panel) { display: none; }
:where(.sib-form-message-panel .sib-notification__icon) { width: 20px; height: 20px; }
#sib-container input:-ms-input-placeholder { font-family: Helvetica, sans-serif; text-align: left; color: #c0ccda; }
#sib-container input::placeholder { font-family: Helvetica, sans-serif; text-align: left; color: #c0ccda; }
#sib-container textarea::placeholder { font-family: Helvetica, sans-serif; text-align: left; color: #c0ccda; }
#sib-container a { text-decoration: underline; color: #2BB2FC; }
`;

const FORM_HTML = `
<div class="sib-form" style="text-align: center; background-color: #EFF2F7;">
  <div id="sib-form-container" class="sib-form-container">
    <div id="error-message" class="sib-form-message-panel" style="font-family:Helvetica, sans-serif; font-size:16px; text-align:left; color:#661d1d; background-color:#ffeded; border-color:#ff4949; border-radius:3px; max-width:540px;">
      <div class="sib-form-message-panel__text sib-form-message-panel__text--center">
        <svg viewBox="0 0 512 512" class="sib-icon sib-notification__icon"><path d="M256 40c118.621 0 216 96.075 216 216 0 119.291-96.61 216-216 216-119.244 0-216-96.562-216-216 0-119.203 96.602-216 216-216m0-32C119.043 8 8 119.083 8 256c0 136.997 111.043 248 248 248s248-111.003 248-248C504 119.083 392.957 8 256 8zm-11.49 120h22.979c6.823 0 12.274 5.682 11.99 12.5l-7 168c-.268 6.428-5.556 11.5-11.99 11.5h-8.979c-6.433 0-11.722-5.073-11.99-11.5l-7-168c-.283-6.818 5.167-12.5 11.99-12.5zM256 340c-15.464 0-28 12.536-28 28s12.536 28 28 28 28-12.536 28-28-12.536-28-28-28z" /></svg>
        <span class="sib-form-message-panel__inner-text">Something went wrong and we couldn't process your request. Please try again.</span>
      </div>
    </div>
    <div></div>
    <div id="success-message" class="sib-form-message-panel" style="font-family:Helvetica, sans-serif; font-size:16px; text-align:left; color:#085229; background-color:#e7faf0; border-color:#13ce66; border-radius:3px; max-width:540px;">
      <div class="sib-form-message-panel__text sib-form-message-panel__text--center">
        <svg viewBox="0 0 512 512" class="sib-icon sib-notification__icon"><path d="M256 8C119.033 8 8 119.033 8 256s111.033 248 248 248 248-111.033 248-248S392.967 8 256 8zm0 464c-118.664 0-216-96.055-216-216 0-118.663 96.055-216 216-216 118.664 0 216 96.055 216 216 0 118.663-96.055 216-216 216zm141.63-274.961L217.15 376.071c-4.705 4.667-12.303 4.637-16.97-.068l-85.878-86.572c-4.667-4.705-4.637-12.303.068-16.97l8.52-8.451c4.705-4.667 12.303-4.637 16.97.068l68.976 69.533 163.441-162.13c4.705-4.667 12.303-4.637 16.97.068l8.451 8.52c4.668 4.705 4.637 12.303-.068 16.97z" /></svg>
        <span class="sib-form-message-panel__inner-text">Thanks — your download is on its way.</span>
      </div>
    </div>
    <div></div>
    <div id="sib-container" class="sib-container--large sib-container--vertical" style="max-width:540px; text-align:center; background-color:rgba(255,255,255,1); border-width:1px; border-style:solid; border-color:#C0CCD9; border-radius:3px; direction:ltr">
      <form id="sib-form" method="POST" action="https://a7f4b675.sibforms.com/serve/MUIFANpR9ceU12108ezKT4osNIvDHClYAAe-S41zVxvldPfbk-SQvu-p5llEeZoMGXueILbWxa5knNTc25uC3mbW-9Ec5eNPaXlThP2P4KP1oQe4T5N9tkI7YVAVZQbv71aBF-h4fEcRzqPvtxR9RUXggANXWltv1TfznPBRxkA4fAwIeNuaRHIqq_ZKvcDIExqa_eaiqwSV1faG2g==" data-type="subscription">
        <div style="padding: 8px 0;">
          <div class="sib-form-block" style="font-family:Helvetica, sans-serif; font-size:32px; font-weight:700; text-align:left; color:#3C4858; background-color:transparent;">
            <p>Download the full report</p>
          </div>
        </div>
        <div style="padding: 8px 0;">
          <div class="sib-form-block" style="font-family:Helvetica, sans-serif; font-size:16px; text-align:left; color:#3C4858; background-color:transparent;">
            <div class="sib-text-form-block"><p>Get the May 2026 AI SaaS Buyability Benchmark, including the market overview, six findings, operator takeaways, and methodology notes.</p></div>
          </div>
        </div>
        <div style="padding: 8px 0;">
          <div class="sib-input sib-form-block">
            <div class="form__entry entry_block">
              <div class="form__label-row ">
                <label class="entry__label" style="font-weight: 700; text-align: left; font-family:Helvetica, sans-serif; font-size:16px; color:#3c4858;" for="EMAIL" data-required="*">Enter your work email</label>
                <div class="entry__field">
                  <input class="input " type="text" id="EMAIL" name="EMAIL" autocomplete="off" value="" placeholder="EMAIL" data-required="true" required />
                </div>
              </div>
              <label class="entry__error entry__error--primary" style="font-family:Helvetica, sans-serif; font-size:16px; text-align:left; color:#661d1d; background-color:#ffeded; border-color:#ff4949; border-radius:3px;"></label>
              <label class="entry__specification" style="font-family:Helvetica, sans-serif; font-size:12px; text-align:left; color:#8390A4;">Provide your work email address to receive the report. For e.g abc@xyz.com</label>
            </div>
          </div>
        </div>
        <div style="padding: 8px 0;">
          <div class="sib-captcha sib-form-block">
            <div class="form__entry entry_block">
              <div class="form__label-row ">
                <div class="g-recaptcha sib-visible-recaptcha" id="sib-captcha" data-sitekey="6LcgtxItAAAAAJa3VBZEVKeUwOT5je_yKdXbq0yE" data-callback="handleCaptchaResponse" style="direction:ltr"></div>
              </div>
              <label class="entry__error entry__error--primary" style="font-family:Helvetica, sans-serif; font-size:16px; text-align:left; color:#661d1d; background-color:#ffeded; border-color:#ff4949; border-radius:3px;"></label>
              <label class="entry__specification" style="font-family:Helvetica, sans-serif; font-size:12px; text-align:left; color:#8390A4;">Form secured by reCAPTCHA</label>
            </div>
          </div>
        </div>
        <div style="padding: 8px 0;">
          <div class="sib-form__declaration" style="direction:ltr">
            <div style="font-family:Helvetica, sans-serif; font-size:14px; text-align:left; color:#687484; background-color:transparent;">
              <p>We use Brevo as our marketing platform. By submitting this form you agree that the personal data you provided will be transferred to Brevo for processing in accordance with <a href="https://www.brevo.com/en/legal/privacypolicy/" rel="nofollow">Brevo's Privacy Policy.</a></p>
            </div>
          </div>
        </div>
        <div style="padding: 8px 0;">
          <div class="sib-form-block" style="text-align: left">
            <button id="sib-submit-btn" class="sib-form-block__button sib-form-block__button-with-loader" style="font-family:Helvetica, sans-serif; font-size:16px; font-weight:700; text-align:left; color:#FFFFFF; background-color:#3E4857; border-width:0px; border-radius:3px; cursor:not-allowed; opacity:0.6;" form="sib-form" type="submit" disabled>
              <svg class="icon clickable__icon progress-indicator__icon sib-hide-loader-icon" viewBox="0 0 512 512"><path d="M460.116 373.846l-20.823-12.022c-5.541-3.199-7.54-10.159-4.663-15.874 30.137-59.886 28.343-131.652-5.386-189.946-33.641-58.394-94.896-95.833-161.827-99.676C261.028 55.961 256 50.751 256 44.352V20.309c0-6.904 5.808-12.337 12.703-11.982 83.556 4.306 160.163 50.864 202.11 123.677 42.063 72.696 44.079 162.316 6.031 236.832-3.14 6.148-10.75 8.461-16.728 5.01z" /></svg>
              <span id="sib-submit-label">Loading…</span>
            </button>
          </div>
        </div>
        <input type="text" name="email_address_check" value="" class="input--hidden">
        <input type="hidden" name="locale" value="en">
        <input type="hidden" name="redirection_url" value="https://app.valuetempo.com/ai-saas-buyability-benchmark-may-2026/thank-you">
      </form>
    </div>
  </div>
</div>
`;

let brevoInitialized = false;

function ensureBrevoLoaded() {
  if (brevoInitialized) return;
  brevoInitialized = true;

  // Global config expected by Brevo's main.js
  const w = window as any;
  w.REQUIRED_CODE_ERROR_MESSAGE = "Please choose a country code";
  w.LOCALE = "en";
  w.EMAIL_INVALID_MESSAGE = w.SMS_INVALID_MESSAGE =
    "That email address doesn't look right. Please check the format and try again.";
  w.REQUIRED_ERROR_MESSAGE = "Please enter your work email to continue. ";
  w.GENERIC_INVALID_MESSAGE =
    "That email address doesn't look right. Please check the format and try again.";
  w.INVALID_NUMBER =
    "That email address doesn't look right. Please check the format and try again.";
  w.INVALID_DATE = "Please enter a valid date";
  w.REQUIRED_MULTISELECT_MESSAGE = "Please select at least 1 option";
  w.translation = {
    common: {
      selectedList: "{quantity} list selected",
      selectedLists: "{quantity} lists selected",
      selectedOption: "{quantity} selected",
      selectedOptions: "{quantity} selected",
    },
  };
  w.AUTOHIDE = false;
  w.handleCaptchaResponse = function () {
    const event = new Event("captchaChange");
    const el = document.getElementById("sib-captcha");
    if (el) el.dispatchEvent(event);
  };

  // Brevo's shared stylesheet
  if (!document.querySelector('link[data-brevo="sib-styles"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://sibforms.com/forms/end-form/build/sib-styles.css";
    link.setAttribute("data-brevo", "sib-styles");
    document.head.appendChild(link);
  }

  // Per-form inline styles (fonts + placeholders)
  if (!document.querySelector('style[data-brevo="sib-inline"]')) {
    const style = document.createElement("style");
    style.setAttribute("data-brevo", "sib-inline");
    style.textContent = BREVO_STYLES;
    document.head.appendChild(style);
  }

  // Brevo form handler script
  if (!document.querySelector('script[data-brevo="sib-main"]')) {
    const s = document.createElement("script");
    s.src = "https://sibforms.com/forms/end-form/build/main.js";
    s.defer = true;
    s.setAttribute("data-brevo", "sib-main");
    document.body.appendChild(s);
  }

  // Google reCAPTCHA
  if (!document.querySelector('script[data-brevo="recaptcha"]')) {
    const s = document.createElement("script");
    s.src = "https://www.google.com/recaptcha/api.js?hl=en";
    s.async = true;
    s.defer = true;
    s.setAttribute("data-brevo", "recaptcha");
    document.body.appendChild(s);
  }
}

interface Props {
  id?: string;
}

export function BrevoSignupForm({ id }: Props) {
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensureBrevoLoaded();

    const enableButton = () => {
      const buttons = formRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [];
      buttons.forEach((btn) => {
        btn.disabled = false;
        btn.removeAttribute("disabled");
        btn.style.cursor = "pointer";
        btn.style.opacity = "1";
        btn.textContent = "Download the report";
      });
    };

    const timer = window.setTimeout(() => {
      enableButton();
    }, 2000);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);


  return <div ref={formRef} id={id} dangerouslySetInnerHTML={{ __html: FORM_HTML }} />;
}
