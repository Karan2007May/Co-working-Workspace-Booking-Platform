import React from 'react';
import { ShieldAlert, Users, RefreshCw } from 'lucide-react';
import { User, UserRole } from '../types';

interface SimulationAccessNoticeProps {
  requiredRoles: UserRole[];
  allUsers: User[];
  currentUser: User;
  onSelectUser: (user: User) => void;
  panelName: string;
}

export default function SimulationAccessNotice({
  requiredRoles,
  allUsers,
  currentUser,
  onSelectUser,
  panelName,
}: SimulationAccessNoticeProps) {
  // Find a user who has one of the required roles
  const eligibleUsers = allUsers.filter((u) => requiredRoles.includes(u.role));

  return (
    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-8 text-center text-white max-w-2xl mx-auto shadow-2xl relative overflow-hidden my-6">
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl"></div>
      <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-pink-500/10 rounded-full blur-3xl"></div>
      
      <div className="flex flex-col items-center space-y-4 relative z-10">
        <div className="p-4 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-500 text-white animate-bounce shadow-lg">
          <ShieldAlert className="w-8 h-8" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-2xl font-black tracking-tight font-sans bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-rose-300 to-indigo-300">
            {panelName} Gated Flow
          </h3>
          <p className="text-slate-300 text-xs max-w-md mx-auto leading-relaxed">
            You are currently simulating as <strong className="text-white font-semibold">{currentUser.name}</strong> ({currentUser.role}). 
            This advanced control suite is restricted to users with <span className="text-amber-400 font-bold">{requiredRoles.join(' or ')}</span> rights.
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5 w-full max-w-md space-y-4">
          <div className="flex items-center justify-between text-left border-b border-white/5 pb-2">
            <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-400" /> Authorized Simulation Identities
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {eligibleUsers.map((user) => (
              <button
                key={user.id}
                id={`btn-notice-switch-${user.id}`}
                onClick={() => onSelectUser(user)}
                className="flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-gradient-to-r hover:from-indigo-600 hover:to-pink-600 border border-white/10 hover:border-transparent rounded-lg text-xs font-bold transition-all text-white hover:scale-[1.02] cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  <div className="text-left">
                    <div className="font-sans font-bold group-hover:text-white">{user.name}</div>
                    <div className="text-[10px] text-slate-400 group-hover:text-white/80">{user.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-white/10 group-hover:bg-white/20 px-2 py-1 rounded text-[10px] tracking-wide font-mono">
                  <RefreshCw className="w-3 h-3 group-hover:animate-spin" />
                  <span>Switch Role</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="text-[10px] text-indigo-300/80 font-mono">
          Security Integrity Protocol: ISO 27001 Access Control Standard Compliance
        </div>
      </div>
    </div>
  );
}
