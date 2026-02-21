import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, BookOpen, FileText, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResourcesDropdownProps {
  onNavigate?: () => void;
  mobile?: boolean;
}

export function ResourcesDropdown({ onNavigate, mobile = false }: ResourcesDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mobile) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [mobile]);

  const items = [
    { label: "Case Studies", to: "/resources/case-studies", icon: FileText },
    { label: "Blog", to: "/resources/blog", icon: BookOpen },
    { label: "FAQ", to: "/faq", icon: HelpCircle },
  ];

  if (mobile) {
    return (
      <div className="space-y-1">
        <div className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Resources
        </div>
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors",
          open && "text-foreground"
        )}
      >
        Resources
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 w-48 py-1 rounded-lg border border-border/50 bg-popover shadow-lg backdrop-blur-xl z-50">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => { setOpen(false); onNavigate?.(); }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
