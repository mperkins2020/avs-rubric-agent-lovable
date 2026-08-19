import { useEffect, useRef } from "react";

const BREVO_STYLES = `
@font-face { font-display: block; font-family: Roboto; src: url(https://assets.brevo.com/font/Roboto/Latin/normal/normal/7529907e9eaf8ebb5220c5f9850e3811.woff2) format("woff2"), url(https://assets.brevo.com/font/Roboto/Latin/normal/normal/25c678feafdc175a70922a116c9be3e7.woff) format("woff") }
@font-face { font-display: fallback; font-family: Roboto; font-weight: 600; src: url(https://assets.brevo.com/font/Roboto/Latin/medium/normal/6e9caeeafb1f3491be3e32744bc30440.woff2) format("woff2"), url(https://assets.brevo.com/font/Roboto/Latin/medium/normal/71501f0d8d5aa95960f6475d5487d4c2.woff) format("woff") }
@font-face { font-display: fallback; font-family: Roboto; font-weight: 700; src: url(https://assets.brevo.com/font/Roboto/Latin/bold/normal/3ef7cf158f310cf752d5ad08cd0e7e60.woff2) format("woff2"), url(https://assets.brevo.com/font/Roboto/Latin/bold/normal/ece3a1d82f18b60bcce0211725c476aa.woff) format("woff") }
:where(.sib-form-message-panel-aug) { display: none; }
#sib-container-aug input::placeholder { font-family: Helvetica, sans-serif; text-align: left; color: #c0ccda; }
#sib-container-aug a { text-decoration: underline; color: #2BB2FC; }
.sib-form-message-panel-aug--visible { display: block !important; padding: 14px; margin-bottom: 12px; border: 1px solid; }
#sib-form-aug .sib-form-block__button[disabled] { opacity: 0.6; cursor: wait; }
`;

/**
 * Brevo form endpoint for the August 2026 Benchmark Executive Brief.
 * Replace with the `action` URL from the approved Brevo embed
 * (https://<id>.sibforms.com/serve/...) — submissions are disabled until then.
 */
const FORM_ACTION = "https://a7f4b675.sibforms.com/serve/MUIFAHCl-ujZgwpKYQErTwdQWNxT2zJqAFRETfVIY0IT_2y1yycXXDKO-8oJ1cmCIynr9NRzDTpwhVDjIA2sur5pTJINPdPOyAxczlCdttNa6JOFAW3pYGe_MAuXB1Iwrb34rBmgDjRBfN61jz4WZhtvBp9ItLnZ6d8wIr8cEKj3-lwS45shXOLsFx8JuHb13QFD0T11yp2t3map9g==";

const FORM_HTML = `
<div class="sib-form" style="text-align: center; background-color: transparent;">
  <div id="sib-form-container-aug" class="sib-form-container">
    <div id="error-message-aug" class="sib-form-message-panel-aug" style="font-family:Helvetica, sans-serif; font-size:16px; text-align:left; color:#661d1d; background-color:#ffeded; border-color:#ff4949; border-radius:3px; max-width:540px;">
      <div class="sib-form-message-panel__text sib-form-message-panel__text--center">
        <span class="sib-form-message-panel__inner-text">Something went wrong and we couldn't process your request. Please try again.</span>
      </div>
    </div>
    <div id="success-message-aug" class="sib-form-message-panel-aug" style="font-family:Helvetica, sans-serif; font-size:16px; text-align:left; color:#085229; background-color:#e7faf0; border-color:#13ce66; border-radius:3px; max-width:540px;">
      <div class="sib-form-message-panel__text sib-form-message-panel__text--center">
        <span class="sib-form-message-panel__inner-text">Thanks! We've sent the August 2026 AI Search Visibility &amp; AEO Benchmark Executive Brief to your inbox — check spam/promotions if you don't see it within a few minutes.</span>
        <div id="download-link-aug" style="margin-top:12px;"></div>
      </div>
    </div>
    <div id="sib-container-aug" class="sib-container--large sib-container--vertical" style="max-width:540px; text-align:center; background-color:transparent; direction:ltr;">
      <form id="sib-form-aug" method="POST" action="${FORM_ACTION}" data-type="subscription" novalidate>
        <div style="padding: 8px 0;">
          <div class="sib-input sib-form-block">
            <div class="form__entry entry_block">
              <div class="form__label-row">
                <label class="entry__label" style="font-weight: 700; text-align: left; font-family:Helvetica, sans-serif; font-size:15px; color:#3c4858; display:block; margin-bottom:6px;" for="EMAIL_AUG">Enter your work email</label>
                <div class="entry__field">
                  <input class="input" type="email" id="EMAIL_AUG" name="EMAIL" autocomplete="email" value="" placeholder="you@yourcompany.com" required style="width:100%; padding:10px 12px; border:1px solid #C0CCD9; border-radius:8px; font-family:Helvetica, sans-serif; font-size:16px; box-sizing:border-box;" />
                </div>
              </div>
              <label class="entry__specification" style="font-family:Helvetica, sans-serif; font-size:12px; text-align:left; color:#8390A4; display:block; margin-top:4px;">Provide your work email address, e.g., abc@yourcompany.com</label>
            </div>
          </div>
        </div>
        <div style="padding: 8px 0;">
          <div class="sib-optin sib-form-block">
            <div class="form__entry entry_mcq">
              <div class="form__label-row">
                <div class="entry__choice" style="display:flex; align-items:flex-start; gap:8px; text-align:left;">
                  <input type="checkbox" value="1" id="OPT_IN_VALUETEMPO_AUG" name="OPT_IN_VALUETEMPO" required style="margin-top:4px;" />
                  <label for="OPT_IN_VALUETEMPO_AUG" style="font-family:Helvetica, sans-serif; font-size:14px; text-align:left; color:#3C4858; background-color:transparent; cursor:pointer;">I agree to receive the Benchmark Executive Brief and occasional updates from ValueTempo. I can unsubscribe anytime.</label>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div style="padding: 8px 0;">
          <div class="sib-form__declaration" style="direction:ltr">
            <div style="font-family:Helvetica, sans-serif; font-size:13px; text-align:left; color:#687484; background-color:transparent;">
              <p>We use Brevo as our marketing platform. By submitting this form and checking the box above, you agree that your personal data will be transferred to Brevo for processing in accordance with <a href="https://www.brevo.com/en/legal/privacypolicy/" rel="nofollow">Brevo's Privacy Policy.</a></p>
            </div>
          </div>
        </div>
        <div style="padding: 8px 0;">
          <div class="sib-form-block" style="text-align: left">
            <button id="sib-submit-btn-aug" class="sib-form-block__button sib-form-block__button-with-loader" style="font-family:Helvetica, sans-serif; font-size:16px; font-weight:700; text-align:center; color:#FFFFFF; background-color:#3E4857; border-width:0px; border-radius:22px; padding:12px 22px; cursor:pointer;" type="submit">
              <span class="sib-submit-label-aug">Download the brief</span>
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
  if (!document.querySelector('style[data-brevo="sib-inline-aug"]')) {
    const style = document.createElement("style");
    style.setAttribute("data-brevo", "sib-inline-aug");
    style.textContent = BREVO_STYLES;
    document.head.appendChild(style);
  }
}

interface Props {
  id?: string;
}

export function BrevoSignupFormAugust2026({ id }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    injectStyles();

    const root = containerRef.current;
    if (!root) return;

    const form = root.querySelector<HTMLFormElement>("#sib-form-aug");
    const successPanel = root.querySelector<HTMLDivElement>("#success-message-aug");
    const errorPanel = root.querySelector<HTMLDivElement>("#error-message-aug");
    const submitBtn = root.querySelector<HTMLButtonElement>("#sib-submit-btn-aug");
    const submitLabel = root.querySelector<HTMLElement>(".sib-submit-label-aug");
    if (!form || !successPanel || !errorPanel || !submitBtn || !submitLabel) return;

    const showPanel = (el: HTMLElement) => el.classList.add("sib-form-message-panel-aug--visible");
    const hidePanel = (el: HTMLElement) => el.classList.remove("sib-form-message-panel-aug--visible");

    const onSubmit = async (e: SubmitEvent) => {
      e.preventDefault();
      hidePanel(errorPanel);

      const emailInput = form.querySelector<HTMLInputElement>("#EMAIL_AUG");
      const optIn = form.querySelector<HTMLInputElement>("#OPT_IN_VALUETEMPO_AUG");
      const honeypot = form.querySelector<HTMLInputElement>('input[name="email_address_check"]');

      if (honeypot && honeypot.value.trim() !== "") {
        showPanel(successPanel);
        (root.querySelector<HTMLElement>("#sib-container-aug") ?? form).style.display = "none";
        return;
      }

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

      if (!FORM_ACTION) {
        showPanel(errorPanel);
        return;
      }

      submitBtn.disabled = true;
      const originalLabel = submitLabel.textContent;
      submitLabel.textContent = "Submitting…";

      try {
        const fd = new FormData(form);
        await fetch(FORM_ACTION, { method: "POST", mode: "no-cors", body: fd });
        showPanel(successPanel);
        (root.querySelector<HTMLElement>("#sib-container-aug") ?? form).style.display = "none";
        successPanel.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (err) {
        console.error("Brevo submission failed", err);
        showPanel(errorPanel);
        submitBtn.disabled = false;
        submitLabel.textContent = originalLabel;
      }
    };

    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  }, []);

  return <div id={id} ref={containerRef} dangerouslySetInnerHTML={{ __html: FORM_HTML }} />;
}
