import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail, Shield } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function EmailPreferences() {
  const { user } = useAuth();
  const [optOut, setOptOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("email_opt_out")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setOptOut(data.email_opt_out);
        setLoading(false);
      });
  }, [user]);

  const handleToggle = async (checked: boolean) => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ email_opt_out: checked })
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to update preference");
    } else {
      setOptOut(checked);
      toast.success(checked ? "You've been unsubscribed from emails" : "You've been re-subscribed to emails");
    }
    setSaving(false);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
          <Mail className="w-4 h-4" />
          Email preferences
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Email Preferences
          </DialogTitle>
          <DialogDescription>
            Manage your email communication preferences. Your rights under US CAN-SPAM, Canada CASL, and EU GDPR are respected.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="opt-out" className="text-sm font-medium">
                Unsubscribe from all emails
              </Label>
              <p className="text-xs text-muted-foreground">
                Opt out of marketing, product updates, and notification emails.
              </p>
            </div>
            <Switch
              id="opt-out"
              checked={optOut}
              onCheckedChange={handleToggle}
              disabled={loading || saving}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            This preference applies to all non-transactional emails. Essential account and security notifications will still be sent as required by law.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
