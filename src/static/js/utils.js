// utils.js — funções compartilhadas entre todas as páginas

/**
 * Formata um número como moeda brasileira (R$).
 */
function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

/**
 * Formata uma string 'YYYY-MM-DD' para dd/mm/aaaa.
 * BUG FIX: new Date('2024-01-15') interpreta como UTC, gerando 14/01 em fusos negativos.
 * Solução: parsear manualmente as partes para evitar conversão de timezone.
 */
function formatarData(dataStr) {
    if (!dataStr) return '-';
    const [ano, mes, dia] = dataStr.split('-');
    return `${dia}/${mes}/${ano}`;
}

/**
 * Exibe uma notificação toast no canto inferior direito.
 * Substitui os alert() espalhados pelo código original.
 * @param {string} msg  Mensagem a exibir
 * @param {'success'|'error'|'info'} tipo  Tipo visual
 */
function toast(msg, tipo = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = { success: 'bi-check-circle-fill', error: 'bi-x-circle-fill', info: 'bi-info-circle-fill' };
    const el = document.createElement('div');
    el.className = `toast-msg ${tipo}`;
    el.innerHTML = `<i class="bi ${icons[tipo] || icons.info}"></i> ${msg}`;
    container.appendChild(el);

    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transition = 'opacity 0.3s';
        setTimeout(() => el.remove(), 300);
    }, 3500);
}
