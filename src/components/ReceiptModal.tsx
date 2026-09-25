import React from 'react';
import { X, Printer, CheckCircle, IndianRupee, ShieldCheck } from 'lucide-react';
import { ChitGroup, Member, Payment } from '../types/chit';
import { formatCurrency, formatDate } from '../utils/calculations';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
  members: Member[];
  group: ChitGroup;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  payment,
  members,
  group,
}) => {
  if (!isOpen || !payment) return null;

  const member = members.find((m) => m.id === payment.memberId);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="m3-dialog w-full max-w-lg overflow-hidden my-6">
        {/* Top Control Bar */}
        <div className="p-4 border-b border-[var(--m3-outline-variant)] flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-xs text-[var(--m3-on-surface)] font-medium">
            <ShieldCheck className="w-4 h-4 text-[var(--m3-primary)]" />
            <span>Digital Payment Voucher</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="m3-btn-primary px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-[var(--m3-on-surface-variant)] hover:text-[var(--m3-on-surface)] hover:bg-[var(--m3-surface-container-highest)] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper */}
        <div className="p-6 sm:p-8 bg-[var(--m3-surface-container-low)] text-[var(--m3-on-surface)] space-y-6 print:bg-white print:text-black">
          {/* Header */}
          <div className="text-center border-b border-[var(--m3-outline-variant)] pb-5">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)] mb-2 font-mono font-bold text-lg">
              ₹
            </div>
            <h2 className="text-lg font-bold tracking-tight text-[var(--m3-on-surface)]">{group.name}</h2>
            <p className="text-xs text-[var(--m3-on-surface-variant)] mt-0.5">
              Official Chit Fund Contribution Acknowledgment
            </p>
            <div className="inline-block mt-2 px-3 py-0.5 rounded-full m3-status-paid text-[10px] font-mono font-bold uppercase tracking-wider">
              Payment Verified
            </div>
          </div>

          {/* Receipt Info Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[var(--m3-on-surface-variant)] opacity-75 block text-[10px] uppercase font-mono">Receipt No</span>
              <span className="font-mono font-semibold text-[var(--m3-on-surface)]">
                REC-{payment.monthNumber}-{payment.id.slice(-6).toUpperCase()}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[var(--m3-on-surface-variant)] opacity-75 block text-[10px] uppercase font-mono">Date Paid</span>
              <span className="font-mono text-[var(--m3-on-surface)]">
                {formatDate(payment.paidDate || payment.dueDate)}
              </span>
            </div>

            <div>
              <span className="text-[var(--m3-on-surface-variant)] opacity-75 block text-[10px] uppercase font-mono">Member Name</span>
              <span className="font-bold text-[var(--m3-on-surface)] text-sm">{member?.name || 'Member'}</span>
              <p className="text-[var(--m3-on-surface-variant)] text-[11px] font-mono mt-0.5 opacity-80">{member?.phone}</p>
            </div>

            <div className="text-right">
              <span className="text-[var(--m3-on-surface-variant)] opacity-75 block text-[10px] uppercase font-mono">Cycle</span>
              <span className="font-bold text-[var(--m3-primary)] text-sm">Month {payment.monthNumber} of {group.durationMonths}</span>
              <p className="text-[var(--m3-on-surface-variant)] text-[11px] opacity-80">Chit Pot: {formatCurrency(group.totalPot)}</p>
            </div>
          </div>

          {/* Breakdown Box */}
          <div className="bg-[var(--m3-surface-container)] rounded-2xl p-4 border border-[var(--m3-outline-variant)] space-y-2 text-xs">
            <div className="flex justify-between text-[var(--m3-on-surface-variant)]">
              <span>Standard Monthly Share:</span>
              <span className="font-mono">{formatCurrency(group.monthlyBaseShare)}</span>
            </div>
            <div className="flex justify-between text-[var(--m3-primary)] font-medium">
              <span>Dividend Discount Applied:</span>
              <span className="font-mono">-{formatCurrency(group.monthlyBaseShare - payment.amountDue)}</span>
            </div>
            <div className="h-px bg-[var(--m3-outline-variant)] my-1"></div>
            <div className="flex justify-between text-[var(--m3-on-surface)] font-bold text-sm">
              <span>Net Amount Paid:</span>
              <span className="font-mono text-[var(--m3-primary)] text-base">{formatCurrency(payment.amountPaid)}</span>
            </div>
          </div>

          {/* Payment Method & UTR */}
          <div className="bg-[var(--m3-surface-container)] p-3 rounded-xl border border-[var(--m3-outline-variant)] text-[11px] flex justify-between items-center">
            <div>
              <span className="text-[var(--m3-on-surface-variant)] opacity-75 block">Payment Mode:</span>
              <span className="font-semibold text-[var(--m3-on-surface)]">{payment.paymentMethod || 'UPI Transfer'}</span>
            </div>
            {payment.transactionRef && (
              <div className="text-right">
                <span className="text-[var(--m3-on-surface-variant)] opacity-75 block">Reference / UTR:</span>
                <span className="font-mono text-[var(--m3-on-surface)]">{payment.transactionRef}</span>
              </div>
            )}
          </div>

          {/* Footer Note */}
          <div className="text-center text-[10px] text-[var(--m3-on-surface-variant)] pt-3 border-t border-[var(--m3-outline-variant)] opacity-75">
            <p>This is a computer-generated receipt for internal administration records.</p>
            <p className="mt-0.5">{formatCurrency(group.organizerFee)} organizer charges are adjusted automatically during monthly auction pool settlement.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
