// contas.js

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('conta-vencimento').valueAsDate = new Date();
    document.getElementById('pagar-conta-data').valueAsDate = new Date();

    await carregarCategorias();
    carregarTudo();

    document.getElementById('form-filtros').addEventListener('submit', e => { e.preventDefault(); carregarContas(); });
    document.getElementById('btn-limpar-filtros').addEventListener('click', limparFiltros);
    document.getElementById('btn-salvar-conta').addEventListener('click', salvarConta);
    document.getElementById('btn-confirmar-pagamento').addEventListener('click', pagarConta);

    document.getElementById('conta-fixa').addEventListener('change', function () {
        document.getElementById('div-periodicidade').style.display = this.checked ? 'block' : 'none';
        if (!this.checked) document.getElementById('conta-periodicidade').value = '';
    });

    document.getElementById('vencidas-tab').addEventListener('click', carregarContasVencidas);
    document.getElementById('proximas-tab').addEventListener('click', carregarProximasContas);

    document.getElementById('modalConta').addEventListener('hidden.bs.modal', limparFormulario);
});

function carregarTudo() {
    carregarContas();
    carregarContasVencidas();
    carregarProximasContas();
}

// ── Categorias ─────────────────────────────────────────────────────────────
async function carregarCategorias() {
    try {
        const res = await fetch('/api/categorias/?tipo=saida');
        const data = await res.json();
        if (data.status === 'success') {
            const opts = data.data.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
            document.getElementById('filtro-categoria').innerHTML = '<option value="">Todas</option>' + opts;
            document.getElementById('conta-categoria').innerHTML = '<option value="">Selecione uma categoria</option>' + opts;
        }
    } catch (err) {
        console.error('Erro ao carregar categorias:', err);
    }
}

// ── Listar contas ──────────────────────────────────────────────────────────
async function carregarContas() {
    const status = document.getElementById('filtro-status').value;
    const tipo = document.getElementById('filtro-tipo').value;
    const categoriaId = document.getElementById('filtro-categoria').value;

    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (tipo) params.set('fixa', tipo);
    if (categoriaId) params.set('categoria_id', categoriaId);

    const tbody = document.getElementById('lista-contas');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center"><div class="spinner-border spinner-border-sm"></div></td></tr>';

    try {
        const res = await fetch('/api/contas/?' + params.toString());
        const data = await res.json();

        if (data.status !== 'success' || data.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Nenhuma conta encontrada</td></tr>';
            return;
        }

        tbody.innerHTML = data.data.map(c => `
            <tr class="fade-in">
                <td>${formatarData(c.data_vencimento)}</td>
                <td>${c.nome}</td>
                <td>${c.categoria_nome || '-'}</td>
                <td class="valor-saida">${formatarMoeda(c.valor)}</td>
                <td><span class="status-${c.status}">${capitalizar(c.status)}</span></td>
                <td>${c.fixa ? `Fixa${c.periodicidade ? ' (' + c.periodicidade + ')' : ''}` : 'Variável'}</td>
                <td>
                    ${c.status === 'pendente' || c.status === 'atrasada' ? `
                        <button class="btn btn-sm btn-success me-1" title="Pagar" onclick="prepararPagamento(${JSON.stringify(c).replace(/"/g, '&quot;')})">
                            <i class="bi bi-check-circle"></i>
                        </button>` : ''}
                    <button class="btn btn-sm btn-primary me-1" title="Editar" onclick="editarConta(${JSON.stringify(c).replace(/"/g, '&quot;')})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" title="Excluir" onclick="confirmarExclusao(${c.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>`).join('');
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-danger text-center">Erro ao carregar</td></tr>';
    }
}

async function carregarContasVencidas() {
    try {
        const res = await fetch('/api/contas/vencidas');
        const data = await res.json();
        const tbody = document.getElementById('lista-contas-vencidas');
        document.getElementById('contador-vencidas').textContent = data.data?.length ?? 0;

        if (!data.data?.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nenhuma conta vencida</td></tr>';
            return;
        }
        tbody.innerHTML = data.data.map(c => `
            <tr class="fade-in">
                <td>${formatarData(c.data_vencimento)}</td>
                <td>${c.nome}</td>
                <td>${c.categoria_nome || '-'}</td>
                <td class="valor-saida">${formatarMoeda(c.valor)}</td>
                <td>
                    <button class="btn btn-sm btn-success" title="Pagar" onclick="prepararPagamento(${JSON.stringify(c).replace(/"/g, '&quot;')})">
                        <i class="bi bi-check-circle"></i>
                    </button>
                </td>
            </tr>`).join('');
    } catch (err) { console.error(err); }
}

async function carregarProximasContas() {
    try {
        const res = await fetch('/api/contas/proximas?dias=7');
        const data = await res.json();
        const tbody = document.getElementById('lista-proximas-contas');
        document.getElementById('contador-proximas').textContent = data.data?.length ?? 0;

        if (!data.data?.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nenhuma conta próxima</td></tr>';
            return;
        }
        tbody.innerHTML = data.data.map(c => `
            <tr class="fade-in">
                <td>${formatarData(c.data_vencimento)}</td>
                <td>${c.nome}</td>
                <td>${c.categoria_nome || '-'}</td>
                <td class="valor-saida">${formatarMoeda(c.valor)}</td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="prepararPagamento(${JSON.stringify(c).replace(/"/g, '&quot;')})">
                        <i class="bi bi-check-circle"></i>
                    </button>
                </td>
            </tr>`).join('');
    } catch (err) { console.error(err); }
}

// ── Formulário de conta ────────────────────────────────────────────────────
function limparFiltros() {
    ['filtro-status', 'filtro-tipo', 'filtro-categoria'].forEach(id => document.getElementById(id).value = '');
    carregarContas();
}

function limparFormulario() {
    document.getElementById('conta-id').value = '';
    document.getElementById('conta-nome').value = '';
    document.getElementById('conta-valor').value = '';
    document.getElementById('conta-vencimento').valueAsDate = new Date();
    document.getElementById('conta-categoria').value = '';
    document.getElementById('conta-fixa').checked = false;
    document.getElementById('div-periodicidade').style.display = 'none';
    document.getElementById('conta-periodicidade').value = '';
    document.getElementById('conta-observacoes').value = '';
    document.getElementById('modalContaLabel').textContent = 'Nova Conta';
}

async function salvarConta() {
    const id = document.getElementById('conta-id').value;
    const nome = document.getElementById('conta-nome').value.trim();
    const valor = document.getElementById('conta-valor').value;
    const dataVencimento = document.getElementById('conta-vencimento').value;
    const categoriaId = document.getElementById('conta-categoria').value;
    const fixa = document.getElementById('conta-fixa').checked;
    const periodicidade = fixa ? document.getElementById('conta-periodicidade').value : null;
    const observacoes = document.getElementById('conta-observacoes').value;

    if (!nome || !valor || !dataVencimento || !categoriaId) {
        toast('Preencha todos os campos obrigatórios.', 'error');
        return;
    }
    if (fixa && !periodicidade) {
        toast('Selecione a periodicidade para contas fixas.', 'error');
        return;
    }

    const payload = { nome, valor: parseFloat(valor), data_vencimento: dataVencimento, categoria_id: parseInt(categoriaId), fixa, periodicidade, observacoes };
    const url = id ? `/api/contas/${id}` : '/api/contas/';

    try {
        const res = await fetch(url, {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.status === 'success') {
            bootstrap.Modal.getInstance(document.getElementById('modalConta')).hide();
            carregarTudo();
            toast(id ? 'Conta atualizada!' : 'Conta registrada!', 'success');
        } else {
            toast(data.message, 'error');
        }
    } catch (err) {
        toast('Erro ao salvar conta.', 'error');
    }
}

function prepararPagamento(conta) {
    document.getElementById('pagar-conta-id').value = conta.id;
    document.getElementById('pagar-conta-nome').value = conta.nome;
    document.getElementById('pagar-conta-valor').value = formatarMoeda(conta.valor);
    new bootstrap.Modal(document.getElementById('modalPagarConta')).show();
}

async function pagarConta() {
    const contaId = document.getElementById('pagar-conta-id').value;
    const dataPagamento = document.getElementById('pagar-conta-data').value;
    if (!dataPagamento) { toast('Informe a data de pagamento.', 'error'); return; }

    try {
        const res = await fetch(`/api/contas/${contaId}/pagar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data_pagamento: dataPagamento }),
        });
        const data = await res.json();
        if (data.status === 'success') {
            bootstrap.Modal.getInstance(document.getElementById('modalPagarConta')).hide();
            carregarTudo();
            toast('Conta paga com sucesso!', 'success');
        } else {
            toast(data.message, 'error');
        }
    } catch (err) {
        toast('Erro ao pagar conta.', 'error');
    }
}

function editarConta(conta) {
    document.getElementById('conta-id').value = conta.id;
    document.getElementById('conta-nome').value = conta.nome;
    document.getElementById('conta-valor').value = conta.valor;
    document.getElementById('conta-categoria').value = conta.categoria_id;
    document.getElementById('conta-observacoes').value = conta.observacoes || '';
    if (conta.data_vencimento) document.getElementById('conta-vencimento').value = conta.data_vencimento;
    document.getElementById('conta-fixa').checked = conta.fixa;
    document.getElementById('div-periodicidade').style.display = conta.fixa ? 'block' : 'none';
    if (conta.fixa && conta.periodicidade) document.getElementById('conta-periodicidade').value = conta.periodicidade;
    document.getElementById('modalContaLabel').textContent = 'Editar Conta';
    new bootstrap.Modal(document.getElementById('modalConta')).show();
}

function confirmarExclusao(id) {
    document.getElementById('btn-confirmar-exclusao').onclick = () => excluirConta(id);
    new bootstrap.Modal(document.getElementById('modalConfirmacao')).show();
}

async function excluirConta(id) {
    try {
        const res = await fetch(`/api/contas/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.status === 'success') {
            bootstrap.Modal.getInstance(document.getElementById('modalConfirmacao')).hide();
            carregarTudo();
            toast('Conta excluída.', 'success');
        } else {
            toast(data.message, 'error');
        }
    } catch (err) {
        toast('Erro ao excluir conta.', 'error');
    }
}

function capitalizar(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}
