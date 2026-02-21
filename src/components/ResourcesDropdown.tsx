import { useNavigate } from "react-router-dom";
import { ChevronDown, BookOpen, FileText, HelpCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";

interface ResourcesDropdownProps {
  onNavigate?: () => void;
  mobile?: boolean;
}

const items = [
  { label: "Case Studies", to: "/resources/case-studies", icon: FileText },
  { label: "Blog", to: "/resources/blog", icon: BookOpen },
  { label: "FAQ", to: "/faq", icon: HelpCircle },
];

export function ResourcesDropdown({ onNavigate, mobile = false }: ResourcesDropdownProps) {
  const navigate = useNavigate();

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors outline-none">
          Resources
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {items.map((item) => (
          <DropdownMenuItem
            key={item.to}
            onClick={() => { navigate(item.to); onNavigate?.(); }}
            className="flex items-center gap-2 cursor-pointer"
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
