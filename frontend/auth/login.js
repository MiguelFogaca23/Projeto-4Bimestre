const elements = {
  password: document.getElementById('InputSenha'),
  confirmPassword: document.getElementById('InputConfirmarSenha'),
  togglePassword: document.getElementById('BotaoVizualizar'),
  form: document.getElementById('login-form'),
  message: document.getElementById('login-message'),
};

function alternarVisibilidadeSenha() {
  const mostrar = elements.password.type === 'password';

  elements.password.type = mostrar ? 'text' : 'password';
  if (elements.confirmPassword) {
    elements.confirmPassword.type = mostrar ? 'text' : 'password';
  }
  elements.togglePassword.classList.toggle('is-visible', mostrar);
  elements.togglePassword.setAttribute('aria-label', `${mostrar ? 'Ocultar' : 'Mostrar'} senha`);
  elements.togglePassword.setAttribute('aria-pressed', String(mostrar));
}

async function entrar(event) {
  event.preventDefault();
  const formData = new FormData(elements.form);

  try {
    const user = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: formData.get('email'),
        senha: formData.get('senha'),
      }),
    });

    window.location.href = user.perfil === 'admin'
      ? '/frontend/livros/livros.html'
      : '/frontend/catalogo/catalogo.html';
  } catch (error) {
    mostrarMensagem(elements.message, error.message, true);
  }
}

function inicializarPaginaLogin() {
  elements.togglePassword.addEventListener('click', alternarVisibilidadeSenha);
  elements.form.addEventListener('submit', entrar);
}

inicializarPaginaLogin();
