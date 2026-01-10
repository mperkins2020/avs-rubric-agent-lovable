import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { 
  Building2, 
  Users, 
  CreditCard, 
  Layers, 
  Workflow,
  Shield 
} from "lucide-react";
import type { CompanyProfile } from "@/types/rubric";

interface CompanyProfileCardProps {
  profile: CompanyProfile;
}

export function CompanyProfileCard({ profile }: CompanyProfileCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <GlassCard className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Company Profile</h3>
          <span className="text-xs text-muted-foreground ml-auto">
            AI-generated from public data
          </span>
        </div>

        <p className="text-muted-foreground mb-4">{profile.oneLineDescription}</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Primary Users */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Primary Users</span>
            </div>
            <p className="text-sm">{profile.primaryUsers}</p>
          </div>

          {/* Pricing Model */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <CreditCard className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Pricing Model</span>
            </div>
            <p className="text-sm capitalize">{profile.pricingModelGuess}</p>
          </div>

          {/* Value Unit */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Layers className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Value Unit</span>
            </div>
            <p className="text-sm capitalize">{profile.valueUnitGuess}</p>
          </div>

          {/* Key Workflows */}
          <div className="space-y-1 sm:col-span-2">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Workflow className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Key Workflows</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.keyWorkflows.map((workflow, i) => (
                <span
                  key={i}
                  className="px-2 py-1 text-xs bg-secondary/50 rounded-md"
                >
                  {workflow}
                </span>
              ))}
            </div>
          </div>

          {/* Trust Controls */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Trust Controls</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {profile.trustControlsSeen.length > 0 ? (
                profile.trustControlsSeen.map((control, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 text-xs bg-score-high/10 text-score-high rounded"
                  >
                    {control}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted-foreground italic">
                  None observed
                </span>
              )}
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
