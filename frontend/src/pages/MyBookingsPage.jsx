import { useEffect, useState, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { fetchMyBookings, cancelBooking } from '../lib/api';
import { useNotify } from '../context/notification-store';
import TicketCard from '../components/TicketCard';

export default function MyBookingsPage() {
  const { getToken } = useAuth();
  const { isSignedIn, isLoaded } = useUser();
  const notify = useNotify();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const data = await fetchMyBookings(token);
      setBookings(data);
    } catch {
      notify('error', 'Failed to load your bookings.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    // Deferred a tick so this reads as reacting to state, not a synchronous
    // setState-in-effect call (the linter treats those as separate cases).
    queueMicrotask(load);
  }, [isLoaded, isSignedIn, load]);

  const handleCancel = async (bookingId) => {
    try {
      const token = await getToken();
      await cancelBooking(bookingId, token);
      notify('success', 'Booking cancelled — seats released.');
      await load();
    } catch (err) {
      notify('error', err.message);
    }
  };

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <div className="text-center mb-10">
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-2 bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
          My Bookings
        </h1>
        <p className="text-sm sm:text-[15px] text-gray-500">Your tickets, ready to scan.</p>
      </div>

      {!isLoaded ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 animate-fade-in">
          <div className="w-10 h-10 border-[3px] border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading bookings…</p>
        </div>
      ) : !isSignedIn ? (
        <div className="text-center py-24 animate-fade-in">
          <p className="text-sm text-gray-500">Sign in to see your bookings.</p>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 animate-fade-in">
          <div className="w-10 h-10 border-[3px] border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading bookings…</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-24 animate-fade-in">
          <p className="text-sm text-gray-500">No bookings yet — go grab a seat!</p>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in">
          {bookings.map((booking) => (
            <TicketCard key={booking._id} booking={booking} onCancel={handleCancel} />
          ))}
        </div>
      )}
    </main>
  );
}
