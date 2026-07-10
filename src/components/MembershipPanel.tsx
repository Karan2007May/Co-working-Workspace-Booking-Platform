/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { User, MembershipPlan } from '../types';
import { db } from '../mockData';
import { Award, CreditCard, Sparkles, PlusCircle, CheckCircle2, ShieldAlert, Edit2, Trash2 } from 'lucide-react';

interface MembershipPanelProps {
  currentUser: User;
  membershipPlans: MembershipPlan[];
  onUpdatePlans: (plans: MembershipPlan[]) => void;
  onRefreshData: () => void;
  onAddNotification?: (title: string, body: string, type: 'email' | 'system' | 'waitlist') => void;
}

export default function MembershipPanel({
  currentUser,
  membershipPlans,
  onUpdatePlans,
  onRefreshData,
  onAddNotification,
}: MembershipPanelProps) {
  const isAdmin = currentUser.role === 'System Administrator';

  // State for creating/editing plans
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Form states
  const [planName, setPlanName] = useState<string>('');
  const [planPrice, setPlanPrice] = useState<number>(0);
  const [planCredits, setPlanCredits] = useState<number>(0);
  const [planValidity, setPlanValidity] = useState<number>(1);
  const [planDesc, setPlanDesc] = useState<string>('');
  const [planEntitlements, setPlanEntitlements] = useState<string>('');

  // Purchasing states
  const [purchasingPlan, setPurchasingPlan] = useState<MembershipPlan | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<boolean>(false);
  const [cardName, setCardName] = useState<string>(currentUser.name);
  const [cardNumber, setCardNumber] = useState<string>('4111 5567 8901 2345');
  const [cardExpiry, setCardExpiry] = useState<string>('09/29');
  const [cardCvc, setCardCvc] = useState<string>('558');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Active membership for the current user
  const userPlan = useMemo(() => {
    return membershipPlans.find((p) => p.id === currentUser.membershipPlanId);
  }, [membershipPlans, currentUser]);

  const handleEditPlan = (plan: MembershipPlan) => {
    setEditingPlan(plan);
    setPlanName(plan.name);
    setPlanPrice(plan.price);
    setPlanCredits(plan.credits);
    setPlanValidity(plan.validityMonths);
    setPlanDesc(plan.description);
    setPlanEntitlements(plan.entitlements.join(', '));
    setIsCreating(false);
  };

  const handleStartCreate = () => {
    setEditingPlan(null);
    setPlanName('');
    setPlanPrice(100);
    setPlanCredits(40);
    setPlanValidity(1);
    setPlanDesc('');
    setPlanEntitlements('High-speed Wi-Fi, Coffee & Tea, Meeting room hours');
    setIsCreating(true);
  };

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planName.trim() || !planDesc.trim()) {
      alert('Plan Name and Description are required.');
      return;
    }

    const entitlementsArray = planEntitlements
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item !== '');

    if (isCreating) {
      const newPlan: MembershipPlan = {
        id: `plan-${Date.now()}`,
        name: planName,
        price: planPrice,
        credits: planCredits,
        validityMonths: planValidity,
        description: planDesc,
        status: 'Active',
        entitlements: entitlementsArray,
      };

      const updated = [...membershipPlans, newPlan];
      onUpdatePlans(updated);
      db.addAuditLog(
        'Membership Plan Creation',
        currentUser.id,
        currentUser.name,
        currentUser.role,
        `Created new membership plan: ${planName}`,
        'Membership Management',
        undefined,
        JSON.stringify(newPlan)
      );
    } else if (editingPlan) {
      const updated = membershipPlans.map((p) => {
        if (p.id === editingPlan.id) {
          return {
            ...p,
            name: planName,
            price: planPrice,
            credits: planCredits,
            validityMonths: planValidity,
            description: planDesc,
            entitlements: entitlementsArray,
          };
        }
        return p;
      });
      onUpdatePlans(updated);
      db.addAuditLog(
        'Membership Plan Modification',
        currentUser.id,
        currentUser.name,
        currentUser.role,
        `Modified membership plan ID ${editingPlan.id}`,
        'Membership Management',
        JSON.stringify(editingPlan),
        JSON.stringify({ name: planName, price: planPrice, credits: planCredits, description: planDesc })
      );
    }

    setIsCreating(false);
    setEditingPlan(null);
    onRefreshData();
  };

  const handleTogglePlanStatus = (planId: string) => {
    const updated = membershipPlans.map((p) => {
      if (p.id === planId) {
        const nextStatus: 'Active' | 'Inactive' = p.status === 'Active' ? 'Inactive' : 'Active';
        db.addAuditLog(
          'Membership Plan Deactivation',
          currentUser.id,
          currentUser.name,
          currentUser.role,
          `Toggled status for membership plan ${p.name} to ${nextStatus}`,
          'Membership Management',
          p.status,
          nextStatus
        );
        return {
          ...p,
          status: nextStatus,
        };
      }
      return p;
    });
    onUpdatePlans(updated);
    onRefreshData();
  };

  const handleInitiatePurchase = (plan: MembershipPlan) => {
    setPurchasingPlan(plan);
    setPurchaseSuccess(false);
    setCardName(currentUser.name);
  };

  const handleConfirmPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardName.trim() || !cardNumber.trim()) {
      alert('Cardholder Name and Card Number are required.');
      return;
    }
    setIsProcessing(true);

    setTimeout(() => {
      // 1. Update user role and subscription
      const list = db.getUsers();
      const updated = list.map((u) => {
        if (u.id === currentUser.id) {
          return {
            ...u,
            role: 'Member' as const,
            membershipPlanId: purchasingPlan!.id,
            remainingCredits: u.remainingCredits + purchasingPlan!.credits,
          };
        }
        return u;
      });
      db.setUsers(updated);

      // 2. Log in security audit
      db.addAuditLog(
        'Membership Purchase',
        currentUser.id,
        currentUser.name,
        'Member',
        `Purchased ${purchasingPlan!.name} Membership. Upgraded role to Member. Loaded ${purchasingPlan!.credits} credits.`,
        'Membership Management',
        undefined,
        JSON.stringify({ planId: purchasingPlan!.id, price: purchasingPlan!.price, creditsAdded: purchasingPlan!.credits })
      );

      // 3. Simulated notification
      if (onAddNotification) {
        onAddNotification(
          'Membership Subscription Confirmed',
          `Welcome to Co-Space Premium, ${currentUser.name}! Your account is now upgraded to Member and loaded with ${purchasingPlan!.credits} credits.`,
          'system'
        );
      }

      setIsProcessing(false);
      setPurchaseSuccess(true);
      onRefreshData();
    }, 1500);
  };

  const handleDeactivatePlan = () => {
    if (confirm("Are you sure you want to deactivate your current subscription plan? Your account role will return to Visitor (Pay-as-you-go).")) {
      const list = db.getUsers();
      const updated = list.map((u) => {
        if (u.id === currentUser.id) {
          return {
            ...u,
            role: 'Visitor' as const,
            membershipPlanId: undefined,
            remainingCredits: 0,
          };
        }
        return u;
      });
      db.setUsers(updated);

      db.addAuditLog(
        'Membership Deactivation',
        currentUser.id,
        currentUser.name,
        'Visitor',
        `Deactivated active membership plan. Downgraded role to Visitor (Pay-as-you-go).`,
        'Membership Management',
        undefined,
        JSON.stringify({ userId: currentUser.id })
      );

      if (onAddNotification) {
        onAddNotification(
          'Membership Deactivated',
          `Your membership plan has been deactivated. Your account has returned to Visitor (Pay-as-you-go).`,
          'system'
        );
      }

      onRefreshData();
    }
  };

  return (
    <div id="membership-module" className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Member Status Board */}
        <div className="lg:col-span-1 space-y-6">
          {isAdmin ? (
            <div className="bg-gradient-to-br from-indigo-950 to-slate-900 text-white rounded-xl shadow-md overflow-hidden p-6 relative border border-slate-800">
              <div className="absolute right-4 top-4 opacity-10">
                <Award className="w-32 h-32" />
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-400" />
                  <span className="text-xs uppercase tracking-wider font-mono font-bold text-indigo-200">
                    Plan Settings Admin
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold font-sans">System Administrator</h3>
                  <p className="text-xs text-indigo-200 mt-1">
                    You are in System Configuration Mode. You can configure and manage the organization-wide subscription tiers.
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/10 text-xs text-indigo-100 space-y-2">
                  <div className="font-bold">Admin Capabilities:</div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-indigo-200">
                    <li>Configure new pricing tiers</li>
                    <li>Toggle active plans</li>
                    <li>Control credit volumes</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-gradient-to-br from-blue-950 to-slate-900 text-white rounded-xl shadow-md overflow-hidden p-6 relative border border-slate-800">
                <div className="absolute right-4 top-4 opacity-10">
                  <Award className="w-32 h-32" />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-400" />
                    <span className="text-xs uppercase tracking-wider font-mono font-bold text-blue-200">
                      Subscription Status
                    </span>
                  </div>

                  {userPlan ? (
                    <div>
                      <h3 className="text-xl font-bold font-sans">{userPlan.name}</h3>
                      <p className="text-xs text-blue-200 mt-1">{userPlan.description}</p>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-xl font-bold font-sans text-rose-300">No Active Plan</h3>
                      <p className="text-xs text-slate-300 mt-1">Book on a pay-per-use guest tier.</p>
                    </div>
                  )}

                  {/* Remaining credits quota block */}
                  <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/10 flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-blue-300" />
                      <div>
                        <div className="text-xs text-blue-200 font-sans">Available Booking Credits</div>
                        <div className="text-[10px] text-blue-300">Refreshes monthly</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-extrabold font-mono text-white">
                        {currentUser.remainingCredits}
                      </span>
                      <span className="text-xs text-blue-200 block">Credits</span>
                    </div>
                  </div>

                  {userPlan && (
                    <div className="text-[10px] text-blue-200 font-mono space-y-1 pt-2">
                      <div className="flex justify-between">
                        <span>Valid Term:</span>
                        <span>{userPlan.validityMonths} Month(s)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Next Renewal Date:</span>
                        <span>2026-08-01 (Active)</span>
                      </div>
                    </div>
                  )}

                  {/* Warning on Low Credits (BR-4.3) */}
                  {currentUser.role === 'Member' && currentUser.remainingCredits <= 15 && (
                    <div className="bg-rose-500/20 border border-rose-500/30 rounded-lg p-3 flex items-start gap-2 text-rose-200 text-xs">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-300" />
                      <span>
                        <strong>Low Balance Alarm:</strong> Your booking quota is running low! Please recharge or upgrade your plan to prevent booking restrictions.
                      </span>
                    </div>
                  )}

                  {/* Deactivate Option (Option for everyone to deactivate their plan and buy another one) */}
                  {userPlan && (
                    <div className="pt-2 border-t border-white/10">
                      <button
                        id="btn-deactivate-user-plan"
                        onClick={handleDeactivatePlan}
                        className="w-full px-4 py-2 bg-rose-600/80 hover:bg-rose-700 text-white font-extrabold text-xs rounded-lg shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span>Deactivate Current Plan</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Plan Entitlements checklist */}
              {userPlan && (
                <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold font-mono text-slate-500 uppercase tracking-wide">
                    My Plan Entitlements
                  </h4>
                  <div className="space-y-2">
                    {userPlan.entitlements.map((ent, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>{ent}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Side: Available plans & Administration */}
        <div className="lg:col-span-2 space-y-6">
          {purchasingPlan ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden text-slate-200 font-sans">
              <div className="bg-gradient-to-tr from-slate-950 to-indigo-950 p-6 border-b border-indigo-500/20 relative">
                <div className="absolute right-6 top-6 opacity-10">
                  <CreditCard className="w-24 h-24 text-white" />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] bg-indigo-500/30 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                    Secured Sandbox checkout
                  </span>
                  <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-200 to-pink-400">Complete Subscription Upgrade</h3>
                  <p className="text-slate-400 text-xs">
                    Authorize payment to activate your Premium Workspace Membership.
                  </p>
                </div>
              </div>

              {purchaseSuccess ? (
                <div id="checkout-success-panel" className="p-8 text-center space-y-6">
                  <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-black text-white">🎉 Subscription Activated!</h4>
                    <p className="text-slate-300 text-xs max-w-md mx-auto leading-relaxed">
                      Thank you! Your visitor account has been successfully upgraded. You are now a registered <strong>Member</strong> under the <strong>{purchasingPlan.name} Plan</strong>.
                    </p>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 max-w-md mx-auto text-left space-y-3 font-mono text-xs">
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-500">Subscriber Name:</span>
                      <span className="text-slate-200 font-bold">{currentUser.name}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-500">Membership Tier:</span>
                      <span className="text-slate-200 font-bold">{purchasingPlan.name}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-500">Credits Credited:</span>
                      <span className="text-emerald-400 font-extrabold font-sans">+{purchasingPlan.credits} Credits</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Transaction Status:</span>
                      <span className="text-emerald-400 font-bold">Approved (ID: TXN-{Date.now().toString().slice(-6)})</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      id="btn-checkout-complete"
                      onClick={() => {
                        setPurchasingPlan(null);
                        setPurchaseSuccess(false);
                        onRefreshData();
                      }}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-pink-600 hover:from-blue-500 hover:to-pink-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all hover:scale-105 animate-pulse"
                    >
                      Enter Member Workspace
                    </button>
                  </div>
                </div>
              ) : (
                <form id="checkout-payment-form" onSubmit={handleConfirmPurchase} className="p-6 space-y-5 bg-slate-950">
                  <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-xl p-4 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-indigo-400 block uppercase font-mono tracking-wider text-[9px]">Plan Selected</span>
                      <span className="font-bold text-slate-200 text-sm">{purchasingPlan.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-indigo-400 block uppercase font-mono tracking-wider text-[9px]">Billing Cycle</span>
                      <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-pink-400 text-sm">${purchasingPlan.price} / month</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label htmlFor="checkout-card-name" className="text-xs font-semibold text-slate-400">Cardholder Name</label>
                      <input
                        id="checkout-card-name"
                        type="text"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        className="w-full text-xs border border-slate-800 rounded p-2.5 bg-slate-900 text-white focus:outline-none focus:border-indigo-500 focus:bg-slate-900 transition-colors"
                        required
                        placeholder="Name on Credit Card"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="checkout-card-number" className="text-xs font-semibold text-slate-400">Credit Card Number</label>
                      <input
                        id="checkout-card-number"
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full text-xs border border-slate-800 rounded p-2.5 bg-slate-900 text-white focus:outline-none focus:border-indigo-500 focus:bg-slate-900 transition-colors font-mono"
                        required
                        placeholder="4111 2222 3333 4444"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label htmlFor="checkout-card-expiry" className="text-xs font-semibold text-slate-400">Expiration Date</label>
                        <input
                          id="checkout-card-expiry"
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="w-full text-xs border border-slate-800 rounded p-2.5 bg-slate-900 text-white focus:outline-none focus:border-indigo-500 focus:bg-slate-900 transition-colors font-mono"
                          required
                          placeholder="MM/YY"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="checkout-card-cvc" className="text-xs font-semibold text-slate-400">Security Code (CVC)</label>
                        <input
                          id="checkout-card-cvc"
                          type="password"
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value)}
                          className="w-full text-xs border border-slate-800 rounded p-2.5 bg-slate-900 text-white focus:outline-none focus:border-indigo-500 focus:bg-slate-900 transition-colors font-mono"
                          required
                          maxLength={4}
                          placeholder="•••"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-slate-800 justify-end">
                    <button
                      id="btn-checkout-cancel"
                      type="button"
                      onClick={() => setPurchasingPlan(null)}
                      className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-lg cursor-pointer border border-slate-800"
                    >
                      Cancel Payment
                    </button>
                    <button
                      id="btn-checkout-submit"
                      type="submit"
                      disabled={isProcessing}
                      className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-pink-600 hover:from-blue-500 hover:to-pink-500 text-white font-bold text-xs rounded-lg cursor-pointer shadow flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-3.5 h-3.5 text-amber-300" />
                          <span>Authorize ${purchasingPlan.price} Payment</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg overflow-hidden">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white">Organizational Membership Plans</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Explore subscription packages and limits</p>
                </div>
                {isAdmin && (
                  <button
                    id="btn-admin-add-plan"
                    onClick={handleStartCreate}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold cursor-pointer flex items-center gap-1 shadow-sm"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Configure New Plan</span>
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-800 bg-slate-950">
                {membershipPlans.map((plan) => {
                  const isActive = plan.status === 'Active';
                  return (
                    <div key={plan.id} id={`plan-row-${plan.id}`} className="p-5 flex flex-col md:flex-row items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-200 text-sm md:text-base">{plan.name}</h4>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono ${
                              isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500 border border-slate-700'
                            }`}
                          >
                            {plan.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed max-w-lg">{plan.description}</p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {plan.entitlements.slice(0, 3).map((ent, i) => (
                            <span key={i} className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                              {ent}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex md:flex-col items-end gap-2 shrink-0 justify-between w-full md:w-auto border-t md:border-0 pt-3 md:pt-0 border-slate-800">
                        <div className="text-right">
                          <span className="text-xl font-black text-slate-200 font-mono">${plan.price}</span>
                          <span className="text-xs text-slate-500 font-medium font-sans"> / mo</span>
                          <div className="text-[10px] text-blue-400 font-mono font-bold mt-0.5">
                            {plan.credits} Credits included
                          </div>
                        </div>

                        {!isAdmin && !currentUser.membershipPlanId && plan.status === 'Active' && (
                          <button
                            id={`btn-purchase-plan-${plan.id}`}
                            onClick={() => handleInitiatePurchase(plan)}
                            className="mt-2 w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-pink-600 hover:from-blue-500 hover:to-pink-500 text-white font-bold text-xs rounded-lg shadow-md hover:shadow-lg transition-all hover:scale-105 flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            <span>Buy Membership</span>
                          </button>
                        )}

                        {isAdmin && (
                          <div className="flex items-center gap-1.5 pt-1.5">
                            <button
                              id={`btn-edit-plan-${plan.id}`}
                              onClick={() => handleEditPlan(plan)}
                              className="p-1 bg-slate-900 hover:bg-indigo-950/40 hover:text-indigo-400 text-slate-400 rounded border border-slate-800 cursor-pointer"
                              title="Edit Plan"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id={`btn-deactivate-plan-${plan.id}`}
                              onClick={() => handleTogglePlanStatus(plan.id)}
                              className={`px-2 py-1 text-[10px] font-bold rounded cursor-pointer ${
                                isActive
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                              }`}
                            >
                              {isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Editing / Creating Form Overlay */}
          {(isCreating || editingPlan) && (
            <div id="plan-form-modal" className="bg-white rounded-xl border border-slate-200 p-5 shadow-md">
              <h3 className="font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span>{isCreating ? 'Create Membership Plan' : `Modify Membership Plan: ${editingPlan?.name}`}</span>
              </h3>

              <form onSubmit={handleSavePlan} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="plan-form-name" className="text-xs font-semibold text-slate-600">Plan Name</label>
                    <input
                      id="plan-form-name"
                      type="text"
                      value={planName}
                      onChange={(e) => setPlanName(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded p-2 focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="plan-form-price" className="text-xs font-semibold text-slate-600">Pricing Monthly ($)</label>
                    <input
                      id="plan-form-price"
                      type="number"
                      value={planPrice}
                      onChange={(e) => setPlanPrice(parseInt(e.target.value) || 0)}
                      className="w-full text-xs border border-slate-200 rounded p-2 focus:outline-none focus:border-blue-500 font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="plan-form-credits" className="text-xs font-semibold text-slate-600">Credit Volume (Deduction Budget)</label>
                    <input
                      id="plan-form-credits"
                      type="number"
                      value={planCredits}
                      onChange={(e) => setPlanCredits(parseInt(e.target.value) || 0)}
                      className="w-full text-xs border border-slate-200 rounded p-2 focus:outline-none focus:border-blue-500 font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="plan-form-desc" className="text-xs font-semibold text-slate-600">Plan Description / Target Class</label>
                  <textarea
                    id="plan-form-desc"
                    rows={2}
                    value={planDesc}
                    onChange={(e) => setPlanDesc(e.target.value)}
                    placeholder="Provide a description of who this plan is tailored for."
                    className="w-full text-xs border border-slate-200 rounded p-2 focus:outline-none focus:border-blue-500"
                    required
                  ></textarea>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="plan-form-entitlements" className="text-xs font-semibold text-slate-600">Entitlements checklist (Comma-separated)</label>
                  <input
                    id="plan-form-entitlements"
                    type="text"
                    value={planEntitlements}
                    onChange={(e) => setPlanEntitlements(e.target.value)}
                    placeholder="e.g. 24/7 access, 10 hours meeting room space, high-speed Wi-Fi, community events"
                    className="w-full text-xs border border-slate-200 rounded p-2 focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-400">Separate features with commas to display as checkbox list items.</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    id="btn-cancel-plan-form"
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setEditingPlan(null);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded cursor-pointer"
                  >
                    Discard Changes
                  </button>
                  <button
                    id="btn-save-plan-form"
                    type="submit"
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded shadow cursor-pointer"
                  >
                    Save Plan Settings
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
