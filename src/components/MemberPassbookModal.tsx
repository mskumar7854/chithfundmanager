import React from 'react';
import { 
  X, 
  User, 
  Phone, 
  Calendar, 
  CreditCard, 
  Send, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Award,
  IndianRupee,
  BarChart3
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { Auction, ChitGroup, Member, Payment } from '../types/chit';
import { evaluatePaymentDueStatus, formatCurrency, formatDate } from '../utils/calculations';
import { buildWhatsAppReminderUrl } from '../utils/notifications';

interface MemberPassbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  group: ChitGroup;
  payments: Payment[];
  auctions: Auction[];
  onOpenReceipt: (payment: Payment) => void;
  onOpenPaymentModal: (payment: Payment) => void;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    payload: {
      month: string;
      monthName: string;
      amountPaid: number;
      amountDue: number;
      status: string;
    };
  }>;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const diff = data.amountDue - data.amountPaid;
    return (
      <div className="bg-[var(--m3-surface-container)] border border-[var(--m3-outline-variant)] p-3 rounded-xl shadow-xl text-xs font-sans min-w-[170px] space-y-1.5 backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-[var(--m3-outline-variant)] pb-1.5">
          <span className="font-bold text-[var(--m3-on-surface)]">{data.monthName}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
            data.status === 'Paid'
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
          }`}>
            {data.status}
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-[var(--m3-on-surface-variant)] text-[11px]">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#94a3b8]" />
              <span>Due Amount:</span>
            </span>
            <span className="font-mono font-bold text-[var(--m3-on-surface)]">
              {formatCurrency(data.amountDue)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-[var(--m3-on-surface-variant)] text-[11px]">
              <span className="w-2.5 h-2.5 rounded-xs bg-[var(--m3-primary)]" />
              <span>Amount Paid:</span>
            </span>
            <span className="font-mono font-bold text-[var(--m3-primary)]">
              {formatCurrency(data.amountPaid)}
            </span>
          </div>

          {diff > 0 && (
            <div className="flex items-center justify-between gap-3 pt-1 border-t border-[var(--m3-outline-variant)] text-rose-600 dark:text-rose-400">
              <span className="text-[10px] font-semibold">Shortfall / Due:</span>
              <span className="font-mono font-bold text-[11px]">{formatCurrency(diff)}</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export const MemberPassbookModal: React.FC<MemberPassbookModalProps> = ({
  isOpen,
  onClose,
  member,
  group,
  payments,
  auctions,
  onOpenReceipt,
  onOpenPaymentModal,
}) => {
  if (!isOpen || !member) return null;

  // Payments for this member
  const memberPayments = payments.filter((p) => p.memberId === member.id).sort((a, b) => a.monthNumber - b.monthNumber);
  const totalPaid = memberPayments.reduce((acc, p) => acc + p.amountPaid, 0);
  const totalDue = memberPayments.reduce((acc, p) => acc + p.amountDue, 0);
  const currentPending = totalDue - totalPaid;

  // Auction won by this member (if any)
  const wonAuction = auctions.find((a) => a.winnerId === member.id);
  const totalReceived = wonAuction ? wonAuction.winnerPayout : 0;
  const netPosition = totalReceived - totalPaid;

  // Completed auctions and dividend yield calculations
  const completedAuctions = auctions.filter((a) => a.status === 'completed' || a.winningBid > 0);
  const elapsedMonths = Math.max(1, completedAuctions.length);
  const totalDividendsReceived = completedAuctions.reduce((acc, a) => acc + a.dividendPerMember, 0);
  const effectiveContributions = totalDue > 0 ? totalDue : (group.monthlyBaseShare * elapsedMonths - totalDividendsReceived);
  const roiPercentage = effectiveContributions > 0 ? Number(((totalDividendsReceived / effectiveContributions) * 100).toFixed(2)) : 0;
  const annualYield = Number((roiPercentage * (12 / elapsedMonths)).toFixed(2));

  // Pending payment
  const pendingPayment = memberPayments.find((p) => p.status !== 'Paid');

  // Data for recharts trend visualization
  const chartData = memberPayments.map((p) => ({
    month: `M${p.monthNumber}`,
    monthName: `Month ${p.monthNumber}`,
    'Amount Paid': p.amountPaid,
    'Due Amount': p.amountDue,
    amountPaid: p.amountPaid,
    amountDue: p.amountDue,
    status: p.status,
  }));

  const fulfillmentPercentage = totalDue > 0 ? Math.min(100, Math.round((totalPaid / totalDue) * 100)) : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="m3-dialog w-full max-w-3xl overflow-hidden my-6">
        {/* Header */}
        <div className="p-5 border-b border-[var(--m3-outline-variant)] flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)] flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-[var(--m3-on-surface)]">{member.name}</h2>
                {member.hasWonAuction && (
                  <span className="m3-chip-selected text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Won Month {member.wonMonth}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--m3-on-surface-variant)] flex items-center gap-2 mt-0.5">
                <span>{member.phone}</span>
                {member.upiId && (
                  <>
                    <span className="opacity-40">·</span>
                    <span className="font-mono opacity-80">{member.upiId}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {pendingPayment && (
              <a
                href={buildWhatsAppReminderUrl({
                  memberName: member.name,
                  phone: member.phone,
                  amountDue: pendingPayment.amountDue - pendingPayment.amountPaid,
                  monthNumber: pendingPayment.monthNumber,
                  dueDate: formatDate(pendingPayment.dueDate),
                  chitName: group.name,
                  upiId: 'admin@okaxis',
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">WhatsApp</span> Reminder
              </a>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-[var(--m3-on-surface-variant)] hover:text-[var(--m3-on-surface)] hover:bg-[var(--m3-surface-container-highest)] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Passbook Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[72vh] overflow-y-auto">
          {/* Lifetime Account Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[var(--m3-surface-container-low)] p-3.5 rounded-2xl border border-[var(--m3-outline-variant)]">
              <span className="text-[11px] text-[var(--m3-on-surface-variant)] opacity-80">Total Contributed</span>
              <p className="text-lg font-bold font-mono text-[var(--m3-on-surface)] mt-1">
                {formatCurrency(totalPaid)}
              </p>
              <span className="text-[10px] text-[var(--m3-on-surface-variant)] opacity-60">
                {memberPayments.filter(p => p.status === 'Paid').length} installments paid
              </span>
            </div>

            <div className="bg-[var(--m3-surface-container-low)] p-3.5 rounded-2xl border border-[var(--m3-outline-variant)]">
              <span className="text-[11px] text-[var(--m3-on-surface-variant)] opacity-80">Total Dividends</span>
              <p className="text-lg font-bold font-mono text-[var(--m3-primary)] mt-1">
                +{formatCurrency(totalDividendsReceived)}
              </p>
              <span className="text-[10px] text-[var(--m3-on-surface-variant)] opacity-60">
                Across {elapsedMonths} cycle(s)
              </span>
            </div>

            <div className="bg-[var(--m3-surface-container-low)] p-3.5 rounded-2xl border border-[var(--m3-outline-variant)]">
              <span className="text-[11px] text-[var(--m3-on-surface-variant)] opacity-80">Annualized Yield</span>
              <p className="text-lg font-bold font-mono text-[var(--m3-primary)] mt-1">
                {annualYield}% <span className="text-xs font-sans font-normal opacity-70">p.a.</span>
              </p>
              <span className="text-[10px] text-[var(--m3-on-surface-variant)] opacity-60">
                {roiPercentage}% simple ROI
              </span>
            </div>

            <div className="bg-[var(--m3-surface-container-low)] p-3.5 rounded-2xl border border-[var(--m3-outline-variant)]">
              <span className="text-[11px] text-[var(--m3-on-surface-variant)] opacity-80">Net Position</span>
              <p className={`text-lg font-bold font-mono mt-1 ${netPosition >= 0 ? 'text-[var(--m3-primary)]' : 'text-[var(--m3-on-surface)]'}`}>
                {netPosition >= 0 ? `+${formatCurrency(netPosition)}` : formatCurrency(netPosition)}
              </p>
              <span className="text-[10px] text-[var(--m3-on-surface-variant)] opacity-60">
                {wonAuction ? 'Prized pot received' : 'Accumulating savings'}
              </span>
            </div>
          </div>

          {/* Won Auction Highlights (if member won) */}
          {wonAuction && (
            <div className="bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)] border border-[var(--m3-primary)]/20 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs">
                <Award className="w-4 h-4" />
                <span>Auction Won in Month {wonAuction.monthNumber}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                <div>
                  <span className="opacity-80">Winning Bid:</span>
                  <p className="font-mono text-rose-600 dark:text-rose-300 font-bold">{formatCurrency(wonAuction.winningBid)}</p>
                </div>
                <div>
                  <span className="opacity-80">Organizer Fee:</span>
                  <p className="font-mono text-amber-600 dark:text-amber-300 font-bold">{formatCurrency(wonAuction.organizerFee)}</p>
                </div>
                <div>
                  <span className="opacity-80">Net Payout:</span>
                  <p className="font-mono font-bold">{formatCurrency(wonAuction.winnerPayout)}</p>
                </div>
                <div>
                  <span className="opacity-80">Disbursed Date:</span>
                  <p className="font-medium">{formatDate(wonAuction.payoutDisbursedDate || wonAuction.date)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Visual Trend Chart: Amount Paid vs Due Amount per Month */}
          <div className="bg-[var(--m3-surface-container-low)] p-4 sm:p-5 rounded-2xl border border-[var(--m3-outline-variant)] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)] flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-[var(--m3-primary)]" />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--m3-on-surface)] text-sm">
                    Payment History Trends
                  </h3>
                  <p className="text-[11px] text-[var(--m3-on-surface-variant)]">
                    Monthly comparison: Amount Paid vs Due Amount
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs flex-wrap">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--m3-surface-container)] border border-[var(--m3-outline-variant)]">
                  <span className="text-[var(--m3-on-surface-variant)] text-[11px]">Collection Rate:</span>
                  <span className={`font-mono font-bold ${fulfillmentPercentage === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {fulfillmentPercentage}%
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-[11px]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#94a3b8]" />
                    <span className="text-[var(--m3-on-surface-variant)]">Due Amount</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[var(--m3-primary)]" />
                    <span className="text-[var(--m3-on-surface-variant)]">Amount Paid</span>
                  </span>
                </div>
              </div>
            </div>

            {chartData.length > 0 ? (
              <div className="w-full h-56 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    barGap={4}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--m3-outline-variant)" opacity={0.6} />
                    <XAxis
                      dataKey="month"
                      stroke="var(--m3-on-surface-variant)"
                      tick={{ fill: 'var(--m3-on-surface-variant)', fontSize: 11, fontWeight: 500 }}
                      axisLine={{ stroke: 'var(--m3-outline-variant)' }}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="var(--m3-on-surface-variant)"
                      tick={{ fill: 'var(--m3-on-surface-variant)', fontSize: 10 }}
                      axisLine={{ stroke: 'var(--m3-outline-variant)' }}
                      tickLine={false}
                      tickFormatter={(val) => `₹${val >= 1000 ? `${Math.round(val / 1000)}k` : val}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="amountDue"
                      name="Due Amount"
                      fill="#94a3b8"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={30}
                    />
                    <Bar
                      dataKey="amountPaid"
                      name="Amount Paid"
                      fill="var(--m3-primary)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={30}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-[var(--m3-on-surface-variant)] bg-[var(--m3-surface-container)] rounded-xl border border-[var(--m3-outline-variant)]">
                No installment records available to render trend graph.
              </div>
            )}
          </div>

          {/* Detailed Statement of Payments */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[var(--m3-on-surface)] text-sm">Monthly Installment History</h3>
              {currentPending > 0 && (
                <span className="text-xs text-amber-600 dark:text-amber-400 font-mono font-bold">
                  Outstanding: {formatCurrency(currentPending)}
                </span>
              )}
            </div>

            <div className="bg-[var(--m3-surface-container-low)] border border-[var(--m3-outline-variant)] rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--m3-surface-container)] text-[var(--m3-on-surface-variant)] uppercase font-mono text-[10px] border-b border-[var(--m3-outline-variant)]">
                  <tr>
                    <th className="py-2.5 px-3">Month</th>
                    <th className="py-2.5 px-3">Amount Due</th>
                    <th className="py-2.5 px-3">Amount Paid</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--m3-outline-variant)] font-mono">
                  {memberPayments.map((p) => {
                    const isPaid = p.status === 'Paid';
                    const dueInfo = evaluatePaymentDueStatus(p.dueDate);

                    return (
                      <tr key={p.id} className="hover:bg-[var(--m3-surface-container-high)]/40 transition-colors">
                        <td className="py-3 px-3 font-bold text-[var(--m3-on-surface)]">Month {p.monthNumber}</td>
                        <td className="py-3 px-3 text-[var(--m3-on-surface)] font-bold">{formatCurrency(p.amountDue)}</td>
                        <td className="py-3 px-3">
                          <span className={isPaid ? 'text-[var(--m3-primary)] font-bold' : 'text-[var(--m3-on-surface-variant)] opacity-60'}>
                            {formatCurrency(p.amountPaid)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[var(--m3-on-surface-variant)] font-sans">
                          {formatDate(p.dueDate)}
                        </td>
                        <td className="py-3 px-3 font-sans">
                          {isPaid ? (
                            <span className="m3-status-paid text-[11px] inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full">
                              <CheckCircle className="w-3 h-3" />
                              <span>Paid ({p.paymentMethod || 'UPI'})</span>
                            </span>
                          ) : (
                            <span className={`text-[11px] inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full ${
                              dueInfo.isOverdue ? 'm3-status-overdue' : 'm3-status-pending'
                            }`}>
                              <Clock className="w-3 h-3" />
                              <span>{dueInfo.isOverdue ? 'Overdue' : 'Pending'}</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-sans">
                          {isPaid ? (
                            <button
                              onClick={() => onOpenReceipt(p)}
                              className="m3-btn-tonal p-1 px-2.5 rounded-full text-xs inline-flex items-center gap-1 cursor-pointer"
                            >
                              <FileText className="w-3 h-3" />
                              <span>Receipt</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => onOpenPaymentModal(p)}
                              className="m3-btn-primary p-1 px-3 rounded-full text-xs font-bold inline-flex items-center gap-1 cursor-pointer shadow-xs"
                            >
                              Pay
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--m3-outline-variant)] flex justify-end">
          <button
            onClick={onClose}
            className="m3-btn-outlined px-4 py-2 text-xs font-medium cursor-pointer"
          >
            Close Passbook
          </button>
        </div>
      </div>
    </div>
  );
};
