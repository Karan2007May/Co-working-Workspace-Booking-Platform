/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Workspace, Booking, User, WaitlistEntry, AuditLog, MembershipPlan, Location, UserRole } from './types';

// Seed locations
export const INITIAL_LOCATIONS: Location[] = [
  {
    id: 'loc-downtown',
    name: 'Downtown Core Elite',
    address: '100 Financial Way, Penthouse Level, New York, NY',
    timezone: 'EST',
    operatingHours: { weekday: '08:00-20:00', weekend: '09:00-17:00' },
    status: 'Active',
  },
  {
    id: 'loc-innovation',
    name: 'Tech Innovation District',
    address: '500 Silicon Boulevard, Building B, San Francisco, CA',
    timezone: 'PST',
    operatingHours: { weekday: '07:00-22:00', weekend: '08:00-18:00' },
    status: 'Active',
  },
  {
    id: 'loc-loft',
    name: 'Creative SOHO Loft',
    address: '42 Artisans Alley, 3rd Floor, Seattle, WA',
    timezone: 'PST',
    operatingHours: { weekday: '09:00-21:00', weekend: '10:00-16:00' },
    status: 'Active',
  },
];

// Seed membership plans
export const INITIAL_MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    id: 'plan-basic',
    name: 'Community Starter',
    price: 49,
    credits: 10,
    validityMonths: 1,
    description: 'Perfect for freelancers needing occasional desk space.',
    status: 'Active',
    entitlements: ['Access to Hot Desks', '10 Booking Credits/month', 'High-speed Wi-Fi', 'Coffee & Tea'],
  },
  {
    id: 'plan-pro',
    name: 'Professional Nomad',
    price: 149,
    credits: 50,
    validityMonths: 1,
    description: 'Ideal for full-time remote workers and growing creators.',
    status: 'Active',
    entitlements: [
      'Access to Hot & Dedicated Desks',
      '50 Booking Credits/month',
      '2 Meeting Room Hours/month',
      'Mailing Address Service',
      '2 Guest Passes/month',
    ],
  },
  {
    id: 'plan-exec',
    name: 'Executive Elite',
    price: 299,
    credits: 999, // Treated as unlimited
    validityMonths: 1,
    description: 'Full premium experience with unlimited desk access and priority bookings.',
    status: 'Active',
    entitlements: [
      'Unlimited Desk Access',
      'Unlimited Booking Credits',
      '10 Meeting Room Hours/month',
      'Private Locker',
      '5 Guest Passes/month',
      'Priority Support',
    ],
  },
];

// Seed workspaces
export const INITIAL_WORKSPACES: Workspace[] = [
  // Downtown Core Elite
  {
    id: 'ws-dt-hot1',
    name: 'Hot Desk Row A',
    type: 'Hot Desk',
    image: 'https://images.unsplash.com/photo-1527192491265-7e4e9db1db2d?auto=format&fit=crop&w=600&q=80',
    description: 'Shared ergonomic hot-desking station with ultra-fast ethernet and natural lighting.',
    capacity: 10,
    amenities: ['Ergonomic Chair', 'Power Strips', 'Ethernet Port', 'Natural Lighting'],
    floor: 'Penthouse Level',
    zone: 'East Wing - Hot Zone',
    locationId: 'loc-downtown',
    baseHourlyRate: 5,
    status: 'Available',
  },
  {
    id: 'ws-dt-ded1',
    name: 'Premium Dedicated Desk 01',
    type: 'Dedicated Desk',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80',
    description: 'Your own permanent desk complete with custom drawer pedestal and secondary 24" screen.',
    capacity: 1,
    amenities: ['Personal Locker', 'Dual 24" Monitor', 'Ergonomic Desk', 'Filing Cabinet'],
    floor: 'Penthouse Level',
    zone: 'West Wing - Focus Zone',
    locationId: 'loc-downtown',
    baseHourlyRate: 10,
    status: 'Available',
  },
  {
    id: 'ws-dt-meet1',
    name: 'Boardroom Alpha',
    type: 'Meeting Room',
    image: 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?auto=format&fit=crop&w=600&q=80',
    description: 'Sleek glass-walled meeting space with 4K display, polycom conference phone, and whiteboards.',
    capacity: 8,
    amenities: ['4K Smart TV', 'Polycom Speakerphone', 'Glass Whiteboard', 'Video Conferencing Kit'],
    floor: 'Penthouse Level',
    zone: 'Central Hub',
    locationId: 'loc-downtown',
    baseHourlyRate: 25,
    status: 'Available',
  },
  {
    id: 'ws-dt-conf1',
    name: 'Grand Auditorium Prime',
    type: 'Conference Room',
    image: 'https://images.unsplash.com/photo-1517502884422-41eaaced0168?auto=format&fit=crop&w=600&q=80',
    description: 'Magnificent presentation and training hall equipped with dynamic ceiling mics and laser projectors.',
    capacity: 30,
    amenities: ['Laser Projector', 'Ceiling Microphone Array', 'Stage Podium', 'Surround Sound', 'Catering Station'],
    floor: 'Penthouse Level',
    zone: 'Events Plaza',
    locationId: 'loc-downtown',
    baseHourlyRate: 60,
    status: 'Available',
  },
  {
    id: 'ws-dt-priv1',
    name: 'Executive Office 404',
    type: 'Private Office',
    image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80',
    description: 'Fully furnished, acoustically soundproofed high-end private suite with floor-to-ceiling skyline views.',
    capacity: 4,
    amenities: ['Acoustic Soundproofing', 'Private Lounge Sofa', 'Dedicated Mini Fridge', 'Individually Controlled AC'],
    floor: 'Penthouse Level',
    zone: 'Executive Wing',
    locationId: 'loc-downtown',
    baseHourlyRate: 45,
    status: 'Available',
  },

  // Tech Innovation District
  {
    id: 'ws-tech-hot1',
    name: 'Hacker Bench Green',
    type: 'Hot Desk',
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80',
    description: 'Collaborative desk space in the heart of the tech hub, close to local coffee station.',
    capacity: 12,
    amenities: ['High-speed Outlets', 'Standing Desk Converter', 'Whiteboard Wall'],
    floor: 'Floor 2',
    zone: 'Hacker Alley',
    locationId: 'loc-innovation',
    baseHourlyRate: 4,
    status: 'Available',
  },
  {
    id: 'ws-tech-meet1',
    name: 'Meeting Room Quantum',
    type: 'Meeting Room',
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80',
    description: 'High-tech collaboration pod designed for virtual sprints, pairing sessions, and client reviews.',
    capacity: 6,
    amenities: ['Touchscreen Whiteboard', 'Dynamic Lighting', 'Chromecast Built-In'],
    floor: 'Floor 2',
    zone: 'Central Plaza',
    locationId: 'loc-innovation',
    baseHourlyRate: 20,
    status: 'Available',
  },
  {
    id: 'ws-tech-priv1',
    name: 'Founders Suite',
    type: 'Private Office',
    image: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&q=80',
    description: 'Spacious secure startup command room with customizable whiteboards and desks for 6 founders.',
    capacity: 6,
    amenities: ['Secure Door Lock', 'Custom Boardroom Table', 'Surround Sound', 'Ceiling Airflow'],
    floor: 'Floor 3',
    zone: 'Launchpad Row',
    locationId: 'loc-innovation',
    baseHourlyRate: 50,
    status: 'Available',
  },

  // Creative SOHO Loft
  {
    id: 'ws-loft-hot1',
    name: 'Artisan Workbench',
    type: 'Hot Desk',
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80',
    description: 'Warm timber tables in an open-concept brick loft space. Extremely photogenic with skylight views.',
    capacity: 8,
    amenities: ['Wide timber bench', 'Natural Brick Accents', 'Skylights', 'Chill Lounge Access'],
    floor: '3rd Floor',
    zone: 'Gallery Space',
    locationId: 'loc-loft',
    baseHourlyRate: 4,
    status: 'Available',
  },
  {
    id: 'ws-loft-meet1',
    name: 'Atelier Meeting Space',
    type: 'Meeting Room',
    image: 'https://images.unsplash.com/photo-1542744094-3a31f103e35f?auto=format&fit=crop&w=600&q=80',
    description: 'Rustic cozy workshop and meeting workspace styled with velvet sofas, warm wood tables, and studio lighting.',
    capacity: 10,
    amenities: ['Velvet Sofas', 'Warm Dimmable Lighting', 'HD Projector', 'Coffee Bar Access'],
    floor: '3rd Floor',
    zone: 'Cozy Corner',
    locationId: 'loc-loft',
    baseHourlyRate: 22,
    status: 'Available',
  },
];

// Seed initial users
export const INITIAL_USERS: User[] = [
  {
    id: 'usr-admin',
    name: 'Sarah Connor',
    email: 'sarah.connor@cowork.com',
    role: 'System Administrator',
    status: 'Active',
    remainingCredits: 9999,
    joinDate: '2025-01-15',
  },
  {
    id: 'usr-manager',
    name: 'John Doe',
    email: 'john.doe@cowork.com',
    role: 'Facility Manager',
    status: 'Active',
    remainingCredits: 999,
    joinDate: '2025-02-01',
  },
  {
    id: 'usr-desk',
    name: 'Emily Watson',
    email: 'emily.watson@cowork.com',
    role: 'Front Desk Staff',
    status: 'Active',
    remainingCredits: 200,
    joinDate: '2025-03-10',
  },
  {
    id: 'usr-member',
    name: 'Nitin',
    email: 'nitin@member.com',
    role: 'Member',
    membershipPlanId: 'plan-pro',
    remainingCredits: 42,
    status: 'Active',
    joinDate: '2026-01-01',
  },
  {
    id: 'usr-guest',
    name: 'Jane Smith',
    email: 'jane.smith@guest.com',
    role: 'Visitor',
    status: 'Active',
    remainingCredits: 0,
    joinDate: '2026-07-01',
  },
];

// Seed initial bookings (past, current, future, overstay, waitlisted)
// Remember current date: 2026-07-09T05:12:45-07:00 (represented as YYYY-MM-DD: 2026-07-09)
export const INITIAL_BOOKINGS: Booking[] = [
  // Past Completed Booking
  {
    id: 'bk-past1',
    bookingRef: 'BK-1001',
    workspaceId: 'ws-dt-hot1',
    userId: 'usr-member',
    userName: 'Nitin',
    userEmail: 'nitin@member.com',
    userRole: 'Member',
    date: '2026-07-08',
    startTime: '10:00',
    endTime: '14:00',
    status: 'Completed',
    purpose: 'Deep work sprint',
    attendeeCount: 1,
    visitors: [],
    createdAt: '2026-07-05T12:00:00.000Z',
    actualCheckIn: '2026-07-08T10:05:00.000Z',
    actualCheckOut: '2026-07-08T13:58:00.000Z',
  },
  // Past Cancelled Booking
  {
    id: 'bk-past2',
    bookingRef: 'BK-1002',
    workspaceId: 'ws-dt-meet1',
    userId: 'usr-member',
    userName: 'Nitin',
    userEmail: 'nitin@member.com',
    userRole: 'Member',
    date: '2026-07-08',
    startTime: '15:00',
    endTime: '16:00',
    status: 'Cancelled',
    purpose: 'Client sync',
    attendeeCount: 4,
    visitors: [],
    createdAt: '2026-07-06T09:30:00.000Z',
  },
  // Ongoing Checked-In Booking (Today 2026-07-09, start 04:00, end 08:00. Current local time is 05:12)
  {
    id: 'bk-current1',
    bookingRef: 'BK-1003',
    workspaceId: 'ws-dt-ded1',
    userId: 'usr-member',
    userName: 'Nitin',
    userEmail: 'nitin@member.com',
    userRole: 'Member',
    date: '2026-07-09',
    startTime: '04:00',
    endTime: '08:00',
    status: 'Checked-in',
    purpose: 'Sprint planning',
    attendeeCount: 1,
    visitors: [],
    createdAt: '2026-07-08T14:00:00.000Z',
    actualCheckIn: '2026-07-09T04:02:00.000Z',
  },
  // Overstaying Active Booking (Today 2026-07-09, start 02:00, end 05:00. Current is 05:12 so it is an overstay)
  {
    id: 'bk-current2',
    bookingRef: 'BK-1004',
    workspaceId: 'ws-dt-meet1',
    userId: 'usr-member',
    userName: 'Nitin',
    userEmail: 'nitin@member.com',
    userRole: 'Member',
    date: '2026-07-09',
    startTime: '02:00',
    endTime: '05:00',
    status: 'Checked-in',
    purpose: 'Cross-functional alignment',
    attendeeCount: 5,
    visitors: [
      { id: 'v-101', name: 'Alice Wonder', email: 'alice@wonder.com', company: 'Alice Labs', status: 'Checked-in', checkInTime: '2026-07-09T02:05:00.000Z' },
    ],
    createdAt: '2026-07-08T15:30:00.000Z',
    actualCheckIn: '2026-07-09T02:05:00.000Z',
    isOverstay: true,
  },
  // Future Confirmed Booking (Today 2026-07-09, start 10:00, end 12:00)
  {
    id: 'bk-future1',
    bookingRef: 'BK-1005',
    workspaceId: 'ws-dt-hot1',
    userId: 'usr-member',
    userName: 'Nitin',
    userEmail: 'nitin@member.com',
    userRole: 'Member',
    date: '2026-07-09',
    startTime: '10:00',
    endTime: '12:00',
    status: 'Confirmed',
    purpose: 'Productivity hour',
    attendeeCount: 1,
    visitors: [],
    createdAt: '2026-07-08T16:00:00.000Z',
  },
  // Future Booking requiring Manager Approval (Today 2026-07-09, start 14:00, end 18:00)
  {
    id: 'bk-future2',
    bookingRef: 'BK-1006',
    workspaceId: 'ws-dt-conf1',
    userId: 'usr-member',
    userName: 'Nitin',
    userEmail: 'nitin@member.com',
    userRole: 'Member',
    date: '2026-07-09',
    startTime: '14:00',
    endTime: '18:00',
    status: 'Pending Approval',
    purpose: 'Launch Party & Demo',
    attendeeCount: 25,
    visitors: [],
    createdAt: '2026-07-08T17:00:00.000Z',
  },
  // No-show booking (Yesterday grace period elapsed, auto-canceled/no-showed)
  {
    id: 'bk-past3',
    bookingRef: 'BK-1007',
    workspaceId: 'ws-dt-hot1',
    userId: 'usr-guest',
    userName: 'Jane Smith',
    userEmail: 'jane.smith@guest.com',
    userRole: 'Visitor',
    date: '2026-07-08',
    startTime: '09:00',
    endTime: '10:00',
    status: 'No-show',
    purpose: 'Hotdesking Trial',
    attendeeCount: 1,
    visitors: [],
    createdAt: '2026-07-08T08:00:00.000Z',
  },
];

// Seed Waitlist
export const INITIAL_WAITLIST: WaitlistEntry[] = [
  {
    id: 'wl-1',
    workspaceId: 'ws-dt-meet1',
    userId: 'usr-guest',
    userName: 'Jane Smith',
    userEmail: 'jane.smith@guest.com',
    date: '2026-07-09',
    startTime: '02:00',
    endTime: '05:00',
    rank: 1,
    status: 'Active',
  },
];

// Seed Audit Logs
export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    action: 'User Login',
    userId: 'usr-member',
    userName: 'Nitin',
    userRole: 'Member',
    timestamp: '2026-07-09T04:00:00.000Z',
    details: 'User logged in successfully',
    affectedModule: 'Authentication',
  },
  {
    id: 'log-2',
    action: 'Booking Creation',
    userId: 'usr-member',
    userName: 'Nitin',
    userRole: 'Member',
    timestamp: '2026-07-09T04:01:00.000Z',
    details: 'Created Confirmed booking BK-1005 for Hot Desk Row A',
    affectedModule: 'Booking Management',
    updatedValue: 'BK-1005',
  },
  {
    id: 'log-3',
    action: 'Check-in',
    userId: 'usr-member',
    userName: 'Nitin',
    userRole: 'Member',
    timestamp: '2026-07-09T04:02:00.000Z',
    details: 'Checked into booking BK-1003 for Dedicated Desk 01',
    affectedModule: 'Check-in / Check-out',
  },
  {
    id: 'log-4',
    action: 'Check-in',
    userId: 'usr-member',
    userName: 'Nitin',
    userRole: 'Member',
    timestamp: '2026-07-09T02:05:00.000Z',
    details: 'Checked into booking BK-1004 for Boardroom Alpha',
    affectedModule: 'Check-in / Check-out',
  },
];

// Storage Engine
const KEYS = {
  LOCATIONS: 'cowork_locations',
  MEMBERSHIP_PLANS: 'cowork_membership_plans',
  WORKSPACES: 'cowork_workspaces',
  USERS: 'cowork_users',
  BOOKINGS: 'cowork_bookings',
  WAITLIST: 'cowork_waitlist',
  AUDIT_LOGS: 'cowork_audit_logs',
};

function getStoredJSON<T>(key: string, defaultValue: T): T {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultValue;
  } catch (e) {
    console.error(`Error reading ${key} from localStorage`, e);
    return defaultValue;
  }
}

function setStoredJSON<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error writing ${key} to localStorage`, e);
  }
}

export function initializeDatabase(): void {
  if (!localStorage.getItem(KEYS.LOCATIONS)) setStoredJSON(KEYS.LOCATIONS, INITIAL_LOCATIONS);
  if (!localStorage.getItem(KEYS.MEMBERSHIP_PLANS)) setStoredJSON(KEYS.MEMBERSHIP_PLANS, INITIAL_MEMBERSHIP_PLANS);
  if (!localStorage.getItem(KEYS.WORKSPACES)) setStoredJSON(KEYS.WORKSPACES, INITIAL_WORKSPACES);
  if (!localStorage.getItem(KEYS.USERS)) setStoredJSON(KEYS.USERS, INITIAL_USERS);
  if (!localStorage.getItem(KEYS.BOOKINGS)) setStoredJSON(KEYS.BOOKINGS, INITIAL_BOOKINGS);
  if (!localStorage.getItem(KEYS.WAITLIST)) setStoredJSON(KEYS.WAITLIST, INITIAL_WAITLIST);
  if (!localStorage.getItem(KEYS.AUDIT_LOGS)) setStoredJSON(KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
}

export const db = {
  getLocations: (): Location[] => getStoredJSON(KEYS.LOCATIONS, INITIAL_LOCATIONS),
  setLocations: (val: Location[]) => setStoredJSON(KEYS.LOCATIONS, val),

  getMembershipPlans: (): MembershipPlan[] => getStoredJSON(KEYS.MEMBERSHIP_PLANS, INITIAL_MEMBERSHIP_PLANS),
  setMembershipPlans: (val: MembershipPlan[]) => setStoredJSON(KEYS.MEMBERSHIP_PLANS, val),

  getWorkspaces: (): Workspace[] => getStoredJSON(KEYS.WORKSPACES, INITIAL_WORKSPACES),
  setWorkspaces: (val: Workspace[]) => setStoredJSON(KEYS.WORKSPACES, val),

  getUsers: (): User[] => getStoredJSON(KEYS.USERS, INITIAL_USERS),
  setUsers: (val: User[]) => setStoredJSON(KEYS.USERS, val),

  getBookings: (): Booking[] => getStoredJSON(KEYS.BOOKINGS, INITIAL_BOOKINGS),
  setBookings: (val: Booking[]) => setStoredJSON(KEYS.BOOKINGS, val),

  getWaitlist: (): WaitlistEntry[] => getStoredJSON(KEYS.WAITLIST, INITIAL_WAITLIST),
  setWaitlist: (val: WaitlistEntry[]) => setStoredJSON(KEYS.WAITLIST, val),

  getAuditLogs: (): AuditLog[] => getStoredJSON(KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS),
  setAuditLogs: (val: AuditLog[]) => setStoredJSON(KEYS.AUDIT_LOGS, val),

  // Clear/Reset entire DB to initial seeded state
  resetDatabase: (): void => {
    setStoredJSON(KEYS.LOCATIONS, INITIAL_LOCATIONS);
    setStoredJSON(KEYS.MEMBERSHIP_PLANS, INITIAL_MEMBERSHIP_PLANS);
    setStoredJSON(KEYS.WORKSPACES, INITIAL_WORKSPACES);
    setStoredJSON(KEYS.USERS, INITIAL_USERS);
    setStoredJSON(KEYS.BOOKINGS, INITIAL_BOOKINGS);
    setStoredJSON(KEYS.WAITLIST, INITIAL_WAITLIST);
    setStoredJSON(KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  },

  // Log action helper
  addAuditLog: (action: string, userId: string, userName: string, userRole: UserRole, details: string, affectedModule: string, prev?: string, updated?: string): void => {
    const logs = db.getAuditLogs();
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      action,
      userId,
      userName,
      userRole,
      timestamp: new Date().toISOString(),
      details,
      affectedModule,
      previousValue: prev,
      updatedValue: updated,
    };
    logs.unshift(newLog); // Put newest logs first
    db.setAuditLogs(logs);
  }
};
