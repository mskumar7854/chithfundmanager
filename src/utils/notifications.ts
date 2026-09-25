export async function requestPushNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

export function sendPushNotification(title: string, body: string, icon?: string): boolean {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return false;
  }

  try {
    new Notification(title, {
      body,
      icon: icon || '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'chit-reminder-' + Date.now(),
    });
    return true;
  } catch (e) {
    console.warn('Could not fire native notification:', e);
    return false;
  }
}

export const sendBrowserNotification = sendPushNotification;

/**
 * Clean Web Audio API sound for reminders and notifications
 */
export function playNotificationTone(type: 'reminder' | 'success' | 'auction' = 'reminder') {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'success') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(440, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.3);
      osc2.stop(ctx.currentTime + 0.3);
    } else if (type === 'auction') {
      // Fanfare chirp
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
      osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.3); // C6

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } else {
      // Gentle chime for reminder
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch {
    // Audio context may be restricted by autoplay policy
  }
}

/**
 * Formats a clean WhatsApp direct link for a member payment reminder
 */
export function buildWhatsAppReminderUrl(params: {
  memberName: string;
  phone: string;
  amountDue: number;
  monthNumber: number;
  dueDate: string;
  chitName: string;
  upiId?: string;
}): string {
  const cleanPhone = params.phone.replace(/[^0-9]/g, '');
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  const text = `*CHIT FUND PAYMENT REMINDER*\n\n` +
    `Hello *${params.memberName}*,\n` +
    `This is a gentle reminder regarding your chit installment for *${params.chitName}* (Month ${params.monthNumber}).\n\n` +
    `• *Amount Due:* ₹${params.amountDue.toLocaleString('en-IN')}\n` +
    `• *Due Date:* ${params.dueDate}\n` +
    (params.upiId ? `• *Pay via UPI:* ${params.upiId}\n\n` : `\n`) +
    `Kindly transfer the amount before the due date to ensure smooth auction processing. Thank you!`;

  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Builds a summary broadcast message for the group chat
 */
export function buildGroupBroadcastSummary(params: {
  chitName: string;
  monthNumber: number;
  totalMembers: number;
  collectedCount: number;
  amountDuePerMember: number;
  dueDate: string;
  pendingMembers: Array<{ name: string; amount: number }>;
}): string {
  const pendingNames = params.pendingMembers.map((m, idx) => `${idx + 1}. ${m.name} (₹${m.amount.toLocaleString('en-IN')})`).join('\n');

  return `📢 *CHIT FUND MONTH ${params.monthNumber} STATUS UPDATE*\n` +
    `*Group:* ${params.chitName}\n` +
    `*Due Date:* ${params.dueDate}\n` +
    `*Installment Amount:* ₹${params.amountDuePerMember.toLocaleString('en-IN')}\n` +
    `*Collection Progress:* ${params.collectedCount} / ${params.totalMembers} Paid\n\n` +
    `⚠️ *Pending Members (${params.pendingMembers.length}):*\n` +
    `${pendingNames || 'None! All members have cleared their dues 🎉'}\n\n` +
    `Please clear pending amounts at your earliest convenience. Thank you.`;
}
