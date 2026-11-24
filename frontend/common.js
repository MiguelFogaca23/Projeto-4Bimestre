const API_BASE_URL = window.location.port === '5500'
  ? `http://${window.location.hostname}:3001`
  : '';

const THEME_STORAGE_KEY = 'biblioteca-theme';

function temaAtual() {
  const temaSalvo = localStorage.getItem(THEME_STORAGE_KEY);
  if (temaSalvo === 'dark' || temaSalvo === 'light') return temaSalvo;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function aplicarTema(tema) {
  document.documentElement.dataset.theme = tema;
  document.documentElement.style.colorScheme = tema;
  document.querySelectorAll('[data-theme-toggle]').forEach((botao) => {
    const escuro = tema === 'dark';
    botao.setAttribute('aria-label', escuro ? 'Alternar para tema claro' : 'Alternar para tema escuro');
    botao.setAttribute('aria-pressed', String(escuro));
    botao.title = escuro ? 'Usar tema claro' : 'Usar tema escuro';
    const icone = botao.querySelector('[data-theme-icon]');
    const texto = botao.querySelector('[data-theme-label]');
    if (icone) icone.textContent = escuro ? '☀' : '☾';
    if (texto) texto.textContent = escuro ? 'Claro' : 'Escuro';
  });
}

function alternarTema() {
  const novoTema = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_STORAGE_KEY, novoTema);
  aplicarTema(novoTema);
}

function configurarAlternadorTema() {
  let botao = document.querySelector('[data-theme-toggle]');
  if (!botao) {
    botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'theme-toggle';
    botao.dataset.themeToggle = '';
    botao.innerHTML = '<span data-theme-icon aria-hidden="true"></span><span data-theme-label>Escuro</span>';
    const navegacao = document.querySelector('.site-header nav');
    if (navegacao) navegacao.appendChild(botao);
    else document.body.appendChild(botao);
  }
  botao.addEventListener('click', alternarTema);
  aplicarTema(document.documentElement.dataset.theme || temaAtual());
}

aplicarTema(temaAtual());

async function api(url, options = {}) {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a solicitação.');
  return data;
}

function mostrarMensagem(elemento, texto, erro = false) {
  if (!elemento) return;
  elemento.textContent = texto;
  elemento.classList.toggle('error', erro);
}

function formatarMulta(centavos) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(Number(centavos) / 100);
}

function formatarData(value) {
  return new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR');
}

function configurarCapa(img, livro) {
  const placeholder = '/frontend/cover-placeholder.svg';
  const candidates = [];
  const addCandidate = (url) => {
    if (!url || candidates.includes(url)) return;
    try {
      const parsed = new URL(url, window.location.href);
      if (parsed.hostname === 'covers.openlibrary.org' && parsed.pathname.includes('/isbn/')) {
        parsed.searchParams.set('default', 'false');
      }
      candidates.push(parsed.href);
    } catch (error) {
      console.warn('URL de capa inválida:', error);
    }
  };

  addCandidate(livro.capa_url);
  if (livro.isbn) addCandidate(`https://covers.openlibrary.org/b/isbn/${encodeURIComponent(livro.isbn)}-L.jpg?default=false`);

  let candidateIndex = 0;
  let searchAttempted = false;
  img.onerror = async () => {
    if (candidateIndex < candidates.length) {
      img.src = candidates[candidateIndex++];
      return;
    }
    if (searchAttempted) {
      img.onerror = null;
      img.src = placeholder;
      return;
    }
    searchAttempted = true;

    try {
      const params = new URLSearchParams({ fields: 'cover_i', limit: '5' });
      if (livro.titulo) params.set('title', livro.titulo);
      if (livro.autor) params.set('author', livro.autor);
      const response = await fetch(`https://openlibrary.org/search.json?${params}`);
      if (!response.ok) throw new Error(`Open Library respondeu com HTTP ${response.status}.`);
      const result = await response.json();
      const bookWithCover = Array.isArray(result.docs) ? result.docs.find((item) => item.cover_i) : null;
      if (bookWithCover) {
        addCandidate(`https://covers.openlibrary.org/b/id/${bookWithCover.cover_i}-L.jpg?default=false`);
        img.src = candidates[candidateIndex++];
        return;
      }
    } catch (error) {
      console.warn('Não foi possível buscar outra capa para o livro:', error);
    }

    img.onerror = null;
    img.src = placeholder;
  };
  if (candidates.length) img.src = candidates[candidateIndex++];
  else img.onerror();
}

async function atualizarNavegacao() {
  const data = await api('/api/auth/me');
  const usuario = data.autenticado ? data.usuario : null;

  document.querySelectorAll('[data-admin-only]').forEach((item) => {
    item.hidden = !usuario || usuario.perfil !== 'admin';
  });
  document.querySelectorAll('[data-login-link]').forEach((item) => {
    item.hidden = Boolean(usuario);
  });
  document.querySelectorAll('[data-user-greeting]').forEach((item) => {
    item.hidden = !usuario;
    if (usuario) {
      const perfil = usuario.perfil === 'admin' ? 'Administrador' : 'Leitor';
      item.textContent = `Olá, ${usuario.nome} (${perfil})`;
    }
  });
  document.querySelectorAll('[data-logout]').forEach((item) => {
    item.hidden = !usuario;
    item.addEventListener('click', async () => {
      try {
        await api('/api/auth/logout', { method: 'POST' });
        window.location.href = '/';
      } catch (error) {
        window.alert(error.message);
      }
    }, { once: true });
  });
  return data;
}

window.api = api;
window.mostrarMensagem = mostrarMensagem;
window.formatarMulta = formatarMulta;
window.formatarData = formatarData;
window.configurarCapa = configurarCapa;
window.atualizarNavegacao = atualizarNavegacao;

document.addEventListener('DOMContentLoaded', () => {
  configurarAlternadorTema();
  atualizarNavegacao().catch((error) => console.error(error));
});
