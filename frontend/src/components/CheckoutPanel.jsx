import { useState, useEffect, useMemo } from 'react';
import { Ticket, CreditCard, X, Trash2 } from 'lucide-react';

// ─── Checkout Panel (slides in from the right) ─────────────
export default function CheckoutPanel({
  cartSeats, // [{ seatNumber, tier, price, expiresAt }]
  onRemoveSeat,
  onPay,
  onCancel,
  onExpired,
  paying,
}) {
  const earliestExpiry = useMemo(
    () => Math.min(...cartSeats.map((s) => new Date(s.expiresAt).getTime())),
    [cartSeats]
  );

  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.floor((earliestExpiry - Date.now()) / 1000))
  );

  // Countdown every second, tracking whichever seat expires soonest
  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, Math.floor((earliestExpiry - Date.now()) / 1000));
      setRemaining(diff);
      if (diff <= 0) onExpired();
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [earliestExpiry, onExpired]);

  const totalAmount = cartSeats.reduce((sum, s) => sum + s.price, 0);

  // ── Circular timer maths ──
  const totalSeconds = 60;
  const progress = remaining / totalSeconds;
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  let timerColor = '#10b981';
  if (remaining <= 15) timerColor = '#ef4444';
  else if (remaining <= 30) timerColor = '#f59e0b';

  return (
    <aside className="fixed right-0 top-0 h-full w-full sm:w-[400px] bg-[#10121b]/95 backdrop-blur-2xl border-l border-white/[0.06] z-50 animate-slide-in-right flex flex-col shadow-2xl shadow-black/40">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
            <Ticket className="w-4 h-4 text-violet-400" />
          </div>
          <h2 className="text-base font-semibold tracking-tight">Checkout</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center shrink-0">
            <svg className="w-11 h-11 -rotate-90" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
              <circle
                cx="48"
                cy="48"
                r={radius}
                fill="none"
                stroke={timerColor}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
              />
            </svg>
            <span
              className="absolute text-[10px] font-bold font-mono tabular-nums"
              style={{ color: timerColor }}
            >
              {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
            aria-label="Close checkout"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* ── Seat list ── */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <p className="text-xs text-gray-500 mb-3 uppercase tracking-widest">
          {cartSeats.length} Seat{cartSeats.length > 1 ? 's' : ''} Selected
        </p>
        <div className="space-y-2">
          {cartSeats.map((seat) => (
            <div
              key={seat.seatNumber}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-lg bg-amber-500/15 border border-amber-400/30 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-amber-300 font-mono">
                    {seat.seatNumber}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">{seat.tier}</p>
                  <p className="text-xs text-gray-500">₹{seat.price}</p>
                </div>
              </div>
              <button
                onClick={() => onRemoveSeat(seat.seatNumber)}
                disabled={paying}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-30 shrink-0"
                aria-label={`Remove seat ${seat.seatNumber}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="px-6 pb-6 pt-3 space-y-2.5 border-t border-white/[0.06]">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-500">Total</span>
          <span className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            ₹{totalAmount}
          </span>
        </div>
        <button
          onClick={onPay}
          disabled={paying || remaining <= 0 || cartSeats.length === 0}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold text-sm transition-all duration-300 hover:shadow-[0_0_28px_rgba(139,92,246,0.35)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none flex items-center justify-center gap-2 cursor-pointer"
        >
          <CreditCard className="w-4 h-4" />
          {paying ? 'Processing…' : 'Complete Demo Payment'}
        </button>
        <button
          onClick={onCancel}
          disabled={paying}
          className="w-full py-3 rounded-xl border border-white/[0.08] hover:bg-white/[0.04] text-gray-500 font-medium text-sm transition-all duration-300 disabled:opacity-40 cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </aside>
  );
}
