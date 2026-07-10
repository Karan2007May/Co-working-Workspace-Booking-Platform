/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { User, UserRole } from '../types';
import { Shield, User as UserIcon, UserCheck, Settings, HelpCircle, RefreshCw } from 'lucide-react';

interface RoleSelectorProps {
  currentUser: User;
  allUsers: User[];
  onSelectUser: (user: User) => void;
  onResetDb: () => void;
}

export default function RoleSelector({ currentUser, allUsers, onSelectUser, onResetDb }: RoleSelectorProps) {
  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'System Administrator':
        return <Shield className="w-4 h-4 text-rose-500" />;
      case 'Facility Manager':
        return <Settings className="w-4 h-4 text-amber-500" />;
      case 'Front Desk Staff':
        return <UserCheck className="w-4 h-4 text-emerald-500" />;
      case 'Member':
        return <UserIcon className="w-4 h-4 text-indigo-500" />;
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

  return (
    <div id="role-selector-bar" className="bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 text-slate-800 py-3.5 px-4 shadow-md border-b border-slate-200 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-pink-500 to-purple-500"></div>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 relative z-10">
        {/* Active Session Info */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-sm">
            {getRoleIcon(currentUser.role)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-mono tracking-wider uppercase font-extrabold">Active Persona</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border font-mono ${getRoleColorClass(currentUser.role)}`}>
                {currentUser.role}
              </span>
            </div>
            <div className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
              {currentUser.name} <span className="text-xs text-slate-500 font-normal">({currentUser.email})</span>
            </div>
          </div>
        </div>

        {/* Quick Role Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 font-bold mr-1 hidden lg:inline">Test other personas:</span>
          <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            {allUsers.map((u) => {
              const isActive = u.id === currentUser.id;
              return (
                <button
                  key={u.id}
                  id={`btn-select-persona-${u.id}`}
                  onClick={() => onSelectUser(u)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-pink-600 text-white shadow-md scale-105 border border-transparent'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200 border border-transparent'
                  }`}
                >
                  {u.name.split(' ')[0]} ({u.role.split(' ')[0]})
                </button>
              );
            })}
          </div>

          {/* Reset Database Button */}
          <button
            id="btn-reset-prototype-db"
            onClick={() => {
              if (confirm('Are you sure you want to reset all bookings, workspaces, and logs to the original seeded state?')) {
                onResetDb();
              }
            }}
            className="ml-2 flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-rose-600 text-xs font-mono rounded-lg transition-colors cursor-pointer"
            title="Reset storage to default seed data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Prototype DB
          </button>
        </div>
      </div>
    </div>
  );
}
