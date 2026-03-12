// Transacoes.js - Script para a página de transações

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar data atual no formulário
    document.getElementById('transacao-data').valueAsDate = new Date();
    
    // Carregar dados iniciais
    carregarCategorias();
    carregarTransacoes();
    
    // Configurar eventos
    document.getElementById('form-filtros').addEventListener('submit', function(e) {
        e.preventDefault();
        carregarTransacoes();
    });
    
    document.getElementById('btn-limpar-filtros').addEventListener('click', limparFiltros);
    document.getElementById('btn-salvar-transacao').addEventListener('click', salvarTransacao);
    
    // Alternar categorias quando o tipo de transação mudar
    document.getElementById('tipo-entrada').addEventListener('change', function() {
        carregarCategoriasPorTipo('entrada');
    });
    
    document.getElementById('tipo-saida').addEventListener('change', function() {
        carregarCategoriasPorTipo('saida');
    });
});

// Função para formatar valores monetários
function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
}

// Função para formatar datas
function formatarData(dataStr) {
    const data = new Date(dataStr);
    return data.toLocaleDateString('pt-BR');
}

// Carregar categorias
function carregarCategorias() {
    fetch('/api/categorias')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                const categorias = data.data;
                const selectFiltro = document.getElementById('filtro-categoria');
                
                // Limpar opções existentes
                selectFiltro.innerHTML = '<option value="">Todas</option>';
                
                // Adicionar categorias ao filtro
                categorias.forEach(categoria => {
                    const option = document.createElement('option');
                    option.value = categoria.id;
                    option.textContent = categoria.nome;
                    selectFiltro.appendChild(option);
                });
                
                // Carregar categorias iniciais no formulário (tipo entrada por padrão)
                carregarCategoriasPorTipo('entrada');
            }
        })
        .catch(error => console.error('Erro ao carregar categorias:', error));
}

// Carregar categorias por tipo
function carregarCategoriasPorTipo(tipo) {
    fetch(`/api/categorias?tipo=${tipo}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                const categorias = data.data;
                const selectCategoria = document.getElementById('transacao-categoria');
                
                // Limpar opções existentes
                selectCategoria.innerHTML = '<option value="">Selecione uma categoria</option>';
                
                // Adicionar categorias
                categorias.forEach(categoria => {
                    const option = document.createElement('option');
                    option.value = categoria.id;
                    option.textContent = categoria.nome;
                    selectCategoria.appendChild(option);
                });
            }
        })
        .catch(error => console.error('Erro ao carregar categorias por tipo:', error));
}

// Carregar transações
function carregarTransacoes() {
    // Obter filtros
    const tipo = document.getElementById('filtro-tipo').value;
    const categoriaId = document.getElementById('filtro-categoria').value;
    const dataInicio = document.getElementById('filtro-data-inicio').value;
    const dataFim = document.getElementById('filtro-data-fim').value;
    
    // Construir URL com filtros
    let url = '/api/transacoes/?';
    if (tipo) url += `tipo=${tipo}&`;
    if (categoriaId) url += `categoria_id=${categoriaId}&`;
    if (dataInicio) url += `data_inicio=${dataInicio}&`;
    if (dataFim) url += `data_fim=${dataFim}&`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                const transacoes = data.data;
                const tbody = document.getElementById('lista-transacoes');
                
                if (transacoes.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhuma transação encontrada</td></tr>';
                    return;
                }
                
                tbody.innerHTML = '';
                
                transacoes.forEach(transacao => {
                    const tr = document.createElement('tr');
                    
                    // Data
                    const tdData = document.createElement('td');
                    tdData.textContent = formatarData(transacao.data);
                    tr.appendChild(tdData);
                    
                    // Descrição
                    const tdDesc = document.createElement('td');
                    tdDesc.textContent = transacao.descricao;
                    tr.appendChild(tdDesc);
                    
                    // Categoria
                    const tdCat = document.createElement('td');
                    tdCat.textContent = transacao.categoria_nome;
                    tr.appendChild(tdCat);
                    
                    // Valor
                    const tdValor = document.createElement('td');
                    tdValor.textContent = formatarMoeda(transacao.valor);
                    tdValor.classList.add(transacao.tipo === 'entrada' ? 'valor-entrada' : 'valor-saida');
                    tr.appendChild(tdValor);
                    
                    // Tipo
                    const tdTipo = document.createElement('td');
                    const badgeTipo = document.createElement('span');
                    badgeTipo.classList.add('badge', transacao.tipo === 'entrada' ? 'bg-success' : 'bg-danger');
                    badgeTipo.textContent = transacao.tipo.charAt(0).toUpperCase() + transacao.tipo.slice(1);
                    tdTipo.appendChild(badgeTipo);
                    tr.appendChild(tdTipo);
                    
                    // Ações
                    const tdAcoes = document.createElement('td');
                    
                    // Botão Editar
                    const btnEditar = document.createElement('button');
                    btnEditar.classList.add('btn', 'btn-sm', 'btn-primary', 'me-1');
                    btnEditar.innerHTML = '<i class="bi bi-pencil"></i>';
                    btnEditar.title = 'Editar';
                    btnEditar.onclick = function() {
                        editarTransacao(transacao);
                    };
                    tdAcoes.appendChild(btnEditar);
                    
                    // Botão Excluir
                    const btnExcluir = document.createElement('button');
                    btnExcluir.classList.add('btn', 'btn-sm', 'btn-danger');
                    btnExcluir.innerHTML = '<i class="bi bi-trash"></i>';
                    btnExcluir.title = 'Excluir';
                    btnExcluir.onclick = function() {
                        confirmarExclusao(transacao.id);
                    };
                    tdAcoes.appendChild(btnExcluir);
                    
                    tr.appendChild(tdAcoes);
                    
                    tbody.appendChild(tr);
                });
            }
        })
        .catch(error => console.error('Erro ao carregar transações:', error));
}

// Limpar filtros
function limparFiltros() {
    document.getElementById('filtro-tipo').value = '';
    document.getElementById('filtro-categoria').value = '';
    document.getElementById('filtro-data-inicio').value = '';
    document.getElementById('filtro-data-fim').value = '';
    
    carregarTransacoes();
}

// Salvar transação
function salvarTransacao() {
    const id = document.getElementById('transacao-id').value;
    const tipo = document.querySelector('input[name="tipo"]:checked').value;
    const descricao = document.getElementById('transacao-descricao').value;
    const valor = document.getElementById('transacao-valor').value;
    const data = document.getElementById('transacao-data').value;
    const categoriaId = document.getElementById('transacao-categoria').value;
    const fixa = document.getElementById('transacao-fixa').checked;
    
    // Validar campos obrigatórios
    if (!descricao || !valor || !data || !categoriaId) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }
    
    const transacao = {
        descricao,
        valor: parseFloat(valor),
        data,
        tipo,
        categoria_id: parseInt(categoriaId),
        fixa
    };
    
    // Determinar se é uma criação ou atualização
    const metodo = id ? 'PUT' : 'POST';
    const url = id ? `/api/transacoes/${id}` : '/api/transacoes/';
    
    fetch(url, {
        method: metodo,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(transacao)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            // Fechar modal e recarregar transações
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalTransacao'));
            modal.hide();
            
            carregarTransacoes();
            limparFormulario();
            
            alert(id ? 'Transação atualizada com sucesso!' : 'Transação registrada com sucesso!');
        } else {
            alert('Erro: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Erro ao salvar transação:', error);
        alert('Ocorreu um erro ao salvar a transação.');
    });
}

// Editar transação
function editarTransacao(transacao) {
    // Preencher formulário com dados da transação
    document.getElementById('transacao-id').value = transacao.id;
    document.getElementById('transacao-descricao').value = transacao.descricao;
    document.getElementById('transacao-valor').value = transacao.valor;
    document.getElementById('transacao-data').value = transacao.data;
    document.getElementById('transacao-fixa').checked = transacao.fixa;
    
    // Selecionar tipo
    if (transacao.tipo === 'entrada') {
        document.getElementById('tipo-entrada').checked = true;
    } else {
        document.getElementById('tipo-saida').checked = true;
    }
    
    // Carregar categorias do tipo correto
    carregarCategoriasPorTipo(transacao.tipo);
    
    // Aguardar um pouco para as categorias serem carregadas
    setTimeout(() => {
        document.getElementById('transacao-categoria').value = transacao.categoria_id;
    }, 300);
    
    // Atualizar título do modal
    document.getElementById('modalTransacaoLabel').textContent = 'Editar Transação';
    
    // Abrir modal
    const modal = new bootstrap.Modal(document.getElementById('modalTransacao'));
    modal.show();
}

// Confirmar exclusão
function confirmarExclusao(id) {
    // Armazenar ID da transação a ser excluída
    document.getElementById('btn-confirmar-exclusao').dataset.id = id;
    
    // Configurar evento de exclusão
    document.getElementById('btn-confirmar-exclusao').onclick = function() {
        const transacaoId = this.dataset.id;
        excluirTransacao(transacaoId);
    };
    
    // Abrir modal de confirmação
    const modal = new bootstrap.Modal(document.getElementById('modalConfirmacao'));
    modal.show();
}

// Excluir transação
function excluirTransacao(id) {
    fetch(`/api/transacoes/${id}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            // Fechar modal e recarregar transações
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalConfirmacao'));
            modal.hide();
            
            carregarTransacoes();
            
            alert('Transação excluída com sucesso!');
        } else {
            alert('Erro: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Erro ao excluir transação:', error);
        alert('Ocorreu um erro ao excluir a transação.');
    });
}

// Limpar formulário
function limparFormulario() {
    document.getElementById('transacao-id').value = '';
    document.getElementById('transacao-descricao').value = '';
    document.getElementById('transacao-valor').value = '';
    document.getElementById('transacao-data').valueAsDate = new Date();
    document.getElementById('transacao-fixa').checked = false;
    document.getElementById('tipo-entrada').checked = true;
    
    // Recarregar categorias de entrada
    carregarCategoriasPorTipo('entrada');
    
    // Resetar título do modal
    document.getElementById('modalTransacaoLabel').textContent = 'Nova Transação';
}
