from flask import Blueprint, request, jsonify
from datetime import datetime, date
from sqlalchemy import extract, func
from src.db import db  # BUG FIX: importava de src.main causando import circular
from src.models.transacao import Transacao
from src.models.categoria import Categoria

transacoes_bp = Blueprint("transacoes", __name__)

TIPOS_VALIDOS = ("entrada", "saida")


def _parse_date(date_str, field_name="data"):
    """Converte string YYYY-MM-DD para date, retornando (date, None) ou (None, error_response)."""
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date(), None
    except ValueError:
        return None, jsonify(
            {"status": "error", "message": f"Formato de {field_name} inválido. Use YYYY-MM-DD"}
        ), 400


@transacoes_bp.route("/", methods=["GET"])
def listar_transacoes():
    """Lista transações com filtros e paginação opcionais."""
    tipo = request.args.get("tipo")
    data_inicio = request.args.get("data_inicio")
    data_fim = request.args.get("data_fim")
    categoria_id = request.args.get("categoria_id", type=int)
    fixa = request.args.get("fixa")
    limit = request.args.get("limit", type=int)  # BUG FIX: frontend enviava ?limit=5 mas era ignorado

    query = Transacao.query

    if tipo:
        if tipo not in TIPOS_VALIDOS:
            return jsonify({"status": "error", "message": "Tipo inválido"}), 400
        query = query.filter(Transacao.tipo == tipo)

    if data_inicio:
        result = _parse_date(data_inicio, "data_inicio")
        if len(result) == 3:
            return result[1], result[2]
        query = query.filter(Transacao.data >= result[0])

    if data_fim:
        result = _parse_date(data_fim, "data_fim")
        if len(result) == 3:
            return result[1], result[2]
        query = query.filter(Transacao.data <= result[0])

    if categoria_id:
        query = query.filter(Transacao.categoria_id == categoria_id)

    if fixa is not None:
        query = query.filter(Transacao.fixa == (fixa.lower() == "true"))

    query = query.order_by(Transacao.data.desc())

    if limit:
        query = query.limit(limit)

    transacoes = query.all()
    return jsonify({"status": "success", "data": [t.to_dict() for t in transacoes]})


@transacoes_bp.route("/", methods=["POST"])
def criar_transacao():
    """Cria uma nova transação."""
    dados = request.get_json(silent=True)
    if not dados:
        return jsonify({"status": "error", "message": "Corpo da requisição inválido"}), 400

    for campo in ("valor", "descricao", "tipo", "categoria_id"):
        if campo not in dados:
            return jsonify({"status": "error", "message": f"Campo '{campo}' é obrigatório"}), 400

    tipo = dados["tipo"].lower()
    if tipo not in TIPOS_VALIDOS:
        return jsonify({"status": "error", "message": 'Tipo deve ser "entrada" ou "saida"'}), 400

    try:
        valor = float(dados["valor"])
        if valor <= 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({"status": "error", "message": "Valor deve ser um número positivo"}), 400

    categoria = db.session.get(Categoria, int(dados["categoria_id"]))
    if not categoria:
        return jsonify({"status": "error", "message": "Categoria não encontrada"}), 404

    # BUG FIX: comparação categoria.tipo != tipo falhava porque modelo usava 'saída' (com acento)
    # e a rota usava 'saida'. Agora ambos usam 'saida' sem acento.
    if categoria.tipo != tipo:
        return jsonify(
            {
                "status": "error",
                "message": f'Categoria "{categoria.nome}" é do tipo "{categoria.tipo}" '
                           f'e não pode ser usada em transação do tipo "{tipo}"',
            }
        ), 400

    data_transacao = date.today()
    if dados.get("data"):
        result = _parse_date(dados["data"])
        if len(result) == 3:
            return result[1], result[2]
        data_transacao = result[0]

    nova = Transacao(
        data=data_transacao,
        valor=valor,
        descricao=dados["descricao"].strip(),
        tipo=tipo,
        categoria_id=int(dados["categoria_id"]),
        fixa=dados.get("fixa", False),
    )
    db.session.add(nova)
    db.session.commit()

    return jsonify(
        {"status": "success", "message": "Transação registrada com sucesso", "data": nova.to_dict()}
    ), 201


@transacoes_bp.route("/<int:id>", methods=["PUT"])
def atualizar_transacao(id):
    """Atualiza uma transação existente."""
    transacao = db.session.get(Transacao, id)
    if not transacao:
        return jsonify({"status": "error", "message": "Transação não encontrada"}), 404

    dados = request.get_json(silent=True)
    if not dados:
        return jsonify({"status": "error", "message": "Dados inválidos"}), 400

    if "valor" in dados:
        try:
            valor = float(dados["valor"])
            if valor <= 0:
                raise ValueError
            transacao.valor = valor
        except (ValueError, TypeError):
            return jsonify({"status": "error", "message": "Valor deve ser um número positivo"}), 400

    if "descricao" in dados:
        transacao.descricao = dados["descricao"].strip()

    if "tipo" in dados:
        tipo = dados["tipo"].lower()
        if tipo not in TIPOS_VALIDOS:
            return jsonify({"status": "error", "message": 'Tipo deve ser "entrada" ou "saida"'}), 400
        transacao.tipo = tipo

    if "data" in dados:
        result = _parse_date(dados["data"])
        if len(result) == 3:
            return result[1], result[2]
        transacao.data = result[0]

    if "categoria_id" in dados:
        categoria = db.session.get(Categoria, int(dados["categoria_id"]))
        if not categoria:
            return jsonify({"status": "error", "message": "Categoria não encontrada"}), 404
        if categoria.tipo != transacao.tipo:
            return jsonify(
                {"status": "error", "message": "Tipo da categoria não corresponde ao tipo da transação"}
            ), 400
        transacao.categoria_id = int(dados["categoria_id"])

    if "fixa" in dados:
        transacao.fixa = bool(dados["fixa"])

    db.session.commit()
    return jsonify(
        {"status": "success", "message": "Transação atualizada com sucesso", "data": transacao.to_dict()}
    )


@transacoes_bp.route("/<int:id>", methods=["DELETE"])
def excluir_transacao(id):
    """Exclui uma transação."""
    transacao = db.session.get(Transacao, id)
    if not transacao:
        return jsonify({"status": "error", "message": "Transação não encontrada"}), 404

    db.session.delete(transacao)
    db.session.commit()
    return jsonify({"status": "success", "message": "Transação excluída com sucesso"})


@transacoes_bp.route("/resumo/mensal", methods=["GET"])
def resumo_mensal():
    """Retorna resumo financeiro do mês com breakdown por categoria."""
    hoje = date.today()
    ano = request.args.get("ano", hoje.year, type=int)
    mes = request.args.get("mes", hoje.month, type=int)

    if not (1 <= mes <= 12):
        return jsonify({"status": "error", "message": "Mês deve estar entre 1 e 12"}), 400

    transacoes = Transacao.query.filter(
        extract("year", Transacao.data) == ano,
        extract("month", Transacao.data) == mes,
    ).all()

    total_entradas = sum(t.valor for t in transacoes if t.tipo == "entrada")
    total_saidas = sum(t.valor for t in transacoes if t.tipo == "saida")

    # BUG FIX: resumo_mensal original não retornava breakdown por categoria.
    # O dashboard.js tentava acessar resumo.categorias que era undefined, quebrando o gráfico.
    categorias: dict = {}
    for t in transacoes:
        nome = t.categoria_nome if hasattr(t, "categoria_nome") else (
            t.categoria.nome if t.categoria else "Sem categoria"
        )
        if nome not in categorias:
            categorias[nome] = {"total": 0, "tipo": t.tipo}
        categorias[nome]["total"] += t.valor

    return jsonify(
        {
            "status": "success",
            "data": {
                "ano": ano,
                "mes": mes,
                "total_entradas": round(total_entradas, 2),
                "total_saidas": round(total_saidas, 2),
                "saldo": round(total_entradas - total_saidas, 2),
                "categorias": categorias,
            },
        }
    )


@transacoes_bp.route("/resumo/diario", methods=["GET"])
def resumo_diario():
    """Retorna resumo financeiro de um dia específico."""
    data_str = request.args.get("data", date.today().strftime("%Y-%m-%d"))
    result = _parse_date(data_str)
    if len(result) == 3:
        return result[1], result[2]
    data = result[0]

    transacoes = Transacao.query.filter(Transacao.data == data).all()
    total_entradas = sum(t.valor for t in transacoes if t.tipo == "entrada")
    total_saidas = sum(t.valor for t in transacoes if t.tipo == "saida")

    return jsonify(
        {
            "status": "success",
            "data": {
                "data": data.strftime("%Y-%m-%d"),
                "total_entradas": round(total_entradas, 2),
                "total_saidas": round(total_saidas, 2),
                "saldo": round(total_entradas - total_saidas, 2),
                "transacoes": [t.to_dict() for t in transacoes],
            },
        }
    )
