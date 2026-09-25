import React, { useState } from 'react';
import { 
  PlusCircle, 
  IndianRupee, 
  CheckCircle, 
  Clock, 
  Gavel, 
  ShieldCheck, 
  ArrowRight,
  Send,
  Calendar,
  Sparkles
} from 'lucide-react';
import { ChitGroup, Auction, Member } from '../types/chit';
import { formatCurrency, formatDate } from '../utils/calculations';

interface AuctionsAndPayoutsViewProps {
  group: ChitGroup;
  auctions: Auction[];
  members: Member[];
  onOpenAuctionRunner: () => void;
  onUpdateAuctionPayout: (auctionId: string, updates: Partial<Auction>) => void;
  onSelectMember: (member: Member) => void;
}

export const AuctionsAndPayoutsView: React.FC<AuctionsAndPayoutsViewProps> = ({
  group,
  auctions,
  members,
  onOpenAuctionRunner,
  onUpdateAuctionPayout,
  onSelectMember,
}) => {
  const [selectedAuctionForDisburse, setSelectedAuctionForDisburse] = useState<Auction | null>(null);
  const [disburseMethod, setDisburseMethod] = useState<'Bank Transfer' | 'UPI' | 'Cash' | 'Cheque'>('Bank Transfer');
  const [disburseRef, setDisburseRef] = useState<string>('');
  const [disburseDate, setDisburseDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Total organizer fee earned
  const totalOrganizerFeeEarned = auctions.reduce((acc, a) => acc + a.organizerFee, 0);
  const totalPayoutsDisbursed = auctions.filter((a) => a.payoutStatus === 'Disbursed').reduce((acc, a) => acc + a.winnerPayout, 0);

  const handleConfirmDisbursal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAuctionForDisburse) return;

    onUpdateAuctionPayout(selectedAuctionForDisburse.id, {
      payoutStatus: 'Disbursed',
      payoutMethod: disburseMethod,
      payoutReference: disburseRef,
      payoutDisbursedDate: disburseDate,
    });

    setSelectedAuctionForDisburse(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--m3-on-surface)] tracking-tight">Auctions & Payout Scheduling</h2>
          <p className="text-xs text-[var(--m3-on-surface-variant)] mt-0.5">
            Track bidding sessions, automatic {formatCurrency(group.organizerFee)} organizer deductions, and member payout disbursements
          </p>
        </div>

        <button
          onClick={onOpenAuctionRunner}
          className="m3-btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Launch Next Auction</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="m3-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--m3-on-surface-variant)] font-medium">Total Payouts Disbursed</span>
            <div className="p-2 rounded-full bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)]">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-[var(--m3-primary)] mt-2">
            {formatCurrency(totalPayoutsDisbursed)}
          </p>
          <p className="text-xs text-[var(--m3-on-surface-variant)] opacity-75 mt-1">Across {auctions.filter(a => a.payoutStatus === 'Disbursed').length} completed cycles</p>
        </div>

        <div className="m3-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--m3-on-surface-variant)] font-medium">Accumulated Organizer Fee</span>
            <div className="p-2 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-2">
            {formatCurrency(totalOrganizerFeeEarned)}
          </p>
          <p className="text-xs text-[var(--m3-on-surface-variant)] opacity-75 mt-1">{formatCurrency(group.organizerFee)} fixed deduction per auction</p>
        </div>

        <div className="m3-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--m3-on-surface-variant)] font-medium">Completed Sessions</span>
            <div className="p-2 rounded-full bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)]">
              <Gavel className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-[var(--m3-on-surface)] mt-2">
            {auctions.length} of {group.durationMonths}
          </p>
          <p className="text-xs text-[var(--m3-on-surface-variant)] opacity-75 mt-1">{group.durationMonths - auctions.length} sessions remaining</p>
        </div>
      </div>

      {/* Payout Schedule Table */}
      <div className="m3-card overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[var(--m3-outline-variant)] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-[var(--m3-on-surface)] text-sm">Monthly Winner Payout Schedule</h3>
            <p className="text-xs text-[var(--m3-on-surface-variant)]">Net pot transfer amount after winning bid deduction</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--m3-surface-container-low)] text-[var(--m3-on-surface-variant)] uppercase font-mono text-[10px] border-b border-[var(--m3-outline-variant)]">
              <tr>
                <th className="py-3 px-4">Cycle</th>
                <th className="py-3 px-3">Winner Details</th>
                <th className="py-3 px-3">Winning Bid</th>
                <th className="py-3 px-3">Org. Fee (-{formatCurrency(group.organizerFee)})</th>
                <th className="py-3 px-3">Winner Net Payout</th>
                <th className="py-3 px-3">Payout Status</th>
                <th className="py-3 px-3">Disbursal Details</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--m3-outline-variant)] font-mono">
              {auctions.map((auc) => {
                const winner = members.find((m) => m.id === auc.winnerId);
                const isDisbursed = auc.payoutStatus === 'Disbursed';

                return (
                  <tr key={auc.id} className="hover:bg-[var(--m3-surface-container-high)]/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[var(--m3-on-surface)]">
                      Month {auc.monthNumber}
                    </td>

                    <td className="py-3.5 px-3 font-sans">
                      {winner ? (
                        <div>
                          <button
                            onClick={() => onSelectMember(winner)}
                            className="font-semibold text-[var(--m3-on-surface)] hover:text-[var(--m3-primary)] hover:underline text-left transition-colors cursor-pointer"
                          >
                            {winner.name}
                          </button>
                          <div className="text-[11px] text-[var(--m3-on-surface-variant)] font-mono opacity-80">
                            {winner.phone} {winner.upiId && `· ${winner.upiId}`}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[var(--m3-on-surface-variant)] opacity-60">Unassigned</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-rose-600 dark:text-rose-400 font-bold">
                      -{formatCurrency(auc.winningBid)}
                    </td>

                    <td className="py-3.5 px-3 text-amber-600 dark:text-amber-400 font-semibold">
                      {formatCurrency(auc.organizerFee)}
                    </td>

                    <td className="py-3.5 px-3 text-[var(--m3-primary)] font-bold text-sm">
                      {formatCurrency(auc.winnerPayout)}
                    </td>

                    <td className="py-3.5 px-3 font-sans">
                      {isDisbursed ? (
                        <span className="m3-status-paid text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          <span>Disbursed</span>
                        </span>
                      ) : (
                        <span className="m3-status-pending text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Scheduled</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 font-sans text-[11px]">
                      {isDisbursed ? (
                        <div>
                          <span className="text-[var(--m3-on-surface)] font-medium">{auc.payoutMethod || 'Bank Transfer'}</span>
                          <p className="text-[10px] text-[var(--m3-on-surface-variant)] font-mono opacity-80">
                            {auc.payoutReference || 'REF-OK'} · {formatDate(auc.payoutDisbursedDate || auc.date)}
                          </p>
                        </div>
                      ) : (
                        <span className="text-[var(--m3-on-surface-variant)] opacity-60">Awaiting disbursement</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right font-sans">
                      {!isDisbursed ? (
                        <button
                          onClick={() => setSelectedAuctionForDisburse(auc)}
                          className="m3-btn-primary px-3 py-1 text-xs font-semibold cursor-pointer"
                        >
                          Disburse
                        </button>
                      ) : (
                        <span className="text-[var(--m3-on-surface-variant)] text-xs font-mono opacity-70">Settled</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disbursal Modal */}
      {selectedAuctionForDisburse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="m3-dialog w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-[var(--m3-on-surface)] text-base">Record Payout Disbursal</h3>
            <p className="text-xs text-[var(--m3-on-surface-variant)]">
              Disburse <strong className="text-[var(--m3-primary)]">{formatCurrency(selectedAuctionForDisburse.winnerPayout)}</strong> to the auction winner.
            </p>

            <form onSubmit={handleConfirmDisbursal} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[var(--m3-on-surface)] font-medium mb-1">Disbursal Method</label>
                <select
                  value={disburseMethod}
                  onChange={(e) => setDisburseMethod(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-[var(--m3-surface-container-lowest)] border border-[var(--m3-outline-variant)] rounded-xl text-[var(--m3-on-surface)] focus:outline-none focus:border-[var(--m3-primary)]"
                >
                  <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Cash">Cash Handover</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-[var(--m3-on-surface)] font-medium mb-1">Disbursal Date</label>
                <input
                  type="date"
                  value={disburseDate}
                  onChange={(e) => setDisburseDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[var(--m3-surface-container-lowest)] border border-[var(--m3-outline-variant)] rounded-xl text-[var(--m3-on-surface)] font-mono focus:outline-none focus:border-[var(--m3-primary)]"
                  required
                />
              </div>

              <div>
                <label className="block text-[var(--m3-on-surface)] font-medium mb-1">Transaction Reference / UTR #</label>
                <input
                  type="text"
                  value={disburseRef}
                  onChange={(e) => setDisburseRef(e.target.value)}
                  placeholder="e.g. UTR-99881122"
                  className="w-full px-3.5 py-2.5 bg-[var(--m3-surface-container-lowest)] border border-[var(--m3-outline-variant)] rounded-xl text-[var(--m3-on-surface)] font-mono focus:outline-none focus:border-[var(--m3-primary)]"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedAuctionForDisburse(null)}
                  className="m3-btn-outlined px-4 py-2 cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="m3-btn-primary px-4 py-2 text-xs font-bold cursor-pointer"
                >
                  Confirm Payout Disbursed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
