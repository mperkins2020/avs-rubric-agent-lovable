import { Link } from "react-router-dom";
import { Linkedin } from "lucide-react";
import { EmailPreferences } from "@/components/EmailPreferences";

export function Footer() {
  return (
    <footer className="border-t border-border/50 py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
          <span>© 2026 ValueTempo. All rights reserved.</span>
          <span className="hidden sm:inline text-border">|</span>
          <Link to="/privacy" className="hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <span className="hidden sm:inline text-border">|</span>
          <a
            href="mailto:info@valuetempo.com"
            className="hover:text-foreground transition-colors"
          >
            Contact
          </a>
          <span className="hidden sm:inline text-border">|</span>
          <EmailPreferences />
          <span className="hidden sm:inline text-border">|</span>
          <a
            href="https://www.linkedin.com/in/perkinsmichelle/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            <Linkedin className="w-4 h-4" />
            <span className="sr-only">LinkedIn</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
