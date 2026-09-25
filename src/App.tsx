import React, { useState, useEffect } from 'react';
import { 
  ChitGroup, 
  Member, 
  Auction, 
  Payment, 
  WebhookLog, 
  NotificationItem 
} from './types/chit';
import { 
  loadGroups, 
  saveGroups, 
  loadActiveGroupId, 
  saveActiveGroupId, 
  loadMembers, 
  saveMembers, 
  loadAuctions, 
  saveAuctions, 
  loadPayments, 
  savePayments, 
  loadWebhooks, 
  saveWebhooks, 
  loadNotifications, 
  saveNotifications, 
  resetAllDataToDefault,
  CreatePlanInput,
  createNewPlanData
} from './utils/storage';
import { evaluatePaymentDueStatus, formatCurrency, formatDate } from './utils/calculations';
import { playNotificationTone, sendPushNotification } from './utils/notifications';
import { Plus } from 'lucide-react';

import { Navbar } from './components/Navbar';
import { DashboardOverview } from './components/DashboardOverview';
import { PaymentsLedger } from './components/PaymentsLedger';
import { AuctionRunnerModal } from './components/AuctionRunnerModal';
import { PaymentModal } from './components/PaymentModal';
import { MemberPassbookModal } from './components/MemberPassbookModal';
import { MembersDirectory } from './components/MembersDirectory';
import { ReminderEngineModal } from './components/ReminderEngineModal';
import { AuctionsAndPayoutsView } from './components/AuctionsAndPayoutsView';
import { ChitPlansView } from './components/ChitPlansView';
import { CreatePlanModal } from './components/CreatePlanModal';
import { EditPlanModal } from './components/EditPlanModal';
import { ReceiptModal } from './components/ReceiptModal';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { ThemeSettingsModal } from './components/ThemeSettingsModal';

export default function App() {
  // Primary Chit Fund Application State
  const [groups, setGroups] = useState<ChitGroup[]>(loadGroups);
  const [activeGroupId, setActiveGroupId] = useState<string>(loadActiveGroupId);
  const [members, setMembers] = useState<Member[]>(loadMembers);
  const [auctions, setAuctions] = useState<Auction[]>(loadAuctions);
  const [payments, setPayments] = useState<Payment[]>(loadPayments);
  const [webhooks, setWebhooks] = useState<WebhookLog[]>(loadWebhooks);
  const [notifications, setNotifications] = useState<NotificationItem[]>(loadNotifications);

  // Active Chit Group selection
  const group = groups.find((g) => g.id === activeGroupId) || groups[0] || null;

  // Active group data projections
  const activeMembers = group ? members.filter((m) => m.groupId === group.id) : [];
  const activeAuctions = group ? auctions.filter((a) => a.groupId === group.id) : [];
  const activePayments = group ? payments.filter((p) => p.groupId === group.id) : [];

  // UI Navigation & Modals State
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const [isAuctionRunnerOpen, setIsAuctionRunnerOpen] = useState<boolean>(false);
  const [isCreatePlanModalOpen, setIsCreatePlanModalOpen] = useState<boolean>(false);
  const [isEditPlanOpen, setIsEditPlanOpen] = useState<boolean>(false);
  const [planToEdit, setPlanToEdit] = useState<ChitGroup | null>(null);
  const [isThemeSettingsOpen, setIsThemeSettingsOpen] = useState<boolean>(false);
  const [selectedPaymentForModal, setSelectedPaymentForModal] = useState<Payment | null>(null);
  const [selectedMemberForPassbook, setSelectedMemberForPassbook] = useState<Member | null>(null);
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<Payment | null>(null);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState<boolean>(false);

  // Sync state to local storage on mutation
  useEffect(() => { saveGroups(groups); }, [groups]);
  useEffect(() => { saveActiveGroupId(activeGroupId); }, [activeGroupId]);
  useEffect(() => { saveMembers(members); }, [members]);
  useEffect(() => { saveAuctions(auctions); }, [auctions]);
  useEffect(() => { savePayments(payments); }, [payments]);
  useEffect(() => { saveWebhooks(webhooks); }, [webhooks]);
  useEffect(() => { saveNotifications(notifications); }, [notifications]);

  // Unread notification count
  const unreadCount = notifications.filter((n) => !n.read).length;

  /**
   * Automated Daily 8:00 AM Cron Scan Engine for the active plan
   */
  const handleTriggerCronScan = () => {
    if (!group) return;

    // Current cycle payments for active group that are not fully paid
    const currentMonthPayments = activePayments.filter((p) => p.monthNumber === group.currentMonth);
    const pending = currentMonthPayments.filter((p) => p.status !== 'Paid');

    // Filter payments due in <= 3 days or overdue
    const flagged = pending.filter((p) => {
      const dueInfo = evaluatePaymentDueStatus(p.dueDate);
      return dueInfo.isUpcoming3Days || dueInfo.isDueToday || dueInfo.isOverdue;
    });

    const pendingNames = flagged.map((p) => {
      const m = activeMembers.find((mem) => mem.id === p.memberId);
      return m?.name || 'Member';
    });

    const totalFlaggedDue = flagged.reduce((acc, p) => acc + (p.amountDue - p.amountPaid), 0);

    const title = flagged.length > 0
      ? `⏰ 8:00 AM Alert: ${flagged.length} Pending Dues in ${group.name} (${formatCurrency(totalFlaggedDue)})`
      : `✅ 8:00 AM Scan: All Members Clear for Month ${group.currentMonth} (${group.name})`;

    const message = flagged.length > 0
      ? `Upcoming/Overdue dues for: ${pendingNames.join(', ')}. Due on ${group.paymentDueDayOfMonth}th. Follow up via WhatsApp.`
      : `No pending installments found due within 3 days for ${group.name}. Total collected looks healthy!`;

    // 1. Play tone
    if (soundEnabled) {
      playNotificationTone('reminder');
    }

    // 2. Dispatch native push notification
    sendPushNotification(title, message);

    // 3. Append to Notification Center
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      timestamp: new Date().toISOString(),
      title,
      message,
      type: 'reminder',
      read: false,
      dueAmount: totalFlaggedDue,
    };
    setNotifications((prev) => [newNotif, ...prev]);

    // 4. Log Webhook dispatch
    const webhookItem: WebhookLog = {
      id: `wh-${Date.now()}`,
      timestamp: new Date().toISOString(),
      event: 'cron.reminder_triggered',
      title: `Daily 8:00 AM Cron Scan: ${group.name}`,
      details: flagged.length > 0
        ? `Flagged ${flagged.length} pending members (${pendingNames.join(', ')}). Total overdue/due amount: ${formatCurrency(totalFlaggedDue)}.`
        : `Scan clean: 0 pending members due in next 3 days.`,
      payload: {
        timestamp: new Date().toISOString(),
        chitGroup: group.name,
        groupId: group.id,
        monthNumber: group.currentMonth,
        flaggedCount: flagged.length,
        totalFlaggedAmount: totalFlaggedDue,
        flaggedMemberIds: flagged.map((p) => p.memberId),
      },
      status: 'success',
    };
    setWebhooks((prev) => [webhookItem, ...prev]);
  };

  /**
   * Auction Completion Execution
   * Saves new auction, logs winner payout, creates payment rows,
   * advances current month, and dispatches webhook.
   */
  const handleCompleteAuction = (newAuction: Auction, newPayments: Payment[], webhookLog: WebhookLog) => {
    // 1. Update Auctions
    setAuctions((prev) => [...prev, newAuction]);

    // 2. Add new Payment rows
    setPayments((prev) => [...prev, ...newPayments]);

    // 3. Update Winner Member status
    setMembers((prev) =>
      prev.map((m) =>
        m.id === newAuction.winnerId
          ? {
              ...m,
              hasWonAuction: true,
              wonMonth: newAuction.monthNumber,
              totalReceived: m.totalReceived + newAuction.winnerPayout,
            }
          : m
      )
    );

    // 4. Update Chit Group Current Month
    setGroups((prevGroups) =>
      prevGroups.map((g) =>
        g.id === newAuction.groupId
          ? { ...g, currentMonth: newAuction.monthNumber }
          : g
      )
    );

    // 5. Append Webhook Log
    setWebhooks((prev) => [webhookLog, ...prev]);

    // 6. Append Notification
    const winner = members.find((m) => m.id === newAuction.winnerId);
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: `Auction Completed: Month ${newAuction.monthNumber} (${group.name})`,
        message: `${winner?.name || 'Winner'} won with ${formatCurrency(newAuction.winningBid)} bid. ${formatCurrency(newAuction.organizerFee)} organizer fee adjusted. New payment due is ${formatCurrency(newAuction.effectiveMonthlyDue)} for all members.`,
        type: 'auction',
        read: false,
      },
      ...prev,
    ]);
  };

  /**
   * Add a new Chit Fund Plan
   */
  const handleCreatePlan = (newPlanData: {
    newGroup: ChitGroup;
    newMembers: Member[];
    newPayments: Payment[];
  }) => {
    setGroups((prev) => [...prev, newPlanData.newGroup]);
    setMembers((prev) => [...prev, ...newPlanData.newMembers]);
    setPayments((prev) => [...prev, ...newPlanData.newPayments]);
    setActiveGroupId(newPlanData.newGroup.id);

    if (soundEnabled) {
      playNotificationTone('success');
    }

    sendPushNotification(
      `🎉 New Plan Created: ${newPlanData.newGroup.name}`,
      `Total Pot: ${formatCurrency(newPlanData.newGroup.totalPot)} · ${newPlanData.newGroup.durationMonths} Months · ${formatCurrency(newPlanData.newGroup.organizerFee)} fee/cycle.`
    );

    const webhookItem: WebhookLog = {
      id: `wh-${Date.now()}`,
      timestamp: new Date().toISOString(),
      event: 'plan.created',
      title: `New Chit Fund Plan: ${newPlanData.newGroup.name}`,
      details: `Created plan with ${newPlanData.newGroup.memberCount} members, pot ${formatCurrency(newPlanData.newGroup.totalPot)}, tenure ${newPlanData.newGroup.durationMonths} months, and charges ${formatCurrency(newPlanData.newGroup.organizerFee)}/mo.`,
      payload: {
        groupId: newPlanData.newGroup.id,
        name: newPlanData.newGroup.name,
        pot: newPlanData.newGroup.totalPot,
        members: newPlanData.newGroup.memberCount,
        months: newPlanData.newGroup.durationMonths,
        charges: newPlanData.newGroup.organizerFee,
      },
      status: 'success',
    };
    setWebhooks((prev) => [webhookItem, ...prev]);

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: `Plan Created: ${newPlanData.newGroup.name}`,
        message: `Plan configured with ${formatCurrency(newPlanData.newGroup.totalPot)} pot, ${newPlanData.newGroup.durationMonths} months tenure, and ${formatCurrency(newPlanData.newGroup.organizerFee)} organizer charges. Enrolled ${newPlanData.newMembers.length} members with initial payment schedule.`,
        type: 'system',
        read: false,
      },
      ...prev,
    ]);
  };

  /**
   * Open Plan Editor
   */
  const handleOpenEditPlan = (targetGroup?: ChitGroup | null) => {
    const g = targetGroup || group;
    if (g) {
      setPlanToEdit(g);
      setIsEditPlanOpen(true);
    }
  };

  /**
   * Save Edited Plan (Parameters, Pot, Duration, Charges, Schedule, Members)
   */
  const handleSaveEditedPlan = (
    updatedGroup: ChitGroup,
    updatedMembers: Member[],
    affectedPayments: Payment[]
  ) => {
    // 1. Update Groups
    setGroups((prev) =>
      prev.map((g) => (g.id === updatedGroup.id ? updatedGroup : g))
    );

    // 2. Update Members roster for this group
    setMembers((prev) => {
      const otherGroupMembers = prev.filter((m) => m.groupId !== updatedGroup.id);
      return [...otherGroupMembers, ...updatedMembers];
    });

    // 3. Update Payments
    setPayments(affectedPayments);

    if (soundEnabled) {
      playNotificationTone('success');
    }

    sendPushNotification(
      `✏️ Plan Updated: ${updatedGroup.name}`,
      `Total Pot: ${formatCurrency(updatedGroup.totalPot)} · Base Share: ${formatCurrency(updatedGroup.monthlyBaseShare)}/mo · Members: ${updatedMembers.length}`
    );

    // 4. Log Webhook entry
    const webhookItem: WebhookLog = {
      id: `wh-${Date.now()}`,
      timestamp: new Date().toISOString(),
      event: 'plan.updated',
      title: `Plan Updated: ${updatedGroup.name}`,
      details: `Updated plan configuration: Pot ${formatCurrency(updatedGroup.totalPot)}, ${updatedMembers.length} members, ${updatedGroup.durationMonths} months tenure, Base Share ${formatCurrency(updatedGroup.monthlyBaseShare)}/mo, Organizer charges ${formatCurrency(updatedGroup.organizerFee)}/mo.`,
      payload: {
        groupId: updatedGroup.id,
        name: updatedGroup.name,
        pot: updatedGroup.totalPot,
        memberCount: updatedGroup.memberCount,
        membersRosterCount: updatedMembers.length,
        durationMonths: updatedGroup.durationMonths,
        organizerFee: updatedGroup.organizerFee,
        monthlyBaseShare: updatedGroup.monthlyBaseShare,
        status: updatedGroup.status,
      },
      status: 'success',
    };
    setWebhooks((prev) => [webhookItem, ...prev]);

    // 5. Add Notification item
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: `Plan Modified: ${updatedGroup.name}`,
        message: `Plan settings, pot amount (${formatCurrency(updatedGroup.totalPot)}), and member roster were successfully updated.`,
        type: 'system',
        read: false,
      },
      ...prev,
    ]);
  };

  /**
   * Delete an existing Chit Fund Plan
   */
  const handleDeletePlan = (groupIdToDelete: string) => {
    if (groups.length <= 1) {
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          timestamp: new Date().toISOString(),
          title: 'Action Prevented',
          message: 'Cannot delete the only remaining active chit plan.',
          type: 'system',
          read: false,
        },
        ...prev,
      ]);
      return;
    }

    const remainingGroups = groups.filter((g) => g.id !== groupIdToDelete);
    setGroups(remainingGroups);
    setMembers((prev) => prev.filter((m) => m.groupId !== groupIdToDelete));
    setAuctions((prev) => prev.filter((a) => a.groupId !== groupIdToDelete));
    setPayments((prev) => prev.filter((p) => p.groupId !== groupIdToDelete));

    if (activeGroupId === groupIdToDelete) {
      setActiveGroupId(remainingGroups[0].id);
    }
  };

  /**
   * Record or Update Payment
   */
  const handleSavePayment = (updatedPayment: Payment) => {
    setPayments((prev) =>
      prev.map((p) => (p.id === updatedPayment.id ? updatedPayment : p))
    );

    // Recalculate member totalPaid
    const memberId = updatedPayment.memberId;
    const memberAllPayments = payments
      .map((p) => (p.id === updatedPayment.id ? updatedPayment : p))
      .filter((p) => p.memberId === memberId);
    const updatedTotalPaid = memberAllPayments.reduce((acc, p) => acc + p.amountPaid, 0);

    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? { ...m, totalPaid: updatedTotalPaid }
          : m
      )
    );

    // Webhook log
    const member = members.find((m) => m.id === memberId);
    setWebhooks((prev) => [
      {
        id: `wh-${Date.now()}`,
        timestamp: new Date().toISOString(),
        event: 'payment.recorded',
        title: `Payment Received: ${member?.name}`,
        details: `Received ${formatCurrency(updatedPayment.amountPaid)} for Month ${updatedPayment.monthNumber} via ${updatedPayment.paymentMethod || 'UPI'}.`,
        payload: {
          paymentId: updatedPayment.id,
          groupId: updatedPayment.groupId,
          memberId: updatedPayment.memberId,
          memberName: member?.name,
          monthNumber: updatedPayment.monthNumber,
          amountPaid: updatedPayment.amountPaid,
          paymentMethod: updatedPayment.paymentMethod,
          transactionRef: updatedPayment.transactionRef,
        },
        status: 'success',
      },
      ...prev,
    ]);
  };

  /**
   * Update Auction Payout Status (e.g. Mark Disbursed)
   */
  const handleUpdateAuctionPayout = (auctionId: string, payoutData: Partial<Auction>) => {
    setAuctions((prev) =>
      prev.map((a) => (a.id === auctionId ? { ...a, ...payoutData } : a))
    );

    const auc = auctions.find((a) => a.id === auctionId);
    const winner = auc ? members.find((m) => m.id === auc.winnerId) : null;

    setWebhooks((prev) => [
      {
        id: `wh-${Date.now()}`,
        timestamp: new Date().toISOString(),
        event: 'payout.disbursed',
        title: `Payout Disbursed to ${winner?.name || 'Winner'}`,
        details: `Disbursed ${formatCurrency(auc?.winnerPayout || 0)} via ${payoutData.payoutMethod || 'Bank Transfer'}. Ref: ${payoutData.payoutReference}`,
        payload: {
          auctionId,
          winnerId: auc?.winnerId,
          payoutAmount: auc?.winnerPayout,
          ...payoutData,
        },
        status: 'success',
      },
      ...prev,
    ]);
  };

  /**
   * Reset / Clear all data
   */
  const handleResetData = () => {
    resetAllDataToDefault();
    setGroups([]);
    setActiveGroupId('');
    setMembers([]);
    setAuctions([]);
    setPayments([]);
    setWebhooks([]);
    setNotifications([
      {
        id: `notif-${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: 'All Data Cleared',
        message: 'All chit funds, members, auctions, and payments have been completely reset.',
        type: 'system',
        read: false,
      },
    ]);
  };

  /**
   * Backup/Export all data to JSON
   */
  const handleExportData = () => {
    const backup = {
      exportTimestamp: new Date().toISOString(),
      groups,
      activeGroupId,
      members,
      auctions,
      payments,
      webhooks,
      notifications,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `chit_ledger_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  /**
   * Restore/Import data from JSON backup
   */
  const handleImportData = (backup: any) => {
    if (!backup || typeof backup !== 'object' || !Array.isArray(backup.groups) || !Array.isArray(backup.members)) {
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          timestamp: new Date().toISOString(),
          title: 'Import Failed',
          message: 'The selected backup file is invalid or does not contain ChitLedger records.',
          type: 'system',
          read: false,
        },
        ...prev,
      ]);
      return;
    }

    if (Array.isArray(backup.groups)) setGroups(backup.groups);
    if (backup.activeGroupId && backup.groups.some((g: any) => g.id === backup.activeGroupId)) {
      setActiveGroupId(backup.activeGroupId);
    } else if (backup.groups.length > 0) {
      setActiveGroupId(backup.groups[0].id);
    }

    if (Array.isArray(backup.members)) setMembers(backup.members);
    if (Array.isArray(backup.auctions)) setAuctions(backup.auctions);
    if (Array.isArray(backup.payments)) setPayments(backup.payments);
    if (Array.isArray(backup.webhooks)) setWebhooks(backup.webhooks);
    if (Array.isArray(backup.notifications)) setNotifications(backup.notifications);

    if (soundEnabled) {
      playNotificationTone('success');
    }

    sendPushNotification('🔄 Backup Restored', `Restored ${backup.groups.length} plans and ${backup.members.length} members.`);
  };

  return (
    <div className="min-h-screen bg-[var(--m3-surface)] text-[var(--m3-on-surface)] flex flex-col font-sans transition-colors duration-200">
      {/* Top Sticky Navbar */}
      <Navbar
        group={group}
        groups={groups}
        activeGroupId={activeGroupId}
        onSelectGroup={(id) => setActiveGroupId(id)}
        onOpenCreatePlanModal={() => setIsCreatePlanModalOpen(true)}
        onOpenThemeSettings={() => setIsThemeSettingsOpen(true)}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        unreadCount={unreadCount}
        onOpenNotifications={() => setIsNotificationCenterOpen(true)}
        onRunCronScan={handleTriggerCronScan}
        onOpenAuctionRunner={() => setIsAuctionRunnerOpen(true)}
        onResetData={handleResetData}
        onExportData={handleExportData}
        onImportData={handleImportData}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {!group && currentTab !== 'plans' ? (
          <div className="max-w-xl mx-auto my-12 m3-card p-8 sm:p-10 text-center space-y-6 shadow-sm border border-[var(--m3-outline-variant)]">
            <div className="w-16 h-16 rounded-3xl bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)] flex items-center justify-center mx-auto text-3xl font-bold font-mono shadow-xs">
              ₹
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-[var(--m3-on-surface)] tracking-tight">
                No Chit Fund Plans Created Yet
              </h2>
              <p className="text-sm text-[var(--m3-on-surface-variant)] leading-relaxed">
                All dummy data has been removed. You have a fresh, clean slate! Create your first chit fund scheme to manage members, conduct reverse bidding auctions, collect installments, and disburse dividends.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setIsCreatePlanModalOpen(true)}
                className="m3-btn-primary px-6 py-2.5 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Create Your First Chit Plan</span>
              </button>
              <button
                onClick={() => setCurrentTab('plans')}
                className="m3-btn-tonal px-5 py-2.5 text-sm font-semibold cursor-pointer w-full sm:w-auto"
              >
                View Plans Directory
              </button>
            </div>
          </div>
        ) : (
          <>
            {currentTab === 'dashboard' && group && (
              <DashboardOverview
                group={group}
                members={activeMembers}
                auctions={activeAuctions}
                payments={activePayments}
                onOpenAuctionRunner={() => setIsAuctionRunnerOpen(true)}
                onOpenPaymentModal={(payment) => setSelectedPaymentForModal(payment || null)}
                onSelectMember={(member) => setSelectedMemberForPassbook(member)}
                onNavigateToTab={(tab) => setCurrentTab(tab)}
                onRunCronScan={handleTriggerCronScan}
                onOpenReceipt={(payment) => setSelectedPaymentForReceipt(payment)}
                onOpenCreatePlanModal={() => setIsCreatePlanModalOpen(true)}
                onOpenEditPlanModal={() => handleOpenEditPlan(group)}
              />
            )}

            {currentTab === 'plans' && (
              <ChitPlansView
                groups={groups}
                activeGroupId={activeGroupId}
                onSelectGroup={(id) => {
                  setActiveGroupId(id);
                  setCurrentTab('dashboard');
                }}
                onOpenCreatePlanModal={() => setIsCreatePlanModalOpen(true)}
                onEditGroup={(g) => handleOpenEditPlan(g)}
                onDeleteGroup={handleDeletePlan}
                allMembers={members}
                allPayments={payments}
                allAuctions={auctions}
                onNavigateToTab={(tab) => setCurrentTab(tab)}
              />
            )}

            {currentTab === 'ledger' && group && (
              <PaymentsLedger
                group={group}
                members={activeMembers}
                payments={activePayments}
                onOpenPaymentModal={(payment) => setSelectedPaymentForModal(payment)}
                onOpenReceipt={(payment) => setSelectedPaymentForReceipt(payment)}
                onSelectMember={(member) => setSelectedMemberForPassbook(member)}
                onBatchWhatsAppReminders={() => setCurrentTab('reminders')}
              />
            )}

            {currentTab === 'auctions' && group && (
              <AuctionsAndPayoutsView
                group={group}
                auctions={activeAuctions}
                members={activeMembers}
                onOpenAuctionRunner={() => setIsAuctionRunnerOpen(true)}
                onUpdateAuctionPayout={handleUpdateAuctionPayout}
                onSelectMember={(member) => setSelectedMemberForPassbook(member)}
              />
            )}

            {currentTab === 'members' && group && (
              <MembersDirectory
                group={group}
                members={activeMembers}
                payments={activePayments}
                onSelectMember={(member) => setSelectedMemberForPassbook(member)}
                onAddMember={(newMember) =>
                  setMembers((prev) => [...prev, { ...newMember, groupId: group.id }])
                }
                onUpdateMember={(updatedMember) =>
                  setMembers((prev) =>
                    prev.map((m) => (m.id === updatedMember.id ? updatedMember : m))
                  )
                }
              />
            )}

            {currentTab === 'reminders' && group && (
              <ReminderEngineModal
                group={group}
                members={activeMembers}
                payments={activePayments}
                webhooks={webhooks}
                onTriggerCronScan={handleTriggerCronScan}
                soundEnabled={soundEnabled}
              />
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <CreatePlanModal
        isOpen={isCreatePlanModalOpen}
        onClose={() => setIsCreatePlanModalOpen(false)}
        onCreatePlan={handleCreatePlan}
      />

      {isEditPlanOpen && planToEdit && (
        <EditPlanModal
          isOpen={isEditPlanOpen}
          onClose={() => {
            setIsEditPlanOpen(false);
            setPlanToEdit(null);
          }}
          group={planToEdit}
          members={members}
          payments={payments}
          auctions={auctions}
          onSavePlan={handleSaveEditedPlan}
          soundEnabled={soundEnabled}
        />
      )}

      {group && (
        <AuctionRunnerModal
          isOpen={isAuctionRunnerOpen}
          onClose={() => setIsAuctionRunnerOpen(false)}
          group={group}
          members={activeMembers}
          onCompleteAuction={handleCompleteAuction}
          soundEnabled={soundEnabled}
        />
      )}

      {group && (
        <PaymentModal
          isOpen={Boolean(selectedPaymentForModal)}
          onClose={() => setSelectedPaymentForModal(null)}
          payment={selectedPaymentForModal}
          members={activeMembers}
          group={group}
          onSavePayment={handleSavePayment}
          soundEnabled={soundEnabled}
        />
      )}

      {group && (
        <MemberPassbookModal
          isOpen={Boolean(selectedMemberForPassbook)}
          onClose={() => setSelectedMemberForPassbook(null)}
          member={selectedMemberForPassbook}
          group={group}
          payments={payments.filter((p) => p.memberId === selectedMemberForPassbook?.id)}
          auctions={activeAuctions}
          onOpenReceipt={(payment) => setSelectedPaymentForReceipt(payment)}
          onOpenPaymentModal={(payment) => {
            setSelectedMemberForPassbook(null);
            setSelectedPaymentForModal(payment);
          }}
        />
      )}

      {group && (
        <ReceiptModal
          isOpen={Boolean(selectedPaymentForReceipt)}
          onClose={() => setSelectedPaymentForReceipt(null)}
          payment={selectedPaymentForReceipt}
          members={activeMembers}
          group={group}
        />
      )}

      <NotificationCenterModal
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        notifications={notifications}
        onMarkAllAsRead={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
        onClearAll={() => setNotifications([])}
        soundEnabled={soundEnabled}
      />

      <ThemeSettingsModal
        isOpen={isThemeSettingsOpen}
        onClose={() => setIsThemeSettingsOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-low)] py-4 text-center text-xs text-[var(--m3-on-surface-variant)]">
        <p className="font-medium">ChitLedger · Multi-Plan Chit Fund Management System</p>
        <p className="text-[11px] opacity-75 mt-0.5">
          {group ? `${formatCurrency(group.organizerFee)} organizer charges adjusted per auction · ` : ''}Material 3 Dynamic UI · Automated 8:00 AM Cron Engine
        </p>
      </footer>
    </div>
  );
}

