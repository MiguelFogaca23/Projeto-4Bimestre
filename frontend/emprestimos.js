const loansBody = document.getElementById('emprestimos-tbody');
const loansMessage = document.getElementById('emprestimos-message');

function formatarData(value) {
  return new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR');
}

async function carregarEmprestimos() {
  const loans = await api('/api/emprestimos');
  loansBody.replaceChildren();
  if (!loans.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.className = 'empty-state';
    cell.textContent = 'Você ainda não possui empréstimos. Explore o catálogo para escolher sua próxima leitura.';
    row.append(cell);
    loansBody.append(row);
    return;
  }
  loans.forEach((loan) => {
    const row = document.createElement('tr');
    [loan.titulo, formatarData(loan.emprestado_em), formatarData(loan.devolucao_prevista)].forEach((text) => {
      const cell = document.createElement('td');
      cell.textContent = text;
      row.append(cell);
    });
    const status = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = 'status';
    badge.textContent = loan.status === 'ativo' ? 'Ativo' : 'Devolvido';
    if (loan.status === 'ativo' && String(loan.devolucao_prevista).slice(0, 10) < new Date().toISOString().slice(0, 10)) {
      badge.classList.add('overdue');
      badge.textContent = 'Atrasado';
    }
    status.append(badge);
    row.append(status);
    const action = document.createElement('td');
    if (loan.status === 'ativo') {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Registrar devolução';
      button.addEventListener('click', async () => {
        try {
          await api(`/api/emprestimos/${loan.id}/devolver`, { method: 'PUT' });
          await carregarEmprestimos();
        } catch (error) {
          mostrarMensagem(loansMessage, error.message, true);
        }
      });
      action.append(button);
    } else {
      action.textContent = '—';
    }
    row.append(action);
    loansBody.append(row);
  });
}

atualizarNavegacao().then((data) => {
  if (!data.autenticado) {
    window.location.href = '/frontend/login.html';
    return;
  }
  return carregarEmprestimos();
}).catch((error) => mostrarMensagem(loansMessage, error.message, true));
