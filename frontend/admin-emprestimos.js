const adminLoansBody = document.getElementById('admin-loans-body');
const adminLoansMessage = document.getElementById('admin-loans-message');
const adminOverdueAlert = document.getElementById('admin-overdue-alert');

async function carregarTodosEmprestimos() {
  const loans = await api('/api/emprestimos');
  const overdueLoans = loans.filter((loan) => loan.status === 'ativo' && Number(loan.dias_atraso) > 0);
  const overdueReaders = [...new Map(overdueLoans.map((loan) => [loan.leitor_id, loan.leitor])).values()];
  if (overdueLoans.length) {
    const readerLabel = overdueReaders.length === 1 ? '1 leitor está' : `${overdueReaders.length} leitores estão`;
    const loanLabel = overdueLoans.length === 1 ? '1 empréstimo atrasado' : `${overdueLoans.length} empréstimos atrasados`;
    const totalFine = overdueLoans.reduce((total, loan) => total + Number(loan.multa_centavos), 0);
    adminOverdueAlert.textContent = `Atenção: ${readerLabel} com ${loanLabel}: ${overdueReaders.join(', ')}. Multas dos atrasos em aberto: ${formatarMulta(totalFine)}.`;
    adminOverdueAlert.hidden = false;
  } else {
    adminOverdueAlert.textContent = '';
    adminOverdueAlert.hidden = true;
  }

  adminLoansBody.replaceChildren();
  loans.forEach((loan) => {
    const row = document.createElement('tr');
    [
      ['Leitor', loan.leitor],
      ['Livro', loan.titulo],
      ['Retirada', new Date(`${String(loan.emprestado_em).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR')],
      ['Devolução prevista', new Date(`${String(loan.devolucao_prevista).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR')],
      ['Data da devolução', loan.devolvido_em ? new Date(`${String(loan.devolvido_em).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR') : '—'],
    ].forEach(([label, text]) => {
      const cell = document.createElement('td');
      cell.dataset.label = label;
      cell.textContent = text;
      row.append(cell);
    });
    const status = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = 'status';
    badge.textContent = loan.status === 'ativo' ? 'Ativo' : 'Devolvido';
    if (Number(loan.dias_atraso) > 0) {
      badge.classList.add('overdue');
      badge.textContent = loan.status === 'ativo' ? 'Atrasado' : 'Devolvido com atraso';
    }
    status.append(badge);
    status.dataset.label = 'Status';
    row.append(status);
    const fine = document.createElement('td');
    fine.dataset.label = 'Multa';
    fine.textContent = formatarMulta(loan.multa_centavos);
    row.append(fine);
    const action = document.createElement('td');
    action.dataset.label = 'Ação';
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
    row.className = 'empty-row';
    const cell = document.createElement('td');
    cell.colSpan = 8;
    cell.className = 'empty-state';
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
