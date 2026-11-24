require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const db = require('./database');

const app = express();
const frontendPath = path.join(__dirname, '..', 'frontend');

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use((req, res, next) => {
  const origin = req.get('origin');
  const allowedOrigins = ['http://127.0.0.1:5500', 'http://localhost:5500'];

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
  }

  next();
});
app.use(express.static(frontendPath));
app.use('/frontend', express.static(frontendPath));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Compatibilidade com URLs abertas antes da organização temporária das pastas.
const legacyFrontendPages = new Set([
  'catalogo.html',
  'cadastro.html',
  'login.html',
  'livros.html',
  'emprestimos.html',
  'admin-emprestimos.html',
]);

app.get('/frontend/pages/:page', (req, res) => {
  if (legacyFrontendPages.has(req.params.page)) {
    return res.redirect(301, `/frontend/${req.params.page}`);
  }
  return res.status(404).json({ error: 'Página não encontrada' });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.get('/menu', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

const pageRoutes = {
  '/login': 'login.html',
  '/catalogo': 'catalogo.html',
  '/emprestimos': 'emprestimos.html',
  '/livros': 'livros.html',
  '/admin-emprestimos': 'admin-emprestimos.html',
};

for (const [route, page] of Object.entries(pageRoutes)) {
  app.get(route, (req, res) => {
    res.sendFile(path.join(frontendPath, page));
  });
}

app.use('/login', require('./routes/loginRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/livros', require('./routes/livrosRoutes'));
app.use('/api/emprestimos', require('./routes/emprestimosRoutes'));

app.get('/health', async (req, res, next) => {
  try {
    await db.testConnection();
    res.json({ status: 'OK', database: 'PostgreSQL' });
  } catch (error) {
    next(error);
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: 'JSON malformado' });
  }
  console.error('Erro na requisição:', error);
  res.status(error.statusCode || 500).json({
    error: error.statusCode ? error.message : 'Erro interno do servidor',
  });
});

async function startServer() {
  await db.testConnection();
  const port = Number(process.env.PORT || 3001);
  app.listen(port, () => {
    console.log(`Biblioteca Aberta disponível em http://localhost:${port}`);
  });
}

if (require.main === module) {
  startServer().catch(async (error) => {
    console.error('Não foi possível iniciar o servidor:', error.message);
    await db.pool.end();
    process.exitCode = 1;
  });
}

module.exports = app;
