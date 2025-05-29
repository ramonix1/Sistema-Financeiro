// Dashboard.js - Script para a página principal

document.addEventListener('DOMContentLoaded', function() {
    // Carregar dados do dashboard
    carregarResumoMensal();
    carregarProximasContas();
    carregarUltimasTransacoes();
    carregarDistribuicaoGastos();
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

// Carregar resumo mensal
function carregarResumoMensal() {
    const dataAtual = new Date();
    const ano = dataAtual.getFullYear();
    const mes = dataAtual.getMonth() + 1;
    
    fetch(`/api/transacoes/resumo/mensal?ano=${ano}&mes=${mes}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                const resumo = data.data;
                
                // Atualizar saldos
                document.getElementById('saldo-atual').textContent = formatarMoeda(resumo.saldo);
                document.getElementById('total-entradas').textContent = formatarMoeda(resumo.total_entradas);
                document.getElementById('total-saidas').textContent = formatarMoeda(resumo.total_saidas);
                
                // Criar gráfico mensal
                criarGraficoMensal(resumo);
            }
        })
        .catch(error => console.error('Erro ao carregar resumo mensal:', error));
}

// Criar gráfico de resumo mensal
function criarGraficoMensal(resumo) {
    const ctx = document.getElementById('grafico-mensal').getContext('2d');
    
    // Obter os últimos 6 meses
    const meses = [];
    const entradas = [];
    const saidas = [];
    
    const dataAtual = new Date();
    const mesAtual = dataAtual.getMonth();
    const anoAtual = dataAtual.getFullYear();
    
    for (let i = 5; i >= 0; i--) {
        let mes = mesAtual - i;
        let ano = anoAtual;
        
        if (mes < 0) {
            mes += 12;
            ano -= 1;
        }
        
        const nomeMes = new Date(ano, mes, 1).toLocaleDateString('pt-BR', { month: 'short' });
        meses.push(nomeMes);
        
        // Dados fictícios para demonstração - serão substituídos por dados reais
        if (i === 0) {
            entradas.push(resumo.total_entradas);
            saidas.push(resumo.total_saidas);
        } else {
            // Valores aleatórios para meses anteriores (apenas para demonstração)
            entradas.push(Math.random() * 5000);
            saidas.push(Math.random() * 3000);
        }
    }
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: meses,
            datasets: [
                {
                    label: 'Entradas',
                    data: entradas,
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Saídas',
                    data: saidas,
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatarMoeda(context.raw);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatarMoeda(value);
                        }
                    }
                }
            }
        }
    });
}

// Carregar próximas contas
function carregarProximasContas() {
    fetch('/api/contas/proximas?dias=7')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                const contas = data.data;
                const tbody = document.getElementById('proximas-contas');
                
                if (contas.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" class="text-center">Nenhuma conta próxima do vencimento</td></tr>';
                    return;
                }
                
                tbody.innerHTML = '';
                
                contas.forEach(conta => {
                    const tr = document.createElement('tr');
                    
                    // Data de vencimento
                    const tdData = document.createElement('td');
                    tdData.textContent = formatarData(conta.data_vencimento);
                    tr.appendChild(tdData);
                    
                    // Descrição
                    const tdDesc = document.createElement('td');
                    tdDesc.textContent = conta.nome;
                    tr.appendChild(tdDesc);
                    
                    // Valor
                    const tdValor = document.createElement('td');
                    tdValor.textContent = formatarMoeda(conta.valor);
                    tdValor.classList.add('valor-saida');
                    tr.appendChild(tdValor);
                    
                    // Ações
                    const tdAcoes = document.createElement('td');
                    const btnPagar = document.createElement('button');
                    btnPagar.classList.add('btn', 'btn-sm', 'btn-success');
                    btnPagar.innerHTML = '<i class="bi bi-check-circle"></i>';
                    btnPagar.title = 'Marcar como paga';
                    btnPagar.onclick = function() {
                        pagarConta(conta.id);
                    };
                    tdAcoes.appendChild(btnPagar);
                    tr.appendChild(tdAcoes);
                    
                    tbody.appendChild(tr);
                });
            }
        })
        .catch(error => console.error('Erro ao carregar próximas contas:', error));
}

// Função para pagar conta
function pagarConta(contaId) {
    fetch(`/api/contas/${contaId}/pagar`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            data_pagamento: new Date().toISOString().split('T')[0]
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            // Recarregar dados
            carregarProximasContas();
            carregarUltimasTransacoes();
            carregarResumoMensal();
            
            alert('Conta paga com sucesso!');
        } else {
            alert('Erro ao pagar conta: ' + data.message);
        }
    })
    .catch(error => console.error('Erro ao pagar conta:', error));
}

// Carregar últimas transações
function carregarUltimasTransacoes() {
    fetch('/api/transacoes?limit=5')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                const transacoes = data.data.slice(0, 5); // Limitar a 5 transações
                const tbody = document.getElementById('ultimas-transacoes');
                
                if (transacoes.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" class="text-center">Nenhuma transação registrada</td></tr>';
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
                    
                    tbody.appendChild(tr);
                });
            }
        })
        .catch(error => console.error('Erro ao carregar últimas transações:', error));
}

// Carregar distribuição de gastos
function carregarDistribuicaoGastos() {
    const dataAtual = new Date();
    const ano = dataAtual.getFullYear();
    const mes = dataAtual.getMonth() + 1;
    
    fetch(`/api/transacoes/resumo/mensal?ano=${ano}&mes=${mes}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                const resumo = data.data;
                
                // Filtrar apenas categorias de saída
                const categorias = Object.keys(resumo.categorias).filter(
                    cat => resumo.categorias[cat].tipo === 'saída'
                );
                
                const valores = categorias.map(cat => resumo.categorias[cat].total);
                
                // Criar gráfico de distribuição
                criarGraficoCategorias(categorias, valores);
                
                // Atualizar top categorias
                atualizarTopCategorias(categorias, valores);
            }
        })
        .catch(error => console.error('Erro ao carregar distribuição de gastos:', error));
}

// Criar gráfico de categorias
function criarGraficoCategorias(categorias, valores) {
    const ctx = document.getElementById('grafico-categorias').getContext('2d');
    
    // Cores para o gráfico
    const cores = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
        '#FF9F40', '#8AC249', '#EA80FC', '#00E5FF', '#FF5252'
    ];
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: categorias,
            datasets: [{
                data: valores,
                backgroundColor: cores.slice(0, categorias.length),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const valor = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentual = ((valor / total) * 100).toFixed(1);
                            return `${context.label}: ${formatarMoeda(valor)} (${percentual}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Atualizar top categorias
function atualizarTopCategorias(categorias, valores) {
    const container = document.getElementById('top-categorias');
    container.innerHTML = '';
    
    // Criar array de objetos para ordenação
    const categoriasArray = categorias.map((cat, index) => ({
        nome: cat,
        valor: valores[index]
    }));
    
    // Ordenar por valor (decrescente)
    categoriasArray.sort((a, b) => b.valor - a.valor);
    
    // Calcular total
    const total = valores.reduce((a, b) => a + b, 0);
    
    // Mostrar top 5 categorias
    const topCategorias = categoriasArray.slice(0, 5);
    
    topCategorias.forEach(cat => {
        const percentual = ((cat.valor / total) * 100).toFixed(1);
        
        const div = document.createElement('div');
        div.classList.add('mb-3');
        
        const nome = document.createElement('div');
        nome.classList.add('d-flex', 'justify-content-between');
        nome.innerHTML = `
            <span>${cat.nome}</span>
            <span>${formatarMoeda(cat.valor)}</span>
        `;
        
        const progress = document.createElement('div');
        progress.classList.add('progress', 'mt-1');
        progress.innerHTML = `
            <div class="progress-bar" role="progressbar" style="width: ${percentual}%"
                aria-valuenow="${percentual}" aria-valuemin="0" aria-valuemax="100">
                ${percentual}%
            </div>
        `;
        
        div.appendChild(nome);
        div.appendChild(progress);
        container.appendChild(div);
    });
}
