import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { GitBranch, Search, ArrowRight, Users, ZoomIn, ZoomOut, User, Clock, Activity } from "lucide-react";
import { useTable, useCurrentMember } from "../lib/useData";
import { Button } from "./ui";
import { maintenanceStatus, formatTime } from "../lib/helpers";

export default function Genealogy() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [, setTick] = useState(0);
  const { data: members = [], isLoading } = useTable("members");
  const { data: codes = [] } = useTable("maintenance_codes");
  const { currentMember } = useCurrentMember(members);

  // Live countdown — re-render every second so maintenance timers tick down
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (currentMember && !selected) setSelected(currentMember);
  }, [currentMember]);

  const approvedMembers = members.filter(m => m.status === "approved");
  const searchResults = search
    ? approvedMembers.filter(m =>
        m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        m.username?.toLowerCase().includes(search.toLowerCase()) ||
        m.email?.toLowerCase().includes(search.toLowerCase()) ||
        m.referral_code?.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  function getDownlines(memberId, level = 1) {
    if (level > 5) return [];
    const direct = approvedMembers.filter(m => m.referrer_id === memberId);
    return direct.map(d => ({ ...d, _level: level, _children: getDownlines(d.id, level + 1) }));
  }

  const TreeNode = useCallback(function TreeNode({ member, level = 0 }) {
    const downlines = approvedMembers.filter(m => m.referrer_id === member.id);
    const isRoot = level === 0;
    const status = maintenanceStatus(member, codes);
    const isActive = status.isGreen;
    const slots = `${member.direct_downlines_count || 0}/10`;
    const treeLevel = member.tree_level || level;

    return (
      <div className={`flex flex-col items-center ${level > 0 ? "mt-10" : ""}`}>
        {/* Node card */}
        <div
          onClick={() => setSelected(member)}
          className={`cursor-pointer relative w-44 rounded-2xl px-3 py-3 transition-all hover:shadow-xl border-2 ${
            isActive
              ? "bg-green-500 border-green-600 text-white"
              : "bg-red-500 border-red-600 text-white"
          } ${isRoot ? "ring-4 ring-amber-400 ring-offset-2" : ""}`}
        >
          {/* Top row: icon + username + number badge */}
          <div className="flex items-center justify-between mb-1.5">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <User className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-sm truncate flex-1 text-center px-1">{member.username || member.full_name}</span>
            <div className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-white">{treeLevel}</span>
            </div>
          </div>
          {/* Status row */}
          <div className="flex items-center justify-between text-[11px]">
            {isActive ? (
              <span className="flex items-center gap-1 font-medium">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                {formatTime(status.secondsLeft)}
              </span>
            ) : (
              <span className="flex items-center gap-1 font-medium">
                <span className="w-2 h-2 rounded-full bg-white/70" />
                No maint.
              </span>
            )}
            <span className="font-medium">L{treeLevel} · {slots}</span>
          </div>
        </div>

        {/* Children */}
        {downlines.length > 0 && (
          <div className="relative flex flex-wrap justify-center gap-4">
            {/* Vertical line down from parent */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-0.5 h-10 bg-blue-500" />
            {/* Horizontal connector line above children */}
            {downlines.length > 1 && (
              <div
                className="absolute -top-4 h-0.5 bg-blue-500"
                style={{
                  left: `calc(50% - ${Math.min(downlines.length, 10) * 88}px)`,
                  width: `${Math.min(downlines.length, 10) * 176}px`,
                }}
              />
            )}
            {downlines.slice(0, 10).map(d => (
              <div key={d.id} className="relative flex flex-col items-center">
                {/* Vertical line up to horizontal connector */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-blue-500" />
                <TreeNode member={d} level={level + 1} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }, [approvedMembers, codes, setSelected]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading genealogy...</div>
      </div>
    );
  }

  if (!currentMember) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl mx-auto mb-6 flex items-center justify-center">
            <GitBranch className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Mamlakah Tree</h1>
          <p className="text-gray-600 mb-6">Please login to view your genealogy.</p>
          <Link to="/MemberLogin">
            <Button className="bg-orange-500 hover:bg-orange-600 text-white text-lg px-8 py-6">Login <ArrowRight className="ml-2 w-5 h-5" /></Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl">
            <GitBranch className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mamlakah Tree</h1>
            <p className="text-gray-500">5-level network — up to 10 downlines per member</p>
          </div>
        </div>
      </motion.div>

      {/* Status Legend */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-medium text-green-700">Active — Maintenance redeemed</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-200">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="text-sm font-medium text-red-700">Inactive — No maintenance</span>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Left: Members list panel */}
        <div className="w-64 flex-shrink-0 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden h-fit sticky top-4">
          <div className="p-3 border-b border-gray-100">
            <h3 className="font-bold text-gray-900 flex items-center gap-2"><Users className="w-4 h-4 text-gray-500" /> Members</h3>
          </div>
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search members..."
                className="pl-8 w-full rounded-lg border border-gray-200 h-9 text-sm outline-none focus:border-emerald-500"
              />
            </div>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {(search ? searchResults : approvedMembers).map(m => {
              const status = maintenanceStatus(m, codes);
              const isActive = status.isGreen;
              return (
                <button
                  key={m.id}
                  onClick={() => { setSelected(m); setSearch(""); }}
                  className={`w-full text-left px-3 py-2.5 border-b border-gray-50 last:border-0 transition-colors flex items-center gap-2 ${
                    selected?.id === m.id ? "bg-green-100" : "hover:bg-gray-50"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? "bg-green-500" : "bg-red-500"}`} />
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{m.username || m.full_name}</p>
                    <p className="text-xs text-gray-400 truncate">L{m.tree_level || 0} · {m.direct_downlines_count || 0}/10</p>
                  </div>
                </button>
              );
            })}
            {search && searchResults.length === 0 && (
              <p className="text-center py-6 text-sm text-gray-400">No members found.</p>
            )}
          </div>
        </div>

        {/* Right: Tree visualization */}
        <div className="flex-1 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Zoom controls */}
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Activity className="w-4 h-4" />
              <span>Network tree — <strong className="text-gray-700">{selected?.username || selected?.full_name || "—"}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setZoom(z => Math.max(50, z - 10))} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600">
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-gray-600 w-12 text-center">{zoom}%</span>
              <button onClick={() => setZoom(z => Math.min(200, z + 10))} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600">
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="p-8 overflow-auto" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', transition: 'transform 0.2s' }}>
            {selected ? <TreeNode member={selected} /> : (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Users className="w-12 h-12 mb-3 text-gray-300" />
                <p className="text-sm">No genealogy data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Downline stats */}
      {selected && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(level => {
            const count = getDownlines(selected.id, level).length;
            return (
              <div key={level} className="bg-white rounded-2xl shadow border border-gray-100 p-4 text-center">
                <p className="text-3xl font-bold text-gray-900">{count}</p>
                <p className="text-sm text-gray-500 mt-1">Level {level}</p>
              </div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
