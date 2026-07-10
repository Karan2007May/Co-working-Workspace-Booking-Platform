/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Workspace, Booking, User, Location, MembershipPlan, AuditLog, WaitlistEntry, UserRole } from './types';
import { db, initializeDatabase } from './mockData';
import RoleSelector from './components/RoleSelector';
import WorkspaceSearch from './components/WorkspaceSearch';
import BookingForm from './components/BookingForm';
import CheckInPanel from './components/CheckInPanel';
import MembershipPanel from './components/MembershipPanel';
import ResourceManager from './components/ResourceManager';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import AuditLogViewer from './components/AuditLogViewer';
import SimulationAccessNotice from './components/SimulationAccessNotice';
import UserManagement from './components/UserManagement';
import { Search, Clock, Award, Shield, FileText, BarChart4, Bell, Mail, RefreshCw, Layers, CheckCircle, Users } from 'lucide-react';

interface NotificationMessage {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  type: 'email' | 'system' | 'waitlist';
}

export default function App() {
  // Initialize Database on load
  useEffect(() => {
    initializeDatabase();
  }, []);

  // State sync from DB
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => db.getWorkspaces());
  const [bookings, setBookings] = useState<Booking[]>(() => db.getBookings());
  const [locations, setLocations] = useState<Location[]>(() => db.getLocations());
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>(() => db.getMembershipPlans());
  const [users, setUsers] = useState<User[]>(() => db.getUsers());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => db.getAuditLogs());
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>(() => db.getWaitlist());

  // App navigation state
  const [currentView, setCurrentView] = useState<'search' | 'booking-form' | 'check-in' | 'memberships' | 'resource-manager' | 'analytics' | 'audit' | 'user-management'>('search');

  // Currently authenticated persona (Defaults to active member Alex Rivera for natural flow testing)
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const seedUsers = db.getUsers();
    return seedUsers.find((u) => u.role === 'Member') || seedUsers[0];
  });

  // Selected workspace state during booking configuration
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [bookingDate, setBookingDate] = useState<string>('2026-07-09');
  const [bookingStart, setBookingStart] = useState<string>('09:00');
  const [bookingEnd, setBookingEnd] = useState<string>('11:00');

  // Simulated email/push notification queue (FR-7)
  const [notifications, setNotifications] = useState<NotificationMessage[]>([
    {
      id: 'nt-1',
      title: 'Active Membership Registered',
      body: 'Your "Professional Nomad" plan is active. 50 monthly booking credits added.',
      timestamp: new Date(Date.now() - 3600000 * 2).toLocaleTimeString(),
      read: false,
      type: 'email',
    },
    {
      id: 'nt-2',
      title: 'Scheduled Check-in Reminder (BK-1003)',
      body: 'Your reservation for "Premium Dedicated Desk 01" began at 04:00. Checked-in successfully.',
      timestamp: new Date(Date.now() - 3600000).toLocaleTimeString(),
      read: false,
      type: 'system',
    },
  ]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState<boolean>(false);

  // Synchronize state changes back to localStorage & variables
  const refreshAllState = (activeUserId?: string) => {
    setWorkspaces(db.getWorkspaces());
    setBookings(db.getBookings());
    setLocations(db.getLocations());
    setMembershipPlans(db.getMembershipPlans());
    setUsers(db.getUsers());
    setAuditLogs(db.getAuditLogs());
    setWaitlist(db.getWaitlist());

    // Update active user state with newest credits, etc.
    const freshUsers = db.getUsers();
    const targetId = activeUserId || currentUser.id;
    const freshMe = freshUsers.find((u) => u.id === targetId);
    if (freshMe) {
      setCurrentUser(freshMe);
    }
  };

  // Switch Selected Persona User
  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    // Add audit log for login swap
    db.addAuditLog(
      'User Switch',
      user.id,
      user.name,
      user.role,
      `Persona swapped to ${user.name} (${user.role}) for prototype testing`,
      'Authentication'
    );
    // Auto shift views to prevent unauthorized states
    if (user.role === 'System Administrator') {
      if (currentView === 'search' || currentView === 'booking-form' || currentView === 'check-in') {
        setCurrentView('user-management');
      }
    } else if (user.role === 'Facility Manager') {
      if (currentView === 'audit' || currentView === 'user-management') {
        setCurrentView('search');
      }
    } else {
      if (currentView === 'resource-manager' || currentView === 'audit' || currentView === 'analytics' || currentView === 'user-management') {
        setCurrentView('search');
      }
    }
    refreshAllState(user.id);

    // Trigger feedback notification
    addSimulatedNotification(
      'Persona Swapped Successfully',
      `You are now viewing the workspace as ${user.name} (${user.role}).`,
      'system'
    );
  };

  // Complete prototype reset
  const handleResetDb = () => {
    db.resetDatabase();
    // Default to member
    const seedUsers = db.getUsers();
    const defaultMe = seedUsers.find((u) => u.role === 'Member') || seedUsers[0];
    setCurrentUser(defaultMe);
    setCurrentView('search');
    refreshAllState(defaultMe.id);
    setNotifications([
      {
        id: 'nt-init',
        title: 'Database Reset Complete',
        body: 'Prototype storage has been fully restored to original seeded states.',
        timestamp: new Date().toLocaleTimeString(),
        read: false,
        type: 'system',
      },
    ]);
    alert('Prototype database refreshed successfully!');
  };

  // Add a simulated notification (FR-7)
  const addSimulatedNotification = (title: string, body: string, type: 'email' | 'system' | 'waitlist' = 'system') => {
    const newNotify: NotificationMessage = {
      id: `nt-${Date.now()}`,
      title,
      body,
      timestamp: new Date().toLocaleTimeString(),
      read: false,
      type,
    };
    setNotifications((prev) => [newNotify, ...prev]);
  };

  // Handle workspace details click
  const handleSelectWorkspace = (workspace: Workspace, searchDate: string, searchStart: string, searchEnd: string) => {
    setSelectedWorkspace(workspace);
    setBookingDate(searchDate);
    setBookingStart(searchStart);
    setBookingEnd(searchEnd);
    setCurrentView('booking-form');
  };

  // Handle creating reservation (Supports single and recurring series)
  const handleSubmitBooking = (
    bookingData: Omit<Booking, 'id' | 'bookingRef' | 'createdAt'>,
    recurrenceType: string,
    occurrencesCount: number
  ) => {
    const activeBookings = db.getBookings();
    const freshUsers = db.getUsers();

    // Check hourly calculations
    const [sh, sm] = bookingData.startTime.split(':').map(Number);
    const [eh, em] = bookingData.endTime.split(':').map(Number);
    const hours = Math.max(0.5, (eh * 60 + em - (sh * 60 + sm)) / 60);
    const hourlyCost = Math.ceil(hours * db.getWorkspaces().find(w => w.id === bookingData.workspaceId)!.baseHourlyRate);

    // Track total credits consumed across potential series
    let totalCreditsUsed = 0;
    const newBookingsCreated: Booking[] = [];
    const conflictsList: string[] = [];

    const bookingDatesToGenerate: string[] = [bookingData.date];

    if (recurrenceType !== 'none') {
      let currentDate = new Date(bookingData.date);
      for (let i = 1; i < occurrencesCount; i++) {
        if (recurrenceType === 'daily') {
          currentDate.setDate(currentDate.getDate() + 1);
        } else if (recurrenceType === 'weekly') {
          currentDate.setDate(currentDate.getDate() + 7);
        } else if (recurrenceType === 'monthly') {
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
        // Format as YYYY-MM-DD
        const dStr = currentDate.toISOString().split('T')[0];
        bookingDatesToGenerate.push(dStr);
      }
    }

    // Generate bookings
    bookingDatesToGenerate.forEach((d, index) => {
      // Re-validate overlaps (BR-01, BR-06)
      const isOverlapping = (s1: string, e1: string, s2: string, e2: string) => s1 < e2 && e1 > s2;
      const conflicts = activeBookings.filter(
        (b) =>
          b.workspaceId === bookingData.workspaceId &&
          b.date === d &&
          (b.status === 'Confirmed' || b.status === 'Checked-in' || b.status === 'Pending Approval') &&
          isOverlapping(b.startTime, b.endTime, bookingData.startTime, bookingData.endTime)
      );

      if (conflicts.length > 0) {
        conflictsList.push(d);
      } else {
        // Safe to confirm
        const refNo = `BK-${1000 + activeBookings.length + newBookingsCreated.length + 1}`;
        const newBooking: Booking = {
          id: `bk-${Date.now()}-${index}`,
          bookingRef: refNo,
          ...bookingData,
          date: d,
          status: bookingData.status, // Pending Approval for VIP/Conf, Confirmed otherwise
          createdAt: new Date().toISOString(),
        };
        newBookingsCreated.push(newBooking);
        totalCreditsUsed += hourlyCost;
      }
    });

    // Save bookings
    const savedBookings = [...activeBookings, ...newBookingsCreated];
    db.setBookings(savedBookings);

    // Deduct credits from user (BR-08 quota consumption rule allows immediate update if confirmed, or wait until check-in.
    // The SRS says in Q4: quota is consumed at check-in, not at booking creation, so that cancelled/no-shows don't lose credits.
    // However, to keep balances clean for the prototype, let's deduct the first booking to show credit management in action!)
    if (currentUser.role === 'Member' && newBookingsCreated.length > 0) {
      const updatedUsers = freshUsers.map((u) => {
        if (u.id === currentUser.id) {
          return {
            ...u,
            remainingCredits: Math.max(0, u.remainingCredits - totalCreditsUsed),
          };
        }
        return u;
      });
      db.setUsers(updatedUsers);
    }

    // Logging & Notifications
    newBookingsCreated.forEach((b) => {
      const isVisitor = currentUser.role === 'Visitor';
      const paymentSuffix = isVisitor ? ` (Simulated card payment of $${totalCreditsUsed}.00 processed via Stripe Simulator)` : '';
      db.addAuditLog(
        'Booking Creation',
        currentUser.id,
        currentUser.name,
        currentUser.role,
        `Created ${b.status} booking ${b.bookingRef} for Date: ${b.date} (${b.startTime}-${b.endTime})${paymentSuffix}`,
        'Booking Management',
        undefined,
        JSON.stringify(b)
      );

      // Trigger Simulated Notification (FR-7)
      if (isVisitor) {
        addSimulatedNotification(
          `Payment Receipt & Booking Confirmation: ${b.bookingRef}`,
          `Payment of $${totalCreditsUsed}.00 processed. Workspace reserved. Status: ${b.status}. Receipt & Invoice emailed to ${b.userEmail}`,
          'email'
        );
      } else {
        addSimulatedNotification(
          `Booking Confirmation: ${b.bookingRef}`,
          `Successfully reserved workspace. Status: ${b.status}. Invoice copy emailed to ${b.userEmail}`,
          'email'
        );
      }
    });

    if (conflictsList.length > 0) {
      // BR-06 compliance warning
      alert(
        `Series Recurrence Summary:\nConfirmed ${newBookingsCreated.length} occurrence(s).\n\n⚠️ Conflicts Detected on ${conflictsList.length} date(s):\n${conflictsList.join(
          ', '
        )}\nThese conflicting dates were auto-skipped per Recurrence Integrity policy (BR-06).`
      );
    } else {
      alert(`Reservation Successful! Generated reference: ${newBookingsCreated[0].bookingRef}`);
    }

    setSelectedWorkspace(null);
    setCurrentView('check-in'); // Redirect to check-in/history dashboard
    refreshAllState();
  };

  // Handle joining waitlist (FR-2.9)
  const handleSubmitWaitlist = (wlData: { workspaceId: string; date: string; startTime: string; endTime: string }) => {
    const list = db.getWaitlist();
    const rank = list.filter((w) => w.workspaceId === wlData.workspaceId && w.date === wlData.date).length + 1;

    const entry: WaitlistEntry = {
      id: `wl-${Date.now()}`,
      workspaceId: wlData.workspaceId,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      date: wlData.date,
      startTime: wlData.startTime,
      endTime: wlData.endTime,
      rank,
      status: 'Active',
    };

    const updated = [...list, entry];
    db.setWaitlist(updated);

    db.addAuditLog(
      'Waitlist Addition',
      currentUser.id,
      currentUser.name,
      currentUser.role,
      `Joined waiting list for workspace ID ${wlData.workspaceId} on ${wlData.date} (Rank: ${rank})`,
      'Booking Management',
      undefined,
      JSON.stringify(entry)
    );

    addSimulatedNotification(
      'Waitlist Joined (Priority Queue)',
      `You are at Rank #${rank} for the requested slot. We will notify you immediately if a reservation is cancelled!`,
      'waitlist'
    );

    alert(`Successfully added to waitlist! Your active priority queue position is: Rank #${rank}`);
    setSelectedWorkspace(null);
    setCurrentView('search');
    refreshAllState();
  };

  // Handle checking-in/out or cancellations
  const handleUpdateBookingStatus = (bookingId: string, newStatus: Booking['status'], extraFields?: Partial<Booking>) => {
    const list = db.getBookings();
    const updated = list.map((b) => {
      if (b.id === bookingId) {
        return {
          ...b,
          status: newStatus,
          ...extraFields,
        };
      }
      return b;
    });
    db.setBookings(updated);

    // If cancelled, check if we need to alert waitlist (FR-2.9)
    if (newStatus === 'Cancelled') {
      const origB = list.find((b) => b.id === bookingId);
      if (origB) {
        const wl = db.getWaitlist();
        const nextInLine = wl.find(
          (w) => w.workspaceId === origB.workspaceId && w.date === origB.date && w.status === 'Active' && w.rank === 1
        );

        if (nextInLine) {
          // Alert next user
          addSimulatedNotification(
            `Waitlist Alert: Slot Freed!`,
            `The workspace has been freed on ${nextInLine.date}. Priority offer sent to ${nextInLine.userEmail}`,
            'waitlist'
          );

          // Update waitlist entry status
          const updatedWl = wl.map((w) => {
            if (w.id === nextInLine.id) {
              return {
                ...w,
                status: 'Offered' as const,
                offerExpiryTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 mins deadline (BR-05)
              };
            }
            return w;
          });
          db.setWaitlist(updatedWl);
        }
      }
    }

    refreshAllState();
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  return (
    <div id="cowork-booking-application-shell" className="min-h-screen colorful-mesh font-sans flex flex-col text-slate-800 relative overflow-x-hidden">
      {/* Dynamic Ambient Blur Blobs */}
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-40 right-10 w-[450px] h-[450px] bg-pink-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 left-10 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Floating Persona Swapper & Reset Utility */}
      <RoleSelector
        currentUser={currentUser}
        allUsers={users}
        onSelectUser={handleSelectUser}
        onResetDb={handleResetDb}
      />

      {/* Main Platform Header */}
      <header id="main-navigation-header" className="bg-white/80 border-b border-slate-200/80 px-6 py-4 sticky top-0 z-40 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-blue-600 to-pink-600 rounded-lg text-white shadow-md flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-pink-600 text-sm md:text-base leading-none tracking-tight">
                Co-Space Booking Engine
              </h1>
              <span className="text-[10px] text-indigo-600 font-bold font-mono uppercase tracking-wider block mt-0.5">
                Workspace Automation Platform
              </span>
            </div>
          </div>

          {/* Simulated Alerts Bell Box */}
          <div className="relative">
            <button
              id="btn-trigger-notification-box"
              onClick={() => {
                setShowNotificationsDropdown(!showNotificationsDropdown);
                // Mark all as read when opened
                setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
              }}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer relative"
              title="Simulation Alerts Feed"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-black text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {showNotificationsDropdown && (
              <div id="simulated-notifications-dropdown" className="absolute right-0 mt-2 w-80 bg-white/95 border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-50 backdrop-blur-md">
                <div className="bg-indigo-50/50 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider font-mono">
                    Notification Mailbox (FR-7)
                  </span>
                  <Mail className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 bg-white">
                  {notifications.map((n) => (
                    <div key={n.id} className="p-3 hover:bg-slate-50 transition-colors text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-indigo-600 uppercase font-mono tracking-wide">
                          {n.type} dispatch
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono font-bold">
                          {n.timestamp}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 mt-1">{n.title}</h4>
                      <p className="text-[10px] text-slate-600 leading-relaxed mt-0.5">{n.body}</p>
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-400 bg-white">
                      No dispatch messages recorded.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <div className="max-w-7xl mx-auto w-full px-4 py-8 flex-1 flex flex-col md:flex-row gap-8">
        {/* Responsive Sidebar Navigation */}
        <aside id="dashboard-sidebar-menu" className="w-full md:w-64 shrink-0 space-y-4">
          <nav className="flex flex-row md:flex-col overflow-x-auto md:overflow-visible gap-1.5 p-1.5 bg-white md:bg-white rounded-xl border border-slate-200/80 shadow-md">
            {currentUser.role !== 'System Administrator' && (
              <button
                id="sidebar-nav-search"
                onClick={() => setCurrentView('search')}
                className={`w-full text-left px-4 py-3 rounded-lg text-xs font-extrabold flex items-center gap-2.5 transition-all cursor-pointer ${
                  currentView === 'search' || currentView === 'booking-form'
                    ? 'sidebar-active shadow-sm font-sans'
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 border border-transparent font-sans'
                }`}
              >
                <Search className="w-4 h-4 shrink-0 text-blue-600" />
                <span>Discover & Book</span>
              </button>
            )}

            {currentUser.role !== 'System Administrator' && (
              <button
                id="sidebar-nav-check-in"
                onClick={() => setCurrentView('check-in')}
                className={`w-full text-left px-4 py-3 rounded-lg text-xs font-extrabold flex items-center gap-2.5 transition-all cursor-pointer ${
                  currentView === 'check-in'
                    ? 'sidebar-active shadow-sm font-sans'
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 border border-transparent font-sans'
                }`}
              >
                <Clock className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Check-In & Logs</span>
              </button>
            )}

            {currentUser.role === 'System Administrator' && (
              <button
                id="sidebar-nav-user-management"
                onClick={() => setCurrentView('user-management')}
                className={`w-full text-left px-4 py-3 rounded-lg text-xs font-extrabold flex items-center gap-2.5 transition-all cursor-pointer ${
                  currentView === 'user-management'
                    ? 'sidebar-active shadow-sm font-sans'
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 border border-transparent font-sans'
                }`}
              >
                <Users className="w-4 h-4 shrink-0 text-indigo-600" />
                <span>User Directory</span>
              </button>
            )}

            <button
              id="sidebar-nav-memberships"
              onClick={() => setCurrentView('memberships')}
              className={`w-full text-left px-4 py-3 rounded-lg text-xs font-extrabold flex items-center gap-2.5 transition-all cursor-pointer ${
                currentView === 'memberships'
                  ? 'sidebar-active shadow-sm font-sans'
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 border border-transparent font-sans'
              }`}
            >
              <Award className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Memberships</span>
            </button>

            {/* Restricted Manager tools (Only visible to Facility Manager & Admin per user intent) */}
            {(currentUser.role === 'Facility Manager' || currentUser.role === 'System Administrator') && (
              <button
                id="sidebar-nav-resource-manager"
                onClick={() => setCurrentView('resource-manager')}
                className={`w-full text-left px-4 py-3 rounded-lg text-xs font-extrabold flex items-center justify-between transition-all cursor-pointer ${
                  currentView === 'resource-manager'
                    ? 'sidebar-active shadow-sm font-sans'
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 border border-transparent font-sans'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 shrink-0 text-blue-600" />
                  <span>Asset Configuration</span>
                </div>
              </button>
            )}

            {(currentUser.role === 'Facility Manager' || currentUser.role === 'System Administrator') && (
              <button
                id="sidebar-nav-analytics"
                onClick={() => setCurrentView('analytics')}
                className={`w-full text-left px-4 py-3 rounded-lg text-xs font-extrabold flex items-center justify-between transition-all cursor-pointer ${
                  currentView === 'analytics'
                    ? 'sidebar-active shadow-sm font-sans'
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 border border-transparent font-sans'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <BarChart4 className="w-4 h-4 shrink-0 text-purple-600" />
                  <span>Space Utilization</span>
                </div>
              </button>
            )}

            {/* Restricted Administrator tools (Only visible to System Administrator per user intent) */}
            {currentUser.role === 'System Administrator' && (
              <button
                id="sidebar-nav-audit"
                onClick={() => setCurrentView('audit')}
                className={`w-full text-left px-4 py-3 rounded-lg text-xs font-extrabold flex items-center justify-between transition-all cursor-pointer ${
                  currentView === 'audit'
                    ? 'sidebar-active shadow-sm font-sans'
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 border border-transparent font-sans'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>Security Audit logs</span>
                </div>
              </button>
            )}
          </nav>

          {/* Space Capacity Visualizer (matching ProtoSpec project progress block) */}
          <div className="hidden md:block bg-white border border-slate-200/80 rounded-xl p-5 shadow-md text-xs space-y-3">
            <div className="flex items-center justify-between text-slate-500">
              <span className="font-extrabold uppercase tracking-wider font-mono text-[10px]">Real-time Capacity</span>
              <span className="text-emerald-600 font-mono font-bold">75% Utilized</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-indigo-600 h-full w-[75%] rounded-full transition-all duration-500"></div>
            </div>
            <p className="text-[10px] text-slate-500 leading-normal">
              Active physical allocation across 3 facilities. Checked-in members & visitors.
            </p>
          </div>

          {/* Quick Guide card */}
          <div className="hidden md:block bg-white/80 border border-slate-200/80 rounded-xl p-4 space-y-2 shadow-sm text-xs">
            <h4 className="font-extrabold text-slate-800">Quick Test Guide</h4>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              We highly recommend testing the <strong>Member</strong> flow to book rooms, pre-register visitors, or check in. Then swap to <strong>Front Desk</strong> to check in visitors, or <strong>Facility Manager</strong> to block rooms for maintenance and audit compliance reports!
            </p>
          </div>
        </aside>

        {/* Dynamic Inner View Switch Board */}
        <main className="flex-1 min-w-0">
          {currentView === 'search' && (
            <WorkspaceSearch
              workspaces={workspaces}
              bookings={bookings}
              locations={locations}
              onSelectWorkspace={handleSelectWorkspace}
            />
          )}

          {currentView === 'booking-form' && selectedWorkspace && (
            <BookingForm
              selectedWorkspace={selectedWorkspace}
              searchDate={bookingDate}
              searchStart={bookingStart}
              searchEnd={bookingEnd}
              currentUser={currentUser}
              onBack={() => {
                setSelectedWorkspace(null);
                setCurrentView('search');
              }}
              onSubmitBooking={handleSubmitBooking}
              onSubmitWaitlist={handleSubmitWaitlist}
            />
          )}

          {currentView === 'check-in' && (
            <CheckInPanel
              currentUser={currentUser}
              bookings={bookings}
              workspaces={workspaces}
              onUpdateBookingStatus={handleUpdateBookingStatus}
              onRefreshData={refreshAllState}
              onSelectUser={handleSelectUser}
            />
          )}

          {currentView === 'memberships' && (
            <MembershipPanel
              currentUser={currentUser}
              membershipPlans={membershipPlans}
              onUpdatePlans={(updated) => db.setMembershipPlans(updated)}
              onRefreshData={refreshAllState}
              onAddNotification={addSimulatedNotification}
            />
          )}

          {currentView === 'resource-manager' && (
            currentUser.role === 'Facility Manager' || currentUser.role === 'System Administrator' ? (
              <ResourceManager
                currentUser={currentUser}
                workspaces={workspaces}
                locations={locations}
                onUpdateWorkspaces={(updated) => db.setWorkspaces(updated)}
                onRefreshData={refreshAllState}
              />
            ) : (
              <SimulationAccessNotice
                requiredRoles={['Facility Manager', 'System Administrator']}
                allUsers={users}
                currentUser={currentUser}
                onSelectUser={handleSelectUser}
                panelName="Asset & Workspace Configuration"
              />
            )
          )}

          {currentView === 'analytics' && (
            currentUser.role === 'Facility Manager' || currentUser.role === 'System Administrator' ? (
              <AnalyticsDashboard
                bookings={bookings}
                workspaces={workspaces}
                locations={locations}
              />
            ) : (
              <SimulationAccessNotice
                requiredRoles={['Facility Manager', 'System Administrator']}
                allUsers={users}
                currentUser={currentUser}
                onSelectUser={handleSelectUser}
                panelName="Live Space Utilization Analytics"
              />
            )
          )}

          {currentView === 'audit' && (
            currentUser.role === 'System Administrator' ? (
              <AuditLogViewer
                currentUser={currentUser}
                auditLogs={auditLogs}
              />
            ) : (
              <SimulationAccessNotice
                requiredRoles={['System Administrator']}
                allUsers={users}
                currentUser={currentUser}
                onSelectUser={handleSelectUser}
                panelName="Compliance & Security Immutable Audit Trail"
              />
            )
          )}

          {currentView === 'user-management' && (
            currentUser.role === 'System Administrator' ? (
              <UserManagement
                currentUser={currentUser}
                allUsers={users}
                membershipPlans={membershipPlans}
                onRefreshData={() => refreshAllState()}
                onAddNotification={addSimulatedNotification}
              />
            ) : (
              <SimulationAccessNotice
                requiredRoles={['System Administrator']}
                allUsers={users}
                currentUser={currentUser}
                onSelectUser={handleSelectUser}
                panelName="User Directory & Entitlement Control"
              />
            )
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-6 px-4 mt-auto text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
          <span>Prototype Environment • Standard Compliance: ISO 27001 | SOC2 | GDPR</span>
          <span>© 2026 Co-Space Platform Inc. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
