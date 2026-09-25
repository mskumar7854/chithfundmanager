import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Send, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  FileText, 
  Download, 
  Share2, 
  Check, 
  ArrowUpDown, 
  ExternalLink,
  Plus
} from 'lucide-react';
import { ChitGroup, Member, Payment } from '../types/chit';
import { evaluatePaymentDueStatus, formatCurrency, formatDate } from '../utils/calculations';
import { buildWhatsAppReminderUrl } from '../utils/notifications';

interface PaymentsLedgerProps {
  group: ChitGroup;
  members: Member[];
  payments: Payment[];
  onOpenPaymentModal: (payment: Payment) => void;
  onOpenReceipt: (payment: Payment) => void;
  onSelectMember: (member: Member) => void;
  onBatchWhatsAppReminders: (pendingPayments: Payment[]) => void;
}

export const PaymentsLedger: React.FC<PaymentsLedgerProps> = ({
  group,
  members,
  payments,
  onOpenPaymentModal,
  onOpenReceipt,
  onSelectMember,
  onBatchWhatsAppReminders,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>(group.currentMonth);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Get available months
  const availableMonths = useMemo(() => {
    const months = Array.from(new Set(payments.map((p) => p.monthNumber))).sort((a, b) => a - b);
    return months.length > 0 ? months : [1];
  }, [payments]);

  // Filtered payments list
  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      // Month match
      if (selectedMonth !== 'all' && payment.monthNumber !== selectedMonth) {
        return false;
      }

      // Member lookup
      const member = members.find((m) => m.id === payment.memberId);
      const memberName = member?.name.toLowerCase() || '';
      const memberPhone = member?.phone || '';

      // Search match
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!memberName.includes(query) && !memberPhone.includes(query)) {
          return false;
        }
      }

      // Status match
      if (statusFilter !== 'all') {
        const dueInfo = evaluatePaymentDueStatus(payment.dueDate);
        if (statusFilter === 'Paid' && payment.status !== 'Paid') return false;
        if (statusFilter === 'Pending' && payment.status === 'Paid') return false;
        if (statusFilter === 'Overdue') {
          if (payment.status === 'Paid' || !dueInfo.isOverdue) return false;
        }
        if (statusFilter === 'Upcoming3Days') {
          if (payment.status === 'Paid' || !dueInfo.isUpcoming3Days) return false;
        }
      }

      return true;
    });
  }, [payments, selectedMonth, statusFilter, searchQuery, members]);

  // Summary figures
  const totalAmountDue = filteredPayments.reduce((acc, p) => acc + p.amountDue, 0);
  const totalAmountPaid = filteredPayments.reduce((acc, p) => acc + p.amountPaid, 0);
  const totalPendingAmount = totalAmountDue - totalAmountPaid;
  const pendingCount = filteredPayments.filter((p) => p.status !== 'Paid').length;
  const paidCount = filteredPayments.filter((p) => p.status === 'Paid').length;

  const exportCSV = () => {
    const headers = ['Month', 'Member Name', 'Phone', 'Amount Due', 'Amount Paid', 'Due Date', 'Status', 'Payment Method', 'Transaction Ref'];
    const rows = filteredPayments.map((p) => {
      const member = members.find((m) => m.id === p.memberId);
      return [
        `Month ${p.monthNumber}`,
        member?.name || '',
        member?.phone || '',
        p.amountDue,
        p.amountPaid,
        p.dueDate,
        p.status,
        p.paymentMethod || '',
        p.transactionRef || '',
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `chit_ledger_month_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Header with Title & Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--m3-on-surface)] tracking-tight">Payments & Collections Ledger</h2>
          <p className="text-xs text-[var(--m3-on-surface-variant)] mt-0.5">
            Track member installments, manage payment methods, issue receipts, and dispatch reminders
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {pendingCount > 0 && (
            <button
              onClick={() => onBatchWhatsAppReminders(filteredPayments.filter((p) => p.status !== 'Paid'))}
              className="m3-btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Remind All Pending ({pendingCount})</span>
            </button>
          )}

          <button
            onClick={exportCSV}
            className="m3-btn-outlined px-3.5 py-2 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="m3-card p-4 space-y-3 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Member */}
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--m3-on-surface-variant)] absolute left-3.5 top-2.5 opacity-70" />
            <input
              type="text"
              placeholder="Search member name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-[var(--m3-surface-container-low)] border border-[var(--m3-outline-variant)] rounded-full text-xs text-[var(--m3-on-surface)] placeholder:text-[var(--m3-on-surface-variant)]/60 focus:outline-none focus:border-[var(--m3-primary)] transition-all"
            />
          </div>

          {/* Month Segmented / Dropdown */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-[var(--m3-on-surface-variant)] mr-1 hidden sm:inline font-medium">Cycle:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full px-3.5 py-2 bg-[var(--m3-surface-container-low)] border border-[var(--m3-outline-variant)] rounded-full text-xs text-[var(--m3-on-surface)] font-mono focus:outline-none focus:border-[var(--m3-primary)]"
            >
              <option value="all">All Months</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  Month {m} {m === group.currentMonth ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-[var(--m3-on-surface-variant)] mr-1 hidden sm:inline font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3.5 py-2 bg-[var(--m3-surface-container-low)] border border-[var(--m3-outline-variant)] rounded-full text-xs text-[var(--m3-on-surface)] focus:outline-none focus:border-[var(--m3-primary)]"
            >
              <option value="all">All Statuses</option>
              <option value="Pending">Pending Only</option>
              <option value="Upcoming3Days">Due in ≤ 3 Days</option>
              <option value="Overdue">Overdue Only</option>
              <option value="Paid">Paid Only</option>
            </select>
          </div>

          {/* Metric Pill Bar */}
          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs font-mono bg-[var(--m3-surface-container-low)] px-4 py-2 rounded-full border border-[var(--m3-outline-variant)]">
            <div>
              <span className="text-[var(--m3-on-surface-variant)] text-[10px] block opacity-75">Collected</span>
              <span className="text-[var(--m3-primary)] font-bold">{formatCurrency(totalAmountPaid)}</span>
            </div>
            <div className="h-6 w-px bg-[var(--m3-outline-variant)]" />
            <div>
              <span className="text-[var(--m3-on-surface-variant)] text-[10px] block opacity-75">Pending</span>
              <span className="text-amber-600 dark:text-amber-400 font-bold">{formatCurrency(totalPendingAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="m3-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--m3-surface-container-low)] text-[var(--m3-on-surface-variant)] uppercase font-mono text-[10px] border-b border-[var(--m3-outline-variant)]">
              <tr>
                <th className="py-3 px-4">Member Name & Contact</th>
                <th className="py-3 px-3">Month</th>
                <th className="py-3 px-3">Amount Due</th>
                <th className="py-3 px-3">Amount Paid</th>
                <th className="py-3 px-3">Due Date & Timeline</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Payment Info</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--m3-outline-variant)]">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[var(--m3-on-surface-variant)] opacity-70">
                    No payment records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => {
                  const member = members.find((m) => m.id === payment.memberId);
                  const isPaid = payment.status === 'Paid';
                  const dueInfo = evaluatePaymentDueStatus(payment.dueDate);

                  return (
                    <tr key={payment.id} className="hover:bg-[var(--m3-surface-container-high)]/50 transition-colors">
                      {/* Member Info */}
                      <td className="py-3.5 px-4">
                        {member ? (
                          <div>
                            <button
                              onClick={() => onSelectMember(member)}
                              className="font-semibold text-[var(--m3-on-surface)] hover:text-[var(--m3-primary)] hover:underline transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>{member.name}</span>
                              <ExternalLink className="w-3 h-3 text-[var(--m3-on-surface-variant)] opacity-60" />
                            </button>
                            <div className="text-[11px] text-[var(--m3-on-surface-variant)] font-mono mt-0.5 flex items-center gap-2 opacity-80">
                              <span>{member.phone}</span>
                              {member.upiId && (
                                <>
                                  <span className="opacity-40">·</span>
                                  <span>{member.upiId}</span>
                                </>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[var(--m3-on-surface-variant)] opacity-60">Unknown Member</span>
                        )}
                      </td>

                      {/* Month */}
                      <td className="py-3.5 px-3 font-mono font-semibold text-[var(--m3-on-surface)]">
                        Month {payment.monthNumber}
                      </td>

                      {/* Amount Due */}
                      <td className="py-3.5 px-3 font-mono font-bold text-[var(--m3-on-surface)]">
                        {formatCurrency(payment.amountDue)}
                      </td>

                      {/* Amount Paid */}
                      <td className="py-3.5 px-3 font-mono">
                        <span className={isPaid ? 'text-[var(--m3-primary)] font-bold' : 'text-[var(--m3-on-surface-variant)] opacity-60'}>
                          {formatCurrency(payment.amountPaid)}
                        </span>
                      </td>

                      {/* Due Date & Status */}
                      <td className="py-3.5 px-3">
                        <div className="text-[var(--m3-on-surface)] font-medium">{formatDate(payment.dueDate)}</div>
                        <div className="text-[10px] mt-0.5">
                          {isPaid ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Paid on {formatDate(payment.paidDate || '')}</span>
                          ) : dueInfo.isOverdue ? (
                            <span className="text-rose-600 dark:text-rose-400 font-bold">Overdue by {Math.abs(dueInfo.daysRemaining)} days</span>
                          ) : dueInfo.isDueToday ? (
                            <span className="text-amber-600 dark:text-amber-400 font-bold">Due Today</span>
                          ) : (
                            <span className={dueInfo.isUpcoming3Days ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-[var(--m3-on-surface-variant)] opacity-80'}>
                              {dueInfo.daysRemaining} days remaining
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">
                        {isPaid ? (
                          <span className="m3-status-paid inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3" />
                            <span>Paid</span>
                          </span>
                        ) : dueInfo.isOverdue ? (
                          <span className="m3-status-overdue inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                            <AlertCircle className="w-3 h-3" />
                            <span>Overdue</span>
                          </span>
                        ) : dueInfo.isUpcoming3Days ? (
                          <span className="m3-status-pending inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" />
                            <span>Due in ≤ 3d</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-[var(--m3-on-surface-variant)] px-2.5 py-0.5 rounded-full bg-[var(--m3-surface-container-high)] border border-[var(--m3-outline-variant)]">
                            <span>Pending</span>
                          </span>
                        )}
                      </td>

                      {/* Payment Method / Txn Ref */}
                      <td className="py-3.5 px-3 text-[11px]">
                        {isPaid ? (
                          <div>
                            <span className="text-[var(--m3-on-surface)] font-medium">{payment.paymentMethod || 'UPI'}</span>
                            {payment.transactionRef && (
                              <p className="text-[10px] text-[var(--m3-on-surface-variant)] font-mono opacity-80">{payment.transactionRef}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[var(--m3-on-surface-variant)] opacity-50">-</span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPaid ? (
                            <button
                              onClick={() => onOpenReceipt(payment)}
                              className="m3-btn-tonal px-3 py-1 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                              title="Generate Official Receipt"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Receipt</span>
                            </button>
                          ) : (
                            <>
                              {member && (
                                <a
                                  href={buildWhatsAppReminderUrl({
                                    memberName: member.name,
                                    phone: member.phone,
                                    amountDue: payment.amountDue - payment.amountPaid,
                                    monthNumber: payment.monthNumber,
                                    dueDate: formatDate(payment.dueDate),
                                    chitName: group.name,
                                    upiId: 'admin@okaxis',
                                  })}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1 transition-colors"
                                  title="Send Pre-filled WhatsApp Reminder"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>WhatsApp</span>
                                </a>
                              )}

                              <button
                                onClick={() => onOpenPaymentModal(payment)}
                                className="m3-btn-primary px-3 py-1 text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                              >
                                <Check className="w-3 h-3" />
                                <span>Record Pay</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
