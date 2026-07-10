/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { AuditLog, User } from '../types';
import { Search, ShieldCheck, Filter, ArrowUpDown, History, Download, Eye } from 'lucide-react';

interface AuditLogViewerProps {
  currentUser: User;
  auditLogs: AuditLog[];
}

export default function AuditLogViewer({ currentUser, auditLogs }: AuditLogViewerProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedModule, setSelectedModule] = useState<string>('All');
  const [selectedRole, setSelectedRole] = useState<string>('All');

  const isAuthorized = currentUser.role === 'System Administrator' || currentUser.role === 'Facility Manager';

  // Get unique modules and roles for filters
  const uniqueModules = useMemo(() => {
    const mods = new Set<string>();
    auditLogs.forEach((log) => mods.add(log.affectedModule));
    return ['All', ...Array.from(mods)];
  }, [auditLogs]);

  const uniqueRoles = useMemo(() => {
    const roles = new Set<string>();
    auditLogs.forEach((log) => roles.add(log.userRole));
    return ['All', ...Array.from(roles)];
  }, [auditLogs]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      // Search term check
      const query = searchTerm.toLowerCase().trim();
      if (query) {
        const matchesAction = log.action.toLowerCase().includes(query);
        const matchesUser = log.userName.toLowerCase().includes(query);
        const matchesDetails = log.details.toLowerCase().includes(query);
        if (!matchesAction && !matchesUser && !matchesDetails) return false;
      }

      // Module check
      if (selectedModule !== 'All' && log.affectedModule !== selectedModule) return false;

      // Role check
      if (selectedRole !== 'All' && log.userRole !== selectedRole) return false;

      return true;
    });
  }, [auditLogs, searchTerm, selectedModule, selectedRole]);

  // Download raw audit trail
  const handleDownloadLogs = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Timestamp,Action,User,Role,Module,Details,Previous Value,Updated Value\n';

    filteredLogs.forEach((l) => {
      const row = [
        l.timestamp,
        `"${l.action}"`,
        `"${l.userName}"`,
        l.userRole,
        l.affectedModule,
        `"${l.details.replace(/"/g, '""')}"`,
        `"${(l.previousValue || '').replace(/"/g, '""')}"`,
        `"${(l.updatedValue || '').replace(/"/g, '""')}"`,
      ].join(',');
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cowork_audit_trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAuthorized) {
    return (
      <div id="audit-viewer-unauthorized" className="bg-white rounded-xl border border-rose-200 p-8 text-center space-y-4 max-w-lg mx-auto shadow-sm animate-in fade-in">
        <ShieldCheck className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="font-bold text-slate-800 text-lg">Verification Blocked</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          The audit logging vault is immutable and strictly restricted to <strong>System Administrators</strong> and authorized <strong>Facility Managers</strong> for regulatory compliance (NFR-07). Please switch your persona to view the audit records.
        </p>
      </div>
    );
  }

  return (
    <div id="audit-log-view-panel" className="space-y-6 animate-in fade-in duration-200">
      {/* Search / Filter bar */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left Search input */}
        <div className="relative w-full md:max-w-xs">
          <input
            id="audit-search-input"
            type="text"
            placeholder="Search action or operator..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded-lg p-2 pl-8 focus:outline-none focus:border-blue-500 font-sans"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
        </div>

        {/* Filters and export */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Module Selector */}
          <div className="flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" />
            <select
              id="audit-filter-module"
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="text-xs border border-slate-200 rounded p-1.5 bg-white cursor-pointer"
            >
              <option value="All">All Modules</option>
              {uniqueModules.filter(m => m !== 'All').map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Role selector */}
          <select
            id="audit-filter-role"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="text-xs border border-slate-200 rounded p-1.5 bg-white cursor-pointer"
          >
            <option value="All">All Operator Roles</option>
            {uniqueRoles.filter(r => r !== 'All').map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <button
            id="btn-download-audit-trail"
            onClick={handleDownloadLogs}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold cursor-pointer shadow-sm ml-auto md:ml-0"
            title="Download full immutable trail"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Trail</span>
          </button>
        </div>
      </div>

      {/* Compliance / Immutable Warning Panel */}
      <div className="bg-slate-50 border border-slate-250 rounded-xl p-4 flex items-start gap-3 text-slate-700 shadow-sm">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-extrabold uppercase font-mono tracking-wider text-blue-900">
            Immutable Audit Trail Engine Active
          </h4>
          <p className="text-[11px] leading-relaxed text-slate-500 mt-0.5">
            Every creation, modification, override, check-in, and status transition in the co-working space is tracked here automatically. The log records are non-editable, chronological, and structurally frozen for SOC2 / GDPR compliance audits.
          </p>
        </div>
      </div>

      {/* Audit table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-55/40">
          <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
            <History className="w-4 h-4 text-slate-500" />
            <span>Audit Event Log</span>
          </span>
          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
            Filtered Records: {filteredLogs.length} / {auditLogs.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold font-mono uppercase tracking-wider">
                <th className="p-4 w-44">Timestamp</th>
                <th className="p-4">Action & Module</th>
                <th className="p-4">Operator</th>
                <th className="p-4">Details</th>
                <th className="p-4">Values Checked (Prev / Next)</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                return (
                  <tr key={log.id} id={`audit-row-${log.id}`} className="border-b border-slate-100 hover:bg-slate-50/50 last:border-0 font-sans">
                    {/* Timestamp */}
                    <td className="p-4 font-mono text-slate-500 text-[10px] leading-snug">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>

                    {/* Action & Module */}
                    <td className="p-4">
                      <div>
                        <span className="font-bold text-slate-800 text-sm block">{log.action}</span>
                        <span className="text-blue-600 font-semibold text-[10px] block mt-0.5 font-mono">
                          {log.affectedModule}
                        </span>
                      </div>
                    </td>

                    {/* Operator */}
                    <td className="p-4">
                      <div>
                        <span className="font-semibold text-slate-700 block">{log.userName}</span>
                        <span className="text-slate-400 text-[10px] block font-mono">{log.userRole}</span>
                      </div>
                    </td>

                    {/* Details */}
                    <td className="p-4 text-slate-600 max-w-sm font-sans leading-relaxed">
                      {log.details}
                    </td>

                    {/* Previous / Updated */}
                    <td className="p-4">
                      {log.previousValue || log.updatedValue ? (
                        <div className="space-y-1 font-mono text-[9px] max-w-xs overflow-hidden">
                          {log.previousValue && (
                            <div className="bg-rose-50 text-rose-700 border border-rose-100 rounded px-1.5 py-0.5 truncate" title={log.previousValue}>
                              <span className="font-bold uppercase">Prev:</span> {log.previousValue}
                            </div>
                          )}
                          {log.updatedValue && (
                            <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded px-1.5 py-0.5 truncate" title={log.updatedValue}>
                              <span className="font-bold uppercase">Next:</span> {log.updatedValue}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No compliance events match your search/filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
