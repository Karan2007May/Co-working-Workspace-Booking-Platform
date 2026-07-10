/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Workspace, Booking, Location, WorkspaceType } from '../types';
import { Search, MapPin, Users, Wifi, Shield, SlidersHorizontal, ArrowUpDown, Clock, Info, CheckCircle, AlertTriangle } from 'lucide-react';

interface WorkspaceSearchProps {
  workspaces: Workspace[];
  bookings: Booking[];
  locations: Location[];
  onSelectWorkspace: (workspace: Workspace, searchDate: string, searchStart: string, searchEnd: string) => void;
}

export default function WorkspaceSearch({ workspaces, bookings, locations, onSelectWorkspace }: WorkspaceSearchProps) {
  // Search parameters state
  const [selectedLocation, setSelectedLocation] = useState<string>('loc-downtown');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [searchDate, setSearchDate] = useState<string>('2026-07-09'); // seeded date
  const [searchStart, setSearchStart] = useState<string>('09:00');
  const [searchEnd, setSearchEnd] = useState<string>('11:00');
  const [minCapacity, setMinCapacity] = useState<number>(1);

  // Sorting and filtering state
  const [sortBy, setSortBy] = useState<string>('relevance');
  const [selectedAmenity, setSelectedAmenity] = useState<string>('All');

  // List of all unique amenities for filter dropdown
  const allAmenities = useMemo(() => {
    const list = new Set<string>();
    workspaces.forEach((w) => w.amenities.forEach((a) => list.add(a)));
    return ['All', ...Array.from(list)];
  }, [workspaces]);

  // Check if times overlap
  const isTimeOverlapping = (start1: string, end1: string, start2: string, end2: string) => {
    return start1 < end2 && end1 > start2;
  };

  // Compute availability for each workspace in the selected slot
  const workspacesWithAvailability = useMemo(() => {
    return workspaces.map((ws) => {
      // 1. Check if workspace status is Maintenance
      if (ws.status === 'Maintenance') {
        return {
          ...ws,
          isAvailable: false,
          reason: 'Under maintenance',
        };
      }

      if (ws.status === 'Inactive') {
        return {
          ...ws,
          isAvailable: false,
          reason: 'Inactive',
        };
      }

      // 2. Check if overlapping booking exists
      const overlappingBookings = bookings.filter((b) => {
        return (
          b.workspaceId === ws.id &&
          b.date === searchDate &&
          (b.status === 'Confirmed' || b.status === 'Checked-in' || b.status === 'Pending Approval') &&
          isTimeOverlapping(b.startTime, b.endTime, searchStart, searchEnd)
        );
      });

      if (overlappingBookings.length > 0) {
        return {
          ...ws,
          isAvailable: false,
          reason: `Reserved (${overlappingBookings[0].startTime} - ${overlappingBookings[0].endTime})`,
          overlappingBooking: overlappingBookings[0],
        };
      }

      return {
        ...ws,
        isAvailable: true,
        reason: 'Available',
      };
    });
  }, [workspaces, bookings, searchDate, searchStart, searchEnd]);

  // Filtered and sorted results
  const processedWorkspaces = useMemo(() => {
    let result = workspacesWithAvailability.filter((ws) => {
      // Location check
      if (selectedLocation && ws.locationId !== selectedLocation) return false;

      // Type check
      if (selectedType !== 'All' && ws.type !== selectedType) return false;

      // Capacity check
      if (ws.capacity < minCapacity) return false;

      // Amenity check
      if (selectedAmenity !== 'All' && !ws.amenities.includes(selectedAmenity)) return false;

      return true;
    });

    // Sorting
    if (sortBy === 'rate-asc') {
      result.sort((a, b) => a.baseHourlyRate - b.baseHourlyRate);
    } else if (sortBy === 'rate-desc') {
      result.sort((a, b) => b.baseHourlyRate - a.baseHourlyRate);
    } else if (sortBy === 'capacity-asc') {
      result.sort((a, b) => a.capacity - b.capacity);
    } else if (sortBy === 'capacity-desc') {
      result.sort((a, b) => b.capacity - a.capacity);
    } else if (sortBy === 'availability') {
      result.sort((a, b) => (a.isAvailable ? -1 : 1));
    }

    return result;
  }, [workspacesWithAvailability, selectedLocation, selectedType, minCapacity, selectedAmenity, sortBy]);

  const activeLocationObj = locations.find((l) => l.id === selectedLocation);

  return (
    <div id="workspace-search-container" className="space-y-6 text-slate-850">
      {/* Search & Filter Header Board */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-md overflow-hidden">
        <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-indigo-600" />
            <h2 className="font-extrabold text-slate-800">Workspace Discovery</h2>
          </div>
          {activeLocationObj && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-full shadow-sm">
              <MapPin className="w-3.5 h-3.5 text-pink-600" />
              <span>{activeLocationObj.name}</span>
            </div>
          )}
        </div>

        <div className="p-5">
          {/* Main Search Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Location Selector */}
            <div className="space-y-1.5">
              <label htmlFor="search-location-id" className="text-xs font-extrabold text-slate-500 block">Location</label>
              <select
                id="search-location-id"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-white text-slate-800 hover:bg-slate-50 focus:outline-none focus:border-indigo-500"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id} className="bg-white text-slate-800">
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Type Selector */}
            <div className="space-y-1.5">
              <label htmlFor="search-workspace-type" className="text-xs font-extrabold text-slate-500 block">Workspace Type</label>
              <select
                id="search-workspace-type"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-white text-slate-800 hover:bg-slate-50 focus:outline-none focus:border-indigo-500"
              >
                <option value="All" className="bg-white text-slate-800">All Workspace Types</option>
                <option value="Hot Desk" className="bg-white text-slate-800">Hot Desk</option>
                <option value="Dedicated Desk" className="bg-white text-slate-800">Dedicated Desk</option>
                <option value="Meeting Room" className="bg-white text-slate-800">Meeting Room</option>
                <option value="Conference Room" className="bg-white text-slate-800">Conference Room</option>
                <option value="Private Office" className="bg-white text-slate-800">Private Office</option>
              </select>
            </div>

            {/* Date Picker */}
            <div className="space-y-1.5">
              <label htmlFor="search-date" className="text-xs font-extrabold text-slate-500 block">Date</label>
              <input
                id="search-date"
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-white text-slate-800 hover:bg-slate-50 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            {/* Time Slots */}
            <div className="space-y-1.5">
              <label htmlFor="search-times" className="text-xs font-extrabold text-slate-500 block">Time Window</label>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  id="search-start-time"
                  type="time"
                  value={searchStart}
                  onChange={(e) => setSearchStart(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-1.5 bg-white text-slate-800 hover:bg-slate-50 focus:outline-none focus:border-indigo-500 font-mono text-center"
                  title="Start Time"
                />
                <input
                  id="search-end-time"
                  type="time"
                  value={searchEnd}
                  onChange={(e) => setSearchEnd(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-1.5 bg-white text-slate-800 hover:bg-slate-50 focus:outline-none focus:border-indigo-500 font-mono text-center"
                  title="End Time"
                />
              </div>
            </div>

            {/* Capacity Selector */}
            <div className="space-y-1.5">
              <label htmlFor="search-min-capacity" className="text-xs font-extrabold text-slate-500 block">Min Capacity</label>
              <div className="relative">
                <input
                  id="search-min-capacity"
                  type="number"
                  min="1"
                  max="100"
                  value={minCapacity}
                  onChange={(e) => setMinCapacity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 pl-8 bg-white text-slate-800 hover:bg-slate-50 focus:outline-none focus:border-indigo-500 font-sans"
                />
                <Users className="w-4 h-4 text-slate-400 absolute left-2.5 top-3" />
              </div>
            </div>
          </div>

          {/* Sorting and Advanced Filters */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                <span>Amenities:</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {allAmenities.slice(0, 5).map((amenity) => (
                  <button
                    key={amenity}
                    id={`btn-filter-amenity-${amenity}`}
                    onClick={() => setSelectedAmenity(amenity)}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-all cursor-pointer ${
                      selectedAmenity === amenity
                        ? 'bg-gradient-to-r from-blue-600 to-pink-600 text-white border-transparent shadow-md font-extrabold'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-indigo-600'
                    }`}
                  >
                    {amenity}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600" />
                <label htmlFor="search-sort-by">Sort By:</label>
              </div>
              <select
                id="search-sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs border border-slate-200 rounded-md p-1.5 bg-white text-slate-700 focus:outline-none cursor-pointer hover:bg-slate-50"
              >
                <option value="relevance" className="bg-white">Relevance</option>
                <option value="availability" className="bg-white">Availability First</option>
                <option value="rate-asc" className="bg-white">Price: Low to High</option>
                <option value="rate-desc" className="bg-white">Price: High to Low</option>
                <option value="capacity-desc" className="bg-white">Capacity: High to Low</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-extrabold text-slate-600">
          Found <span className="text-indigo-600 font-black">{processedWorkspaces.length}</span> workspaces matching your criteria
        </p>
        {activeLocationObj && (
          <p className="text-xs font-mono font-bold text-slate-500">
            Operating Hours: Weekday {activeLocationObj.operatingHours.weekday} | Weekend {activeLocationObj.operatingHours.weekend}
          </p>
        )}
      </div>

      {/* Workspace Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {processedWorkspaces.map((ws) => {
          return (
            <div
              key={ws.id}
              id={`workspace-card-${ws.id}`}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-500/50 transition-all duration-300 flex flex-col"
            >
              {/* Card Image */}
              <div className="h-44 relative bg-slate-50 overflow-hidden">
                <img
                  src={ws.image}
                  alt={ws.name}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/90 text-slate-800 border border-slate-200 shadow-sm backdrop-blur-sm">
                  {ws.type}
                </div>
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-600 text-white shadow-md font-mono backdrop-blur-sm">
                  ${ws.baseHourlyRate}/hr
                </div>
              </div>

              {/* Card Content */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="font-extrabold text-slate-800 text-base line-clamp-1">{ws.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-slate-600 shrink-0 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      <span className="font-bold font-mono">Up to {ws.capacity}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mb-4 line-clamp-2 leading-relaxed min-h-[32px]">
                    {ws.description}
                  </p>

                  {/* Attributes */}
                  <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <span className="text-slate-400 font-bold font-mono">Floor:</span>
                      <span className="truncate">{ws.floor}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <span className="text-slate-400 font-bold font-mono">Zone:</span>
                      <span className="truncate">{ws.zone}</span>
                    </div>
                  </div>

                  {/* Amenities Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {ws.amenities.map((amenity) => (
                      <span
                        key={amenity}
                        className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded font-extrabold tracking-wide"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bottom Action Area */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs text-slate-500 font-bold">Availability:</span>
                    <div className="flex items-center gap-1">
                      {ws.isAvailable ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Available</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-bold text-rose-600" title={ws.reason}>
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <span className="max-w-[120px] truncate">{ws.reason}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {ws.isAvailable ? (
                    <button
                      id={`btn-book-workspace-${ws.id}`}
                      onClick={() => onSelectWorkspace(ws, searchDate, searchStart, searchEnd)}
                      className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-lg transition-all shadow-md hover:shadow-lg cursor-pointer hover:scale-[1.02]"
                    >
                      Configure & Reserve Desk
                    </button>
                  ) : (
                    <button
                      id={`btn-waitlist-workspace-${ws.id}`}
                      onClick={() => onSelectWorkspace(ws, searchDate, searchStart, searchEnd)}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-xs rounded-lg transition-all cursor-pointer"
                    >
                      Join Waiting List Queue
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {processedWorkspaces.length === 0 && (
        <div id="no-search-results-state" className="bg-white border border-slate-200 rounded-xl py-12 px-6 text-center space-y-3 shadow-md">
          <Info className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="font-extrabold text-slate-800">No workspaces match your filters</h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Try choosing a different location, lowering the minimum capacity, or clearing the selected amenity filters.
          </p>
        </div>
      )}
    </div>
  );
}
