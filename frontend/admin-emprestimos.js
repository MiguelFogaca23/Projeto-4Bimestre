const adminLoansBody = document.getElementById('admin-loans-body');
const adminLoansMessage = document.getElementById('admin-loans-message');

async function carregarTodosEmprestimos() {
  const loans = await api('/api/emprestimos');
  adminLoansBody.replaceChildren();
  loans.forEach((loan) => {
    const row = document.createElement('tr');
    [loan.leitor, loan.titulo, new Date(`${String(loan.emprestado_em).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR'), new Date(`${String(loan.devolucao_prevista).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR'), loan.status === 'ativo' ? 'Ativo' : 'Devolvido'].forEach((text) => {
      const cell = document.createElement('td');
      cell.textContent = text;
      row.append(cell);
    });
    const action = document.createElement('td');
    if (loan.status === 'ativo') {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Registrar devolução';
      button.addEventListener('click', async () => {
        try {
          await api(`/api/emprestimos/${loan.id}/devolver`, { method: 'PUT' });
          await carregarTodosEmprestimos();
        } catch (error) {
          mostrarMensagem(adminLoansMessage, error.message, true);
        }
      });
      action.append(button);
    } else action.textContent = '—';
    row.append(action);
    adminLoansBody.append(row);
  });
  if (!loans.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.textContent = 'Nenhum empréstimo cadastrado.';
    row.append(cell);
    adminLoansBody.append(row);
  }
}

atualizarNavegacao().then((data) => {
  if (!data.autenticado || data.usuario.perfil !== 'admin') {
    window.location.href = '/frontend/login.html';
    return;
  }
  return carregarTodosEmprestimos();
}).catch((error) => mostrarMensagem(adminLoansMessage, error.message, true));
