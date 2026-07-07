import { useEffect, useState } from 'react';
import { fetchEvents } from '../lib/api';
import EventCard from '../components/EventCard';

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents()
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <div className="text-center mb-10 sm:mb-14">
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-2 bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
          What's on
        </h1>
        <p className="text-sm sm:text-[15px] text-gray-500 max-w-md mx-auto leading-relaxed">
          Pick an event · Select your seats · Real-time availability
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 animate-fade-in">
          <div className="w-10 h-10 border-[3px] border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading events…</p>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-24 animate-fade-in">
          <p className="text-sm text-gray-500">No events are on sale right now. Check back soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 animate-fade-in">
          {events.map((event) => (
            <EventCard key={event._id} event={event} />
          ))}
        </div>
      )}
    </main>
  );
}
