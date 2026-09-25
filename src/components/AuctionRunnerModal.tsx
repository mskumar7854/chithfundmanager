import React, { useState } from 'react';
import { 
  Gavel, 
  X, 
  AlertTriangle, 
  Sparkles, 
  CheckCircle2, 
  Zap, 
  ArrowRight,
  Info,
  Calendar,
  IndianRupee,
  ShieldCheck
} from 'lucide-react';
import { ChitGroup, Member, Auction, Payment, WebhookLog } from '../types/chit';
import { calculateAuctionBreakdown, formatCurrency, formatDate } from '../utils/calculations';
import { sendBrowserNotification, playNotificationTone } from '../utils/notifications';

interface AuctionRunnerModalProps {
  isOpen?: boolean;
  group: ChitGroup;
  members: Member[];
  auctions?: Auction[];
  onClose: () => void;
  onCompleteAuction: (auction: Auction, newPayments: Payment[], webhookLog: WebhookLog) => void;
  soundEnabled?: boolean;
}

export const AuctionRunnerModal: React.FC<AuctionRunnerModalProps> = ({
  isOpen = true,
  group,
  members,
  auctions = [],
  onClose,
  onCompleteAuction,
  soundEnabled = true,
}) => {
  if (!isOpen) return null;

  // Determine next month number
  const completedMonths = auctions.map((a) => a.monthNumber);
  const nextMonthNumber = completedMonths.length > 0 
    ? Math.max(...completedMonths) + 1 
    : (group.currentMonth || 1);

  const [monthNumber, setMonthNumber] = useState<number>(Math.min(nextMonthNumber, group.durationMonths));
  const [selectedWinnerId, setSelectedWinnerId] = useState<string>('');
  const [winningBid, setWinningBid] = useState<number>(10000);
  const [auctionDate, setAuctionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentDueDate, setPaymentDueDate] = useState<string>(
    new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>('');
  const [allowRepeatWinner, setAllowRepeatWinner] = useState<boolean>(false);

  // Eligible members (members who haven't won yet, unless repeat is enabled)
  const eligibleMembers = members.filter((m) => allowRepeatWinner || !m.hasWonAuction);
  const selectedWinner = members.find((m) => m.id === selectedWinnerId);

  // Dynamic calculations
  const calc = calculateAuctionBreakdown({
    totalPot: group.totalPot,
    memberCount: group.memberCount,
    winningBid: winningBid,
    organizerFee: group.organizerFee,
  });

  const handleExecuteAuction = () => {
    if (!selectedWinnerId || !calc.isValid) return;

    const newAuctionId = `auc-month-${monthNumber}-${Date.now()}`;
    const newAuction: Auction = {
      id: newAuctionId,
      groupId: group.id,
      monthNumber: monthNumber,
      date: auctionDate,
      winnerId: selectedWinnerId,
      winningBid: winningBid,
      organizerFee: calc.organizerFee,
      dividendPool: calc.dividendPool,
      dividendPerMember: calc.dividendPerMember,
      winnerPayout: calc.winnerPayout,
      effectiveMonthlyDue: calc.effectiveMonthlyDue,
      status: 'completed',
      payoutStatus: 'Pending',
      notes: notes.trim() || undefined,
    };

    // Auto-generate member payment records for this month
    const newPayments: Payment[] = members.map((member) => ({
      id: `pay-m${monthNumber}-${member.id}-${Date.now()}`,
      groupId: group.id,
      monthNumber: monthNumber,
      memberId: member.id,
      amountDue: calc.effectiveMonthlyDue,
      amountPaid: 0,
      dueDate: paymentDueDate,
      status: 'Pending',
    }));

    // Trigger simulated webhook notification
    const webhookLog: WebhookLog = {
      id: `wh-${Date.now()}`,
      timestamp: new Date().toISOString(),
      event: 'auction.completed',
      title: `Auction Month ${monthNumber} Completed`,
      details: `${selectedWinner?.name || 'Member'} won with winning discount bid of ${formatCurrency(winningBid)}. Payout: ${formatCurrency(calc.winnerPayout)}.`,
      status: 'success',
      payload: {
        auctionId: newAuctionId,
        groupId: group.id,
        groupName: group.name,
        monthNumber,
        winnerName: selectedWinner?.name,
        winningBid,
        organizerFee: calc.organizerFee,
        dividendPool: calc.dividendPool,
        effectiveMonthlyDue: calc.effectiveMonthlyDue,
        winnerPayout: calc.winnerPayout,
        recordsGenerated: newPayments.length,
      },
    };

    if (soundEnabled) {
      playNotificationTone('auction');
    }

    sendBrowserNotification(
      `🎉 Month ${monthNumber} Auction Completed!`,
      `${selectedWinner?.name} won with ₹${winningBid.toLocaleString('en-IN')} bid. New monthly installment is ₹${calc.effectiveMonthlyDue.toLocaleString('en-IN')}.`
    );

    onCompleteAuction(newAuction, newPayments, webhookLog);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="m3-dialog w-full max-w-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[var(--m3-outline-variant)] flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)] flex items-center justify-center font-bold">
              <Gavel className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--m3-on-surface)]">Run Monthly Reverse Auction</h2>
              <p className="text-xs text-[var(--m3-on-surface-variant)] mt-0.5">
                Automated dividend calculation, {formatCurrency(group.organizerFee)} organizer adjustment, and ledger generator
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-[var(--m3-on-surface-variant)] hover:text-[var(--m3-on-surface)] hover:bg-[var(--m3-surface-container-highest)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[72vh] overflow-y-auto">
          {/* Cycle & Winner Select */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--m3-on-surface)] mb-1.5">
                Chit Month Number (1 - {group.durationMonths})
              </label>
              <select
                value={monthNumber}
                onChange={(e) => setMonthNumber(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-[var(--m3-surface-container-lowest)] border border-[var(--m3-outline-variant)] rounded-xl text-xs text-[var(--m3-on-surface)] focus:outline-none focus:border-[var(--m3-primary)] font-mono"
              >
                {Array.from({ length: group.durationMonths }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    Month {m} {m === group.currentMonth ? '(Current)' : m === nextMonthNumber ? '(Next)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--m3-on-surface)] mb-1.5">
                Auction Date
              </label>
              <input
                type="date"
                value={auctionDate}
                onChange={(e) => setAuctionDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[var(--m3-surface-container-lowest)] border border-[var(--m3-outline-variant)] rounded-xl text-xs text-[var(--m3-on-surface)] focus:outline-none focus:border-[var(--m3-primary)] font-mono"
              />
            </div>
          </div>

          {/* Winner Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-[var(--m3-on-surface)]">
                Winning Member (Bidding Winner)
              </label>
              <button
                type="button"
                onClick={() => setAllowRepeatWinner(!allowRepeatWinner)}
                className="text-[11px] text-[var(--m3-primary)] hover:underline cursor-pointer font-medium"
              >
                {allowRepeatWinner ? 'Show Only Unwon' : 'Show All Members (Override)'}
              </button>
            </div>

            <select
              value={selectedWinnerId}
              onChange={(e) => setSelectedWinnerId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[var(--m3-surface-container-lowest)] border border-[var(--m3-outline-variant)] rounded-xl text-xs text-[var(--m3-on-surface)] focus:outline-none focus:border-[var(--m3-primary)]"
            >
              <option value="">-- Choose Winning Member --</option>
              {members
                .filter((m) => allowRepeatWinner || !m.hasWonAuction)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.phone}) {m.hasWonAuction ? `[Already won Month ${m.wonMonth}]` : '• Eligible'}
                  </option>
                ))}
            </select>

            {eligibleMembers.length === 0 && !allowRepeatWinner && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                All members have won! Turn on &ldquo;Show All Members&rdquo; if repeating turns.
              </p>
            )}
          </div>

          {/* Winning Bid Input */}
          <div className="bg-[var(--m3-surface-container-low)] p-4 rounded-2xl border border-[var(--m3-outline-variant)] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[var(--m3-on-surface)]">
                Winning Bid Amount (Discount sacrificed to take the pot)
              </label>
              <div className="text-lg font-bold font-mono text-[var(--m3-primary)]">
                {formatCurrency(winningBid)}
              </div>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-[var(--m3-on-surface-variant)] font-mono opacity-70">₹</span>
              <input
                type="number"
                step="500"
                min={group.organizerFee}
                max={group.totalPot - 1000}
                value={winningBid}
                onChange={(e) => setWinningBid(Number(e.target.value))}
                className="w-full pl-8 pr-4 py-2.5 bg-[var(--m3-surface-container-lowest)] border border-[var(--m3-outline-variant)] rounded-xl text-[var(--m3-on-surface)] font-mono text-base focus:outline-none focus:border-[var(--m3-primary)]"
                placeholder="10000"
              />
            </div>

            {/* Quick Bid Preset Chips */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-[var(--m3-on-surface-variant)] font-medium">Common Bids:</span>
              {[7000, 8500, 10000, 11500, 13000].map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setWinningBid(preset)}
                  className={`px-3 py-1 rounded-full text-xs font-mono transition-colors cursor-pointer ${
                    winningBid === preset
                      ? 'm3-chip-selected font-bold shadow-xs'
                      : 'bg-[var(--m3-surface-container-high)] hover:bg-[var(--m3-surface-container-highest)] text-[var(--m3-on-surface-variant)] border border-[var(--m3-outline-variant)]'
                  }`}
                >
                  ₹{preset.toLocaleString('en-IN')}
                </button>
              ))}
            </div>

            {!calc.isValid && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{calc.errorMessage}</span>
              </div>
            )}
          </div>

          {/* Mathematical Proof Card */}
          <div className="bg-[var(--m3-surface-container-low)] border border-[var(--m3-outline-variant)] rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--m3-outline-variant)] pb-2.5">
              <span className="text-xs font-bold text-[var(--m3-on-surface)] uppercase tracking-wide">
                Automated Calculation Breakdown
              </span>
              <span className="text-[11px] text-[var(--m3-primary)] font-mono font-bold">Formula Verified</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[var(--m3-on-surface-variant)] opacity-80">Total Pot:</span>
                <p className="font-mono font-bold text-[var(--m3-on-surface)] mt-0.5">{formatCurrency(group.totalPot)}</p>
              </div>

              <div>
                <span className="text-[var(--m3-on-surface-variant)] opacity-80">Winning Bid:</span>
                <p className="font-mono font-bold text-rose-600 dark:text-rose-400 mt-0.5">-{formatCurrency(winningBid)}</p>
              </div>

              <div>
                <span className="text-amber-600 dark:text-amber-400 font-medium">Organizer Fee:</span>
                <p className="font-mono font-bold text-amber-600 dark:text-amber-400 mt-0.5">{formatCurrency(calc.organizerFee)}</p>
                <span className="text-[10px] text-[var(--m3-on-surface-variant)] opacity-60">Auto-adjusted</span>
              </div>

              <div>
                <span className="text-[var(--m3-on-surface-variant)] opacity-80">Dividend Pool:</span>
                <p className="font-mono font-bold text-[var(--m3-primary)] mt-0.5">{formatCurrency(calc.dividendPool)}</p>
                <span className="text-[10px] text-[var(--m3-on-surface-variant)] opacity-60">Bid - Fee</span>
              </div>

              <div>
                <span className="text-[var(--m3-on-surface-variant)] opacity-80">Discount / Member:</span>
                <p className="font-mono font-bold text-[var(--m3-on-surface)] mt-0.5">{formatCurrency(calc.dividendPerMember)}</p>
                <span className="text-[10px] text-[var(--m3-on-surface-variant)] opacity-60">Pool ÷ {group.memberCount}</span>
              </div>

              <div className="bg-[var(--m3-primary-container)] p-2.5 rounded-xl border border-[var(--m3-primary)]/20 text-[var(--m3-on-primary-container)]">
                <span className="font-semibold text-[11px]">Winner Net Payout:</span>
                <p className="font-mono font-bold text-sm mt-0.5">{formatCurrency(calc.winnerPayout)}</p>
                <span className="text-[10px] opacity-75">Pot - Winning Bid</span>
              </div>
            </div>

            {/* Next Month Installment Result Box */}
            <div className="p-3.5 bg-[var(--m3-surface-container-high)] rounded-xl border border-[var(--m3-outline-variant)] flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-xs text-[var(--m3-on-surface-variant)]">Each Member&apos;s Payment Due for Month {monthNumber}:</span>
                <div className="text-lg font-bold font-mono text-[var(--m3-primary)]">
                  {formatCurrency(calc.effectiveMonthlyDue)}
                </div>
              </div>
              <div className="text-right text-[11px] text-[var(--m3-on-surface-variant)] opacity-80">
                <span>Base share: {formatCurrency(group.monthlyBaseShare)}</span>
                <br />
                <span className="text-[var(--m3-primary)] font-medium">- {formatCurrency(calc.dividendPerMember)} dividend</span>
              </div>
            </div>

            <div className="text-[11px] text-[var(--m3-on-surface-variant)] bg-[var(--m3-surface-container)] p-3 rounded-xl flex items-start gap-2 border border-[var(--m3-outline-variant)]">
              <Info className="w-3.5 h-3.5 text-[var(--m3-primary)] shrink-0 mt-0.5" />
              <span>
                <strong>Note:</strong> The winning member receives <strong>{formatCurrency(calc.winnerPayout)}</strong> payout, and still pays their <strong>{formatCurrency(calc.effectiveMonthlyDue)}</strong> monthly installment for Month {monthNumber}.
              </span>
            </div>
          </div>

          {/* Payment Due Date for New Installment Cycle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--m3-on-surface)] mb-1.5">
                Installment Due Date for Month {monthNumber}
              </label>
              <input
                type="date"
                value={paymentDueDate}
                onChange={(e) => setPaymentDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[var(--m3-surface-container-lowest)] border border-[var(--m3-outline-variant)] rounded-xl text-xs text-[var(--m3-on-surface)] focus:outline-none focus:border-[var(--m3-primary)] font-mono"
              />
              <p className="text-[11px] text-[var(--m3-on-surface-variant)] opacity-70 mt-1">
                The 8:00 AM Cron engine alerts for dues 3 days before this date.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--m3-on-surface)] mb-1.5">
                Auction Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Disbursing via RTGS on Friday"
                className="w-full px-3.5 py-2.5 bg-[var(--m3-surface-container-lowest)] border border-[var(--m3-outline-variant)] rounded-xl text-xs text-[var(--m3-on-surface)] focus:outline-none focus:border-[var(--m3-primary)]"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[var(--m3-outline-variant)] flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="m3-btn-outlined px-4 py-2 cursor-pointer text-xs"
          >
            Cancel
          </button>

          <button
            onClick={handleExecuteAuction}
            disabled={!selectedWinnerId || !calc.isValid}
            className="m3-btn-primary px-5 py-2.5 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Gavel className="w-4 h-4" />
            <span>Execute Auction & Generate Dues</span>
          </button>
        </div>
      </div>
    </div>
  );
};
