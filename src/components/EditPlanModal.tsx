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
  Trash2, 
  AlertTriangle,
  Info,
  CheckCircle2,
  Lock,
  Search,
  UserPlus
} from 'lucide-react';
import { ChitGroup, Member, Payment, Auction } from '../types/chit';
import { formatCurrency } from '../utils/calculations';
import { playNotificationTone } from '../utils/notifications';

interface EditPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: ChitGroup;
  members: Member[];
  payments: Payment[];
  auctions: Auction[];
  onSavePlan: (updatedGroup: ChitGroup, updatedMembers: Member[], affectedPayments: Payment[]) => void;
  soundEnabled?: boolean;
}

interface EditableMember {
  id: string;
  name: string;
  phone: string;
  upiId: string;
  hasWonAuction: boolean;
  wonMonth?: number;
  totalPaid: number;
  totalReceived: number;
  joinedDate: string;
  notes?: string;
  isNew?: boolean;
}

export const EditPlanModal: React.FC<EditPlanModalProps> = ({
  isOpen,
  onClose,
  group,
  members,
  payments,
  auctions,
  onSavePlan,
  soundEnabled = true,
}) => {
  // Active navigation tab inside modal
  const [activeTab, setActiveTab] = useState<'architecture' | 'schedule' | 'members'>('architecture');

  // Plan Form State
  const [name, setName] = useState<string>(group.name);
  const [totalPot, setTotalPot] = useState<number>(group.totalPot);
  const [durationMonths, setDurationMonths] = useState<number>(group.durationMonths);
  const [memberCount, setMemberCount] = useState<number>(group.memberCount);
  const [status, setStatus] = useState<'active' | 'completed'>(group.status || 'active');

  // Organizer Charges Configuration
  const [chargeType, setChargeType] = useState<'fixed' | 'percent'>('fixed');
  const [organizerFeeAmount, setOrganizerFeeAmount] = useState<number>(group.organizerFee);
  const [organizerFeePercent, setOrganizerFeePercent] = useState<number>(
    Math.round((group.organizerFee / (group.totalPot || 1)) * 100) || 5
  );

  // Schedule Dates
  const [startDate, setStartDate] = useState<string>(group.startDate || new Date().toISOString().split('T')[0]);
  const [auctionDayOfMonth, setAuctionDayOfMonth] = useState<number>(group.auctionDayOfMonth || 5);
  const [paymentDueDayOfMonth, setPaymentDueDayOfMonth] = useState<number>(group.paymentDueDayOfMonth || 25);

  // Future pending payments sync option
  const [syncFutureDues, setSyncFutureDues] = useState<boolean>(true);

  // Editable Members State
  const [editableMembers, setEditableMembers] = useState<EditableMember[]>([]);
  const [memberSearch, setMemberSearch] = useState<string>('');

  // Completed auctions for this group
  const completedAuctions = auctions.filter((a) => a.groupId === group.id && (a.status === 'completed' || a.winningBid > 0));

  // Sync internal state whenever modal opens or group changes
  useEffect(() => {
    if (isOpen) {
      setName(group.name);
      setTotalPot(group.totalPot);
      setDurationMonths(group.durationMonths);
      setMemberCount(group.memberCount);
      setStatus(group.status || 'active');
      setOrganizerFeeAmount(group.organizerFee);
      setStartDate(group.startDate || new Date().toISOString().split('T')[0]);
      setAuctionDayOfMonth(group.auctionDayOfMonth || 5);
      setPaymentDueDayOfMonth(group.paymentDueDayOfMonth || 25);

      const groupMembers = members.filter((m) => m.groupId === group.id);
      setEditableMembers(
        groupMembers.map((m) => ({
          id: m.id,
          name: m.name,
          phone: m.phone,
          upiId: m.upiId || '',
          hasWonAuction: m.hasWonAuction,
          wonMonth: m.wonMonth,
          totalPaid: m.totalPaid,
          totalReceived: m.totalReceived,
          joinedDate: m.joinedDate,
          notes: m.notes || '',
        }))
      );
    }
  }, [isOpen, group, members]);

  if (!isOpen) return null;

  // Computed Charges
  const computedOrganizerFee = chargeType === 'fixed'
    ? organizerFeeAmount
    : Math.round((totalPot * organizerFeePercent) / 100);

  // Computed Base Share
  const effectiveMemberCapacity = Math.max(1, memberCount);
  const computedBaseShare = Math.round(totalPot / effectiveMemberCapacity);
  const oldBaseShare = group.monthlyBaseShare;
  const isBaseShareChanged = computedBaseShare !== oldBaseShare;

  // Quick Amount Presets
  const potPresets = [50000, 100000, 200000, 500000, 1000000, 2500000];
  const durationPresets = [10, 12, 15, 20, 25];

  // Member Handlers
  const handleUpdateMemberField = (id: string, field: keyof EditableMember, value: string) => {
    setEditableMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const handleAddNewMember = () => {
    const nextNumber = editableMembers.length + 1;
    const newMember: EditableMember = {
      id: `mem-${group.id}-${Date.now()}-${nextNumber}`,
      name: `Member ${nextNumber}`,
      phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
      upiId: `member${nextNumber}@upi`,
      hasWonAuction: false,
      totalPaid: 0,
      totalReceived: 0,
      joinedDate: new Date().toISOString().split('T')[0],
      isNew: true,
    };
    const updated = [...editableMembers, newMember];
    setEditableMembers(updated);
    if (updated.length > memberCount) {
      setMemberCount(updated.length);
    }
  };

  const handleRemoveMember = (id: string) => {
    const target = editableMembers.find((m) => m.id === id);
    if (!target) return;

    if (target.hasWonAuction) {
      alert(`Cannot remove "${target.name}" because they have already won Auction Month ${target.wonMonth}.`);
      return;
    }

    const hasPaid = payments.some((p) => p.groupId === group.id && p.memberId === id && p.amountPaid > 0);
    if (hasPaid) {
      if (!confirm(`Member "${target.name}" has recorded payments. Are you sure you want to remove them from this plan?`)) {
        return;
      }
    }

    const filtered = editableMembers.filter((m) => m.id !== id);
    setEditableMembers(filtered);
    if (memberCount > filtered.length) {
      setMemberCount(filtered.length);
    }
  };

  const filteredMembers = editableMembers.filter((m) => {
    const q = memberSearch.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.phone.toLowerCase().includes(q) ||
      m.upiId.toLowerCase().includes(q)
    );
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Please enter a valid plan name.');
      return;
    }

    if (totalPot <= 0) {
      alert('Please enter a valid total pot amount.');
      return;
    }

    if (memberCount <= 0) {
      alert('Please specify a valid member count.');
      return;
    }

    // 1. Prepare updated group
    const updatedGroup: ChitGroup = {
      ...group,
      name: name.trim(),
      totalPot: Number(totalPot),
      durationMonths: Number(durationMonths),
      memberCount: Number(memberCount),
      organizerFee: Number(computedOrganizerFee),
      monthlyBaseShare: computedBaseShare,
      startDate,
      auctionDayOfMonth: Number(auctionDayOfMonth),
      paymentDueDayOfMonth: Number(paymentDueDayOfMonth),
      status,
    };

    // 2. Prepare updated member objects
    const finalMembers: Member[] = editableMembers.map((em) => ({
      id: em.id,
      groupId: group.id,
      name: em.name.trim() || 'Unnamed Member',
      phone: em.phone.trim() || '0000000000',
      upiId: em.upiId.trim() || undefined,
      hasWonAuction: em.hasWonAuction,
      wonMonth: em.wonMonth,
      totalPaid: em.totalPaid,
      totalReceived: em.totalReceived,
      joinedDate: em.joinedDate,
      notes: em.notes?.trim() || undefined,
    }));

    // 3. Prepare updated payments if sync is enabled
    // Only adjust payments that belong to this group, are not paid yet, and whose auction has NOT been completed
    const completedMonthNumbers = new Set(completedAuctions.map((a) => a.monthNumber));
    let affectedPayments: Payment[] = [...payments];

    if (syncFutureDues && isBaseShareChanged) {
      affectedPayments = payments.map((p) => {
        if (p.groupId === group.id && !completedMonthNumbers.has(p.monthNumber) && p.amountPaid === 0) {
          return {
            ...p,
            amountDue: computedBaseShare,
          };
        }
        return p;
      });
    }

    if (soundEnabled) {
      playNotificationTone('success');
    }

    onSavePlan(updatedGroup, finalMembers, affectedPayments);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div 
        className="m3-dialog w-full max-w-3xl my-6 flex flex-col max-h-[92vh] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-[var(--m3-on-surface)]">
                  Edit Chit Fund Plan
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--m3-surface-container-high)] text-[var(--m3-on-surface-variant)] font-mono font-semibold">
                  {group.name}
                </span>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                  status === 'active' 
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' 
                    : 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400'
                }`}>
                  {status}
                </span>
              </div>
              <p className="text-xs text-[var(--m3-on-surface-variant)] mt-0.5">
                Update scheme parameters, adjust pot amount, modify schedule dates, or edit enrolled members
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[var(--m3-on-surface-variant)] hover:text-[var(--m3-on-surface)] rounded-full hover:bg-[var(--m3-surface-container-high)] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center border-b border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-low)] px-5 gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('architecture')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'architecture'
                ? 'border-[var(--m3-primary)] text-[var(--m3-primary)] font-bold'
                : 'border-transparent text-[var(--m3-on-surface-variant)] hover:text-[var(--m3-on-surface)]'
            }`}
          >
            <IndianRupee className="w-4 h-4" />
            <span>Plan Architecture & Amount</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'schedule'
                ? 'border-[var(--m3-primary)] text-[var(--m3-primary)] font-bold'
                : 'border-transparent text-[var(--m3-on-surface-variant)] hover:text-[var(--m3-on-surface)]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Schedule & Rules</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'members'
                ? 'border-[var(--m3-primary)] text-[var(--m3-primary)] font-bold'
                : 'border-transparent text-[var(--m3-on-surface-variant)] hover:text-[var(--m3-on-surface)]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Plan Members ({editableMembers.length})</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* TAB 1: Plan Architecture */}
          {activeTab === 'architecture' && (
            <div className="space-y-6 animate-fade-in">
              {/* Plan Name & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[var(--m3-on-surface)] mb-1">
                    Plan Scheme Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sri Lakshmi Chit Fund ₹1 Lakh"
                    className="w-full text-sm rounded-xl px-3.5 py-2.5 bg-[var(--m3-surface-container)] text-[var(--m3-on-surface)] border border-[var(--m3-outline-variant)] focus:border-[var(--m3-primary)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--m3-on-surface)] mb-1">
                    Plan Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'completed')}
                    className="w-full text-sm rounded-xl px-3.5 py-2.5 bg-[var(--m3-surface-container)] text-[var(--m3-on-surface)] border border-[var(--m3-outline-variant)] focus:border-[var(--m3-primary)] focus:outline-none cursor-pointer"
                  >
                    <option value="active">Active Running</option>
                    <option value="completed">Completed / Settled</option>
                  </select>
                </div>
              </div>

              {/* Total Pot Amount */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[var(--m3-on-surface)]">
                    Total Chit Pot Amount (₹) *
                  </label>
                  <span className="text-xs font-bold font-mono text-[var(--m3-primary)]">
                    {formatCurrency(totalPot)}
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--m3-on-surface-variant)]">
                    <IndianRupee className="w-4 h-4" />
                  </div>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    required
                    value={totalPot}
                    onChange={(e) => setTotalPot(Math.max(1000, Number(e.target.value)))}
                    className="w-full pl-10 text-sm font-mono font-bold rounded-xl px-3.5 py-2.5 bg-[var(--m3-surface-container)] text-[var(--m3-on-surface)] border border-[var(--m3-outline-variant)] focus:border-[var(--m3-primary)] focus:outline-none"
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  <span className="text-[11px] text-[var(--m3-on-surface-variant)] mr-1">Presets:</span>
                  {potPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTotalPot(preset)}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                        totalPot === preset
                          ? 'm3-chip-selected font-bold border-transparent'
                          : 'bg-[var(--m3-surface-container-low)] border-[var(--m3-outline-variant)] text-[var(--m3-on-surface-variant)] hover:bg-[var(--m3-surface-container-high)]'
                      }`}
                    >
                      {formatCurrency(preset)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration & Member Capacity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-[var(--m3-on-surface)]">
                      Duration (Months) *
                    </label>
                    <span className="text-xs font-mono text-[var(--m3-on-surface-variant)]">
                      {durationMonths} Months ({group.currentMonth}/{durationMonths})
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--m3-on-surface-variant)]">
                      <Clock className="w-4 h-4" />
                    </div>
                    <input
                      type="number"
                      min={Math.max(2, completedAuctions.length)}
                      max="100"
                      required
                      value={durationMonths}
                      onChange={(e) => setDurationMonths(Math.max(2, Number(e.target.value)))}
                      className="w-full pl-10 text-sm font-mono rounded-xl px-3.5 py-2.5 bg-[var(--m3-surface-container)] text-[var(--m3-on-surface)] border border-[var(--m3-outline-variant)] focus:border-[var(--m3-primary)] focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    {durationPresets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setDurationMonths(preset)}
                        className={`text-[11px] px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                          durationMonths === preset
                            ? 'm3-chip-selected font-bold border-transparent'
                            : 'bg-[var(--m3-surface-container-low)] border-[var(--m3-outline-variant)] text-[var(--m3-on-surface-variant)] hover:bg-[var(--m3-surface-container-high)]'
                        }`}
                      >
                        {preset} Mo
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-[var(--m3-on-surface)]">
                      Member Capacity *
                    </label>
                    <span className="text-xs font-mono text-[var(--m3-on-surface-variant)]">
                      {editableMembers.length} Enrolled
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--m3-on-surface-variant)]">
                      <Users className="w-4 h-4" />
                    </div>
                    <input
                      type="number"
                      min={Math.max(1, editableMembers.length)}
                      max="100"
                      required
                      value={memberCount}
                      onChange={(e) => setMemberCount(Math.max(1, Number(e.target.value)))}
                      className="w-full pl-10 text-sm font-mono rounded-xl px-3.5 py-2.5 bg-[var(--m3-surface-container)] text-[var(--m3-on-surface)] border border-[var(--m3-outline-variant)] focus:border-[var(--m3-primary)] focus:outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-[var(--m3-on-surface-variant)] mt-1.5">
                    Must be at least {editableMembers.length} to accommodate current members.
                  </p>
                </div>
              </div>

              {/* Organizer / Foreman Fee */}
              <div className="p-4 rounded-2xl bg-[var(--m3-surface-container-low)] border border-[var(--m3-outline-variant)] space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-[var(--m3-on-surface)]">
                      Organizer / Foreman Monthly Fee
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 bg-[var(--m3-surface-container)] p-1 rounded-full border border-[var(--m3-outline-variant)]">
                    <button
                      type="button"
                      onClick={() => setChargeType('fixed')}
                      className={`text-[11px] px-3 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                        chargeType === 'fixed'
                          ? 'm3-chip-selected'
                          : 'text-[var(--m3-on-surface-variant)] hover:text-[var(--m3-on-surface)]'
                      }`}
                    >
                      Fixed (₹)
                    </button>
                    <button
                      type="button"
                      onClick={() => setChargeType('percent')}
                      className={`text-[11px] px-3 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                        chargeType === 'percent'
                          ? 'm3-chip-selected'
                          : 'text-[var(--m3-on-surface-variant)] hover:text-[var(--m3-on-surface)]'
                      }`}
                    >
                      Percent (%)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div>
                    {chargeType === 'fixed' ? (
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--m3-on-surface-variant)]">
                          <IndianRupee className="w-4 h-4" />
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={organizerFeeAmount}
                          onChange={(e) => setOrganizerFeeAmount(Math.max(0, Number(e.target.value)))}
                          placeholder="e.g. 1500"
                          className="w-full pl-9 text-sm font-mono rounded-xl px-3 py-2 bg-[var(--m3-surface-container)] text-[var(--m3-on-surface)] border border-[var(--m3-outline-variant)] focus:border-[var(--m3-primary)] focus:outline-none"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          step="0.5"
                          value={organizerFeePercent}
                          onChange={(e) => setOrganizerFeePercent(Math.max(0, Number(e.target.value)))}
                          className="w-24 text-sm font-mono rounded-xl px-3 py-2 bg-[var(--m3-surface-container)] text-[var(--m3-on-surface)] border border-[var(--m3-outline-variant)] focus:border-[var(--m3-primary)] focus:outline-none"
                        />
                        <span className="text-xs text-[var(--m3-on-surface-variant)] font-semibold">% of Pot</span>
                      </div>
                    )}
                  </div>

                  <div className="text-right sm:text-left text-xs text-[var(--m3-on-surface-variant)]">
                    <div>
                      Effective Fee: <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{formatCurrency(computedOrganizerFee)} / month</span>
                    </div>
                    <div className="text-[11px] opacity-75">
                      Lifetime: {formatCurrency(computedOrganizerFee * durationMonths)} across {durationMonths} months
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Live Blueprint Card */}
              <div className="p-4 rounded-2xl bg-[var(--m3-surface-container)] border border-[var(--m3-outline-variant)]">
                <div className="flex items-center justify-between text-xs font-bold text-[var(--m3-on-surface)] mb-3">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[var(--m3-primary)]" />
                    <span>Recalculated Financial Blueprint</span>
                  </span>
                  {isBaseShareChanged && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      Base Share Updated
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[var(--m3-surface-container-low)] border border-[var(--m3-outline-variant)]">
                    <span className="text-[10px] text-[var(--m3-on-surface-variant)] block">Total Scheme Pot</span>
                    <span className="text-sm font-bold font-mono text-[var(--m3-primary)] mt-0.5 block">
                      {formatCurrency(totalPot)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--m3-surface-container-low)] border border-[var(--m3-outline-variant)]">
                    <span className="text-[10px] text-[var(--m3-on-surface-variant)] block">Base Share / Month</span>
                    <span className="text-sm font-bold font-mono text-[var(--m3-on-surface)] mt-0.5 block">
                      {formatCurrency(computedBaseShare)}
                    </span>
                    {isBaseShareChanged && (
                      <span className="text-[9px] text-[var(--m3-on-surface-variant)] line-through">
                        was {formatCurrency(oldBaseShare)}
                      </span>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--m3-surface-container-low)] border border-[var(--m3-outline-variant)]">
                    <span className="text-[10px] text-[var(--m3-on-surface-variant)] block">Organizer Charges</span>
                    <span className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5 block">
                      {formatCurrency(computedOrganizerFee)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--m3-surface-container-low)] border border-[var(--m3-outline-variant)]">
                    <span className="text-[10px] text-[var(--m3-on-surface-variant)] block">Completed Cycles</span>
                    <span className="text-sm font-bold font-mono text-[var(--m3-on-surface)] mt-0.5 block">
                      {completedAuctions.length} of {durationMonths}
                    </span>
                  </div>
                </div>

                {isBaseShareChanged && (
                  <div className="mt-3 pt-3 border-t border-[var(--m3-outline-variant)] flex items-center justify-between gap-3 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-[var(--m3-on-surface)]">
                      <input
                        type="checkbox"
                        checked={syncFutureDues}
                        onChange={(e) => setSyncFutureDues(e.target.checked)}
                        className="rounded border-[var(--m3-outline-variant)] text-[var(--m3-primary)] focus:ring-[var(--m3-primary)]"
                      />
                      <span>Update pending upcoming installment dues to {formatCurrency(computedBaseShare)}</span>
                    </label>
                    <span className="text-[10px] text-[var(--m3-on-surface-variant)] opacity-80">
                      Preserves completed auction records
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Schedule & Rules */}
          {activeTab === 'schedule' && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded-2xl bg-[var(--m3-surface-container-low)] border border-[var(--m3-outline-variant)]">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--m3-on-surface)] mb-2">
                  <Calendar className="w-4 h-4 text-[var(--m3-primary)]" />
                  <span>Chit Fund Timeline & Recurrence Rules</span>
                </div>
                <p className="text-xs text-[var(--m3-on-surface-variant)] leading-relaxed">
                  Auctions take place automatically on the specified auction day. Payment installments are due on the payment due day. Setting these correctly drives the countdown clock and daily 8:00 AM WhatsApp reminder scans.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--m3-on-surface)] mb-1">
                    Scheme Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-sm rounded-xl px-3.5 py-2.5 bg-[var(--m3-surface-container)] text-[var(--m3-on-surface)] border border-[var(--m3-outline-variant)] focus:border-[var(--m3-primary)] focus:outline-none"
                  />
                  <p className="text-[11px] text-[var(--m3-on-surface-variant)] mt-1">
                    Initial launch date
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--m3-on-surface)] mb-1">
                    Monthly Auction Day *
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="28"
                      required
                      value={auctionDayOfMonth}
                      onChange={(e) => setAuctionDayOfMonth(Math.min(28, Math.max(1, Number(e.target.value))))}
                      className="w-full text-sm font-mono rounded-xl px-3.5 py-2.5 bg-[var(--m3-surface-container)] text-[var(--m3-on-surface)] border border-[var(--m3-outline-variant)] focus:border-[var(--m3-primary)] focus:outline-none"
                    />
                    <span className="text-xs text-[var(--m3-on-surface-variant)] whitespace-nowrap">th of month</span>
                  </div>
                  <p className="text-[11px] text-[var(--m3-on-surface-variant)] mt-1">
                    Reverse auction session date
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--m3-on-surface)] mb-1">
                    Payment Due Day *
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="28"
                      required
                      value={paymentDueDayOfMonth}
                      onChange={(e) => setPaymentDueDayOfMonth(Math.min(28, Math.max(1, Number(e.target.value))))}
                      className="w-full text-sm font-mono rounded-xl px-3.5 py-2.5 bg-[var(--m3-surface-container)] text-[var(--m3-on-surface)] border border-[var(--m3-outline-variant)] focus:border-[var(--m3-primary)] focus:outline-none"
                    />
                    <span className="text-xs text-[var(--m3-on-surface-variant)] whitespace-nowrap">th of month</span>
                  </div>
                  <p className="text-[11px] text-[var(--m3-on-surface-variant)] mt-1">
                    Last day before overdue status
                  </p>
                </div>
              </div>

              {/* Schedule Summary Banner */}
              <div className="p-4 rounded-2xl bg-[var(--m3-surface-container)] border border-[var(--m3-outline-variant)] flex items-start gap-3">
                <Info className="w-4 h-4 text-[var(--m3-primary)] shrink-0 mt-0.5" />
                <div className="text-xs text-[var(--m3-on-surface-variant)] space-y-1">
                  <p className="text-[var(--m3-on-surface)] font-semibold">
                    Current Calendar Cycle
                  </p>
                  <p>
                    Auctions are scheduled for the <strong>{auctionDayOfMonth}th</strong> of every month.
                    Members must submit their monthly installment by the <strong>{paymentDueDayOfMonth}th</strong>.
                    Automated reminders trigger 3 days prior, on due date, and continuously if overdue.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Plan Members Management */}
          {activeTab === 'members' && (
            <div className="space-y-4 animate-fade-in">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--m3-on-surface-variant)]" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search by member name, phone, or UPI ID..."
                    className="w-full pl-10 text-xs rounded-xl px-3.5 py-2 bg-[var(--m3-surface-container)] text-[var(--m3-on-surface)] border border-[var(--m3-outline-variant)] focus:border-[var(--m3-primary)] focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddNewMember}
                    className="m3-btn-primary px-3.5 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add Member Slot</span>
                  </button>
                </div>
              </div>

              {/* Roster Table / List */}
              <div className="m3-card overflow-hidden">
                <div className="p-3 bg-[var(--m3-surface-container-high)] border-b border-[var(--m3-outline-variant)] flex items-center justify-between text-xs font-semibold text-[var(--m3-on-surface)]">
                  <span>Enrolled Members Roster ({editableMembers.length} / {memberCount} slots)</span>
                  <span className="text-[11px] text-[var(--m3-on-surface-variant)]">
                    {editableMembers.filter(m => m.hasWonAuction).length} Won · {editableMembers.filter(m => !m.hasWonAuction).length} Active Bidders
                  </span>
                </div>

                <div className="divide-y divide-[var(--m3-outline-variant)] max-h-96 overflow-y-auto">
                  {filteredMembers.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[var(--m3-on-surface-variant)]">
                      No members matching "{memberSearch}".
                    </div>
                  ) : (
                    filteredMembers.map((member, idx) => (
                      <div
                        key={member.id}
                        className={`p-3.5 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                          member.isNew ? 'bg-[var(--m3-primary-container)]/10' : 'hover:bg-[var(--m3-surface-container-low)]'
                        }`}
                      >
                        {/* Member Index & Badge */}
                        <div className="flex items-center gap-2.5 min-w-[140px]">
                          <span className="w-6 h-6 rounded-full bg-[var(--m3-surface-container-high)] text-[var(--m3-on-surface-variant)] text-[11px] font-mono font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div>
                            {member.hasWonAuction ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" />
                                <span>Won M{member.wonMonth}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                Active Bidder
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Editable Inputs */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1 w-full">
                          <div>
                            <input
                              type="text"
                              required
                              value={member.name}
                              onChange={(e) => handleUpdateMemberField(member.id, 'name', e.target.value)}
                              placeholder="Member Name"
                              className="w-full text-xs font-semibold rounded-lg px-2.5 py-1.5 bg-[var(--m3-surface-container)] text-[var(--m3-on-surface)] border border-[var(--m3-outline-variant)] focus:border-[var(--m3-primary)] focus:outline-none"
                            />
                          </div>

                          <div>
                            <input
                              type="text"
                              required
                              value={member.phone}
                              onChange={(e) => handleUpdateMemberField(member.id, 'phone', e.target.value)}
                              placeholder="Phone / WhatsApp"
                              className="w-full text-xs font-mono rounded-lg px-2.5 py-1.5 bg-[var(--m3-surface-container)] text-[var(--m3-on-surface)] border border-[var(--m3-outline-variant)] focus:border-[var(--m3-primary)] focus:outline-none"
                            />
                          </div>

                          <div>
                            <input
                              type="text"
                              value={member.upiId}
                              onChange={(e) => handleUpdateMemberField(member.id, 'upiId', e.target.value)}
                              placeholder="UPI ID (optional)"
                              className="w-full text-xs font-mono rounded-lg px-2.5 py-1.5 bg-[var(--m3-surface-container)] text-[var(--m3-on-surface)] border border-[var(--m3-outline-variant)] focus:border-[var(--m3-primary)] focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(member.id)}
                            disabled={member.hasWonAuction}
                            className={`p-1.5 rounded-full transition-colors ${
                              member.hasWonAuction
                                ? 'opacity-30 cursor-not-allowed text-[var(--m3-on-surface-variant)]'
                                : 'text-[var(--m3-on-surface-variant)] hover:text-rose-500 hover:bg-[var(--m3-surface-container-high)] cursor-pointer'
                            }`}
                            title={member.hasWonAuction ? 'Cannot delete member who has won an auction' : 'Remove member from plan'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[var(--m3-outline-variant)] flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-[var(--m3-on-surface-variant)]">
              All modifications persist to local storage and sync across all views.
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial m3-btn-outlined px-4 py-2.5 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 sm:flex-initial m3-btn-primary px-5 py-2.5 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>Save Plan Changes</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
