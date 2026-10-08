import React from "react";
import { formatDate, money } from "../lib/helpers";

export default function CodeTransactionHistory({ code, transactions }) {
  const codeTransactions = transactions.filter(
    t => t.description && t.description.includes(code)
  );

  if (codeTransactions.length === 0) {
    return (
      <div className="mt-2 ml-1 pl-4 border-l-2 border-gray-200">
        <p className="text-xs text-gray-400">No transaction records</p>
      </div>
    );
  }

  return (
    <div className="mt-2 ml-1 pl-4 border-l-2 border-gray-200 space-y-1.5">
      {codeTransactions.map(t => (
        <div key={t.id} className="flex items-center gap-2 text-xs flex-wrap">
          <span className={`px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
            t.type === "maintenance_code" ? "bg-teal-100 text-teal-700" :
            t.type === "referral_bonus" ? "bg-blue-100 text-blue-700" :
            "bg-gray-100 text-gray-600"
          }`}>
            {t.type === "maintenance_code" ? "Redemption" : t.type === "referral_bonus" ? `L${t.bonus_level} Bonus` : t.type}
          </span>
          <span className="text-gray-600">{t.description}</span>
          {t.amount > 0 && <span className="font-semibold text-green-600">{money(t.amount)}</span>}
          <span className="text-gray-400 ml-auto whitespace-nowrap">{formatDate(t.created_at, "MMM d, h:mm a")}</span>
        </div>
      ))}
    </div>
  );
}
