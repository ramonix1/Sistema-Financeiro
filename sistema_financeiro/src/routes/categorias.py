from flask import Blueprint, request, jsonify
from src.main import db
from src.models.categoria import Categoria

categorias_bp = Blueprint('categorias', __name__)

@categorias_bp.route('/', methods=['GET'])
def listar_categorias():
    """Lista todas as categorias cadastradas."""
    tipo = request.args.get('tipo')
    
    if tipo:
        categorias = Categoria.query.filter_by(tipo=tipo).all()
    else:
        categorias = Categoria.query.all()
    
    return jsonify({
        'status': 'success',
        'data': [categoria.to_dict() for categoria in categorias]
    })

@categorias_bp.route('/', methods=['POST'])
def criar_categoria():
    """Cria uma nova categoria."""
    dados = request.json
    
    if not dados or not dados.get('nome') or not dados.get('tipo'):
        return jsonify({
            'status': 'error',
            'message': 'Nome e tipo da categoria são obrigatórios'
        }), 400
    
    # Validar o tipo
    if dados['tipo'] not in ['entrada', 'saída']:
        return jsonify({
            'status': 'error',
            'message': 'Tipo deve ser "entrada" ou "saída"'
        }), 400
    
    # Verificar se já existe uma categoria com o mesmo nome e tipo
    categoria_existente = Categoria.query.filter_by(
        nome=dados['nome'], 
        tipo=dados['tipo']
    ).first()
    
    if categoria_existente:
        return jsonify({
            'status': 'error',
            'message': 'Já existe uma categoria com este nome e tipo'
        }), 400
    
    nova_categoria = Categoria(
        nome=dados['nome'],
        tipo=dados['tipo']
    )
    
    db.session.add(nova_categoria)
    db.session.commit()
    
    return jsonify({
        'status': 'success',
        'message': 'Categoria criada com sucesso',
        'data': nova_categoria.to_dict()
    }), 201

@categorias_bp.route('/<int:id>', methods=['PUT'])
def atualizar_categoria(id):
    """Atualiza uma categoria existente."""
    categoria = Categoria.query.get(id)
    
    if not categoria:
        return jsonify({
            'status': 'error',
            'message': 'Categoria não encontrada'
        }), 404
    
    dados = request.json
    
    if not dados:
        return jsonify({
            'status': 'error',
            'message': 'Dados inválidos'
        }), 400
    
    if 'nome' in dados:
        categoria.nome = dados['nome']
    
    if 'tipo' in dados:
        if dados['tipo'] not in ['entrada', 'saída']:
            return jsonify({
                'status': 'error',
                'message': 'Tipo deve ser "entrada" ou "saída"'
            }), 400
        categoria.tipo = dados['tipo']
    
    db.session.commit()
    
    return jsonify({
        'status': 'success',
        'message': 'Categoria atualizada com sucesso',
        'data': categoria.to_dict()
    })

@categorias_bp.route('/<int:id>', methods=['DELETE'])
def excluir_categoria(id):
    """Exclui uma categoria existente."""
    categoria = Categoria.query.get(id)
    
    if not categoria:
        return jsonify({
            'status': 'error',
            'message': 'Categoria não encontrada'
        }), 404
    
    # Verificar se existem transações ou contas associadas
    if hasattr(categoria, 'transacoes') and categoria.transacoes:
        return jsonify({
            'status': 'error',
            'message': 'Não é possível excluir uma categoria que possui transações associadas'
        }), 400
    
    if hasattr(categoria, 'contas') and categoria.contas:
        return jsonify({
            'status': 'error',
            'message': 'Não é possível excluir uma categoria que possui contas associadas'
        }), 400
    
    db.session.delete(categoria)
    db.session.commit()
    
    return jsonify({
        'status': 'success',
        'message': 'Categoria excluída com sucesso'
    })
