import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Users, Ticket, Wallet, Smartphone, Settings, Check, X, Plus,
  Eye, EyeOff, DollarSign, Trash2, RotateCcw, UserCog, GitBranch, Search,
  Download, Copy, Crown, ArrowRight, ChevronDown, X as XIcon, FileText,
  Key, Clock, Lock, Pencil, User, Save, Upload, Image as ImageIcon,
  UserPlus, ArrowLeft,
} from "lucide-react";
import toast from "react-hot-toast";
import { useTable, updateRecord, createRecord, deleteRecord } from "../lib/useData";
import { supabase } from "../lib/supabase";
import { money, formatDate, generateReferralCode, maintenanceStatus, formatTime, LEVEL_CONFIG } from "../lib/helpers";
import { Button, Input, Label, Badge } from "./ui";
import Genealogy from "./Genealogy";
import MonitoringView from "./MonitoringView";

export default function Admin() {
  const [tab, setTab] = useState("members");
  const [search, setSearch] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [redeemModal, setRedeemModal] = useState(null);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemBusy, setRedeemBusy] = useState(false);
  const [sponsorModal, setSponsorModal] = useState(null);
  const [profileMember, setProfileMember] = useState(null);
  const [profileSearch, setProfileSearch] = useState("");
  const [profileSearchOpen, setProfileSearchOpen] = useState(false);
  const [profileForm, setProfileForm] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [newCode, setNewCode] = useState({ count: "1", description: "", assignedUsername: "" });
  const [gcash, setGcash] = useState({ gcash_number: "", gcash_name: "" });
  const [minAmount, setMinAmount] = useState("300");
  const [savingMin, setSavingMin] = useState(false);
  const [txSearch, setTxSearch] = useState("");
  const [tabVisibility, setTabVisibility] = useState({ monitoring: true, subadmin: true, terms: true, complan: true });
  const [monitorMember, setMonitorMember] = useState(null);
  const [previewReceipt, setPreviewReceipt] = useState(null);
  const [signedUrls, setSignedUrls] = useState({});
  const [, setTick] = useState(0);
  const [subAdminSearch, setSubAdminSearch] = useState("");
  const [transferSubAdminId, setTransferSubAdminId] = useState("");
  const [transferCodeCount, setTransferCodeCount] = useState("1");
  const [transferring, setTransferring] = useState(false);

  const { data: members = [] } = useTable("members");
  const { data: codes = [] } = useTable("maintenance_codes");
  const { data: withdrawals = [] } = useTable("conversion_requests");
  const { data: gcashInfo = [] } = useTable("gcash_info");
  const { data: settings = [] } = useTable("system_settings");
  const { data: transactions = [] } = useTable("transactions");
  const { data: receipts = [] } = useTable("gcash_receipts");

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

  // Live countdown — re-render every second so maintenance timers tick down
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Resolve receipt image URLs — data URLs are used directly, storage paths get signed URLs
  useEffect(() => {
    if (receipts.length === 0) return;
    let cancelled = false;
    (async () => {
      const urls = {};
      for (const r of receipts) {
        if (!r.receipt_url) continue;
        if (r.receipt_url.startsWith("data:") || r.receipt_url.startsWith("http")) {
          urls[r.id] = r.receipt_url;
          continue;
        }
        const { data } = await supabase.storage.from("receipts").createSignedUrl(r.receipt_url, 3600);
        if (data?.signedUrl) urls[r.id] = data.signedUrl;
      }
      if (!cancelled) setSignedUrls(urls);
    })();
    return () => { cancelled = true; };
  }, [receipts]);

  const activeGcash = gcashInfo.find(g => g.is_active) || gcashInfo[0];
  const pendingWithdrawals = withdrawals.filter(w => w.status === "pending");
  const activeMembers = members.filter(m => m.status !== "deleted" && m.username !== "supadmin");
  const deletedMembers = members.filter(m => m.status === "deleted");
  const pendingMembers = activeMembers.filter(m => m.status === "pending");
  const approvedMembers = activeMembers.filter(m => m.status === "approved");
  const adminMembers = activeMembers.filter(m => m.role === "admin");
  const subAdminMembers = activeMembers.filter(m => m.role === "sub_admin");

  const filteredMembers = activeMembers.filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (m.full_name || "").toLowerCase().includes(q) || (m.username || "").toLowerCase().includes(q) || (m.referral_code || "").toLowerCase().includes(q);
  });

  const filteredTransactions = [...transactions]
    .sort((a, b) => new Date(b.created_date || b.created_at) - new Date(a.created_date || a.created_at))
    .filter(t => {
      if (!txSearch) return true;
      const q = txSearch.toLowerCase();
      const member = members.find(m => m.id === t.member_id);
      return (member?.full_name || "").toLowerCase().includes(q) || (member?.username || "").toLowerCase().includes(q) || (t.type || "").toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q);
    });

  const tabs = [
    { id: "members", label: `Members (${activeMembers.length})`, icon: Users },
    { id: "codes", label: "Codes", icon: Ticket },
    { id: "withdrawals", label: `Withdrawals${pendingWithdrawals.length > 0 ? ` (${pendingWithdrawals.length})` : ""}`, icon: Wallet },
    { id: "history", label: "Transaction History", icon: FileText },
    { id: "genealogy", label: "Genealogy", icon: GitBranch },
    ...(tabVisibility.monitoring ? [{ id: "monitoring", label: "Monitoring", icon: Eye }] : []),
    { id: "gcash", label: "GCash", icon: Smartphone },
    ...(deletedMembers.length > 0 ? [{ id: "deleted", label: `Deleted (${deletedMembers.length})`, icon: Trash2 }] : []),
    { id: "roles", label: "Roles", icon: UserCog },
    ...(tabVisibility.subadmin ? [{ id: "subadmins", label: "Sub-Admins", icon: Shield }] : []),
    { id: "settings", label: "Settings", icon: Settings },
    { id: "profile", label: "My Profile", icon: User },
  ];

  function getMemberEarnings(memberId) {
    const txns = transactions.filter(t => t.member_id === memberId);
    const l1 = txns.filter(t => t.type === "level_bonus" && t.bonus_level === 1).reduce((s, t) => s + (t.amount || 0), 0);
    const l2 = txns.filter(t => t.type === "level_bonus" && t.bonus_level === 2).reduce((s, t) => s + (t.amount || 0), 0);
    const l3 = txns.filter(t => t.type === "level_bonus" && t.bonus_level === 3).reduce((s, t) => s + (t.amount || 0), 0);
    const total = txns.reduce((s, t) => s + (t.amount || 0), 0);
    return { l1, l2, l3, total };
  }

  async function generateCodes() {
    const count = parseInt(newCode.count) || 1;
    try {
      const records = [];
      for (let i = 0; i < count; i++) {
        records.push({
          code: "MAINT-" + generateReferralCode(),
          is_used: false,
          description: newCode.description || null,
          assigned_username: newCode.assignedUsername || null,
        });
      }
      await supabase.from("maintenance_codes").insert(records);
      toast.success(`${count} code(s) generated!`);
      setNewCode({ ...newCode, description: "", assignedUsername: "" });
    } catch { toast.error("Failed to generate codes"); }
  }

  async function deleteCode(id) {
    try { await deleteRecord("maintenance_codes", id); toast.success("Code deleted"); window.location.reload(); }
    catch { toast.error("Failed to delete code"); }
  }

  async function copyCode(code) {
    try { await navigator.clipboard.writeText(code); toast.success("Code copied!"); }
    catch { toast.error("Failed to copy"); }
  }

  async function approveWithdrawal(id) {
    try {
      const req = withdrawals.find(w => w.id === id);
      await updateRecord("conversion_requests", id, { status: "approved" });
      await createRecord("transactions", {
        member_id: req.member_id,
        type: "withdrawal",
        amount: -(req.amount || 0),
        status: "completed",
        description: "Withdrawal approved by admin",
      });
      toast.success("Withdrawal approved & balance deducted");
      window.location.reload();
    } catch { toast.error("Failed to approve"); }
  }

  async function rejectWithdrawal(id) {
    try { await updateRecord("conversion_requests", id, { status: "rejected" }); toast.success("Withdrawal rejected"); window.location.reload(); }
    catch { toast.error("Failed to reject"); }
  }

  async function approveMember(id) {
    try {
      const member = members.find(m => m.id === id);
      const referrer = members.find(m => m.id === member.referrer_id);
      let placementId = null;
      if (referrer) {
        const available = [referrer, ...findDownline(referrer.id)].find(m => (m.direct_downlines_count || 0) < 10);
        placementId = available?.id || null;
      }
      const treeLevel = placementId ? (members.find(m => m.id === placementId)?.tree_level || 0) + 1 : 1;
      await updateRecord("members", id, {
        status: "approved",
        approved_date: new Date().toISOString(),
        placement_id: placementId,
        tree_level: treeLevel,
      });
      if (placementId) {
        const p = members.find(m => m.id === placementId);
        if (p) await updateRecord("members", p.id, { direct_downlines_count: (p.direct_downlines_count || 0) + 1 });
      }
      toast.success("Member approved & placed");
      window.location.reload();
    } catch { toast.error("Failed to approve member"); }
  }

  function findDownline(memberId, visited = new Set()) {
    if (visited.has(memberId)) return [];
    visited.add(memberId);
    const direct = members.filter(m => m.placement_id === memberId && m.status === "approved");
    return [...direct, ...direct.flatMap(d => findDownline(d.id, visited))];
  }

  async function rejectMember(id) {
    try { await updateRecord("members", id, { status: "rejected" }); toast.success("Member rejected"); window.location.reload(); }
    catch { toast.error("Failed to reject"); }
  }

  async function deleteMember(id) {
    if (!confirm("Delete this account? They can be restored later.")) return;
    try { await updateRecord("members", id, { status: "deleted", deleted_date: new Date().toISOString() }); toast.success("Account deleted"); window.location.reload(); }
    catch { toast.error("Failed to delete"); }
  }

  async function restoreMember(id) {
    try { await updateRecord("members", id, { status: "approved", deleted_date: null }); toast.success("Account restored"); window.location.reload(); }
    catch { toast.error("Failed to restore"); }
  }

  async function saveEditMember() {
    try {
      await updateRecord("members", editMember.id, {
        password: editMember.password,
      });
      toast.success("Credentials updated");
      setEditMember(null);
      window.location.reload();
    } catch { toast.error("Failed to update credentials"); }
  }

  async function redeemCodeForMember() {
    if (!redeemModal || !redeemCode.trim()) { toast.error("Enter a code"); return; }
    setRedeemBusy(true);
    try {
      const member = redeemModal;
      const { data: found, error } = await supabase
        .from("maintenance_codes").select("*").eq("code", redeemCode.toUpperCase()).eq("is_used", false).limit(1);
      if (error || !found?.length) { toast.error("Invalid or already used code"); setRedeemBusy(false); return; }
      const codeRecord = found[0];
      if (codeRecord.assigned_username && codeRecord.assigned_username !== member.username) {
        toast.error(`This code is assigned to @${codeRecord.assigned_username}`); setRedeemBusy(false); return;
      }
      await supabase.from("maintenance_codes").update({
        is_used: true, used_by_member_id: member.id, used_at: new Date().toISOString(),
      }).eq("id", codeRecord.id);
      await supabase.from("transactions").insert({
        member_id: member.id, type: "maintenance_code", amount: 0,
        description: `Redeemed maintenance code: ${codeRecord.code}`, status: "completed",
      });
      const { data: freshMembers } = await supabase.from("members").select("*");
      const { data: freshCodes } = await supabase.from("maintenance_codes").select("*");
      const canEarn = (m) => {
        if (!m || m.status !== "approved") return false;
        return maintenanceStatus(m, freshCodes || codes).isGreen;
      };
      const referrer = (freshMembers || members).find(m => m.id === member.referrer_id);
      if (canEarn(referrer)) {
        const bonus1 = LEVEL_CONFIG.find(l => l.level === 1)?.bonus_amount || 0;
        if (bonus1 > 0) await supabase.from("transactions").insert({
          member_id: referrer.id, type: "referral_bonus", amount: bonus1, bonus_level: 1,
          description: `Level 1 bonus from ${member.username}`, status: "completed", from_member_id: member.id,
        });
      }
      let current = referrer;
      for (let level = 2; level <= 5; level++) {
        if (!current) break;
        const upline = (freshMembers || members).find(m => m.id === current.referrer_id);
        if (!upline) break;
        if (canEarn(upline)) {
          const bonus = LEVEL_CONFIG.find(l => l.level === level)?.bonus_amount || 0;
          if (bonus > 0) await supabase.from("transactions").insert({
            member_id: upline.id, type: "level_bonus", amount: bonus, bonus_level: level,
            description: `Level ${level} bonus from ${member.username}`, status: "completed", from_member_id: member.id,
          });
        }
        current = upline;
      }
      toast.success("Code redeemed successfully! Upline bonuses distributed.");
      setRedeemModal(null); setRedeemCode("");
      window.location.reload();
    } catch (err) { toast.error(err.message || "Failed to redeem code"); }
    setRedeemBusy(false);
  }

  function selectProfileMember(m) {
    setProfileMember(m);
    setProfileForm({
      full_name: m.full_name || "",
      age: m.age || "",
      email: m.email || "",
      phone: m.phone || "",
      gcash_number: m.gcash_number || "",
      gcash_name: m.gcash_name || "",
      facebook_name: m.facebook_name || "",
      address: m.address || "",
      backup_mobile: m.backup_mobile || "",
      password: "",
    });
    setProfileSearchOpen(false);
    setProfileSearch("");
  }

  async function saveProfile() {
    if (!profileMember) return;
    setSavingProfile(true);
    try {
      const updates = { ...profileForm };
      if (!updates.password) delete updates.password;
      await updateRecord("members", profileMember.id, updates);
      toast.success("Profile updated successfully!");
      setProfileMember({ ...profileMember, ...profileForm });
      window.location.reload();
    } catch { toast.error("Failed to update profile"); }
    setSavingProfile(false);
  }

  async function changeSponsor(memberId, newSponsorId) {
    try {
      const member = members.find(m => m.id === memberId);
      const oldSponsor = members.find(m => m.id === member.referrer_id);
      const newSponsor = newSponsorId ? members.find(m => m.id === newSponsorId) : null;
      await updateRecord("members", memberId, { referrer_id: newSponsorId || null });
      if (oldSponsor) await updateRecord("members", oldSponsor.id, { direct_downlines_count: Math.max(0, (oldSponsor.direct_downlines_count || 0) - 1) });
      if (newSponsor) await updateRecord("members", newSponsor.id, { direct_downlines_count: (newSponsor.direct_downlines_count || 0) + 1 });
      toast.success("Sponsor updated");
      setSponsorModal(null);
      window.location.reload();
    } catch { toast.error("Failed to change sponsor"); }
  }

  async function setRole(id, role) {
    try { await updateRecord("members", id, { role }); toast.success(role === "member" ? "Role removed" : `Promoted to ${role}`); window.location.reload(); }
    catch { toast.error("Failed to update role"); }
  }

  async function transferCodesToSubAdmin() {
    if (!transferSubAdminId) { toast.error("Select a sub-admin first"); return; }
    const count = parseInt(transferCodeCount) || 0;
    if (count < 1) { toast.error("Enter a valid count"); return; }
    setTransferring(true);
    try {
      const availableCodes = codes.filter(c => !c.is_used && !c.assigned_sub_admin_id && !c.assigned_username);
      if (availableCodes.length < count) { toast.error(`Only ${availableCodes.length} unassigned codes available`); setTransferring(false); return; }
      const toTransfer = availableCodes.slice(0, count);
      for (const c of toTransfer) {
        await supabase.from("maintenance_codes").update({ assigned_sub_admin_id: transferSubAdminId }).eq("id", c.id);
      }
      toast.success(`${count} code(s) transferred to ${subAdminMembers.find(sa => sa.id === transferSubAdminId)?.full_name || "sub-admin"}`);
      setTransferSubAdminId("");
      setTransferCodeCount("1");
      window.location.reload();
    } catch { toast.error("Failed to transfer codes"); }
    setTransferring(false);
  }

  async function saveGcash() {
    if (!gcash.gcash_number.trim() || !gcash.gcash_name.trim()) { toast.error("Please fill in both fields"); return; }
    try {
      for (const g of gcashInfo) await updateRecord("gcash_info", g.id, { is_active: false });
      await createRecord("gcash_info", { ...gcash, is_active: true });
      toast.success("GCash info saved!");
      setGcash({ gcash_number: "", gcash_name: "" });
      window.location.reload();
    } catch { toast.error("Failed to save GCash info"); }
  }

  function receiptUrl(r) {
    if (!r.receipt_url) return null;
    if (r.receipt_url.startsWith("http")) return r.receipt_url;
    // Strip leading "receipts/" if present — the bucket name is already "receipts"
    const path = r.receipt_url.replace(/^receipts\//, "");
    const { data } = supabase.storage.from("receipts").getPublicUrl(path);
    return data?.publicUrl || null;
  }

  async function verifyReceipt(id) {
    try { await updateRecord("gcash_receipts", id, { status: "verified" }); toast.success("Receipt verified"); window.location.reload(); }
    catch { toast.error("Failed to verify receipt"); }
  }

  async function rejectReceipt(id) {
    try { await updateRecord("gcash_receipts", id, { status: "rejected" }); toast.success("Receipt rejected"); window.location.reload(); }
    catch { toast.error("Failed to reject receipt"); }
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

  function exportCSV() {
    const headers = ["Full Name", "Username", "Password", "Email", "Phone", "Role", "Status", "Referral Code", "Referrer", "Direct Downlines", "Tree Level", "Balance", "Total Earnings", "Approved Date"];
    const rows = activeMembers.map(m => {
      const referrer = members.find(r => r.id === m.referrer_id);
      return [m.full_name, m.username, m.password, m.email || "", m.phone || "", m.role, m.status, m.referral_code || "", referrer?.username || "", m.direct_downlines_count || 0, m.tree_level || 0, m.available_balance || 0, m.total_earnings || 0, m.approved_date ? formatDate(m.approved_date, "MMM d, yyyy") : ""];
    });
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mamlakah-members-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Spreadsheet exported!");
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-gray-500">Manage mamlakah members and maintenance codes</p>
          </div>
        </div>
        <Button onClick={exportCSV} className="bg-teal-600 hover:bg-teal-700 text-white">
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Members", value: activeMembers.length, icon: Users, color: "from-amber-500 to-orange-600" },
          { label: "Pending Approvals", value: pendingMembers.length, icon: Users, color: "from-yellow-500 to-amber-600" },
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

      {/* Members Tab */}
      {tab === "members" && (
        <div className="space-y-6">
          {/* Search & Password Toggle */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members..." className="pl-10" />
            </div>
            <Button onClick={() => setShowPasswords(s => !s)} size="sm" variant="outline" className="flex items-center gap-1.5 whitespace-nowrap">
              {showPasswords ? <><EyeOff className="w-3.5 h-3.5" /> Hide Passwords</> : <><Eye className="w-3.5 h-3.5" /> Show Passwords</>}
            </Button>
          </div>

          {/* Pending Members */}
          {pendingMembers.length > 0 && (
            <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4">
              <h3 className="font-bold text-amber-900 mb-3 flex items-center gap-2"><Users className="w-4 h-4" /> Pending Approvals ({pendingMembers.length})</h3>
              <div className="space-y-2">
                {pendingMembers.map(m => (
                  <div key={m.id} className="flex items-center justify-between bg-white rounded-xl p-3 border border-amber-100">
                    <div>
                      <p className="font-medium text-gray-900">{m.full_name} <span className="text-gray-400 text-sm">@{m.username}</span></p>
                      <p className="text-xs text-gray-500">Referral: {m.referral_code || "—"} • Referred by: {members.find(r => r.id === m.referrer_id)?.username || "Direct"}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => approveMember(m.id)} size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 px-3 text-xs"><Check className="w-3 h-3 mr-1" /> Approve & Place</Button>
                      <Button onClick={() => rejectMember(m.id)} size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 h-8 px-3 text-xs"><X className="w-3 h-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Members List — Card Layout */}
          {(() => {
            const approved = filteredMembers.filter(m => m.status === "approved");
            const activeMaintenance = approved.filter(m => maintenanceStatus(m, codes).isGreen);
            const expiredMaintenance = approved.filter(m => !maintenanceStatus(m, codes).isGreen);

            const renderRow = (m, index) => {
              const status = maintenanceStatus(m, codes);
              return (
                <div key={m.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0 px-2 hover:bg-gray-50 rounded-xl transition-colors">
                  {/* Index badge */}
                  <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">{index + 1}</div>
                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate">{m.full_name}</p>
                    <p className="text-sm text-gray-400 truncate">@{m.username}{showPasswords && m.password ? ` · ${m.password}` : ""}</p>
                  </div>
                  {/* Status badge */}
                  <div className="flex-shrink-0">
                    {status.isGreen ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-sm font-medium text-green-700">{formatTime(status.secondsLeft)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 rounded-lg">
                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                        <span className="text-sm font-medium text-red-700">No maintenance</span>
                      </div>
                    )}
                  </div>
                  {/* Metrics */}
                  <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Balance</p>
                      <p className="text-sm font-bold text-gray-900">{money(m.available_balance || 0)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Downlines</p>
                      <p className="text-sm font-bold text-gray-900">{m.direct_downlines_count || 0}/10</p>
                    </div>
                  </div>
                  {/* Action pills */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => setSponsorModal({ member: m, newSponsorId: "" })} className="p-2 bg-yellow-100 text-yellow-600 rounded-lg hover:bg-yellow-200 transition-colors" title="Change Sponsor"><GitBranch className="w-4 h-4" /></button>
                    <button onClick={() => setEditMember({ ...m })} className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors" title="Edit Member"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => { setRedeemModal(m); setRedeemCode(""); }} className="p-2 bg-teal-100 text-teal-600 rounded-lg hover:bg-teal-200 transition-colors" title="Redeem Code"><Key className="w-4 h-4" /></button>
                    <button onClick={() => setEditMember({ ...m })} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors" title="Maintenance Override"><Clock className="w-4 h-4" /></button>
                    <button onClick={() => setShowPasswords(s => !s)} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors" title="Toggle Passwords"><Lock className="w-4 h-4" /></button>
                    <button onClick={() => setEditMember({ ...m })} className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors" title="Edit Balance"><Wallet className="w-4 h-4" /></button>
                    {m.status === "approved" && (
                      <button onClick={() => deleteMember(m.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors" title="Delete Account"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                </div>
              );
            };

            return (
              <>
                {/* Active Maintenance */}
                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="p-4 border-b border-gray-100 bg-green-50">
                    <h3 className="font-bold text-green-900 flex items-center gap-2">
                      <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
                      Active Maintenance ({activeMaintenance.length})
                    </h3>
                  </div>
                  <div className="p-2">
                    {activeMaintenance.length === 0 ? (
                      <p className="text-center py-8 text-gray-400">No active members</p>
                    ) : activeMaintenance.map((m, i) => renderRow(m, i))}
                  </div>
                </div>

                {/* Expired / No Maintenance */}
                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="p-4 border-b border-gray-100 bg-red-50">
                    <h3 className="font-bold text-red-900 flex items-center gap-2">
                      <div className="w-2.5 h-2.5 bg-red-500 rounded-full" />
                      Expired / No Maintenance ({expiredMaintenance.length})
                    </h3>
                  </div>
                  <div className="p-2">
                    {expiredMaintenance.length === 0 ? (
                      <p className="text-center py-8 text-gray-400">No expired members</p>
                    ) : expiredMaintenance.map((m, i) => renderRow(m, i))}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Codes Tab */}
      {tab === "codes" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-amber-500" /> Generate Maintenance Codes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div><Label>Count</Label><Input type="number" value={newCode.count} onChange={e => setNewCode({ ...newCode, count: e.target.value })} /></div>
              <div>
                <Label>Assign To (optional — locks code to this user)</Label>
                <select value={newCode.assignedUsername} onChange={e => setNewCode({ ...newCode, assignedUsername: e.target.value })}
                  className="w-full h-12 rounded-xl border border-gray-200 px-4 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20">
                  <option value="">Anyone (no lock)</option>
                  {activeMembers.map(m => <option key={m.id} value={m.username}>{m.full_name} (@{m.username})</option>)}
                </select>
              </div>
              <div><Label>Description</Label><Input value={newCode.description} onChange={e => setNewCode({ ...newCode, description: e.target.value })} placeholder="optional" /></div>
            </div>
            <Button onClick={generateCodes} className="mt-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white"><Plus className="w-4 h-4 mr-2" /> Generate Codes</Button>
          </div>
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-gray-100">
                  {["Code", "Assigned To", "Status", "Used By", "Date", "Actions"].map(h => <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}
                </tr></thead>
                <tbody>
                  {codes.slice(0, 100).map(c => {
                    const usedBy = members.find(m => m.id === c.used_by_member_id);
                    return (
                      <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-mono font-bold text-gray-900">{c.code}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{c.assigned_username ? `@${c.assigned_username}` : "—"}</td>
                        <td className="px-6 py-4"><Badge className={c.is_used ? "bg-gray-100 text-gray-500" : "bg-green-100 text-green-700"}>{c.is_used ? "Used" : "Available"}</Badge></td>
                        <td className="px-6 py-4 text-sm text-gray-600">{usedBy?.username || "—"}</td>
                        <td className="px-6 py-4 text-sm text-gray-400">{c.used_at ? formatDate(c.used_at, "MMM d, yyyy") : "—"}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1">
                            <button onClick={() => copyCode(c.code)} className="p-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200" title="Copy"><Copy className="w-3.5 h-3.5" /></button>
                            {c.is_used && <button onClick={() => deleteCode(c.id)} className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawals Tab */}
      {tab === "withdrawals" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><DollarSign className="w-5 h-5 text-emerald-500" /> Minimum Withdrawal Amount</h2>
            <div className="flex gap-3 items-end">
              <div className="flex-1"><Label>Amount (₱)</Label><Input type="number" value={minAmount} onChange={e => setMinAmount(e.target.value)} /></div>
              <Button onClick={saveMinAmount} disabled={savingMin} className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">Save</Button>
            </div>
          </div>
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
        </div>
      )}

      {/* Transaction History Tab */}
      {tab === "history" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><FileText className="w-5 h-5 text-amber-500" /> All User Transaction History</h2>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input value={txSearch} onChange={e => setTxSearch(e.target.value)} placeholder="Search by member or type..." className="pl-10" />
            </div>
          </div>
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-gray-100">
                  {["Member", "Type", "Amount", "Description", "Status", "Date"].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>)}
                </tr></thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr><td colSpan="6" className="text-center py-12 text-gray-400">No transactions found</td></tr>
                  ) : filteredTransactions.slice(0, 200).map(t => {
                    const member = members.find(m => m.id === t.member_id);
                    const isWithdrawal = t.type === "withdrawal";
                    return (
                      <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{member?.full_name || "—"} <span className="text-gray-400 text-xs">@{member?.username || ""}</span></td>
                        <td className="px-4 py-3"><Badge className="bg-gray-100 text-gray-600 capitalize">{t.type?.replace(/_/g, " ")}</Badge></td>
                        <td className={`px-4 py-3 text-sm font-bold whitespace-nowrap ${isWithdrawal ? "text-red-600" : "text-emerald-600"}`}>{isWithdrawal ? "" : "+"}{money(Math.abs(t.amount || 0))}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{t.description || "—"}</td>
                        <td className="px-4 py-3"><Badge className={t.status === "completed" ? "bg-green-100 text-green-700" : t.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}>{t.status}</Badge></td>
                        <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">{formatDate(t.created_date || t.created_at, "MMM d, yyyy")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Genealogy Tab */}
      {tab === "genealogy" && <Genealogy />}

      {/* Monitoring Tab */}
      {tab === "monitoring" && (
        <div className="space-y-6">
          <div className="mb-2">
            <h2 className="text-xl font-bold text-gray-900">Downline Monitoring</h2>
            <p className="text-gray-500 text-sm">Track each 1st-level downline's maintenance-code redemptions, cycle by cycle.</p>
          </div>
          {/* Member selector */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Select member:</label>
            <select
              value={monitorMember?.id || ""}
              onChange={e => {
                const m = approvedMembers.find(m => m.id === e.target.value);
                setMonitorMember(m || null);
              }}
              className="flex-1 max-w-sm h-10 rounded-xl border border-gray-200 px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 bg-white"
            >
              <option value="">Choose a member...</option>
              {approvedMembers.map(m => (
                <option key={m.id} value={m.id}>{m.full_name} (@{m.username})</option>
              ))}
            </select>
          </div>
          {monitorMember ? (
            <MonitoringView member={monitorMember} members={members} codes={codes} />
          ) : (
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-12 text-center">
              <Eye className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-400">Select a member above to view their 1st-level downline monitoring.</p>
            </div>
          )}
        </div>
      )}

      {/* GCash Tab */}
      {tab === "gcash" && (
        <div className="space-y-6">
          {/* GCash Setup */}
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Smartphone className="w-5 h-5 text-blue-500" /> GCash Payment Info</h2>
            {activeGcash && (
              <div className="mb-6 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-2">Current Active GCash</p>
                <p className="font-bold text-blue-700 text-xl">{activeGcash.gcash_name}</p>
                <p className="font-bold text-blue-700 text-lg">{activeGcash.gcash_number}</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label>GCash Name</Label><Input value={gcash.gcash_name} onChange={e => setGcash({ ...gcash, gcash_name: e.target.value })} placeholder="e.g. Juan Dela Cruz" /></div>
              <div><Label>GCash Number</Label><Input value={gcash.gcash_number} onChange={e => setGcash({ ...gcash, gcash_number: e.target.value })} placeholder="e.g. 09XXXXXXXX" /></div>
            </div>
            <Button onClick={saveGcash} className="mt-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white"><Smartphone className="w-4 h-4 mr-2" /> Save GCash Info</Button>
          </div>

          {/* Member GCash Receipts */}
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Upload className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Member GCash Receipts</h3>
                  <p className="text-sm text-gray-500">Receipts uploaded by members as proof of payment.</p>
                </div>
              </div>
              <Badge className="bg-purple-100 text-purple-700">{receipts.length} total</Badge>
            </div>
            <div className="p-4 space-y-3">
              {receipts.length === 0 ? (
                <div className="text-center py-12">
                  <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400">No receipts uploaded yet.</p>
                </div>
              ) : (
                [...receipts].sort((a, b) => new Date(b.created_at || b.created_date || 0) - new Date(a.created_at || a.created_date || 0)).map(r => {
                  const member = members.find(m => m.id === r.member_id);
                  const name = r.member_name || member?.full_name || member?.username || "Unknown";
                  const date = r.created_at || r.created_date;
                  return (
                    <div key={r.id} className="flex items-start gap-4 p-4 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors">
                      {/* Receipt thumbnail — click to view full size */}
                      <button
                        onClick={() => setPreviewReceipt(r)}
                        className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all relative group"
                        title="Click to view receipt"
                      >
                        {signedUrls[r.id] ? (
                          <img src={signedUrls[r.id]} alt="Receipt" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-gray-300" />
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                      {/* Receipt info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900">{name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{date ? new Date(date).toLocaleString("en-PH", { month: "numeric", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true }) : "—"}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {r.status === "pending" && <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>}
                          {r.status === "verified" && <Badge className="bg-green-100 text-green-700">Verified</Badge>}
                          {r.status === "rejected" && <Badge className="bg-red-100 text-red-700">Rejected</Badge>}
                          {r.status === "pending" && (
                            <div className="flex gap-2">
                              <Button onClick={() => verifyReceipt(r.id)} size="sm" className="bg-green-600 hover:bg-green-700 text-white h-8 px-3 text-xs"><Check className="w-3 h-3 mr-1" /> Verify</Button>
                              <Button onClick={() => rejectReceipt(r.id)} size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 h-8 px-3 text-xs"><X className="w-3 h-3 mr-1" /> Reject</Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Deleted Accounts Tab */}
      {tab === "deleted" && (
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-red-50">
            <h2 className="font-semibold text-red-900 flex items-center gap-2"><Trash2 className="w-4 h-4" /> Deleted Accounts</h2>
            <p className="text-sm text-red-600 mt-1">These accounts have been deleted. You can restore them at any time.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-gray-100">
                {["Name", "Username", "Deleted On", "Actions"].map(h => <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}
              </tr></thead>
              <tbody>
                {deletedMembers.length === 0 ? <tr><td colSpan="4" className="text-center py-12 text-gray-400">No deleted accounts</td></tr> :
                deletedMembers.map(m => (
                  <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{m.full_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">@{m.username}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">{m.deleted_date ? formatDate(m.deleted_date, "MMM d, yyyy") : "—"}</td>
                    <td className="px-6 py-4">
                      <Button onClick={() => restoreMember(m.id)} size="sm" className="bg-teal-600 text-white h-8 px-3 text-xs"><RotateCcw className="w-3 h-3 mr-1" /> Restore</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Roles Tab */}
      {tab === "roles" && (
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-indigo-50">
            <h2 className="font-semibold text-indigo-900 flex items-center gap-2"><UserCog className="w-4 h-4" /> Admin Role Management</h2>
            <p className="text-sm text-indigo-600 mt-1">Promote approved members to admin or sub-admin so they can manage the system.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-gray-100">
                {["Name", "Username", "Current Role", "Actions"].map(h => <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}
              </tr></thead>
              <tbody>
                {approvedMembers.map(m => (
                  <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{m.full_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">@{m.username}</td>
                    <td className="px-6 py-4"><Badge className="bg-gray-100 text-gray-600 capitalize">{m.role}</Badge></td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        {m.role !== "admin" && <Button onClick={() => setRole(m.id, "admin")} size="sm" className="bg-purple-600 text-white h-8 px-3 text-xs"><Crown className="w-3 h-3 mr-1" /> Make Admin</Button>}
                        {m.role === "admin" && <Button onClick={() => setRole(m.id, "member")} size="sm" variant="outline" className="border-purple-200 text-purple-600 hover:bg-purple-50 h-8 px-3 text-xs">Remove Admin</Button>}
                        {m.role !== "sub_admin" && m.role !== "admin" && <Button onClick={() => setRole(m.id, "sub_admin")} size="sm" className="bg-amber-500 text-white h-8 px-3 text-xs"><Shield className="w-3 h-3 mr-1" /> Make Sub-Admin</Button>}
                        {m.role === "sub_admin" && <Button onClick={() => setRole(m.id, "member")} size="sm" variant="outline" className="border-amber-200 text-amber-600 hover:bg-amber-50 h-8 px-3 text-xs">Remove Sub-Admin</Button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Admins Tab */}
      {tab === "subadmins" && (
        <div className="space-y-6">
          {/* Sub-Admin Role Management */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden border-t-4 border-t-purple-500">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-500" /> Sub-Admin Role Management
              </h2>
              <p className="text-sm text-gray-500 mt-1">Promote approved members to sub-admin so they can redeem codes for users and manage their assigned users.</p>
            </div>
            <div className="p-5">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input value={subAdminSearch} onChange={e => setSubAdminSearch(e.target.value)} placeholder="Search members by name, email, or username..." className="pl-10" />
              </div>
              {/* Member list */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {approvedMembers.filter(m => {
                  if (m.role === "admin") return false;
                  if (!subAdminSearch) return true;
                  const q = subAdminSearch.toLowerCase();
                  return (m.full_name || "").toLowerCase().includes(q) || (m.username || "").toLowerCase().includes(q) || (m.email || "").toLowerCase().includes(q);
                }).map(m => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">{m.username}</p>
                      <p className="text-sm text-gray-400 truncate">
                        {m.role === "sub_admin" ? "Sub-Admin" : "Member"}{m.email ? ` · ${m.email}` : ""}{m.full_name ? ` · ${m.full_name}` : ""}
                      </p>
                    </div>
                    {m.role === "sub_admin" ? (
                      <Button onClick={() => setRole(m.id, "member")} size="sm" variant="outline" className="border-amber-200 text-amber-600 hover:bg-amber-50 h-9 px-4 text-xs whitespace-nowrap">
                        <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Remove
                      </Button>
                    ) : (
                      <Button onClick={() => setRole(m.id, "sub_admin")} size="sm" className="bg-gradient-to-r from-amber-500 to-orange-600 text-white h-9 px-4 text-xs whitespace-nowrap">
                        <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Make Sub-Admin
                      </Button>
                    )}
                  </div>
                ))}
                {approvedMembers.filter(m => {
                  if (m.role === "admin") return false;
                  if (!subAdminSearch) return true;
                  const q = subAdminSearch.toLowerCase();
                  return (m.full_name || "").toLowerCase().includes(q) || (m.username || "").toLowerCase().includes(q) || (m.email || "").toLowerCase().includes(q);
                }).length === 0 && (
                  <p className="text-center py-8 text-gray-400">No members found.</p>
                )}
              </div>
            </div>
          </div>

          {/* Transfer Maintenance Codes to Sub-Admin */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden border-t-4 border-t-teal-500">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Key className="w-5 h-5 text-teal-500" /> Transfer Maintenance Codes to Sub-Admin
              </h2>
              <p className="text-sm text-gray-500 mt-1">Transfer unused codes to a sub-admin. Only that sub-admin can redeem them for users.</p>
            </div>
            <div className="p-5">
              {subAdminMembers.length === 0 ? (
                <div className="text-center py-8">
                  <Key className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400">No sub-admins yet. Promote a member above first.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Sub-Admin selector */}
                  <div>
                    <Label>Select Sub-Admin</Label>
                    <select value={transferSubAdminId} onChange={e => setTransferSubAdminId(e.target.value)}
                      className="w-full h-12 rounded-xl border border-gray-200 px-4 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 bg-white">
                      <option value="">Select a sub-admin</option>
                      {subAdminMembers.map(sa => {
                        const assignedCodes = codes.filter(c => c.assigned_sub_admin_id === sa.id);
                        const unusedCount = assignedCodes.filter(c => !c.is_used).length;
                        return (
                          <option key={sa.id} value={sa.id}>{sa.full_name} (@{sa.username}) — {unusedCount} unused codes</option>
                        );
                      })}
                    </select>
                  </div>
                  {/* Code count */}
                  <div>
                    <Label>Number of Codes to Transfer</Label>
                    <Input type="number" value={transferCodeCount} onChange={e => setTransferCodeCount(e.target.value)} placeholder="e.g. 5" />
                  </div>
                  <p className="text-xs text-gray-400">
                    {codes.filter(c => !c.is_used && !c.assigned_sub_admin_id && !c.assigned_username).length} unassigned codes available.
                  </p>
                  <Button onClick={transferCodesToSubAdmin} disabled={transferring || !transferSubAdminId}
                    className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white">
                    <ArrowRight className="w-4 h-4 mr-2" /> {transferring ? "Transferring..." : "Transfer Codes"}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Existing Sub-Admin Overview */}
          {subAdminMembers.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-500 uppercase">Current Sub-Admins</h3>
              {subAdminMembers.map(sa => {
                const assignedCodes = codes.filter(c => c.assigned_sub_admin_id === sa.id);
                const unusedCodes = assignedCodes.filter(c => !c.is_used);
                const managedMembers = approvedMembers.filter(m => m.referrer_id === sa.id);
                return (
                  <div key={sa.id} className="bg-white rounded-2xl border border-gray-100 shadow overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-amber-50 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-gray-900">{sa.full_name}</p>
                        <p className="text-xs text-gray-500">@{sa.username}</p>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <span className="text-gray-600"><strong>{assignedCodes.length}</strong> codes</span>
                        <span className="text-gray-600"><strong>{unusedCodes.length}</strong> unused</span>
                        <span className="text-gray-600"><strong>{managedMembers.length}</strong> members</span>
                      </div>
                    </div>
                    {managedMembers.length > 0 && (
                      <div className="p-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Managed Members</p>
                        <div className="space-y-1">
                          {managedMembers.map(mm => (
                            <div key={mm.id} className="flex items-center justify-between text-sm py-1">
                              <span className="text-gray-700">{mm.full_name} <span className="text-gray-400">@{mm.username}</span></span>
                              <Badge className={mm.status === "approved" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>{mm.status}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
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
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Settings className="w-5 h-5 text-gray-500" /> Sidebar Tab Visibility</h2>
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

      {/* My Profile Tab */}
      {tab === "profile" && (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Member Search Selector */}
          <div className="relative">
            <button onClick={() => setProfileSearchOpen(o => !o)}
              className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 h-12 hover:border-amber-400 transition-colors">
              <span className={profileMember ? "text-gray-900 font-medium" : "text-gray-400"}>
                {profileMember ? `${profileMember.full_name} (@${profileMember.username})` : "Choose a member..."}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            {profileSearchOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-2xl border border-gray-100 z-20 max-h-80 overflow-hidden flex flex-col">
                <div className="p-3 border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input value={profileSearch} onChange={e => setProfileSearch(e.target.value)} placeholder="Search members by name or username..." className="pl-10" autoFocus />
                  </div>
                </div>
                <div className="overflow-y-auto flex-1">
                  {activeMembers.filter(m => {
                    if (!profileSearch) return true;
                    const q = profileSearch.toLowerCase();
                    return (m.full_name || "").toLowerCase().includes(q) || (m.username || "").toLowerCase().includes(q);
                  }).map(m => (
                    <button key={m.id} onClick={() => selectProfileMember(m)}
                      className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0 ${profileMember?.id === m.id ? "bg-gray-100" : ""}`}>
                      <span className="font-medium text-gray-900">{m.full_name}</span> <span className="text-gray-400">(@{m.username})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {profileMember && profileForm ? (
            <>
              {/* Account info card */}
              <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                    {(profileMember.full_name || "U").charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-lg text-gray-900">{profileMember.full_name || profileMember.username}</p>
                    <p className="text-sm text-gray-500">@{profileMember.username}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 capitalize">{profileMember.role}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  <div><p className="text-xs text-gray-500">Referral Code</p><p className="font-mono font-bold text-gray-900">{profileMember.referral_code || "—"}</p></div>
                  <div><p className="text-xs text-gray-500">Status</p><p className="font-bold text-gray-900 capitalize">{profileMember.status}</p></div>
                  <div><p className="text-xs text-gray-500">Tree Level</p><p className="font-bold text-gray-900">{profileMember.tree_level || 0}</p></div>
                  <div><p className="text-xs text-gray-500">Direct Downlines</p><p className="font-bold text-gray-900">{profileMember.direct_downlines_count || 0}</p></div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Personal Information</h2>
                <div className="space-y-4">
                  {[
                    { key: "full_name", label: "Full Name" },
                    { key: "age", label: "Age", type: "number" },
                    { key: "email", label: "Email", type: "email" },
                    { key: "phone", label: "Phone" },
                    { key: "facebook_name", label: "Facebook Name" },
                    { key: "backup_mobile", label: "Backup Mobile" },
                    { key: "address", label: "Address" },
                  ].map(f => (
                    <div key={f.key}>
                      <Label>{f.label}</Label>
                      <Input value={profileForm[f.key] || ""} onChange={e => setProfileForm({ ...profileForm, [f.key]: e.target.value })} type={f.type || "text"} />
                    </div>
                  ))}
                </div>
              </div>

              {/* GCash Details */}
              <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">GCash Details</h2>
                <div className="space-y-4">
                  <div><Label>GCash Number</Label><Input value={profileForm.gcash_number || ""} onChange={e => setProfileForm({ ...profileForm, gcash_number: e.target.value })} placeholder="09XX XXX XXXX" /></div>
                  <div><Label>GCash Name</Label><Input value={profileForm.gcash_name || ""} onChange={e => setProfileForm({ ...profileForm, gcash_name: e.target.value })} placeholder="Registered name" /></div>
                </div>
              </div>

              {/* Change Password */}
              <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Change Password</h2>
                <div>
                  <Label>New Password</Label>
                  <Input value={profileForm.password || ""} onChange={e => setProfileForm({ ...profileForm, password: e.target.value })} type="password" placeholder="Leave blank to keep current password" />
                </div>
              </div>

              <Button onClick={saveProfile} disabled={savingProfile} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white h-12 rounded-xl font-bold">
                <Save className="w-4 h-4 mr-2" /> {savingProfile ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-12 text-center">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-400">Select a member above to view and edit their profile.</p>
            </div>
          )}
        </div>
      )}

      {/* Reset Credentials Modal */}
      <AnimatePresence>
        {editMember && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditMember(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Reset Credentials — {editMember.username}</h2>
                <button onClick={() => setEditMember(null)} className="p-1 rounded-lg hover:bg-gray-100"><XIcon className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <Label>Username</Label>
                  <div className="flex items-center gap-2">
                    <Input value={editMember.username || ""} readOnly className="bg-gray-50 text-gray-500 cursor-not-allowed" />
                    <button onClick={() => { navigator.clipboard.writeText(editMember.username || ""); toast.success("Username copied!"); }} className="p-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors flex-shrink-0" title="Copy username"><Copy className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-1">Current Password</p>
                  <p className="text-lg font-bold text-gray-900">{editMember.password || "—"}</p>
                </div>
                <div><Label>New Password</Label><Input value={editMember.password || ""} onChange={e => setEditMember({ ...editMember, password: e.target.value })} /></div>
              </div>
              <div className="p-6 border-t border-gray-100 flex gap-3">
                <Button onClick={() => setEditMember(null)} variant="outline" className="flex-1">Cancel</Button>
                <Button onClick={saveEditMember} className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white">Save Changes</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Redeem Code Modal */}
      <AnimatePresence>
        {redeemModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setRedeemModal(null); setRedeemCode(""); }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Key className="w-5 h-5 text-teal-600" /> Redeem Code — {redeemModal.username}</h2>
                <button onClick={() => { setRedeemModal(null); setRedeemCode(""); }} className="p-1 rounded-lg hover:bg-gray-100"><XIcon className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                  <p className="text-sm text-teal-800">Enter a maintenance code to redeem on behalf of this member. The 5-level upline bonuses will be distributed automatically using the same rules as the member's own redemption.</p>
                </div>
                <div>
                  <Label>Maintenance Code</Label>
                  <Input value={redeemCode} onChange={e => setRedeemCode(e.target.value)} placeholder="e.g. MAINT-XXXXXX" className="font-mono" />
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 flex gap-3">
                <Button onClick={() => { setRedeemModal(null); setRedeemCode(""); }} variant="outline" className="flex-1">Cancel</Button>
                <Button onClick={redeemCodeForMember} disabled={redeemBusy} className="flex-1 bg-teal-500 hover:bg-teal-600 text-white">{redeemBusy ? "Redeeming..." : "Redeem Code"}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Change Sponsor Modal */}
      <AnimatePresence>
        {sponsorModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSponsorModal(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><GitBranch className="w-5 h-5 text-amber-500" /> Change Sponsor — {sponsorModal.member?.full_name}</h2>
                <button onClick={() => setSponsorModal(null)} className="p-1 rounded-lg hover:bg-gray-100"><XIcon className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-500">Current sponsor: {members.find(m => m.id === sponsorModal.member?.referrer_id)?.username || "None (root)"}</p>
                <p className="text-sm text-gray-500">Changing the sponsor will update downline counts for both old and new sponsors.</p>
                <div>
                  <Label>Select New Sponsor</Label>
                  <select value={sponsorModal.newSponsorId} onChange={e => setSponsorModal({ ...sponsorModal, newSponsorId: e.target.value })}
                    className="w-full h-12 rounded-xl border border-gray-200 px-4 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20">
                    <option value="">None (root — no sponsor)</option>
                    {approvedMembers.filter(m => m.id !== sponsorModal.member?.id).map(m => (
                      <option key={m.id} value={m.id}>{m.full_name} (@{m.username}) — {m.direct_downlines_count || 0}/10 downlines</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 flex gap-3">
                <Button onClick={() => changeSponsor(sponsorModal.member.id, sponsorModal.newSponsorId)} className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white">Update Sponsor</Button>
                <Button onClick={() => setSponsorModal(null)} variant="outline" className="flex-1">Cancel</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Receipt Preview Modal */}
      <AnimatePresence>
        {previewReceipt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setPreviewReceipt(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {members.find(m => m.id === previewReceipt.member_id)?.full_name || previewReceipt.member_name || "Receipt"}
                  </h2>
                  <p className="text-xs text-gray-400">
                    {previewReceipt.created_at ? new Date(previewReceipt.created_at).toLocaleString("en-PH") : "—"}
                  </p>
                </div>
                <button onClick={() => setPreviewReceipt(null)} className="p-1 rounded-lg hover:bg-gray-100">
                  <XIcon className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="p-4 flex items-center justify-center bg-gray-50 min-h-[300px] max-h-[70vh] overflow-auto">
                {signedUrls[previewReceipt.id] ? (
                  <img
                    src={signedUrls[previewReceipt.id]}
                    alt="Receipt"
                    className="max-w-full max-h-[60vh] rounded-xl object-contain"
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                  />
                ) : null}
                <div className="flex flex-col items-center text-gray-400" style={{ display: signedUrls[previewReceipt.id] ? 'none' : 'flex' }}>
                  <ImageIcon className="w-12 h-12 mb-2" />
                  <p className="text-sm">No image available for this receipt.</p>
                </div>
              </div>
              {previewReceipt.status === "pending" && (
                <div className="p-4 border-t border-gray-100 flex gap-3 justify-end">
                  <Button
                    onClick={() => { verifyReceipt(previewReceipt.id); setPreviewReceipt(null); }}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Check className="w-4 h-4 mr-1" /> Verify
                  </Button>
                  <Button
                    onClick={() => { rejectReceipt(previewReceipt.id); setPreviewReceipt(null); }}
                    size="sm"
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <X className="w-4 h-4 mr-1" /> Reject
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
