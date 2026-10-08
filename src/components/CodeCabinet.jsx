import React, { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Ticket, KeyRound, CheckCircle2, Zap, Calendar, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useTable, useCurrentMember } from "../lib/useData";
import { supabase } from "../lib/supabase";
import { formatDate, maintenanceStatus, LEVEL_CONFIG, MAX_BONUS_LEVEL } from "../lib/helpers";

const DAY_NAMES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, ... 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // Monday as start
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekRange(start) {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startStr = formatDate(start, "MMM d");
  const endStr = formatDate(end, "MMM d");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisWeekStart = getWeekStart(today);
  const isThisWeek = start.getTime() === thisWeekStart.getTime();
  return `${startStr} – ${endStr}${isThisWeek ? " (this week)" : ""}`;
}

function getTimeUntilWeekEnd() {
  const now = new Date();
  const end = getWeekStart(now);
  end.setDate(end.getDate() + 7); // next Monday 00:00
  let diff = Math.floor((end - now) / 1000);
  const days = Math.floor(diff / 86400);
  diff -= days * 86400;
  const h = Math.floor(diff / 3600);
  diff -= h * 3600;
  const m = Math.floor(diff / 60);
  const s = diff - m * 60;
  return `${days}d ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getPhilippineTime() {
  return new Date().toLocaleTimeString("en-US", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }) + " (Philippine Standard Time)";
}

export default function CodeCabinet() {
  const [weekOffset, setWeekOffset] = useState(0); // 0 = this week, -1 = last week, etc.
  const [phTime, setPhTime] = useState(getPhilippineTime());
  const [weekCountdown, setWeekCountdown] = useState(getTimeUntilWeekEnd());
  const [redeemingId, setRedeemingId] = useState(null);

  const { data: members = [] } = useTable("members");
  const { data: allCodes = [], refetch: refetchCodes } = useTable("maintenance_codes");
  const { currentMember } = useCurrentMember(members);

  // Tick clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      setPhTime(getPhilippineTime());
      setWeekCountdown(getTimeUntilWeekEnd());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  async function handleRedeem(codeRecord) {
    setRedeemingId(codeRecord.id);
    try {
      // Mark code as used
      await supabase
        .from("maintenance_codes")
        .update({
          is_used: true,
          used_by_member_id: currentMember.id,
          used_at: new Date().toISOString(),
        })
        .eq("id", codeRecord.id);
      // Record redemption as a transaction
      await supabase.from("transactions").insert({
        member_id: currentMember.id,
        type: "maintenance_code",
        amount: 0,
        description: `Redeemed maintenance code: ${codeRecord.code}`,
        status: "completed",
      });
      // Fetch fresh data so upline maintenance status is accurate
      const { data: freshMembers } = await supabase.from("members").select("*");
      const { data: freshCodes } = await supabase.from("maintenance_codes").select("*");
      const freshMember = (freshMembers || members).find(m => m.id === currentMember.id);
      if (freshMember && freshMember.status !== "approved") {
        toast.success("Code redeemed. You must be placed under an upline before commissions are distributed.");
      } else {
        await distributeUplineBonuses(currentMember, freshMembers || members, freshCodes || allCodes);
        toast.success("Code redeemed successfully! Upline bonuses distributed.");
      }
      refetchCodes();
    } catch (err) {
      toast.error(err.message || "Failed to redeem code");
    }
    setRedeemingId(null);
  }

  async function distributeUplineBonuses(member, allMembers, allCodesData) {
    const canEarn = (m) => {
      if (!m || m.status !== "approved") return false;
      return maintenanceStatus(m, allCodesData).isGreen;
    };
    let current = member;
    for (let level = 1; level <= MAX_BONUS_LEVEL; level++) {
      const upline = allMembers.find(m => m.id === current.referrer_id);
      if (!upline) break;
      if (canEarn(upline)) {
        const bonus = LEVEL_CONFIG.find(l => l.level === level)?.bonus_amount || 0;
        if (bonus > 0) {
          await supabase.from("transactions").insert({
            member_id: upline.id,
            type: "referral_bonus",
            amount: bonus,
            bonus_level: level,
            description: `Level ${level} bonus from ${member.username}`,
            status: "completed",
            from_member_id: member.id,
          });
        }
      }
      current = upline;
    }
  }

  const availableCodes = useMemo(
    () => allCodes.filter(c => !c.is_used && c.assigned_username === currentMember?.username),
    [allCodes, currentMember]
  );

  const redeemedCodes = useMemo(
    () => allCodes.filter(c => c.is_used && c.used_by_member_id === currentMember?.id).sort((a, b) => new Date(b.used_at) - new Date(a.used_at)),
    [allCodes, currentMember]
  );

  // Weekly redeemed codes for the selected week
  const weekStart = useMemo(() => {
    const base = getWeekStart(new Date());
    base.setDate(base.getDate() + weekOffset * 7);
    return base;
  }, [weekOffset]);

  const weekEnd = useMemo(() => {
    const e = new Date(weekStart);
    e.setDate(e.getDate() + 6);
    e.setHours(23, 59, 59, 999);
    return e;
  }, [weekStart]);

  const weeklyRedeemed = useMemo(
    () => redeemedCodes.filter(c => {
      const d = new Date(c.used_at);
      return d >= weekStart && d <= weekEnd;
    }),
    [redeemedCodes, weekStart, weekEnd]
  );

  // Count per day (Mon=0 ... Sun=6)
  const dayCounts = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    weeklyRedeemed.forEach(c => {
      const d = new Date(c.used_at);
      const dayIdx = (d.getDay() + 6) % 7; // Mon=0 ... Sun=6
      counts[dayIdx]++;
    });
    return counts;
  }, [weeklyRedeemed]);

  const weeklyTotal = weeklyRedeemed.length;
  const weeklyTarget = 5;
  const needed = Math.max(0, weeklyTarget - weeklyTotal);

  // Auto-redeem next time (placeholder display)
  const autoRedeemEnabled = availableCodes.length > 0;
  const nextRedeemText = autoRedeemEnabled
    ? `Tomorrow at 5:52 PM (Philippine Standard Time) · ${availableCodes.length} code${availableCodes.length !== 1 ? "s" : ""} queued`
    : "No codes queued";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Title section */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl flex items-center justify-center shadow-lg">
            <Ticket className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Code Cabinet</h1>
            <p className="text-gray-500 text-sm mt-1 max-w-2xl">
              Codes assigned to you by the store. Redemption unlocks when your 12-hour maintenance cycle has 2 hours remaining.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Two status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex items-center gap-5">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0">
            <KeyRound className="w-7 h-7 text-blue-500" />
          </div>
          <div>
            <p className="text-4xl font-extrabold text-gray-900">{availableCodes.length}</p>
            <p className="text-sm text-gray-500 font-medium">Available to redeem</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex items-center gap-5">
          <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-7 h-7 text-green-500" />
          </div>
          <div>
            <p className="text-4xl font-extrabold text-gray-900">{redeemedCodes.length}</p>
            <p className="text-sm text-gray-500 font-medium">Redeemed</p>
          </div>
        </motion.div>
      </div>

      {/* Auto-Redeem section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-amber-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Auto-Redeem</h2>
        </div>
        <div className="p-5">
          <p className="text-gray-600 text-sm leading-relaxed">
            Redeems one available code for you automatically once a day at the start time set by the admin. It runs on the server, so you don't need to keep the app open.
          </p>
          <p className="text-gray-400 text-xs mt-3">Current time: {phTime}</p>
          <div className="mt-4 flex items-center gap-2">
            <span className={`text-sm font-medium ${autoRedeemEnabled ? "text-green-600" : "text-gray-400"}`}>
              {autoRedeemEnabled ? "Next code " : "No codes queued"}
            </span>
            {autoRedeemEnabled && (
              <span className="text-sm text-green-600 font-medium">{nextRedeemText}</span>
            )}
          </div>
        </div>
      </motion.div>

      {/* My Weekly Redeemed Codes section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
            <Calendar className="w-5 h-5 text-indigo-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">My Weekly Redeemed Codes</h2>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setWeekOffset(w => w - 1)}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-gray-700 min-w-[180px] text-center">{formatWeekRange(weekStart)}</span>
            <button onClick={() => setWeekOffset(w => w + 1)} disabled={weekOffset >= 0}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:pointer-events-none">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-5">
          <p className="text-gray-500 text-sm mb-4">Minimum 5 redeemed codes every calendar week (Monday – Sunday).</p>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-semibold text-gray-500 uppercase text-xs">User</th>
                  {DAY_NAMES.map((day, i) => {
                    const date = new Date(weekStart);
                    date.setDate(date.getDate() + i);
                    return (
                      <th key={day} className="text-center py-2 px-2 font-semibold text-gray-500 uppercase text-xs whitespace-nowrap">
                        {day} <span className="text-gray-400">{formatDate(date, "d")}</span>
                      </th>
                    );
                  })}
                  <th className="text-center py-2 px-3 font-semibold text-gray-500 uppercase text-xs">Total</th>
                  <th className="text-center py-2 px-3 font-semibold text-gray-500 uppercase text-xs">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-3 font-medium text-gray-900">@{currentMember?.username || "—"}</td>
                  {dayCounts.map((count, i) => (
                    <td key={i} className="text-center py-3 px-2 text-gray-400">
                      {count > 0 ? <span className="font-semibold text-gray-900">{count}</span> : "—"}
                    </td>
                  ))}
                  <td className="text-center py-3 px-3 font-bold text-gray-900">{weeklyTotal}/{weeklyTarget}</td>
                  <td className="text-center py-3 px-3">
                    {needed > 0 ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                        {needed} more needed
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Complete
                      </span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-purple-600 text-sm font-medium mt-4">Week ends in {weekCountdown}</p>
        </div>
      </motion.div>

      {/* Available Codes section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-blue-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Available Codes</h2>
        </div>
        <div className="p-5">
          {availableCodes.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-400 text-sm">No codes assigned to you yet. When a store sends you a code, it will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {availableCodes.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-blue-50 rounded-xl px-4 py-3">
                  <code className="font-mono text-sm font-bold text-blue-700">{c.code}</code>
                  <button
                    onClick={() => handleRedeem(c)}
                    disabled={redeemingId === c.id}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {redeemingId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                    {redeemingId === c.id ? "Redeeming..." : "Redeem"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Redeemed Codes section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-gray-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Redeemed Codes</h2>
        </div>
        <div className="p-5">
          {redeemedCodes.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-400 text-sm">No redeemed codes yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {redeemedCodes.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-gray-100 rounded-xl px-4 py-3">
                  <code className="font-mono text-sm font-bold text-gray-400">{c.code}</code>
                  <span className="text-xs text-gray-400">{formatDate(c.used_at, "MMM d, yyyy h:mm a")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
