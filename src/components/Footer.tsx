import { Linkedin } from "lucide-react";
import { EmailPreferences } from "@/components/EmailPreferences";

export function Footer() {
  return (
    <footer className="dark-anchor py-12 mt-0">
      {/* Gradient top accent bar */}
      <div className="h-px w-full gradient-bar mb-8" />
      <div className="container mx-auto px-5 md:px-10">
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-[hsl(var(--vt-text-on-dark-secondary))]">
          <span>© 2026 ValueTempo. All rights reserved.</span>
          <span className="hidden sm:inline opacity-30">|</span>
          <a href="https://www.valuetempo.com/privacy" className="hover:text-[hsl(var(--vt-text-on-dark))] transition-colors">
            Privacy Policy
          </a>
          <span className="hidden sm:inline opacity-30">|</span>
          <a
            href="mailto:info@valuetempo.com"
            className="hover:text-[hsl(var(--vt-text-on-dark))] transition-colors"
          >
            Contact
          </a>
          <span className="hidden sm:inline opacity-30">|</span>
          <EmailPreferences />
          <span className="hidden sm:inline opacity-30">|</span>
          <a
            href="https://www.linkedin.com/in/perkinsmichelle/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[hsl(var(--vt-text-on-dark))] transition-colors inline-flex items-center gap-1"
          >
            <Linkedin className="w-4 h-4" />
            <span className="sr-only">LinkedIn</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
