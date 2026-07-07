const { createClerkClient, verifyToken } = require('@clerk/backend');

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

function extractToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

async function requireAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    req.auth = { userId: payload.sub };
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired session.' });
  }
}

async function requireAdmin(req, res, next) {
  try {
    const user = await clerkClient.users.getUser(req.auth.userId);
    const email = user.emailAddresses?.[0]?.emailAddress?.toLowerCase();

    if (!email || !ADMIN_EMAILS.includes(email)) {
      return res.status(403).json({ message: 'Admin access required.' });
    }

    req.auth.email = email;
    return next();
  } catch (err) {
    return res.status(403).json({ message: 'Admin access required.' });
  }
}

async function isAdminToken(token) {
  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    const user = await clerkClient.users.getUser(payload.sub);
    const email = user.emailAddresses?.[0]?.emailAddress?.toLowerCase();
    return Boolean(email && ADMIN_EMAILS.includes(email));
  } catch (err) {
    return false;
  }
}

module.exports = {
  ADMIN_EMAILS,
  isAdminToken,
  requireAdmin,
  requireAuth,
};
