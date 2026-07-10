/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Workspace, Location, WorkspaceType, WorkspaceStatus } from '../types';
import { db } from '../mockData';
import { PlusCircle, Edit, Trash2, Hammer, CheckCircle, Ban, RefreshCw, Layers, Sliders, Info, ShieldAlert } from 'lucide-react';

interface ResourceManagerProps {
  currentUser: { id: string; name: string; role: string };
  workspaces: Workspace[];
  locations: Location[];
  onUpdateWorkspaces: (workspaces: Workspace[]) => void;
  onRefreshData: () => void;
}

export default function ResourceManager({
  currentUser,
  workspaces,
  locations,
  onUpdateWorkspaces,
  onRefreshData,
}: ResourceManagerProps) {
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Workspace form state
  const [wsName, setWsName] = useState<string>('');
  const [wsType, setWsType] = useState<WorkspaceType>('Hot Desk');
  const [wsCapacity, setWsCapacity] = useState<number>(1);
  const [wsRate, setWsRate] = useState<number>(5);
  const [wsFloor, setWsFloor] = useState<string>('Floor 1');
  const [wsZone, setWsZone] = useState<string>('Main Zone');
  const [wsLocationId, setWsLocationId] = useState<string>('loc-downtown');
  const [wsDescription, setWsDescription] = useState<string>('');
  const [wsAmenities, setWsAmenities] = useState<string>('');

  // Maintenance form state
  const [maintenanceWsId, setMaintenanceWsId] = useState<string | null>(null);
  const [maintenanceReason, setMaintenanceReason] = useState<string>('');

  const isAuthorized = currentUser.role === 'Facility Manager' || currentUser.role === 'System Administrator';

  const handleStartCreate = () => {
    setEditingWorkspace(null);
    setWsName('');
    setWsType('Hot Desk');
    setWsCapacity(2);
    setWsRate(5);
    setWsFloor('Floor 1');
    setWsZone('Main Zone');
    setWsLocationId(locations[0]?.id || '');
    setWsDescription('');
    setWsAmenities('Ergonomic Chair, Power Strips, Wi-Fi');
    setIsCreating(true);
  };

  const handleEditWorkspace = (ws: Workspace) => {
    setEditingWorkspace(ws);
    setWsName(ws.name);
    setWsType(ws.type);
    setWsCapacity(ws.capacity);
    setWsRate(ws.baseHourlyRate);
    setWsFloor(ws.floor);
    setWsZone(ws.zone);
    setWsLocationId(ws.locationId);
    setWsDescription(ws.description);
    setWsAmenities(ws.amenities.join(', '));
    setIsCreating(false);
  };

  const handleSaveWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsName.trim() || !wsDescription.trim()) {
      alert('Workspace Name and Description are required.');
      return;
    }

    const amenitiesArray = wsAmenities
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item !== '');

    const imagesByType: Record<WorkspaceType, string> = {
      'Hot Desk': 'https://images.unsplash.com/photo-1527192491265-7e4e9db1db2d?auto=format&fit=crop&w=600&q=80',
      'Dedicated Desk': 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80',
      'Meeting Room': 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?auto=format&fit=crop&w=600&q=80',
      'Conference Room': 'https://images.unsplash.com/photo-1517502884422-41eaaced0168?auto=format&fit=crop&w=600&q=80',
      'Private Office': 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80',
    };

    if (isCreating) {
      const newWs: Workspace = {
        id: `ws-${Date.now()}`,
        name: wsName,
        type: wsType,
        image: imagesByType[wsType],
        description: wsDescription,
        capacity: wsCapacity,
        amenities: amenitiesArray,
        floor: wsFloor,
        zone: wsZone,
        locationId: wsLocationId,
        baseHourlyRate: wsRate,
        status: 'Available',
      };

      const updated = [...workspaces, newWs];
      onUpdateWorkspaces(updated);

      db.addAuditLog(
        'Workspace Configuration',
        currentUser.id,
        currentUser.name,
        currentUser.role as any,
        `Added new workspace: ${wsName} (${wsType})`,
        'Resource & Availability Management',
        undefined,
        JSON.stringify(newWs)
      );
    } else if (editingWorkspace) {
      const updated = workspaces.map((w) => {
        if (w.id === editingWorkspace.id) {
          const uWs = {
            ...w,
            name: wsName,
            type: wsType,
            description: wsDescription,
            capacity: wsCapacity,
            amenities: amenitiesArray,
            floor: wsFloor,
            zone: wsZone,
            locationId: wsLocationId,
            baseHourlyRate: wsRate,
          };
          return uWs;
        }
        return w;
      });
      onUpdateWorkspaces(updated);

      db.addAuditLog(
        'Workspace Configuration',
        currentUser.id,
        currentUser.name,
        currentUser.role as any,
        `Modified workspace configurations for ID ${editingWorkspace.id}`,
        'Resource & Availability Management',
        JSON.stringify(editingWorkspace),
        JSON.stringify({ name: wsName, type: wsType, capacity: wsCapacity, rate: wsRate })
      );
    }

    setIsCreating(false);
    setEditingWorkspace(null);
    onRefreshData();
  };

  const handleToggleWorkspaceStatus = (wsId: string, currentStatus: WorkspaceStatus) => {
    const nextStatus: WorkspaceStatus = currentStatus === 'Available' ? 'Inactive' : 'Available';
    const updated = workspaces.map((w) => {
      if (w.id === wsId) {
        return {
          ...w,
          status: nextStatus,
        };
      }
      return w;
    });
    onUpdateWorkspaces(updated);

    db.addAuditLog(
      'Workspace Configuration',
      currentUser.id,
      currentUser.name,
      currentUser.role as any,
      `Toggled workspace status for ID ${wsId} to ${nextStatus}`,
      'Resource & Availability Management',
      currentStatus,
      nextStatus
    );
    onRefreshData();
  };

  // Block a resource for maintenance
  const handleBlockWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintenanceWsId || !maintenanceReason.trim()) {
      alert('Workspace selection and maintenance reason are required.');
      return;
    }

    const updated = workspaces.map((w) => {
      if (w.id === maintenanceWsId) {
        return {
          ...w,
          status: 'Maintenance' as WorkspaceStatus,
          maintenanceReason,
          maintenanceStart: new Date().toISOString(),
        };
      }
      return w;
    });
    onUpdateWorkspaces(updated);

    const wsObj = workspaces.find((w) => w.id === maintenanceWsId);
    db.addAuditLog(
      'Resource Blocking',
      currentUser.id,
      currentUser.name,
      currentUser.role as any,
      `Blocked workspace "${wsObj?.name}" for maintenance. Reason: ${maintenanceReason}`,
      'Resource & Availability Management',
      'Available',
      'Maintenance'
    );

    setMaintenanceWsId(null);
    setMaintenanceReason('');
    onRefreshData();
  };

  // Restore from maintenance block
  const handleUnblockWorkspace = (wsId: string) => {
    const updated = workspaces.map((w) => {
      if (w.id === wsId) {
        return {
          ...w,
          status: 'Available' as WorkspaceStatus,
          maintenanceReason: undefined,
          maintenanceStart: undefined,
        };
      }
      return w;
    });
    onUpdateWorkspaces(updated);

    const wsObj = workspaces.find((w) => w.id === wsId);
    db.addAuditLog(
      'Resource Unblocking',
      currentUser.id,
      currentUser.name,
      currentUser.role as any,
      `Restored workspace "${wsObj?.name}" back to Available status`,
      'Resource & Availability Management',
      'Maintenance',
      'Available'
    );
    onRefreshData();
  };

  if (!isAuthorized) {
    return (
      <div id="resource-manager-unauthorized" className="bg-white rounded-xl border border-rose-200 p-8 text-center space-y-4 max-w-lg mx-auto shadow-sm">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="font-bold text-slate-800 text-lg">Access Restrained</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Facility Resource Management is limited to <strong>Facility Managers</strong> and <strong>System Administrators</strong>. Please swap your persona in the top-bar to view or block organizational assets.
        </p>
      </div>
    );
  }

  const activeLocationsMap = locations.reduce<Record<string, string>>((acc, l) => {
    acc[l.id] = l.name;
    return acc;
  }, {});

  return (
    <div id="resource-manager-panel" className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Create/Edit & Block Controls */}
        <div className="lg:col-span-1 space-y-6">
          {/* Quick Block Maintenance Tool */}
          <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold font-mono text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
              <Hammer className="w-4 h-4 text-amber-500" />
              <span>Block Resource (Maintenance)</span>
            </h4>
            <form onSubmit={handleBlockWorkspace} className="space-y-3.5">
              <div className="space-y-1.5">
                <label htmlFor="maintenance-select-ws" className="text-xs font-semibold text-slate-600 block">Workspace</label>
                <select
                  id="maintenance-select-ws"
                  value={maintenanceWsId || ''}
                  onChange={(e) => setMaintenanceWsId(e.target.value || null)}
                  className="w-full text-xs border border-slate-200 rounded p-2 bg-slate-50 focus:outline-none"
                  required
                >
                  <option value="">-- Select Workspace --</option>
                  {workspaces
                    .filter((w) => w.status === 'Available')
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.type})
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="maintenance-reason-text" className="text-xs font-semibold text-slate-600 block">Maintenance Reason</label>
                <textarea
                  id="maintenance-reason-text"
                  rows={2}
                  value={maintenanceReason}
                  onChange={(e) => setMaintenanceReason(e.target.value)}
                  placeholder="e.g., Deep cleaning, AC duct servicing, structural repairs"
                  className="w-full text-xs border border-slate-200 rounded p-2 focus:outline-none focus:border-amber-500"
                  required
                ></textarea>
              </div>

              <button
                id="btn-submit-maintenance-block"
                type="submit"
                className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded transition-colors shadow-sm cursor-pointer"
              >
                Schedule Maintenance Lock
              </button>
            </form>
          </div>

          {/* Guidelines info card */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 space-y-2 text-blue-900">
            <Info className="w-5 h-5 text-blue-600" />
            <h5 className="text-xs font-bold uppercase font-mono tracking-wider">Asset Scheduling Integrity</h5>
            <p className="text-xs leading-relaxed">
              Once a workspace is placed in <strong>Maintenance</strong> or <strong>Inactive</strong> state, it will be automatically hidden from all discovery search views. Scheduled bookings will alert staff during check-in sweep.
            </p>
          </div>
        </div>

        {/* Right Side: Inventory Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800">Resource Inventory Configuration</h3>
                <p className="text-xs text-slate-400 mt-0.5">Manage, edit, and audit workspace assets</p>
              </div>
              <button
                id="btn-manager-add-workspace"
                onClick={handleStartCreate}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold cursor-pointer flex items-center gap-1 shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Configure Workspace</span>
              </button>
            </div>

            <div className="overflow-x-auto font-sans">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold uppercase tracking-wider font-mono">
                    <th className="p-4">Workspace Details</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Capacity & Rate</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workspaces.map((ws) => {
                    const isMaint = ws.status === 'Maintenance';
                    const isAvailable = ws.status === 'Available';

                    return (
                      <tr key={ws.id} id={`ws-row-${ws.id}`} className="border-b border-slate-100 hover:bg-slate-50/50 last:border-0">
                        <td className="p-4">
                          <div>
                            <span className="font-bold text-slate-800 block text-sm">{ws.name}</span>
                            <span className="text-slate-400 text-[10px] font-mono leading-tight block mt-0.5">
                              {activeLocationsMap[ws.locationId] || 'Unknown'} | {ws.floor} • {ws.zone}
                            </span>
                          </div>
                        </td>

                        <td className="p-4">
                          <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded font-mono uppercase border border-slate-200">
                            {ws.type}
                          </span>
                        </td>

                        <td className="p-4">
                          <div className="space-y-0.5">
                            <span className="font-semibold text-slate-700 block font-mono">Cap: {ws.capacity} pax</span>
                            <span className="text-blue-600 block text-[10px] font-bold font-mono">
                              ${ws.baseHourlyRate}/hr
                            </span>
                          </div>
                        </td>

                        <td className="p-4 text-center">
                          <div className="inline-flex flex-col items-center gap-0.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                isAvailable
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : isMaint
                                  ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                            >
                              {ws.status}
                            </span>
                            {isMaint && (
                              <span className="text-[8px] text-amber-600 italic max-w-[120px] truncate" title={ws.maintenanceReason}>
                                {ws.maintenanceReason}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isMaint ? (
                              <button
                                id={`btn-unblock-ws-${ws.id}`}
                                onClick={() => handleUnblockWorkspace(ws.id)}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                                title="Restore to Available"
                              >
                                <CheckCircle className="w-3 h-3" />
                                <span>Complete Servicing</span>
                              </button>
                            ) : (
                              <button
                                id={`btn-edit-ws-${ws.id}`}
                                onClick={() => handleEditWorkspace(ws)}
                                className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-50 border border-slate-200 rounded cursor-pointer"
                                title="Edit Configuration"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              id={`btn-disable-ws-${ws.id}`}
                              onClick={() => handleToggleWorkspaceStatus(ws.id, ws.status)}
                              className={`px-2 py-1 border rounded text-[10px] font-bold cursor-pointer ${
                                isAvailable
                                  ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                                  : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                              }`}
                              disabled={isMaint}
                            >
                              {isAvailable ? 'Archive' : 'Restore'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Config form overlay */}
          {(isCreating || editingWorkspace) && (
            <div id="ws-config-form" className="bg-white border border-slate-200 rounded-xl p-5 shadow-md">
              <h3 className="font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-blue-500" />
                <span>{isCreating ? 'Configure Workspace Asset' : `Edit Configuration: ${editingWorkspace?.name}`}</span>
              </h3>

              <form onSubmit={handleSaveWorkspace} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="ws-form-name" className="text-xs font-semibold text-slate-600">Workspace Name</label>
                    <input
                      id="ws-form-name"
                      type="text"
                      value={wsName}
                      onChange={(e) => setWsName(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded p-2 focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="ws-form-type" className="text-xs font-semibold text-slate-600">Category Type</label>
                    <select
                      id="ws-form-type"
                      value={wsType}
                      onChange={(e) => setWsType(e.target.value as WorkspaceType)}
                      className="w-full text-xs border border-slate-200 rounded p-2 focus:outline-none"
                    >
                      <option value="Hot Desk">Hot Desk</option>
                      <option value="Dedicated Desk">Dedicated Desk</option>
                      <option value="Meeting Room">Meeting Room</option>
                      <option value="Conference Room">Conference Room</option>
                      <option value="Private Office">Private Office</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="ws-form-location" className="text-xs font-semibold text-slate-600">Host Location</label>
                    <select
                      id="ws-form-location"
                      value={wsLocationId}
                      onChange={(e) => setWsLocationId(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded p-2 focus:outline-none"
                    >
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="ws-form-capacity" className="text-xs font-semibold text-slate-600">Capacity (pax)</label>
                    <input
                      id="ws-form-capacity"
                      type="number"
                      min="1"
                      value={wsCapacity}
                      onChange={(e) => setWsCapacity(parseInt(e.target.value) || 1)}
                      className="w-full text-xs border border-slate-200 rounded p-2 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="ws-form-rate" className="text-xs font-semibold text-slate-600">Hourly Rate ($)</label>
                    <input
                      id="ws-form-rate"
                      type="number"
                      min="1"
                      value={wsRate}
                      onChange={(e) => setWsRate(parseInt(e.target.value) || 1)}
                      className="w-full text-xs border border-slate-200 rounded p-2 focus:outline-none font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="ws-form-floor" className="text-xs font-semibold text-slate-600">Floor Level</label>
                    <input
                      id="ws-form-floor"
                      type="text"
                      value={wsFloor}
                      onChange={(e) => setWsFloor(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded p-2 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="ws-form-zone" className="text-xs font-semibold text-slate-600">Zone / Section</label>
                    <input
                      id="ws-form-zone"
                      type="text"
                      value={wsZone}
                      onChange={(e) => setWsZone(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded p-2 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="ws-form-desc" className="text-xs font-semibold text-slate-600">Description</label>
                  <textarea
                    id="ws-form-desc"
                    rows={2}
                    value={wsDescription}
                    onChange={(e) => setWsDescription(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded p-2 focus:outline-none"
                    required
                  ></textarea>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="ws-form-amenities" className="text-xs font-semibold text-slate-600">Amenities Checklist (Comma-separated)</label>
                  <input
                    id="ws-form-amenities"
                    type="text"
                    value={wsAmenities}
                    onChange={(e) => setWsAmenities(e.target.value)}
                    placeholder="e.g. High-speed Wi-Fi, Whiteboard, Video Call Kit, Polycom phone"
                    className="w-full text-xs border border-slate-200 rounded p-2 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    id="btn-cancel-ws-form"
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setEditingWorkspace(null);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    id="btn-save-ws-form"
                    type="submit"
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded shadow cursor-pointer"
                  >
                    Save Workspace Configuration
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
