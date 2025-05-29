from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from src.main import db
from src.models.conta import Conta, Periodicidade
from src.models.categoria import Categoria
from src.models.transacao import Transacao

contas_bp = Blueprint('contas', __name__)

@contas_bp.route('/', methods=['GET'])
def listar_contas():
    """Lista contas com filtros opcionais."""
    # Parâmetros de filtro
    status = request.args.get('status')
    fixa = request.args.get('fixa')
    categoria_id = request.args.get('categoria_id')
    
    # Construir a query base
    query = Conta.query
    
    # Aplicar filtros
    if status:
        query = query.filter(Conta.status == status)
    
    if fixa is not None:
        fixa_bool = fixa.lower() == 'true'
        query = query.filter(Conta.fixa == fixa_bool)
    
    if categoria_id:
        query = query.filter(Conta.categoria_id == categoria_id)
    
    # Ordenar por data de vencimento
    contas = query.order_by(Conta.data_vencimento).all()
    
    return jsonify({
        'status': 'success',
        'data': [conta.to_dict() for conta in contas]
    })

@contas_bp.route('/', methods=['POST'])
def criar_conta():
    """Cria uma nova conta."""
    dados = request.json
    
    # Validar campos obrigatórios
    campos_obrigatorios = ['nome', 'valor', 'categoria_id']
    for campo in campos_obrigatorios:
        if campo not in dados:
            return jsonify({
                'status': 'error',
                'message': f'Campo {campo} é obrigatório'
            }), 400
    
    # Validar categoria
    categoria = Categoria.query.get(dados['categoria_id'])
    if not categoria:
        return jsonify({
            'status': 'error',
            'message': 'Categoria não encontrada'
        }), 404
    
    # Processar a data de vencimento
    data_vencimento = None
    if 'data_vencimento' in dados and dados['data_vencimento']:
        try:
            data_vencimento = datetime.strptime(dados['data_vencimento'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({
                'status': 'error',
                'message': 'Formato de data inválido. Use YYYY-MM-DD'
            }), 400
    
    # Processar periodicidade
    periodicidade = None
    if 'periodicidade' in dados and dados['periodicidade']:
        try:
            periodicidade = Periodicidade(dados['periodicidade'])
        except ValueError:
            return jsonify({
                'status': 'error',
                'message': f'Periodicidade inválida. Valores válidos: {", ".join([p.value for p in Periodicidade])}'
            }), 400
    
    # Criar a conta
    nova_conta = Conta(
        nome=dados['nome'],
        valor=float(dados['valor']),
        data_vencimento=data_vencimento,
        fixa=dados.get('fixa', False),
        periodicidade=periodicidade,
        status=dados.get('status', 'pendente'),
        observacoes=dados.get('observacoes', ''),
        categoria_id=dados['categoria_id']
    )
    
    db.session.add(nova_conta)
    db.session.commit()
    
    return jsonify({
        'status': 'success',
        'message': 'Conta registrada com sucesso',
        'data': nova_conta.to_dict()
    }), 201

@contas_bp.route('/<int:id>', methods=['PUT'])
def atualizar_conta(id):
    """Atualiza uma conta existente."""
    conta = Conta.query.get(id)
    
    if not conta:
        return jsonify({
            'status': 'error',
            'message': 'Conta não encontrada'
        }), 404
    
    dados = request.json
    
    if not dados:
        return jsonify({
            'status': 'error',
            'message': 'Dados inválidos'
        }), 400
    
    # Atualizar campos
    if 'nome' in dados:
        conta.nome = dados['nome']
    
    if 'valor' in dados:
        conta.valor = float(dados['valor'])
    
    if 'data_vencimento' in dados:
        if dados['data_vencimento']:
            try:
                conta.data_vencimento = datetime.strptime(dados['data_vencimento'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({
                    'status': 'error',
                    'message': 'Formato de data inválido. Use YYYY-MM-DD'
                }), 400
        else:
            conta.data_vencimento = None
    
    if 'fixa' in dados:
        conta.fixa = dados['fixa']
    
    if 'periodicidade' in dados:
        if dados['periodicidade']:
            try:
                conta.periodicidade = Periodicidade(dados['periodicidade'])
            except ValueError:
                return jsonify({
                    'status': 'error',
                    'message': f'Periodicidade inválida. Valores válidos: {", ".join([p.value for p in Periodicidade])}'
                }), 400
        else:
            conta.periodicidade = None
    
    if 'status' in dados:
        conta.status = dados['status']
    
    if 'observacoes' in dados:
        conta.observacoes = dados['observacoes']
    
    if 'categoria_id' in dados:
        categoria = Categoria.query.get(dados['categoria_id'])
        if not categoria:
            return jsonify({
                'status': 'error',
                'message': 'Categoria não encontrada'
            }), 404
        conta.categoria_id = dados['categoria_id']
    
    db.session.commit()
    
    return jsonify({
        'status': 'success',
        'message': 'Conta atualizada com sucesso',
        'data': conta.to_dict()
    })

@contas_bp.route('/<int:id>', methods=['DELETE'])
def excluir_conta(id):
    """Exclui uma conta existente."""
    conta = Conta.query.get(id)
    
    if not conta:
        return jsonify({
            'status': 'error',
            'message': 'Conta não encontrada'
        }), 404
    
    db.session.delete(conta)
    db.session.commit()
    
    return jsonify({
        'status': 'success',
        'message': 'Conta excluída com sucesso'
    })

@contas_bp.route('/<int:id>/pagar', methods=['POST'])
def pagar_conta(id):
    """Marca uma conta como paga e cria uma transação correspondente."""
    conta = Conta.query.get(id)
    
    if not conta:
        return jsonify({
            'status': 'error',
            'message': 'Conta não encontrada'
        }), 404
    
    if conta.status == 'paga':
        return jsonify({
            'status': 'error',
            'message': 'Esta conta já está paga'
        }), 400
    
    dados = request.json or {}
    
    # Data do pagamento (padrão: hoje)
    data_pagamento = datetime.now().date()
    if 'data_pagamento' in dados:
        try:
            data_pagamento = datetime.strptime(dados['data_pagamento'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({
                'status': 'error',
                'message': 'Formato de data inválido. Use YYYY-MM-DD'
            }), 400
    
    # Criar transação de saída
    transacao = Transacao(
        data=data_pagamento,
        valor=conta.valor,
        descricao=f"Pagamento: {conta.nome}",
        tipo='saída',
        categoria_id=conta.categoria_id,
        fixa=conta.fixa
    )
    
    db.session.add(transacao)
    
    # Atualizar conta
    conta.status = 'paga'
    conta.transacao_id = transacao.id
    
    # Se for conta fixa, criar próxima conta
    if conta.fixa and conta.periodicidade:
        proxima_data = None
        
        if conta.periodicidade == Periodicidade.DIARIA:
            proxima_data = conta.data_vencimento + timedelta(days=1)
        elif conta.periodicidade == Periodicidade.SEMANAL:
            proxima_data = conta.data_vencimento + timedelta(weeks=1)
        elif conta.periodicidade == Periodicidade.QUINZENAL:
            proxima_data = conta.data_vencimento + timedelta(days=15)
        elif conta.periodicidade == Periodicidade.MENSAL:
            # Adicionar um mês (considerando o último dia do mês)
            mes = conta.data_vencimento.month + 1
            ano = conta.data_vencimento.year
            if mes > 12:
                mes = 1
                ano += 1
            
            dia = min(conta.data_vencimento.day, [31, 29 if ano % 4 == 0 and (ano % 100 != 0 or ano % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mes-1])
            proxima_data = datetime(ano, mes, dia).date()
        elif conta.periodicidade == Periodicidade.BIMESTRAL:
            mes = conta.data_vencimento.month + 2
            ano = conta.data_vencimento.year
            if mes > 12:
                mes -= 12
                ano += 1
            
            dia = min(conta.data_vencimento.day, [31, 29 if ano % 4 == 0 and (ano % 100 != 0 or ano % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mes-1])
            proxima_data = datetime(ano, mes, dia).date()
        elif conta.periodicidade == Periodicidade.TRIMESTRAL:
            mes = conta.data_vencimento.month + 3
            ano = conta.data_vencimento.year
            if mes > 12:
                mes -= 12
                ano += 1
            
            dia = min(conta.data_vencimento.day, [31, 29 if ano % 4 == 0 and (ano % 100 != 0 or ano % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mes-1])
            proxima_data = datetime(ano, mes, dia).date()
        elif conta.periodicidade == Periodicidade.SEMESTRAL:
            mes = conta.data_vencimento.month + 6
            ano = conta.data_vencimento.year
            if mes > 12:
                mes -= 12
                ano += 1
            
            dia = min(conta.data_vencimento.day, [31, 29 if ano % 4 == 0 and (ano % 100 != 0 or ano % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mes-1])
            proxima_data = datetime(ano, mes, dia).date()
        elif conta.periodicidade == Periodicidade.ANUAL:
            proxima_data = datetime(conta.data_vencimento.year + 1, conta.data_vencimento.month, conta.data_vencimento.day).date()
        
        if proxima_data:
            nova_conta = Conta(
                nome=conta.nome,
                valor=conta.valor,
                data_vencimento=proxima_data,
                fixa=True,
                periodicidade=conta.periodicidade,
                status='pendente',
                observacoes=conta.observacoes,
                categoria_id=conta.categoria_id
            )
            db.session.add(nova_conta)
    
    db.session.commit()
    
    return jsonify({
        'status': 'success',
        'message': 'Conta marcada como paga com sucesso',
        'data': {
            'conta': conta.to_dict(),
            'transacao': transacao.to_dict()
        }
    })

@contas_bp.route('/vencidas', methods=['GET'])
def listar_contas_vencidas():
    """Lista contas vencidas."""
    hoje = datetime.now().date()
    
    contas_vencidas = Conta.query.filter(
        Conta.data_vencimento < hoje,
        Conta.status == 'pendente'
    ).order_by(Conta.data_vencimento).all()
    
    return jsonify({
        'status': 'success',
        'data': [conta.to_dict() for conta in contas_vencidas]
    })

@contas_bp.route('/proximas', methods=['GET'])
def listar_proximas_contas():
    """Lista contas a vencer nos próximos dias."""
    hoje = datetime.now().date()
    dias = request.args.get('dias', 7, type=int)
    
    data_limite = hoje + timedelta(days=dias)
    
    proximas_contas = Conta.query.filter(
        Conta.data_vencimento >= hoje,
        Conta.data_vencimento <= data_limite,
        Conta.status == 'pendente'
    ).order_by(Conta.data_vencimento).all()
    
    return jsonify({
        'status': 'success',
        'data': [conta.to_dict() for conta in proximas_contas]
    })
