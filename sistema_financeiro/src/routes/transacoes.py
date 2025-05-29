from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from sqlalchemy import extract, func
from src.main import db
from src.models.transacao import Transacao
from src.models.categoria import Categoria

transacoes_bp = Blueprint('transacoes', __name__)

@transacoes_bp.route('/', methods=['GET'])
def listar_transacoes():
    """Lista transações com filtros opcionais."""
    # Parâmetros de filtro
    tipo = request.args.get('tipo')
    data_inicio = request.args.get('data_inicio')
    data_fim = request.args.get('data_fim')
    categoria_id = request.args.get('categoria_id')
    fixa = request.args.get('fixa')
    
    # Construir a query base
    query = Transacao.query
    
    # Aplicar filtros
    if tipo:
        query = query.filter(Transacao.tipo == tipo)
    
    if data_inicio:
        try:
            data_inicio = datetime.strptime(data_inicio, '%Y-%m-%d').date()
            query = query.filter(Transacao.data >= data_inicio)
        except ValueError:
            return jsonify({
                'status': 'error',
                'message': 'Formato de data inválido. Use YYYY-MM-DD'
            }), 400
    
    if data_fim:
        try:
            data_fim = datetime.strptime(data_fim, '%Y-%m-%d').date()
            query = query.filter(Transacao.data <= data_fim)
        except ValueError:
            return jsonify({
                'status': 'error',
                'message': 'Formato de data inválido. Use YYYY-MM-DD'
            }), 400
    
    if categoria_id:
        query = query.filter(Transacao.categoria_id == categoria_id)
    
    if fixa is not None:
        fixa_bool = fixa.lower() == 'true'
        query = query.filter(Transacao.fixa == fixa_bool)
    
    # Ordenar por data (mais recente primeiro)
    transacoes = query.order_by(Transacao.data.desc()).all()
    
    return jsonify({
        'status': 'success',
        'data': [transacao.to_dict() for transacao in transacoes]
    })

@transacoes_bp.route('/', methods=['POST'])
def criar_transacao():
    """Cria uma nova transação."""
    dados = request.json
    
    # Validar campos obrigatórios
    campos_obrigatorios = ['valor', 'descricao', 'tipo', 'categoria_id']
    for campo in campos_obrigatorios:
        if campo not in dados:
            return jsonify({
                'status': 'error',
                'message': f'Campo {campo} é obrigatório'
            }), 400
    
    # Validar o tipo
    if dados['tipo'] not in ['entrada', 'saída']:
        return jsonify({
            'status': 'error',
            'message': 'Tipo deve ser "entrada" ou "saída"'
        }), 400
    
    # Validar categoria
    categoria = Categoria.query.get(dados['categoria_id'])
    if not categoria:
        return jsonify({
            'status': 'error',
            'message': 'Categoria não encontrada'
        }), 404
    
    # Validar compatibilidade entre tipo de transação e categoria
    if dados['tipo'] != categoria.tipo:
        return jsonify({
            'status': 'error',
            'message': f'Categoria do tipo "{categoria.tipo}" não pode ser usada em uma transação do tipo "{dados["tipo"]}"'
        }), 400
    
    # Processar a data
    data = datetime.now().date()
    if 'data' in dados and dados['data']:
        try:
            data = datetime.strptime(dados['data'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({
                'status': 'error',
                'message': 'Formato de data inválido. Use YYYY-MM-DD'
            }), 400
    
    # Criar a transação
    nova_transacao = Transacao(
        data=data,
        valor=float(dados['valor']),
        descricao=dados['descricao'],
        tipo=dados['tipo'],
        categoria_id=dados['categoria_id'],
        fixa=dados.get('fixa', False)
    )
    
    db.session.add(nova_transacao)
    db.session.commit()
    
    return jsonify({
        'status': 'success',
        'message': 'Transação registrada com sucesso',
        'data': nova_transacao.to_dict()
    }), 201

@transacoes_bp.route('/<int:id>', methods=['PUT'])
def atualizar_transacao(id):
    """Atualiza uma transação existente."""
    transacao = Transacao.query.get(id)
    
    if not transacao:
        return jsonify({
            'status': 'error',
            'message': 'Transação não encontrada'
        }), 404
    
    dados = request.json
    
    if not dados:
        return jsonify({
            'status': 'error',
            'message': 'Dados inválidos'
        }), 400
    
    # Atualizar campos
    if 'valor' in dados:
        transacao.valor = float(dados['valor'])
    
    if 'descricao' in dados:
        transacao.descricao = dados['descricao']
    
    if 'tipo' in dados:
        if dados['tipo'] not in ['entrada', 'saída']:
            return jsonify({
                'status': 'error',
                'message': 'Tipo deve ser "entrada" ou "saída"'
            }), 400
        transacao.tipo = dados['tipo']
    
    if 'data' in dados:
        try:
            transacao.data = datetime.strptime(dados['data'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({
                'status': 'error',
                'message': 'Formato de data inválido. Use YYYY-MM-DD'
            }), 400
    
    if 'categoria_id' in dados:
        categoria = Categoria.query.get(dados['categoria_id'])
        if not categoria:
            return jsonify({
                'status': 'error',
                'message': 'Categoria não encontrada'
            }), 404
        
        # Validar compatibilidade entre tipo de transação e categoria
        if transacao.tipo != categoria.tipo:
            return jsonify({
                'status': 'error',
                'message': f'Categoria do tipo "{categoria.tipo}" não pode ser usada em uma transação do tipo "{transacao.tipo}"'
            }), 400
        
        transacao.categoria_id = dados['categoria_id']
    
    if 'fixa' in dados:
        transacao.fixa = dados['fixa']
    
    db.session.commit()
    
    return jsonify({
        'status': 'success',
        'message': 'Transação atualizada com sucesso',
        'data': transacao.to_dict()
    })

@transacoes_bp.route('/<int:id>', methods=['DELETE'])
def excluir_transacao(id):
    """Exclui uma transação existente."""
    transacao = Transacao.query.get(id)
    
    if not transacao:
        return jsonify({
            'status': 'error',
            'message': 'Transação não encontrada'
        }), 404
    
    db.session.delete(transacao)
    db.session.commit()
    
    return jsonify({
        'status': 'success',
        'message': 'Transação excluída com sucesso'
    })

@transacoes_bp.route('/resumo/mensal', methods=['GET'])
def resumo_mensal():
    """Retorna um resumo das transações por mês."""
    ano = request.args.get('ano', datetime.now().year, type=int)
    mes = request.args.get('mes', datetime.now().month, type=int)
    
    # Validar mês e ano
    if mes < 1 or mes > 12:
        return jsonify({
            'status': 'error',
            'message': 'Mês inválido. Deve estar entre 1 e 12'
        }), 400
    
    # Filtrar transações do mês
    transacoes = Transacao.query.filter(
        extract('year', Transacao.data) == ano,
        extract('month', Transacao.data) == mes
    ).all()
    
    # Calcular totais
    total_entradas = sum(t.valor for t in transacoes if t.tipo == 'entrada')
    total_saidas = sum(t.valor for t in transacoes if t.tipo == 'saída')
    saldo = total_entradas - total_saidas
    
    # Agrupar por categoria
    categorias = {}
    for t in transacoes:
        cat_nome = t.categoria.nome
        if cat_nome not in categorias:
            categorias[cat_nome] = {
                'total': 0,
                'tipo': t.categoria.tipo,
                'transacoes': []
            }
        
        categorias[cat_nome]['total'] += t.valor
        categorias[cat_nome]['transacoes'].append(t.to_dict())
    
    return jsonify({
        'status': 'success',
        'data': {
            'ano': ano,
            'mes': mes,
            'total_entradas': total_entradas,
            'total_saidas': total_saidas,
            'saldo': saldo,
            'categorias': categorias
        }
    })

@transacoes_bp.route('/resumo/diario', methods=['GET'])
def resumo_diario():
    """Retorna um resumo das transações por dia."""
    data_str = request.args.get('data', datetime.now().strftime('%Y-%m-%d'))
    
    try:
        data = datetime.strptime(data_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({
            'status': 'error',
            'message': 'Formato de data inválido. Use YYYY-MM-DD'
        }), 400
    
    # Filtrar transações do dia
    transacoes = Transacao.query.filter(Transacao.data == data).all()
    
    # Calcular totais
    total_entradas = sum(t.valor for t in transacoes if t.tipo == 'entrada')
    total_saidas = sum(t.valor for t in transacoes if t.tipo == 'saída')
    saldo = total_entradas - total_saidas
    
    return jsonify({
        'status': 'success',
        'data': {
            'data': data.strftime('%Y-%m-%d'),
            'total_entradas': total_entradas,
            'total_saidas': total_saidas,
            'saldo': saldo,
            'transacoes': [t.to_dict() for t in transacoes]
        }
    })
