import { useState, useEffect } from 'react';
import { Ticket, CreditCard, X } from 'lucide-react';

// ─── Checkout Panel (slides in from the right) ─────────────
export default function CheckoutPanel({
  seatNumber,
  expiresAt,
  onPay,
  onCancel,
  onExpired,
  paying,
}) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  );

  // Countdown every second
  useEffect(() => {
    const tick = () => {
      const diff = Math.max(
        0,
        Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
      );
      setRemaining(diff);
      if (diff <= 0) onExpired();
    };

    tick(); // run immediately
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onExpired]);

  // ── Circular timer maths ──
  const totalSeconds = 60; // 1 minute
  const progress = remaining / totalSeconds;
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  let timerColor = '#10b981'; // green
  if (remaining <= 15) timerColor = '#ef4444'; // red — last 15s
  else if (remaining <= 30) timerColor = '#f59e0b'; // amber — last 30s

  return (
    <aside className="fixed right-0 top-0 h-full w-full sm:w-[380px] bg-[#10121b]/95 backdrop-blur-2xl border-l border-white/[0.06] z-50 animate-slide-in-right flex flex-col shadow-2xl shadow-black/40">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
            <Ticket className="w-4 h-4 text-violet-400" />
          </div>
          <h2 className="text-base font-semibold tracking-tight">Checkout</h2>
        </div>
        <button
          onClick={onCancel}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
          aria-label="Close checkout"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6 py-8 overflow-y-auto">
        {/* Seat badge */}
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-2.5 uppercase tracking-widest">
            Selected Seat
          </p>
          <div className="inline-flex items-center justify-center w-[72px] h-[72px] rounded-2xl bg-amber-500/15 border-2 border-amber-400/40">
            <span className="text-[22px] font-bold text-amber-300 font-mono tracking-wider">
              {seatNumber}
            </span>
          </div>
        </div>

        {/* Circular countdown */}
        <div className="relative flex items-center justify-center">
          <svg className="w-[148px] h-[148px]" viewBox="0 0 128 128">
            {/* Background ring */}
            <circle
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="5"
            />
            {/* Progress ring */}
            <circle
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              stroke={timerColor}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{
                transform: 'rotate(-90deg)',
                transformOrigin: 'center',
                transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease',
              }}
            />
          </svg>
          <div className="absolute text-center">
            <p
              className="text-[32px] font-bold tracking-widest font-mono tabular-nums"
              style={{ color: timerColor, transition: 'color 0.5s ease' }}
            >
              {minutes}:{seconds.toString().padStart(2, '0')}
            </p>
            <p className="text-[9px] text-gray-600 uppercase tracking-[0.2em] mt-0.5">
              remaining
            </p>
          </div>
        </div>

        {/* Demo price */}
        <div className="text-center">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
            Demo Price
          </p>
          <p className="text-[28px] font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            ₹499
          </p>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="px-6 pb-6 pt-3 space-y-2.5 border-t border-white/[0.06]">
        <button
          onClick={onPay}
          disabled={paying || remaining <= 0}
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
