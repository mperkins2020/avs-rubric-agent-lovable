import ValueTempoLogo from "@/assets/ValueTempo_Logo.png";

interface LogoProps {
  /** Additional Tailwind classes (e.g. "mx-auto mb-4" for centered contexts). */
  className?: string;
}

/**
 * Shared logo component. Change the size here and it updates everywhere.
 * Default height: h-10 (40px) — matches nav bar sizing.
 */
export function Logo({ className = "" }: LogoProps) {
  return (
    <img
      alt="ValueTempo"
      className={`h-10 ${className}`.trim()}
      src={ValueTempoLogo}
    />
  );
}
