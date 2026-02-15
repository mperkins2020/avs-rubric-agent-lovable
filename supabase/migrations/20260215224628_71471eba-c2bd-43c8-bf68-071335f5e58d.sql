-- Add email opt-out preference for privacy compliance (US CAN-SPAM, Canada CASL, EU GDPR)
ALTER TABLE public.profiles ADD COLUMN email_opt_out BOOLEAN NOT NULL DEFAULT false;