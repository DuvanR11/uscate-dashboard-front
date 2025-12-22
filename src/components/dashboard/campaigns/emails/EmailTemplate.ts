export type TemplateType = 'official' | 'invite' | 'confirm' | 'flash' | 'birthday';

export interface EmailButton {
  text: string;
  url: string;
  color: string;
  textColor: string;
}

interface EmailOptions {
  content: string;
  imageUrl?: string;
  subject: string;
  buttons?: EmailButton[];
  type: TemplateType;
}

export function generateEmailHtml({
  content,
  imageUrl,
  subject,
  buttons = [],
  type = 'official'
}: EmailOptions) {
  
  // No escapamos saltos de línea porque ya viene HTML del editor
  const htmlContent = content; 
  
  const styles = {
    official: { headerBg: '#1B2541', headerTitle: '#FFFFFF', bodyBg: '#FFFFFF', border: 'none', icon: '' },
    invite:   { headerBg: '#FFFFFF', headerTitle: '#1B2541', bodyBg: '#FFFFFF', border: '4px solid #FFC400', icon: '✉️' },
    confirm:  { headerBg: '#10B981', headerTitle: '#FFFFFF', bodyBg: '#F0FDFA', border: '1px solid #10B981', icon: '✅' },
    flash:    { headerBg: '#FFC400', headerTitle: '#1B2541', bodyBg: '#FFFBEB', border: '2px dashed #DC2626', icon: '⚡' },
    birthday: { headerBg: '#8B5CF6', headerTitle: '#FFFFFF', bodyBg: '#FFFFFF', border: 'none', icon: '🎂' }
  };

  const s = styles[type];

  const buttonsHtml = buttons.map(btn => `
    <a href="${btn.url}" target="_blank" style="
      display: inline-block;
      background-color: ${btn.color};
      color: ${btn.textColor};
      padding: 14px 28px;
      margin: 8px 5px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    ">${btn.text}</a>
  `).join('');

  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F0F4F8; font-family: Helvetica, Arial, sans-serif; }
    .container { max-width: 600px; margin: 20px auto; background-color: ${s.bodyBg}; border-radius: 8px; overflow: hidden; border: ${s.border}; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
    .header { background-color: ${s.headerBg}; padding: 30px; text-align: center; }
    .header h1 { margin: 0; color: ${s.headerTitle}; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; }
    .content { padding: 40px 30px; color: #334155; line-height: 1.6; font-size: 16px; text-align: left; }
    .content h2 { margin-top: 0; color: #1B2541; font-size: 20px; }
    .content p { margin-bottom: 15px; }
    .buttons-container { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
    .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body style="margin: 0; padding: 0;">
    <div class="container">
      <div class="header">
        ${s.icon ? `<div style="font-size: 36px; margin-bottom: 10px;">${s.icon}</div>` : ''}
        <h1>${subject}</h1>
      </div>
      ${imageUrl ? `<img src="${imageUrl}" alt="Imagen" style="width: 100%; height: auto; display: block;" />` : ''}
      <div class="content">
        ${htmlContent}
        ${buttons.length > 0 ? `<div class="buttons-container">${buttonsHtml}</div>` : ''}
      </div>
      <div class="footer">
        <p style="margin: 5px 0;">Mensaje enviado por el equipo de <strong>José Jaime Uscátegui</strong>.</p>
        <p style="margin: 5px 0;">
            <a href="#" style="color:#64748b;">Darse de baja</a> | <a href="#" style="color:#64748b;">Política de Privacidad</a>
        </p>
      </div>
    </div>
</body>
</html>
  `;
}