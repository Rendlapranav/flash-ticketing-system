import { useState, useEffect, useCallback } from 'react';
import {
  useUser,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/clerk-react';
import { Zap } from 'lucide-react';
import socket from './lib/socket';
import { fetchSeats, lockSeat, bookSeat, unlockSeat } from './lib/api';
import SeatGrid from './components/SeatGrid';
import CheckoutPanel from './components/CheckoutPanel';

// Notification color lookup
const NOTIF_COLORS = {
  success: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
  error:   'bg-red-500/15 border-red-500/30 text-red-300',
  warning: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
  info:    'bg-violet-500/15 border-violet-500/30 text-violet-300',
};

export default function App() {
  const { isSignedIn, user, isLoaded } = useUser();

  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [notification, setNotification] = useState(null);
  const [paying, setPaying] = useState(false);
  const [isLocking, setIsLocking] = useState(false);

  // ── Auto-dismiss notifications after 5 s ──
  useEffect(() => {
    if (!notification) return;
    const id = setTimeout(() => setNotification(null), 5000);
    return () => clearTimeout(id);
  }, [notification]);

  // ── Fetch initial seat data ──
  useEffect(() => {
    fetchSeats()
      .then((data) => {
        setSeats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // ── Real-time socket listener (Step 5.3) ──
  useEffect(() => {
    const handler = ({ seatNumber, status }) => {
      // Update the seats array with the new status
      setSeats((prev) =>
        prev.map((s) =>
          s.seatNumber === seatNumber
            ? {
                ...s,
                status,
                lockedBy: status === 'available' ? null : s.lockedBy,
              }
            : s
        )
      );

      // If OUR selected seat was released by the server, close checkout
      setSelectedSeat((prev) => {
        if (prev === seatNumber && status === 'available') {
          setExpiresAt(null);
          setNotification({
            type: 'warning',
            text: 'Your reservation expired — the seat was released.',
          });
          return null;
        }
        return prev;
      });
    };

    socket.on('seat:status-changed', handler);
    return () => socket.off('seat:status-changed', handler);
  }, []);

  // ── Lock a seat on click ──
  const handleSeatClick = useCallback(
    async (seatNumber) => {
      if (!isSignedIn) {
        setNotification({ type: 'info', text: 'Sign in to select a seat.' });
        return;
      }
      if (selectedSeat) {
        setNotification({
          type: 'warning',
          text: 'Finish or cancel your current checkout first.',
        });
        return;
      }
      if (isLocking) return;

      setIsLocking(true);
      try {
        const result = await lockSeat(seatNumber, user.id);
        setSelectedSeat(seatNumber);
        setExpiresAt(result.expiresAt);
        setNotification(null);
      } catch (err) {
        setNotification({ type: 'error', text: err.message });
      } finally {
        setIsLocking(false);
      }
    },
    [isSignedIn, user, selectedSeat, isLocking]
  );

  // ── Confirm booking (dummy payment) ──
  const handlePayment = useCallback(async () => {
    if (!selectedSeat || !user || paying) return;
    setPaying(true);
    try {
      await bookSeat(selectedSeat, user.id);
      setSelectedSeat(null);
      setExpiresAt(null);
      setNotification({
        type: 'success',
        text: '🎉 Booking confirmed! Enjoy the show.',
      });
    } catch (err) {
      const msg = err.message.toLowerCase();
      if (
        msg.includes('expired') ||
        msg.includes('released') ||
        msg.includes('booked')
      ) {
        setSelectedSeat(null);
        setExpiresAt(null);
      }
      setNotification({ type: 'error', text: err.message });
    } finally {
      setPaying(false);
    }
  }, [selectedSeat, user, paying]);

  // ── Timer hit zero ──
  const handleTimerExpired = useCallback(() => {
    setSelectedSeat(null);
    setExpiresAt(null);
    setNotification({
      type: 'warning',
      text: "⏰ Time's up! Your reservation has expired.",
    });
  }, []);

  // ── Cancel checkout ──
  const handleCancel = useCallback(async () => {
    if (selectedSeat && user) {
      try {
        await unlockSeat(selectedSeat, user.id);
      } catch (err) {
        console.error('Failed to unlock seat on cancel:', err);
      }
    }
    setSelectedSeat(null);
    setExpiresAt(null);
  }, [selectedSeat, user]);

  return (
    <div className="min-h-screen bg-[#080a12] text-gray-200 font-sans">
      {/* ═══════════════ Header ═══════════════ */}
      <header className="sticky top-0 z-40 bg-[#080a12]/80 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-[60px] flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-violet-400" />
            <span className="text-[17px] font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent tracking-tight">
              Flash Tickets
            </span>
          </div>

          {/* Auth controls */}
          {isLoaded && (
            <div className="flex items-center gap-3">
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="px-4 py-[7px] rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors cursor-pointer">
                    Sign In
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <span className="text-sm text-gray-500 hidden sm:inline mr-1">
                  {user?.firstName ||
                    user?.emailAddresses?.[0]?.emailAddress}
                </span>
                <UserButton
                  appearance={{
                    elements: { avatarBox: 'w-[34px] h-[34px]' },
                  }}
                />
              </SignedIn>
            </div>
          )}
        </div>
      </header>

      {/* ═══════════════ Main ═══════════════ */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {/* Event hero */}
        <div className="text-center mb-10 sm:mb-14">
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-2 bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
            The Grand Premiere
          </h1>
          <p className="text-sm sm:text-[15px] text-gray-500 max-w-md mx-auto leading-relaxed">
            Select your seat · 5-minute reservation hold · Real-time
            availability
          </p>
        </div>

        {/* Seat map */}
        <SeatGrid
          seats={seats}
          selectedSeat={selectedSeat}
          userId={user?.id}
          onSeatClick={handleSeatClick}
          loading={loading}
        />
      </main>

      {/* ═══════════════ Checkout Overlay ═══════════════ */}
      {selectedSeat && expiresAt && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
            onClick={paying ? undefined : handleCancel}
          />
          {/* Panel */}
          <CheckoutPanel
            seatNumber={selectedSeat}
            expiresAt={expiresAt}
            onPay={handlePayment}
            onCancel={handleCancel}
            onExpired={handleTimerExpired}
            paying={paying}
          />
        </>
      )}

      {/* ═══════════════ Toast Notification ═══════════════ */}
      {notification && (
        <div className="fixed bottom-5 left-0 right-0 z-[60] flex justify-center pointer-events-none px-4">
          <button
            onClick={() => setNotification(null)}
            className={`pointer-events-auto px-5 py-3 rounded-xl backdrop-blur-xl border text-sm font-medium shadow-lg animate-slide-up cursor-pointer max-w-md text-center ${
              NOTIF_COLORS[notification.type] || NOTIF_COLORS.info
            }`}
          >
            {notification.text}
          </button>
        </div>
      )}
    </div>
  );
}
