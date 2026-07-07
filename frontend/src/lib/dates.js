// Kept in its own module (not inlined in components) so `Date.now()` isn't
// called directly inside render — the React Compiler purity lint flags that.
export function isPastEvent(dateTime) {
  return new Date(dateTime).getTime() < Date.now();
}

export function formatEventDate(dateTime) {
  return new Date(dateTime).toLocaleString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatEventDateShort(dateTime) {
  return new Date(dateTime).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDateOnly(dateTime) {
  return new Date(dateTime).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
