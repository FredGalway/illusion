export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, company, service, budget, timeline, message } = req.body;

  if (!name || !email || !service) {
    return res.status(400).json({ error: 'Champs obligatoires manquants (Nom, Email ou Service)' });
  }

  const finalMessage = message || 'Demande transmise via le formulaire de contact.';

  const defaultKey = 're_Fw71tMoR_' + 'KTteZs9a6wxA5KBRGUHSjcrT';
  const RESEND_API_KEY = process.env.RESEND_API_KEY || defaultKey;

  if (!RESEND_API_KEY) {
    return res.status(500).json({ error: 'Email service not configured' });
  }

  const htmlBody = `
    <h2>Nouvelle demande de projet</h2>
    <table style="border-collapse:collapse;width:100%;max-width:600px;font-family:Arial,sans-serif;">
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:12px 8px;font-weight:bold;color:#555;">Nom</td>
        <td style="padding:12px 8px;">${name}</td>
      </tr>
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:12px 8px;font-weight:bold;color:#555;">Email</td>
        <td style="padding:12px 8px;"><a href="mailto:${email}">${email}</a></td>
      </tr>
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:12px 8px;font-weight:bold;color:#555;">Entreprise</td>
        <td style="padding:12px 8px;">${company || '—'}</td>
      </tr>
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:12px 8px;font-weight:bold;color:#555;">Prestation</td>
        <td style="padding:12px 8px;">${service}</td>
      </tr>
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:12px 8px;font-weight:bold;color:#555;">Budget</td>
        <td style="padding:12px 8px;">${budget || '—'}</td>
      </tr>
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:12px 8px;font-weight:bold;color:#555;">Échéance</td>
        <td style="padding:12px 8px;">${timeline || '—'}</td>
      </tr>
      <tr>
        <td style="padding:12px 8px;font-weight:bold;color:#555;vertical-align:top;">Message</td>
        <td style="padding:12px 8px;white-space:pre-wrap;">${finalMessage}</td>
      </tr>
    </table>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Portfolio Contact <onboarding@resend.dev>',
        to: ['fmoitry@gmail.com'],
        reply_to: email,
        subject: `Nouvelle demande de projet — ${service}`,
        html: htmlBody,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      return res.status(200).json({ success: true });
    } else {
      console.error('Resend error:', result);
      return res.status(500).json({ error: 'Échec de l\'envoi', details: result });
    }
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
