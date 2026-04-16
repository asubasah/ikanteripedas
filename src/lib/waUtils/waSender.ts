/**
 * Unified WhatsApp Sender Utility
 * Supports GoWA (primary) and WAHA (fallback)
 */

export async function sendWhatsAppText(to: string, text: string) {
  const GOWA_URL = process.env.GOWA_URL;
  const GOWA_BASIC_AUTH = process.env.GOWA_BASIC_AUTH;
  const GOWA_DEVICE_ID = process.env.GOWA_DEVICE_ID || 'default';
  
  const WAHA_URL = process.env.WAHA_URL;
  const WAHA_API_KEY = process.env.WAHA_API_KEY;
  const WAHA_SESSION = process.env.WAHA_SESSION_NAME || 'default';

  // Auth Header for GOWA
  const gowaHeaders: Record<string, string> = { 
    'Content-Type': 'application/json',
    'X-Device-Id': GOWA_DEVICE_ID 
  };
  
  if (GOWA_BASIC_AUTH) {
    gowaHeaders['Authorization'] = `Basic ${Buffer.from(GOWA_BASIC_AUTH).toString('base64')}`;
  }

  // Standardize JID (Number only for GoWA, @c.us for WAHA)
  const cleanNumber = to.replace(/[^0-9]/g, '');
  const formattedNumber = cleanNumber.startsWith('0') ? '62' + cleanNumber.substring(1) : cleanNumber;

  // 1. Try GoWA first
  if (GOWA_URL) {
    try {
      console.log(`[waSender] Attempting GoWA send to ${formattedNumber}`);
      
      // GoWA requires @s.whatsapp.net suffix
      const gowaPhone = `${formattedNumber}@s.whatsapp.net`;
      
      const res = await fetch(`${GOWA_URL}/send/message`, {
        method: 'POST',
        headers: gowaHeaders,
        body: JSON.stringify({
          phone: gowaPhone,
          message: text
        })
      });

      if (res.ok) {
        console.log(`[waSender] GoWA success: ${formattedNumber}`);
        return { success: true, gateway: 'gowa' };
      }
      console.error(`[waSender] GoWA failed: ${res.statusText}`);
    } catch (err: any) {
      console.error(`[waSender] GoWA error:`, err.message);
    }
  }

  // 2. Try WAHA as fallback
  if (WAHA_URL) {
    try {
      console.log(`[waSender] Attempting WAHA fallback to ${formattedNumber}`);
      const targetJid = `${formattedNumber}@c.us`;
      const res = await fetch(`${WAHA_URL}/api/sendText`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Api-Key': WAHA_API_KEY || ''
        },
        body: JSON.stringify({
          chatId: targetJid,
          text: text,
          session: WAHA_SESSION
        })
      });

      if (res.ok) {
        console.log(`[waSender] WAHA success: ${formattedNumber}`);
        return { success: true, gateway: 'waha' };
      }
      console.error(`[waSender] WAHA failed: ${res.statusText}`);
    } catch (err: any) {
      console.error(`[waSender] WAHA error:`, err.message);
    }
  }

  return { success: false, error: 'All gateways failed' };
}
