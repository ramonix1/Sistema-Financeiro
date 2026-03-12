// relatorios.js

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('data').valueAsDate = new Date();

    const anoAtual = new Date().getFullYear();
    const selectAno = document.getElementById('ano');
    for (let i = anoAtual; i >= anoAtual - 4; i--) {
        selectAno.insertAdjacentHTML('beforeend', `<option value="${i}">${i}</option>`);
    }
    document.getElementById('mes').value = new Date().getMonth() + 1;
    document.getElementById('ano').value = anoAtual;

    document.getElementById('tipo-periodo').addEventListener('change', function () {
        const mensal = this.value === 'mensal';
        document.getElementById('selecao-mensal').style.display = mensal ? 'flex' : 'none';
        document.getElementById('selecao-diaria').style.display = mensal ? 'none' : 'flex';
        document.getElementById('relatorio-mensal').style.display = mensal ? 'block' : 'none';
        document.getElementById('relatorio-diario').style.display = mensal ? 'none' : 'block';
    });

    document.getElementById('form-periodo').addEventListener('submit', e => {
        e.preventDefault();
        const tipo = document.getElementById('tipo-periodo').value;
        if (tipo === 'mensal') {
            carregarRelatorioMensal(document.getElementById('mes').value, document.getElementById('ano').value);
        } else {
            carregarRelatorioDiario(document.getElementById('data').value);
        }
    });

    document.getElementById('btn-exportar-pdf').addEventListener('click', exportarPDF);
    document.getElementById('btn-exportar-excel').addEventListener('click', exportarExcel);

    carregarRelatorioMensal(new Date().getMonth() + 1, anoAtual);
});

// ── Relatório Mensal ───────────────────────────────────────────────────────
async function carregarRelatorioMensal(mes, ano) {
    try {
        const res = await fetch(`/api/transacoes/resumo/mensal?mes=${mes}&ano=${ano}`);
        const data = await res.json();
        if (data.status !== 'success') return;

        const resumo = data.data;
        document.getElementById('total-entradas-mes').textContent = formatarMoeda(resumo.total_entradas);
        document.getElementById('total-saidas-mes').textContent = formatarMoeda(resumo.total_saidas);

        const saldoEl = document.getElementById('saldo-mes');
        saldoEl.textContent = formatarMoeda(resumo.saldo);
        saldoEl.className = resumo.saldo >= 0 ? 'text-success' : 'text-danger';

        criarGraficoCategorias(resumo.categorias || {});
        criarGraficoEvolucaoDiaria(mes, ano);
        carregarTransacoesMes(mes, ano);
    } catch (err) {
        console.error('Erro ao carregar relatório mensal:', err);
    }
}

function criarGraficoCategorias(categoriasObj) {
    const ctx = document.getElementById('grafico-categorias-mes')?.getContext('2d');
    if (!ctx) return;

    // BUG FIX: filtrava por 'saída' (com acento) mas o backend agora retorna 'saida'
    const saidas = Object.entries(categoriasObj).filter(([, v]) => v.tipo === 'saida');
    const labels = saidas.map(([k]) => k);
    const valores = saidas.map(([, v]) => v.total);

    const CORES = ['#FF6384','#36A2EB','#FFCE56','#4BC0C0','#9966FF','#FF9F40','#8AC249','#EA80FC','#00E5FF','#FF5252'];

    if (window._graficoCategoriasChart) window._graficoCategoriasChart.destroy();

    window._graficoCategoriasChart = new Chart(ctx, {
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
                            return `${ctx.label}: ${formatarMoeda(ctx.raw)} (${((ctx.raw / total) * 100).toFixed(1)}%)`;
                        },
                    },
                },
            },
        },
    });
}

async function criarGraficoEvolucaoDiaria(mes, ano) {
    const diasNoMes = new Date(ano, mes, 0).getDate();
    const mesStr = String(mes).padStart(2, '0');

    try {
        const res = await fetch(`/api/transacoes/?data_inicio=${ano}-${mesStr}-01&data_fim=${ano}-${mesStr}-${diasNoMes}`);
        const data = await res.json();
        if (data.status !== 'success') return;

        const entradasPorDia = Array(diasNoMes).fill(0);
        const saidasPorDia = Array(diasNoMes).fill(0);

        data.data.forEach(t => {
            // BUG FIX: parsear data sem conversão de timezone (evita off-by-one em fusos negativos)
            const dia = parseInt(t.data.split('-')[2], 10) - 1;
            if (t.tipo === 'entrada') entradasPorDia[dia] += t.valor;
            else saidasPorDia[dia] += t.valor;
        });

        const saldoAcumulado = [];
        let saldo = 0;
        for (let i = 0; i < diasNoMes; i++) {
            saldo += entradasPorDia[i] - saidasPorDia[i];
            saldoAcumulado.push(saldo);
        }

        const ctx = document.getElementById('grafico-evolucao-diaria')?.getContext('2d');
        if (!ctx) return;

        if (window._evolucaoDiariaChart) window._evolucaoDiariaChart.destroy();

        window._evolucaoDiariaChart = new Chart(ctx, {
            data: {
                labels: Array.from({ length: diasNoMes }, (_, i) => i + 1),
                datasets: [
                    { type: 'bar',  label: 'Entradas', data: entradasPorDia, backgroundColor: 'rgba(25,135,84,0.4)', borderColor: '#198754', borderWidth: 1 },
                    { type: 'bar',  label: 'Saídas',   data: saidasPorDia,   backgroundColor: 'rgba(220,53,69,0.4)',  borderColor: '#dc3545', borderWidth: 1 },
                    { type: 'line', label: 'Saldo',    data: saldoAcumulado, borderColor: '#0d6efd', borderWidth: 2, fill: false, tension: 0.4 },
                ],
            },
            options: {
                responsive: true,
                scales: {
                    y: { ticks: { callback: v => formatarMoeda(v) } },
                    x: { title: { display: true, text: 'Dia' } },
                },
                plugins: {
                    tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${formatarMoeda(ctx.raw)}` } },
                },
            },
        });
    } catch (err) {
        console.error('Erro gráfico evolução diária:', err);
    }
}

async function carregarTransacoesMes(mes, ano) {
    const diasNoMes = new Date(ano, mes, 0).getDate();
    const mesStr = String(mes).padStart(2, '0');

    try {
        const res = await fetch(`/api/transacoes/?data_inicio=${ano}-${mesStr}-01&data_fim=${ano}-${mesStr}-${diasNoMes}`);
        const data = await res.json();
        if (data.status !== 'success') return;

        const todas = data.data;
        // BUG FIX: filtrava por 'saída' com acento — agora usa 'saida'
        const entradas = todas.filter(t => t.tipo === 'entrada');
        const saidas = todas.filter(t => t.tipo === 'saida');

        preencherTabela('lista-todas-transacoes', todas, true);
        preencherTabela('lista-entradas', entradas, false);
        preencherTabela('lista-saidas', saidas, false);
    } catch (err) {
        console.error('Erro ao carregar transações do mês:', err);
    }
}

function preencherTabela(tableId, transacoes, mostrarTipo) {
    const tbody = document.getElementById(tableId);
    const cols = mostrarTipo ? 5 : 4;
    if (!transacoes.length) {
        tbody.innerHTML = `<tr><td colspan="${cols}" class="text-center text-muted">Nenhuma transação</td></tr>`;
        return;
    }
    transacoes.sort((a, b) => b.data.localeCompare(a.data));
    tbody.innerHTML = transacoes.map(t => `
        <tr>
            <td>${formatarData(t.data)}</td>
            <td>${t.descricao}</td>
            <td>${t.categoria_nome || '-'}</td>
            <td class="${t.tipo === 'entrada' ? 'valor-entrada' : 'valor-saida'}">${formatarMoeda(t.valor)}</td>
            ${mostrarTipo ? `<td><span class="badge ${t.tipo === 'entrada' ? 'bg-success' : 'bg-danger'}">${t.tipo === 'entrada' ? 'Entrada' : 'Saída'}</span></td>` : ''}
        </tr>`).join('');
}

// ── Relatório Diário ────────────────────────────────────────────────────────
async function carregarRelatorioDiario(dataStr) {
    try {
        const res = await fetch(`/api/transacoes/resumo/diario?data=${dataStr}`);
        const data = await res.json();
        if (data.status !== 'success') return;

        const resumo = data.data;
        document.getElementById('total-entradas-dia').textContent = formatarMoeda(resumo.total_entradas);
        document.getElementById('total-saidas-dia').textContent = formatarMoeda(resumo.total_saidas);
        const saldoEl = document.getElementById('saldo-dia');
        saldoEl.textContent = formatarMoeda(resumo.saldo);
        saldoEl.className = resumo.saldo >= 0 ? 'text-success' : 'text-danger';

        const tbody = document.getElementById('lista-transacoes-dia');
        if (!resumo.transacoes.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nenhuma transação nesta data</td></tr>';
            return;
        }
        tbody.innerHTML = resumo.transacoes.map(t => `
            <tr>
                <td>-</td>
                <td>${t.descricao}</td>
                <td>${t.categoria_nome || '-'}</td>
                <td class="${t.tipo === 'entrada' ? 'valor-entrada' : 'valor-saida'}">${formatarMoeda(t.valor)}</td>
                <td><span class="badge ${t.tipo === 'entrada' ? 'bg-success' : 'bg-danger'}">${t.tipo === 'entrada' ? 'Entrada' : 'Saída'}</span></td>
            </tr>`).join('');
    } catch (err) {
        console.error('Erro relatório diário:', err);
    }
}

// ── Exportação ─────────────────────────────────────────────────────────────
function exportarPDF() {
    toast('Exportação para PDF será implementada em breve!', 'info');
}
function exportarExcel() {
    toast('Exportação para Excel será implementada em breve!', 'info');
}
