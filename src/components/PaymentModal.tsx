import React, { useState } from 'react';
import { X, CheckCircle, IndianRupee, CreditCard, Calendar, Hash, FileText } from 'lucide-react';
import { ChitGroup, Member, Payment } from '../types/chit';
import { formatCurrency, formatDate } from '../utils/calculations';
import { playNotificationTone } from '../utils/notifications';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
  members: Member[];
  group: ChitGroup;
  onSavePayment: (updatedPayment: Payment) => void;
  soundEnabled: boolean;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  payment,
  members,
  group,
  onSavePayment,
  soundEnabled,
}) => {
  if (!isOpen || !payment) return null;

  const member = members.find((m) => m.id === payment.memberId);
  const remainingDue = payment.amountDue - payment.amountPaid;

  const [amountToPay, setAmountToPay] = useState<number>(remainingDue > 0 ? remainingDue : payment.amountDue);
  const [paidDate, setPaidDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Cash' | 'Bank Transfer' | 'Cheque'>('UPI');
  const [transactionRef, setTransactionRef] = useState<string>(`UPI-${Date.now().toString().slice(-6)}`);
  const [notes, setNotes] = useState<string>(payment.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (amountToPay <= 0) {
      alert('Payment amount must be greater than zero.');
      return;
    }

    const newAmountPaid = (payment.amountPaid || 0) + amountToPay;
    const isFullyPaid = newAmountPaid >= payment.amountDue;

    const updatedPayment: Payment = {
      ...payment,
      amountPaid: Math.min(newAmountPaid, payment.amountDue),
      paidDate,
      paymentMethod,
      transactionRef,
      status: isFullyPaid ? 'Paid' : 'Partial',
      notes,
    };

    if (soundEnabled) {
      playNotificationTone('success');
    }

    onSavePayment(updatedPayment);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="m3-dialog w-full max-w-md overflow-hidden my-6">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--m3-outline-variant)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)] flex items-center justify-center font-bold">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--m3-on-surface)]">Record Payment</h2>
              <p className="text-xs text-[var(--m3-on-surface-variant)] mt-0.5">
                {member?.name} · Month {payment.monthNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[var(--m3-on-surface-variant)] hover:text-[var(--m3-on-surface)] hover:bg-[var(--m3-surface-container-highest)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Due Info Pill */}
          <div className="p-3.5 bg-[var(--m3-surface-container-low)] border border-[var(--m3-outline-variant)] rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[var(--m3-on-surface-variant)] opacity-75">Total Month Due:</span>
              <p className="font-mono text-base font-bold text-[var(--m3-primary)] mt-0.5">
                {formatCurrency(payment.amountDue)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[var(--m3-on-surface-variant)] opacity-75">Due Date:</span>
              <p className="font-mono text-xs font-semibold text-[var(--m3-on-surface)] mt-0.5">
                {formatDate(payment.dueDate)}
              </p>
            </div>
          </div>

          {/* Amount to Record */}
          <div>
            <label className="block text-xs font-medium text-[var(--m3-on-surface)] mb-1">
              Payment Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-[var(--m3-on-surface-variant)] font-mono opacity-70">₹</span>
              <input
                type="number"
                min="1"
                max={payment.amountDue}
                value={amountToPay}
                onChange={(e) => setAmountToPay(Number(e.target.value))}
                className="w-full pl-8 pr-4 py-2.5 bg-[var(--m3-surface-container-lowest)] border border-[var(--m3-outline-variant)] rounded-xl text-[var(--m3-on-surface)] font-mono text-sm focus:outline-none focus:border-[var(--m3-primary)]"
                required
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-medium text-[var(--m3-on-surface)] mb-1.5">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['UPI', 'Cash', 'Bank Transfer', 'Cheque'] as const).map((method) => (
                <button
                  type="button"
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 px-3 rounded-xl border text-left font-medium transition-all cursor-pointer text-xs ${
                    paymentMethod === method
                      ? 'm3-chip-selected font-bold'
                      : 'bg-[var(--m3-surface-container-lowest)] text-[var(--m3-on-surface-variant)] border-[var(--m3-outline-variant)] hover:bg-[var(--m3-surface-container-high)]'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Date & Txn Ref */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--m3-on-surface)] mb-1">
                Payment Date
              </label>
              <input
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-[var(--m3-surface-container-lowest)] border border-[var(--m3-outline-variant)] rounded-xl text-[var(--m3-on-surface)] font-mono focus:outline-none focus:border-[var(--m3-primary)]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--m3-on-surface)] mb-1">
                Transaction / Ref #
              </label>
              <input
                type="text"
                placeholder="e.g. UPI-998811"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                className="w-full px-3.5 py-2 bg-[var(--m3-surface-container-lowest)] border border-[var(--m3-outline-variant)] rounded-xl text-[var(--m3-on-surface)] font-mono focus:outline-none focus:border-[var(--m3-primary)]"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-[var(--m3-on-surface)] mb-1">
              Admin Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Received via PhonePe"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-[var(--m3-surface-container-lowest)] border border-[var(--m3-outline-variant)] rounded-xl text-[var(--m3-on-surface)] focus:outline-none focus:border-[var(--m3-primary)]"
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[var(--m3-outline-variant)]">
            <button
              type="button"
              onClick={onClose}
              className="m3-btn-outlined px-3.5 py-2 cursor-pointer text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="m3-btn-primary px-4 py-2 text-xs font-bold cursor-pointer shadow-xs"
            >
              Confirm & Save Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
