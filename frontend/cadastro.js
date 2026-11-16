document.getElementById('register-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const message = document.getElementById('register-message');
  const button = event.currentTarget.querySelector('button[type="submit"]');
  const senha = form.get('senha');

  if (senha !== form.get('confirmar-senha')) {
    mostrarMensagem(message, 'As senhas não conferem.', true);
    return;
  }

  button.disabled = true;
  mostrarMensagem(message, 'Criando sua conta...');
  try {
    await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        nome: form.get('nome'),
        email: form.get('email'),
        senha,
      }),
    });
    window.location.href = '/frontend/catalogo.html';
  } catch (error) {
    mostrarMensagem(message, error.message, true);
  } finally {
    button.disabled = false;
  }
});
