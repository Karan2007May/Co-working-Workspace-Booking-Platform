/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Booking, Workspace, Location, WorkspaceType } from '../types';
import { FileSpreadsheet, MapPin, SlidersHorizontal, BarChart4, TrendingUp, Users, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface AnalyticsDashboardProps {
  bookings: Booking[];
  workspaces: Workspace[];
  locations: Location[];
}

export default function AnalyticsDashboard({ bookings, workspaces, locations }: AnalyticsDashboardProps) {
  // Filters
  const [filterLocation, setFilterLocation] = useState<string>('All');
  const [filterType, setFilterType] = useState<string>('All');

  // Compute KPI metrics based on filtered bookings and workspaces
  const filteredWorkspaces = useMemo(() => {
    return workspaces.filter((w) => {
      if (filterLocation !== 'All' && w.locationId !== filterLocation) return false;
      if (filterType !== 'All' && w.type !== filterType) return false;
      return true;
    });
  }, [workspaces, filterLocation, filterType]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const ws = workspaces.find((w) => w.id === b.workspaceId);
      if (!ws) return false;
      if (filterLocation !== 'All' && ws.locationId !== filterLocation) return false;
      if (filterType !== 'All' && ws.type !== filterType) return false;
      return true;
    });
  }, [bookings, workspaces, filterLocation, filterType]);

  // Calculations
  const metrics = useMemo(() => {
    const totalWs = filteredWorkspaces.length;
    const occupiedWs = filteredWorkspaces.filter((w) => {
      // Is it currently checked-in today?
      return bookings.some(
        (b) => b.workspaceId === w.id && b.status === 'Checked-in' && b.date === '2026-07-09'
      );
    }).length;

    const maintenanceWs = filteredWorkspaces.filter((w) => w.status === 'Maintenance').length;
    const availableWs = totalWs - occupiedWs - maintenanceWs;

    // Today's Bookings
    const todayBookings = filteredBookings.filter((b) => b.date === '2026-07-09');
    const totalTodayCount = todayBookings.length;

    // No show counts
    const totalNoShows = filteredBookings.filter((b) => b.status === 'No-show').length;
    const totalCancellations = filteredBookings.filter((b) => b.status === 'Cancelled').length;
    const totalConcluded = filteredBookings.filter(
      (b) => b.status === 'Completed' || b.status === 'Checked-in' || b.status === 'No-show'
    ).length;

    const noShowRate = totalConcluded > 0 ? Math.round((totalNoShows / totalConcluded) * 100) : 0;
    const cancellationRate = filteredBookings.length > 0 ? Math.round((totalCancellations / filteredBookings.length) * 100) : 0;

    // Utilization
    const utilizationRate = totalWs > 0 ? Math.round((occupiedWs / totalWs) * 100) : 0;

    return {
      totalWs,
      occupiedWs,
      availableWs,
      maintenanceWs,
      totalTodayCount,
      noShowRate,
      cancellationRate,
      utilizationRate,
    };
  }, [filteredWorkspaces, filteredBookings, bookings]);

  // Data for Utilization by Workspace Type
  const utilizationByTypeData = useMemo(() => {
    const types: WorkspaceType[] = ['Hot Desk', 'Dedicated Desk', 'Meeting Room', 'Conference Room', 'Private Office'];
    return types.map((type) => {
      const typeWs = filteredWorkspaces.filter((w) => w.type === type);
      const totalCount = typeWs.length;
      if (totalCount === 0) return { type, rate: 0, total: 0 };

      const occupiedCount = typeWs.filter((w) => {
        return bookings.some(
          (b) => b.workspaceId === w.id && b.status === 'Checked-in' && b.date === '2026-07-09'
        );
      }).length;

      return {
        type,
        rate: Math.round((occupiedCount / totalCount) * 100),
        total: totalCount,
      };
    });
  }, [filteredWorkspaces, bookings]);

  // Data for Hourly Occupancy trend (08:00 to 20:00)
  const hourlyOccupancyData = useMemo(() => {
    const hours = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
    return hours.map((hour) => {
      const [h] = hour.split(':').map(Number);
      const activeCount = filteredBookings.filter((b) => {
        if (b.date !== '2026-07-09' || b.status === 'Cancelled' || b.status === 'No-show') return false;
        const [sh] = b.startTime.split(':').map(Number);
        const [eh] = b.endTime.split(':').map(Number);
        return h >= sh && h < eh;
      }).length;

      return {
        hour,
        count: activeCount,
      };
    });
  }, [filteredBookings]);

  // CSV Report Generator (FR-9.2)
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Booking Reference,Workspace,Member Name,Email,Date,Schedule,Status,Attendee Count,Created Timestamp\n';

    filteredBookings.forEach((b) => {
      const wsName = workspaces.find((w) => w.id === b.workspaceId)?.name || 'Unknown';
      const row = [
        b.bookingRef,
        `"${wsName}"`,
        `"${b.userName}"`,
        b.userEmail,
        b.date,
        `${b.startTime}-${b.endTime}`,
        b.status,
        b.attendeeCount,
        b.createdAt,
      ].join(',');
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `coworking_bookings_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="analytics-reporting-board" className="space-y-6">
      {/* Interactive Filters Panel */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-slate-500" />
          <h3 className="font-semibold text-slate-800 text-sm">Dashboard Filters</h3>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="space-y-0.5 flex-1 md:flex-initial">
            <select
              id="analytics-filter-loc"
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="text-xs border border-slate-200 rounded p-1.5 bg-slate-50 w-full"
            >
              <option value="All">All Locations</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-0.5 flex-1 md:flex-initial">
            <select
              id="analytics-filter-type"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-xs border border-slate-200 rounded p-1.5 bg-slate-50 w-full"
            >
              <option value="All">All Workspace Types</option>
              <option value="Hot Desk">Hot Desk</option>
              <option value="Dedicated Desk">Dedicated Desk</option>
              <option value="Meeting Room">Meeting Room</option>
              <option value="Conference Room">Conference Room</option>
              <option value="Private Office">Private Office</option>
            </select>
          </div>

          <button
            id="btn-export-bookings-report"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold cursor-pointer shadow-sm transition-colors w-full md:w-auto justify-center"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Workspace Utilization Card */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 shrink-0">
            <BarChart4 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase block">Utilization Rate</span>
            <span className="text-2xl font-black text-slate-800 font-mono mt-0.5">
              {metrics.utilizationRate}%
            </span>
          </div>
        </div>

        {/* Available Workspaces Card */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase block">Free Workspace Count</span>
            <span className="text-2xl font-black text-slate-800 font-mono mt-0.5">
              {metrics.availableWs} <span className="text-xs text-slate-400 font-normal"> / {metrics.totalWs}</span>
            </span>
          </div>
        </div>

        {/* No show Alarm rate */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase block">No-show Timeout Rate</span>
            <span className="text-2xl font-black text-slate-800 font-mono mt-0.5">
              {metrics.noShowRate}%
            </span>
          </div>
        </div>

        {/* Cancellation Margin Rate */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-150 text-slate-600 shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase block">Cancellation Rate</span>
            <span className="text-2xl font-black text-slate-800 font-mono mt-0.5">
              {metrics.cancellationRate}%
            </span>
          </div>
        </div>
      </div>

      {/* Custom SVG Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workspace Utilization Bar Chart */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-1.5">
            <BarChart4 className="w-5 h-5 text-blue-500" />
            <h4 className="font-semibold text-slate-800 text-sm">Workspace Occupancy by Category</h4>
          </div>

          <div className="h-64 flex items-end justify-between px-4 pt-6 pb-2 border-b border-slate-100 relative">
            {/* Background grid lines */}
            <div className="absolute inset-x-0 top-1/4 border-t border-slate-100/60 pointer-events-none"></div>
            <div className="absolute inset-x-0 top-2/4 border-t border-slate-100/60 pointer-events-none"></div>
            <div className="absolute inset-x-0 top-3/4 border-t border-slate-100/60 pointer-events-none"></div>

            {utilizationByTypeData.map((item, index) => {
              const barHeight = Math.max(10, item.rate * 1.8); // Scale for SVG container height
              return (
                <div key={item.type} className="flex flex-col items-center flex-1 group relative z-10">
                  {/* Tooltip bar on hover */}
                  <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-all bg-slate-800 text-white font-mono text-[10px] px-2.5 py-1 rounded shadow-md font-bold whitespace-nowrap">
                    {item.rate}% Occupied ({item.total} total)
                  </div>

                  {/* Actual visual Bar */}
                  <div
                    style={{ height: `${barHeight}px` }}
                    className="w-10 bg-blue-600 group-hover:bg-blue-700 rounded-t transition-all duration-300 relative shadow-sm"
                  >
                    <span className="absolute inset-x-0 bottom-2 text-center text-[10px] font-bold text-white font-mono">
                      {item.rate}%
                    </span>
                  </div>

                  <span className="text-[10px] text-slate-500 mt-2 font-semibold text-center max-w-[70px] truncate leading-tight">
                    {item.type}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="text-[10px] text-slate-400 text-center font-medium leading-none">
            Utilization values show % of total spaces currently locked as Checked-In.
          </div>
        </div>

        {/* Occupancy Trend Line Chart */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            <h4 className="font-semibold text-slate-800 text-sm">Active Booking Density by Hour</h4>
          </div>

          <div className="h-64 flex items-end justify-between px-4 pt-6 pb-2 border-b border-slate-100 relative">
            {/* Background grid lines */}
            <div className="absolute inset-x-0 top-1/4 border-t border-slate-100/60 pointer-events-none"></div>
            <div className="absolute inset-x-0 top-2/4 border-t border-slate-100/60 pointer-events-none"></div>
            <div className="absolute inset-x-0 top-3/4 border-t border-slate-100/60 pointer-events-none"></div>

            {hourlyOccupancyData.map((item, index) => {
              const maxCount = Math.max(...hourlyOccupancyData.map((d) => d.count), 1);
              const barHeight = (item.count / maxCount) * 160 + 10; // Scale height in pixels

              return (
                <div key={item.hour} className="flex flex-col items-center flex-1 group relative z-10">
                  {/* Tooltip */}
                  <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-all bg-slate-800 text-white font-mono text-[10px] px-2.5 py-1 rounded shadow-md font-bold whitespace-nowrap">
                    {item.count} Active Bookings
                  </div>

                  {/* Dot Indicator */}
                  <div
                    style={{ bottom: `${barHeight}px` }}
                    className="w-3.5 h-3.5 bg-emerald-500 hover:bg-emerald-600 border-2 border-white rounded-full transition-colors absolute z-20 shadow-sm"
                  ></div>

                  {/* Vertical bar anchor guide */}
                  <div
                    style={{ height: `${barHeight}px` }}
                    className="w-1 border-l-2 border-dashed border-emerald-100 group-hover:border-emerald-300 transition-colors h-full"
                  ></div>

                  <span className="text-[10px] text-slate-500 mt-2 font-semibold font-mono">
                    {item.hour}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="text-[10px] text-slate-400 text-center font-medium leading-none">
            Aggregated active reservation slots mapped inclusive of guest bookings.
          </div>
        </div>
      </div>
    </div>
  );
}
