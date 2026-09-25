import React, { useState } from 'react';
import { 
  IndianRupee, 
  TrendingUp, 
  AlertCircle, 
  Users, 
  Clock, 
  CheckCircle, 
  ChevronRight, 
  Calendar,
  Send,
  Sparkles,
  Gavel,
  ShieldCheck,
  FileText,
  CreditCard,
  Percent,
  ArrowUpRight,
  Edit2
} from 'lucide-react';
import { ChitGroup, Member, Auction, Payment } from '../types/chit';
import { 
  formatCurrency, 
  formatDate, 
  calculateAuctionBreakdown, 
  evaluatePaymentDueStatus,
  getUpcomingAuctionInfo 
} from '../utils/calculations';
import { buildWhatsAppReminderUrl } from '../utils/notifications';
import { RoiCalculator } from './RoiCalculator';

interface DashboardOverviewProps {
  group: ChitGroup;
  members: Member[];
  auctions: Auction[];
  payments: Payment[];
  onOpenAuctionRunner: () => void;
  onOpenPaymentModal: (payment?: Payment) => void;
  onSelectMember: (member: Member) => void;
  onNavigateToTab: (tab: string) => void;
  onRunCronScan: () => void;
  onOpenReceipt: (payment: Payment) => void;
  onOpenCreatePlanModal?: () => void;
  onOpenEditPlanModal?: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  group,
  members,
  auctions,
  payments,
  onOpenAuctionRunner,
  onOpenPaymentModal,
  onSelectMember,
  onNavigateToTab,
  onOpenReceipt,
  onOpenCreatePlanModal,
  onOpenEditPlanModal,
}) => {
  // Current month payments
  const currentMonthPayments = payments.filter((p) => p.monthNumber === group.currentMonth);
  const paidCount = currentMonthPayments.filter((p) => p.status === 'Paid').length;
  const pendingPayments = currentMonthPayments.filter((p) => p.status !== 'Paid');
  const pendingAmountThisMonth = pendingPayments.reduce((acc, p) => acc + (p.amountDue - p.amountPaid), 0);
  const totalCollectedThisMonth = currentMonthPayments.reduce((acc, p) => acc + p.amountPaid, 0);
  const totalDueThisMonth = currentMonthPayments.reduce((acc, p) => acc + p.amountDue, 0);

  // All pending payments across all months
  const allPendingPayments = payments.filter((p) => p.status !== 'Paid');
  const totalOutstandingDues = allPendingPayments.reduce((acc, p) => acc + (p.amountDue - p.amountPaid), 0);
  const uniqueMembersWithDues = new Set(allPendingPayments.map((p) => p.memberId)).size;

  // Overdue calculations
  const overduePayments = allPendingPayments.filter((p) => evaluatePaymentDueStatus(p.dueDate).isOverdue);
  const totalOverdueAmount = overduePayments.reduce((acc, p) => acc + (p.amountDue - p.amountPaid), 0);

  // Completed auctions and organizer fee metrics
  const completedAuctions = auctions.filter((a) => a.status === 'completed' || a.winningBid > 0);
  const totalOrganizerFeeEarned = completedAuctions.reduce((acc, a) => acc + a.organizerFee, 0);
  const completedAuctionsCount = completedAuctions.length;
  const projectedTotalOrganizerFee = group.organizerFee * group.durationMonths;
  const organizerFeePercentage = projectedTotalOrganizerFee > 0
    ? Math.round((totalOrganizerFeeEarned / projectedTotalOrganizerFee) * 100)
    : 0;

  // Upcoming auction details
  const upcomingAuction = getUpcomingAuctionInfo(group, auctions, members);

  // Interactive Live Calculator Sandbox on Dashboard
  const [sandboxBid, setSandboxBid] = useState<number>(10000);
  const sandboxCalc = calculateAuctionBreakdown({
    totalPot: group.totalPot,
    memberCount: group.memberCount,
    winningBid: sandboxBid,
    organizerFee: group.organizerFee,
  });

  return (
    <div className="space-y-6">
      {/* Pending Due Warning Banner if members owe money */}
      {pendingPayments.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-amber-900 dark:text-amber-200 text-sm sm:text-base">
                  Action Required: {pendingPayments.length} Members Pending for Month {group.currentMonth}
                </h3>
                <span className="text-xs text-amber-700 dark:text-amber-400 font-mono font-bold">
                  ({formatCurrency(pendingAmountThisMonth)} unpaid)
                </span>
              </div>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-1 max-w-2xl">
                Installments are due by <strong className="text-amber-950 dark:text-amber-100">{group.paymentDueDayOfMonth}th of this month</strong>.
                The automated daily 8:00 AM cron engine monitors members with dues within 3 days.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 flex-wrap">
            <button
              onClick={() => onNavigateToTab('reminders')}
              className="m3-btn-primary px-4 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Review Reminders</span>
            </button>
            <button
              onClick={() => onNavigateToTab('ledger')}
              className="m3-btn-tonal px-3.5 py-2 text-xs font-medium cursor-pointer"
            >
              View Ledger
            </button>
            <button
              onClick={() => {
                const el = document.getElementById('roi-calculator-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="m3-btn-outlined px-3.5 py-2 text-xs font-medium cursor-pointer flex items-center gap-1"
            >
              <Percent className="w-3.5 h-3.5" />
              <span>ROI Calculator</span>
            </button>
          </div>
        </div>
      )}

      {/* Active Scheme Quick Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--m3-surface-container)] p-4 rounded-2xl border border-[var(--m3-outline-variant)] text-xs shadow-xs">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--m3-primary)] animate-pulse"></div>
          <span className="text-[var(--m3-on-surface-variant)]">Active Scheme:</span>
          <strong className="text-[var(--m3-on-surface)] font-bold text-sm">{group.name}</strong>
          <span className="opacity-30">·</span>
          <span className="font-mono text-[var(--m3-primary)] font-bold">{formatCurrency(group.totalPot)} Pot</span>
          <span className="opacity-30 hidden sm:inline">·</span>
          <span className="text-[var(--m3-on-surface)] hidden sm:inline">{group.durationMonths} Months · {group.memberCount} Members</span>
          <span className="opacity-30 hidden md:inline">·</span>
          <span className="text-amber-600 dark:text-amber-400 font-mono hidden md:inline">{formatCurrency(group.organizerFee)}/mo charges</span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenEditPlanModal && (
            <button
              onClick={onOpenEditPlanModal}
              className="m3-btn-outlined px-3 py-1.5 text-xs font-semibold cursor-pointer flex items-center gap-1.5"
              title="Edit parameters, pot amount, schedule, and members of this plan"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Plan</span>
            </button>
          )}
          <button
            onClick={() => onNavigateToTab('plans')}
            className="m3-btn-tonal px-3.5 py-1.5 text-xs font-semibold cursor-pointer"
          >
            All Plans →
          </button>
          {onOpenCreatePlanModal && (
            <button
              onClick={onOpenCreatePlanModal}
              className="m3-btn-primary px-3.5 py-1.5 text-xs font-bold cursor-pointer"
            >
              + Add Plan
            </button>
          )}
        </div>
      </div>

      {/* Small KPI Cards Strip for At-a-Glance Monitoring */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {/* Card 1: Total Chit Pot */}
        <div className="m3-card p-4 flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--m3-on-surface-variant)]">Total Chit Pot</span>
            <div className="p-2 rounded-full bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)]">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-[var(--m3-on-surface)]">{formatCurrency(group.totalPot)}</span>
            <span className="text-[11px] text-[var(--m3-on-surface-variant)] font-sans opacity-75">({group.memberCount} M)</span>
          </div>
          <div className="mt-2.5 text-[11px] text-[var(--m3-on-surface-variant)] flex items-center justify-between pt-2 border-t border-[var(--m3-outline-variant)]">
            <span>Base: <strong className="font-mono text-[var(--m3-on-surface)]">{formatCurrency(group.monthlyBaseShare)}</strong></span>
            <span className="opacity-75">{group.durationMonths} Mo</span>
          </div>
        </div>

        {/* Card 2: Current Month Collection */}
        <div className="m3-card p-4 flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--m3-on-surface-variant)]">Month {group.currentMonth} Collection</span>
            <div className="p-2 rounded-full bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-[var(--m3-primary)]">{formatCurrency(totalCollectedThisMonth)}</span>
            <span className="text-[11px] text-[var(--m3-on-surface-variant)] font-mono opacity-75">/ {formatCurrency(totalDueThisMonth)}</span>
          </div>
          <div className="mt-2.5 space-y-1.5 pt-2 border-t border-[var(--m3-outline-variant)]">
            <div className="w-full bg-[var(--m3-surface-container-high)] h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-[var(--m3-primary)] h-full rounded-full transition-all duration-500"
                style={{ width: `${totalDueThisMonth > 0 ? Math.min(100, (totalCollectedThisMonth / totalDueThisMonth) * 100) : 0}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[var(--m3-on-surface-variant)]">
              <span>{paidCount} of {group.memberCount} Paid</span>
              <span className="font-mono text-[var(--m3-primary)] font-bold">
                {totalDueThisMonth > 0 ? Math.round((totalCollectedThisMonth / totalDueThisMonth) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Total Outstanding Dues */}
        <div 
          onClick={() => onNavigateToTab('reminders')}
          className="m3-card-interactive p-4 flex flex-col justify-between cursor-pointer"
          title="Click to review dues and send automated WhatsApp reminders"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--m3-on-surface-variant)]">Total Outstanding Dues</span>
            <div className={`p-2 rounded-full ${
              totalOutstandingDues > 0 
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400' 
                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            }`}>
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between gap-1">
            <span className={`text-2xl font-bold font-mono ${
              totalOutstandingDues > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {formatCurrency(totalOutstandingDues)}
            </span>
            {totalOutstandingDues > 0 ? (
              <span className="m3-status-overdue text-[10px] font-bold px-2 py-0.5 rounded-full">
                {uniqueMembersWithDues} Pending
              </span>
            ) : (
              <span className="m3-status-paid text-[10px] font-bold px-2 py-0.5 rounded-full">
                All Clear ✓
              </span>
            )}
          </div>
          <div className="mt-2.5 text-[11px] text-[var(--m3-on-surface-variant)] flex items-center justify-between pt-2 border-t border-[var(--m3-outline-variant)]">
            <span className="truncate">
              {totalOverdueAmount > 0 
                ? `${formatCurrency(totalOverdueAmount)} overdue` 
                : pendingAmountThisMonth > 0 
                ? `M${group.currentMonth}: ${formatCurrency(pendingAmountThisMonth)}`
                : 'Zero overdue balance'}
            </span>
            <span className="text-[var(--m3-primary)] font-semibold flex items-center gap-0.5 text-[10px] shrink-0">
              <span>Remind</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 4: Total Organizer Fees Collected */}
        <div 
          onClick={() => onNavigateToTab('auctions')}
          className="m3-card-interactive p-4 flex flex-col justify-between cursor-pointer"
          title="Click to view auction ledger and fee deductions"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--m3-on-surface-variant)]">Total Organizer Fees</span>
            <div className="p-2 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between gap-1">
            <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {formatCurrency(totalOrganizerFeeEarned)}
            </span>
            <span className="m3-status-pending text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
              {organizerFeePercentage}%
            </span>
          </div>
          <div className="mt-2.5 space-y-1.5 pt-2 border-t border-[var(--m3-outline-variant)]">
            <div className="w-full bg-[var(--m3-surface-container-high)] h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, organizerFeePercentage)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[var(--m3-on-surface-variant)]">
              <span>{formatCurrency(group.organizerFee)} × {completedAuctionsCount} cycles</span>
              <span className="opacity-75 font-mono">Max {formatCurrency(projectedTotalOrganizerFee)}</span>
            </div>
          </div>
        </div>

        {/* Card 5: Upcoming Auction Date */}
        <div 
          onClick={onOpenAuctionRunner}
          className="m3-card-interactive p-4 flex flex-col justify-between cursor-pointer"
          title="Click to launch the live reverse auction runner"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--m3-on-surface-variant)]">Upcoming Auction</span>
            <div className="p-2 rounded-full bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)]">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between gap-1">
            <span className="text-lg sm:text-xl font-bold font-mono text-[var(--m3-on-surface)] truncate">
              {upcomingAuction.formattedDate}
            </span>
            <span className="m3-chip-selected text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
              {upcomingAuction.statusBadgeText}
            </span>
          </div>
          <div className="mt-2.5 text-[11px] text-[var(--m3-on-surface-variant)] flex items-center justify-between pt-2 border-t border-[var(--m3-outline-variant)]">
            <span className="truncate">
              Month {upcomingAuction.nextMonthNumber} · {upcomingAuction.eligibleBiddersCount} eligible
            </span>
            <span className="text-[var(--m3-primary)] font-semibold flex items-center gap-0.5 text-[10px] shrink-0">
              <span>Launch</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* 2-Column Section: Live Auction Calculator & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Live Mathematical Auction Sandbox */}
        <div className="lg:col-span-2 m3-card p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--m3-primary)]" />
                <h3 className="font-bold text-[var(--m3-on-surface)] text-base">Auction Math Simulator</h3>
              </div>
              <p className="text-xs text-[var(--m3-on-surface-variant)] mt-0.5">
                Verify the exact Chit Fund algorithm with automatic {formatCurrency(group.organizerFee)} organizer deduction
              </p>
            </div>
            <button
              onClick={onOpenAuctionRunner}
              className="m3-btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Gavel className="w-3.5 h-3.5" />
              <span>Launch Live Auction</span>
            </button>
          </div>

          {/* Bid Input Control */}
          <div className="bg-[var(--m3-surface-container-low)] p-4 rounded-2xl border border-[var(--m3-outline-variant)] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[var(--m3-on-surface)]">
                Simulated Winning Bid (Discount offered by bidder):
              </label>
              <span className="text-lg font-bold font-mono text-[var(--m3-primary)]">
                {formatCurrency(sandboxBid)}
              </span>
            </div>

            <input
              type="range"
              min={group.organizerFee + 500}
              max={25000}
              step={500}
              value={sandboxBid}
              onChange={(e) => setSandboxBid(Number(e.target.value))}
              className="w-full accent-[var(--m3-primary)] bg-[var(--m3-surface-container-high)] h-2 rounded-lg cursor-pointer"
            />

            {/* Quick preset buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-[var(--m3-on-surface-variant)] font-medium">Presets:</span>
              {[6000, 8000, 9000, 10000, 12000, 15000].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setSandboxBid(preset)}
                  className={`px-3 py-1 rounded-full text-xs font-mono transition-all cursor-pointer ${
                    sandboxBid === preset
                      ? 'm3-chip-selected font-bold shadow-xs'
                      : 'bg-[var(--m3-surface-container-high)] hover:bg-[var(--m3-surface-container-highest)] text-[var(--m3-on-surface-variant)] border border-[var(--m3-outline-variant)]'
                  }`}
                >
                  ₹{preset.toLocaleString('en-IN')}
                </button>
              ))}
            </div>
          </div>

          {/* Mathematical Step-by-Step Breakdown Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-[var(--m3-surface-container-low)] border border-[var(--m3-outline-variant)]">
              <div className="text-[11px] text-[var(--m3-on-surface-variant)] font-medium">Base Pot Amount</div>
              <div className="text-base font-bold font-mono text-[var(--m3-on-surface)] mt-1">
                {formatCurrency(group.totalPot)}
              </div>
              <div className="text-[10px] text-[var(--m3-on-surface-variant)] opacity-75 mt-0.5">
                {formatCurrency(group.monthlyBaseShare)} × {group.memberCount} members
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25">
              <div className="text-[11px] text-rose-700 dark:text-rose-300 font-medium">Winning Bid</div>
              <div className="text-base font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
                -{formatCurrency(sandboxBid)}
              </div>
              <div className="text-[10px] text-rose-700/80 dark:text-rose-300/80 mt-0.5">Discount given to pool</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[var(--m3-primary-container)] border border-[var(--m3-primary)]/20 text-[var(--m3-on-primary-container)]">
              <div className="text-[11px] font-medium opacity-90">Winner Payout</div>
              <div className="text-base font-bold font-mono mt-1">
                {formatCurrency(sandboxCalc.winnerPayout)}
              </div>
              <div className="text-[10px] opacity-75 mt-0.5">Pot - Winning Bid</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25">
              <div className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">Organizer Fee</div>
              <div className="text-base font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
                {formatCurrency(sandboxCalc.organizerFee)}
              </div>
              <div className="text-[10px] text-amber-700/80 dark:text-amber-300/80 mt-0.5">Automatic deduction</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[var(--m3-surface-container-low)] border border-[var(--m3-outline-variant)]">
              <div className="text-[11px] text-[var(--m3-on-surface-variant)] font-medium">Net Dividend Pool</div>
              <div className="text-base font-bold font-mono text-[var(--m3-primary)] mt-1">
                {formatCurrency(sandboxCalc.dividendPool)}
              </div>
              <div className="text-[10px] text-[var(--m3-on-surface-variant)] opacity-75 mt-0.5">Bid - Fee</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[var(--m3-surface-container-low)] border border-[var(--m3-outline-variant)]">
              <div className="text-[11px] text-[var(--m3-on-surface-variant)] font-medium">Dividend per Member</div>
              <div className="text-base font-bold font-mono text-[var(--m3-on-surface)] mt-1">
                {formatCurrency(sandboxCalc.dividendPerMember)}
              </div>
              <div className="text-[10px] text-[var(--m3-on-surface-variant)] opacity-75 mt-0.5">
                Pool ÷ {group.memberCount}
              </div>
            </div>
          </div>

          {/* Formula Summary Ribbon */}
          <div className="p-4 rounded-2xl bg-[var(--m3-surface-container-high)] border border-[var(--m3-outline-variant)] flex items-center justify-between flex-wrap gap-3">
            <div>
              <span className="text-xs text-[var(--m3-on-surface-variant)]">Next Month Payment Due per Member:</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xl font-bold font-mono text-[var(--m3-primary)]">
                  {formatCurrency(sandboxCalc.effectiveMonthlyDue)}
                </span>
                <span className="text-xs text-[var(--m3-on-surface-variant)] font-mono opacity-80">
                  ({formatCurrency(group.monthlyBaseShare)} base - {formatCurrency(sandboxCalc.dividendPerMember)} dividend)
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-[var(--m3-on-surface-variant)]">Winner Net Cash:</span>
              <div className="text-sm font-semibold font-mono text-[var(--m3-on-surface)]">
                {formatCurrency(sandboxCalc.winnerPayout)} <span className="text-[11px] font-normal opacity-75">(pays {formatCurrency(sandboxCalc.effectiveMonthlyDue)} share)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Pending Members & Quick Reminders */}
        <div className="m3-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[var(--m3-on-surface)] text-sm">Month {group.currentMonth} Members</h3>
            <span className="text-xs text-[var(--m3-on-surface-variant)] font-mono">
              {paidCount}/{group.memberCount} Cleared
            </span>
          </div>

          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {currentMonthPayments.map((payment) => {
              const member = members.find((m) => m.id === payment.memberId);
              if (!member) return null;

              const isPaid = payment.status === 'Paid';
              const dueInfo = evaluatePaymentDueStatus(payment.dueDate);

              return (
                <div
                  key={payment.id}
                  className={`p-3 rounded-2xl border transition-all ${
                    isPaid
                      ? 'bg-[var(--m3-surface-container-low)] border-[var(--m3-outline-variant)]'
                      : dueInfo.isOverdue
                      ? 'm3-status-overdue'
                      : 'm3-status-pending'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => onSelectMember(member)}
                      className="text-left font-bold text-xs hover:underline cursor-pointer truncate"
                    >
                      {member.name}
                    </button>

                    <span className="font-mono text-xs font-bold">
                      {formatCurrency(payment.amountDue)}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      {isPaid ? (
                        <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle className="w-3 h-3" />
                          <span>Paid ({payment.paymentMethod || 'UPI'})</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3" />
                          <span>
                            {dueInfo.isOverdue
                              ? `Overdue by ${Math.abs(dueInfo.daysRemaining)}d`
                              : dueInfo.isDueToday
                              ? 'Due Today'
                              : `Due in ${dueInfo.daysRemaining}d`}
                          </span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isPaid ? (
                        <button
                          onClick={() => onOpenReceipt(payment)}
                          className="text-[var(--m3-on-surface-variant)] hover:text-[var(--m3-on-surface)] p-1 cursor-pointer"
                          title="View Receipt"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <>
                          <a
                            href={buildWhatsAppReminderUrl({
                              memberName: member.name,
                              phone: member.phone,
                              amountDue: payment.amountDue,
                              monthNumber: group.currentMonth,
                              dueDate: formatDate(payment.dueDate),
                              chitName: group.name,
                              upiId: 'admin@okaxis',
                            })}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 text-[10px] font-bold transition-colors inline-flex items-center gap-0.5"
                            title="Send WhatsApp Reminder"
                          >
                            <Send className="w-2.5 h-2.5" />
                            <span>WhatsApp</span>
                          </a>

                          <button
                            onClick={() => onOpenPaymentModal(payment)}
                            className="m3-btn-tonal px-2 py-0.5 text-[10px] font-bold cursor-pointer"
                          >
                            Mark Paid
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-[var(--m3-outline-variant)]">
            <button
              onClick={() => onNavigateToTab('ledger')}
              className="w-full py-2.5 rounded-full bg-[var(--m3-surface-container-high)] hover:bg-[var(--m3-surface-container-highest)] text-[var(--m3-on-surface)] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-[var(--m3-outline-variant)]"
            >
              <span>Open Complete Ledger</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ROI & Effective Annual Yield Calculator */}
      <div id="roi-calculator-section" className="scroll-mt-24">
        <RoiCalculator
          group={group}
          members={members}
          auctions={auctions}
          payments={payments}
          onSelectMember={onSelectMember}
          onOpenReceipt={onOpenReceipt}
        />
      </div>

      {/* Completed Auctions Ledger Summary */}
      <div className="m3-card p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-bold text-[var(--m3-on-surface)] text-base">Auction History & Payout Disbursals</h3>
            <p className="text-xs text-[var(--m3-on-surface-variant)] mt-0.5">
              Completed cycles, winner bid discounts, dividend distribution, and organizer fee income
            </p>
          </div>
          <button
            onClick={() => onNavigateToTab('auctions')}
            className="text-xs text-[var(--m3-primary)] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>View All Auctions</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--m3-surface-container-low)] text-[var(--m3-on-surface-variant)] uppercase font-mono text-[10px] border-b border-[var(--m3-outline-variant)]">
              <tr>
                <th className="py-3 px-3">Month</th>
                <th className="py-3 px-3">Auction Date</th>
                <th className="py-3 px-3">Winner</th>
                <th className="py-3 px-3">Winning Bid</th>
                <th className="py-3 px-3">Org. Fee</th>
                <th className="py-3 px-3">Dividend Pool</th>
                <th className="py-3 px-3">Per Member</th>
                <th className="py-3 px-3">Installment</th>
                <th className="py-3 px-3">Winner Payout</th>
                <th className="py-3 px-3">Disbursal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--m3-outline-variant)] font-mono">
              {auctions.map((auc) => {
                const winner = members.find((m) => m.id === auc.winnerId);
                return (
                  <tr key={auc.id} className="hover:bg-[var(--m3-surface-container-high)]/50 transition-colors">
                    <td className="py-3.5 px-3 font-bold text-[var(--m3-on-surface)]">Month {auc.monthNumber}</td>
                    <td className="py-3.5 px-3 text-[var(--m3-on-surface-variant)] font-sans">{formatDate(auc.date)}</td>
                    <td className="py-3.5 px-3 font-sans font-semibold text-[var(--m3-on-surface)]">
                      {winner ? winner.name : 'Unknown'}
                    </td>
                    <td className="py-3.5 px-3 text-rose-600 dark:text-rose-400 font-bold">-{formatCurrency(auc.winningBid)}</td>
                    <td className="py-3.5 px-3 text-amber-600 dark:text-amber-400 font-semibold">{formatCurrency(auc.organizerFee)}</td>
                    <td className="py-3.5 px-3 text-[var(--m3-on-surface)] font-medium">{formatCurrency(auc.dividendPool)}</td>
                    <td className="py-3.5 px-3 text-[var(--m3-on-surface-variant)]">{formatCurrency(auc.dividendPerMember)}</td>
                    <td className="py-3.5 px-3 text-[var(--m3-on-surface)] font-bold">{formatCurrency(auc.effectiveMonthlyDue)}</td>
                    <td className="py-3.5 px-3 text-[var(--m3-primary)] font-bold text-sm">{formatCurrency(auc.winnerPayout)}</td>
                    <td className="py-3.5 px-3 font-sans">
                      <span className="m3-status-paid text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>Disbursed</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
