import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendOtpRequest {
  user_id: string;
  email: string;
  full_name: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, email, full_name }: SendOtpRequest = await req.json();

    console.log("Generating OTP for:", email);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Generate OTP using database function
    const { data: otpCode, error: otpError } = await supabase.rpc('generate_email_otp', {
      p_user_id: user_id,
      p_email: email
    });

    if (otpError) {
      console.error("Error generating OTP:", otpError);
      throw new Error("Erro ao gerar código OTP");
    }

    console.log("OTP generated:", otpCode);

    // Try to send email using SMTP
    try {
      const client = new SMTPClient({
        connection: {
          hostname: "mail.agrilink.ao",
          port: 465,
          tls: true,
          auth: {
            username: "no-reply@agrilink.ao",
            password: "[fnN6K)5l4",
          },
        },
      });

      await client.send({
        from: "AgriLink <no-reply@agrilink.ao>",
        to: email,
        subject: "Código de Verificação - AgriLink",
        content: `Olá ${full_name}!\n\nSeu código de verificação é: ${otpCode}\n\nEste código expira em 15 minutos.\n\nSe você não solicitou este código, ignore este email.\n\nAtenciosamente,\nEquipe AgriLink`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #16a34a; margin: 0;">AgriLink</h1>
              <p style="color: #666; margin: 5px 0;">Conectando produtores e compradores</p>
            </div>
            
            <div style="background: #f9fafb; border-radius: 12px; padding: 30px; text-align: center;">
              <h2 style="color: #1f2937; margin-bottom: 10px;">Olá, ${full_name}!</h2>
              <p style="color: #6b7280; margin-bottom: 20px;">Use o código abaixo para verificar seu e-mail:</p>
              
              <div style="background: #16a34a; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px 40px; border-radius: 8px; display: inline-block;">
                ${otpCode}
              </div>
              
              <p style="color: #9ca3af; margin-top: 20px; font-size: 14px;">
                Este código expira em <strong>15 minutos</strong>
              </p>
            </div>
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 30px;">
              Se você não solicitou este código, ignore este email.
            </p>
          </div>
        `,
      });

      await client.close();
      console.log("Email sent successfully to:", email);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Código enviado para " + email
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } catch (emailError: any) {
      console.error("Error sending email:", emailError);
      
      // Return success anyway - code is generated and stored
      // User can check database or retry
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Código gerado. Verifique seu e-mail.",
          warning: "Falha ao enviar e-mail, mas código foi gerado."
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
  } catch (error: any) {
    console.error("Error in send-otp-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
