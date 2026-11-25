const elements = {
  form: document.getElementById('register-form'),
  message: document.getElementById('register-message'),
};

async function cadastrarUsuario(event) {
  event.preventDefault();
  const formData = new FormData(elements.form);
  const button = event.currentTarget.querySelector('button[type="submit"]');
  const senha = formData.get('senha');

  if (senha !== formData.get('confirmar-senha')) {
    mostrarMensagem(elements.message, 'As senhas não conferem.', true);
    return;
  }

  button.disabled = true;
  mostrarMensagem(elements.message, 'Criando sua conta...');
  try {
    await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        nome: formData.get('nome'),
        email: formData.get('email'),
        senha,
      }),
    });
    window.location.href = '/frontend/catalogo/catalogo.html';
  } catch (error) {
    mostrarMensagem(elements.message, error.message, true);
  } finally {
    button.disabled = false;
  }
}

function inicializarPaginaCadastro() {
  elements.form.querySelectorAll('.password-toggle').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const password = toggle.closest('.password-field').querySelector('input');
      const mostrar = password.type === 'password';

      password.type = mostrar ? 'text' : 'password';
      toggle.classList.toggle('is-visible', mostrar);
      toggle.setAttribute('aria-label', `${mostrar ? 'Ocultar' : 'Mostrar'} senha`);
      toggle.setAttribute('aria-pressed', String(mostrar));
    });
  });
  elements.form.addEventListener('submit', cadastrarUsuario);
}

inicializarPaginaCadastro();
