import React, { useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, ExternalLink, AlertCircle, RefreshCw } from "lucide-react";

// ─── Replace these with your server's values ───
// Server ID: found in Discord → Server Settings → Widget
// Invite URL: your discord.gg invite link
const DISCORD_SERVER_ID = "YOUR_SERVER_ID";
const DISCORD_INVITE_URL = "https://discord.gg/your-invite";
// ───────────────────────────────────────────────

const WIDGET_URL = `https://discord.com/widget?id=${DISCORD_SERVER_ID}&theme=dark`;

export default function DiscordCommunity() {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

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

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">

        {/* Fallback / error state */}
        {errored && (
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
              <a
                href={DISCORD_INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:opacity-90 transition-opacity"
              >
                <ExternalLink className="w-4 h-4" /> Open in Discord
              </a>
            </div>
          </div>
        )}

        {/* Loading state */}
        {!loaded && !errored && (
          <div className="p-10 text-center">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading community…</p>
          </div>
        )}

        {/* Discord widget iframe */}
        {!errored && (
          <iframe
            key={reloadKey}
            src={WIDGET_URL}
            title="Discord Community"
            onLoad={() => setLoaded(true)}
            onError={() => setErrored(true)}
            className={`w-full transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0 absolute"} h-[600px] border-0`}
            allowtransparency="true"
            frameBorder="0"
            sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
          />
        )}
      </motion.div>

      {/* Direct link bar */}
      <div className="mt-4 flex items-center justify-between bg-gray-900 rounded-2xl px-5 py-4">
        <p className="text-sm text-gray-400">Prefer to open Discord directly?</p>
        <a
          href={DISCORD_INVITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Join server <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
