/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { User, UserRole, MembershipPlan } from '../types';
import { db } from '../mockData';
import { 
  Users, UserPlus, Edit2, Shield, Settings, UserCheck, HelpCircle, 
  Coins, CheckCircle, XCircle, Search, Mail, Plus, Check, Trash2, ShieldAlert
} from 'lucide-react';

interface UserManagementProps {
  currentUser: User;
  allUsers: User[];
  membershipPlans: MembershipPlan[];
  onRefreshData: () => void;
  onAddNotification?: (title: string, body: string, type: 'email' | 'system' | 'waitlist') => void;
}

export default function UserManagement({
  currentUser,
  allUsers,
  membershipPlans,
  onRefreshData,
  onAddNotification,
}: UserManagementProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Editing state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editRole, setEditRole] = useState<UserRole>('Member');
  const [editStatus, setEditStatus] = useState<'Active' | 'Inactive' | 'Pending'>('Active');
  const [editCredits, setEditCredits] = useState<number>(0);
  const [editMembership, setEditMembership] = useState<string>('none');

  // Registering state
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [regName, setRegName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regRole, setRegRole] = useState<UserRole>('Member');
  const [regCredits, setRegCredits] = useState<number>(50);
  const [regMembership, setRegMembership] = useState<string>('none');

  // Credit adjustment overlay state
  const [adjustingUser, setAdjustingUser] = useState<User | null>(null);
  const [creditAdjustmentAmount, setCreditAdjustmentAmount] = useState<number>(10);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'System Administrator':
        return <Shield className="w-4 h-4 text-rose-600" />;
      case 'Facility Manager':
        return <Settings className="w-4 h-4 text-amber-600" />;
      case 'Front Desk Staff':
        return <UserCheck className="w-4 h-4 text-emerald-600" />;
      case 'Member':
        return <Users className="w-4 h-4 text-indigo-600" />;
      case 'Visitor':
        return <HelpCircle className="w-4 h-4 text-slate-500" />;
    }
  };

  const getRoleColorClass = (role: UserRole) => {
    switch (role) {
      case 'System Administrator':
        return 'border-rose-200 bg-rose-50 text-rose-700';
      case 'Facility Manager':
        return 'border-amber-200 bg-amber-50 text-amber-700';
      case 'Front Desk Staff':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 'Member':
        return 'border-indigo-200 bg-indigo-50 text-indigo-700';
      case 'Visitor':
        return 'border-slate-200 bg-slate-50 text-slate-700';
    }
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    return allUsers.filter((u) => {
      const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            u.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'All' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'All' || u.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [allUsers, searchTerm, roleFilter, statusFilter]);

  // Handle Edit User Submit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!editName.trim() || !editEmail.trim()) {
      alert('Name and Email are required.');
      return;
    }

    if (editRole === 'Member' && editMembership === 'none') {
      alert('Pay-as-you-go (None) is only for Visitors. Members must select an active subscription plan.');
      return;
    }
    if (editRole === 'Visitor' && editMembership !== 'none') {
      alert('Pay-as-you-go is only for Visitors. If a Visitor has a subscription plan, please change their Security Role to Member first.');
      return;
    }

    const previousValue = JSON.stringify(editingUser);
    const updatedUsers = allUsers.map((u) => {
      if (u.id === editingUser.id) {
        const updated: User = {
          ...u,
          name: editName,
          email: editEmail,
          role: editRole,
          status: editStatus,
          remainingCredits: editCredits,
          membershipPlanId: editMembership === 'none' ? undefined : editMembership,
        };
        return updated;
      }
      return u;
    });

    db.setUsers(updatedUsers);

    // Logging Security Audit
    const changedFields: string[] = [];
    if (editingUser.name !== editName) changedFields.push(`name to "${editName}"`);
    if (editingUser.email !== editEmail) changedFields.push(`email to "${editEmail}"`);
    if (editingUser.role !== editRole) changedFields.push(`role to "${editRole}"`);
    if (editingUser.status !== editStatus) changedFields.push(`status to "${editStatus}"`);
    if (editingUser.remainingCredits !== editCredits) changedFields.push(`credits to "${editCredits}"`);
    if (editingUser.membershipPlanId !== (editMembership === 'none' ? undefined : editMembership)) changedFields.push(`plan to "${editMembership}"`);

    db.addAuditLog(
      'Update User Profile',
      currentUser.id,
      currentUser.name,
      currentUser.role,
      `Modified attributes of user ${editName} (${editingUser.id}): ${changedFields.join(', ') || 'no changes'}.`,
      'User Management',
      previousValue,
      JSON.stringify(updatedUsers.find(u => u.id === editingUser.id))
    );

    if (onAddNotification) {
      onAddNotification(
        'Account Updated',
        `Your account profile has been modified by the System Administrator.`,
        'system'
      );
    }

    setEditingUser(null);
    onRefreshData();
  };

  // Handle User Registration
  const handleRegisterUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim()) {
      alert('Full Name and Email Address are required.');
      return;
    }

    if (regRole === 'Member' && regMembership === 'none') {
      alert('Pay-as-you-go (None) is only for Visitors. Members must select an active subscription plan.');
      return;
    }
    if (regRole === 'Visitor' && regMembership !== 'none') {
      alert('Pay-as-you-go is only for Visitors. If a Visitor has a subscription plan, please change their Security Role to Member first.');
      return;
    }

    const newUserId = `usr-${Date.now().toString().slice(-6)}`;
    const newUser: User = {
      id: newUserId,
      name: regName,
      email: regEmail,
      role: regRole,
      status: 'Active',
      remainingCredits: regCredits,
      membershipPlanId: regMembership === 'none' ? undefined : regMembership,
      joinDate: new Date().toISOString().split('T')[0],
    };

    db.setUsers([...allUsers, newUser]);

    // Audit compliance log
    db.addAuditLog(
      'Register User',
      currentUser.id,
      currentUser.name,
      currentUser.role,
      `Registered new user account: ${regName} as a ${regRole} with ${regCredits} credits.`,
      'User Management',
      undefined,
      JSON.stringify(newUser)
    );

    if (onAddNotification) {
      onAddNotification(
        'Welcome to Co-Space!',
        `A new account has been created for ${regName} (${regRole}). Let the work begin.`,
        'email'
      );
    }

    // Reset fields
    setRegName('');
    setRegEmail('');
    setRegRole('Member');
    setRegCredits(50);
    setRegMembership('none');
    setIsRegistering(false);
    onRefreshData();
  };

  // Adjust Credits inline tool
  const handleApplyCreditAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingUser) return;

    const previousValue = JSON.stringify(adjustingUser);
    const change = adjustmentType === 'add' ? creditAdjustmentAmount : -creditAdjustmentAmount;
    
    const updatedUsers = allUsers.map((u) => {
      if (u.id === adjustingUser.id) {
        return {
          ...u,
          remainingCredits: Math.max(0, u.remainingCredits + change),
        };
      }
      return u;
    });

    db.setUsers(updatedUsers);

    db.addAuditLog(
      'Credit Adjustment',
      currentUser.id,
      currentUser.name,
      currentUser.role,
      `Adjusted ${adjustingUser.name}'s credits by ${change > 0 ? '+' : ''}${change} credits.`,
      'User Management',
      previousValue,
      JSON.stringify(updatedUsers.find(u => u.id === adjustingUser.id))
    );

    if (onAddNotification) {
      onAddNotification(
        'Credit Balance Updated',
        `Your booking credit balance was adjusted by the System Administrator. New balance is ${Math.max(0, adjustingUser.remainingCredits + change)} credits.`,
        'system'
      );
    }

    setAdjustingUser(null);
    onRefreshData();
  };

  // Remove user completely from prototype session
  const handleDeleteUser = (user: User) => {
    if (user.id === currentUser.id) {
      alert('For security compliance, you are forbidden from deleting your own active Administrator session.');
      return;
    }

    if (user.role === 'System Administrator') {
      alert('For security compliance, you cannot delete a System Administrator account.');
      return;
    }

    if (confirm(`Are you absolutely sure you want to permanently delete the user ${user.name} and clear all records?`)) {
      const updatedUsers = allUsers.filter((u) => u.id !== user.id);
      db.setUsers(updatedUsers);

      db.addAuditLog(
        'Delete User Account',
        currentUser.id,
        currentUser.name,
        currentUser.role,
        `Permanently removed user account: ${user.name} (${user.id}).`,
        'User Management',
        JSON.stringify(user)
      );

      onRefreshData();
    }
  };

  return (
    <div id="user-management-module" className="space-y-6">
      {/* Title Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm relative overflow-hidden text-slate-800">
        <div className="absolute right-6 top-6 opacity-[0.03]">
          <Users className="w-24 h-24 text-slate-900" />
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
              Control Panel
            </span>
            <h2 className="text-xl font-extrabold font-sans text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 via-pink-600 to-blue-600">
              User Directory & Entitlement Control
            </h2>
            <p className="text-slate-650 text-xs max-w-xl font-medium">
              Monitor organizational members, change access scopes, adjust reservation credits, and register new guest personas on-the-fly.
            </p>
          </div>

          <button
            id="btn-register-user-modal"
            onClick={() => {
              setIsRegistering(true);
              setEditingUser(null);
              setAdjustingUser(null);
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-extrabold text-xs rounded-lg shadow-md hover:shadow-lg transition-all hover:scale-105 flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register New Persona</span>
          </button>
        </div>
      </div>

      {/* Grid of Main Filters & Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column Forms Overlay: Editing or Add User */}
        <div className="lg:col-span-1 space-y-6">
          {isRegistering && (
            <div id="register-user-card" className="bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-extrabold text-slate-800 text-sm">Create New Account</h3>
                </div>
                <button 
                  onClick={() => setIsRegistering(false)} 
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                  title="Close Form"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleRegisterUser} className="space-y-3.5">
                <div className="space-y-1">
                  <label htmlFor="reg-name" className="text-[11px] font-bold text-slate-500 block">Full Name</label>
                  <input
                    id="reg-name"
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Liam Neeson"
                    className="w-full text-xs border border-slate-200 rounded p-2.5 bg-white text-slate-800 focus:outline-none focus:border-indigo-500 font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="reg-email" className="text-[11px] font-bold text-slate-500 block">Email Address</label>
                  <input
                    id="reg-email"
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="e.g. liam@example.com"
                    className="w-full text-xs border border-slate-200 rounded p-2.5 bg-white text-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="reg-role" className="text-[11px] font-bold text-slate-500 block">Security Role</label>
                    <select
                      id="reg-role"
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value as UserRole)}
                      className="w-full text-xs border border-slate-200 rounded p-2 bg-white text-slate-800 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Visitor">Visitor</option>
                      <option value="Member">Member</option>
                      <option value="Front Desk Staff">Front Desk Staff</option>
                      <option value="Facility Manager">Facility Manager</option>
                      <option value="System Administrator">System Administrator</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="reg-credits" className="text-[11px] font-bold text-slate-500 block">Initial Credits</label>
                    <input
                      id="reg-credits"
                      type="number"
                      min="0"
                      max="10000"
                      value={regCredits}
                      onChange={(e) => setRegCredits(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full text-xs border border-slate-200 rounded p-2 bg-white text-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="reg-membership" className="text-[11px] font-bold text-slate-500 block">Associated Subscription Plan</label>
                  <select
                    id="reg-membership"
                    value={regMembership}
                    onChange={(e) => setRegMembership(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded p-2 bg-white text-slate-800 focus:outline-none"
                  >
                    <option value="none">None (Individual Pay-as-you-go)</option>
                    {membershipPlans.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} (${p.price}/mo)</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsRegistering(false)}
                    className="flex-1 px-3 py-2 bg-white hover:bg-slate-50 text-slate-600 rounded text-xs font-bold cursor-pointer border border-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold cursor-pointer shadow"
                  >
                    Confirm Register
                  </button>
                </div>
              </form>
            </div>
          )}

          {editingUser && (
            <div id="edit-user-card" className="bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-extrabold text-slate-800 text-sm">Edit User Persona</h3>
                </div>
                <button 
                  onClick={() => setEditingUser(null)} 
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                  title="Close Form"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-3.5">
                <div className="space-y-1">
                  <label htmlFor="edit-name" className="text-[11px] font-bold text-slate-500 block">Full Name</label>
                  <input
                    id="edit-name"
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded p-2.5 bg-white text-slate-800 focus:outline-none focus:border-indigo-500 font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="edit-email" className="text-[11px] font-bold text-slate-500 block">Email Address</label>
                  <input
                    id="edit-email"
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded p-2.5 bg-white text-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="edit-role" className="text-[11px] font-bold text-slate-500 block">Security Role</label>
                    <select
                      id="edit-role"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as UserRole)}
                      className="w-full text-xs border border-slate-200 rounded p-2 bg-white text-slate-800 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Visitor">Visitor</option>
                      <option value="Member">Member</option>
                      <option value="Front Desk Staff">Front Desk Staff</option>
                      <option value="Facility Manager">Facility Manager</option>
                      <option value="System Administrator">System Administrator</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="edit-status" className="text-[11px] font-bold text-slate-500 block">Account Status</label>
                    <select
                      id="edit-status"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as 'Active' | 'Inactive' | 'Pending')}
                      className="w-full text-xs border border-slate-200 rounded p-2 bg-white text-slate-800 focus:outline-none"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="edit-credits" className="text-[11px] font-bold text-slate-500 block">Credit Balance</label>
                    <input
                      id="edit-credits"
                      type="number"
                      min="0"
                      value={editCredits}
                      onChange={(e) => setEditCredits(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full text-xs border border-slate-200 rounded p-2 bg-white text-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="edit-membership" className="text-[11px] font-bold text-slate-500 block">Subscription Plan</label>
                    <select
                      id="edit-membership"
                      value={editMembership}
                      onChange={(e) => setEditMembership(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded p-2 bg-white text-slate-800 focus:outline-none"
                    >
                      <option value="none">None</option>
                      {membershipPlans.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="flex-1 px-3 py-2 bg-white hover:bg-slate-50 text-slate-600 rounded text-xs font-bold cursor-pointer border border-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold cursor-pointer shadow"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {adjustingUser && (
            <div id="adjust-credits-card" className="bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-500" />
                  <h3 className="font-extrabold text-slate-800 text-sm">Adjust Credits Balance</h3>
                </div>
                <button 
                  onClick={() => setAdjustingUser(null)} 
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                  title="Close Form"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-150 rounded-lg text-xs font-sans text-slate-600 leading-normal">
                Adjusting credits for <strong className="text-slate-800">{adjustingUser.name}</strong>. Current balance is <strong className="text-amber-600 font-mono">{adjustingUser.remainingCredits} credits</strong>.
              </div>

              <form onSubmit={handleApplyCreditAdjustment} className="space-y-4">
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 block">Adjustment Direction</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustmentType('add')}
                      className={`py-2 text-xs font-bold rounded cursor-pointer transition-colors ${
                        adjustmentType === 'add'
                          ? 'bg-emerald-600 border border-emerald-500 text-white font-extrabold'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold'
                      }`}
                    >
                      Add Credits (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustmentType('subtract')}
                      className={`py-2 text-xs font-bold rounded cursor-pointer transition-colors ${
                        adjustmentType === 'subtract'
                          ? 'bg-rose-600 border border-rose-500 text-white font-extrabold'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold'
                      }`}
                    >
                      Subtract Credits (-)
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="adjust-amount" className="text-[11px] font-bold text-slate-500 block">Transaction Value (Credits)</label>
                  <input
                    id="adjust-amount"
                    type="number"
                    required
                    min="1"
                    max="5000"
                    value={creditAdjustmentAmount}
                    onChange={(e) => setCreditAdjustmentAmount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-xs border border-slate-200 rounded p-2.5 bg-white text-slate-800 focus:outline-none focus:border-yellow-500 font-mono"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAdjustingUser(null)}
                    className="flex-1 px-3 py-2 bg-white hover:bg-slate-50 text-slate-600 rounded text-xs font-bold cursor-pointer border border-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-slate-950 rounded text-xs font-bold cursor-pointer shadow"
                  >
                    Apply Adjustment
                  </button>
                </div>
              </form>
            </div>
          )}

          {!isRegistering && !editingUser && !adjustingUser && (
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 text-center space-y-3 font-sans text-xs">
              <ShieldAlert className="w-8 h-8 text-indigo-500/50 mx-auto" />
              <h4 className="font-bold text-slate-700">Administrative Tools Quick Start</h4>
              <p className="text-slate-500 leading-relaxed max-w-sm mx-auto">
                Select a user row from the directory layout to edit profile states, or click <strong>Register New Persona</strong> to add immediate testing accounts. All security modifications are logged in compliance records.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: User directory listings */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
            
            {/* Header Filters */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row gap-3 items-center justify-between">
              
              {/* Searching */}
              <div className="relative w-full md:w-72">
                <input
                  id="user-search-input"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, email..."
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 pl-8.5 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-sans font-bold"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3.5" />
              </div>

              {/* Filtering */}
              <div className="flex w-full md:w-auto items-center gap-2">
                <select
                  id="user-role-filter"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg p-2 bg-white text-slate-700 cursor-pointer focus:outline-none w-1/2 md:w-auto font-bold"
                >
                  <option value="All">All Roles</option>
                  <option value="System Administrator">Administrators</option>
                  <option value="Facility Manager">Managers</option>
                  <option value="Front Desk Staff">Receptionists</option>
                  <option value="Member">Members</option>
                  <option value="Visitor">Visitors</option>
                </select>

                <select
                  id="user-status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg p-2 bg-white text-slate-700 cursor-pointer focus:outline-none w-1/2 md:w-auto font-bold"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

            </div>

            {/* List Table */}
            <div className="divide-y divide-slate-100 bg-white overflow-x-auto">
              {filteredUsers.map((u) => {
                const planName = membershipPlans.find(p => p.id === u.membershipPlanId)?.name || 'Pay-as-you-go';
                const isActive = u.status === 'Active';
                const isCurrent = u.id === currentUser.id;

                return (
                  <div 
                    key={u.id} 
                    id={`user-row-${u.id}`} 
                    className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors ${
                      isCurrent ? 'bg-indigo-50/40 border-l-2 border-indigo-600' : ''
                    }`}
                  >
                    
                    {/* User profile details */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-100 to-indigo-50 border border-slate-200 flex items-center justify-center font-extrabold text-xs text-indigo-700 shrink-0 font-sans">
                        {u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-extrabold text-slate-800 text-xs truncate max-w-[150px]">{u.name}</h4>
                          {isCurrent && (
                            <span className="text-[8px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded uppercase font-mono tracking-wide border border-indigo-200">
                              Current Session
                            </span>
                          )}
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border font-mono tracking-wider ${getRoleColorClass(u.role)}`}>
                            {u.role}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate font-mono">{u.email}</p>
                      </div>
                    </div>

                    {/* Subscription & credits status */}
                    <div className="grid grid-cols-2 gap-4 md:flex md:items-center md:gap-6 text-xs md:text-right font-sans">
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-slate-400 block uppercase font-mono tracking-wider leading-none font-bold">Subscription</span>
                        <span className="font-bold text-slate-700">{planName}</span>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[9px] text-slate-400 block uppercase font-mono tracking-wider leading-none font-bold">Credits Balance</span>
                        <div className="flex items-center md:justify-end gap-1 font-mono text-amber-600 font-bold">
                          <span>{u.remainingCredits} Cr</span>
                          <button
                            id={`btn-adjust-credits-${u.id}`}
                            onClick={() => {
                              setAdjustingUser(u);
                              setEditingUser(null);
                              setIsRegistering(false);
                            }}
                            className="p-1 hover:text-amber-850 hover:bg-slate-100 rounded cursor-pointer"
                            title="Adjust credits balance"
                          >
                            <Coins className="w-3 h-3 text-amber-500" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[9px] text-slate-400 block uppercase font-mono tracking-wider leading-none font-bold">Status</span>
                        <span className={`inline-flex items-center gap-1 font-bold text-[10px] ${
                          isActive ? 'text-emerald-600' : u.status === 'Pending' ? 'text-amber-600' : 'text-slate-400'
                        }`}>
                          {isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3 text-slate-400" />}
                          <span>{u.status}</span>
                        </span>
                      </div>
                    </div>

                    {/* Actions tools buttons */}
                    <div className="flex items-center gap-1.5 border-t border-slate-100 md:border-0 pt-2 md:pt-0 shrink-0 md:justify-end justify-between">
                      <div className="flex gap-1">
                        <button
                          id={`btn-edit-user-${u.id}`}
                          onClick={() => {
                            setEditingUser(u);
                            setEditName(u.name);
                            setEditEmail(u.email);
                            setEditRole(u.role);
                            setEditStatus(u.status);
                            setEditCredits(u.remainingCredits);
                            setEditMembership(u.membershipPlanId || 'none');
                            setIsRegistering(false);
                            setAdjustingUser(null);
                          }}
                          className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-indigo-600 rounded border border-slate-200 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                          title="Edit Profile details"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span className="hidden sm:inline">Modify</span>
                        </button>

                        <button
                          id={`btn-delete-user-${u.id}`}
                          onClick={() => handleDeleteUser(u)}
                          disabled={isCurrent || u.role === 'System Administrator'}
                          className="p-1.5 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded cursor-pointer transition-colors disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-slate-400"
                          title="Delete Account Persona"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}

              {filteredUsers.length === 0 && (
                <div id="no-users-found-state" className="py-12 text-center text-xs text-slate-400 space-y-2">
                  <HelpCircle className="w-8 h-8 text-slate-300 mx-auto" />
                  <p>No active directory user records matched the criteria.</p>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
