/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Workspace, Booking, User, VisitorInfo, Location, BookingStatus } from '../types';
import { db } from '../mockData';
import { ArrowLeft, Clock, Calendar, Users, Info, Plus, Trash2, Shield, CreditCard, Sparkles, CheckCircle } from 'lucide-react';

interface BookingFormProps {
  selectedWorkspace: Workspace;
  searchDate: string;
  searchStart: string;
  searchEnd: string;
  currentUser: User;
  onBack: () => void;
  onSubmitBooking: (bookingData: Omit<Booking, 'id' | 'bookingRef' | 'createdAt'>, recurrenceType: string, occurrencesCount: number) => void;
  onSubmitWaitlist: (waitlistData: { workspaceId: string; date: string; startTime: string; endTime: string }) => void;
}

export default function BookingForm({
  selectedWorkspace,
  searchDate,
  searchStart,
  searchEnd,
  currentUser,
  onBack,
  onSubmitBooking,
  onSubmitWaitlist,
}: BookingFormProps) {
  // Booking details state
  const [date, setDate] = useState<string>(searchDate);
  const [startTime, setStartTime] = useState<string>(searchStart);
  const [endTime, setEndTime] = useState<string>(searchEnd);
  const [purpose, setPurpose] = useState<string>('');
  const [attendeeCount, setAttendeeCount] = useState<number>(1);
  const [specialRequests, setSpecialRequests] = useState<string>('');
  const [internalNotes, setInternalNotes] = useState<string>('');

  // Visitors pre-registration state
  const [visitors, setVisitors] = useState<Omit<VisitorInfo, 'id' | 'status'>[]>([]);
  const [newVisitorName, setNewVisitorName] = useState<string>('');
  const [newVisitorEmail, setNewVisitorEmail] = useState<string>('');
  const [newVisitorCompany, setNewVisitorCompany] = useState<string>('');

  // Recurrence state
  const [recurrenceType, setRecurrenceType] = useState<string>('none'); // none, daily, weekly, monthly
  const [recurrenceCount, setRecurrenceCount] = useState<number>(5);

  // Validation / pricing calculations
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSlotAvailable, setIsSlotAvailable] = useState<boolean>(true);
  const [locationObj, setLocationObj] = useState<Location | null>(null);

  // Visitor Payment Checkout states
  const [cardName, setCardName] = useState<string>(currentUser.name || '');
  const [cardNumber, setCardNumber] = useState<string>('4242 4242 4242 4242');
  const [cardExpiry, setCardExpiry] = useState<string>('12/28');
  const [cardCvc, setCardCvc] = useState<string>('424');
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);

  // Hourly / pricing calculation
  const durationInHours = (() => {
    try {
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      const startMinutes = sh * 60 + sm;
      const endMinutes = eh * 60 + em;
      return Math.max(0.5, (endMinutes - startMinutes) / 60);
    } catch {
      return 1;
    }
  })();

  const creditCost = Math.ceil(durationInHours * selectedWorkspace.baseHourlyRate);

  // Fetch location information
  useEffect(() => {
    const locs = db.getLocations();
    const loc = locs.find((l) => l.id === selectedWorkspace.locationId);
    if (loc) setLocationObj(loc);
  }, [selectedWorkspace]);

  // Real-time slot and rule validation
  useEffect(() => {
    if (!date || !startTime || !endTime) return;

    if (startTime >= endTime) {
      setValidationError('Start time must be strictly earlier than end time.');
      setIsSlotAvailable(false);
      return;
    }

    // Check Operating Hours
    if (locationObj) {
      const day = new Date(date).getDay();
      const isWeekend = day === 0 || day === 6;
      const opHoursStr = isWeekend ? locationObj.operatingHours.weekend : locationObj.operatingHours.weekday;
      const [opStart, opEnd] = opHoursStr.split('-');

      if (startTime < opStart || endTime > opEnd) {
        setValidationError(`Selected slot falls outside local operating hours (${opHoursStr}).`);
        setIsSlotAvailable(false);
        return;
      }
    }

    // Capacity verification
    if (attendeeCount > selectedWorkspace.capacity) {
      setValidationError(`Selected attendee count (${attendeeCount}) exceeds workspace seating capacity (${selectedWorkspace.capacity}).`);
      setIsSlotAvailable(false);
      return;
    }

    // Overlapping booking checking
    const bookings = db.getBookings();
    const isOverlapping = (s1: string, e1: string, s2: string, e2: string) => s1 < e2 && e1 > s2;

    const conflicts = bookings.filter((b) => {
      return (
        b.workspaceId === selectedWorkspace.id &&
        b.date === date &&
        (b.status === 'Confirmed' || b.status === 'Checked-in' || b.status === 'Pending Approval') &&
        isOverlapping(b.startTime, b.endTime, startTime, endTime)
      );
    });

    if (conflicts.length > 0) {
      setValidationError(`This slot conflicts with an existing booking. Waitlist available!`);
      setIsSlotAvailable(false);
    } else {
      setValidationError(null);
      setIsSlotAvailable(true);
    }
  }, [date, startTime, endTime, attendeeCount, selectedWorkspace, locationObj]);

  // Handle adding a visitor
  const handleAddVisitor = () => {
    if (!newVisitorName || !newVisitorEmail) {
      alert('Visitor Name and Email are required.');
      return;
    }
    setVisitors([...visitors, { name: newVisitorName, email: newVisitorEmail, company: newVisitorCompany }]);
    setNewVisitorName('');
    setNewVisitorEmail('');
    setNewVisitorCompany('');
  };

  const handleRemoveVisitor = (index: number) => {
    setVisitors(visitors.filter((_, idx) => idx !== index));
  };

  // Submit main reservation
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Credit quota validation
    if (currentUser.role === 'Member' && currentUser.remainingCredits < creditCost) {
      if (confirm(`You only have ${currentUser.remainingCredits} credits, but this booking costs ${creditCost} credits. Would you like to proceed? your credits will go into negative.`)) {
        // Allow for prototype demo, or we can enforce
      } else {
        return;
      }
    }

    if (!isSlotAvailable) {
      alert('The workspace is not available during the chosen slot. You can join the waiting list instead.');
      return;
    }

    if (currentUser.role === 'Visitor') {
      setIsProcessingPayment(true);
      setTimeout(() => {
        setIsProcessingPayment(false);
        setPaymentSuccess(true);
        setTimeout(() => {
          proceedSubmit();
        }, 1200);
      }, 1800);
    } else {
      proceedSubmit();
    }
  };

  const proceedSubmit = () => {
    const bookingData: Omit<Booking, 'id' | 'bookingRef' | 'createdAt'> = {
      workspaceId: selectedWorkspace.id,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      userRole: currentUser.role,
      date,
      startTime,
      endTime,
      status: selectedWorkspace.type === 'Conference Room' ? 'Pending Approval' : 'Confirmed', // FR-2.2 VIP/Conf approvals
      purpose,
      attendeeCount,
      visitors: visitors.map((v, i) => ({
        id: `v-${Date.now()}-${i}`,
        ...v,
        status: 'Registered',
      })),
      specialRequests,
      internalNotes,
    };

    onSubmitBooking(bookingData, recurrenceType, recurrenceCount);
  };

  const handleJoinWaitlist = () => {
    onSubmitWaitlist({
      workspaceId: selectedWorkspace.id,
      date,
      startTime,
      endTime,
    });
  };

  return (
    <div id="booking-form-panel" className="relative max-w-4xl mx-auto bg-white text-slate-800 rounded-xl border border-slate-200 shadow-md overflow-hidden">
      {/* Visitor Checkout Overlays */}
      {isProcessingPayment && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin mb-4"></div>
          <h3 className="text-lg font-extrabold text-slate-800">Processing Secure Payment...</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            We are securely authorizing <strong>${creditCost}.00 USD</strong> from your card with our simulated test gateway. Please do not close this window.
          </p>
          <div className="mt-4 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-mono text-slate-500">
            TRANSACTION GATEWAY ST_SIM_94883
          </div>
        </div>
      )}

      {paymentSuccess && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-4 scale-110 transition-transform duration-500">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-800">Simulated Payment Approved!</h3>
          <p className="text-xs text-slate-600 max-w-sm mt-1">
            Charge of <strong>${creditCost}.00 USD</strong> processed successfully! Creating your secure reservation ticket...
          </p>
        </div>
      )}

      {/* Form Header */}
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <button
          id="btn-back-to-search"
          onClick={onBack}
          className="flex items-center gap-1.5 text-slate-600 hover:text-indigo-600 text-xs font-bold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-indigo-600" />
          <span>Back to Workspaces</span>
        </button>
        <h2 className="font-extrabold text-slate-800 text-sm md:text-base">
          Configure Reservation Request
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3">
        {/* Left column: Summary Info */}
        <div className="p-6 bg-slate-50 border-r border-slate-100 space-y-6">
          <div className="space-y-3">
            <h3 className="font-bold text-indigo-600 text-xs font-mono uppercase tracking-wider">Workspace Summary</h3>
            <div className="aspect-video rounded-lg overflow-hidden border border-slate-200">
              <img src={selectedWorkspace.image} alt={selectedWorkspace.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-bold uppercase font-mono tracking-wide">
                {selectedWorkspace.type}
              </span>
              <h4 className="font-extrabold text-slate-800 text-lg mt-1">{selectedWorkspace.name}</h4>
              <p className="text-xs text-slate-500 mt-1">{selectedWorkspace.floor} • {selectedWorkspace.zone}</p>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 space-y-3.5">
            <h4 className="text-xs font-bold font-mono text-indigo-600 uppercase tracking-wide">Cost Breakdown</h4>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Base Hourly Rate</span>
              <span className="font-bold text-slate-800 font-mono">${selectedWorkspace.baseHourlyRate}/hr</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Calculated Duration</span>
              <span className="font-bold text-slate-800 font-mono">{durationInHours} {durationInHours === 1 ? 'hour' : 'hours'}</span>
            </div>
            {currentUser.role === 'Visitor' ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="text-xs font-extrabold text-emerald-950 font-sans">Card Checkout Cost</div>
                    <div className="text-[10px] text-emerald-700 font-bold">Standard Visitor Rate</div>
                  </div>
                </div>
                <span className="font-extrabold text-emerald-600 text-lg font-mono">${creditCost}.00</span>
              </div>
            ) : (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  <div>
                    <div className="text-xs font-extrabold text-indigo-950 font-sans">Required Credits</div>
                    <div className="text-[10px] text-indigo-700 font-bold">You have {currentUser.remainingCredits} left</div>
                  </div>
                </div>
                <span className="font-extrabold text-indigo-600 text-lg font-mono">{creditCost} Cr</span>
              </div>
            )}
          </div>

          {selectedWorkspace.type === 'Conference Room' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <Shield className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 leading-relaxed">
                <span className="font-extrabold">Manager Approval Required:</span> Conference rooms require approval by a Facility Manager before reservation confirmation.
              </div>
            </div>
          )}
        </div>

        {/* Right column: Form Fields */}
        <form onSubmit={handleSubmit} className="p-6 lg:col-span-2 space-y-6">
          {/* Main Booking Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold font-mono text-indigo-600 uppercase tracking-wider border-b border-slate-100 pb-1.5">1. Schedule and Size</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="booking-form-date" className="text-xs font-extrabold text-slate-500">Booking Date</label>
                <div className="relative">
                  <input
                    id="booking-form-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-white text-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="booking-form-start" className="text-xs font-extrabold text-slate-500">Start Time</label>
                <input
                  id="booking-form-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-white text-slate-800 focus:outline-none focus:border-indigo-500 font-mono text-center"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="booking-form-end" className="text-xs font-extrabold text-slate-500">End Time</label>
                <input
                  id="booking-form-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-white text-slate-800 focus:outline-none focus:border-indigo-500 font-mono text-center"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="booking-form-attendees" className="text-xs font-extrabold text-slate-500">Expected Attendance</label>
                <div className="relative">
                  <input
                    id="booking-form-attendees"
                    type="number"
                    min="1"
                    max={selectedWorkspace.capacity}
                    value={attendeeCount}
                    onChange={(e) => setAttendeeCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-sm border border-slate-200 rounded-lg p-2 pl-8 bg-white text-slate-800 focus:outline-none focus:border-indigo-500"
                    required
                  />
                  <Users className="w-4 h-4 text-slate-400 absolute left-2.5 top-3" />
                </div>
                <p className="text-[10px] text-slate-500 font-bold">Capacity limit: up to {selectedWorkspace.capacity} seats</p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="booking-form-purpose" className="text-xs font-extrabold text-slate-500">Booking Purpose</label>
                <input
                  id="booking-form-purpose"
                  type="text"
                  placeholder="e.g. Client presentation, deep work sprint"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-white text-slate-800 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Recurrence Pattern Configuration */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold font-mono text-indigo-600 uppercase tracking-wider border-b border-slate-100 pb-1.5">2. Recurrence Rules (FR-2.8)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-1.5 md:col-span-2">
                <label htmlFor="booking-form-recurrence" className="text-xs font-extrabold text-slate-500">Recurrence Pattern</label>
                <select
                  id="booking-form-recurrence"
                  value={recurrenceType}
                  onChange={(e) => setRecurrenceType(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-white text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="none">One-time Reservation (No Recurrence)</option>
                  <option value="daily">Daily Recurrence</option>
                  <option value="weekly">Weekly Recurrence</option>
                  <option value="monthly">Monthly Recurrence</option>
                </select>
              </div>

              {recurrenceType !== 'none' && (
                <div className="space-y-1.5">
                  <label htmlFor="booking-form-recurrence-count" className="text-xs font-extrabold text-slate-500">Occurrences Count</label>
                  <input
                    id="booking-form-recurrence-count"
                    type="number"
                    min="2"
                    max="12"
                    value={recurrenceCount}
                    onChange={(e) => setRecurrenceCount(Math.min(12, Math.max(2, parseInt(e.target.value) || 2)))}
                    className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-white text-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-500">Capped at 12 events max (Q13)</p>
                </div>
              )}
            </div>
            {recurrenceType !== 'none' && (
              <div className="bg-indigo-50 rounded-lg p-3 text-xs text-indigo-750 border border-indigo-200 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>
                  <strong>BR-06 Compliance:</strong> Overlapping occurrences will be flagged for resolution while available slots are confirmed automatically!
                </span>
              </div>
            )}
          </div>

          {/* Visitor Management Pre-registration */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold font-mono text-indigo-600 uppercase tracking-wider border-b border-slate-100 pb-1.5">3. Pre-Register Visitors (FR-5.1)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
              <div className="space-y-1">
                <label htmlFor="visitor-name-input" className="text-[10px] font-extrabold text-slate-500">Visitor Name</label>
                <input
                  id="visitor-name-input"
                  type="text"
                  placeholder="John Doe"
                  value={newVisitorName}
                  onChange={(e) => setNewVisitorName(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded p-1.5 bg-white text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="visitor-email-input" className="text-[10px] font-extrabold text-slate-500">Visitor Email</label>
                <input
                  id="visitor-email-input"
                  type="email"
                  placeholder="john@work.com"
                  value={newVisitorEmail}
                  onChange={(e) => setNewVisitorEmail(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded p-1.5 bg-white text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1 flex gap-1">
                <div className="flex-1">
                  <label htmlFor="visitor-company-input" className="text-[10px] font-extrabold text-slate-500">Company (Optional)</label>
                  <input
                    id="visitor-company-input"
                    type="text"
                    placeholder="Acme Corp"
                    value={newVisitorCompany}
                    onChange={(e) => setNewVisitorCompany(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded p-1.5 bg-white text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  id="btn-add-visitor"
                  type="button"
                  onClick={handleAddVisitor}
                  className="p-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded transition-colors self-end cursor-pointer flex items-center justify-center font-bold"
                  title="Pre-register visitor"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {visitors.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 border-b border-slate-100 font-extrabold">
                      <th className="p-2">Name</th>
                      <th className="p-2">Email</th>
                      <th className="p-2">Company</th>
                      <th className="p-2 text-center w-12">Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitors.map((v, index) => (
                      <tr key={index} className="border-b border-slate-100 last:border-0 text-slate-700">
                        <td className="p-2 font-bold text-slate-800">{v.name}</td>
                        <td className="p-2 font-mono text-slate-500">{v.email}</td>
                        <td className="p-2 text-slate-600">{v.company || '-'}</td>
                        <td className="p-2 text-center">
                          <button
                            id={`btn-remove-visitor-${index}`}
                            type="button"
                            onClick={() => handleRemoveVisitor(index)}
                            className="text-rose-600 hover:text-rose-500 font-bold cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Optional Special Requests & Notes */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold font-mono text-indigo-600 uppercase tracking-wider border-b border-slate-100 pb-1.5">4. Special Requests & Notes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="booking-form-requests" className="text-xs font-extrabold text-slate-500">Special Demands / Amenities setup</label>
                <textarea
                  id="booking-form-requests"
                  rows={2}
                  placeholder="e.g. adapters, visual displays, external catering, flip charts"
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-white text-slate-800 focus:outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              {(currentUser.role === 'Front Desk Staff' || currentUser.role === 'Facility Manager' || currentUser.role === 'System Administrator') && (
                <div className="space-y-1.5">
                  <label htmlFor="booking-form-internal-notes" className="text-xs font-extrabold text-slate-500">Internal Operational Notes (Staff Only)</label>
                  <textarea
                    id="booking-form-internal-notes"
                    rows={2}
                    placeholder="e.g. VIP guest arrival, priority desk prep, check ID card"
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    className="w-full text-sm border border-amber-200 rounded-lg p-2 bg-amber-50/50 text-slate-800 focus:outline-none focus:border-amber-500"
                  ></textarea>
                </div>
              )}
            </div>
          </div>

          {/* Section 5: Visitor Secure Checkout */}
          {currentUser.role === 'Visitor' && (
            <div id="visitor-payment-section" className="space-y-4 bg-slate-50 border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold font-mono text-emerald-600 uppercase tracking-wider">5. Secure Visitor Checkout</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                Since you are reserving as a <strong>Visitor</strong>, this reservation requires a direct card payment of <strong>${creditCost}.00 USD</strong>. Input your testing card details to pay and complete.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="card-name-input" className="text-xs font-extrabold text-slate-500">Cardholder Name</label>
                  <input
                    id="card-name-input"
                    type="text"
                    required
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-white text-slate-800 focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label htmlFor="card-number-input" className="text-xs font-extrabold text-slate-500">Card Number</label>
                  <input
                    id="card-number-input"
                    type="text"
                    required
                    placeholder="4242 4242 4242 4242"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-white text-slate-800 focus:outline-none focus:border-emerald-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="card-expiry-input" className="text-xs font-extrabold text-slate-500">Expiration Date</label>
                  <input
                    id="card-expiry-input"
                    type="text"
                    required
                    placeholder="MM/YY"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-white text-slate-800 focus:outline-none focus:border-emerald-500 font-mono font-bold text-center"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label htmlFor="card-cvc-input" className="text-xs font-extrabold text-slate-500">CVC Security Code</label>
                  <input
                    id="card-cvc-input"
                    type="text"
                    required
                    placeholder="123"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-white text-slate-800 focus:outline-none focus:border-emerald-500 font-mono font-bold text-center"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Form Actions with Validation Banner */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              {validationError && (
                <div className="flex items-start gap-1.5 text-xs font-bold text-rose-600">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{validationError}</span>
                </div>
              )}
              {isSlotAvailable && !validationError && (
                <div className="flex items-start gap-1.5 text-xs font-bold text-emerald-600">
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <span>Your selected slot is available and validated against all business constraints!</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 sm:justify-end shrink-0">
              <button
                id="btn-cancel-reservation"
                type="button"
                onClick={onBack}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 font-bold text-xs rounded-lg transition-all cursor-pointer"
              >
                Discard
              </button>

              {isSlotAvailable ? (
                <button
                  id="btn-confirm-reservation"
                  type="submit"
                  className={`px-5 py-2 font-extrabold text-xs rounded-lg transition-all shadow-md cursor-pointer hover:scale-[1.02] flex items-center gap-1.5 ${
                    currentUser.role === 'Visitor'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'
                  }`}
                >
                  {currentUser.role === 'Visitor' ? (
                    <>
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>{selectedWorkspace.type === 'Conference Room' ? `Pay $${creditCost} & Request` : `Pay $${creditCost} & Book`}</span>
                    </>
                  ) : (
                    selectedWorkspace.type === 'Conference Room' ? 'Submit for Approval' : 'Confirm Reservation'
                  )}
                </button>
              ) : (
                <button
                  id="btn-join-waitlist-submit"
                  type="button"
                  onClick={handleJoinWaitlist}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-lg transition-all shadow-md cursor-pointer hover:scale-[1.02]"
                >
                  Join Waiting List Queue
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
