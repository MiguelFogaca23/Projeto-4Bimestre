function MostrarSenha() {
  const senhaInput = document.getElementById('InputSenha');
  const confirmaInput = document.getElementById('InputConfirmarSenha');
  const botao = document.getElementById('BotaoVizualizar');
  const mostrar = senhaInput.type === 'password';

  senhaInput.type = mostrar ? 'text' : 'password';
  if (confirmaInput) confirmaInput.type = mostrar ? 'text' : 'password';
  botao.classList.toggle('is-visible', mostrar);
  botao.setAttribute('aria-label', `${mostrar ? 'Ocultar' : 'Mostrar'} senha`);
  botao.setAttribute('aria-pressed', String(mostrar));
}

document.getElementById('BotaoVizualizar').addEventListener('click', MostrarSenha);

document.getElementById('login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const message = document.getElementById('login-message');
  try {
    const user = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: form.get('email'), senha: form.get('senha') }),
    });
    window.location.href = user.perfil === 'admin'
      ? '/frontend/livros.html'
      : '/frontend/catalogo.html';
  } catch (error) {
    mostrarMensagem(message, error.message, true);
  }
});
