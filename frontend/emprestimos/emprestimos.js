const elements = {
  loansBody: document.getElementById('emprestimos-tbody'),
  message: document.getElementById('emprestimos-message'),
};

function criarCelula(texto) {
  const cell = document.createElement('td');
  cell.textContent = texto;
  return cell;
}

function criarCelulaStatus(loan) {
  const cell = document.createElement('td');
  const badge = document.createElement('span');
  badge.className = 'status';
  badge.textContent = loan.status === 'ativo' ? 'Ativo' : 'Devolvido';

  if (loan.status === 'ativo' && Number(loan.dias_atraso) > 0) {
    badge.classList.add('overdue');
    badge.textContent = 'Atrasado';
  }

  cell.append(badge);
  return cell;
}

function criarCelulaAcao(loan) {
  const cell = document.createElement('td');

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
      await carregarEmprestimos();
    } catch (error) {
      mostrarMensagem(elements.message, error.message, true);
    }
  });
  cell.append(button);
  return cell;
}

function criarLinhaEmprestimo(loan) {
  const row = document.createElement('tr');
  row.append(
    criarCelula(loan.titulo),
    criarCelula(formatarData(loan.emprestado_em)),
    criarCelula(formatarData(loan.devolucao_prevista)),
    criarCelulaStatus(loan),
    criarCelula(formatarMulta(loan.multa_centavos)),
    criarCelulaAcao(loan),
  );
  return row;
}

function renderizarEstadoVazio() {
  const row = document.createElement('tr');
  const cell = criarCelula(
    'Você ainda não possui empréstimos. Explore o catálogo para escolher sua próxima leitura.',
  );
  cell.colSpan = 6;
  cell.className = 'empty-state';
  row.append(cell);
  elements.loansBody.append(row);
}

async function carregarEmprestimos() {
  const loans = await api('/api/emprestimos');
  elements.loansBody.replaceChildren();

  if (!loans.length) {
    renderizarEstadoVazio();
    return;
  }

  loans.forEach((loan) => elements.loansBody.append(criarLinhaEmprestimo(loan)));
}

async function inicializarPaginaEmprestimos() {
  try {
    const data = await atualizarNavegacao();
    if (!data.autenticado) {
      window.location.href = '/frontend/auth/login.html';
      return;
    }
    await carregarEmprestimos();
  } catch (error) {
    mostrarMensagem(elements.message, error.message, true);
  }
}

inicializarPaginaEmprestimos();
