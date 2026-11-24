const livroForm = document.getElementById('livro-form');
const livrosBody = document.getElementById('livros-tbody');
const livroMessage = document.getElementById('livro-message');
let editingId = null;

function resetForm() {
  editingId = null;
  livroForm.reset();
  livroForm.elements.exemplares.value = 1;
  document.getElementById('form-title').textContent = 'Cadastrar livro';
}

async function carregarLivros() {
  const books = await api('/api/livros');
  livrosBody.replaceChildren();
  books.forEach((book) => {
    const row = document.createElement('tr');
    const coverCell = document.createElement('td');
    const img = document.createElement('img');
    img.alt = `Capa de ${book.titulo}`;
    img.width = 42;
    img.height = 56;
    configurarCapa(img, book);
    coverCell.append(img);
    const titleCell = document.createElement('td');
    titleCell.textContent = `${book.titulo} — ${book.autor}`;
    const categoryCell = document.createElement('td');
    categoryCell.textContent = book.categoria;
    const availableCell = document.createElement('td');
    availableCell.textContent = `${book.disponiveis}/${book.exemplares}`;
    const actions = document.createElement('td');
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.textContent = 'Editar';
    edit.addEventListener('click', () => {
      editingId = book.id;
      ['titulo', 'autor', 'categoria', 'isbn', 'exemplares', 'capa_url', 'sinopse'].forEach((field) => {
        livroForm.elements[field].value = book[field] || '';
      });
      document.getElementById('form-title').textContent = 'Editar livro';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'button-danger';
    remove.textContent = 'Excluir';
    remove.addEventListener('click', async () => {
      if (!window.confirm(`Excluir "${book.titulo}"?`)) return;
      try {
        await api(`/api/livros/${book.id}`, { method: 'DELETE' });
        await carregarLivros();
      } catch (error) {
        mostrarMensagem(livroMessage, error.message, true);
      }
    });
    actions.append(edit, document.createTextNode(' '), remove);
    row.append(coverCell, titleCell, categoryCell, availableCell, actions);
    livrosBody.append(row);
  });
}

async function salvarLivro(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(livroForm).entries());
  data.exemplares = Number(data.exemplares);
  try {
    await api(editingId ? `/api/livros/${editingId}` : '/api/livros', {
      method: editingId ? 'PUT' : 'POST',
      body: JSON.stringify(data),
    });
    mostrarMensagem(livroMessage, editingId ? 'Livro atualizado.' : 'Livro cadastrado.');
    resetForm();
    await carregarLivros();
  } catch (error) {
    mostrarMensagem(livroMessage, error.message, true);
  }
}

async function inicializarPaginaLivros() {
  try {
    const data = await atualizarNavegacao();
    if (!data.autenticado || data.usuario.perfil !== 'admin') {
      window.location.href = '/frontend/auth/login.html';
      return;
    }
    livroForm.addEventListener('submit', salvarLivro);
    document.getElementById('cancelar-edicao').addEventListener('click', resetForm);
    await carregarLivros();
  } catch (error) {
    mostrarMensagem(livroMessage, error.message, true);
  }
}

inicializarPaginaLivros();
