// dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    carregarDashboard();
});

async function carregarDashboard() {
    await Promise.all([
        carregarResumoMensal(),
        carregarProximasContas(),
        carregarUltimasTransacoes(),
    ]);
}

// ── Resumo mensal ──────────────────────────────────────────────────────────
async function carregarResumoMensal() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth() + 1;

    try {
        // BUG FIX: busca os últimos 6 meses com dados reais em paralelo
        const promises = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(ano, hoje.getMonth() - i, 1);
            promises.push(
                fetch(`/api/transacoes/resumo/mensal?ano=${d.getFullYear()}&mes=${d.getMonth() + 1}`)
                    .then(r => r.json())
            );
        }
        const resultados = await Promise.all(promises);

        const labels = [];
        const entradas = [];
        const saidas = [];

        resultados.forEach((res, i) => {
            const d = new Date(ano, hoje.getMonth() - (5 - i), 1);
            labels.push(d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
            if (res.status === 'success') {
                entradas.push(res.data.total_entradas);
                saidas.push(res.data.total_saidas);
            } else {
                entradas.push(0);
                saidas.push(0);
            }
        });

        // Atualizar cards do mês atual (último da lista)
        const resumoAtual = resultados[5]?.data || {};
        document.getElementById('saldo-atual').textContent = formatarMoeda(resumoAtual.saldo ?? 0);
        document.getElementById('total-entradas').textContent = formatarMoeda(resumoAtual.total_entradas ?? 0);
        document.getElementById('total-saidas').textContent = formatarMoeda(resumoAtual.total_saidas ?? 0);

        // Colorir saldo
        const saldoEl = document.getElementById('saldo-atual');
        saldoEl.classList.toggle('text-success', (resumoAtual.saldo ?? 0) >= 0);
        saldoEl.classList.toggle('text-danger', (resumoAtual.saldo ?? 0) < 0);

        criarGraficoMensal(labels, entradas, saidas);

        // Gráfico de categorias do mês atual
        if (resumoAtual.categorias) {
            criarGraficoCategorias(resumoAtual.categorias);
        }
    } catch (err) {
        console.error('Erro ao carregar resumo mensal:', err);
    }
}

function criarGraficoMensal(labels, entradas, saidas) {
    const ctx = document.getElementById('grafico-mensal')?.getContext('2d');
    if (!ctx) return;

    if (window._graficoMensal) window._graficoMensal.destroy();

    window._graficoMensal = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Entradas',
                    data: entradas,
                    borderColor: '#198754',
                    backgroundColor: 'rgba(25, 135, 84, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                },
                {
                    label: 'Saídas',
                    data: saidas,
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                },
            ],
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: {
                    callbacks: { label: ctx => `${ctx.dataset.label}: ${formatarMoeda(ctx.raw)}` },
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: v => formatarMoeda(v) },
                },
            },
        },
    });
}

// ── Próximas contas ────────────────────────────────────────────────────────
async function carregarProximasContas() {
    try {
        const res = await fetch('/api/contas/proximas?dias=7');
        const data = await res.json();
        const tbody = document.getElementById('proximas-contas');

        if (data.status !== 'success' || data.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Nenhuma conta próxima</td></tr>';
            return;
        }

        tbody.innerHTML = data.data.map(conta => `
            <tr class="fade-in">
                <td>${formatarData(conta.data_vencimento)}</td>
                <td>${conta.nome}</td>
                <td class="valor-saida">${formatarMoeda(conta.valor)}</td>
                <td>
                    <button class="btn btn-sm btn-success" title="Marcar como paga"
                        onclick="pagarConta(${conta.id})">
                        <i class="bi bi-check-circle"></i>
                    </button>
                </td>
            </tr>`).join('');
    } catch (err) {
        console.error('Erro ao carregar próximas contas:', err);
    }
}

async function pagarConta(contaId) {
    try {
        const res = await fetch(`/api/contas/${contaId}/pagar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data_pagamento: new Date().toISOString().split('T')[0] }),
        });
        const data = await res.json();
        if (data.status === 'success') {
            toast('Conta paga com sucesso!', 'success');
            carregarDashboard();
        } else {
            toast(data.message, 'error');
        }
    } catch (err) {
        toast('Erro ao pagar conta', 'error');
    }
}

// ── Últimas transações ─────────────────────────────────────────────────────
async function carregarUltimasTransacoes() {
    try {
        const res = await fetch('/api/transacoes/?limit=5');
        const data = await res.json();
        const tbody = document.getElementById('ultimas-transacoes');

        if (data.status !== 'success' || data.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Nenhuma transação registrada</td></tr>';
            return;
        }

        tbody.innerHTML = data.data.map(t => `
            <tr class="fade-in">
                <td>${formatarData(t.data)}</td>
                <td>${t.descricao}</td>
                <td><span class="badge bg-secondary">${t.categoria_nome || '-'}</span></td>
                <td class="${t.tipo === 'entrada' ? 'valor-entrada' : 'valor-saida'}">${formatarMoeda(t.valor)}</td>
            </tr>`).join('');
    } catch (err) {
        console.error('Erro ao carregar últimas transações:', err);
    }
}

// ── Gráfico de categorias ──────────────────────────────────────────────────
function criarGraficoCategorias(categoriasObj) {
    const ctx = document.getElementById('grafico-categorias')?.getContext('2d');
    if (!ctx) return;

    // Filtrar apenas saídas
    const saidas = Object.entries(categoriasObj)
        .filter(([, v]) => v.tipo === 'saida')
        .sort((a, b) => b[1].total - a[1].total);

    if (saidas.length === 0) {
        document.getElementById('top-categorias').innerHTML =
            '<p class="text-muted text-center">Nenhum gasto registrado este mês</p>';
        return;
    }

    const labels = saidas.map(([k]) => k);
    const valores = saidas.map(([, v]) => v.total);
    const CORES = ['#FF6384','#36A2EB','#FFCE56','#4BC0C0','#9966FF','#FF9F40','#8AC249','#EA80FC','#00E5FF','#FF5252'];

    if (window._graficoCategoria) window._graficoCategoria.destroy();

    window._graficoCategoria = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{ data: valores, backgroundColor: CORES.slice(0, labels.length), borderWidth: 1 }],
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'right' },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = ((ctx.raw / total) * 100).toFixed(1);
                            return `${ctx.label}: ${formatarMoeda(ctx.raw)} (${pct}%)`;
                        },
                    },
                },
            },
        },
    });

    // Top categorias
    const totalGastos = valores.reduce((a, b) => a + b, 0);
    const topContainer = document.getElementById('top-categorias');
    topContainer.innerHTML = saidas.slice(0, 5).map(([nome, dados]) => {
        const pct = ((dados.total / totalGastos) * 100).toFixed(1);
        return `
            <div class="mb-3">
                <div class="d-flex justify-content-between">
                    <span>${nome}</span>
                    <span>${formatarMoeda(dados.total)}</span>
                </div>
                <div class="progress mt-1" style="height:6px">
                    <div class="progress-bar" style="width:${pct}%" title="${pct}%"></div>
                </div>
            </div>`;
    }).join('');
}
