import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Percent, 
  Calculator, 
  IndianRupee, 
  ArrowUpRight, 
  Sparkles, 
  Info, 
  Search, 
  Filter, 
  Award, 
  Sliders, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle, 
  Clock, 
  User,
  ArrowRight,
  ShieldCheck,
  FileText,
  X
} from 'lucide-react';
import { Auction, ChitGroup, Member, Payment } from '../types/chit';
import { 
  calculateMembersRoi, 
  formatCurrency, 
  MemberRoiResult, 
  GroupRoiSummary 
} from '../utils/calculations';

interface RoiCalculatorProps {
  group: ChitGroup;
  members: Member[];
  auctions: Auction[];
  payments: Payment[];
  onSelectMember?: (member: Member) => void;
  onOpenReceipt?: (payment: Payment) => void;
}

export const RoiCalculator: React.FC<RoiCalculatorProps> = ({
  group,
  members,
  auctions,
  payments,
  onSelectMember,
  onOpenReceipt,
}) => {
  // Mode: Realized to date vs 10-Month Lifetime Projection
  const [calculationMode, setCalculationMode] = useState<'realized' | 'projected'>('realized');
  const [projectedFutureBid, setProjectedFutureBid] = useState<number>(8500);
  const [yieldMetric, setYieldMetric] = useState<'annualized' | 'apy' | 'roi'>('annualized');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'savers' | 'prized'>('all');
  const [sortBy, setSortBy] = useState<'yield' | 'dividends' | 'contributions' | 'name'>('yield');
  const [showFormulaDetails, setShowFormulaDetails] = useState<boolean>(false);
  const [selectedMemberForDrilldown, setSelectedMemberForDrilldown] = useState<MemberRoiResult | null>(null);

  // Completed auctions count
  const completedAuctionsCount = auctions.filter((a) => a.status === 'completed' || a.winningBid > 0).length;
  const elapsedMonths = Math.max(1, completedAuctionsCount);

  // Compute ROI and Yield summary
  const roiSummary: GroupRoiSummary = useMemo(() => {
    return calculateMembersRoi(
      members,
      auctions,
      payments,
      group,
      calculationMode === 'projected' ? projectedFutureBid : undefined
    );
  }, [members, auctions, payments, group, calculationMode, projectedFutureBid]);

  // Filter & sort members
  const filteredAndSortedMembers = useMemo(() => {
    return roiSummary.memberResults
      .filter((m) => {
        const matchesSearch =
          m.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.phone.includes(searchTerm);
        if (!matchesSearch) return false;

        if (statusFilter === 'savers') return !m.hasWonAuction;
        if (statusFilter === 'prized') return m.hasWonAuction;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'yield') {
          return b.annualizedYield - a.annualizedYield;
        }
        if (sortBy === 'dividends') {
          return b.totalDividendsReceived - a.totalDividendsReceived;
        }
        if (sortBy === 'contributions') {
          return b.cumulativeContributions - a.cumulativeContributions;
        }
        if (sortBy === 'name') {
          return a.memberName.localeCompare(b.memberName);
        }
        return 0;
      });
  }, [roiSummary.memberResults, searchTerm, statusFilter, sortBy]);

  // Traditional Bank FD rate benchmark for comparison
  const bankFdRateBenchmark = 6.5; // 6.5% p.a.
  const yieldDifference = Number((roiSummary.averageAnnualYield - bankFdRateBenchmark).toFixed(1));

  return (
    <div className="m3-card p-5 sm:p-6 space-y-6">
      {/* Header & Controls Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--m3-outline-variant)] pb-5">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-full bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)] shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-lg font-bold text-[var(--m3-on-surface)] tracking-tight flex items-center gap-2">
                <span>Member ROI & Effective Annual Yield</span>
              </h3>
              <span className="text-[10px] font-mono uppercase font-bold px-2.5 py-0.5 rounded-full bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)]">
                Formula: (Dividends ÷ Contributions) × (12 ÷ Months)
              </span>
            </div>
            <p className="text-xs text-[var(--m3-on-surface-variant)] mt-1 max-w-2xl leading-relaxed">
              Calculates each member&apos;s annualized return on capital by measuring total auction dividends received against cumulative monthly installments paid into the chit pot.
            </p>
          </div>
        </div>

        {/* Calculation Horizon Switch */}
        <div className="flex items-center gap-1.5 bg-[var(--m3-surface-container-high)] p-1 rounded-full border border-[var(--m3-outline-variant)] shrink-0">
          <button
            onClick={() => setCalculationMode('realized')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              calculationMode === 'realized'
                ? 'm3-chip-selected font-bold shadow-xs'
                : 'text-[var(--m3-on-surface-variant)] hover:text-[var(--m3-on-surface)]'
            }`}
          >
            Realized To-Date ({elapsedMonths} Mo)
          </button>
          <button
            onClick={() => setCalculationMode('projected')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              calculationMode === 'projected'
                ? 'm3-chip-selected font-bold shadow-xs'
                : 'text-[var(--m3-on-surface-variant)] hover:text-[var(--m3-on-surface)]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Full {group.durationMonths}-Mo Forecast</span>
          </button>
        </div>
      </div>

      {/* Projection Simulator Slider (only visible in projected mode) */}
      {calculationMode === 'projected' && (
        <div className="bg-[var(--m3-surface-container-low)] border border-[var(--m3-primary)]/30 rounded-2xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[var(--m3-primary)]" />
              <span className="text-xs font-semibold text-[var(--m3-on-surface)]">
                Projected Average Winning Bid for Remaining Cycles ({elapsedMonths + 1} to {group.durationMonths}):
              </span>
            </div>
            <div className="text-sm font-mono font-bold text-[var(--m3-primary)]">
              {formatCurrency(projectedFutureBid)} <span className="text-xs font-normal text-[var(--m3-on-surface-variant)]">(~₹{Math.floor((projectedFutureBid - group.organizerFee) / group.memberCount)} dividend/mo)</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min={group.organizerFee + 500}
              max={group.totalPot * 0.4}
              step={500}
              value={projectedFutureBid}
              onChange={(e) => setProjectedFutureBid(Number(e.target.value))}
              className="w-full accent-[var(--m3-primary)] bg-[var(--m3-surface-container-highest)] h-2 rounded-lg cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[var(--m3-on-surface-variant)] flex-wrap">
            <span>Forecast Presets:</span>
            {[6500, 8000, 9500, 11000].map((preset) => (
              <button
                key={preset}
                onClick={() => setProjectedFutureBid(preset)}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono transition-colors cursor-pointer ${
                  projectedFutureBid === preset
                    ? 'm3-chip-selected font-bold'
                    : 'bg-[var(--m3-surface-container-high)] text-[var(--m3-on-surface-variant)] hover:bg-[var(--m3-surface-container-highest)]'
                }`}
              >
                ₹{preset.toLocaleString('en-IN')}
              </button>
            ))}
            <span className="ml-auto hidden sm:inline opacity-70">
              Adjusts future monthly dividends and simulates lifetime yields across {group.durationMonths} months.
            </span>
          </div>
        </div>
      )}

      {/* Top 4 KPI Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-[var(--m3-surface-container-low)] border border-[var(--m3-outline-variant)] rounded-2xl p-4">
          <div className="flex items-center justify-between text-[var(--m3-on-surface-variant)] text-xs">
            <span>Average Annualized Yield</span>
            <div className="p-1.5 rounded-full bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)]">
              <Percent className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[var(--m3-primary)]">
              {roiSummary.averageAnnualYield}%
            </span>
            <span className="text-[11px] text-[var(--m3-on-surface-variant)] font-sans">p.a.</span>
          </div>
          <div className="mt-1 text-[11px] text-[var(--m3-primary)] font-medium">
            +{yieldDifference}% vs Bank FD (6.5%)
          </div>
        </div>

        <div className="bg-[var(--m3-surface-container-low)] border border-[var(--m3-outline-variant)] rounded-2xl p-4">
          <div className="flex items-center justify-between text-[var(--m3-on-surface-variant)] text-xs">
            <span>Total Dividends Credited</span>
            <div className="p-1.5 rounded-full bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)]">
              <IndianRupee className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[var(--m3-on-surface)]">
              {formatCurrency(roiSummary.totalDividendsDistributed)}
            </span>
            <span className="text-[11px] text-[var(--m3-on-surface-variant)] font-sans">total</span>
          </div>
          <div className="mt-1 text-[11px] text-[var(--m3-on-surface-variant)] opacity-75">
            {formatCurrency(roiSummary.totalDividendsDistributed / group.memberCount)} avg per member
          </div>
        </div>

        <div className="bg-[var(--m3-surface-container-low)] border border-[var(--m3-outline-variant)] rounded-2xl p-4">
          <div className="flex items-center justify-between text-[var(--m3-on-surface-variant)] text-xs">
            <span>Cumulative Contributions</span>
            <div className="p-1.5 rounded-full bg-[var(--m3-surface-container-high)] text-[var(--m3-on-surface)]">
              <Calculator className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[var(--m3-on-surface)]">
              {formatCurrency(roiSummary.totalCumulativeContributions)}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-[var(--m3-on-surface-variant)] opacity-75">
            Across {roiSummary.elapsedMonths} cycles evaluated
          </div>
        </div>

        <div className="bg-[var(--m3-surface-container-low)] border border-[var(--m3-outline-variant)] rounded-2xl p-4">
          <div className="flex items-center justify-between text-[var(--m3-on-surface-variant)] text-xs">
            <span>Highest Saver Yield</span>
            <div className="p-1.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {roiSummary.highestYield}%
            </span>
            <span className="text-[11px] text-[var(--m3-on-surface-variant)] font-sans">p.a.</span>
          </div>
          <div className="mt-1 text-[11px] text-[var(--m3-on-surface-variant)] truncate">
            {roiSummary.highestYieldMemberName || 'Non-prized member'}
          </div>
        </div>
      </div>

      {/* Formula Explanation Accordion */}
      <div className="bg-[var(--m3-surface-container-low)] border border-[var(--m3-outline-variant)] rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowFormulaDetails(!showFormulaDetails)}
          className="w-full px-4 py-3 flex items-center justify-between text-xs text-[var(--m3-on-surface)] hover:bg-[var(--m3-surface-container-high)] transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[var(--m3-primary)] shrink-0" />
            <span className="font-semibold">How Effective Annual Yield is Calculated in ChitLedger</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-[var(--m3-on-surface-variant)]">
            <span>{showFormulaDetails ? 'Hide derivation' : 'View mathematical formula'}</span>
            {showFormulaDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>

        {showFormulaDetails && (
          <div className="p-4 pt-1 border-t border-[var(--m3-outline-variant)] space-y-3 text-xs text-[var(--m3-on-surface)] bg-[var(--m3-surface-container-low)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 rounded-xl bg-[var(--m3-surface-container)] border border-[var(--m3-outline-variant)] space-y-2">
                <span className="font-bold text-[var(--m3-primary)] block text-[11px] uppercase tracking-wider font-mono">
                  1. Dividend Return on Contribution (ROI)
                </span>
                <div className="bg-[var(--m3-surface-container-lowest)] p-2.5 rounded-lg font-mono text-[11px] text-[var(--m3-primary)] border border-[var(--m3-outline-variant)]">
                  ROI (%) = (Total Dividends Received ÷ Cumulative Contributions) × 100
                </div>
                <p className="text-[11px] text-[var(--m3-on-surface-variant)] leading-relaxed">
                  Every auction discount (minus {formatCurrency(group.organizerFee)} organizer fee) is distributed equally among all {group.memberCount} members. This reduces their monthly cash outflow below the nominal {formatCurrency(group.monthlyBaseShare)} base share.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[var(--m3-surface-container)] border border-[var(--m3-outline-variant)] space-y-2">
                <span className="font-bold text-[var(--m3-primary)] block text-[11px] uppercase tracking-wider font-mono">
                  2. Effective Annualized Yield (p.a.)
                </span>
                <div className="bg-[var(--m3-surface-container-lowest)] p-2.5 rounded-lg font-mono text-[11px] text-[var(--m3-primary)] border border-[var(--m3-outline-variant)]">
                  Annual Yield (% p.a.) = ROI (%) × (12 ÷ Elapsed Months)
                </div>
                <p className="text-[11px] text-[var(--m3-on-surface-variant)] leading-relaxed">
                  Annualizes the return across a standard 12-month period. For early cycles (Month 1-2), annualized figures reflect short-tenor yields, which stabilize over the full tenure.
                </p>
              </div>
            </div>

            <div className="text-[11px] text-[var(--m3-on-surface-variant)] flex items-center justify-between border-t border-[var(--m3-outline-variant)] pt-2 flex-wrap gap-2">
              <span>
                💡 <strong>Investor Insight:</strong> Members who refrain from bidding early act as pure savers, reaping high dividend yields every cycle without incurring bid discounts.
              </span>
              <span className="font-mono text-[var(--m3-primary)] font-bold">
                Current evaluation tenure: {roiSummary.elapsedMonths} Month(s)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-[var(--m3-on-surface-variant)] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search member by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2.5 bg-[var(--m3-surface-container-lowest)] border border-[var(--m3-outline-variant)] rounded-xl text-[var(--m3-on-surface)] placeholder:text-[var(--m3-on-surface-variant)]/50 focus:outline-none focus:border-[var(--m3-primary)] text-xs"
          />
        </div>

        {/* Filter by Status */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-[var(--m3-surface-container-high)] p-1 rounded-full border border-[var(--m3-outline-variant)] text-[11px]">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-full transition-colors cursor-pointer font-medium ${
                statusFilter === 'all'
                  ? 'm3-chip-selected font-bold'
                  : 'text-[var(--m3-on-surface-variant)] hover:text-[var(--m3-on-surface)]'
              }`}
            >
              All ({members.length})
            </button>
            <button
              onClick={() => setStatusFilter('savers')}
              className={`px-3 py-1 rounded-full transition-colors cursor-pointer font-medium ${
                statusFilter === 'savers'
                  ? 'm3-chip-selected font-bold'
                  : 'text-[var(--m3-on-surface-variant)] hover:text-[var(--m3-on-surface)]'
              }`}
            >
              Savers ({members.filter((m) => !m.hasWonAuction).length})
            </button>
            <button
              onClick={() => setStatusFilter('prized')}
              className={`px-3 py-1 rounded-full transition-colors cursor-pointer font-medium ${
                statusFilter === 'prized'
                  ? 'm3-chip-selected font-bold'
                  : 'text-[var(--m3-on-surface-variant)] hover:text-[var(--m3-on-surface)]'
              }`}
            >
              Prized ({members.filter((m) => m.hasWonAuction).length})
            </button>
          </div>

          {/* Sort By Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[var(--m3-surface-container-lowest)] border border-[var(--m3-outline-variant)] rounded-xl px-3 py-2 text-[var(--m3-on-surface)] text-xs cursor-pointer focus:outline-none focus:border-[var(--m3-primary)]"
          >
            <option value="yield">Sort: Annual Yield (High to Low)</option>
            <option value="dividends">Sort: Total Dividends (High to Low)</option>
            <option value="contributions">Sort: Contributions Paid</option>
            <option value="name">Sort: Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Member Yield Table */}
      <div className="border border-[var(--m3-outline-variant)] rounded-2xl overflow-hidden bg-[var(--m3-surface-container-low)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--m3-surface-container)] text-[var(--m3-on-surface-variant)] uppercase font-mono text-[10px] border-b border-[var(--m3-outline-variant)]">
              <tr>
                <th className="py-3 px-3"># Rank</th>
                <th className="py-3 px-3">Member Details</th>
                <th className="py-3 px-3">Chit Status</th>
                <th className="py-3 px-3">Cumulative Contributed</th>
                <th className="py-3 px-3">Total Dividends</th>
                <th className="py-3 px-3">Savings vs Base</th>
                <th className="py-3 px-3">Dividend ROI</th>
                <th className="py-3 px-3 text-[var(--m3-primary)] font-bold">Effective Annual Yield</th>
                <th className="py-3 px-3 text-right">Drilldown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--m3-outline-variant)] font-mono">
              {filteredAndSortedMembers.map((member, index) => {
                return (
                  <tr
                    key={member.memberId}
                    className="hover:bg-[var(--m3-surface-container-high)]/40 transition-colors group cursor-pointer"
                    onClick={() => setSelectedMemberForDrilldown(member)}
                  >
                    <td className="py-3 px-3 text-[var(--m3-on-surface-variant)] font-bold">
                      {index === 0 ? (
                        <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center text-[10px] border border-amber-500/40 font-bold">
                          1
                        </span>
                      ) : (
                        `#${index + 1}`
                      )}
                    </td>

                    <td className="py-3 px-3 font-sans">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)] flex items-center justify-center font-bold text-xs shrink-0">
                          {member.memberName.charAt(0)}
                        </div>
                        <div>
                          <span className="font-semibold text-[var(--m3-on-surface)] group-hover:text-[var(--m3-primary)] transition-colors block">
                            {member.memberName}
                          </span>
                          <span className="text-[10px] font-mono text-[var(--m3-on-surface-variant)] opacity-70">{member.phone}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-sans">
                      {member.hasWonAuction ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full m3-status-paid">
                          <CheckCircle className="w-3 h-3" />
                          <span>Prized Month {member.wonMonth}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--m3-surface-container-high)] text-[var(--m3-on-surface)] border border-[var(--m3-outline-variant)]">
                          <Clock className="w-3 h-3" />
                          <span>Saver (Non-Prized)</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-[var(--m3-on-surface)] font-medium">
                      {formatCurrency(member.cumulativeContributions)}
                    </td>

                    <td className="py-3 px-3 text-[var(--m3-primary)] font-bold">
                      +{formatCurrency(member.totalDividendsReceived)}
                    </td>

                    <td className="py-3 px-3 text-[var(--m3-on-surface-variant)]">
                      {formatCurrency(member.netSavings)}
                    </td>

                    <td className="py-3 px-3 text-[var(--m3-on-surface)] font-semibold">
                      {member.roiPercentage}%
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-[var(--m3-surface-container-highest)] h-1.5 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className="bg-[var(--m3-primary)] h-full rounded-full"
                            style={{
                              width: `${Math.min(100, (member.annualizedYield / (roiSummary.highestYield || 1)) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-[var(--m3-primary)] font-bold text-sm">
                          {member.annualizedYield}%
                        </span>
                        <span className="text-[10px] text-[var(--m3-on-surface-variant)] font-sans opacity-70">p.a.</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right font-sans">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMemberForDrilldown(member);
                        }}
                        className="m3-btn-tonal px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer inline-flex items-center gap-1"
                      >
                        <span>Breakdown</span>
                        <ArrowUpRight className="w-3 h-3 text-[var(--m3-primary)]" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Member Yield Cashflow Drilldown Modal */}
      {selectedMemberForDrilldown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="m3-dialog w-full max-w-xl overflow-hidden my-6">
            {/* Modal Header */}
            <div className="p-5 border-b border-[var(--m3-outline-variant)] flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)] flex items-center justify-center font-bold">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-[var(--m3-on-surface)] text-base">{selectedMemberForDrilldown.memberName}</h3>
                    {selectedMemberForDrilldown.hasWonAuction ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full m3-status-paid">
                        Won Month {selectedMemberForDrilldown.wonMonth}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--m3-surface-container-high)] text-[var(--m3-on-surface)] border border-[var(--m3-outline-variant)]">
                        Active Saver
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--m3-on-surface-variant)] font-mono mt-0.5">
                    {selectedMemberForDrilldown.phone} · ROI Yield Analysis
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedMemberForDrilldown(null)}
                className="p-1.5 rounded-full text-[var(--m3-on-surface-variant)] hover:text-[var(--m3-on-surface)] hover:bg-[var(--m3-surface-container-highest)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
              {/* Highlight Yield Card */}
              <div className="bg-[var(--m3-surface-container-low)] border border-[var(--m3-primary)]/40 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[var(--m3-on-surface-variant)] text-[11px] block">Effective Annualized Yield</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-bold font-mono text-[var(--m3-primary)]">
                      {selectedMemberForDrilldown.annualizedYield}%
                    </span>
                    <span className="text-xs text-[var(--m3-on-surface-variant)]">p.a.</span>
                  </div>
                  <span className="text-[11px] text-[var(--m3-primary)] mt-0.5 block font-medium">
                    Calculated over {selectedMemberForDrilldown.elapsedMonths} cycle(s) evaluated
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[var(--m3-on-surface-variant)] text-[11px] block">Total Dividends Credited</span>
                  <span className="text-xl font-bold font-mono text-[var(--m3-on-surface)] mt-1 block">
                    +{formatCurrency(selectedMemberForDrilldown.totalDividendsReceived)}
                  </span>
                  <span className="text-[10px] text-[var(--m3-on-surface-variant)] opacity-70 font-mono">
                    vs {formatCurrency(selectedMemberForDrilldown.cumulativeContributions)} invested
                  </span>
                </div>
              </div>

              {/* Step-by-Step Derivation */}
              <div className="bg-[var(--m3-surface-container-low)] p-4 rounded-2xl border border-[var(--m3-outline-variant)] space-y-2">
                <span className="font-bold text-[var(--m3-on-surface)] text-xs block">
                  Detailed Mathematical Derivation
                </span>
                <div className="space-y-1.5 font-mono text-[11px] text-[var(--m3-on-surface)]">
                  <div className="flex justify-between py-1 border-b border-[var(--m3-outline-variant)]">
                    <span className="text-[var(--m3-on-surface-variant)] font-sans">1. Nominal Base Share Due:</span>
                    <span>{formatCurrency(selectedMemberForDrilldown.nominalBaseShareTotal)} ({selectedMemberForDrilldown.elapsedMonths} × {formatCurrency(group.monthlyBaseShare)})</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--m3-outline-variant)]">
                    <span className="text-[var(--m3-on-surface-variant)] font-sans">2. Total Auction Dividends Earned:</span>
                    <span className="text-[var(--m3-primary)] font-bold">-{formatCurrency(selectedMemberForDrilldown.totalDividendsReceived)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--m3-outline-variant)]">
                    <span className="text-[var(--m3-on-surface-variant)] font-sans">3. Net Cumulative Contributions:</span>
                    <span className="font-bold">{formatCurrency(selectedMemberForDrilldown.cumulativeContributions)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--m3-outline-variant)]">
                    <span className="text-[var(--m3-on-surface-variant)] font-sans">4. Simple Return on Capital (ROI %):</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                      ({formatCurrency(selectedMemberForDrilldown.totalDividendsReceived)} ÷ {formatCurrency(selectedMemberForDrilldown.cumulativeContributions)}) × 100 = {selectedMemberForDrilldown.roiPercentage}%
                    </span>
                  </div>
                  <div className="flex justify-between py-1 text-[var(--m3-primary)] font-bold">
                    <span className="text-[var(--m3-on-surface-variant)] font-sans">5. Annualized Yield (12 ÷ {selectedMemberForDrilldown.elapsedMonths} Mo):</span>
                    <span>
                      {selectedMemberForDrilldown.roiPercentage}% × (12 ÷ {selectedMemberForDrilldown.elapsedMonths}) = {selectedMemberForDrilldown.annualizedYield}% p.a.
                    </span>
                  </div>
                </div>
              </div>

              {/* Monthly Cashflows Breakdown Table */}
              <div className="space-y-2">
                <span className="font-bold text-[var(--m3-on-surface)] text-xs block">
                  Cycle-by-Cycle Monthly Installment & Dividend Log
                </span>

                <div className="bg-[var(--m3-surface-container-low)] border border-[var(--m3-outline-variant)] rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[var(--m3-surface-container)] text-[var(--m3-on-surface-variant)] uppercase text-[10px] border-b border-[var(--m3-outline-variant)]">
                      <tr>
                        <th className="py-2 px-3">Month</th>
                        <th className="py-2 px-3">Base Share</th>
                        <th className="py-2 px-3">Dividend Credited</th>
                        <th className="py-2 px-3">Amount Due</th>
                        <th className="py-2 px-3">Paid / Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--m3-outline-variant)]">
                      {selectedMemberForDrilldown.monthlyBreakdown.map((row) => (
                        <tr key={row.monthNumber} className="hover:bg-[var(--m3-surface-container-high)]/40">
                          <td className="py-2 px-3 font-bold text-[var(--m3-on-surface)]">Month {row.monthNumber}</td>
                          <td className="py-2 px-3 text-[var(--m3-on-surface-variant)]">{formatCurrency(row.baseShare)}</td>
                          <td className="py-2 px-3 text-[var(--m3-primary)] font-semibold">
                            -{formatCurrency(row.dividendEarned)}
                          </td>
                          <td className="py-2 px-3 text-[var(--m3-on-surface)] font-bold">
                            {formatCurrency(row.amountDue)}
                          </td>
                          <td className="py-2 px-3 font-sans">
                            {row.isPaid ? (
                              <span className="m3-status-paid text-[11px] inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full">
                                <CheckCircle className="w-3 h-3" />
                                <span>Paid</span>
                              </span>
                            ) : row.amountPaid > 0 ? (
                              <span className="text-amber-600 dark:text-amber-400 text-[11px] font-semibold">
                                Partial ({formatCurrency(row.amountPaid)})
                              </span>
                            ) : (
                              <span className="text-[var(--m3-on-surface-variant)] opacity-70 text-[11px]">
                                Scheduled Due
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[var(--m3-outline-variant)] flex justify-between items-center text-xs">
              <span className="text-[var(--m3-on-surface-variant)] opacity-75 text-[11px]">
                Organized under Chit Fund Act dividend distribution principles.
              </span>
              <button
                onClick={() => setSelectedMemberForDrilldown(null)}
                className="m3-btn-outlined px-4 py-2 text-xs font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
