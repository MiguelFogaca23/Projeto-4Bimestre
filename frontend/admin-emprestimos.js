const elements = {
  loansBody: document.getElementById('admin-loans-body'),
  message: document.getElementById('admin-loans-message'),
  overdueAlert: document.getElementById('admin-overdue-alert'),
};

function atualizarAlertaAtrasos(loans) {
  const overdueLoans = loans.filter(
    (loan) => loan.status === 'ativo' && Number(loan.dias_atraso) > 0,
  );
  const overdueReaders = [...new Map(
    overdueLoans.map((loan) => [loan.leitor_id, loan.leitor]),
  ).values()];

  if (overdueLoans.length) {
    const readerLabel = overdueReaders.length === 1 ? '1 leitor está' : `${overdueReaders.length} leitores estão`;
    const loanLabel = overdueLoans.length === 1 ? '1 empréstimo atrasado' : `${overdueLoans.length} empréstimos atrasados`;
    const totalFine = overdueLoans.reduce((total, loan) => total + Number(loan.multa_centavos), 0);
    elements.overdueAlert.textContent = `Atenção: ${readerLabel} com ${loanLabel}: ${overdueReaders.join(', ')}. Multas dos atrasos em aberto: ${formatarMulta(totalFine)}.`;
    elements.overdueAlert.hidden = false;
  } else {
    elements.overdueAlert.textContent = '';
    elements.overdueAlert.hidden = true;
  }
}

function criarCelula(texto, label) {
  const cell = document.createElement('td');
  cell.dataset.label = label;
  cell.textContent = texto;
  return cell;
}

function criarCelulaStatus(loan) {
  const cell = document.createElement('td');
  const badge = document.createElement('span');
  badge.className = 'status';
  badge.textContent = loan.status === 'ativo' ? 'Ativo' : 'Devolvido';

  if (Number(loan.dias_atraso) > 0) {
    badge.classList.add('overdue');
    badge.textContent = loan.status === 'ativo' ? 'Atrasado' : 'Devolvido com atraso';
  }

  cell.dataset.label = 'Status';
  cell.append(badge);
  return cell;
}

function criarCelulaAcao(loan) {
  const cell = document.createElement('td');
  cell.dataset.label = 'Ação';

  if (loan.status !== 'ativo') {
    cell.textContent = '—';
    return cell;
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Registrar devolução';
  button.addEventListener('click', async () => {
    try {
      await api(`/api/emprestimos/${loan.id}/devolver`, { method: 'PUT' });
      await carregarTodosEmprestimos();
    } catch (error) {
      mostrarMensagem(elements.message, error.message, true);
    }
  });
  cell.append(button);
  return cell;
}

function criarLinhaEmprestimo(loan) {
  const row = document.createElement('tr');
  const cells = [
    criarCelula(loan.leitor, 'Leitor'),
    criarCelula(loan.titulo, 'Livro'),
    criarCelula(formatarData(loan.emprestado_em), 'Retirada'),
    criarCelula(formatarData(loan.devolucao_prevista), 'Devolução prevista'),
    criarCelula(loan.devolvido_em ? formatarData(loan.devolvido_em) : '—', 'Data da devolução'),
    criarCelulaStatus(loan),
    criarCelula(formatarMulta(loan.multa_centavos), 'Multa'),
    criarCelulaAcao(loan),
  ];
  row.append(...cells);
  return row;
}

function renderizarEmprestimos(loans) {
  elements.loansBody.replaceChildren();
  loans.forEach((loan) => elements.loansBody.append(criarLinhaEmprestimo(loan)));

  if (!loans.length) {
    const row = document.createElement('tr');
    row.className = 'empty-row';
    const cell = document.createElement('td');
    cell.colSpan = 8;
    cell.className = 'empty-state';
    cell.textContent = 'Nenhum empréstimo cadastrado.';
    row.append(cell);
    elements.loansBody.append(row);
  }
}

async function carregarTodosEmprestimos() {
  const loans = await api('/api/emprestimos');
  atualizarAlertaAtrasos(loans);
  renderizarEmprestimos(loans);
}

async function inicializarPaginaAdminEmprestimos() {
  try {
    const data = await atualizarNavegacao();
    if (!data.autenticado || data.usuario.perfil !== 'admin') {
      window.location.href = '/frontend/login.html';
      return;
    }
    await carregarTodosEmprestimos();
  } catch (error) {
    mostrarMensagem(elements.message, error.message, true);
  }
}

inicializarPaginaAdminEmprestimos();
