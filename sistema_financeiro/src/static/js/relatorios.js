// Relatorios.js - Script para a página de relatórios

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar data atual nos formulários
    document.getElementById('data').valueAsDate = new Date();
    
    // Preencher anos no select (últimos 5 anos)
    const anoAtual = new Date().getFullYear();
    const selectAno = document.getElementById('ano');
    
    for (let i = anoAtual; i >= anoAtual - 4; i--) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        selectAno.appendChild(option);
    }
    
    // Definir mês e ano atuais como padrão
    document.getElementById('mes').value = new Date().getMonth() + 1;
    document.getElementById('ano').value = anoAtual;
    
    // Configurar eventos
    document.getElementById('tipo-periodo').addEventListener('change', function() {
        if (this.value === 'mensal') {
            document.getElementById('selecao-mensal').style.display = 'flex';
            document.getElementById('selecao-diaria').style.display = 'none';
            document.getElementById('relatorio-mensal').style.display = 'block';
            document.getElementById('relatorio-diario').style.display = 'none';
        } else {
            document.getElementById('selecao-mensal').style.display = 'none';
            document.getElementById('selecao-diaria').style.display = 'flex';
            document.getElementById('relatorio-mensal').style.display = 'none';
            document.getElementById('relatorio-diario').style.display = 'block';
        }
    });
    
    document.getElementById('form-periodo').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const tipoPeriodo = document.getElementById('tipo-periodo').value;
        
        if (tipoPeriodo === 'mensal') {
            const mes = document.getElementById('mes').value;
            const ano = document.getElementById('ano').value;
            carregarRelatorioMensal(mes, ano);
        } else {
            const data = document.getElementById('data').value;
            carregarRelatorioDiario(data);
        }
    });
    
    // Configurar botões de exportação
    document.getElementById('btn-exportar-pdf').addEventListener('click', exportarPDF);
    document.getElementById('btn-exportar-excel').addEventListener('click', exportarExcel);
    
    // Carregar relatório mensal inicial (mês atual)
    const mesAtual = new Date().getMonth() + 1;
    carregarRelatorioMensal(mesAtual, anoAtual);
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

// Carregar relatório mensal
function carregarRelatorioMensal(mes, ano) {
    fetch(`/api/transacoes/resumo/mensal?mes=${mes}&ano=${ano}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                const resumo = data.data;
                
                // Atualizar totais
                document.getElementById('total-entradas-mes').textContent = formatarMoeda(resumo.total_entradas);
                document.getElementById('total-saidas-mes').textContent = formatarMoeda(resumo.total_saidas);
                document.getElementById('saldo-mes').textContent = formatarMoeda(resumo.saldo);
                
                // Atualizar classe do saldo (positivo ou negativo)
                const saldoElement = document.getElementById('saldo-mes');
                if (resumo.saldo < 0) {
                    saldoElement.classList.add('text-danger');
                    saldoElement.classList.remove('text-success');
                } else {
                    saldoElement.classList.add('text-success');
                    saldoElement.classList.remove('text-danger');
                }
                
                // Criar gráfico de categorias
                criarGraficoCategorias(resumo);
                
                // Criar gráfico de evolução diária
                criarGraficoEvolucaoDiaria(mes, ano);
                
                // Carregar transações do mês
                carregarTransacoesMes(mes, ano);
            }
        })
        .catch(error => console.error('Erro ao carregar relatório mensal:', error));
}

// Criar gráfico de categorias
function criarGraficoCategorias(resumo) {
    const ctx = document.getElementById('grafico-categorias-mes').getContext('2d');
    
    // Filtrar apenas categorias de saída
    const categorias = Object.keys(resumo.categorias).filter(
        cat => resumo.categorias[cat].tipo === 'saída'
    );
    
    const valores = categorias.map(cat => resumo.categorias[cat].total);
    
    // Cores para o gráfico
    const cores = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
        '#FF9F40', '#8AC249', '#EA80FC', '#00E5FF', '#FF5252'
    ];
    
    // Destruir gráfico anterior se existir
    if (window.graficoCategoriasChart) {
        window.graficoCategoriasChart.destroy();
    }
    
    window.graficoCategoriasChart = new Chart(ctx, {
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

// Criar gráfico de evolução diária
function criarGraficoEvolucaoDiaria(mes, ano) {
    // Obter número de dias no mês
    const diasNoMes = new Date(ano, mes, 0).getDate();
    
    // Gerar array com todos os dias do mês
    const dias = Array.from({ length: diasNoMes }, (_, i) => i + 1);
    
    // Buscar transações do mês
    fetch(`/api/transacoes/?data_inicio=${ano}-${mes.toString().padStart(2, '0')}-01&data_fim=${ano}-${mes.toString().padStart(2, '0')}-${diasNoMes}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                const transacoes = data.data;
                
                // Inicializar arrays para entradas e saídas por dia
                const entradasPorDia = Array(diasNoMes).fill(0);
                const saidasPorDia = Array(diasNoMes).fill(0);
                
                // Agrupar transações por dia
                transacoes.forEach(transacao => {
                    const dia = new Date(transacao.data).getDate() - 1; // Índice 0-based
                    
                    if (transacao.tipo === 'entrada') {
                        entradasPorDia[dia] += transacao.valor;
                    } else {
                        saidasPorDia[dia] += transacao.valor;
                    }
                });
                
                // Calcular saldo acumulado
                const saldoAcumulado = [];
                let saldo = 0;
                
                for (let i = 0; i < diasNoMes; i++) {
                    saldo += entradasPorDia[i] - saidasPorDia[i];
                    saldoAcumulado.push(saldo);
                }
                
                // Criar gráfico
                const ctx = document.getElementById('grafico-evolucao-diaria').getContext('2d');
                
                // Destruir gráfico anterior se existir
                if (window.evolucaoDiariaChart) {
                    window.evolucaoDiariaChart.destroy();
                }
                
                window.evolucaoDiariaChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: dias,
                        datasets: [
                            {
                                label: 'Entradas',
                                data: entradasPorDia,
                                backgroundColor: 'rgba(40, 167, 69, 0.2)',
                                borderColor: 'rgba(40, 167, 69, 1)',
                                borderWidth: 2,
                                type: 'bar'
                            },
                            {
                                label: 'Saídas',
                                data: saidasPorDia,
                                backgroundColor: 'rgba(220, 53, 69, 0.2)',
                                borderColor: 'rgba(220, 53, 69, 1)',
                                borderWidth: 2,
                                type: 'bar'
                            },
                            {
                                label: 'Saldo Acumulado',
                                data: saldoAcumulado,
                                borderColor: 'rgba(0, 123, 255, 1)',
                                borderWidth: 2,
                                type: 'line',
                                fill: false,
                                tension: 0.4
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            x: {
                                title: {
                                    display: true,
                                    text: 'Dia do Mês'
                                }
                            },
                            y: {
                                title: {
                                    display: true,
                                    text: 'Valor (R$)'
                                },
                                ticks: {
                                    callback: function(value) {
                                        return formatarMoeda(value);
                                    }
                                }
                            }
                        },
                        plugins: {
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return context.dataset.label + ': ' + formatarMoeda(context.raw);
                                    }
                                }
                            }
                        }
                    }
                });
            }
        })
        .catch(error => console.error('Erro ao carregar evolução diária:', error));
}

// Carregar transações do mês
function carregarTransacoesMes(mes, ano) {
    // Obter número de dias no mês
    const diasNoMes = new Date(ano, mes, 0).getDate();
    
    fetch(`/api/transacoes/?data_inicio=${ano}-${mes.toString().padStart(2, '0')}-01&data_fim=${ano}-${mes.toString().padStart(2, '0')}-${diasNoMes}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                const transacoes = data.data;
                
                // Separar transações por tipo
                const entradas = transacoes.filter(t => t.tipo === 'entrada');
                const saidas = transacoes.filter(t => t.tipo === 'saída');
                
                // Preencher tabela de todas as transações
                preencherTabelaTransacoes('lista-todas-transacoes', transacoes);
                
                // Preencher tabela de entradas
                preencherTabelaTransacoes('lista-entradas', entradas, false);
                
                // Preencher tabela de saídas
                preencherTabelaTransacoes('lista-saidas', saidas, false);
            }
        })
        .catch(error => console.error('Erro ao carregar transações do mês:', error));
}

// Preencher tabela de transações
function preencherTabelaTransacoes(tableId, transacoes, mostrarTipo = true) {
    const tbody = document.getElementById(tableId);
    
    if (transacoes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${mostrarTipo ? 5 : 4}" class="text-center">Nenhuma transação encontrada</td></tr>`;
        return;
    }
    
    tbody.innerHTML = '';
    
    // Ordenar transações por data (mais recente primeiro)
    transacoes.sort((a, b) => new Date(b.data) - new Date(a.data));
    
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
        
        // Tipo (opcional)
        if (mostrarTipo) {
            const tdTipo = document.createElement('td');
            const badgeTipo = document.createElement('span');
            badgeTipo.classList.add('badge', transacao.tipo === 'entrada' ? 'bg-success' : 'bg-danger');
            badgeTipo.textContent = transacao.tipo.charAt(0).toUpperCase() + transacao.tipo.slice(1);
            tdTipo.appendChild(badgeTipo);
            tr.appendChild(tdTipo);
        }
        
        tbody.appendChild(tr);
    });
}

// Carregar relatório diário
function carregarRelatorioDiario(data) {
    fetch(`/api/transacoes/resumo/diario?data=${data}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                const resumo = data.data;
                
                // Atualizar totais
                document.getElementById('total-entradas-dia').textContent = formatarMoeda(resumo.total_entradas);
                document.getElementById('total-saidas-dia').textContent = formatarMoeda(resumo.total_saidas);
                document.getElementById('saldo-dia').textContent = formatarMoeda(resumo.saldo);
                
                // Atualizar classe do saldo (positivo ou negativo)
                const saldoElement = document.getElementById('saldo-dia');
                if (resumo.saldo < 0) {
                    saldoElement.classList.add('text-danger');
                    saldoElement.classList.remove('text-success');
                } else {
                    saldoElement.classList.add('text-success');
                    saldoElement.classList.remove('text-danger');
                }
                
                // Preencher tabela de transações do dia
                const transacoes = resumo.transacoes;
                const tbody = document.getElementById('lista-transacoes-dia');
                
                if (transacoes.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhuma transação encontrada nesta data</td></tr>';
                    return;
                }
                
                tbody.innerHTML = '';
                
                transacoes.forEach(transacao => {
                    const tr = document.createElement('tr');
                    
                    // Hora (extraída da data)
                    const tdHora = document.createElement('td');
                    const dataObj = new Date(transacao.data);
                    tdHora.textContent = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    tr.appendChild(tdHora);
                    
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
                    
                    tbody.appendChild(tr);
                });
            }
        })
        .catch(error => console.error('Erro ao carregar relatório diário:', error));
}

// Exportar para PDF
function exportarPDF() {
    alert('Funcionalidade de exportação para PDF será implementada em breve!');
    // Implementação futura: usar jsPDF ou outra biblioteca para gerar PDF
}

// Exportar para Excel
function exportarExcel() {
    alert('Funcionalidade de exportação para Excel será implementada em breve!');
    // Implementação futura: usar SheetJS ou outra biblioteca para gerar Excel
}
