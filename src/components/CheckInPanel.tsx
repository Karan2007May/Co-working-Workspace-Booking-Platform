/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Booking, User, VisitorInfo, Workspace } from '../types';
import { db } from '../mockData';
import { CheckCircle, AlertOctagon, LogOut, Clock, Eye, ShieldAlert, Sparkles, UserPlus, FileSpreadsheet, PlusCircle } from 'lucide-react';

interface CheckInPanelProps {
  currentUser: User;
  bookings: Booking[];
  workspaces: Workspace[];
  onUpdateBookingStatus: (bookingId: string, newStatus: Booking['status'], extra?: Partial<Booking>) => void;
  onRefreshData: () => void;
  onSelectUser?: (user: User) => void;
}

export default function CheckInPanel({
  currentUser,
  bookings,
  workspaces,
  onUpdateBookingStatus,
  onRefreshData,
  onSelectUser,
}: CheckInPanelProps) {
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [showOverrideModal, setShowOverrideModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'my-bookings' | 'staff-desk' | 'walk-in-visitor'>('my-bookings');
  const [simulatedTime, setSimulatedTime] = useState<string>('05:12');

  // Walk-in visitor form state
  const [walkInName, setWalkInName] = useState<string>('');
  const [walkInEmail, setWalkInEmail] = useState<string>('');
  const [walkInCompany, setWalkInCompany] = useState<string>('');
  const [associatedBookingId, setAssociatedBookingId] = useState<string>('');

  const isStaff = currentUser.role === 'Front Desk Staff' || currentUser.role === 'Facility Manager' || currentUser.role === 'System Administrator';
  const canAccessReception = currentUser.role === 'Front Desk Staff' || currentUser.role === 'System Administrator';

  // Filtered bookings
  const bookingsToDisplay = useMemo(() => {
    if (canAccessReception && activeTab === 'staff-desk') {
      // Staff see everything, sorted by newest
      return [...bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    // Members/Guests see only their own
    return bookings.filter((b) => b.userId === currentUser.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [bookings, currentUser, canAccessReception, activeTab]);

  const getWorkspaceName = (wsId: string) => {
    return workspaces.find((w) => w.id === wsId)?.name || 'Unknown Workspace';
  };

  // Helper to determine if a booking can check-in right now
  const getCheckInStatus = (booking: Booking) => {
    if (booking.status !== 'Confirmed') {
      return { allowed: false, message: `Unavailable (Status: ${booking.status})` };
    }

    // Today's date check (Hardcoded 2026-07-09 for prototype coherence)
    const today = '2026-07-09';
    if (booking.date !== today) {
      return { allowed: false, message: `Scheduled for ${booking.date}` };
    }

    // Early/Late window checking
    const [curH, curM] = simulatedTime.split(':').map(Number);
    const currentMinutes = curH * 60 + curM;
    const [sh, sm] = booking.startTime.split(':').map(Number);
    const startMinutes = sh * 60 + sm;

    const earlyLimit = startMinutes - 30; // 30 mins early
    const graceLimit = startMinutes + 15; // 15 mins grace

    if (currentMinutes < earlyLimit) {
      return { allowed: false, message: `Too early (Opens at ${booking.startTime})` };
    }

    if (currentMinutes > graceLimit) {
      return { allowed: false, expired: true, message: `Late - Grace period expired` };
    }

    return { allowed: true, message: 'Ready for Check-In' };
  };

  const handleCheckIn = (booking: Booking) => {
    const { allowed, expired } = getCheckInStatus(booking);

    if (allowed) {
      // Perform normal check-in
      onUpdateBookingStatus(booking.id, 'Checked-in', {
        actualCheckIn: new Date().toISOString(),
      });
      db.addAuditLog(
        'Check-in',
        currentUser.id,
        currentUser.name,
        currentUser.role,
        `Successfully checked into booking ${booking.bookingRef} (normal flow)`,
        'Check-in / Check-out'
      );
    } else if (expired && isStaff) {
      // Staff can override expired check-ins
      setSelectedBooking(booking);
      setShowOverrideModal(true);
    } else if (expired) {
      alert('The grace period of 15 minutes has expired. Please contact the front desk to override the booking closure.');
    } else {
      alert(`Check-in not allowed: ${getCheckInStatus(booking).message}`);
    }
  };

  const handleConfirmOverride = () => {
    if (!selectedBooking) return;
    if (!overrideReason.trim()) {
      alert('Please provide a reason for overriding this check-in.');
      return;
    }

    onUpdateBookingStatus(selectedBooking.id, 'Checked-in', {
      actualCheckIn: new Date().toISOString(),
      internalNotes: `${selectedBooking.internalNotes || ''}\n[Staff Override Check-in] Reason: ${overrideReason}`,
    });

    db.addAuditLog(
      'Staff Override',
      currentUser.id,
      currentUser.name,
      currentUser.role,
      `Overrode late check-in for booking ${selectedBooking.bookingRef}. Reason: ${overrideReason}`,
      'Check-in / Check-out',
      selectedBooking.status,
      'Checked-in'
    );

    setShowOverrideModal(false);
    setOverrideReason('');
    setSelectedBooking(null);
    onRefreshData();
  };

  const handleCheckOut = (booking: Booking) => {
    onUpdateBookingStatus(booking.id, 'Completed', {
      actualCheckOut: new Date().toISOString(),
      isOverstay: false,
    });
    db.addAuditLog(
      'Check-out',
      currentUser.id,
      currentUser.name,
      currentUser.role,
      `Checked out of booking ${booking.bookingRef} successfully`,
      'Check-in / Check-out'
    );
  };

  // Simulate No-Show Sweep
  const triggerNoShowSweep = () => {
    const [curH, curM] = simulatedTime.split(':').map(Number);
    const currentMinutes = curH * 60 + curM;
    const today = '2026-07-09';
    let sweepCount = 0;

    bookings.forEach((b) => {
      if (b.status === 'Confirmed' && b.date === today) {
        const [sh, sm] = b.startTime.split(':').map(Number);
        const startMinutes = sh * 60 + sm;
        if (currentMinutes > startMinutes + 15) {
          // Exceeded grace limit! Automatically convert to no-show and credit quota preserved
          onUpdateBookingStatus(b.id, 'No-show');
          db.addAuditLog(
            'No-show Auto Transition',
            'SYSTEM',
            'Booking Core Engine',
            'System Administrator',
            `Auto-released booking ${b.bookingRef} due to grace period timeout (BR-04)`,
            'Check-in / Check-out',
            'Confirmed',
            'No-show'
          );
          sweepCount++;
        }
      }
    });

    alert(`No-Show Sweep Complete. Automatically released ${sweepCount} neglected bookings. Workspaces are now re-listed!`);
    onRefreshData();
  };

  // Handle registering a Walk-in Visitor
  const handleRegisterWalkIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInName || !walkInEmail) {
      alert('Visitor Name and Email are required.');
      return;
    }

    if (associatedBookingId) {
      // Find the booking and insert visitor
      const bList = db.getBookings();
      const updatedList = bList.map((b) => {
        if (b.id === associatedBookingId) {
          const vObj: VisitorInfo = {
            id: `v-walkin-${Date.now()}`,
            name: walkInName,
            email: walkInEmail,
            company: walkInCompany || undefined,
            status: 'Checked-in',
            checkInTime: new Date().toISOString(),
          };
          return {
            ...b,
            visitors: [...b.visitors, vObj],
          };
        }
        return b;
      });
      db.setBookings(updatedList);
      db.addAuditLog(
        'Visitor Check-in',
        currentUser.id,
        currentUser.name,
        currentUser.role,
        `Checked in walk-in visitor ${walkInName} for booking ID ${associatedBookingId}`,
        'Visitor Management'
      );
      alert(`Walk-in visitor registered and checked directly into the active reservation!`);
    } else {
      // Unassociated visitor log
      db.addAuditLog(
        'Visitor Walk-in Log',
        currentUser.id,
        currentUser.name,
        currentUser.role,
        `Logged independent walk-in visitor ${walkInName} (${walkInEmail}) representing ${walkInCompany || 'Self'}`,
        'Visitor Management'
      );
      alert(`Walk-in visitor registered independently! Entry recorded in visitors log.`);
    }

    setWalkInName('');
    setWalkInEmail('');
    setWalkInCompany('');
    setAssociatedBookingId('');
    onRefreshData();
  };

  // List of active/checked-in bookings for walk-in association
  const activeBookingsForAssociation = useMemo(() => {
    return bookings.filter((b) => b.status === 'Checked-in' || b.status === 'Confirmed');
  }, [bookings]);

  return (
    <div id="check-in-dashboard" className="space-y-6">
      {/* Control Tabs Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            id="tab-my-bookings"
            onClick={() => setActiveTab('my-bookings')}
            className={`px-4 py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeTab === 'my-bookings' ? 'bg-white text-slate-800 shadow' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            My Reservations
          </button>
          {canAccessReception && (
            <>
              <button
                id="tab-staff-desk"
                onClick={() => setActiveTab('staff-desk')}
                className={`px-4 py-2 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'staff-desk' ? 'bg-white text-slate-800 shadow' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Reception Desk</span>
              </button>
              <button
                id="tab-walk-in-visitor"
                onClick={() => setActiveTab('walk-in-visitor')}
                className={`px-4 py-2 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'walk-in-visitor' ? 'bg-white text-slate-800 shadow' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Walk-in Visitor</span>
              </button>
            </>
          )}
        </div>

        {/* Simulate Engine Helpers */}
        <div className="flex items-center gap-2">
          <div className="text-xs text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-mono">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-semibold text-[10px] uppercase tracking-wider">Simulated Time:</span>
            <input
              id="input-simulated-time"
              type="time"
              value={simulatedTime}
              onChange={(e) => setSimulatedTime(e.target.value)}
              className="bg-transparent border-none text-blue-700 font-bold font-mono focus:outline-none focus:ring-0 cursor-pointer w-14 p-0 text-xs"
              title="Click to adjust simulated time for checking-in / no-show sweeps"
            />
          </div>
          {isStaff && (
            <button
              id="btn-trigger-no-show-sweep"
              onClick={triggerNoShowSweep}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              title="Automatically cancel bookings where grace period of 15 minutes expired"
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              Run No-Show Sweep (BR-04)
            </button>
          )}
        </div>
      </div>

      {!canAccessReception && activeTab === 'staff-desk' && (
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-8 text-center text-white max-w-2xl mx-auto shadow-2xl relative overflow-hidden my-4">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl"></div>
          <div className="flex flex-col items-center space-y-4 relative z-10">
            <div className="p-3.5 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 text-white animate-pulse">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-black text-white">Reception Desk Control Restricted</h4>
              <p className="text-slate-300 text-xs leading-relaxed max-w-md">
                This feature is part of the Front Desk Flow. Switch your simulated identity to Front Desk Staff to access guest pre-registrations, walk-in logs, and staff overrides.
              </p>
            </div>
            {onSelectUser && (
              <button
                id="btn-switch-to-front-desk"
                onClick={() => {
                  const staff = db.getUsers().find((u) => u.role === 'Front Desk Staff');
                  if (staff) onSelectUser(staff);
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-pink-600 hover:from-blue-500 hover:to-pink-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all hover:scale-105 cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>Switch to Emily Watson (Front Desk Staff) & Unlock</span>
              </button>
            )}
          </div>
        </div>
      )}

      {!canAccessReception && activeTab === 'walk-in-visitor' && (
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-8 text-center text-white max-w-2xl mx-auto shadow-2xl relative overflow-hidden my-4">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl"></div>
          <div className="flex flex-col items-center space-y-4 relative z-10">
            <div className="p-3.5 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 text-white animate-pulse">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-black text-white">Walk-in Registration Restricted</h4>
              <p className="text-slate-300 text-xs leading-relaxed max-w-md">
                This feature is part of the Front Desk Flow. Switch your simulated identity to Front Desk Staff to register walk-in guests, print badges, or link visitors to host bookings.
              </p>
            </div>
            {onSelectUser && (
              <button
                id="btn-switch-to-front-desk-visitor"
                onClick={() => {
                  const staff = db.getUsers().find((u) => u.role === 'Front Desk Staff');
                  if (staff) onSelectUser(staff);
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-pink-600 hover:from-blue-500 hover:to-pink-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all hover:scale-105 cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>Switch to Emily Watson (Front Desk Staff) & Unlock</span>
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab === 'walk-in-visitor' && canAccessReception && (
        <div id="walk-in-visitor-form-container" className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden max-w-2xl mx-auto">
          <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-slate-800">Walk-in Visitor Entry Registration (FR-5.2)</h3>
          </div>
          <form onSubmit={handleRegisterWalkIn} className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="walk-in-visitor-name" className="text-xs font-semibold text-slate-600">Visitor Name</label>
                <input
                  id="walk-in-visitor-name"
                  type="text"
                  placeholder="Visitor name"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="walk-in-visitor-email" className="text-xs font-semibold text-slate-600">Visitor Email</label>
                <input
                  id="walk-in-visitor-email"
                  type="email"
                  placeholder="visitor@email.com"
                  value={walkInEmail}
                  onChange={(e) => setWalkInEmail(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="walk-in-visitor-company" className="text-xs font-semibold text-slate-600">Represented Company (Optional)</label>
                <input
                  id="walk-in-visitor-company"
                  type="text"
                  placeholder="e.g. Google, Acme"
                  value={walkInCompany}
                  onChange={(e) => setWalkInCompany(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="walk-in-associated-booking" className="text-xs font-semibold text-slate-600">Associate with Active Host Booking (Optional)</label>
                <select
                  id="walk-in-associated-booking"
                  value={associatedBookingId}
                  onChange={(e) => setAssociatedBookingId(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">No Active Booking (Independent Walk-in)</option>
                  {activeBookingsForAssociation.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.userName} - {getWorkspaceName(b.workspaceId)} ({b.startTime} - {b.endTime})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                id="btn-submit-walk-in-registration"
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                Register & Check-in Visitor
              </button>
            </div>
          </form>
        </div>
      )}

      {(activeTab === 'my-bookings' || (activeTab === 'staff-desk' && canAccessReception)) && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">
              {activeTab === 'staff-desk' ? 'Global Space Occupancy Logs' : 'My Bookings History & Operations'}
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Total Recorded: {bookingsToDisplay.length} reservations
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold font-mono uppercase tracking-wider">
                  <th className="p-4">Reference</th>
                  <th className="p-4">Workspace & User</th>
                  <th className="p-4">Reserved Schedule</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Visitors</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookingsToDisplay.map((b) => {
                  const wsName = getWorkspaceName(b.workspaceId);
                  const { allowed, expired, message } = getCheckInStatus(b);
                  const isOverstayActive = b.status === 'Checked-in' && b.isOverstay;

                  return (
                    <tr key={b.id} id={`booking-row-${b.id}`} className="border-b border-slate-100 hover:bg-slate-50/50 last:border-0">
                      {/* Ref */}
                      <td className="p-4 font-mono font-bold text-blue-600">
                        {b.bookingRef}
                      </td>

                      {/* Workspace & User details */}
                      <td className="p-4">
                        <div>
                          <span className="font-bold text-slate-800 text-sm block">{wsName}</span>
                          <span className="text-slate-400 text-[10px] font-mono leading-tight block mt-0.5">
                            Booked by: {b.userName} ({b.userRole})
                          </span>
                        </div>
                      </td>

                      {/* Schedule */}
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <span className="font-mono text-slate-700 block">{b.date}</span>
                          <span className="font-mono text-slate-400 font-semibold block text-[10px]">
                            {b.startTime} - {b.endTime}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                              b.status === 'Checked-in'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : b.status === 'Confirmed'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : b.status === 'Completed'
                                ? 'bg-slate-100 text-slate-700 border-slate-200'
                                : b.status === 'No-show'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : b.status === 'Cancelled'
                                ? 'bg-slate-50 text-slate-400 border-slate-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {b.status}
                          </span>
                          {isOverstayActive && (
                            <span className="text-[9px] bg-amber-500 text-white font-extrabold px-1.5 py-0.5 rounded animate-pulse">
                              OVERSTAY (FR-3.3)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Visitors Count */}
                      <td className="p-4 text-center font-semibold text-slate-700 font-mono">
                        {b.visitors.length > 0 ? (
                          <span className="bg-blue-50 border border-blue-100 text-blue-700 px-2 py-0.5 rounded" title={b.visitors.map(v => v.name).join(', ')}>
                            {b.visitors.length} Registered
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {b.status === 'Confirmed' && (
                            <button
                              id={`btn-row-check-in-${b.id}`}
                              onClick={() => handleCheckIn(b)}
                              className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer ${
                                allowed
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                  : expired && isStaff
                                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                              }`}
                              title={message}
                            >
                              {expired && isStaff ? 'Force Override Check-In' : 'Check-In'}
                            </button>
                          )}

                          {b.status === 'Checked-in' && (
                            <button
                              id={`btn-row-check-out-${b.id}`}
                              onClick={() => handleCheckOut(b)}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold cursor-pointer shadow-sm flex items-center gap-1"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              <span>Check-Out</span>
                            </button>
                          )}

                          {b.status === 'Confirmed' && (b.userId === currentUser.id || isStaff) && (
                            <button
                              id={`btn-row-cancel-booking-${b.id}`}
                              onClick={() => {
                                if (confirm('Are you sure you want to cancel this booking?')) {
                                  onUpdateBookingStatus(b.id, 'Cancelled');
                                  db.addAuditLog('Booking Cancellation', currentUser.id, currentUser.name, currentUser.role, `Cancelled booking ${b.bookingRef}`, 'Booking Management');
                                }
                              }}
                              className="px-2.5 py-1.5 text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          )}

                          {/* Show Detail view if custom notes */}
                          {(b.purpose || b.specialRequests) && (
                            <button
                              id={`btn-row-view-details-${b.id}`}
                              onClick={() => {
                                alert(`Purpose: ${b.purpose || 'None'}\nSpecial Requests: ${b.specialRequests || 'None'}\nInternal Notes: ${b.internalNotes || 'None'}`);
                              }}
                              className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {bookingsToDisplay.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No matching reservations recorded in this context.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Staff Override Dialog */}
      {showOverrideModal && selectedBooking && (
        <div id="staff-override-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-100 max-w-md w-full shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-amber-50 px-5 py-4 border-b border-amber-200 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-slate-800">Front Desk Exception Override</h3>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                You are performing a manual reception override for booking <strong className="font-mono text-blue-600">{selectedBooking.bookingRef}</strong> ({selectedBooking.userName}). The 15-minute standard grace period has expired, but receptionist rights permit override.
              </p>

              <div className="space-y-1.5">
                <label htmlFor="override-reason-input" className="text-xs font-semibold text-slate-700 block">Override Reason (Required for Audit Logging)</label>
                <textarea
                  id="override-reason-input"
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g., Transit delays, member checked-in on-site manually, client request"
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-amber-500"
                  required
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  id="btn-close-override-modal"
                  onClick={() => {
                    setShowOverrideModal(false);
                    setSelectedBooking(null);
                    setOverrideReason('');
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-override-action"
                  onClick={handleConfirmOverride}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded cursor-pointer shadow-sm"
                >
                  Approve Exception Check-In
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
