import { NavLink } from 'react-router-dom';
import {
  useUser,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/clerk-react';
import { Zap, Ticket, LayoutDashboard } from 'lucide-react';

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

function navClasses({ isActive }) {
  return `px-3 py-[7px] rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? 'bg-white/[0.08] text-white'
      : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
  }`;
}

export default function NavBar() {
  const { isSignedIn, user, isLoaded } = useUser();
  const email = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase();
  const isAdmin = Boolean(email && ADMIN_EMAILS.includes(email));

  return (
    <header className="sticky top-0 z-40 bg-[#080a12]/80 backdrop-blur-xl border-b border-white/[0.05]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-[60px] flex items-center justify-between gap-4">
        <NavLink to="/" className="flex items-center gap-2 shrink-0">
          <Zap className="w-5 h-5 text-violet-400" />
          <span className="text-[17px] font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent tracking-tight">
            Flash Tickets
          </span>
        </NavLink>

        <nav className="hidden sm:flex items-center gap-1">
          <NavLink to="/" end className={navClasses}>
            Events
          </NavLink>
          {isSignedIn && (
            <NavLink to="/bookings" className={navClasses}>
              <span className="flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5" /> My Bookings
              </span>
            </NavLink>
          )}
          {isSignedIn && isAdmin && (
            <NavLink to="/admin" className={navClasses}>
              <span className="flex items-center gap-1.5">
                <LayoutDashboard className="w-3.5 h-3.5" /> Admin
              </span>
            </NavLink>
          )}
        </nav>

        {isLoaded && (
          <div className="flex items-center gap-3 shrink-0">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-4 py-[7px] rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors cursor-pointer">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <span className="text-sm text-gray-500 hidden md:inline mr-1">
                {user?.firstName || user?.emailAddresses?.[0]?.emailAddress}
              </span>
              <UserButton
                appearance={{ elements: { avatarBox: 'w-[34px] h-[34px]' } }}
              />
            </SignedIn>
          </div>
        )}
      </div>

      {/* Mobile nav */}
      <nav className="sm:hidden flex items-center gap-1 px-4 pb-2.5 overflow-x-auto">
        <NavLink to="/" end className={navClasses}>
          Events
        </NavLink>
        <SignedIn>
          <NavLink to="/bookings" className={navClasses}>
            My Bookings
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={navClasses}>
              Admin
            </NavLink>
          )}
        </SignedIn>
      </nav>
    </header>
  );
}
