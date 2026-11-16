const crypto = require('crypto');
const sessions = new Map();
const SESSION_COOKIE = 'biblioteca_session';
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

function createSession(userId, role, name, readerId) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, {
    userId,
    role,
    name,
    readerId,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  });
  return token;
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_DURATION_MS,
    path: '/',
  };
}

function requireAuth(req, res, next) {
  const token = req.cookies[SESSION_COOKIE];
  const session = token && sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    if (token) sessions.delete(token);
    return res.status(401).json({ error: 'Faça login para continuar.' });
  }
  req.user = {
    id: session.userId,
    role: session.role,
    name: session.name,
    readerId: session.readerId,
  };
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Você não tem permissão para esta ação.' });
    }
    next();
  };
}

module.exports = {
  SESSION_COOKIE,
  cookieOptions,
  createSession,
  requireAuth,
  requireRole,
  sessions,
};
