export type PaymentStatus = 'Pending' | 'Paid' | 'Partial' | 'Overdue';

export interface ChitGroup {
  id: string;
  name: string;
  totalPot: number; // e.g. 50000
  memberCount: number; // e.g. 10
  durationMonths: number; // e.g. 10
  organizerFee: number; // e.g. 1500
  monthlyBaseShare: number; // e.g. 5000
  startDate: string; // YYYY-MM-DD
  auctionDayOfMonth: number; // e.g. 5th of every month
  paymentDueDayOfMonth: number; // e.g. 10th of every month
  currentMonth: number; // e.g. 1 to 10
  status: 'active' | 'completed';
  currencySymbol: string;
}

export interface Member {
  id: string;
  groupId: string;
  name: string;
  phone: string;
  email?: string;
  upiId?: string;
  hasWonAuction: boolean;
  wonMonth?: number;
  totalPaid: number;
  totalReceived: number;
  joinedDate: string;
  notes?: string;
}

export interface Auction {
  id: string;
  groupId: string;
  monthNumber: number;
  date: string;
  winnerId: string;
  winningBid: number; // e.g. 10000
  organizerFee: number; // e.g. 1500
  dividendPool: number; // winningBid - organizerFee = 8500
  dividendPerMember: number; // 8500 / 10 = 850
  effectiveMonthlyDue: number; // 5000 - 850 = 4150
  winnerPayout: number; // 50000 - 10000 = 40000
  status: 'completed' | 'scheduled';
  payoutStatus: 'Pending' | 'Disbursed';
  payoutDisbursedDate?: string;
  payoutReference?: string;
  payoutMethod?: 'Bank Transfer' | 'UPI' | 'Cash' | 'Cheque';
  notes?: string;
}

export interface Payment {
  id: string;
  groupId: string;
  memberId: string;
  auctionId?: string;
  monthNumber: number;
  amountDue: number; // e.g. 4150
  amountPaid: number; // e.g. 4150 or 0
  dueDate: string; // YYYY-MM-DD
  paidDate?: string;
  paymentMethod?: 'UPI' | 'Cash' | 'Bank Transfer' | 'Cheque';
  transactionRef?: string;
  status: PaymentStatus;
  lastReminderSentAt?: string;
  notes?: string;
}

export interface WebhookLog {
  id: string;
  timestamp: string;
  event: 'auction.completed' | 'cron.reminder_triggered' | 'payment.recorded' | 'payout.disbursed' | 'plan.created' | 'plan.updated';
  title: string;
  details: string;
  payload: Record<string, unknown>;
  status: 'success' | 'dispatched';
}

export interface NotificationItem {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  type: 'reminder' | 'auction' | 'payment' | 'system';
  read: boolean;
  memberId?: string;
  dueAmount?: number;
}
