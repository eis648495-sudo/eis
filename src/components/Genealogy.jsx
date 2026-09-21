import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { GitBranch, Search, ArrowRight, Users, ZoomIn, ZoomOut, User, Clock, Activity, UserPlus, X, Heart } from "lucide-react";
import { useTable, useCurrentMember, updateRecord } from "../lib/useData";
import { Button } from "./ui";
import { maintenanceStatus, formatTime } from "../lib/helpers";
import toast from "react-hot-toast";

export default function Genealogy() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [placementTarget, setPlacementTarget] = useState(null);
  const [placing, setPlacing] = useState(false);
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

  const allApproved = members.filter(m => m.status === "approved");
  const lobbyMembers = members.filter(m => m.status === "pending" && m.referrer_id === currentMember?.id);
  const isSuperAdmin = currentMember?.username === "supadmin" || currentMember?.username === "admin";

  // Non-super-admin viewers only see their own downline tree — supadmin, admin,
  // and crosslines (members outside their downline lineage) are hidden.
  const visibleIds = useMemo(() => {
    if (isSuperAdmin || !currentMember) return null;
    const ids = new Set([currentMember.id]);
    const stack = [currentMember.id];
    while (stack.length) {
      const id = stack.pop();
      allApproved.filter(m => (m.placement_id || m.referrer_id) === id).forEach(m => {
        if (!ids.has(m.id)) { ids.add(m.id); stack.push(m.id); }
      });
    }
    return ids;
  }, [isSuperAdmin, currentMember, allApproved]);

  const approvedMembers = visibleIds
    ? allApproved.filter(m => visibleIds.has(m.id))
    : allApproved;

  const searchResults = search
    ? approvedMembers.filter(m =>
        m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        m.username?.toLowerCase().includes(search.toLowerCase()) ||
        m.email?.toLowerCase().includes(search.toLowerCase()) ||
        m.referral_code?.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const TreeNode = useCallback(function TreeNode({ member, level = 0 }) {
    const downlines = approvedMembers.filter(m => (m.placement_id || m.referrer_id) === member.id);
    const isRoot = level === 0;
    const status = maintenanceStatus(member, codes);
    const isActive = status.isGreen;
    const slots = `${downlines.length}/10`;
    const treeLevel = member.tree_level || level;
    const canPlace = lobbyMembers.length > 0 && downlines.length < 10;

    return (
      <div className="flex flex-col items-center">
        {/* Node card */}
        <div
          onClick={() => setSelected(member)}
          className={`group cursor-pointer relative w-48 rounded-2xl px-3.5 py-3.5 transition-all duration-300 hover:scale-105 hover:shadow-2xl border-2 ${
            isActive
              ? "bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 border-emerald-300/50 text-white"
              : "bg-gradient-to-br from-rose-500 via-red-500 to-rose-600 border-rose-300/50 text-white"
          } ${isRoot ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-gray-50" : ""}`}
        >
          {/* Subtle inner glow overlay */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/10 to-white/10 pointer-events-none" />

          {/* Top row: avatar + username + level badge */}
          <div className="relative flex items-center gap-2 mb-2.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${isActive ? "from-white/30 to-white/10" : "from-white/20 to-white/5"} ring-2 ring-white/40`}>
              <User className="w-4 h-4 text-white drop-shadow" />
            </div>
            <span className="font-bold text-sm truncate flex-1 text-center px-1 drop-shadow-sm">{member.username || member.full_name}</span>
            <div className="w-6 h-6 rounded-lg bg-white/25 backdrop-blur-sm flex items-center justify-center flex-shrink-0 ring-1 ring-white/30">
              <span className="text-[10px] font-bold text-white">L{treeLevel}</span>
            </div>
          </div>

          {/* Status row */}
          <div className="relative flex items-center justify-between text-[11px] mb-1.5">
            {isActive ? (
              <span className="flex items-center gap-1 font-medium bg-white/15 rounded-full px-1.5 py-0.5">
                <motion.span animate={{ scale: [1, 1.4, 1, 1.2, 1] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }} className="flex items-center">
                  <Heart className="w-3 h-3 text-white fill-white" />
                </motion.span>
                {formatTime(status.secondsLeft)}
              </span>
            ) : status.secondsLeft > 0 ? (
              <span className="flex items-center gap-1 font-medium bg-white/10 rounded-full px-1.5 py-0.5">
                <Heart className="w-3 h-3 text-white/60" />
                {formatTime(status.secondsLeft)}
              </span>
            ) : (
              <span className="flex items-center gap-1 font-medium bg-white/10 rounded-full px-1.5 py-0.5">
                <Heart className="w-3 h-3 text-white/60" />
                Expired
              </span>
            )}
            <span className="font-bold bg-white/20 rounded-full px-1.5 py-0.5">{slots}</span>
          </div>

          {/* Slot progress bar */}
          <div className="relative h-1.5 rounded-full bg-white/15 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isActive ? "bg-white/80" : "bg-white/50"}`}
              style={{ width: `${(downlines.length / 10) * 100}%` }}
            />
          </div>

          {canPlace && (
            <button
              onClick={(e) => { e.stopPropagation(); setPlacementTarget(member); }}
              className="relative mt-2 w-full bg-white/25 hover:bg-white/40 backdrop-blur-sm rounded-lg py-1.5 text-[10px] font-bold flex items-center justify-center gap-1 transition-all border border-white/30 hover:border-white/50"
            >
              <UserPlus className="w-3 h-3" /> Place Here
            </button>
          )}
        </div>

        {/* Children with T-junction connectors */}
        {downlines.length > 0 && (
          <>
            {/* Vertical line from parent bottom to horizontal bar */}
            <div className="w-1 h-6 rounded-full bg-gradient-to-b from-emerald-400 to-blue-500" />
            {/* Children row */}
            <div className="flex flex-nowrap justify-center gap-4">
              {downlines.slice(0, 10).map((d, i, arr) => {
                const isOnly = arr.length === 1;
                const isFirst = i === 0;
                const isLast = i === arr.length - 1;
                return (
                  <div key={d.id} className="relative flex flex-col items-center">
                    {/* Horizontal bar segment */}
                    {!isOnly && (
                      <div
                        className="absolute top-0 h-1 rounded-full bg-gradient-to-r from-blue-500 to-emerald-400"
                        style={{
                          left: isFirst ? '50%' : '-8px',
                          right: isLast ? '50%' : '-8px',
                        }}
                      />
                    )}
                    {/* Vertical drop from horizontal bar to child card */}
                    <div className="w-1 h-6 rounded-full bg-gradient-to-b from-blue-500 to-emerald-400" />
                    <TreeNode member={d} level={level + 1} />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  }, [approvedMembers, codes, setSelected, lobbyMembers, setPlacementTarget]);

  async function handlePlaceMember(lobbyMember) {
    setPlacing(true);
    try {
      const treeLevel = (placementTarget.tree_level || 0) + 1;
      const { error: placeError } = await updateRecord("members", lobbyMember.id, {
        referrer_id: placementTarget.id,
        status: "approved",
        tree_level: treeLevel,
        approved_date: new Date().toISOString(),
      });
      if (placeError) {
        toast.error(placeError.message || "Failed to place member");
        setPlacing(false);
        return;
      }
      const { error: countError } = await updateRecord("members", placementTarget.id, {
        direct_downlines_count: (placementTarget.direct_downlines_count || 0) + 1,
      });
      if (countError) console.error("Failed to update downline count:", countError.message);
      toast.success(`${lobbyMember.username} placed under ${placementTarget.username}`);
      setPlacementTarget(null);
      window.location.reload();
    } catch (err) {
      toast.error(err.message || "Failed to place member");
    }
    setPlacing(false);
  }

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
    <div className="max-w-[1600px] mx-auto px-3 sm:px-6 py-6">
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
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 shadow-sm">
          <span className="w-3 h-3 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 animate-pulse shadow-sm shadow-emerald-500/50" />
          <span className="text-sm font-semibold text-emerald-700">Active — Maintenance redeemed</span>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-gradient-to-r from-rose-50 to-red-50 border border-rose-200 shadow-sm">
          <span className="w-3 h-3 rounded-full bg-gradient-to-br from-rose-400 to-red-600 shadow-sm shadow-rose-500/50" />
          <span className="text-sm font-semibold text-rose-700">Inactive — No maintenance</span>
        </div>
      </div>

      {/* Lobby — unplaced members who used the current user's referral link */}
      {lobbyMembers.length > 0 && (
        <div className="mb-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-4">
          <h3 className="font-bold text-amber-900 flex items-center gap-2 mb-3">
            <UserPlus className="w-4 h-4" /> Lobby — {lobbyMembers.length} member{lobbyMembers.length !== 1 ? "s" : ""} waiting for placement
          </h3>
          <p className="text-xs text-amber-700 mb-3">These members registered using your referral link. Click "Place Here" on any node in your tree to position them.</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {lobbyMembers.map(m => (
              <div key={m.id} className="flex-shrink-0 bg-white rounded-xl border border-amber-200 px-3 py-2 flex items-center gap-2">
                <div className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 font-bold text-xs">
                  {(m.username || "U").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{m.username || m.full_name}</p>
                  <p className="text-xs text-gray-400">{new Date(m.created_date || m.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left: Members list panel */}
        <div className="w-full lg:w-56 flex-shrink-0 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden h-fit lg:sticky lg:top-4">
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
          <div className="max-h-[168px] overflow-y-auto">
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
        <div className="flex-1 min-h-[700px] flex flex-col bg-gradient-to-br from-gray-50 to-slate-100 rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Zoom controls */}
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Activity className="w-4 h-4" />
              <span>Network tree — <strong className="text-gray-700">{selected?.username || selected?.full_name || "—"}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setZoom(z => Math.max(10, z - 10))} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600">
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-gray-600 w-12 text-center">{zoom}%</span>
              <button onClick={() => setZoom(z => Math.min(200, z + 10))} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600">
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', transition: 'transform 0.2s' }}>
              {selected ? <TreeNode member={selected} /> : (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Users className="w-12 h-12 mb-3 text-gray-300" />
                  <p className="text-sm">No genealogy data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Placement modal */}
      {placementTarget && lobbyMembers.length > 0 && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPlacementTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Place under</h3>
                <p className="text-sm text-amber-600 font-medium">@{placementTarget.username || placementTarget.full_name}</p>
              </div>
              <button onClick={() => setPlacementTarget(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Select a lobby member to place as their downline:</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {lobbyMembers.map(m => (
                <button
                  key={m.id}
                  onClick={() => handlePlaceMember(m)}
                  disabled={placing}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-amber-400 hover:bg-amber-50 transition-colors text-left disabled:opacity-50"
                >
                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 font-bold text-sm">
                    {(m.username || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">{m.username || m.full_name}</p>
                    <p className="text-xs text-gray-400">Registered {new Date(m.created_date || m.created_at).toLocaleDateString()}</p>
                  </div>
                  <UserPlus className="w-4 h-4 text-amber-500" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
