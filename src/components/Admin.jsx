import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Users, Ticket, Wallet, Smartphone, Settings, Check, X, Plus, Eye, EyeOff, DollarSign } from "lucide-react";
import toast from "react-hot-toast";
import { useTable, updateRecord, createRecord } from "../lib/useData";
import { supabase } from "../lib/supabase";
import { money, formatDate, generateReferralCode } from "../lib/helpers";
import { Button, Input, Label, Badge } from "./ui";

export default function Admin() {
  const [tab, setTab] = useState("members");
  const [newCode, setNewCode] = useState({ amount: "1500", count: "1", description: "", assignedUsername: "" });
  const [gcash, setGcash] = useState({ gcash_number: "", gcash_name: "" });
  const [minAmount, setMinAmount] = useState("300");
  const [savingMin, setSavingMin] = useState(false);
  const [tabVisibility, setTabVisibility] = useState({ monitoring: true, subadmin: true, terms: true, complan: true });

  const { data: members = [] } = useTable("members");
  const { data: codes = [] } = useTable("maintenance_codes");
  const { data: withdrawals = [] } = useTable("conversion_requests");
  const { data: gcashInfo = [] } = useTable("gcash_info");
  const { data: settings = [] } = useTable("system_settings");

  useEffect(() => {
    const map = {};
    settings.forEach(s => { map[s.setting_key] = s.setting_value; });
    setTabVisibility({
      monitoring: map.tab_monitoring_visible !== "false",
      subadmin: map.tab_subadmin_visible !== "false",
      terms: map.tab_terms_visible !== "false",
      complan: map.tab_complan_visible !== "false",
    });
    const minSetting = settings.find(s => s.setting_key === "withdrawal_minimum_amount");
    if (minSetting) setMinAmount(minSetting.setting_value);
  }, [settings]);

  const activeGcash = gcashInfo.find(g => g.is_active) || gcashInfo[0];
  const pendingWithdrawals = withdrawals.filter(w => w.status === "pending");

  const tabs = [
    { id: "members", label: "Members", icon: Users },
    { id: "codes", label: "Codes", icon: Ticket },
    { id: "withdrawals", label: "Withdrawals", icon: Wallet },
    { id: "gcash", label: "GCash", icon: Smartphone },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  async function generateCodes() {
    const count = parseInt(newCode.count) || 1;
    const amount = parseFloat(newCode.amount) || 0;
    try {
      const records = [];
      for (let i = 0; i < count; i++) {
        records.push({
          code: "MAINT-" + generateReferralCode(),
          amount,
          is_used: false,
          description: newCode.description || null,
          assigned_username: newCode.assignedUsername || null,
        });
      }
      await supabase.from("maintenance_codes").insert(records);
      toast.success(`${count} code(s) generated!`);
      setNewCode({ ...newCode, description: "", assignedUsername: "" });
      window.location.reload();
    } catch {
      toast.error("Failed to generate codes");
    }
  }

  async function approveWithdrawal(id) {
    try {
      await updateRecord("conversion_requests", id, { status: "approved" });
      toast.success("Withdrawal approved");
      window.location.reload();
    } catch { toast.error("Failed to approve"); }
  }

  async function rejectWithdrawal(id) {
    try {
      await updateRecord("conversion_requests", id, { status: "rejected" });
      toast.success("Withdrawal rejected");
      window.location.reload();
    } catch { toast.error("Failed to reject"); }
  }

  async function approveMember(id) {
    try {
      await updateRecord("members", id, { status: "approved", approved_date: new Date().toISOString() });
      toast.success("Member approved");
      window.location.reload();
    } catch { toast.error("Failed to approve"); }
  }

  async function saveGcash() {
    if (!gcash.gcash_number.trim() || !gcash.gcash_name.trim()) {
      toast.error("Please fill in both GCash number and name");
      return;
    }
    try {
      for (const g of gcashInfo) await updateRecord("gcash_info", g.id, { is_active: false });
      await createRecord("gcash_info", { ...gcash, is_active: true });
      toast.success("GCash info saved!");
      setGcash({ gcash_number: "", gcash_name: "" });
      window.location.reload();
    } catch { toast.error("Failed to save GCash info"); }
  }

  async function saveMinAmount() {
    const val = parseFloat(minAmount);
    if (isNaN(val) || val < 0) { toast.error("Enter a valid amount"); return; }
    setSavingMin(true);
    try {
      const existing = settings.find(s => s.setting_key === "withdrawal_minimum_amount");
      if (existing) await updateRecord("system_settings", existing.id, { setting_value: String(val) });
      else await createRecord("system_settings", { setting_key: "withdrawal_minimum_amount", setting_value: String(val) });
      toast.success(`Minimum withdrawal set to ₱${val.toLocaleString()}`);
    } catch { toast.error("Failed to update"); }
    setSavingMin(false);
  }

  async function toggleTab(key) {
    const settingKey = `tab_${key}_visible`;
    const newVal = !tabVisibility[key];
    setTabVisibility(v => ({ ...v, [key]: newVal }));
    try {
      const existing = settings.find(s => s.setting_key === settingKey);
      if (existing) await updateRecord("system_settings", existing.id, { setting_value: String(newVal) });
      else await createRecord("system_settings", { setting_key: settingKey, setting_value: String(newVal) });
      toast.success(`Tab ${newVal ? "shown" : "hidden"}`);
    } catch { toast.error("Failed to update"); }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-gray-500">Manage members, codes, withdrawals, and system settings</p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Members", value: members.length, icon: Users, color: "from-amber-500 to-orange-600" },
          { label: "Pending Approvals", value: members.filter(m => m.status === "pending").length, icon: Users, color: "from-yellow-500 to-amber-600" },
          { label: "Unused Codes", value: codes.filter(c => !c.is_used).length, icon: Ticket, color: "from-teal-500 to-emerald-600" },
          { label: "Pending Withdrawals", value: pendingWithdrawals.length, icon: Wallet, color: "from-blue-500 to-indigo-600" },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl shadow border border-gray-100 p-5">
            <div className={`w-10 h-10 bg-gradient-to-br ${s.color} rounded-xl flex items-center justify-center mb-3`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-500">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${tab === t.id ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Members tab */}
      {tab === "members" && (
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-gray-100">
                {["Name", "Username", "Role", "Status", "Referral", "Actions"].map(h => <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}
              </tr></thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{m.full_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">@{m.username}</td>
                    <td className="px-6 py-4"><Badge className="bg-gray-100 text-gray-600 capitalize">{m.role}</Badge></td>
                    <td className="px-6 py-4"><Badge className={m.status === "approved" ? "bg-green-100 text-green-700" : m.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}>{m.status}</Badge></td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-600">{m.referral_code || "—"}</td>
                    <td className="px-6 py-4">
                      {m.status === "pending" && <Button onClick={() => approveMember(m.id)} size="sm" className="bg-green-600 text-white h-8 px-3 text-xs">Approve</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Codes tab */}
      {tab === "codes" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-amber-500" /> Generate Maintenance Codes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div><Label>Amount (₱)</Label><Input type="number" value={newCode.amount} onChange={e => setNewCode({ ...newCode, amount: e.target.value })} /></div>
              <div><Label>Count</Label><Input type="number" value={newCode.count} onChange={e => setNewCode({ ...newCode, count: e.target.value })} /></div>
              <div><Label>Assigned Username</Label><Input value={newCode.assignedUsername} onChange={e => setNewCode({ ...newCode, assignedUsername: e.target.value })} placeholder="optional" /></div>
              <div><Label>Description</Label><Input value={newCode.description} onChange={e => setNewCode({ ...newCode, description: e.target.value })} placeholder="optional" /></div>
            </div>
            <Button onClick={generateCodes} className="mt-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white"><Plus className="w-4 h-4 mr-2" /> Generate Codes</Button>
          </div>
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-gray-100">
                  {["Code", "Amount", "Status", "Used By", "Date"].map(h => <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}
                </tr></thead>
                <tbody>
                  {codes.slice(0, 50).map(c => {
                    const usedBy = members.find(m => m.id === c.used_by_member_id);
                    return (
                      <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-mono font-bold text-gray-900">{c.code}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{money(c.amount)}</td>
                        <td className="px-6 py-4"><Badge className={c.is_used ? "bg-gray-100 text-gray-500" : "bg-green-100 text-green-700"}>{c.is_used ? "Used" : "Available"}</Badge></td>
                        <td className="px-6 py-4 text-sm text-gray-600">{usedBy?.username || "—"}</td>
                        <td className="px-6 py-4 text-sm text-gray-400">{c.used_at ? formatDate(c.used_at, "MMM d, yyyy") : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawals tab */}
      {tab === "withdrawals" && (
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-gray-100">
                {["Member", "Amount", "Status", "Date", "Actions"].map(h => <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}
              </tr></thead>
              <tbody>
                {withdrawals.length === 0 ? <tr><td colSpan="5" className="text-center py-12 text-gray-400">No withdrawal requests</td></tr> :
                withdrawals.map(w => {
                  const member = members.find(m => m.id === w.member_id);
                  return (
                    <tr key={w.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{member?.full_name || "—"}</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">{money(w.amount)}</td>
                      <td className="px-6 py-4"><Badge className={w.status === "pending" ? "bg-yellow-100 text-yellow-700" : w.status === "approved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>{w.status}</Badge></td>
                      <td className="px-6 py-4 text-sm text-gray-400">{formatDate(w.created_date || w.created_at, "MMM d, yyyy")}</td>
                      <td className="px-6 py-4">
                        {w.status === "pending" && (
                          <div className="flex gap-2">
                            <Button onClick={() => approveWithdrawal(w.id)} size="sm" className="bg-green-600 text-white h-8 px-3 text-xs"><Check className="w-3 h-3" /></Button>
                            <Button onClick={() => rejectWithdrawal(w.id)} size="sm" className="bg-red-600 text-white h-8 px-3 text-xs"><X className="w-3 h-3" /></Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* GCash tab */}
      {tab === "gcash" && (
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Smartphone className="w-5 h-5 text-blue-500" /> GCash Payment Info</h2>
          {activeGcash && (
            <div className="mb-6 p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <p className="text-sm text-gray-600">Current active GCash:</p>
              <p className="font-bold text-gray-900 text-lg">{activeGcash.gcash_number}</p>
              <p className="text-sm text-gray-600">{activeGcash.gcash_name}</p>
            </div>
          )}
          <div className="space-y-4">
            <div><Label>GCash Number</Label><Input value={gcash.gcash_number} onChange={e => setGcash({ ...gcash, gcash_number: e.target.value })} placeholder="09XX XXX XXXX" /></div>
            <div><Label>GCash Name</Label><Input value={gcash.gcash_name} onChange={e => setGcash({ ...gcash, gcash_name: e.target.value })} placeholder="Registered name" /></div>
            <Button onClick={saveGcash} className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white"><Smartphone className="w-4 h-4 mr-2" /> Save GCash Info</Button>
          </div>
        </div>
      )}

      {/* Settings tab */}
      {tab === "settings" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><DollarSign className="w-5 h-5 text-emerald-500" /> Minimum Withdrawal Amount</h2>
            <div className="flex gap-3 items-end">
              <div className="flex-1"><Label>Amount (₱)</Label><Input type="number" value={minAmount} onChange={e => setMinAmount(e.target.value)} /></div>
              <Button onClick={saveMinAmount} disabled={savingMin} className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">Save</Button>
            </div>
          </div>
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Settings className="w-5 h-5 text-gray-500" /> Tab Visibility</h2>
            <div className="space-y-3">
              {[
                { key: "monitoring", label: "1st Level Monitoring" },
                { key: "subadmin", label: "Sub-Admin Panel" },
                { key: "terms", label: "Terms & Conditions" },
                { key: "complan", label: "Mamlakah ComPlan" },
              ].map(t => (
                <div key={t.key} className="flex items-center justify-between p-3 rounded-xl border border-gray-100">
                  <span className="font-medium text-gray-700">{t.label}</span>
                  <button onClick={() => toggleTab(t.key)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${tabVisibility[t.key] ? "bg-green-500" : "bg-gray-300"}`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${tabVisibility[t.key] ? "translate-x-6" : "translate-x-0.5"}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
