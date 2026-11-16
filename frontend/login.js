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
