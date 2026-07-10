/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type WorkspaceType = 'Hot Desk' | 'Dedicated Desk' | 'Meeting Room' | 'Conference Room' | 'Private Office';

export type WorkspaceStatus = 'Available' | 'Maintenance' | 'Inactive';

export interface Workspace {
  id: string;
  name: string;
  type: WorkspaceType;
  image: string;
  description: string;
  capacity: number;
  amenities: string[];
  floor: string;
  zone: string;
  locationId: string;
  baseHourlyRate: number;
  status: WorkspaceStatus;
  maintenanceReason?: string;
  maintenanceStart?: string;
  maintenanceEnd?: string;
}

export type BookingStatus =
  | 'Requested'
  | 'Pending Approval'
  | 'Confirmed'
  | 'Waitlisted'
  | 'Checked-in'
  | 'Checked-out'
  | 'Completed'
  | 'Cancelled'
  | 'No-show'
  | 'Expired';

export interface VisitorInfo {
  id: string;
  name: string;
  email: string;
  company?: string;
  status: 'Registered' | 'Checked-in' | 'Checked-out';
  checkInTime?: string;
  checkOutTime?: string;
}

export interface Booking {
  id: string;
  bookingRef: string;
  workspaceId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: UserRole;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  status: BookingStatus;
  purpose?: string;
  attendeeCount: number;
  visitors: VisitorInfo[];
  specialRequests?: string;
  internalNotes?: string;
  createdAt: string;
  actualCheckIn?: string;
  actualCheckOut?: string;
  recurrenceId?: string;
  isOverstay?: boolean;
}

export type UserRole = 'System Administrator' | 'Facility Manager' | 'Front Desk Staff' | 'Member' | 'Visitor';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  membershipPlanId?: string;
  remainingCredits: number;
  status: 'Active' | 'Inactive' | 'Pending';
  joinDate: string;
}

export interface WaitlistEntry {
  id: string;
  workspaceId: string;
  userId: string;
  userName: string;
  userEmail: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  rank: number;
  status: 'Active' | 'Offered' | 'Expired' | 'Converted';
  offerExpiryTime?: string; // ISO string
}

export interface AuditLog {
  id: string;
  action: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  timestamp: string;
  details: string;
  affectedModule: string;
  previousValue?: string;
  updatedValue?: string;
}

export interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  credits: number;
  validityMonths: number;
  description: string;
  status: 'Active' | 'Inactive';
  entitlements: string[];
}

export interface Location {
  id: string;
  name: string;
  address: string;
  timezone: string;
  operatingHours: {
    weekday: string; // e.g. "08:00-20:00"
    weekend: string; // e.g. "09:00-17:00"
  };
  status: 'Active' | 'Inactive';
}
