import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CalendarDays, MapPin, Ban } from 'lucide-react';
import { themeFor } from '../lib/theme';
import { formatEventDateShort, isPastEvent } from '../lib/dates';

export default function TicketCard({ booking, onCancel }) {
  const [cancelling, setCancelling] = useState(false);
  const event = booking.eventId;
  const theme = themeFor(event?.theme);
  const isCancelled = booking.status === 'cancelled';
  const isPast = Boolean(event) && isPastEvent(event.dateTime);
  const canCancel = !isCancelled && !isPast;

  const handleCancel = async () => {
    if (!canCancel) return;
    const confirmed = window.confirm(
      `Cancel your booking for ${event?.name}? Seat(s) ${booking.seatNumbers.join(', ')} will be released.`
    );
    if (!confirmed) return;

    setCancelling(true);
    try {
      await onCancel(booking._id);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div
      className={`relative rounded-2xl border overflow-hidden transition-opacity ${
        isCancelled ? 'border-white/[0.04] bg-white/[0.01] opacity-60' : 'border-white/[0.06] bg-white/[0.02]'
      }`}
    >
      <div className={`h-2 bg-gradient-to-r ${theme.gradient}`} />

      <div className="p-5 flex flex-col sm:flex-row gap-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-base font-bold text-white truncate">{event?.name || 'Event'}</h3>
            {isCancelled && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-red-500/15 border border-red-500/30 text-red-300 shrink-0">
                Cancelled
              </span>
            )}
            {!isCancelled && isPast && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-white/10 border border-white/10 text-gray-400 shrink-0">
                Past
              </span>
            )}
          </div>

          <div className="space-y-1.5 mb-4 text-xs text-gray-500">
            {event && (
              <>
                <p className="flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" /> {formatEventDateShort(event.dateTime)}
                </p>
                <p className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> {event.venue}
                </p>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mb-4">
            {booking.seatNumbers.map((seatNumber) => (
              <span
                key={seatNumber}
                className="px-2 py-1 rounded-md text-xs font-mono font-semibold bg-amber-500/10 border border-amber-500/25 text-amber-300"
              >
                {seatNumber}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-lg font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              ₹{booking.totalAmount}
            </p>
            {canCancel && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-400 transition-colors disabled:opacity-40 cursor-pointer"
              >
                <Ban className="w-3.5 h-3.5" />
                {cancelling ? 'Cancelling…' : 'Cancel booking'}
              </button>
            )}
          </div>
        </div>

        <div className="flex sm:flex-col items-center justify-center gap-2 sm:border-l sm:border-white/[0.06] sm:pl-5 shrink-0">
          <div className="p-2 rounded-lg bg-white">
            <QRCodeSVG value={booking._id} size={84} fgColor="#0a0a0a" bgColor="#ffffff" />
          </div>
          <p className="text-[9px] text-gray-600 font-mono tracking-wider uppercase">
            #{booking._id.slice(-8)}
          </p>
        </div>
      </div>
    </div>
  );
}
