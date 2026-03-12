from flask import Blueprint, request, jsonify
from src.db import db  # BUG FIX: importava de src.main causando import circular
from src.models.categoria import Categoria

categorias_bp = Blueprint("categorias", __name__)

TIPOS_VALIDOS = ("entrada", "saida")


@categorias_bp.route("/", methods=["GET"])
def listar_categorias():
    """Lista todas as categorias, com filtro opcional por tipo."""
    tipo = request.args.get("tipo")

    query = Categoria.query
    if tipo:
        if tipo not in TIPOS_VALIDOS:
            return jsonify({"status": "error", "message": "Tipo inválido"}), 400
        query = query.filter_by(tipo=tipo)

    categorias = query.order_by(Categoria.nome).all()
    return jsonify({"status": "success", "data": [c.to_dict() for c in categorias]})


@categorias_bp.route("/", methods=["POST"])
def criar_categoria():
    """Cria uma nova categoria."""
    dados = request.get_json(silent=True)

    if not dados or not dados.get("nome") or not dados.get("tipo"):
        return jsonify(
            {"status": "error", "message": "Nome e tipo são obrigatórios"}
        ), 400

    # BUG FIX: validação agora usa TIPOS_VALIDOS sem acento (consistente com o modelo)
    if dados["tipo"] not in TIPOS_VALIDOS:
        return jsonify(
            {"status": "error", "message": 'Tipo deve ser "entrada" ou "saida"'}
        ), 400

    existente = Categoria.query.filter_by(
        nome=dados["nome"], tipo=dados["tipo"]
    ).first()
    if existente:
        return jsonify(
            {"status": "error", "message": "Já existe uma categoria com este nome e tipo"}
        ), 409

    nova = Categoria(nome=dados["nome"].strip(), tipo=dados["tipo"])
    db.session.add(nova)
    db.session.commit()

    return jsonify(
        {"status": "success", "message": "Categoria criada com sucesso", "data": nova.to_dict()}
    ), 201


@categorias_bp.route("/<int:id>", methods=["PUT"])
def atualizar_categoria(id):
    """Atualiza uma categoria existente."""
    categoria = db.session.get(Categoria, id)  # BUG FIX: .query.get() deprecated no SQLAlchemy 2
    if not categoria:
        return jsonify({"status": "error", "message": "Categoria não encontrada"}), 404

    dados = request.get_json(silent=True)
    if not dados:
        return jsonify({"status": "error", "message": "Dados inválidos"}), 400

    if "nome" in dados:
        categoria.nome = dados["nome"].strip()

    if "tipo" in dados:
        if dados["tipo"] not in TIPOS_VALIDOS:
            return jsonify(
                {"status": "error", "message": 'Tipo deve ser "entrada" ou "saida"'}
            ), 400
        categoria.tipo = dados["tipo"]

    db.session.commit()
    return jsonify(
        {"status": "success", "message": "Categoria atualizada com sucesso", "data": categoria.to_dict()}
    )


@categorias_bp.route("/<int:id>", methods=["DELETE"])
def excluir_categoria(id):
    """Exclui uma categoria que não tenha transações ou contas associadas."""
    categoria = db.session.get(Categoria, id)
    if not categoria:
        return jsonify({"status": "error", "message": "Categoria não encontrada"}), 404

    if categoria.transacoes:
        return jsonify(
            {"status": "error", "message": "Categoria possui transações associadas e não pode ser excluída"}
        ), 409

    if categoria.contas:
        return jsonify(
            {"status": "error", "message": "Categoria possui contas associadas e não pode ser excluída"}
        ), 409

    db.session.delete(categoria)
    db.session.commit()
    return jsonify({"status": "success", "message": "Categoria excluída com sucesso"})
