const db = require('../database');

async function listar(req, res) {
  const values = [];
  let where = '';
  if (req.user.role !== 'admin') {
    if (!req.user.readerId) return res.json([]);
    values.push(req.user.readerId);
    where = 'WHERE e.leitor_id = $1';
  }
  const result = await db.query(
    `SELECT e.id, e.leitor_id, e.livro_id, e.emprestado_em, e.devolucao_prevista,
            e.devolvido_em, e.status, l.titulo, l.autor, u.nome AS leitor,
            GREATEST(COALESCE(e.devolvido_em, CURRENT_DATE) - e.devolucao_prevista, 0)::int AS dias_atraso,
            GREATEST(COALESCE(e.devolvido_em, CURRENT_DATE) - e.devolucao_prevista, 0) * 200 AS multa_centavos
       FROM emprestimos e
       JOIN livros l ON l.id = e.livro_id
       JOIN leitores le ON le.id = e.leitor_id
       JOIN usuarios u ON u.id = le.usuario_id
       ${where}
      ORDER BY e.emprestado_em DESC, e.id DESC`,
    values,
  );
  res.json(result.rows);
}

async function solicitar(req, res) {
  const livroId = Number(req.body.livro_id);
  if (!Number.isInteger(livroId) || livroId < 1) {
    return res.status(400).json({ error: 'Selecione um livro válido.' });
  }

  const emprestimo = await db.transaction(async (client) => {
    const book = await client.query('SELECT id, exemplares FROM livros WHERE id=$1 FOR UPDATE', [livroId]);
    if (!book.rowCount) {
      const error = new Error('Livro não encontrado.');
      error.statusCode = 404;
      throw error;
    }
    const existingLoan = await client.query(
      "SELECT EXISTS (SELECT 1 FROM emprestimos WHERE leitor_id=$1 AND livro_id=$2 AND status='ativo') AS possui_ativo",
      [req.user.readerId, livroId],
    );
    if (existingLoan.rows[0].possui_ativo) {
      const error = new Error('Você já possui este livro emprestado.');
      error.statusCode = 409;
      throw error;
    }
    const active = await client.query(
      "SELECT COUNT(*)::int AS quantidade FROM emprestimos WHERE livro_id=$1 AND status='ativo'",
      [livroId],
    );
    if (active.rows[0].quantidade >= book.rows[0].exemplares) {
      const error = new Error('Este livro não possui exemplares disponíveis.');
      error.statusCode = 409;
      throw error;
    }
    const result = await client.query(
      `INSERT INTO emprestimos (leitor_id, livro_id, emprestado_em, devolucao_prevista, status)
       VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days', 'ativo')
       RETURNING *`,
      [req.user.readerId, livroId],
    );
    return result.rows[0];
  });
  res.status(201).json(emprestimo);
}

async function devolver(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Identificador inválido.' });
  const values = [id];
  let ownerFilter = '';
  if (req.user.role !== 'admin') {
    values.push(req.user.readerId);
    ownerFilter = 'AND leitor_id=$2';
  }
  const result = await db.query(
    `UPDATE emprestimos SET status='devolvido', devolvido_em=CURRENT_DATE
      WHERE id=$1 AND status='ativo' ${ownerFilter} RETURNING *`,
    values,
  );
  if (!result.rowCount) return res.status(404).json({ error: 'Empréstimo ativo não encontrado ou sem permissão.' });
  res.json(result.rows[0]);
}

module.exports = { listar, solicitar, devolver };
