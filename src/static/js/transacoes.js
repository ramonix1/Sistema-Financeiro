// transacoes.js

let _todasCategorias = [];

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('transacao-data').valueAsDate = new Date();

    await carregarCategorias();
    carregarTransacoes();

    document.getElementById('form-filtros').addEventListener('submit', e => { e.preventDefault(); carregarTransacoes(); });
    document.getElementById('btn-limpar-filtros').addEventListener('click', limparFiltros);
    document.getElementById('btn-salvar-transacao').addEventListener('click', salvarTransacao);

    // Atualiza select de categoria quando o tipo muda
    document.querySelectorAll('input[name="tipo"]').forEach(radio => {
        radio.addEventListener('change', () => filtrarCategoriasPorTipo(radio.value));
    });

    // Limpa form ao fechar modal
    document.getElementById('modalTransacao').addEventListener('hidden.bs.modal', limparFormulario);
});

// ── Categorias ─────────────────────────────────────────────────────────────
async function carregarCategorias() {
    try {
        const res = await fetch('/api/categorias/');
        const data = await res.json();
        if (data.status === 'success') {
            _todasCategorias = data.data;

            const selectFiltro = document.getElementById('filtro-categoria');
            selectFiltro.innerHTML = '<option value="">Todas</option>';
            _todasCategorias.forEach(c => {
                selectFiltro.insertAdjacentHTML('beforeend', `<option value="${c.id}">${c.nome} (${c.tipo})</option>`);
            });

            filtrarCategoriasPorTipo('entrada');
        }
    } catch (err) {
        console.error('Erro ao carregar categorias:', err);
    }
}

function filtrarCategoriasPorTipo(tipo) {
    const select = document.getElementById('transacao-categoria');
    const atualId = select.value;
    select.innerHTML = '<option value="">Selecione uma categoria</option>';
    _todasCategorias
        .filter(c => c.tipo === tipo)
        .forEach(c => {
            select.insertAdjacentHTML('beforeend', `<option value="${c.id}">${c.nome}</option>`);
        });
    // Restaurar seleção se ainda válida
    if (atualId) select.value = atualId;
}

// ── Listar transações ──────────────────────────────────────────────────────
async function carregarTransacoes() {
    const tipo = document.getElementById('filtro-tipo').value;
    const categoriaId = document.getElementById('filtro-categoria').value;
    const dataInicio = document.getElementById('filtro-data-inicio').value;
    const dataFim = document.getElementById('filtro-data-fim').value;

    const params = new URLSearchParams();
    if (tipo) params.set('tipo', tipo);
    if (categoriaId) params.set('categoria_id', categoriaId);
    if (dataInicio) params.set('data_inicio', dataInicio);
    if (dataFim) params.set('data_fim', dataFim);

    const tbody = document.getElementById('lista-transacoes');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center"><div class="spinner-border spinner-border-sm"></div> Carregando...</td></tr>';

    try {
        const res = await fetch('/api/transacoes/?' + params.toString());
        const data = await res.json();

        if (data.status !== 'success' || data.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Nenhuma transação encontrada</td></tr>';
            return;
        }

        tbody.innerHTML = data.data.map(t => `
            <tr class="fade-in">
                <td>${formatarData(t.data)}</td>
                <td>${t.descricao}</td>
                <td><span class="badge bg-secondary">${t.categoria_nome || '-'}</span></td>
                <td class="${t.tipo === 'entrada' ? 'valor-entrada' : 'valor-saida'}">${formatarMoeda(t.valor)}</td>
                <td><span class="badge ${t.tipo === 'entrada' ? 'bg-success' : 'bg-danger'}">${t.tipo === 'entrada' ? 'Entrada' : 'Saída'}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary me-1" title="Editar" onclick="editarTransacao(${JSON.stringify(t).replace(/"/g, '&quot;')})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" title="Excluir" onclick="confirmarExclusao(${t.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>`).join('');
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Erro ao carregar transações</td></tr>';
        console.error(err);
    }
}

// ── Formulário ─────────────────────────────────────────────────────────────
function limparFiltros() {
    document.getElementById('filtro-tipo').value = '';
    document.getElementById('filtro-categoria').value = '';
    document.getElementById('filtro-data-inicio').value = '';
    document.getElementById('filtro-data-fim').value = '';
    carregarTransacoes();
}

function limparFormulario() {
    document.getElementById('transacao-id').value = '';
    document.getElementById('transacao-descricao').value = '';
    document.getElementById('transacao-valor').value = '';
    document.getElementById('transacao-data').valueAsDate = new Date();
    document.getElementById('transacao-fixa').checked = false;
    document.getElementById('tipo-entrada').checked = true;
    filtrarCategoriasPorTipo('entrada');
    document.getElementById('modalTransacaoLabel').textContent = 'Nova Transação';
}

async function salvarTransacao() {
    const id = document.getElementById('transacao-id').value;
    const tipo = document.querySelector('input[name="tipo"]:checked').value;
    const descricao = document.getElementById('transacao-descricao').value.trim();
    const valor = document.getElementById('transacao-valor').value;
    const data = document.getElementById('transacao-data').value;
    const categoriaId = document.getElementById('transacao-categoria').value;
    const fixa = document.getElementById('transacao-fixa').checked;

    if (!descricao || !valor || !data || !categoriaId) {
        toast('Preencha todos os campos obrigatórios.', 'error');
        return;
    }

    const payload = { descricao, valor: parseFloat(valor), data, tipo, categoria_id: parseInt(categoriaId), fixa };
    const url = id ? `/api/transacoes/${id}` : '/api/transacoes/';
    const method = id ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data_res = await res.json();

        if (data_res.status === 'success') {
            bootstrap.Modal.getInstance(document.getElementById('modalTransacao')).hide();
            carregarTransacoes();
            toast(id ? 'Transação atualizada!' : 'Transação registrada!', 'success');
        } else {
            toast(data_res.message, 'error');
        }
    } catch (err) {
        toast('Erro ao salvar transação.', 'error');
    }
}

function editarTransacao(transacao) {
    document.getElementById('transacao-id').value = transacao.id;
    document.getElementById('transacao-descricao').value = transacao.descricao;
    document.getElementById('transacao-valor').value = transacao.valor;
    document.getElementById('transacao-data').value = transacao.data;
    document.getElementById('transacao-fixa').checked = transacao.fixa;
    document.getElementById(transacao.tipo === 'entrada' ? 'tipo-entrada' : 'tipo-saida').checked = true;

    // BUG FIX: carrega categorias e já seleciona a correta sem usar setTimeout frágil
    filtrarCategoriasPorTipo(transacao.tipo);
    document.getElementById('transacao-categoria').value = transacao.categoria_id;

    document.getElementById('modalTransacaoLabel').textContent = 'Editar Transação';
    new bootstrap.Modal(document.getElementById('modalTransacao')).show();
}

function confirmarExclusao(id) {
    document.getElementById('btn-confirmar-exclusao').onclick = () => excluirTransacao(id);
    new bootstrap.Modal(document.getElementById('modalConfirmacao')).show();
}

async function excluirTransacao(id) {
    try {
        const res = await fetch(`/api/transacoes/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.status === 'success') {
            bootstrap.Modal.getInstance(document.getElementById('modalConfirmacao')).hide();
            carregarTransacoes();
            toast('Transação excluída.', 'success');
        } else {
            toast(data.message, 'error');
        }
    } catch (err) {
        toast('Erro ao excluir transação.', 'error');
    }
}
