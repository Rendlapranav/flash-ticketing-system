import { ShoppingCart } from 'lucide-react';

export default function CartBar({ cartSeats, totalAmount, onCheckout }) {
  if (cartSeats.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 animate-slide-up">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-5">
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[#10121b]/95 backdrop-blur-2xl shadow-2xl shadow-black/40 px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-4 h-4 text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {cartSeats.length} seat{cartSeats.length > 1 ? 's' : ''} selected
              </p>
              <p className="text-xs text-gray-500 truncate">
                {cartSeats.map((s) => s.seatNumber).join(', ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <p className="text-lg font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent hidden sm:block">
              ₹{totalAmount}
            </p>
            <button
              onClick={onCheckout}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold text-sm transition-all duration-300 hover:shadow-[0_0_24px_rgba(139,92,246,0.35)] cursor-pointer"
            >
              Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
