import { Auction, ChitGroup, Member, Payment } from '../types/chit';

export interface AuctionCalculationInput {
  totalPot: number; // e.g. 50000
  memberCount: number; // e.g. 10
  winningBid: number; // e.g. 10000
  organizerFee: number; // e.g. 1500
}

export interface AuctionCalculationResult {
  baseShare: number; // e.g. 5000
  winningBid: number; // e.g. 10000
  organizerFee: number; // e.g. 1500
  dividendPool: number; // e.g. 8500
  dividendPerMember: number; // e.g. 850
  effectiveMonthlyDue: number; // e.g. 4150
  winnerPayout: number; // e.g. 40000
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Calculates all monetary breakdown values according to the chit fund mathematical formula:
 * - Base Share = Total Pot / Member Count
 * - Dividend Pool = Winning Bid - Organizer Fee
 * - Per-Member Discount = Dividend Pool / Member Count
 * - Next Payment Due = Base Share - Per-Member Discount
 * - Winner's Gross Payout = Total Pot - Winning Bid
 */
export function calculateAuctionBreakdown(input: AuctionCalculationInput): AuctionCalculationResult {
  const { totalPot, memberCount, winningBid, organizerFee } = input;

  if (memberCount <= 0) {
    return {
      baseShare: 0,
      winningBid,
      organizerFee,
      dividendPool: 0,
      dividendPerMember: 0,
      effectiveMonthlyDue: 0,
      winnerPayout: 0,
      isValid: false,
      errorMessage: 'Member count must be greater than 0.',
    };
  }

  const baseShare = Math.round(totalPot / memberCount);

  if (winningBid < organizerFee) {
    return {
      baseShare,
      winningBid,
      organizerFee,
      dividendPool: 0,
      dividendPerMember: 0,
      effectiveMonthlyDue: baseShare,
      winnerPayout: totalPot - winningBid,
      isValid: false,
      errorMessage: `Winning bid must be at least equal to organizer fee (₹${organizerFee.toLocaleString('en-IN')}).`,
    };
  }

  if (winningBid >= totalPot) {
    return {
      baseShare,
      winningBid,
      organizerFee,
      dividendPool: 0,
      dividendPerMember: 0,
      effectiveMonthlyDue: baseShare,
      winnerPayout: 0,
      isValid: false,
      errorMessage: `Winning bid cannot exceed total pot amount (₹${totalPot.toLocaleString('en-IN')}).`,
    };
  }

  const dividendPool = winningBid - organizerFee;
  const dividendPerMember = Math.floor(dividendPool / memberCount);
  const effectiveMonthlyDue = baseShare - dividendPerMember;
  const winnerPayout = totalPot - winningBid;

  return {
    baseShare,
    winningBid,
    organizerFee,
    dividendPool,
    dividendPerMember,
    effectiveMonthlyDue,
    winnerPayout,
    isValid: true,
  };
}

export interface MemberRoiResult {
  memberId: string;
  memberName: string;
  phone: string;
  hasWonAuction: boolean;
  wonMonth?: number;
  totalReceived: number;
  cumulativeContributions: number; // Net installment capital required for evaluated cycles
  totalActualPaid: number; // Actual cash paid to date
  totalDividendsReceived: number;
  nominalBaseShareTotal: number;
  netSavings: number;
  roiPercentage: number;
  annualizedYield: number;
  compoundedApy: number;
  elapsedMonths: number;
  netPosition: number;
  monthlyBreakdown: {
    monthNumber: number;
    amountPaid: number;
    amountDue: number;
    dividendEarned: number;
    baseShare: number;
    isPaid: boolean;
  }[];
}

export interface GroupRoiSummary {
  averageAnnualYield: number;
  averageRoi: number;
  totalDividendsDistributed: number;
  totalCumulativeContributions: number;
  highestYield: number;
  highestYieldMemberName: string;
  lowestYield: number;
  lowestYieldMemberName: string;
  elapsedMonths: number;
  memberResults: MemberRoiResult[];
}

/**
 * Calculates the ROI and Effective Annual Yield for all members
 * based on their total dividends received versus cumulative monthly contributions.
 *
 * Formula:
 * - Total Dividends Received = Sum of dividendPerMember for completed cycles
 * - Cumulative Contributions = Total amount contributed (paid/due) by the member
 * - ROI % = (Total Dividends Received / Cumulative Contributions) * 100
 * - Effective Annual Yield (% p.a.) = ROI % * (12 / Elapsed Months)
 * - Compounded APY = ((1 + (Total Dividends / Cumulative Contributions)) ^ (12 / Elapsed Months) - 1) * 100
 */
export function calculateMembersRoi(
  members: Member[],
  auctions: Auction[],
  payments: Payment[],
  group: ChitGroup,
  projectedFutureAvgBid?: number
): GroupRoiSummary {
  const completedAuctions = auctions.filter((a) => a.status === 'completed' || a.winningBid > 0);
  const elapsedMonths = Math.max(1, completedAuctions.length);

  // If projectedFutureAvgBid is provided, we can simulate the full duration
  const isProjected = typeof projectedFutureAvgBid === 'number' && group.durationMonths > elapsedMonths;
  const totalMonthsToConsider = isProjected ? group.durationMonths : elapsedMonths;

  // Pre-calculate completed auction dividends per month
  const monthlyDividendsMap = new Map<number, number>();
  completedAuctions.forEach((a) => {
    monthlyDividendsMap.set(a.monthNumber, a.dividendPerMember);
  });

  // Calculate simulated future dividend if projected
  let projectedMonthlyDividend = 0;
  let projectedMonthlyDue = group.monthlyBaseShare;
  if (isProjected) {
    const projectedPool = Math.max(0, projectedFutureAvgBid - group.organizerFee);
    projectedMonthlyDividend = Math.floor(projectedPool / group.memberCount);
    projectedMonthlyDue = group.monthlyBaseShare - projectedMonthlyDividend;
  }

  const memberResults: MemberRoiResult[] = members.map((member) => {
    const memberPayments = payments.filter((p) => p.memberId === member.id);

    // Monthly breakdown of payments and dividends
    const monthlyBreakdown: MemberRoiResult['monthlyBreakdown'] = [];
    let cumulativeContributions = 0;
    let totalActualPaid = 0;
    let totalDividendsReceived = 0;

    for (let m = 1; m <= totalMonthsToConsider; m++) {
      if (m <= elapsedMonths) {
        const payment = memberPayments.find((p) => p.monthNumber === m);
        const dividend = monthlyDividendsMap.get(m) ?? 0;
        const amountPaid = payment ? payment.amountPaid : 0;
        const amountDue = payment ? payment.amountDue : (group.monthlyBaseShare - dividend);

        // Required capital outlay for this cycle (Base share - dividend)
        cumulativeContributions += amountDue;
        totalActualPaid += amountPaid;
        totalDividendsReceived += dividend;

        monthlyBreakdown.push({
          monthNumber: m,
          amountPaid,
          amountDue,
          dividendEarned: dividend,
          baseShare: group.monthlyBaseShare,
          isPaid: payment?.status === 'Paid',
        });
      } else {
        // Projected future month
        cumulativeContributions += projectedMonthlyDue;
        totalDividendsReceived += projectedMonthlyDividend;

        monthlyBreakdown.push({
          monthNumber: m,
          amountPaid: 0,
          amountDue: projectedMonthlyDue,
          dividendEarned: projectedMonthlyDividend,
          baseShare: group.monthlyBaseShare,
          isPaid: false,
        });
      }
    }

    const nominalBaseShareTotal = group.monthlyBaseShare * totalMonthsToConsider;
    const netSavings = Math.max(0, nominalBaseShareTotal - cumulativeContributions);

    // ROI % = (Total Dividends Received / Cumulative Contributions) * 100
    const safeContributions = Math.max(1, cumulativeContributions);
    const roiPercentage = Number(((totalDividendsReceived / safeContributions) * 100).toFixed(2));

    // Effective Annual Yield (% p.a.) = ROI % * (12 / Months)
    const annualizedYield = Number((roiPercentage * (12 / totalMonthsToConsider)).toFixed(2));

    // Compounded APY = ((1 + (div / contrib)) ^ (12 / Months) - 1) * 100
    const ratio = totalDividendsReceived / safeContributions;
    const compoundedApy = ratio > 0
      ? Number(((Math.pow(1 + ratio, 12 / totalMonthsToConsider) - 1) * 100).toFixed(2))
      : 0;

    const netPosition = member.totalReceived - cumulativeContributions;

    return {
      memberId: member.id,
      memberName: member.name,
      phone: member.phone,
      hasWonAuction: member.hasWonAuction,
      wonMonth: member.wonMonth,
      totalReceived: member.totalReceived,
      cumulativeContributions,
      totalActualPaid,
      totalDividendsReceived,
      nominalBaseShareTotal,
      netSavings,
      roiPercentage,
      annualizedYield,
      compoundedApy,
      elapsedMonths: totalMonthsToConsider,
      netPosition,
      monthlyBreakdown,
    };
  });

  // Calculate Group Summaries
  const totalDividendsDistributed = memberResults.reduce((acc, m) => acc + m.totalDividendsReceived, 0);
  const totalCumulativeContributions = memberResults.reduce((acc, m) => acc + m.cumulativeContributions, 0);
  const avgYield = memberResults.length > 0
    ? Number((memberResults.reduce((acc, m) => acc + m.annualizedYield, 0) / memberResults.length).toFixed(2))
    : 0;
  const avgRoi = memberResults.length > 0
    ? Number((memberResults.reduce((acc, m) => acc + m.roiPercentage, 0) / memberResults.length).toFixed(2))
    : 0;

  let highestYield = -Infinity;
  let highestYieldMemberName = '';
  let lowestYield = Infinity;
  let lowestYieldMemberName = '';

  memberResults.forEach((m) => {
    if (m.annualizedYield > highestYield) {
      highestYield = m.annualizedYield;
      highestYieldMemberName = m.memberName;
    }
    if (m.annualizedYield < lowestYield) {
      lowestYield = m.annualizedYield;
      lowestYieldMemberName = m.memberName;
    }
  });

  return {
    averageAnnualYield: avgYield,
    averageRoi: avgRoi,
    totalDividendsDistributed,
    totalCumulativeContributions,
    highestYield: highestYield === -Infinity ? 0 : highestYield,
    highestYieldMemberName,
    lowestYield: lowestYield === Infinity ? 0 : lowestYield,
    lowestYieldMemberName,
    elapsedMonths: totalMonthsToConsider,
    memberResults,
  };
}

/**
 * Formats a number into Indian Rupee format (e.g. ₹50,000)
 */
export function formatCurrency(amount: number, symbol = '₹'): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(Math.round(amount));
  const formatted = absAmount.toLocaleString('en-IN');
  return `${isNegative ? '-' : ''}${symbol}${formatted}`;
}

/**
 * Calculates due date status: checks if payment is due in ≤ 3 days, due today, or overdue.
 * Safe from UTC/local timezone shift issues.
 */
export function evaluatePaymentDueStatus(dueDateString: string): {
  isOverdue: boolean;
  isDueToday: boolean;
  isUpcoming3Days: boolean;
  daysRemaining: number;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let due: Date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dueDateString)) {
    const [y, m, d] = dueDateString.split('-').map(Number);
    due = new Date(y, m - 1, d);
  } else {
    due = new Date(dueDateString);
  }
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  return {
    isOverdue: diffDays < 0,
    isDueToday: diffDays === 0,
    isUpcoming3Days: diffDays > 0 && diffDays <= 3,
    daysRemaining: diffDays,
  };
}

/**
 * Generates formatted date string (e.g. "12 Oct 2026")
 * Safe from UTC/local timezone shift issues.
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  try {
    let d: Date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [y, m, day] = dateString.split('-').map(Number);
      d = new Date(y, m - 1, day);
    } else {
      d = new Date(dateString);
    }
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export interface UpcomingAuctionInfo {
  nextMonthNumber: number;
  isAllCompleted: boolean;
  scheduledDate: string;
  formattedDate: string;
  daysRemaining: number;
  isToday: boolean;
  isTomorrow: boolean;
  isPastOrReady: boolean;
  statusBadgeText: string;
  eligibleBiddersCount: number;
}

/**
 * Calculates upcoming auction cycle number, scheduled date, days remaining, and eligible bidders
 */
export function getUpcomingAuctionInfo(
  group: ChitGroup,
  auctions: Auction[],
  members: Member[]
): UpcomingAuctionInfo {
  const completedAuctions = auctions.filter((a) => a.status === 'completed' || a.winningBid > 0);
  const completedCount = completedAuctions.length;
  const nextMonthNumber = completedCount + 1;
  const isAllCompleted = nextMonthNumber > group.durationMonths;

  const eligibleBiddersCount = members.filter((m) => !m.hasWonAuction).length;

  if (isAllCompleted) {
    return {
      nextMonthNumber: group.durationMonths,
      isAllCompleted: true,
      scheduledDate: '',
      formattedDate: 'Completed',
      daysRemaining: 0,
      isToday: false,
      isTomorrow: false,
      isPastOrReady: false,
      statusBadgeText: 'All Cycles Finished',
      eligibleBiddersCount: 0,
    };
  }

  let targetYear: number;
  let targetMonth: number;

  try {
    const [startYearStr, startMonthStr] = group.startDate.split('-');
    const startYear = parseInt(startYearStr, 10);
    const startMonth = parseInt(startMonthStr, 10) - 1;

    const totalMonthIndex = startYear * 12 + startMonth + (nextMonthNumber - 1);
    targetYear = Math.floor(totalMonthIndex / 12);
    targetMonth = totalMonthIndex % 12;
  } catch {
    const now = new Date();
    targetYear = now.getFullYear();
    targetMonth = now.getMonth();
  }

  const day = Math.min(28, group.auctionDayOfMonth || 5);
  const scheduledDate = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDateObj = new Date(targetYear, targetMonth, day);
  targetDateObj.setHours(0, 0, 0, 0);

  const diffTime = targetDateObj.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  let statusBadgeText = '';
  if (diffDays === 0) {
    statusBadgeText = 'Today!';
  } else if (diffDays === 1) {
    statusBadgeText = 'Tomorrow';
  } else if (diffDays > 1 && diffDays <= 7) {
    statusBadgeText = `In ${diffDays} days`;
  } else if (diffDays > 7) {
    statusBadgeText = `In ${diffDays} days`;
  } else {
    statusBadgeText = 'Ready to Run';
  }

  return {
    nextMonthNumber,
    isAllCompleted: false,
    scheduledDate,
    formattedDate: formatDate(scheduledDate),
    daysRemaining: diffDays,
    isToday: diffDays === 0,
    isTomorrow: diffDays === 1,
    isPastOrReady: diffDays <= 0,
    statusBadgeText,
    eligibleBiddersCount,
  };
}
