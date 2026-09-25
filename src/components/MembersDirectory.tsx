import React, { useState } from 'react';
import { 
  UserPlus, 
  Search, 
  Phone, 
  IndianRupee, 
  CheckCircle, 
  Clock, 
  FileText, 
  Send,
  Edit2,
  Trash2,
  UserCheck,
  CreditCard,
  Users
} from 'lucide-react';
import { Member, Payment, ChitGroup } from '../types/chit';
import { formatCurrency, formatDate } from '../utils/calculations';
import { buildWhatsAppReminderUrl } from '../utils/notifications';

interface MembersDirectoryProps {
  group: ChitGroup;
  members: Member[];
  payments: Payment[];
  onSelectMember: (member: Member) => void;
  onAddMember: (member: Member) => void;
  onUpdateMember: (member: Member) => void;
}

export const MembersDirectory: React.FC<MembersDirectoryProps> = ({
  group,
  members,
  payments,
  onSelectMember,
  onAddMember,
  onUpdateMember,
}) => {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formUpi, setFormUpi] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const filteredMembers = members.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.phone.toLowerCase().includes(q) ||
      (m.upiId && m.upiId.toLowerCase().includes(q))
    );
  });

  const handleOpenAdd = () => {
    setEditingMember(null);
    setFormName('');
    setFormPhone('');
    setFormUpi('');
    setFormNotes('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (member: Member) => {
    setEditingMember(member);
    setFormName(member.name);
    setFormPhone(member.phone);
    setFormUpi(member.upiId || '');
    setFormNotes(member.notes || '');
    setShowAddModal(true);
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) return;

    if (editingMember) {
      onUpdateMember({
        ...editingMember,
        name: formName.trim(),
        phone: formPhone.trim(),
        upiId: formUpi.trim() || undefined,
        notes: formNotes.trim() || undefined,
      });
    } else {
      const newMember: Member = {
        id: `mem-${Date.now()}`,
        groupId: group.id,
        name: formName.trim(),
        phone: formPhone.trim(),
        upiId: formUpi.trim() || undefined,
        hasWonAuction: false,
        totalPaid: 0,
        totalReceived: 0,
        joinedDate: new Date().toISOString().split('T')[0],
        notes: formNotes.trim() || undefined,
      };
      onAddMember(newMember);
    }

    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--m3-on-surface)] tracking-tight">Members & Account Ledgers</h2>
          <p className="text-xs text-[var(--m3-on-surface-variant)] mt-0.5">
            {members.length} registered members · Click any member to inspect their complete Passbook
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="m3-btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Add Member</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="m3-card p-3 sm:p-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[var(--m3-on-surface-variant)] absolute left-3.5 top-2.5 opacity-70" />
          <input
            type="text"
            placeholder="Search member by name, phone, or UPI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[var(--m3-surface-container-low)] border border-[var(--m3-outline-variant)] rounded-full text-xs text-[var(--m3-on-surface)] placeholder:text-[var(--m3-on-surface-variant)]/60 focus:outline-none focus:border-[var(--m3-primary)]"
          />
        </div>
        <div className="text-xs text-[var(--m3-on-surface-variant)] font-mono hidden sm:block">
          {filteredMembers.length} of {members.length} showing
        </div>
      </div>

      {/* Members Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.length === 0 ? (
          <div className="col-span-full m3-card p-10 text-center space-y-3">
            <Users className="w-10 h-10 text-[var(--m3-on-surface-variant)] opacity-40 mx-auto" />
            <h4 className="font-bold text-sm text-[var(--m3-on-surface)]">No Members Found</h4>
            <p className="text-xs text-[var(--m3-on-surface-variant)] max-w-sm mx-auto">
              {search ? 'No members match your search criteria.' : 'No members enrolled in this plan yet. Click "Add Member" to enroll participants.'}
            </p>
            {!search && (
              <button
                onClick={handleOpenAdd}
                className="m3-btn-primary px-4 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Member</span>
              </button>
            )}
          </div>
        ) : (
          filteredMembers.map((member) => {
          // Member payments
          const memberPayments = payments.filter((p) => p.memberId === member.id);
          const totalPaid = memberPayments.reduce((acc, p) => acc + p.amountPaid, 0);
          const pendingThisMonth = memberPayments.find(
            (p) => p.monthNumber === group.currentMonth && p.status !== 'Paid'
          );

          return (
            <div
              key={member.id}
              className="m3-card p-5 space-y-4 hover:shadow-md transition-all flex flex-col justify-between"
            >
              {/* Member Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-[var(--m3-on-surface)] text-sm">{member.name}</h3>
                    {member.hasWonAuction ? (
                      <span className="m3-chip-selected text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                        Won M{member.wonMonth}
                      </span>
                    ) : (
                      <span className="bg-[var(--m3-surface-container-high)] text-[var(--m3-on-surface-variant)] text-[10px] font-medium px-2 py-0.5 rounded-full border border-[var(--m3-outline-variant)] whitespace-nowrap">
                        Eligible
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--m3-on-surface-variant)] font-mono mt-1 flex items-center gap-1.5 opacity-80">
                    <Phone className="w-3 h-3 text-[var(--m3-primary)]" />
                    <span>{member.phone}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenEdit(member)}
                  className="p-1.5 rounded-full text-[var(--m3-on-surface-variant)] hover:text-[var(--m3-on-surface)] hover:bg-[var(--m3-surface-container-high)] transition-colors cursor-pointer"
                  title="Edit details"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Financial Snapshot */}
              <div className="grid grid-cols-2 gap-2 bg-[var(--m3-surface-container-low)] p-3 rounded-xl border border-[var(--m3-outline-variant)] text-xs font-mono">
                <div>
                  <span className="text-[10px] text-[var(--m3-on-surface-variant)] font-sans block opacity-75">Total Paid</span>
                  <span className="font-bold text-[var(--m3-on-surface)]">{formatCurrency(totalPaid)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--m3-on-surface-variant)] font-sans block opacity-75">Payout Received</span>
                  <span className="font-bold text-[var(--m3-primary)]">{formatCurrency(member.totalReceived)}</span>
                </div>
              </div>

              {/* Dues Status for current month */}
              <div className="text-xs flex items-center justify-between">
                {pendingThisMonth ? (
                  <span className="m3-status-pending text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Month {group.currentMonth}: {formatCurrency(pendingThisMonth.amountDue - pendingThisMonth.amountPaid)} Pending</span>
                  </span>
                ) : (
                  <span className="m3-status-paid text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>Month {group.currentMonth} Cleared</span>
                  </span>
                )}
              </div>

              {/* Action buttons */}
              <div className="pt-2 border-t border-[var(--m3-outline-variant)] flex items-center justify-between gap-2">
                <button
                  onClick={() => onSelectMember(member)}
                  className="m3-btn-tonal px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Open Passbook</span>
                </button>

                {pendingThisMonth && (
                  <a
                    href={buildWhatsAppReminderUrl({
                      memberName: member.name,
                      phone: member.phone,
                      amountDue: pendingThisMonth.amountDue - pendingThisMonth.amountPaid,
                      monthNumber: group.currentMonth,
                      dueDate: formatDate(pendingThisMonth.dueDate),
                      chitName: group.name,
                      upiId: 'admin@okaxis',
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1 transition-colors"
                    title="Send WhatsApp reminder"
                  >
                    <Send className="w-3 h-3" />
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>
            </div>
          );
        }))}
      </div>

      {/* Add / Edit Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="m3-dialog w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-[var(--m3-on-surface)] text-base">
              {editingMember ? 'Edit Member Details' : 'Add New Chit Member'}
            </h3>

            <form onSubmit={handleSaveMember} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[var(--m3-on-surface)] font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Ramesh Chandra"
                  className="w-full px-3.5 py-2.5 bg-[var(--m3-surface-container-lowest)] border border-[var(--m3-outline-variant)] rounded-xl text-[var(--m3-on-surface)] focus:outline-none focus:border-[var(--m3-primary)]"
                  required
                />
              </div>

              <div>
                <label className="block text-[var(--m3-on-surface)] font-medium mb-1">Mobile Phone (for WhatsApp)</label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3.5 py-2.5 bg-[var(--m3-surface-container-lowest)] border border-[var(--m3-outline-variant)] rounded-xl text-[var(--m3-on-surface)] font-mono focus:outline-none focus:border-[var(--m3-primary)]"
                  required
                />
              </div>

              <div>
                <label className="block text-[var(--m3-on-surface)] font-medium mb-1">UPI ID (Optional)</label>
                <input
                  type="text"
                  value={formUpi}
                  onChange={(e) => setFormUpi(e.target.value)}
                  placeholder="e.g. ramesh@okaxis"
                  className="w-full px-3.5 py-2.5 bg-[var(--m3-surface-container-lowest)] border border-[var(--m3-outline-variant)] rounded-xl text-[var(--m3-on-surface)] font-mono focus:outline-none focus:border-[var(--m3-primary)]"
                />
              </div>

              <div>
                <label className="block text-[var(--m3-on-surface)] font-medium mb-1">Notes</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Preferred auction month"
                  className="w-full px-3.5 py-2.5 bg-[var(--m3-surface-container-lowest)] border border-[var(--m3-outline-variant)] rounded-xl text-[var(--m3-on-surface)] focus:outline-none focus:border-[var(--m3-primary)]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="m3-btn-outlined px-4 py-2 cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="m3-btn-primary px-4 py-2 text-xs font-bold cursor-pointer"
                >
                  {editingMember ? 'Update Member' : 'Save Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
