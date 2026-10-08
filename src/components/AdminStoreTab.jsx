import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Plus, Ticket, Calendar, Tickets, ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabase";
import { generateReferralCode, formatDate } from "../lib/helpers";

export default function AdminStoreTab({ members, codes, refetchCodes, currentAdminUsername, onRemoveStore }) {
  const [storeSelect, setStoreSelect] = useState("");
  const [codeCount, setCodeCount] = useState("50");
  const [adding, setAdding] = useState(false);
  const [overviewFilter, setOverviewFilter] = useState("");
  const [historyFilter, setHistoryFilter] = useState("");
  const [unusedFilter, setUnusedFilter] = useState("");

  const storeMembers = useMemo(
    () => members.filter(m => m.role === "store" && m.status !== "deleted"),
    [members]
  );

  // Per-store stats
  const storeStats = useMemo(() => {
    return storeMembers.map(s => {
      const allotted = codes.filter(c => c.assigned_sub_admin_id === s.id);
      const generated = codes.filter(c => c.generated_by_member_id === s.id);
      const remaining = Math.max(0, allotted.length - generated.length);
      const lastAdded = allotted
        .map(c => c.created_at)
        .sort((a, b) => new Date(b) - new Date(a))[0] || null;
      return { store: s, allotted: allotted.length, generated: generated.length, remaining, lastAdded, allottedCodes: allotted };
    });
  }, [storeMembers, codes]);

  // Code Allotment History — group allotted codes by store + creation batch
  const allotmentHistory = useMemo(() => {
    const rows = [];
    storeMembers.forEach(s => {
      const allotted = codes.filter(c => c.assigned_sub_admin_id === s.id);
      // Group by exact timestamp minute to identify batch additions
      const batches = {};
      allotted.forEach(c => {
        const key = formatDate(c.created_at, "MMM d, yyyy h:mm a");
        if (!batches[key]) batches[key] = { date: key, storeId: s.id, storeUsername: s.username, count: 0 };
        batches[key].count++;
      });
      Object.values(batches).forEach(b => rows.push(b));
    });
    return rows.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [storeMembers, codes]);

  // Store Generated Codes (unused)
  const unusedStoreCodes = useMemo(() => {
    const rows = [];
    storeMembers.forEach(s => {
      codes
        .filter(c => c.generated_by_member_id === s.id && !c.is_used)
        .forEach(c => {
          rows.push({
            storeUsername: s.username,
            code: c.code,
            designatedTo: c.assigned_username || null,
            date: c.created_at,
            id: c.id,
          });
        });
    });
    return rows.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [storeMembers, codes]);

  // Apply filters
  const filteredStoreStats = overviewFilter
    ? storeStats.filter(s => s.store.username === overviewFilter)
    : storeStats;
  const filteredHistory = historyFilter
    ? allotmentHistory.filter(h => h.storeUsername === historyFilter)
    : allotmentHistory;
  const filteredUnused = unusedFilter
    ? unusedStoreCodes.filter(c => c.storeUsername === unusedFilter)
    : unusedStoreCodes;

  async function handleAddCodes() {
    if (!storeSelect) { toast.error("Select a store first"); return; }
    const count = parseInt(codeCount) || 0;
    if (count < 1) { toast.error("Enter a valid number of codes"); return; }
    setAdding(true);
    try {
      const records = [];
      for (let i = 0; i < count; i++) {
        records.push({
          code: "MAINT-" + generateReferralCode(),
          is_used: false,
          assigned_sub_admin_id: storeSelect,
        });
      }
      await supabase.from("maintenance_codes").insert(records);
      toast.success(`${count} code(s) added to store`);
      setCodeCount("50");
      setStoreSelect("");
      refetchCodes();
    } catch { toast.error("Failed to add codes"); }
    setAdding(false);
  }

  const cardClass = "bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden";
  const headerIconClass = "w-10 h-10 rounded-xl flex items-center justify-center";
  const tableThClass = "text-left py-2.5 px-5 font-semibold text-gray-500 uppercase text-xs";
  const tableTdClass = "py-3 px-5 text-sm text-gray-700";

  return (
    <div className="space-y-6">
      {/* 1. Add Codes to Store */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className={cardClass}>
        <div className="p-5 border-b border-gray-100 flex items-center gap-3">
          <div className={`${headerIconClass} bg-green-50`}>
            <Plus className="w-5 h-5 text-green-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Add Codes to Store</h2>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1.5 block">Store username</label>
              <select value={storeSelect} onChange={e => setStoreSelect(e.target.value)}
                className="w-full h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 bg-white text-sm">
                <option value="">Select store...</option>
                {storeMembers.map(s => (
                  <option key={s.id} value={s.id}>{s.username} @{s.username}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1.5 block">Number of codes</label>
              <input type="number" value={codeCount} onChange={e => setCodeCount(e.target.value)} min="1"
                className="w-full h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20" />
            </div>
            <button onClick={handleAddCodes} disabled={adding || !storeSelect}
              className="h-11 px-6 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold transition-colors disabled:opacity-40 disabled:pointer-events-none">
              {adding ? "Adding..." : "Add Codes"}
            </button>
          </div>
        </div>
      </motion.div>

      {/* 2. Store Overview */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className={cardClass}>
        <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`${headerIconClass} bg-orange-50`}>
              <Ticket className="w-5 h-5 text-orange-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Store Overview</h2>
          </div>
          <select value={overviewFilter} onChange={e => setOverviewFilter(e.target.value)}
            className="h-9 rounded-lg border border-gray-200 px-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 bg-white text-sm text-gray-700">
            <option value="">All stores</option>
            {storeMembers.map(s => (
              <option key={s.id} value={s.username}>@{s.username}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto max-h-[440px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className={tableThClass}>Store</th>
                <th className={tableThClass}>Allotted</th>
                <th className={tableThClass}>Generated</th>
                <th className={tableThClass}>Remaining</th>
                <th className={tableThClass}>Last Added</th>
                <th className={tableThClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStoreStats.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-8 text-gray-400">No stores yet</td></tr>
              ) : filteredStoreStats.map(({ store, allotted, generated, remaining, lastAdded }) => (
                <tr key={store.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className={tableTdClass}>
                    <span className="font-medium text-gray-900">{store.username}</span>{" "}
                    <span className="text-gray-400">@{store.username}</span>
                  </td>
                  <td className={tableTdClass}>{allotted}</td>
                  <td className={tableTdClass}>{generated}</td>
                  <td className={tableTdClass}>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      {remaining}
                    </span>
                  </td>
                  <td className={tableTdClass + " text-gray-500"}>
                    {lastAdded ? formatDate(lastAdded, "MMM d, yyyy h:mm a") : "—"}
                  </td>
                  <td className={tableTdClass}>
                    <button onClick={() => onRemoveStore(store.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-300 text-red-600 hover:bg-red-50 transition-colors">
                      Remove Store
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* 3. Code Allotment History */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className={cardClass}>
        <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`${headerIconClass} bg-purple-50`}>
              <Calendar className="w-5 h-5 text-purple-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Code Allotment History</h2>
          </div>
          <select value={historyFilter} onChange={e => setHistoryFilter(e.target.value)}
            className="h-9 rounded-lg border border-gray-200 px-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 bg-white text-sm text-gray-700">
            <option value="">All stores</option>
            {storeMembers.map(s => (
              <option key={s.id} value={s.username}>@{s.username}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto max-h-[440px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className={tableThClass}>Date</th>
                <th className={tableThClass}>Store</th>
                <th className={tableThClass}>Codes Added</th>
                <th className={tableThClass}>Added By</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length === 0 ? (
                <tr><td colSpan="4" className="text-center py-8 text-gray-400">No allotment history yet</td></tr>
              ) : filteredHistory.map((row, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className={tableTdClass + " text-gray-500"}>{row.date}</td>
                  <td className={tableTdClass}>@{row.storeUsername}</td>
                  <td className={tableTdClass + " font-bold text-green-600"}>+{row.count}</td>
                  <td className={tableTdClass}>@{currentAdminUsername || "admin"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* 4. Store Generated Codes (unused) */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className={cardClass}>
        <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`${headerIconClass} bg-red-50`}>
              <Tickets className="w-5 h-5 text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Store Generated Codes (unused)</h2>
          </div>
          <select value={unusedFilter} onChange={e => setUnusedFilter(e.target.value)}
            className="h-9 rounded-lg border border-gray-200 px-3 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-white text-sm text-gray-700">
            <option value="">All stores</option>
            {storeMembers.map(s => (
              <option key={s.id} value={s.username}>@{s.username}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto max-h-[440px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className={tableThClass}>Store</th>
                <th className={tableThClass}>Code</th>
                <th className={tableThClass}>Designated To</th>
                <th className={tableThClass}>Date</th>
                <th className={tableThClass}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUnused.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-8 text-gray-400">No unused store codes</td></tr>
              ) : filteredUnused.map(c => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className={tableTdClass}>@{c.storeUsername}</td>
                  <td className={tableTdClass + " font-mono font-bold text-gray-900"}>{c.code}</td>
                  <td className={tableTdClass}>{c.designatedTo ? `@${c.designatedTo}` : "—"}</td>
                  <td className={tableTdClass + " text-gray-500"}>{formatDate(c.date, "MMM d, yyyy h:mm a")}</td>
                  <td className={tableTdClass}>
                    <button onClick={async () => {
                      try { await supabase.from("maintenance_codes").update({ generated_by_member_id: null }).eq("id", c.id); toast.success("Code removed from store"); refetchCodes(); }
                      catch { toast.error("Failed to remove code"); }
                    }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-300 text-red-600 hover:bg-red-50 transition-colors">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
