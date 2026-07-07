import { useMemo } from 'react';
import { tierStyleFor } from '../lib/theme';

// ─── Seat Grid ──────────────────────────────────────────────
export default function SeatGrid({
  seats,
  rows,
  cols,
  cartSeatNumbers,
  userId,
  onSeatClick,
  loading,
}) {
  const seatMap = useMemo(() => {
    const map = {};
    seats.forEach((s) => {
      map[s.seatNumber] = s;
    });
    return map;
  }, [seats]);

  const colNumbers = useMemo(() => Array.from({ length: cols }, (_, i) => i + 1), [cols]);

  const tiersInUse = useMemo(() => {
    const seen = new Map();
    seats.forEach((s) => {
      if (!seen.has(s.tier)) seen.set(s.tier, s.price);
    });
    return [...seen.entries()];
  }, [seats]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 animate-fade-in">
        <div className="w-10 h-10 border-[3px] border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Loading seats…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-10 animate-fade-in">
      {/* ── Screen ── */}
      <div className="w-full max-w-lg mx-auto relative">
        <div className="h-1.5 bg-gradient-to-r from-transparent via-violet-500 to-transparent rounded-full" />
        <div className="absolute inset-0 h-1.5 bg-gradient-to-r from-transparent via-violet-500 to-transparent rounded-full blur-sm animate-screen-glow" />
        <p className="text-center text-[11px] text-violet-400/40 mt-3 tracking-[0.35em] uppercase font-medium select-none">
          Screen
        </p>
      </div>

      {/* ── Grid ── */}
      <div className="flex flex-col gap-[5px] sm:gap-[7px] overflow-x-auto max-w-full px-2">
        {/* Column headers */}
        <div className="flex items-center gap-[5px] sm:gap-[7px] pl-7 sm:pl-9">
          {colNumbers.map((col) => (
            <div
              key={col}
              className="w-[30px] h-5 sm:w-[38px] sm:h-6 flex items-center justify-center text-[10px] sm:text-xs text-gray-600 font-medium select-none shrink-0"
            >
              {col}
            </div>
          ))}
        </div>

        {/* Seat rows */}
        {rows.map((row) => (
          <div key={row} className="flex items-center gap-[5px] sm:gap-[7px]">
            <span className="w-5 sm:w-7 text-right text-[11px] sm:text-xs text-gray-600 font-medium select-none shrink-0">
              {row}
            </span>
            {colNumbers.map((col) => {
              const seatNumber = `${row}${col}`;
              const seat = seatMap[seatNumber];
              const status = seat?.status || 'available';
              const isInCart = cartSeatNumbers.has(seatNumber);
              const isMine = seat?.bookedBy === userId;

              return (
                <SeatButton
                  key={seatNumber}
                  seatNumber={seatNumber}
                  status={status}
                  tier={seat?.tier}
                  isInCart={isInCart}
                  isMine={isMine}
                  onClick={() => onSeatClick(seatNumber)}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-2">
        {tiersInUse.map(([tier, price]) => (
          <LegendItem
            key={tier}
            color={tierStyleFor(tier).dot}
            label={`${tier} · ₹${price}`}
          />
        ))}
        <LegendItem color="bg-amber-500/50" ring label="Your Cart" />
        <LegendItem color="bg-red-500/40" label="Booked" />
      </div>
    </div>
  );
}

// ─── Individual Seat Button ─────────────────────────────────
function SeatButton({ seatNumber, status, tier, isInCart, isMine, onClick }) {
  const isAvailable = status === 'available';
  const isLocked = status === 'locked';
  const isBooked = status === 'booked';
  const canClick = isAvailable || (isLocked && isInCart);

  let classes =
    'w-[30px] h-[30px] sm:w-[38px] sm:h-[38px] rounded-md text-[8px] sm:text-[10px] font-semibold ' +
    'transition-all duration-200 border flex items-center justify-center select-none shrink-0 ';

  if (isInCart && (isAvailable || isLocked)) {
    // Seat is in THIS user's cart (reserved by them, not yet checked out)
    classes +=
      'bg-amber-500/20 border-amber-400/80 text-amber-300 ' +
      'ring-[2px] ring-amber-400/50 animate-pulse-glow cursor-pointer hover:scale-105 active:scale-95';
  } else if (isAvailable) {
    const style = tierStyleFor(tier);
    classes += `${style.base} ${style.hover} hover:scale-110 cursor-pointer active:scale-95`;
  } else if (isBooked || isMine) {
    classes += isMine
      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-500/60 cursor-not-allowed'
      : 'bg-red-500/10 border-red-500/15 text-red-500/25 cursor-not-allowed';
  } else if (isLocked) {
    // Locked by someone else
    classes += 'bg-amber-500/10 border-amber-500/20 text-amber-500/40 cursor-not-allowed';
  }

  return (
    <button
      className={classes}
      onClick={canClick ? onClick : undefined}
      disabled={!canClick}
      aria-label={`Seat ${seatNumber} — ${status}${tier ? `, ${tier}` : ''}`}
    >
      {seatNumber}
    </button>
  );
}

// ─── Legend Dot ──────────────────────────────────────────────
function LegendItem({ color, label, ring = false }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`w-3.5 h-3.5 rounded-[3px] ${color} ${ring ? 'ring-[2px] ring-amber-400/60' : ''}`}
      />
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}
