import React, { useState } from 'react';
import { 
  Clock, 
  Send, 
  Copy, 
  Check, 
  Zap, 
  Smartphone, 
  AlertCircle, 
  CheckCircle, 
  ExternalLink,
  RefreshCw,
  BellRing,
  Code
} from 'lucide-react';
import { ChitGroup, Member, Payment, WebhookLog } from '../types/chit';
import { evaluatePaymentDueStatus, formatCurrency, formatDate } from '../utils/calculations';
import { buildGroupBroadcastSummary, buildWhatsAppReminderUrl, playNotificationTone, sendPushNotification } from '../utils/notifications';

interface ReminderEngineModalProps {
  group: ChitGroup;
  members: Member[];
  payments: Payment[];
  webhooks: WebhookLog[];
  onTriggerCronScan: () => void;
  soundEnabled: boolean;
}

export const ReminderEngineModal: React.FC<ReminderEngineModalProps> = ({
  group,
  members,
  payments,
  webhooks,
  onTriggerCronScan,
  soundEnabled,
}) => {
  const [copiedBroadcast, setCopiedBroadcast] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'webhooks'>('pending');

  // Identify members who have pending dues
  const currentMonthPayments = payments.filter((p) => p.monthNumber === group.currentMonth);
  const pendingPayments = currentMonthPayments.filter((p) => p.status !== 'Paid');

  // Pending payments due in <= 3 days or overdue
  const imminentPayments = pendingPayments.filter((p) => {
    const info = evaluatePaymentDueStatus(p.dueDate);
    return info.isUpcoming3Days || info.isDueToday || info.isOverdue;
  });

  const pendingMembersList = pendingPayments.map((p) => {
    const mem = members.find((m) => m.id === p.memberId);
    return {
      name: mem?.name || 'Member',
      amount: p.amountDue - p.amountPaid,
    };
  });

  const currentDueAmount = currentMonthPayments[0]?.amountDue || 4250;
  const currentDueDate = currentMonthPayments[0]?.dueDate ? formatDate(currentMonthPayments[0].dueDate) : `${group.paymentDueDayOfMonth}th of this month`;

  const groupBroadcastText = buildGroupBroadcastSummary({
    chitName: group.name,
    monthNumber: group.currentMonth,
    totalMembers: group.memberCount,
    collectedCount: currentMonthPayments.filter((p) => p.status === 'Paid').length,
    amountDuePerMember: currentDueAmount,
    dueDate: currentDueDate,
    pendingMembers: pendingMembersList,
  });

  const handleCopyBroadcast = () => {
    navigator.clipboard.writeText(groupBroadcastText);
    setCopiedBroadcast(true);
    setTimeout(() => setCopiedBroadcast(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Engine Overview Header */}
      <div className="m3-card p-5 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-[var(--m3-on-surface)]">Automated 8:00 AM Reminder Engine</h2>
                <span className="m3-status-paid text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                  Active Cron
                </span>
              </div>
              <p className="text-xs text-[var(--m3-on-surface-variant)] mt-1 max-w-2xl">
                Daily scheduled cron engine runs at <strong>8:00 AM</strong>. It queries the payment ledger for <code className="text-amber-600 dark:text-amber-400 font-mono">status = &apos;Pending&apos;</code> where due date is within <strong>3 days</strong>, triggers browser push notifications, and compiles automated WhatsApp broadcasts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onTriggerCronScan}
              className="m3-btn-primary px-4 py-2.5 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Run 8:00 AM Scan Now</span>
            </button>
          </div>
        </div>

        {/* Engine Rules Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-[var(--m3-surface-container-low)] border border-[var(--m3-outline-variant)] text-xs">
            <span className="text-[var(--m3-on-surface-variant)] text-[11px] block opacity-75">Cron Frequency</span>
            <div className="font-mono font-bold text-[var(--m3-on-surface)] mt-0.5">Every Day @ 08:00 AM</div>
            <span className="text-[10px] text-[var(--m3-on-surface-variant)] opacity-60">Cron: 0 8 * * *</span>
          </div>

          <div className="p-3 rounded-xl bg-[var(--m3-surface-container-low)] border border-[var(--m3-outline-variant)] text-xs">
            <span className="text-[var(--m3-on-surface-variant)] text-[11px] block opacity-75">Reminder Threshold</span>
            <div className="font-mono font-bold text-amber-600 dark:text-amber-400 mt-0.5">Due in ≤ 3 Days & Overdue</div>
            <span className="text-[10px] text-[var(--m3-on-surface-variant)] opacity-60">Filters pending installments</span>
          </div>

          <div className="p-3 rounded-xl bg-[var(--m3-surface-container-low)] border border-[var(--m3-outline-variant)] text-xs">
            <span className="text-[var(--m3-on-surface-variant)] text-[11px] block opacity-75">Action Channels</span>
            <div className="font-semibold text-[var(--m3-primary)] mt-0.5">Web Push + WhatsApp + Webhook</div>
            <span className="text-[10px] text-[var(--m3-on-surface-variant)] opacity-60">n8n / Supabase / Browser</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--m3-outline-variant)] pb-2">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
            activeTab === 'pending'
              ? 'm3-chip-selected font-bold'
              : 'text-[var(--m3-on-surface-variant)] hover:bg-[var(--m3-surface-container-high)]'
          }`}
        >
          Pending Members Queue ({pendingPayments.length})
        </button>

        <button
          onClick={() => setActiveTab('webhooks')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
            activeTab === 'webhooks'
              ? 'm3-chip-selected font-bold'
              : 'text-[var(--m3-on-surface-variant)] hover:bg-[var(--m3-surface-container-high)]'
          }`}
        >
          Webhook & Automation Logs ({webhooks.length})
        </button>
      </div>

      {activeTab === 'pending' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Pending Members List */}
          <div className="m3-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[var(--m3-on-surface)] text-sm">Flagged for Follow-up</h3>
                <p className="text-xs text-[var(--m3-on-surface-variant)]">Members with unpaid dues for Month {group.currentMonth}</p>
              </div>
              <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                {pendingPayments.length} Pending
              </span>
            </div>

            {pendingPayments.length === 0 ? (
              <div className="py-10 text-center text-[var(--m3-on-surface-variant)] opacity-80 text-xs bg-[var(--m3-surface-container-low)] rounded-2xl border border-[var(--m3-outline-variant)]">
                🎉 All members have cleared their payments for Month {group.currentMonth}!
              </div>
            ) : (
              <div className="space-y-3">
                {pendingPayments.map((p) => {
                  const member = members.find((m) => m.id === p.memberId);
                  if (!member) return null;
                  const dueInfo = evaluatePaymentDueStatus(p.dueDate);

                  return (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-xl bg-[var(--m3-surface-container-low)] border border-[var(--m3-outline-variant)] flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[var(--m3-on-surface)] text-xs">{member.name}</span>
                          <span className="text-[10px] font-mono text-[var(--m3-on-surface-variant)] opacity-75">{member.phone}</span>
                        </div>
                        <div className="text-[11px] text-[var(--m3-on-surface-variant)] mt-1 flex items-center gap-2">
                          <span className="font-mono font-bold text-[var(--m3-on-surface)]">
                            {formatCurrency(p.amountDue - p.amountPaid)} due
                          </span>
                          <span>·</span>
                          <span className={dueInfo.isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-amber-600 dark:text-amber-400 font-medium'}>
                            {dueInfo.isOverdue
                              ? `Overdue by ${Math.abs(dueInfo.daysRemaining)} days`
                              : dueInfo.isDueToday
                              ? 'Due Today'
                              : `Due in ${dueInfo.daysRemaining} days (${formatDate(p.dueDate)})`}
                          </span>
                        </div>
                      </div>

                      <a
                        href={buildWhatsAppReminderUrl({
                          memberName: member.name,
                          phone: member.phone,
                          amountDue: p.amountDue - p.amountPaid,
                          monthNumber: group.currentMonth,
                          dueDate: formatDate(p.dueDate),
                          chitName: group.name,
                          upiId: 'admin@okaxis',
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Reminder</span>
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Automated Group Broadcast Generator */}
          <div className="m3-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[var(--m3-on-surface)] text-sm">WhatsApp Group Broadcast Template</h3>
                <p className="text-xs text-[var(--m3-on-surface-variant)]">Pre-formatted summary message for your Chit WhatsApp group</p>
              </div>

              <button
                onClick={handleCopyBroadcast}
                className="m3-btn-outlined px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                {copiedBroadcast ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-[var(--m3-surface-container-low)] p-4 rounded-xl border border-[var(--m3-outline-variant)] font-mono text-xs text-[var(--m3-on-surface)] whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto">
              {groupBroadcastText}
            </div>

            <div className="flex items-center justify-between text-xs text-[var(--m3-on-surface-variant)] pt-2 border-t border-[var(--m3-outline-variant)]">
              <span>Ready to paste directly into your chit group chat</span>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(groupBroadcastText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--m3-primary)] hover:underline font-bold flex items-center gap-1"
              >
                <span>Open in WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      ) : (
        /* Webhooks & Automation Logs */
        <div className="m3-card p-5 space-y-4">
          <div>
            <h3 className="font-bold text-[var(--m3-on-surface)] text-sm">Webhook Execution & Audit Logs</h3>
            <p className="text-xs text-[var(--m3-on-surface-variant)]">
              Payloads dispatched when auctions finalize or cron reminders trigger (simulates n8n / Supabase triggers)
            </p>
          </div>

          <div className="space-y-3">
            {webhooks.map((log) => (
              <div key={log.id} className="p-4 rounded-xl bg-[var(--m3-surface-container-low)] border border-[var(--m3-outline-variant)] space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-full bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)]">
                      <Zap className="w-4 h-4" />
                    </span>
                    <span className="font-bold text-[var(--m3-on-surface)] text-xs">{log.title}</span>
                    <span className="text-[10px] font-mono text-[var(--m3-on-surface-variant)] opacity-70">[{log.event}]</span>
                  </div>

                  <span className="text-[11px] font-mono text-[var(--m3-on-surface-variant)]">
                    {new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>

                <p className="text-xs text-[var(--m3-on-surface)] pl-8">{log.details}</p>

                <div className="pl-8 pt-1">
                  <details className="text-[11px] text-[var(--m3-on-surface-variant)]">
                    <summary className="cursor-pointer hover:text-[var(--m3-on-surface)] flex items-center gap-1">
                      <Code className="w-3 h-3" />
                      <span>Inspect JSON Payload</span>
                    </summary>
                    <pre className="mt-2 p-3 bg-[var(--m3-surface-container-lowest)] rounded-lg text-[var(--m3-primary)] font-mono text-[10px] overflow-x-auto border border-[var(--m3-outline-variant)]">
                      {JSON.stringify(log.payload, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
