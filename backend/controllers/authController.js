const crypto = require('crypto');
const db = require('../database');
const {
  SESSION_COOKIE,
  cookieOptions,
  createSession,
  sessions,
} = require('../middleware/auth');

const PASSWORD_ITERATIONS = 210000;

function passwordMatches(password, storedHash) {
  const [algorithm, iterationsText, salt, hash] = storedHash.split('$');
  if (algorithm !== 'pbkdf2' || !iterationsText || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = crypto.pbkdf2Sync(password, salt, Number(iterationsText), expected.length, 'sha512');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, 64, 'sha512').toString('hex');
  return `pbkdf2$${PASSWORD_ITERATIONS}$${salt}$${hash}`;
}

async function login(req, res) {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.senha || '');
  if (!email || !password) return res.status(400).json({ error: 'Informe e-mail e senha.' });

  const result = await db.query(
    `SELECT u.id, u.nome, u.email, u.perfil, u.senha_hash, l.id AS leitor_id
       FROM usuarios u
       LEFT JOIN leitores l ON l.usuario_id = u.id
      WHERE lower(u.email) = $1`,
    [email],
  );
  const user = result.rows[0];
  if (!user || !passwordMatches(password, user.senha_hash)) {
    return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
  }

  const previousToken = req.cookies[SESSION_COOKIE];
  if (previousToken) sessions.delete(previousToken);
  const token = createSession(user.id, user.perfil, user.nome, user.leitor_id);
  res.cookie(SESSION_COOKIE, token, cookieOptions());
  res.json({ id: user.id, nome: user.nome, email: user.email, perfil: user.perfil });
}

async function register(req, res) {
  const nome = String(req.body.nome || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.senha || '');
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!nome || nome.length > 120) {
    return res.status(400).json({ error: 'Informe um nome com até 120 caracteres.' });
  }
  if (!emailIsValid || email.length > 180) {
    return res.status(400).json({ error: 'Informe um e-mail válido com até 180 caracteres.' });
  }
  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: 'A senha deve ter entre 8 e 128 caracteres.' });
  }

  let user;
  try {
    user = await db.transaction(async (client) => {
      const existingUser = await client.query(
        'SELECT 1 FROM usuarios WHERE lower(email) = $1',
        [email],
      );
      if (existingUser.rows.length > 0) return null;

      const result = await client.query(
        `INSERT INTO usuarios (nome, email, senha_hash, perfil)
         VALUES ($1, $2, $3, 'leitor')
         RETURNING id, nome, email, perfil`,
        [nome, email, hashPassword(password)],
      );
      const createdUser = result.rows[0];
      const reader = await client.query(
        'INSERT INTO leitores (usuario_id) VALUES ($1) RETURNING id',
        [createdUser.id],
      );
      return { ...createdUser, leitor_id: reader.rows[0].id };
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
    }
    throw error;
  }

  if (!user) return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });

  const previousToken = req.cookies[SESSION_COOKIE];
  if (previousToken) sessions.delete(previousToken);
  const token = createSession(user.id, user.perfil, user.nome, user.leitor_id);
  res.cookie(SESSION_COOKIE, token, cookieOptions());
  res.status(201).json({ id: user.id, nome: user.nome, email: user.email, perfil: user.perfil });
}

function logout(req, res) {
  const token = req.cookies[SESSION_COOKIE];
  if (token) sessions.delete(token);
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', path: '/' });
  res.json({ message: 'Sessão encerrada.' });
}

function currentUser(req, res) {
  const token = req.cookies[SESSION_COOKIE];
  const session = token && sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    if (token) sessions.delete(token);
    return res.json({ autenticado: false });
  }
  res.json({
    autenticado: true,
    usuario: { id: session.userId, nome: session.name, perfil: session.role },
  });
}

module.exports = { login, register, logout, currentUser };
