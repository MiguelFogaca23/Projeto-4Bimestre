const API_BASE_URL = window.location.port === '5500'
  ? `http://${window.location.hostname}:3001`
  : '';

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
window.atualizarNavegacao = atualizarNavegacao;

document.addEventListener('DOMContentLoaded', () => {
  atualizarNavegacao().catch((error) => console.error(error));
});
