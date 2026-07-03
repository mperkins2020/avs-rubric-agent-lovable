import { useEffect, useRef } from "react";

const BREVO_STYLES = `
@font-face { font-display: block; font-family: Roboto; src: url(https://assets.brevo.com/font/Roboto/Latin/normal/normal/7529907e9eaf8ebb5220c5f9850e3811.woff2) format("woff2"), url(https://assets.brevo.com/font/Roboto/Latin/normal/normal/25c678feafdc175a70922a116c9be3e7.woff) format("woff") }
@font-face { font-display: fallback; font-family: Roboto; font-weight: 600; src: url(https://assets.brevo.com/font/Roboto/Latin/medium/normal/6e9caeeafb1f3491be3e32744bc30440.woff2) format("woff2"), url(https://assets.brevo.com/font/Roboto/Latin/medium/normal/71501f0d8d5aa95960f6475d5487d4c2.woff) format("woff") }
@font-face { font-display: fallback; font-family: Roboto; font-weight: 700; src: url(https://assets.brevo.com/font/Roboto/Latin/bold/normal/3ef7cf158f310cf752d5ad08cd0e7e60.woff2) format("woff2"), url(https://assets.brevo.com/font/Roboto/Latin/bold/normal/ece3a1d82f18b60bcce0211725c476aa.woff) format("woff") }
:where(.sib-form-message-panel-june) { display: none; }
:where(.sib-form-message-panel-june .sib-notification__icon) { width: 20px; height: 20px; }
#sib-container-june input::placeholder { font-family: Helvetica, sans-serif; text-align: left; color: #c0ccda; }
#sib-container-june a { text-decoration: underline; color: #2BB2FC; }
.sib-form-message-panel-june--visible { display: block !important; padding: 14px; margin-bottom: 12px; border: 1px solid; }
#sib-form-june .sib-form-block__button[disabled] { opacity: 0.6; cursor: wait; }
`;

const FORM_ACTION =
  "https://a7f4b675.sibforms.com/serve/MUIFAJ60-J-VQGTe2i_jPP3sd1pkm2EQd_m0PQFxUEBLu0liCPhvGRN3fQC4B4Ww71bNtDTaejtaZx10s3TaTcnC7rQZOejiiNLUKdeao2hggod1M3FAi_StnrV0Sw2o-p-xtesS_QjmgvL5joqEXM8AWn39TiG7HkPYEk2FppJw5riAcBuZLNWXQDjaQlPy3fnn1Bd25lm_0ifSBQ==";

const FORM_HTML = `
<div class="sib-form" style="text-align: center; background-color: #EFF2F7;">
  <div id="sib-form-container-june" class="sib-form-container">
    <div id="error-message-june" class="sib-form-message-panel-june" style="font-family:Helvetica, sans-serif; font-size:16px; text-align:left; color:#661d1d; background-color:#ffeded; border-color:#ff4949; border-radius:3px; max-width:540px;">
      <div class="sib-form-message-panel__text sib-form-message-panel__text--center">
        <span class="sib-form-message-panel__inner-text">Something went wrong and we couldn't process your request. Please try again.</span>
      </div>
    </div>
    <div></div>
    <div id="success-message-june" class="sib-form-message-panel-june" style="font-family:Helvetica, sans-serif; font-size:16px; text-align:left; color:#085229; background-color:#e7faf0; border-color:#13ce66; border-radius:3px; max-width:540px;">
      <div class="sib-form-message-panel__text sib-form-message-panel__text--center">
        <span class="sib-form-message-panel__inner-text">Thanks! We've sent the AI Speech Platform Buyability Benchmark (June 2026 Edition) to your inbox — check spam/promotions if you don't see it within a few minutes.</span>
      </div>
    </div>
    <div></div>
    <div id="sib-container-june" class="sib-container--large sib-container--vertical" style="max-width:540px; text-align:center; background-color:rgba(255,255,255,1); border-width:1px; border-style:solid; border-color:#C0CCD9; border-radius:3px; direction:ltr; padding: 16px;">
      <form id="sib-form-june" method="POST" action="${FORM_ACTION}" data-type="subscription" novalidate>
        <div style="padding: 8px 0;">
          <div class="sib-form-block" style="font-family:Helvetica, sans-serif; font-size:32px; font-weight:700; text-align:left; color:#3C4858; background-color:transparent;">
            <p>Download the full report</p>
          </div>
        </div>
        <div style="padding: 8px 0;">
          <div class="sib-form-block" style="font-family:Helvetica, sans-serif; font-size:16px; text-align:left; color:#3C4858; background-color:transparent;">
            <div class="sib-text-form-block"><p>Get the June 2026 AI Speech Platform Buyability Benchmark, including the market overview, six findings, operator takeaways, and methodology notes.</p></div>
          </div>
        </div>
        <div style="padding: 8px 0;">
          <div class="sib-input sib-form-block">
            <div class="form__entry entry_block">
              <div class="form__label-row">
                <label class="entry__label" style="font-weight: 700; text-align: left; font-family:Helvetica, sans-serif; font-size:16px; color:#3c4858; display:block; margin-bottom:6px;" for="EMAIL_JUNE">Enter your work email</label>
                <div class="entry__field">
                  <input class="input" type="email" id="EMAIL_JUNE" name="EMAIL" autocomplete="email" value="" placeholder="you@yourcompany.com" required style="width:100%; padding:10px 12px; border:1px solid #C0CCD9; border-radius:3px; font-family:Helvetica, sans-serif; font-size:16px; box-sizing:border-box;" />
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
                  <input type="checkbox" value="1" id="OPT_IN_VALUETEMPO_JUNE" name="OPT_IN_VALUETEMPO" required style="margin-top:4px;" />
                  <label for="OPT_IN_VALUETEMPO_JUNE" style="font-family:Helvetica, sans-serif; font-size:14px; text-align:left; color:#3C4858; background-color:transparent; cursor:pointer;">I agree to receive the AI Speech Platform Buyability Benchmark and occasional updates from ValueTempo. I can unsubscribe anytime.</label>
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
            <button id="sib-submit-btn-june" class="sib-form-block__button sib-form-block__button-with-loader" style="font-family:Helvetica, sans-serif; font-size:16px; font-weight:700; text-align:center; color:#FFFFFF; background-color:#3E4857; border-width:0px; border-radius:3px; padding:12px 20px; cursor:pointer;" type="submit">
              <span class="sib-submit-label-june">Download the report</span>
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
  if (!document.querySelector('style[data-brevo="sib-inline-june"]')) {
    const style = document.createElement("style");
    style.setAttribute("data-brevo", "sib-inline-june");
    style.textContent = BREVO_STYLES;
    document.head.appendChild(style);
  }
}

interface Props {
  id?: string;
}

export function BrevoSignupFormJune2026({ id }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    injectStyles();

    const root = containerRef.current;
    if (!root) return;

    const form = root.querySelector<HTMLFormElement>("#sib-form-june");
    const successPanel = root.querySelector<HTMLDivElement>("#success-message-june");
    const errorPanel = root.querySelector<HTMLDivElement>("#error-message-june");
    const submitBtn = root.querySelector<HTMLButtonElement>("#sib-submit-btn-june");
    const submitLabel = root.querySelector<HTMLElement>(".sib-submit-label-june");
    if (!form || !successPanel || !errorPanel || !submitBtn || !submitLabel) return;

    const showPanel = (el: HTMLElement) => el.classList.add("sib-form-message-panel-june--visible");
    const hidePanel = (el: HTMLElement) => el.classList.remove("sib-form-message-panel-june--visible");

    const onSubmit = async (e: SubmitEvent) => {
      e.preventDefault();
      hidePanel(errorPanel);

      const emailInput = form.querySelector<HTMLInputElement>("#EMAIL_JUNE");
      const optIn = form.querySelector<HTMLInputElement>("#OPT_IN_VALUETEMPO_JUNE");
      const honeypot = form.querySelector<HTMLInputElement>('input[name="email_address_check"]');

      if (honeypot && honeypot.value.trim() !== "") {
        showPanel(successPanel);
        (root.querySelector<HTMLElement>("#sib-container-june") ?? form).style.display = "none";
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

      submitBtn.disabled = true;
      const originalLabel = submitLabel.textContent;
      submitLabel.textContent = "Submitting…";

      try {
        const fd = new FormData(form);
        await fetch(FORM_ACTION, { method: "POST", mode: "no-cors", body: fd });
        showPanel(successPanel);
        (root.querySelector<HTMLElement>("#sib-container-june") ?? form).style.display = "none";
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

  return (
    <div id={id} ref={containerRef} dangerouslySetInnerHTML={{ __html: FORM_HTML }} />
  );
}
