import { Auction, ChitGroup, Member, NotificationItem, Payment, WebhookLog } from '../types/chit';

const STORAGE_KEYS = {
  GROUP: 'chit_group_data_v3',
  GROUPS: 'chit_groups_list_v3',
  ACTIVE_GROUP_ID: 'chit_active_group_id_v3',
  MEMBERS: 'chit_members_data_v3',
  AUCTIONS: 'chit_auctions_data_v3',
  PAYMENTS: 'chit_payments_data_v3',
  WEBHOOKS: 'chit_webhooks_data_v3',
  NOTIFICATIONS: 'chit_notifications_data_v3',
  CRON_CONFIG: 'chit_cron_config_v3',
};

// Automatic cleanup of legacy dummy data from previous versions
if (typeof window !== 'undefined') {
  try {
    const legacyKeys = [
      'chit_group_data_v1',
      'chit_groups_list_v2',
      'chit_active_group_id_v2',
      'chit_members_data_v1',
      'chit_auctions_data_v1',
      'chit_payments_data_v1',
      'chit_webhooks_data_v1',
      'chit_notifications_data_v1',
    ];
    legacyKeys.forEach((key) => localStorage.removeItem(key));
  } catch (e) {
    // Ignore storage errors in restricted contexts
  }
}

export const INITIAL_GROUPS: ChitGroup[] = [];
export const INITIAL_MEMBERS: Member[] = [];
export const INITIAL_AUCTIONS: Auction[] = [];
export const INITIAL_PAYMENTS: Payment[] = [];
export const INITIAL_WEBHOOKS: WebhookLog[] = [];
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];

// Helper functions for reading and writing to LocalStorage
export function loadGroups(): ChitGroup[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.GROUPS);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
    return INITIAL_GROUPS;
  } catch {
    return INITIAL_GROUPS;
  }
}

export function saveGroups(groups: ChitGroup[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
    if (groups.length > 0) {
      localStorage.setItem(STORAGE_KEYS.GROUP, JSON.stringify(groups[0]));
    } else {
      localStorage.removeItem(STORAGE_KEYS.GROUP);
    }
  } catch (e) {
    console.error('Failed to save chit groups:', e);
  }
}

export function loadActiveGroupId(): string {
  try {
    const id = localStorage.getItem(STORAGE_KEYS.ACTIVE_GROUP_ID);
    return id || '';
  } catch {
    return '';
  }
}

export function saveActiveGroupId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_GROUP_ID, id);
  } catch (e) {
    console.error('Failed to save active group id:', e);
  }
}

export function loadGroup(): ChitGroup | null {
  try {
    const groups = loadGroups();
    const activeId = loadActiveGroupId();
    const found = groups.find((g) => g.id === activeId);
    return found || groups[0] || null;
  } catch {
    return null;
  }
}

export function saveGroup(group: ChitGroup): void {
  try {
    const groups = loadGroups();
    const index = groups.findIndex((g) => g.id === group.id);
    let updated: ChitGroup[];
    if (index >= 0) {
      updated = [...groups];
      updated[index] = group;
    } else {
      updated = [...groups, group];
    }
    saveGroups(updated);
  } catch (e) {
    console.error('Failed to save group:', e);
  }
}

export interface CreatePlanInput {
  name: string;
  totalPot: number; // Plan Amount (e.g. 100000)
  durationMonths: number; // Months (e.g. 10)
  memberCount: number; // Members (e.g. 10)
  organizerFee: number; // Charges / Organizer commission (e.g. 2500)
  startDate?: string;
  auctionDayOfMonth?: number;
  paymentDueDayOfMonth?: number;
  memberList?: { name: string; phone?: string; upiId?: string; email?: string }[];
}

/**
 * Creates a brand new Chit Fund Plan along with enrolled members and initial Month 1 payment schedule
 */
export function createNewPlanData(input: CreatePlanInput): {
  newGroup: ChitGroup;
  newMembers: Member[];
  newPayments: Payment[];
} {
  const newGroupId = `grp-${Date.now()}`;
  const memberCount = Math.max(2, input.memberCount || 10);
  const durationMonths = Math.max(2, input.durationMonths || 10);
  const totalPot = Math.max(1000, input.totalPot || 50000);
  const monthlyBaseShare = Math.round(totalPot / memberCount);
  const startDate = input.startDate || new Date().toISOString().split('T')[0];
  const auctionDay = input.auctionDayOfMonth ? Math.min(28, Math.max(1, input.auctionDayOfMonth)) : 5;
  const paymentDueDay = input.paymentDueDayOfMonth ? Math.min(28, Math.max(1, input.paymentDueDayOfMonth)) : 25;

  const newGroup: ChitGroup = {
    id: newGroupId,
    name: input.name.trim() || `Chit Fund Plan (₹${(totalPot / 1000).toFixed(0)}K)`,
    totalPot,
    memberCount,
    durationMonths,
    organizerFee: input.organizerFee,
    monthlyBaseShare,
    startDate,
    auctionDayOfMonth: auctionDay,
    paymentDueDayOfMonth: paymentDueDay,
    currentMonth: 1,
    status: 'active',
    currencySymbol: '₹',
  };

  const newMembers: Member[] = [];
  for (let i = 0; i < memberCount; i++) {
    const custom = input.memberList?.[i];
    const memberName = custom?.name?.trim() || `Member ${i + 1}`;
    const phone = custom?.phone?.trim() || '';
    const upiId = custom?.upiId?.trim() || '';

    newMembers.push({
      id: `mem-${newGroupId}-${i + 1}`,
      groupId: newGroupId,
      name: memberName,
      phone,
      email: custom?.email?.trim() || '',
      upiId,
      hasWonAuction: false,
      totalPaid: 0,
      totalReceived: 0,
      joinedDate: startDate,
      notes: `Enrolled in ${newGroup.name}`,
    });
  }

  // Month 1 payment schedule
  const [startYearStr, startMonthStr] = startDate.split('-');
  const dueDate = `${startYearStr}-${startMonthStr}-${String(paymentDueDay).padStart(2, '0')}`;

  const newPayments: Payment[] = newMembers.map((m, idx) => ({
    id: `pay-${newGroupId}-m1-${idx + 1}`,
    groupId: newGroupId,
    memberId: m.id,
    monthNumber: 1,
    amountDue: monthlyBaseShare,
    amountPaid: 0,
    status: 'Pending',
    dueDate,
  }));

  return { newGroup, newMembers, newPayments };
}

export function loadMembers(): Member[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.MEMBERS);
    return data ? JSON.parse(data) : INITIAL_MEMBERS;
  } catch {
    return INITIAL_MEMBERS;
  }
}

export function saveMembers(members: Member[]): void {
  localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
}

export function loadAuctions(): Auction[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.AUCTIONS);
    return data ? JSON.parse(data) : INITIAL_AUCTIONS;
  } catch {
    return INITIAL_AUCTIONS;
  }
}

export function saveAuctions(auctions: Auction[]): void {
  localStorage.setItem(STORAGE_KEYS.AUCTIONS, JSON.stringify(auctions));
}

export function loadPayments(): Payment[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    return data ? JSON.parse(data) : INITIAL_PAYMENTS;
  } catch {
    return INITIAL_PAYMENTS;
  }
}

export function savePayments(payments: Payment[]): void {
  localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
}

export function loadWebhooks(): WebhookLog[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.WEBHOOKS);
    return data ? JSON.parse(data) : INITIAL_WEBHOOKS;
  } catch {
    return INITIAL_WEBHOOKS;
  }
}

export function saveWebhooks(logs: WebhookLog[]): void {
  localStorage.setItem(STORAGE_KEYS.WEBHOOKS, JSON.stringify(logs));
}

export function loadNotifications(): NotificationItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    return data ? JSON.parse(data) : INITIAL_NOTIFICATIONS;
  } catch {
    return INITIAL_NOTIFICATIONS;
  }
}

export function saveNotifications(items: NotificationItem[]): void {
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(items));
}

export function resetAllDataToDefault(): void {
  saveGroups(INITIAL_GROUPS);
  saveActiveGroupId('');
  saveMembers(INITIAL_MEMBERS);
  saveAuctions(INITIAL_AUCTIONS);
  savePayments(INITIAL_PAYMENTS);
  saveWebhooks(INITIAL_WEBHOOKS);
  saveNotifications(INITIAL_NOTIFICATIONS);
}
