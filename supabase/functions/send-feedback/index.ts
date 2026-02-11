import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { company_name, rating, feedback, email } = await req.json();

    if (!company_name || !rating || rating < 1 || rating > 5) {
      return new Response(
        JSON.stringify({ error: "company_name and rating (1-5) are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store in database
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: dbError } = await supabase.from("report_feedback").insert({
      company_name,
      rating,
      feedback: feedback || null,
      email: email || null,
    });

    if (dbError) {
      console.error("DB insert error:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to store feedback" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email via Resend-compatible approach using the built-in SMTP
    const timestamp = new Date().toISOString();
    const csvRow = `"${timestamp}","${company_name}","${rating}","${(feedback || "").replace(/"/g, '""')}","${email || ""}"`;
    const csvContent = `"Timestamp","Company","Rating","Feedback","Email"\n${csvRow}`;

    // Use Supabase's built-in email or a simple fetch to a mail API
    // We'll use Resend if available, otherwise log
    const resendKey = Deno.env.get("RESEND_API_KEY");
    
    if (resendKey) {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "ValueTempo <onboarding@resend.dev>",
          to: ["mlhperkins@gmail.com"],
          subject: `New Feedback: ${company_name} - ${rating}★`,
          html: `
            <h2>New Report Feedback</h2>
            <table style="border-collapse:collapse;border:1px solid #ccc;">
              <tr><td style="padding:8px;border:1px solid #ccc;font-weight:bold;">Company</td><td style="padding:8px;border:1px solid #ccc;">${company_name}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ccc;font-weight:bold;">Rating</td><td style="padding:8px;border:1px solid #ccc;">${"★".repeat(rating)}${"☆".repeat(5 - rating)}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ccc;font-weight:bold;">Feedback</td><td style="padding:8px;border:1px solid #ccc;">${feedback || "—"}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ccc;font-weight:bold;">Email</td><td style="padding:8px;border:1px solid #ccc;">${email || "—"}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ccc;font-weight:bold;">Time</td><td style="padding:8px;border:1px solid #ccc;">${timestamp}</td></tr>
            </table>
            <br/>
            <p><strong>CSV attachment content:</strong></p>
            <pre>${csvContent}</pre>
          `,
        }),
      });

      if (!emailRes.ok) {
        const emailError = await emailRes.text();
        console.error("Email send error:", emailError);
      }
    } else {
      console.log("No RESEND_API_KEY configured. Feedback stored in DB only.");
      console.log("CSV:", csvContent);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
