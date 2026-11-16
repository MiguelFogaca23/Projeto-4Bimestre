const catalogo = document.getElementById('catalogo');
const campoBusca = document.getElementById('busca-livros');

function criarCard(livro) {
  const card = document.createElement('article');
  card.className = 'book-card';
  const img = document.createElement('img');
  img.src = livro.capa_url || '/frontend/cover-placeholder.svg';
  img.alt = `Capa do livro ${livro.titulo}`;
  img.loading = 'lazy';
  img.onerror = () => { img.src = '/frontend/cover-placeholder.svg'; };
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
    const busca = encodeURIComponent(campoBusca.value.trim());
    const livros = await api(`/api/livros?busca=${busca}`);
    catalogo.replaceChildren();
    if (!livros.length) {
      catalogo.innerHTML = '<p class="empty-state">Nenhum livro encontrado.</p>';
      return;
    }
    livros.forEach((livro) => catalogo.append(criarCard(livro)));
  } catch (error) {
    catalogo.textContent = error.message;
  }
}

campoBusca.addEventListener('input', carregarCatalogo);
carregarCatalogo();
