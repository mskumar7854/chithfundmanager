import React, { useState, useEffect } from 'react';
import { 
  X, 
  Layers, 
  IndianRupee, 
  Calendar, 
  Users, 
  ShieldCheck, 
  Clock, 
  Sparkles, 
  Check, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle 
} from 'lucide-react';
import { ChitGroup, Member, Payment } from '../types/chit';
import { CreatePlanInput, createNewPlanData } from '../utils/storage';
import { formatCurrency } from '../utils/calculations';

interface CreatePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePlan: (
    newPlanData: {
      newGroup: ChitGroup;
      newMembers: Member[];
      newPayments: Payment[];
    }
  ) => void;
}

export const CreatePlanModal: React.FC<CreatePlanModalProps> = ({
  isOpen,
  onClose,
  onCreatePlan,
}) => {
  // Plan Parameters Form State
  const [name, setName] = useState<string>('');
  const [totalPot, setTotalPot] = useState<number>(100000);
  const [durationMonths, setDurationMonths] = useState<number>(10);
  const [memberCount, setMemberCount] = useState<number>(10);
  const [syncMembersWithDuration, setSyncMembersWithDuration] = useState<boolean>(true);
  
  // Organizer Charges Configuration
  const [chargeType, setChargeType] = useState<'fixed' | 'percent'>('fixed');
  const [organizerFeeAmount, setOrganizerFeeAmount] = useState<number>(2500);
  const [organizerFeePercent, setOrganizerFeePercent] = useState<number>(5);

  // Dates & Schedule
  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [auctionDayOfMonth, setAuctionDayOfMonth] = useState<number>(5);
  const [paymentDueDayOfMonth, setPaymentDueDayOfMonth] = useState<number>(25);

  // Custom Member Setup
  const [showMemberCustomizer, setShowMemberCustomizer] = useState<boolean>(false);
  const [customMemberList, setCustomMemberList] = useState<{ name: string; phone: string; upiId: string }[]>([]);

  // Computed Charges
  const computedOrganizerFee = chargeType === 'fixed'
    ? organizerFeeAmount
    : Math.round((totalPot * organizerFeePercent) / 100);

  // Computed Base Share
  const computedBaseShare = memberCount > 0 ? Math.round(totalPot / memberCount) : 0;
  const projectedLifetimeCharges = computedOrganizerFee * durationMonths;

  // Auto-sync members with duration if enabled
  const handleDurationChange = (val: number) => {
    const months = Math.max(2, val);
    setDurationMonths(months);
    if (syncMembersWithDuration) {
      setMemberCount(months);
    }
  };

  // Pre-fill custom members whenever member count changes
  useEffect(() => {
    setCustomMemberList((prev) => {
      const list = [...prev];
      while (list.length < memberCount) {
        const i = list.length + 1;
        list.push({
          name: `Member ${i}`,
          phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
          upiId: `member${i}@upi`,
        });
      }
      return list.slice(0, memberCount);
    });
  }, [memberCount]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Please enter a Chit Fund Plan Name.');
      return;
    }

    if (totalPot <= 0) {
      alert('Please enter a valid Plan Amount / Pot.');
      return;
    }

    if (computedOrganizerFee >= totalPot) {
      alert('Organizer fee cannot exceed total pot amount.');
      return;
    }

    const planInput: CreatePlanInput = {
      name: name.trim(),
      totalPot,
      durationMonths,
      memberCount,
      organizerFee: computedOrganizerFee,
      startDate,
      auctionDayOfMonth,
      paymentDueDayOfMonth,
      memberList: showMemberCustomizer ? customMemberList : undefined,
    };

    const generated = createNewPlanData(planInput);
    onCreatePlan(generated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl m3-dialog overflow-hidden my-6">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-[var(--m3-outline-variant)] flex items-center justify-between sticky top-0 z-10 bg-[var(--m3-surface-container-high)]">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-full bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--m3-on-surface)] flex items-center gap-2">
                <span>Add New Chit Fund Plan</span>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)] font-bold">
                  New Scheme
                </span>
              </h2>
              <p className="text-xs text-[var(--m3-on-surface-variant)] mt-0.5">
                Configure plan amount, tenure, member slots, and automated organizer commission
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Quick Presets / Plan Name */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[var(--m3-on-surface)] flex items-center justify-between">
              <span>Chit Fund Plan Name</span>
              <span className="text-[11px] text-[var(--m3-on-surface-variant)] opacity-75">e.g., Gold Wealth 1L Chit</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Swarna Prosperity Chit (₹1 Lakh)"
              className="w-full px-3.5 py-2.5 bg-[var(--m3-surface-container-lowest)] border border-[var(--m3-outline-variant)] rounded-xl text-xs text-[var(--m3-on-surface)] placeholder:text-[var(--m3-on-surface-variant)]/50 focus:outline-none focus:border-[var(--m3-primary)] transition-all font-medium"
            />
            {/* Suggestions */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] text-[var(--m3-on-surface-variant)] opacity-75">Suggestions:</span>
              {[
                'Gold Wealth Chit (₹1L)',
                'Vyapar Growth Scheme (₹2L)',
                'Festival Savings Chit (₹50K)',
                'Mahalaxmi 20-Mo Chit',
              ].map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setName(s)}
                  className="px-2.5 py-1 rounded-full text-[10px] bg-[var(--m3-surface-container-low)] hover:bg-[var(--m3-surface-container-high)] text-[var(--m3-on-surface)] border border-[var(--m3-outline-variant)] transition-colors cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Plan Amount (Total Pot) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--m3-on-surface)] flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5 text-[var(--m3-primary)]" />
                <span>Plan Amount (Total Chit Pot)</span>
              </label>
              <span className="text-sm font-bold font-mono text-[var(--m3-primary)]">
                {formatCurrency(totalPot)}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-[var(--m3-on-surface-variant)] font-mono text-sm opacity-70">₹</span>
              <input
                type="number"
                required
                min={5000}
                step={5000}
                value={totalPot}
                onChange={(e) => setTotalPot(Number(e.target.value))}
                className="w-full pl-8 pr-3.5 py-2.5 bg-[var(--m3-surface-container-lowest)] border border-[var(--m3-outline-variant)] rounded-xl text-xs font-mono text-[var(--m3-on-surface)] focus:outline-none focus:border-[var(--m3-primary)]"
              />
            </div>
            {/* Quick pot presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-[var(--m3-on-surface-variant)] opacity-75">Quick Pots:</span>
              {[25000, 50000, 100000, 200000, 500000].map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setTotalPot(val)}
                  className={`px-3 py-1 rounded-full text-xs font-mono transition-colors cursor-pointer ${
                    totalPot === val
                      ? 'm3-chip-selected font-bold shadow-xs'
                      : 'bg-[var(--m3-surface-container-low)] hover:bg-[var(--m3-surface-container-high)] text-[var(--m3-on-surface-variant)] border border-[var(--m3-outline-variant)]'
                  }`}
                >
                  {formatCurrency(val)}
                </button>
              ))}
            </div>
          </div>

          {/* Duration Months & Member Count Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Duration Months */}
            <div className="space-y-2 bg-[var(--m3-surface-container-low)] p-3.5 rounded-2xl border border-[var(--m3-outline-variant)]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[var(--m3-on-surface)] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[var(--m3-primary)]" />
                  <span>Duration (Tenure)</span>
                </label>
                <span className="text-xs font-mono text-[var(--m3-primary)] font-bold">{durationMonths} Months</span>
              </div>
              <input
                type="number"
                min={2}
                max={60}
                value={durationMonths}
                onChange={(e) => handleDurationChange(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[var(--m3-surface-container-lowest)] border border-[var(--m3-outline-variant)] rounded-xl text-xs font-mono text-[var(--m3-on-surface)] focus:outline-none focus:border-[var(--m3-primary)]"
              />
              <div className="flex items-center gap-1 flex-wrap">
                {[10, 12, 15, 20, 25].map((m) => (
                  <button
                    type="button"
                    key={m}
                    onClick={() => handleDurationChange(m)}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono cursor-pointer transition-colors ${
                      durationMonths === m
                        ? 'm3-chip-selected font-bold'
                        : 'bg-[var(--m3-surface-container-high)] text-[var(--m3-on-surface-variant)] hover:bg-[var(--m3-surface-container-highest)] border border-[var(--m3-outline-variant)]'
                    }`}
                  >
                    {m} Mo
                  </button>
                ))}
              </div>
            </div>

            {/* Member Count */}
            <div className="space-y-2 bg-[var(--m3-surface-container-low)] p-3.5 rounded-2xl border border-[var(--m3-outline-variant)]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[var(--m3-on-surface)] flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[var(--m3-primary)]" />
                  <span>Member Capacity</span>
                </label>
                <span className="text-xs font-mono text-[var(--m3-primary)] font-bold">{memberCount} Members</span>
              </div>
              <input
                type="number"
                min={2}
                max={100}
                value={memberCount}
                onChange={(e) => {
                  setSyncMembersWithDuration(false);
                  setMemberCount(Math.max(2, Number(e.target.value)));
                }}
                className="w-full px-3 py-2 bg-[var(--m3-surface-container-lowest)] border border-[var(--m3-outline-variant)] rounded-xl text-xs font-mono text-[var(--m3-on-surface)] focus:outline-none focus:border-[var(--m3-primary)]"
              />
              <div className="flex items-center justify-between text-[11px] text-[var(--m3-on-surface-variant)]">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncMembersWithDuration}
                    onChange={(e) => {
                      setSyncMembersWithDuration(e.target.checked);
                      if (e.target.checked) setMemberCount(durationMonths);
                    }}
                    className="rounded accent-[var(--m3-primary)]"
                  />
                  <span>Match duration ({durationMonths})</span>
                </label>
              </div>
            </div>
          </div>

          {/* Organizer Charges (Fee Structure) */}
          <div className="bg-[var(--m3-surface-container-low)] p-4 rounded-2xl border border-[var(--m3-outline-variant)] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--m3-on-surface)] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                <span>Organizer Charges / Commission</span>
              </label>
              <div className="flex items-center bg-[var(--m3-surface-container-high)] p-0.5 rounded-full border border-[var(--m3-outline-variant)] text-[11px]">
                <button
                  type="button"
                  onClick={() => setChargeType('fixed')}
                  className={`px-3 py-1 rounded-full transition-colors cursor-pointer font-medium ${
                    chargeType === 'fixed'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-[var(--m3-on-surface-variant)]'
                  }`}
                >
                  Fixed (₹)
                </button>
                <button
                  type="button"
                  onClick={() => setChargeType('percent')}
                  className={`px-3 py-1 rounded-full transition-colors cursor-pointer font-medium ${
                    chargeType === 'percent'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-[var(--m3-on-surface-variant)]'
                  }`}
                >
                  Percentage (%)
                </button>
              </div>
            </div>

            {chargeType === 'fixed' ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-2.5 text-[var(--m3-on-surface-variant)] font-mono text-sm opacity-70">₹</span>
                    <input
                      type="number"
                      min={0}
                      step={250}
                      value={organizerFeeAmount}
                      onChange={(e) => setOrganizerFeeAmount(Number(e.target.value))}
                      className="w-full pl-8 pr-3.5 py-2 bg-[var(--m3-surface-container-lowest)] border border-[var(--m3-outline-variant)] rounded-xl text-xs font-mono text-[var(--m3-on-surface)] focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-[var(--m3-on-surface-variant)] opacity-75">Presets:</span>
                  {[1000, 1500, 2000, 2500, 5000].map((fee) => (
                    <button
                      type="button"
                      key={fee}
                      onClick={() => setOrganizerFeeAmount(fee)}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono transition-colors cursor-pointer ${
                        organizerFeeAmount === fee
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 font-bold'
                          : 'bg-[var(--m3-surface-container-high)] text-[var(--m3-on-surface-variant)] hover:bg-[var(--m3-surface-container-highest)] border border-[var(--m3-outline-variant)]'
                      }`}
                    >
                      ₹{fee.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={20}
                    step={0.5}
                    value={organizerFeePercent}
                    onChange={(e) => setOrganizerFeePercent(Number(e.target.value))}
                    className="w-32 px-3.5 py-2 bg-[var(--m3-surface-container-lowest)] border border-[var(--m3-outline-variant)] rounded-xl text-xs font-mono text-[var(--m3-on-surface)] focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-xs text-[var(--m3-on-surface-variant)] font-mono">
                    % of Pot = <strong className="text-amber-600 dark:text-amber-400 font-bold">{formatCurrency(computedOrganizerFee)}</strong> / cycle
                  </span>
                </div>
                <p className="text-[10px] text-[var(--m3-on-surface-variant)] opacity-75">
                  Note: The Chit Funds Act 1982 sets standard organizer commission at 5% maximum.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-[var(--m3-on-surface-variant)] pt-2 border-t border-[var(--m3-outline-variant)]">
              <span>Deducted per auction: <strong className="text-amber-600 dark:text-amber-400 font-mono">{formatCurrency(computedOrganizerFee)}</strong></span>
              <span>Total across {durationMonths} Mo: <strong className="text-[var(--m3-on-surface)] font-mono">{formatCurrency(projectedLifetimeCharges)}</strong></span>
            </div>
          </div>

          {/* Dates & Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[var(--m3-on-surface)] flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[var(--m3-primary)]" />
                <span>Start Date</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--m3-surface-container-lowest)] border border-[var(--m3-outline-variant)] rounded-xl text-xs text-[var(--m3-on-surface)] font-mono focus:outline-none focus:border-[var(--m3-primary)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[var(--m3-on-surface)]">
                Auction Day of Month
              </label>
              <input
                type="number"
                min={1}
                max={28}
                value={auctionDayOfMonth}
                onChange={(e) => setAuctionDayOfMonth(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[var(--m3-surface-container-lowest)] border border-[var(--m3-outline-variant)] rounded-xl text-xs text-[var(--m3-on-surface)] font-mono focus:outline-none focus:border-[var(--m3-primary)]"
              />
              <span className="text-[10px] text-[var(--m3-on-surface-variant)] opacity-70">{auctionDayOfMonth}th of each month</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[var(--m3-on-surface)]">
                Payment Due Day
              </label>
              <input
                type="number"
                min={1}
                max={28}
                value={paymentDueDayOfMonth}
                onChange={(e) => setPaymentDueDayOfMonth(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[var(--m3-surface-container-lowest)] border border-[var(--m3-outline-variant)] rounded-xl text-xs text-[var(--m3-on-surface)] font-mono focus:outline-none focus:border-[var(--m3-primary)]"
              />
              <span className="text-[10px] text-[var(--m3-on-surface-variant)] opacity-70">{paymentDueDayOfMonth}th of each month</span>
            </div>
          </div>

          {/* Mathematical Plan Architecture Summary Card */}
          <div className="p-4 rounded-2xl bg-[var(--m3-surface-container-low)] border border-[var(--m3-outline-variant)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--m3-primary)]" />
                <h4 className="text-xs font-bold text-[var(--m3-on-surface)] uppercase tracking-wider">
                  Live Plan Architecture Blueprint
                </h4>
              </div>
              <span className="text-[11px] font-mono text-[var(--m3-primary)] font-bold">
                {name || 'New Plan'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="bg-[var(--m3-surface-container)] p-2.5 rounded-xl border border-[var(--m3-outline-variant)]">
                <div className="text-[10px] text-[var(--m3-on-surface-variant)] opacity-80">Total Pot</div>
                <div className="text-sm font-bold font-mono text-[var(--m3-primary)] mt-0.5">
                  {formatCurrency(totalPot)}
                </div>
              </div>

              <div className="bg-[var(--m3-surface-container)] p-2.5 rounded-xl border border-[var(--m3-outline-variant)]">
                <div className="text-[10px] text-[var(--m3-on-surface-variant)] opacity-80">Base Share / Mo</div>
                <div className="text-sm font-bold font-mono text-[var(--m3-on-surface)] mt-0.5">
                  {formatCurrency(computedBaseShare)}
                </div>
                <div className="text-[9px] text-[var(--m3-on-surface-variant)] opacity-60">per member</div>
              </div>

              <div className="bg-[var(--m3-surface-container)] p-2.5 rounded-xl border border-[var(--m3-outline-variant)]">
                <div className="text-[10px] text-[var(--m3-on-surface-variant)] opacity-80">Organizer Fee</div>
                <div className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                  {formatCurrency(computedOrganizerFee)}
                </div>
                <div className="text-[9px] text-[var(--m3-on-surface-variant)] opacity-60">auto-deducted</div>
              </div>

              <div className="bg-[var(--m3-surface-container)] p-2.5 rounded-xl border border-[var(--m3-outline-variant)]">
                <div className="text-[10px] text-[var(--m3-on-surface-variant)] opacity-80">Tenure</div>
                <div className="text-sm font-bold font-mono text-[var(--m3-on-surface)] mt-0.5">
                  {durationMonths} Mo
                </div>
                <div className="text-[9px] text-[var(--m3-on-surface-variant)] opacity-60">{memberCount} members</div>
              </div>
            </div>

            <p className="text-[11px] text-[var(--m3-on-surface-variant)] bg-[var(--m3-surface-container)] p-3 rounded-xl border border-[var(--m3-outline-variant)]">
              💡 <strong>Algorithm:</strong> In each reverse auction, winning discount bids will be reduced by <strong className="text-amber-600 dark:text-amber-400 font-mono">{formatCurrency(computedOrganizerFee)}</strong> for organizer charges. The net remaining dividend pool will be equally divided among all <strong className="text-[var(--m3-on-surface)]">{memberCount} members</strong>.
            </p>
          </div>

          {/* Optional Member Customizer Accordion */}
          <div className="border border-[var(--m3-outline-variant)] rounded-2xl overflow-hidden bg-[var(--m3-surface-container-low)]">
            <button
              type="button"
              onClick={() => setShowMemberCustomizer(!showMemberCustomizer)}
              className="w-full p-3.5 flex items-center justify-between text-xs font-semibold text-[var(--m3-on-surface)] hover:bg-[var(--m3-surface-container-high)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[var(--m3-primary)]" />
                <span>Customize Initial Member Names ({memberCount} slots)</span>
                <span className="text-[10px] font-normal text-[var(--m3-on-surface-variant)] opacity-70">
                  {showMemberCustomizer ? 'Click to collapse' : 'Click to edit names & phones'}
                </span>
              </div>
              {showMemberCustomizer ? (
                <ChevronUp className="w-4 h-4 text-[var(--m3-on-surface-variant)]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[var(--m3-on-surface-variant)]" />
              )}
            </button>

            {showMemberCustomizer && (
              <div className="p-3.5 border-t border-[var(--m3-outline-variant)] space-y-2.5 max-h-48 overflow-y-auto">
                <p className="text-[11px] text-[var(--m3-on-surface-variant)]">
                  You can name your members now, or manage and edit them anytime in the Members tab.
                </p>
                {customMemberList.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[var(--m3-on-surface-variant)] w-6 opacity-75">#{idx + 1}</span>
                    <input
                      type="text"
                      value={m.name}
                      placeholder={`Member ${idx + 1}`}
                      onChange={(e) => {
                        const updated = [...customMemberList];
                        updated[idx].name = e.target.value;
                        setCustomMemberList(updated);
                      }}
                      className="flex-1 px-3 py-1.5 bg-[var(--m3-surface-container-lowest)] border border-[var(--m3-outline-variant)] rounded-lg text-xs text-[var(--m3-on-surface)] focus:outline-none focus:border-[var(--m3-primary)]"
                    />
                    <input
                      type="text"
                      value={m.phone}
                      placeholder="Phone"
                      onChange={(e) => {
                        const updated = [...customMemberList];
                        updated[idx].phone = e.target.value;
                        setCustomMemberList(updated);
                      }}
                      className="w-32 px-3 py-1.5 bg-[var(--m3-surface-container-lowest)] border border-[var(--m3-outline-variant)] rounded-lg text-xs text-[var(--m3-on-surface)] font-mono focus:outline-none focus:border-[var(--m3-primary)]"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--m3-outline-variant)]">
            <button
              type="button"
              onClick={onClose}
              className="m3-btn-outlined px-4 py-2 cursor-pointer text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="m3-btn-primary px-5 py-2 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create Chit Fund Plan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
