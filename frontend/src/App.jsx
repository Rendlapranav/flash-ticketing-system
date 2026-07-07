import { Routes, Route, useParams } from 'react-router-dom';
import NavBar from './components/NavBar';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import MyBookingsPage from './pages/MyBookingsPage';
import AdminPage from './pages/AdminPage';

// Remounts EventDetailPage per event so its cart/loading state always starts
// fresh — otherwise navigating from one event straight to another would leak
// the previous event's selection into the new page.
function EventDetailRoute() {
  const { eventId } = useParams();
  return <EventDetailPage key={eventId} />;
}

export default function App() {
  return (
    <div className="min-h-screen bg-[#080a12] text-gray-200 font-sans">
      <NavBar />
      <Routes>
        <Route path="/" element={<EventsPage />} />
        <Route path="/events/:eventId" element={<EventDetailRoute />} />
        <Route path="/bookings" element={<MyBookingsPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </div>
  );
}
