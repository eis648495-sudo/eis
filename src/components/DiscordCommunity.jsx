import React, { useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, ExternalLink, AlertCircle, RefreshCw, Link2, Hash } from "lucide-react";

export default function DiscordCommunity() {
  const [serverId, setServerId] = useState(() => localStorage.getItem("discord_server_id") || "");
  const [inviteUrl, setInviteUrl] = useState(() => localStorage.getItem("discord_invite_url") || "");
  const [idInput, setIdInput] = useState(serverId);
  const [urlInput, setUrlInput] = useState(inviteUrl);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const hasConfig = !!serverId;

  function connect() {
    const id = idInput.trim();
    const url = urlInput.trim();
    localStorage.setItem("discord_server_id", id);
    localStorage.setItem("discord_invite_url", url);
    setServerId(id);
    setInviteUrl(url);
    setLoaded(false);
    setErrored(false);
    setReloadKey(k => k + 1);
  }

  const widgetUrl = serverId ? `https://discord.com/widget?id=${serverId}&theme=dark` : "";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Community</h1>
            <p className="text-gray-500">Join the conversation on our Discord server</p>
          </div>
        </div>
      </motion.div>

      {/* Config box */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900 rounded-3xl shadow-lg border border-gray-800 p-6 mb-6">
        <h2 className="text-lg font-bold text-white mb-1">Discord Server Settings</h2>
        <p className="text-sm text-gray-400 mb-4">Paste your server ID and invite link below to connect the community widget.</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-400 flex items-center gap-1.5 mb-1.5">
              <Hash className="w-3.5 h-3.5" /> Server ID
            </label>
            <input
              value={idInput}
              onChange={e => setIdInput(e.target.value)}
              placeholder="e.g. 123456789012345678"
              className="w-full bg-white border border-gray-700 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-400 flex items-center gap-1.5 mb-1.5">
              <Link2 className="w-3.5 h-3.5" /> Invite URL
            </label>
            <input
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              placeholder="https://discord.gg/your-invite"
              className="w-full bg-white border border-gray-700 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={connect}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
          >
            Connect Discord Server
          </button>
        </div>
      </motion.div>

      {/* Widget */}
      {hasConfig && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
          {errored ? (
            <div className="p-10 text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-indigo-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Couldn't load the embed</h2>
              <p className="text-gray-500 mb-6">
                Make sure the server widget is enabled in Discord → Server Settings → Widget.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => { setErrored(false); setLoaded(false); setReloadKey(k => k + 1); }}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" /> Try again
                </button>
                {inviteUrl && (
                  <a
                    href={inviteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:opacity-90 transition-opacity"
                  >
                    <ExternalLink className="w-4 h-4" /> Open in Discord
                  </a>
                )}
              </div>
            </div>
          ) : (
            <>
              {!loaded && (
                <div className="p-10 text-center">
                  <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-500">Loading community…</p>
                </div>
              )}
              <iframe
                key={reloadKey}
                src={widgetUrl}
                title="Discord Community"
                onLoad={() => setLoaded(true)}
                onError={() => setErrored(true)}
                className={`w-full transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0 absolute"} h-[600px] border-0`}
                allowtransparency="true"
                frameBorder="0"
                sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
              />
            </>
          )}
        </motion.div>
      )}

      {/* Direct link bar */}
      {hasConfig && inviteUrl && (
        <div className="mt-4 flex items-center justify-between bg-gray-900 rounded-2xl px-5 py-4">
          <p className="text-sm text-gray-400">Prefer to open Discord directly?</p>
          <a
            href={inviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Join server <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}
    </div>
  );
}
