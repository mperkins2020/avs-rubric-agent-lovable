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
#sib-container label.entry__label[for="OPT_IN_VALUETEMPO"] { display: none !important; }
.sib-form-message-panel--visible { display: block !important; padding: 14px; margin-bottom: 12px; border: 1px solid; }
.sib-form-block__button[disabled] { opacity: 0.6; cursor: wait; }
`;

const FORM_ACTION =
  "https://a7f4b675.sibforms.com/serve/MUIFANpR9ceU12108ezKT4osNIvDHClYAAe-S41zVxvldPfbk-SQvu-p5llEeZoMGXueILbWxa5knNTc25uC3mbW-9Ec5eNPaXlThP2P4KP1oQe4T5N9tkI7YVAVZQbv71aBF-h4fEcRzqPvtxR9RUXggANXWltv1TfznPBRxkA4fAwIeNuaRHIqq_ZKvcDIExqa_eaiqwSV1faG2g==";

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
        <span class="sib-form-message-panel__inner-text">Thanks! We've sent the AI SaaS Buyability Benchmark to your inbox — check spam/promotions if you don't see it within a few minutes.</span>
      </div>
    </div>
    <div></div>
    <div id="sib-container" class="sib-container--large sib-container--vertical" style="max-width:540px; text-align:center; background-color:rgba(255,255,255,1); border-width:1px; border-style:solid; border-color:#C0CCD9; border-radius:3px; direction:ltr; padding: 16px;">
      <form id="sib-form" method="POST" action="${FORM_ACTION}" data-type="subscription" novalidate>
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
                <label class="entry__label" style="font-weight: 700; text-align: left; font-family:Helvetica, sans-serif; font-size:16px; color:#3c4858; display:block; margin-bottom:6px;" for="EMAIL">Enter your WORK EMAIL</label>
                <div class="entry__field">
                  <input class="input " type="email" id="EMAIL" name="EMAIL" autocomplete="email" value="" placeholder="you@yourcompany.com" required style="width:100%; padding:10px 12px; border:1px solid #C0CCD9; border-radius:3px; font-family:Helvetica, sans-serif; font-size:16px; box-sizing:border-box;" />
                </div>
              </div>
              <label class="entry__specification" style="font-family:Helvetica, sans-serif; font-size:12px; text-align:left; color:#8390A4; display:block; margin-top:4px;">Provide your work email address, e.g., abc@yourcompany.com</label>
            </div>
          </div>
        </div>
        <div style="padding: 8px 0;">
          <div class="sib-optin sib-form-block">
            <div class="form__entry entry_mcq">
              <div class="form__label-row ">
                <div class="entry__choice" style="display:flex; align-items:flex-start; gap:8px; text-align:left;">
                  <input type="checkbox" value="1" id="OPT_IN_VALUETEMPO" name="OPT_IN_VALUETEMPO" required style="margin-top:4px;" />
                  <label for="OPT_IN_VALUETEMPO" style="font-family:Helvetica, sans-serif; font-size:14px; text-align:left; color:#3C4858; background-color:transparent; cursor:pointer;">I agree to receive the AI SaaS Buyability Benchmark and occasional updates from ValueTempo. I can unsubscribe anytime.</label>
                </div>
              </div>
              <label class="entry__specification" style="font-family:Helvetica, sans-serif; font-size:12px; text-align:left; color:#8390A4; display:block; margin-top:4px;">We'll only use this to send the report and occasional updates — no spam.</label>
            </div>
          </div>
        </div>
        <div style="padding: 8px 0;">
          <div class="sib-form__declaration" style="direction:ltr">
            <div style="font-family:Helvetica, sans-serif; font-size:14px; text-align:left; color:#687484; background-color:transparent;">
              <p>We use Brevo as our marketing platform. By submitting this form and checking the box above, you agree that your personal data will be transferred to Brevo for processing in accordance with <a href="https://www.brevo.com/en/legal/privacypolicy/" rel="nofollow">Brevo's Privacy Policy.</a></p>
            </div>
          </div>
        </div>
        <div style="padding: 8px 0;">
          <div class="sib-form-block" style="text-align: left">
            <button id="sib-submit-btn" class="sib-form-block__button sib-form-block__button-with-loader" style="font-family:Helvetica, sans-serif; font-size:16px; font-weight:700; text-align:center; color:#FFFFFF; background-color:#3E4857; border-width:0px; border-radius:3px; padding:12px 20px; cursor:pointer;" type="submit">
              <span class="sib-submit-label">Download the report</span>
            </button>
          </div>
        </div>
        <input type="text" name="email_address_check" value="" class="input--hidden" style="display:none;" tabindex="-1" autocomplete="off" />
        <input type="hidden" name="locale" value="en" />
      </form>
    </div>
  </div>
</div>
`;

function injectStyles() {
  if (!document.querySelector('style[data-brevo="sib-inline"]')) {
    const style = document.createElement("style");
    style.setAttribute("data-brevo", "sib-inline");
    style.textContent = BREVO_STYLES;
    document.head.appendChild(style);
  }
}

interface Props {
  id?: string;
}

export function BrevoSignupForm({ id }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    injectStyles();

    const root = containerRef.current;
    if (!root) return;

    const form = root.querySelector<HTMLFormElement>("#sib-form");
    const successPanel = root.querySelector<HTMLDivElement>("#success-message");
    const errorPanel = root.querySelector<HTMLDivElement>("#error-message");
    const submitBtn = root.querySelector<HTMLButtonElement>("#sib-submit-btn");
    const submitLabel = root.querySelector<HTMLElement>(".sib-submit-label");
    if (!form || !successPanel || !errorPanel || !submitBtn || !submitLabel) return;

    const showPanel = (el: HTMLElement) => {
      el.classList.add("sib-form-message-panel--visible");
    };
    const hidePanel = (el: HTMLElement) => {
      el.classList.remove("sib-form-message-panel--visible");
    };

    const onSubmit = async (e: SubmitEvent) => {
      e.preventDefault();
      hidePanel(errorPanel);

      const emailInput = form.querySelector<HTMLInputElement>("#EMAIL");
      const optIn = form.querySelector<HTMLInputElement>("#OPT_IN_VALUETEMPO");
      const honeypot = form.querySelector<HTMLInputElement>(
        'input[name="email_address_check"]'
      );

      // Honeypot: silently drop if filled
      if (honeypot && honeypot.value.trim() !== "") {
        showPanel(successPanel);
        (root.querySelector<HTMLElement>("#sib-container") ?? form).style.display = "none";
        return;
      }

      // Native HTML5 validation (required + type=email)
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const email = emailInput?.value.trim() ?? "";
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        emailInput?.focus();
        return;
      }
      if (optIn && !optIn.checked) {
        optIn.focus();
        return;
      }

      submitBtn.disabled = true;
      const originalLabel = submitLabel.textContent;
      submitLabel.textContent = "Submitting…";

      try {
        const fd = new FormData(form);
        // Brevo's serve endpoint does not return permissive CORS headers,
        // so we POST in no-cors mode (fire-and-forget). The submission is
        // still delivered; we just can't read the response body/status.
        await fetch(FORM_ACTION, {
          method: "POST",
          mode: "no-cors",
          body: fd,
        });
        showPanel(successPanel);
        (root.querySelector<HTMLElement>("#sib-container") ?? form).style.display = "none";
        // Scroll the success panel into view
        successPanel.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (err) {
        console.error("Brevo submission failed", err);
        showPanel(errorPanel);
        submitBtn.disabled = false;
        submitLabel.textContent = originalLabel;
      }
    };

    form.addEventListener("submit", onSubmit);
    return () => {
      form.removeEventListener("submit", onSubmit);
    };
  }, []);

  return (
    <div
      id={id}
      ref={containerRef}
      dangerouslySetInnerHTML={{ __html: FORM_HTML }}
    />
  );
}
