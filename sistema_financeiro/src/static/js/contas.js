// Contas.js - Script para a página de contas

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar data atual no formulário
    document.getElementById('conta-vencimento').valueAsDate = new Date();
    document.getElementById('pagar-conta-data').valueAsDate = new Date();
    
    // Carregar dados iniciais
    carregarCategorias();
    carregarContas();
    carregarContasVencidas();
    carregarProximasContas();
    
    // Configurar eventos
    document.getElementById('form-filtros').addEventListener('submit', function(e) {
        e.preventDefault();
        carregarContas();
    });
    
    document.getElementById('btn-limpar-filtros').addEventListener('click', limparFiltros);
    document.getElementById('btn-salvar-conta').addEventListener('click', salvarConta);
    document.getElementById('btn-confirmar-pagamento').addEventListener('click', pagarConta);
    
    // Mostrar/ocultar campo de periodicidade quando conta fixa for marcada/desmarcada
    document.getElementById('conta-fixa').addEventListener('change', function() {
        document.getElementById('div-periodicidade').style.display = this.checked ? 'block' : 'none';
        
        // Limpar campo de periodicidade quando desmarcado
        if (!this.checked) {
            document.getElementById('conta-periodicidade').value = '';
        }
    });
    
    // Configurar eventos de abas
    document.getElementById('vencidas-tab').addEventListener('click', function() {
        carregarContasVencidas();
    });
    
    document.getElementById('proximas-tab').addEventListener('click', function() {
        carregarProximasContas();
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
    if (!dataStr) return '-';
    const data = new Date(dataStr);
    return data.toLocaleDateString('pt-BR');
}

// Carregar categorias
function carregarCategorias() {
    fetch('/api/categorias/?tipo=saída')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                const categorias = data.data;
                const selectFiltro = document.getElementById('filtro-categoria');
                const selectConta = document.getElementById('conta-categoria');
                
                // Limpar opções existentes
                selectFiltro.innerHTML = '<option value="">Todas</option>';
                selectConta.innerHTML = '<option value="">Selecione uma categoria</option>';
                
                // Adicionar categorias
                categorias.forEach(categoria => {
                    // Para o filtro
                    const optionFiltro = document.createElement('option');
                    optionFiltro.value = categoria.id;
                    optionFiltro.textContent = categoria.nome;
                    selectFiltro.appendChild(optionFiltro);
                    
                    // Para o formulário de conta
                    const optionConta = document.createElement('option');
                    optionConta.value = categoria.id;
                    optionConta.textContent = categoria.nome;
                    selectConta.appendChild(optionConta);
                });
            }
        })
        .catch(error => console.error('Erro ao carregar categorias:', error));
}

// Carregar contas
function carregarContas() {
    // Obter filtros
    const status = document.getElementById('filtro-status').value;
    const tipo = document.getElementById('filtro-tipo').value;
    const categoriaId = document.getElementById('filtro-categoria').value;
    
    // Construir URL com filtros
    let url = '/api/contas/?';
    if (status) url += `status=${status}&`;
    if (tipo) url += `fixa=${tipo}&`;
    if (categoriaId) url += `categoria_id=${categoriaId}&`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                const contas = data.data;
                const tbody = document.getElementById('lista-contas');
                
                if (contas.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="7" class="text-center">Nenhuma conta encontrada</td></tr>';
                    return;
                }
                
                tbody.innerHTML = '';
                
                contas.forEach(conta => {
                    const tr = document.createElement('tr');
                    
                    // Data de vencimento
                    const tdData = document.createElement('td');
                    tdData.textContent = formatarData(conta.data_vencimento);
                    tr.appendChild(tdData);
                    
                    // Nome
                    const tdNome = document.createElement('td');
                    tdNome.textContent = conta.nome;
                    tr.appendChild(tdNome);
                    
                    // Categoria
                    const tdCat = document.createElement('td');
                    tdCat.textContent = conta.categoria_nome;
                    tr.appendChild(tdCat);
                    
                    // Valor
                    const tdValor = document.createElement('td');
                    tdValor.textContent = formatarMoeda(conta.valor);
                    tdValor.classList.add('valor-saida');
                    tr.appendChild(tdValor);
                    
                    // Status
                    const tdStatus = document.createElement('td');
                    const spanStatus = document.createElement('span');
                    spanStatus.classList.add(`status-${conta.status}`);
                    spanStatus.textContent = conta.status.charAt(0).toUpperCase() + conta.status.slice(1);
                    tdStatus.appendChild(spanStatus);
                    tr.appendChild(tdStatus);
                    
                    // Tipo
                    const tdTipo = document.createElement('td');
                    tdTipo.textContent = conta.fixa ? 'Fixa' : 'Variável';
                    if (conta.fixa && conta.periodicidade) {
                        tdTipo.textContent += ` (${conta.periodicidade})`;
                    }
                    tr.appendChild(tdTipo);
                    
                    // Ações
                    const tdAcoes = document.createElement('td');
                    
                    // Botão Pagar (apenas para contas pendentes)
                    if (conta.status === 'pendente') {
                        const btnPagar = document.createElement('button');
                        btnPagar.classList.add('btn', 'btn-sm', 'btn-success', 'me-1');
                        btnPagar.innerHTML = '<i class="bi bi-check-circle"></i>';
                        btnPagar.title = 'Pagar Conta';
                        btnPagar.onclick = function() {
                            prepararPagamento(conta);
                        };
                        tdAcoes.appendChild(btnPagar);
                    }
                    
                    // Botão Editar
                    const btnEditar = document.createElement('button');
                    btnEditar.classList.add('btn', 'btn-sm', 'btn-primary', 'me-1');
                    btnEditar.innerHTML = '<i class="bi bi-pencil"></i>';
                    btnEditar.title = 'Editar';
                    btnEditar.onclick = function() {
                        editarConta(conta);
                    };
                    tdAcoes.appendChild(btnEditar);
                    
                    // Botão Excluir
                    const btnExcluir = document.createElement('button');
                    btnExcluir.classList.add('btn', 'btn-sm', 'btn-danger');
                    btnExcluir.innerHTML = '<i class="bi bi-trash"></i>';
                    btnExcluir.title = 'Excluir';
                    btnExcluir.onclick = function() {
                        confirmarExclusao(conta.id);
                    };
                    tdAcoes.appendChild(btnExcluir);
                    
                    tr.appendChild(tdAcoes);
                    
                    tbody.appendChild(tr);
                });
            }
        })
        .catch(error => console.error('Erro ao carregar contas:', error));
}

// Carregar contas vencidas
function carregarContasVencidas() {
    fetch('/api/contas/vencidas')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                const contas = data.data;
                const tbody = document.getElementById('lista-contas-vencidas');
                
                // Atualizar contador
                document.getElementById('contador-vencidas').textContent = contas.length;
                
                if (contas.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhuma conta vencida</td></tr>';
                    return;
                }
                
                tbody.innerHTML = '';
                
                contas.forEach(conta => {
                    const tr = document.createElement('tr');
                    
                    // Data de vencimento
                    const tdData = document.createElement('td');
                    tdData.textContent = formatarData(conta.data_vencimento);
                    tr.appendChild(tdData);
                    
                    // Nome
                    const tdNome = document.createElement('td');
                    tdNome.textContent = conta.nome;
                    tr.appendChild(tdNome);
                    
                    // Categoria
                    const tdCat = document.createElement('td');
                    tdCat.textContent = conta.categoria_nome;
                    tr.appendChild(tdCat);
                    
                    // Valor
                    const tdValor = document.createElement('td');
                    tdValor.textContent = formatarMoeda(conta.valor);
                    tdValor.classList.add('valor-saida');
                    tr.appendChild(tdValor);
                    
                    // Ações
                    const tdAcoes = document.createElement('td');
                    
                    // Botão Pagar
                    const btnPagar = document.createElement('button');
                    btnPagar.classList.add('btn', 'btn-sm', 'btn-success', 'me-1');
                    btnPagar.innerHTML = '<i class="bi bi-check-circle"></i>';
                    btnPagar.title = 'Pagar Conta';
                    btnPagar.onclick = function() {
                        prepararPagamento(conta);
                    };
                    tdAcoes.appendChild(btnPagar);
                    
                    tr.appendChild(tdAcoes);
                    
                    tbody.appendChild(tr);
                });
            }
        })
        .catch(error => console.error('Erro ao carregar contas vencidas:', error));
}

// Carregar próximas contas
function carregarProximasContas() {
    fetch('/api/contas/proximas?dias=7')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                const contas = data.data;
                const tbody = document.getElementById('lista-proximas-contas');
                
                // Atualizar contador
                document.getElementById('contador-proximas').textContent = contas.length;
                
                if (contas.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhuma conta próxima do vencimento</td></tr>';
                    return;
                }
                
                tbody.innerHTML = '';
                
                contas.forEach(conta => {
                    const tr = document.createElement('tr');
                    
                    // Data de vencimento
                    const tdData = document.createElement('td');
                    tdData.textContent = formatarData(conta.data_vencimento);
                    tr.appendChild(tdData);
                    
                    // Nome
                    const tdNome = document.createElement('td');
                    tdNome.textContent = conta.nome;
                    tr.appendChild(tdNome);
                    
                    // Categoria
                    const tdCat = document.createElement('td');
                    tdCat.textContent = conta.categoria_nome;
                    tr.appendChild(tdCat);
                    
                    // Valor
                    const tdValor = document.createElement('td');
                    tdValor.textContent = formatarMoeda(conta.valor);
                    tdValor.classList.add('valor-saida');
                    tr.appendChild(tdValor);
                    
                    // Ações
                    const tdAcoes = document.createElement('td');
                    
                    // Botão Pagar
                    const btnPagar = document.createElement('button');
                    btnPagar.classList.add('btn', 'btn-sm', 'btn-success', 'me-1');
                    btnPagar.innerHTML = '<i class="bi bi-check-circle"></i>';
                    btnPagar.title = 'Pagar Conta';
                    btnPagar.onclick = function() {
                        prepararPagamento(conta);
                    };
                    tdAcoes.appendChild(btnPagar);
                    
                    tr.appendChild(tdAcoes);
                    
                    tbody.appendChild(tr);
                });
            }
        })
        .catch(error => console.error('Erro ao carregar próximas contas:', error));
}

// Limpar filtros
function limparFiltros() {
    document.getElementById('filtro-status').value = '';
    document.getElementById('filtro-tipo').value = '';
    document.getElementById('filtro-categoria').value = '';
    
    carregarContas();
}

// Salvar conta
function salvarConta() {
    const id = document.getElementById('conta-id').value;
    const nome = document.getElementById('conta-nome').value;
    const valor = document.getElementById('conta-valor').value;
    const dataVencimento = document.getElementById('conta-vencimento').value;
    const categoriaId = document.getElementById('conta-categoria').value;
    const fixa = document.getElementById('conta-fixa').checked;
    const periodicidade = fixa ? document.getElementById('conta-periodicidade').value : null;
    const observacoes = document.getElementById('conta-observacoes').value;
    
    // Validar campos obrigatórios
    if (!nome || !valor || !dataVencimento || !categoriaId) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }
    
    // Validar periodicidade para contas fixas
    if (fixa && !periodicidade) {
        alert('Por favor, selecione a periodicidade para contas fixas.');
        return;
    }
    
    const conta = {
        nome,
        valor: parseFloat(valor),
        data_vencimento: dataVencimento,
        categoria_id: parseInt(categoriaId),
        fixa,
        periodicidade,
        observacoes,
        status: 'pendente'
    };
    
    // Determinar se é uma criação ou atualização
    const metodo = id ? 'PUT' : 'POST';
    const url = id ? `/api/contas/${id}` : '/api/contas/';
    
    fetch(url, {
        method: metodo,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(conta)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            // Fechar modal e recarregar contas
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalConta'));
            modal.hide();
            
            carregarContas();
            carregarContasVencidas();
            carregarProximasContas();
            limparFormulario();
            
            alert(id ? 'Conta atualizada com sucesso!' : 'Conta registrada com sucesso!');
        } else {
            alert('Erro: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Erro ao salvar conta:', error);
        alert('Ocorreu um erro ao salvar a conta.');
    });
}

// Preparar pagamento de conta
function prepararPagamento(conta) {
    document.getElementById('pagar-conta-id').value = conta.id;
    document.getElementById('pagar-conta-nome').value = conta.nome;
    document.getElementById('pagar-conta-valor').value = formatarMoeda(conta.valor);
    
    // Abrir modal
    const modal = new bootstrap.Modal(document.getElementById('modalPagarConta'));
    modal.show();
}

// Pagar conta
function pagarConta() {
    const contaId = document.getElementById('pagar-conta-id').value;
    const dataPagamento = document.getElementById('pagar-conta-data').value;
    
    // Validar data
    if (!dataPagamento) {
        alert('Por favor, informe a data de pagamento.');
        return;
    }
    
    fetch(`/api/contas/${contaId}/pagar`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            data_pagamento: dataPagamento
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            // Fechar modal e recarregar contas
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalPagarConta'));
            modal.hide();
            
            carregarContas();
            carregarContasVencidas();
            carregarProximasContas();
            
            alert('Conta paga com sucesso!');
        } else {
            alert('Erro: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Erro ao pagar conta:', error);
        alert('Ocorreu um erro ao pagar a conta.');
    });
}

// Editar conta
function editarConta(conta) {
    // Preencher formulário com dados da conta
    document.getElementById('conta-id').value = conta.id;
    document.getElementById('conta-nome').value = conta.nome;
    document.getElementById('conta-valor').value = conta.valor;
    document.getElementById('conta-categoria').value = conta.categoria_id;
    document.getElementById('conta-observacoes').value = conta.observacoes || '';
    
    // Data de vencimento
    if (conta.data_vencimento) {
        document.getElementById('conta-vencimento').value = conta.data_vencimento.split('T')[0];
    }
    
    // Conta fixa e periodicidade
    document.getElementById('conta-fixa').checked = conta.fixa;
    document.getElementById('div-periodicidade').style.display = conta.fixa ? 'block' : 'none';
    
    if (conta.fixa && conta.periodicidade) {
        document.getElementById('conta-periodicidade').value = conta.periodicidade;
    } else {
        document.getElementById('conta-periodicidade').value = '';
    }
    
    // Atualizar título do modal
    document.getElementById('modalContaLabel').textContent = 'Editar Conta';
    
    // Abrir modal
    const modal = new bootstrap.Modal(document.getElementById('modalConta'));
    modal.show();
}

// Confirmar exclusão
function confirmarExclusao(id) {
    // Armazenar ID da conta a ser excluída
    document.getElementById('btn-confirmar-exclusao').dataset.id = id;
    
    // Configurar evento de exclusão
    document.getElementById('btn-confirmar-exclusao').onclick = function() {
        const contaId = this.dataset.id;
        excluirConta(contaId);
    };
    
    // Abrir modal de confirmação
    const modal = new bootstrap.Modal(document.getElementById('modalConfirmacao'));
    modal.show();
}

// Excluir conta
function excluirConta(id) {
    fetch(`/api/contas/${id}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            // Fechar modal e recarregar contas
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalConfirmacao'));
            modal.hide();
            
            carregarContas();
            carregarContasVencidas();
            carregarProximasContas();
            
            alert('Conta excluída com sucesso!');
        } else {
            alert('Erro: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Erro ao excluir conta:', error);
        alert('Ocorreu um erro ao excluir a conta.');
    });
}

// Limpar formulário
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
    
    // Resetar título do modal
    document.getElementById('modalContaLabel').textContent = 'Nova Conta';
}
