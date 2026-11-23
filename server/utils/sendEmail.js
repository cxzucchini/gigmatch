const sendEmail = async ({ to, subject, text, html }) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'GigMatch <onboarding@resend.dev>';

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Email send failed (${response.status}): ${errBody}`);
  }

  return await response.json();
};

module.exports = sendEmail;