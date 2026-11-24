const elements = {
  catalog: document.getElementById('catalogo'),
  search: document.getElementById('busca-livros'),
};

function criarCard(livro) {
  const card = document.createElement('article');
  card.className = 'book-card';
  const img = document.createElement('img');
  img.alt = `Capa do livro ${livro.titulo}`;
  img.loading = 'lazy';
  configurarCapa(img, livro);
  const info = document.createElement('div');
  info.className = 'book-info';
  const title = document.createElement('h3');
  title.textContent = livro.titulo;
  const author = document.createElement('p');
  author.textContent = livro.autor;
  const category = document.createElement('p');
  category.className = 'category';
  category.textContent = livro.categoria;
  const available = document.createElement('p');
  available.textContent = `${livro.disponiveis} de ${livro.exemplares} exemplares disponíveis`;
  const borrow = document.createElement('button');
  borrow.type = 'button';
  borrow.textContent = 'Solicitar empréstimo';
  borrow.disabled = Number(livro.disponiveis) < 1;
  borrow.addEventListener('click', async () => {
    try {
      await api('/api/emprestimos', {
        method: 'POST',
        body: JSON.stringify({ livro_id: livro.id }),
      });
      window.alert('Empréstimo solicitado! O prazo de devolução é de 14 dias.');
      await carregarCatalogo();
    } catch (error) {
      if (error.message.includes('login')) window.location.href = '/frontend/login.html';
      else window.alert(error.message);
    }
  });
  info.append(title, author, category, available, borrow);
  card.append(img, info);
  return card;
}

async function carregarCatalogo() {
  try {
    const busca = encodeURIComponent(elements.search.value.trim());
    const livros = await api(`/api/livros?busca=${busca}`);
    elements.catalog.replaceChildren();
    if (!livros.length) {
      elements.catalog.innerHTML = '<p class="empty-state">Nenhum livro encontrado.</p>';
      return;
    }
    livros.forEach((livro) => elements.catalog.append(criarCard(livro)));
  } catch (error) {
    elements.catalog.textContent = error.message;
  }
}

function inicializarPaginaCatalogo() {
  elements.search.addEventListener('input', carregarCatalogo);
  carregarCatalogo();
}

inicializarPaginaCatalogo();
