import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface MatchNotificationRequest {
  matchId: string;
  user1Id: string;
  user2Id: string;
  appType: string;
}

// App-specific configurations
const appConfigs: Record<string, { name: string; emoji: string; fromName: string }> = {
  love: { name: "Eureka Love", emoji: "💕", fromName: "Eureka Love" },
  plan: { name: "Eureka Plan", emoji: "🎉", fromName: "Eureka Plan" },
  sex: { name: "Eureka Sex", emoji: "🔥", fromName: "Eureka Sex" },
};

// Email translations per language
const emailTranslations: Record<string, {
  subject: string;
  heading: string;
  greeting: string;
  body: string;
  cta: string;
  tip: string;
  footer: string;
  securityNote: string;
}> = {
  es: {
    subject: "¡Es mutuo! Tienes un match en",
    heading: "¡Es mutuo!",
    greeting: "Hola",
    body: "¡Tenemos noticias increíbles! <strong>{matchedName}</strong> también te ha elegido en {appName}.",
    cta: "Ver mi match",
    tip: "✨ ¡El primer paso es el más difícil, pero tú ya lo diste!",
    footer: "Este email fue enviado desde {appName}",
    securityNote: "Por tu seguridad, los datos de contacto solo se muestran dentro de la app.",
  },
  en: {
    subject: "It's mutual! You have a match on",
    heading: "It's mutual!",
    greeting: "Hi",
    body: "We have amazing news! <strong>{matchedName}</strong> also chose you on {appName}.",
    cta: "View my match",
    tip: "✨ The first step is the hardest, but you already took it!",
    footer: "This email was sent from {appName}",
    securityNote: "For your security, contact details are only shown within the app.",
  },
  eu: {
    subject: "Elkarrekikoa da! Match bat duzu hemen:",
    heading: "Elkarrekikoa da!",
    greeting: "Kaixo",
    body: "Berri bikainak ditugu! <strong>{matchedName}</strong>(e)k zu ere aukeratu zaitu {appName}(e)n.",
    cta: "Nire matcha ikusi",
    tip: "✨ Lehen urratsa da zailena, baina zuk dagoeneko eman duzu!",
    footer: "Email hau {appName}(e)tik bidali da",
    securityNote: "Zure segurtasunerako, kontaktu-datuak aplikazioan bakarrik erakusten dira.",
  },
  fr: {
    subject: "C'est mutuel ! Vous avez un match sur",
    heading: "C'est mutuel !",
    greeting: "Bonjour",
    body: "Nous avons une nouvelle incroyable ! <strong>{matchedName}</strong> vous a aussi choisi sur {appName}.",
    cta: "Voir mon match",
    tip: "✨ Le premier pas est le plus difficile, mais vous l'avez déjà fait !",
    footer: "Cet email a été envoyé depuis {appName}",
    securityNote: "Pour votre sécurité, les coordonnées ne sont affichées que dans l'application.",
  },
  ca: {
    subject: "És mutu! Tens un match a",
    heading: "És mutu!",
    greeting: "Hola",
    body: "Tenim notícies increïbles! <strong>{matchedName}</strong> també t'ha triat a {appName}.",
    cta: "Veure el meu match",
    tip: "✨ El primer pas és el més difícil, però tu ja l'has fet!",
    footer: "Aquest email ha estat enviat des de {appName}",
    securityNote: "Per la teva seguretat, les dades de contacte només es mostren dins l'app.",
  },
  gl: {
    subject: "É mutuo! Tes un match en",
    heading: "É mutuo!",
    greeting: "Ola",
    body: "Temos noticias incríbeis! <strong>{matchedName}</strong> tamén te elixiu en {appName}.",
    cta: "Ver o meu match",
    tip: "✨ O primeiro paso é o máis difícil, pero ti xa o deches!",
    footer: "Este email foi enviado desde {appName}",
    securityNote: "Pola túa seguridade, os datos de contacto só se mostran dentro da app.",
  },
  pt: {
    subject: "É mútuo! Você tem um match no",
    heading: "É mútuo!",
    greeting: "Olá",
    body: "Temos notícias incríveis! <strong>{matchedName}</strong> também te escolheu no {appName}.",
    cta: "Ver meu match",
    tip: "✨ O primeiro passo é o mais difícil, mas você já deu!",
    footer: "Este email foi enviado do {appName}",
    securityNote: "Para sua segurança, os dados de contato só são exibidos dentro do app.",
  },
  it: {
    subject: "È reciproco! Hai un match su",
    heading: "È reciproco!",
    greeting: "Ciao",
    body: "Abbiamo notizie incredibili! <strong>{matchedName}</strong> ti ha scelto anche su {appName}.",
    cta: "Vedi il mio match",
    tip: "✨ Il primo passo è il più difficile, ma tu l'hai già fatto!",
    footer: "Questa email è stata inviata da {appName}",
    securityNote: "Per la tua sicurezza, i dati di contatto sono mostrati solo nell'app.",
  },
  de: {
    subject: "Es ist gegenseitig! Du hast ein Match auf",
    heading: "Es ist gegenseitig!",
    greeting: "Hallo",
    body: "Wir haben großartige Neuigkeiten! <strong>{matchedName}</strong> hat dich auch auf {appName} gewählt.",
    cta: "Mein Match ansehen",
    tip: "✨ Der erste Schritt ist der schwerste, aber du hast ihn schon gemacht!",
    footer: "Diese E-Mail wurde von {appName} gesendet",
    securityNote: "Zu deiner Sicherheit werden Kontaktdaten nur in der App angezeigt.",
  },
  ja: {
    subject: "相互です！マッチがあります：",
    heading: "相互です！",
    greeting: "こんにちは",
    body: "素晴らしいニュースです！<strong>{matchedName}</strong>さんも{appName}であなたを選びました。",
    cta: "マッチを見る",
    tip: "✨ 最初の一歩が一番難しいですが、あなたはもう踏み出しました！",
    footer: "このメールは{appName}から送信されました",
    securityNote: "セキュリティのため、連絡先情報はアプリ内でのみ表示されます。",
  },
};

function getTranslation(lang: string) {
  return emailTranslations[lang] || emailTranslations.es;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { matchId, user1Id, user2Id, appType }: MatchNotificationRequest = await req.json();

    if (!matchId || !user1Id || !user2Id || !appType) {
      throw new Error("Missing required fields: matchId, user1Id, user2Id, appType");
    }

    // Validate match exists and was created recently
    const { data: matchData, error: matchError } = await supabase
      .from("matches")
      .select("id, user1_id, user2_id, created_at")
      .eq("id", matchId)
      .single();

    if (matchError || !matchData) {
      return new Response(JSON.stringify({ error: "Invalid match" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    if (matchData.user1_id !== user1Id || matchData.user2_id !== user2Id) {
      return new Response(JSON.stringify({ error: "Invalid request" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const secondsSinceCreation = (Date.now() - new Date(matchData.created_at).getTime()) / 1000;
    if (secondsSinceCreation > 60) {
      return new Response(JSON.stringify({ error: "Request expired" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const appConfig = appConfigs[appType] || appConfigs.love;

    // Fetch profiles with language
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, display_name, email, email_verified, language")
      .in("user_id", [user1Id, user2Id]);

    if (profilesError || !profiles || profiles.length < 2) {
      throw new Error("Could not find both user profiles");
    }

    const user1Profile = profiles.find(p => p.user_id === user1Id);
    const user2Profile = profiles.find(p => p.user_id === user2Id);
    if (!user1Profile || !user2Profile) throw new Error("Could not find both user profiles");

    // Get picked names
    const { data: picks } = await supabase
      .from("picks")
      .select("picker_id, picked_name")
      .eq("is_matched", true)
      .eq("app_type", appType)
      .or(`and(picker_id.eq.${user1Id},picked_user_id.eq.${user2Id}),and(picker_id.eq.${user2Id},picked_user_id.eq.${user1Id})`);

    const nameUser1GaveToUser2 = picks?.find(p => p.picker_id === user1Id)?.picked_name || user2Profile.display_name || "alguien especial";
    const nameUser2GaveToUser1 = picks?.find(p => p.picker_id === user2Id)?.picked_name || user1Profile.display_name || "alguien especial";

    const matchUrl = `https://eurekamatch.lovable.app/match/${matchId}?app=${appType}`;

    const emailsSent: string[] = [];
    const errors: string[] = [];

    // Send to User 1
    if (user1Profile.email && user1Profile.email_verified) {
      try {
        const t = getTranslation(user1Profile.language || 'es');
        const emailHtml = generateEmailHtml({
          recipientName: user1Profile.display_name || t.greeting,
          matchedPersonName: nameUser1GaveToUser2,
          matchUrl,
          appConfig,
          t,
        });
        await resend.emails.send({
          from: `${appConfig.fromName} <noreply@eurekamatch.com>`,
          to: [user1Profile.email],
          subject: `${appConfig.emoji} ${t.subject} ${appConfig.name}`,
          html: emailHtml,
        });
        emailsSent.push(user1Profile.email);
      } catch (emailError: any) {
        errors.push(`User1: ${emailError.message}`);
      }
    } else if (user1Profile.email && !user1Profile.email_verified) {
      errors.push("User1: email not verified");
    }

    // Send to User 2
    if (user2Profile.email && user2Profile.email_verified) {
      try {
        const t = getTranslation(user2Profile.language || 'es');
        const emailHtml = generateEmailHtml({
          recipientName: user2Profile.display_name || t.greeting,
          matchedPersonName: nameUser2GaveToUser1,
          matchUrl,
          appConfig,
          t,
        });
        await resend.emails.send({
          from: `${appConfig.fromName} <noreply@eurekamatch.com>`,
          to: [user2Profile.email],
          subject: `${appConfig.emoji} ${t.subject} ${appConfig.name}`,
          html: emailHtml,
        });
        emailsSent.push(user2Profile.email);
      } catch (emailError: any) {
        errors.push(`User2: ${emailError.message}`);
      }
    } else if (user2Profile.email && !user2Profile.email_verified) {
      errors.push("User2: email not verified");
    }

    return new Response(
      JSON.stringify({ success: true, emailsSent, errors: errors.length > 0 ? errors : undefined }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-match-notification:", error);
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

interface EmailParams {
  recipientName: string;
  matchedPersonName: string;
  matchUrl: string;
  appConfig: { name: string; emoji: string };
  t: typeof emailTranslations.es;
}

function generateEmailHtml({ recipientName, matchedPersonName, matchUrl, appConfig, t }: EmailParams): string {
  const bodyText = t.body
    .replace("{matchedName}", matchedPersonName)
    .replace("{appName}", appConfig.name);
  const footerText = t.footer.replace("{appName}", appConfig.name);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
      <div style="max-width: 500px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ff6b9d 0%, #c44569 100%); border-radius: 16px 16px 0 0; padding: 30px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 10px;">${appConfig.emoji}</div>
          <h1 style="color: white; margin: 0; font-size: 24px;">${t.heading}</h1>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            ${t.greeting} <strong>${recipientName}</strong>,
          </p>
          
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            ${bodyText}
          </p>
          
          <p style="font-size: 16px; color: #333; margin-bottom: 25px;">
            ${t.cta === t.cta ? bodyText.includes(appConfig.name) ? "" : ""}
          </p>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="${matchUrl}" style="display: inline-block; background: linear-gradient(135deg, #ff6b9d 0%, #c44569 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 25px; font-weight: 600; font-size: 16px;">
              ${t.cta} ${appConfig.emoji}
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 25px; text-align: center;">
            ${t.tip}
          </p>
        </div>
        
        <p style="text-align: center; font-size: 12px; color: #999; margin-top: 20px;">
          ${footerText}<br>
          ${t.securityNote}
        </p>
      </div>
    </body>
    </html>
  `;
}

serve(handler);
