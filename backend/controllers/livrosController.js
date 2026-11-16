const db = require('../database');

function validarLivro(dados) {
  const titulo = String(dados.titulo || '').trim();
  const autor = String(dados.autor || '').trim();
  const categoria = String(dados.categoria || '').trim();
  const isbn = String(dados.isbn || '').trim();
  const capaUrl = String(dados.capa_url || '').trim();
  const sinopse = String(dados.sinopse || '').trim();
  const exemplares = Number(dados.exemplares);

  if (!titulo || !autor || !categoria || !Number.isInteger(exemplares) || exemplares < 1) {
    return { erro: 'Título, autor, categoria e quantidade válida de exemplares são obrigatórios.' };
  }
  if (capaUrl) {
    const caminhoLocal = capaUrl.startsWith('/uploads/') && !capaUrl.includes('..');
    let urlValida = false;
    try {
      const url = new URL(capaUrl);
      urlValida = url.protocol === 'http:' || url.protocol === 'https:';
    } catch (error) {
      urlValida = false;
    }
    if (!caminhoLocal && !urlValida) {
      return { erro: 'A capa deve usar uma URL HTTP(S) ou um caminho /uploads/.' };
    }
  }
  return {
    livro: {
      titulo,
      autor,
      isbn: isbn || null,
      categoria,
      exemplares,
      capa_url: capaUrl || null,
      sinopse: sinopse || null,
    },
  };
}

async function listar(req, res) {
  const busca = String(req.query.busca || '').trim();
  const result = await db.query(
    `SELECT l.id, l.titulo, l.autor, l.isbn, l.categoria, l.exemplares,
            l.capa_url, l.sinopse,
            GREATEST(l.exemplares - COUNT(e.id) FILTER (WHERE e.status = 'ativo'), 0)::int AS disponiveis
       FROM livros l
       LEFT JOIN emprestimos e ON e.livro_id = l.id
      WHERE $1 = '' OR l.titulo ILIKE '%' || $1 || '%'
         OR l.autor ILIKE '%' || $1 || '%' OR l.categoria ILIKE '%' || $1 || '%'
      GROUP BY l.id
      ORDER BY l.titulo`,
    [busca],
  );
  res.json(result.rows);
}

async function criar(req, res) {
  const { livro, erro } = validarLivro(req.body);
  if (erro) return res.status(400).json({ error: erro });
  try {
    const values = [livro.titulo, livro.autor, livro.isbn, livro.categoria, livro.exemplares, livro.capa_url, livro.sinopse];
    const result = await db.query(
      `INSERT INTO livros (titulo, autor, isbn, categoria, exemplares, capa_url, sinopse)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      values,
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Já existe um livro com este ISBN.' });
    throw error;
  }
}

async function atualizar(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Identificador inválido.' });
  const { livro, erro } = validarLivro(req.body);
  if (erro) return res.status(400).json({ error: erro });
  try {
    const result = await db.transaction(async (client) => {
      const current = await client.query('SELECT id FROM livros WHERE id=$1 FOR UPDATE', [id]);
      if (!current.rowCount) return null;
      const activeLoans = await client.query(
        "SELECT COUNT(*)::int AS quantidade FROM emprestimos WHERE livro_id=$1 AND status='ativo'",
        [id],
      );
      if (livro.exemplares < activeLoans.rows[0].quantidade) {
        const error = new Error('A quantidade não pode ser menor que os empréstimos ativos.');
        error.statusCode = 409;
        throw error;
      }
      const updated = await client.query(
        `UPDATE livros SET titulo=$1, autor=$2, isbn=$3, categoria=$4, exemplares=$5, capa_url=$6, sinopse=$7
         WHERE id=$8 RETURNING *`,
        [livro.titulo, livro.autor, livro.isbn, livro.categoria, livro.exemplares, livro.capa_url, livro.sinopse, id],
      );
      return updated.rows[0];
    });
    if (!result) return res.status(404).json({ error: 'Livro não encontrado.' });
    res.json(result);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Já existe um livro com este ISBN.' });
    throw error;
  }
}

async function remover(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Identificador inválido.' });
  try {
    const result = await db.query('DELETE FROM livros WHERE id=$1', [id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Livro não encontrado.' });
    res.status(204).end();
  } catch (error) {
    if (error.code === '23503') return res.status(409).json({ error: 'Não é possível remover um livro com histórico de empréstimos.' });
    throw error;
  }
}

module.exports = { listar, criar, atualizar, remover };
