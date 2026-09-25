import React from 'react';
import { 
  Layers, 
  Plus, 
  CheckCircle2, 
  Users, 
  Clock, 
  IndianRupee, 
  ShieldCheck, 
  Trash2, 
  ArrowRight,
  TrendingUp,
  Sparkles,
  Edit2
} from 'lucide-react';
import { ChitGroup, Member, Payment, Auction } from '../types/chit';
import { formatCurrency } from '../utils/calculations';

interface ChitPlansViewProps {
  groups: ChitGroup[];
  activeGroupId: string;
  onSelectGroup: (groupId: string) => void;
  onOpenCreatePlanModal: () => void;
  onEditGroup: (group: ChitGroup) => void;
  onDeleteGroup: (groupId: string) => void;
  allMembers: Member[];
  allPayments: Payment[];
  allAuctions: Auction[];
  onNavigateToTab: (tab: string) => void;
}

export const ChitPlansView: React.FC<ChitPlansViewProps> = ({
  groups,
  activeGroupId,
  onSelectGroup,
  onOpenCreatePlanModal,
  onEditGroup,
  onDeleteGroup,
  allMembers,
  allPayments,
  allAuctions,
  onNavigateToTab,
}) => {
  // Aggregate stats across all plans
  const totalCombinedPot = groups.reduce((acc, g) => acc + g.totalPot, 0);
  const totalMembersAllPlans = allMembers.length;
  const totalMonthlyOrganizerEarnings = groups.reduce((acc, g) => acc + g.organizerFee, 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 m3-card p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-full bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)]">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--m3-on-surface)] flex items-center gap-2 flex-wrap">
              <span>Chit Fund Plans & Schemes</span>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)] font-bold">
                {groups.length} {groups.length === 1 ? 'Plan' : 'Plans'} Active
              </span>
            </h2>
            <p className="text-xs text-[var(--m3-on-surface-variant)] mt-0.5">
              Create and manage multiple concurrent chit groups with custom amounts, durations, members, and organizer fees
            </p>
          </div>
        </div>

        <button
          onClick={onOpenCreatePlanModal}
          className="m3-btn-primary px-4 py-2.5 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Chit Plan</span>
        </button>
      </div>

      {/* Aggregate Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="m3-card p-4">
          <div className="flex items-center justify-between text-[var(--m3-on-surface-variant)] text-xs font-medium">
            <span>Total Combined Pot</span>
            <div className="p-1.5 rounded-full bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)]">
              <IndianRupee className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-[var(--m3-primary)] mt-1.5">
            {formatCurrency(totalCombinedPot)}
          </div>
          <div className="text-[11px] text-[var(--m3-on-surface-variant)] opacity-75 mt-1">
            Across {groups.length} active chit schemes
          </div>
        </div>

        <div className="m3-card p-4">
          <div className="flex items-center justify-between text-[var(--m3-on-surface-variant)] text-xs font-medium">
            <span>Enrolled Members</span>
            <div className="p-1.5 rounded-full bg-[var(--m3-surface-container-high)] text-[var(--m3-on-surface)]">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-[var(--m3-on-surface)] mt-1.5">
            {totalMembersAllPlans}
          </div>
          <div className="text-[11px] text-[var(--m3-on-surface-variant)] opacity-75 mt-1">
            Total participants across all funds
          </div>
        </div>

        <div className="m3-card p-4">
          <div className="flex items-center justify-between text-[var(--m3-on-surface-variant)] text-xs font-medium">
            <span>Monthly Organizer Revenue</span>
            <div className="p-1.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1.5">
            {formatCurrency(totalMonthlyOrganizerEarnings)}
          </div>
          <div className="text-[11px] text-[var(--m3-on-surface-variant)] opacity-75 mt-1">
            Total charges deducted per full cycle
          </div>
        </div>

        <div className="m3-card p-4">
          <div className="flex items-center justify-between text-[var(--m3-on-surface-variant)] text-xs font-medium">
            <span>Active Fund Selected</span>
            <div className="p-1.5 rounded-full bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)]">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-sm font-bold text-[var(--m3-on-surface)] truncate mt-1.5">
            {groups.find((g) => g.id === activeGroupId)?.name || 'Default Plan'}
          </div>
          <div className="text-[11px] text-[var(--m3-primary)] mt-1 flex items-center gap-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--m3-primary)]"></span>
            <span>Dashboard synced</span>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {groups.length === 0 ? (
          <div className="col-span-full m3-card p-10 text-center space-y-4">
            <Layers className="w-12 h-12 text-[var(--m3-primary)] mx-auto opacity-70" />
            <h3 className="font-bold text-lg text-[var(--m3-on-surface)]">No Chit Plans Created</h3>
            <p className="text-xs text-[var(--m3-on-surface-variant)] max-w-md mx-auto">
              All dummy data has been completely cleared. You are ready to start with real data! Click the button below to configure your first chit fund scheme.
            </p>
            <button
              onClick={onOpenCreatePlanModal}
              className="m3-btn-primary px-5 py-2 text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Plan</span>
            </button>
          </div>
        ) : (
          groups.map((group) => {
          const isActive = group.id === activeGroupId;
          const groupMembers = allMembers.filter((m) => m.groupId === group.id);
          const groupAuctions = allAuctions.filter((a) => a.groupId === group.id);
          const groupPayments = allPayments.filter((p) => p.groupId === group.id);

          const totalPaidForGroup = groupPayments.reduce((acc, p) => acc + p.amountPaid, 0);
          const totalOutstandingForGroup = groupPayments
            .filter((p) => p.status !== 'Paid')
            .reduce((acc, p) => acc + (p.amountDue - p.amountPaid), 0);

          const totalLifetimeCommission = group.organizerFee * group.durationMonths;

          return (
            <div
              key={group.id}
              className={`relative m3-card p-5 flex flex-col justify-between transition-all ${
                isActive
                  ? 'border-2 border-[var(--m3-primary)] shadow-md ring-2 ring-[var(--m3-primary)]/20'
                  : 'hover:shadow-md'
              }`}
            >
              {/* Card Header */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-[var(--m3-on-surface)] text-base">
                        {group.name}
                      </h3>
                      {isActive && (
                        <span className="m3-chip-selected text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--m3-on-surface-variant)] mt-0.5 opacity-80">
                      Started: {group.startDate} · Auction: {group.auctionDayOfMonth}th of month
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditGroup(group)}
                      className="p-1.5 text-[var(--m3-on-surface-variant)] hover:text-[var(--m3-primary)] rounded-full hover:bg-[var(--m3-surface-container-high)] transition-colors cursor-pointer"
                      title="Edit Plan Parameters, Pot & Members"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {groups.length > 1 && (
                      <button
                        onClick={() => onDeleteGroup(group.id)}
                        className="p-1.5 text-[var(--m3-on-surface-variant)] hover:text-rose-500 rounded-full hover:bg-[var(--m3-surface-container-high)] transition-colors cursor-pointer"
                        title="Delete Plan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Pot & Base Share Hero Banner */}
                <div className="bg-[var(--m3-surface-container-low)] p-3.5 rounded-xl border border-[var(--m3-outline-variant)] mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[var(--m3-on-surface-variant)] tracking-wider opacity-75">
                        Plan Pot Amount
                      </span>
                      <div className="text-xl font-bold font-mono text-[var(--m3-primary)]">
                        {formatCurrency(group.totalPot)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-[var(--m3-on-surface-variant)] tracking-wider opacity-75">
                        Base Share / Mo
                      </span>
                      <div className="text-sm font-bold font-mono text-[var(--m3-on-surface)]">
                        {formatCurrency(group.monthlyBaseShare)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Parameters Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                  <div className="bg-[var(--m3-surface-container-low)] p-2.5 rounded-xl border border-[var(--m3-outline-variant)]">
                    <span className="text-[10px] text-[var(--m3-on-surface-variant)] flex items-center gap-1 opacity-80">
                      <Clock className="w-3 h-3 text-[var(--m3-primary)]" />
                      <span>Duration</span>
                    </span>
                    <div className="text-xs font-semibold font-mono text-[var(--m3-on-surface)] mt-1">
                      {group.durationMonths} Mo ({group.currentMonth}/{group.durationMonths})
                    </div>
                  </div>

                  <div className="bg-[var(--m3-surface-container-low)] p-2.5 rounded-xl border border-[var(--m3-outline-variant)]">
                    <span className="text-[10px] text-[var(--m3-on-surface-variant)] flex items-center gap-1 opacity-80">
                      <Users className="w-3 h-3 text-[var(--m3-primary)]" />
                      <span>Members Capacity</span>
                    </span>
                    <div className="text-xs font-semibold font-mono text-[var(--m3-on-surface)] mt-1">
                      {groupMembers.length} / {group.memberCount} Enrolled
                    </div>
                  </div>

                  <div className="bg-[var(--m3-surface-container-low)] p-2.5 rounded-xl border border-[var(--m3-outline-variant)]">
                    <span className="text-[10px] text-[var(--m3-on-surface-variant)] flex items-center gap-1 opacity-80">
                      <ShieldCheck className="w-3 h-3 text-amber-500" />
                      <span>Organizer Charges</span>
                    </span>
                    <div className="text-xs font-semibold font-mono text-amber-600 dark:text-amber-400 mt-1">
                      {formatCurrency(group.organizerFee)} / mo
                    </div>
                  </div>

                  <div className="bg-[var(--m3-surface-container-low)] p-2.5 rounded-xl border border-[var(--m3-outline-variant)]">
                    <span className="text-[10px] text-[var(--m3-on-surface-variant)] flex items-center gap-1 opacity-80">
                      <TrendingUp className="w-3 h-3 text-[var(--m3-primary)]" />
                      <span>Total Charges</span>
                    </span>
                    <div className="text-xs font-semibold font-mono text-[var(--m3-on-surface)] mt-1">
                      {formatCurrency(totalLifetimeCommission)}
                    </div>
                  </div>
                </div>

                {/* Progress Mini Bar */}
                <div className="space-y-1 mb-4">
                  <div className="flex items-center justify-between text-[11px] text-[var(--m3-on-surface-variant)]">
                    <span>Tenure Progress</span>
                    <span className="font-mono font-medium text-[var(--m3-on-surface)]">
                      Cycle {group.currentMonth} of {group.durationMonths}
                    </span>
                  </div>
                  <div className="w-full bg-[var(--m3-surface-container-high)] h-2 rounded-full overflow-hidden border border-[var(--m3-outline-variant)]">
                    <div
                      className="h-full bg-[var(--m3-primary)] rounded-full transition-all"
                      style={{ width: `${Math.min(100, (group.currentMonth / group.durationMonths) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Ledger & Outstanding Summary */}
                <div className="flex items-center justify-between text-xs py-2 px-3.5 rounded-xl bg-[var(--m3-surface-container-low)] border border-[var(--m3-outline-variant)] mb-4">
                  <div>
                    <span className="text-[10px] text-[var(--m3-on-surface-variant)] opacity-75">Collected</span>
                    <div className="font-mono font-bold text-[var(--m3-on-surface)]">
                      {formatCurrency(totalPaidForGroup)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[var(--m3-on-surface-variant)] opacity-75">Outstanding</span>
                    <div className={`font-mono font-bold ${totalOutstandingForGroup > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {formatCurrency(totalOutstandingForGroup)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-[var(--m3-outline-variant)] flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onEditGroup(group)}
                  className="px-3 py-2 rounded-full m3-btn-outlined text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  title="Edit Plan Parameters, Pot & Members"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Plan</span>
                </button>

                {isActive ? (
                  <button
                    onClick={() => onNavigateToTab('dashboard')}
                    className="flex-1 py-2 rounded-full m3-btn-tonal text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Open Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => onSelectGroup(group.id)}
                    className="flex-1 py-2 rounded-full m3-btn-primary text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Switch to this Plan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        }))}

        {/* Create Plan Dashed Card */}
        <div
          onClick={onOpenCreatePlanModal}
          className="border-2 border-dashed border-[var(--m3-outline-variant)] hover:border-[var(--m3-primary)] bg-[var(--m3-surface-container-low)] hover:bg-[var(--m3-surface-container)] rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all group min-h-[300px]"
        >
          <div className="w-12 h-12 rounded-full bg-[var(--m3-surface-container-high)] group-hover:bg-[var(--m3-primary-container)] text-[var(--m3-on-surface-variant)] group-hover:text-[var(--m3-on-primary-container)] flex items-center justify-center mb-3 transition-colors">
            <Plus className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-[var(--m3-on-surface)] text-sm">
            Add Another Chit Plan
          </h4>
          <p className="text-xs text-[var(--m3-on-surface-variant)] max-w-xs mt-1 opacity-80">
            Specify a custom pot amount (e.g. ₹1 Lakh, ₹5 Lakh), duration, member slots, and monthly organizer charges.
          </p>
          <span className="mt-4 px-4 py-1.5 rounded-full m3-btn-tonal text-xs font-semibold group-hover:m3-btn-primary transition-all">
            + Configure New Scheme
          </span>
        </div>
      </div>
    </div>
  );
};
