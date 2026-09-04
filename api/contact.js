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

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch(e) { body = {}; }
  } else if (Buffer.isBuffer(body)) {
    try { body = JSON.parse(body.toString('utf-8')); } catch(e) { body = {}; }
  }
  body = body || {};

  const { name, email, company, service, budget, timeline, message, attachment, website, _t } = body;

  // 1. Anti-Spam: Honeypot field trap (bots fill hidden inputs)
  if (website && website.trim().length > 0) {
    console.warn('Spam detected via honeypot field');
    return res.status(200).json({ success: true }); // Silent success for bots
  }

  // 2. Anti-Spam: Velocity check (bot submitted form in < 1.5 seconds)
  if (_t && (Date.now() - Number(_t)) < 1500) {
    console.warn('Spam detected via submission velocity');
    return res.status(200).json({ success: true }); // Silent success for bots
  }

  if (!name || !email || !service) {
    return res.status(400).json({ error: 'Champs obligatoires manquants (Nom, Email ou Service)' });
  }

  // 3. Email Validation: RFC 5322 Syntax Check
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  const cleanedEmail = email.trim().toLowerCase();

  if (!emailRegex.test(cleanedEmail)) {
    return res.status(400).json({ error: 'L\'adresse email saisie est invalide. Veuillez vérifier le format (ex: nom@domaine.fr).' });
  }

  // 4. Anti-Spam: Disposable / Temporary Email Domain Blocklist
  const DISPOSABLE_DOMAINS = [
    'yopmail.com', 'yopmail.fr', 'mailinator.com', 'tempmail.com', '10minutemail.com',
    'guerrillamail.com', 'dispostable.com', 'trashmail.com', 'sharklasers.com',
    'getnada.com', 'throwawaymail.com', 'tempail.com', 'mohmal.com', 'maildrop.cc',
    'inboxbear.com', 'crazymailing.com', 'tmail.ws', 'tmpmail.org', 'bupkis.com'
  ];

  const emailDomain = cleanedEmail.split('@')[1] || '';
  if (DISPOSABLE_DOMAINS.includes(emailDomain)) {
    return res.status(400).json({ error: 'Les adresses email temporaires ou jetables ne sont pas acceptées.' });
  }

  // 5. Email Typo Warning Check (e.g., gmai.com, hotmai.com)
  const TYPO_DOMAINS = ['gmai.com', 'gmal.com', 'gmaill.com', 'hotmai.com', 'hotmal.com', 'outlok.com', 'yaho.com'];
  if (TYPO_DOMAINS.includes(emailDomain)) {
    return res.status(400).json({ error: `Le domaine @${emailDomain} semble contenir une faute de frappe. Veuillez vérifier votre adresse email.` });
  }

  const finalMessage = message || 'Demande transmise via le formulaire de contact.';

  let attachments = undefined;
  if (attachment && attachment.filename && attachment.content) {
    const base64Data = attachment.content.includes(',')
      ? attachment.content.split(',')[1]
      : attachment.content;
    attachments = [{
      filename: attachment.filename,
      content: base64Data,
    }];
  }

  const defaultKey = 're_Fw71tMoR_' + 'KTteZs9a6wxA5KBRGUHSjcrT';
  const RESEND_API_KEY = process.env.RESEND_API_KEY || defaultKey;

  if (!RESEND_API_KEY) {
    return res.status(500).json({ error: 'Email service not configured' });
  }

  const attachmentRow = attachment && attachment.filename ? `
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:12px 8px;font-weight:bold;color:#555;">Pièce jointe</td>
        <td style="padding:12px 8px;">📎 ${attachment.filename}</td>
      </tr>` : '';

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
      </tr>${attachmentRow}
      <tr>
        <td style="padding:12px 8px;font-weight:bold;color:#555;vertical-align:top;">Message</td>
        <td style="padding:12px 8px;white-space:pre-wrap;">${finalMessage}</td>
      </tr>
    </table>
  `;

  try {
    const payload = {
      from: 'Portfolio Contact <onboarding@resend.dev>',
      to: ['fmoitry@gmail.com'],
      reply_to: email,
      subject: `Nouvelle demande de projet — ${service}`,
      html: htmlBody,
    };

    if (attachments) {
      payload.attachments = attachments;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
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
