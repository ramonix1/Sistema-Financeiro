from flask import Blueprint, request, jsonify
from datetime import datetime, date, timedelta
from dateutil.relativedelta import relativedelta  # MELHORIA: evita bug de aritmética de meses
from src.db import db  # BUG FIX: importava de src.main causando import circular
from src.models.conta import Conta, Periodicidade
from src.models.categoria import Categoria
from src.models.transacao import Transacao

contas_bp = Blueprint("contas", __name__)


def _parse_date(date_str, field_name="data"):
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date(), None
    except ValueError:
        return None, (
            jsonify({"status": "error", "message": f"Formato de {field_name} inválido. Use YYYY-MM-DD"}),
            400,
        )


def _proxima_data_vencimento(data_atual: date, periodicidade: Periodicidade) -> date | None:
    """
    Calcula a próxima data de vencimento com base na periodicidade.
    BUG FIX: o código original usava aritmética manual de meses com lista de dias,
    ignorando anos bissextos em alguns casos e podendo gerar datas inválidas.
    Agora usa dateutil.relativedelta para cálculo correto.
    """
    deltas = {
        Periodicidade.DIARIA: timedelta(days=1),
        Periodicidade.SEMANAL: timedelta(weeks=1),
        Periodicidade.QUINZENAL: timedelta(days=15),
        Periodicidade.MENSAL: relativedelta(months=1),
        Periodicidade.BIMESTRAL: relativedelta(months=2),
        Periodicidade.TRIMESTRAL: relativedelta(months=3),
        Periodicidade.SEMESTRAL: relativedelta(months=6),
        Periodicidade.ANUAL: relativedelta(years=1),
    }
    delta = deltas.get(periodicidade)
    return data_atual + delta if delta else None


@contas_bp.route("/", methods=["GET"])
def listar_contas():
    """Lista contas com filtros opcionais."""
    status = request.args.get("status")
    fixa = request.args.get("fixa")
    categoria_id = request.args.get("categoria_id", type=int)

    query = Conta.query

    if status:
        query = query.filter(Conta.status == status)

    if fixa is not None:
        query = query.filter(Conta.fixa == (fixa.lower() == "true"))

    if categoria_id:
        query = query.filter(Conta.categoria_id == categoria_id)

    contas = query.order_by(Conta.data_vencimento).all()
    return jsonify({"status": "success", "data": [c.to_dict() for c in contas]})


@contas_bp.route("/", methods=["POST"])
def criar_conta():
    """Cria uma nova conta."""
    dados = request.get_json(silent=True)
    if not dados:
        return jsonify({"status": "error", "message": "Corpo da requisição inválido"}), 400

    for campo in ("nome", "valor", "categoria_id"):
        if campo not in dados:
            return jsonify({"status": "error", "message": f"Campo '{campo}' é obrigatório"}), 400

    try:
        valor = float(dados["valor"])
        if valor <= 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({"status": "error", "message": "Valor deve ser um número positivo"}), 400

    categoria = db.session.get(Categoria, int(dados["categoria_id"]))
    if not categoria:
        return jsonify({"status": "error", "message": "Categoria não encontrada"}), 404

    data_vencimento = None
    if dados.get("data_vencimento"):
        data_vencimento, err = _parse_date(dados["data_vencimento"], "data_vencimento")
        if err:
            return err

    periodicidade = None
    if dados.get("periodicidade"):
        try:
            periodicidade = Periodicidade(dados["periodicidade"])
        except ValueError:
            opcoes = ", ".join(p.value for p in Periodicidade)
            return jsonify(
                {"status": "error", "message": f"Periodicidade inválida. Opções: {opcoes}"}
            ), 400

    fixa = bool(dados.get("fixa", False))
    if fixa and not periodicidade:
        return jsonify(
            {"status": "error", "message": "Periodicidade é obrigatória para contas fixas"}
        ), 400

    nova = Conta(
        nome=dados["nome"].strip(),
        valor=valor,
        data_vencimento=data_vencimento,
        fixa=fixa,
        periodicidade=periodicidade,
        status=dados.get("status", "pendente"),
        observacoes=dados.get("observacoes", ""),
        categoria_id=int(dados["categoria_id"]),
    )
    db.session.add(nova)
    db.session.commit()

    return jsonify(
        {"status": "success", "message": "Conta registrada com sucesso", "data": nova.to_dict()}
    ), 201


@contas_bp.route("/<int:id>", methods=["PUT"])
def atualizar_conta(id):
    """Atualiza uma conta existente."""
    conta = db.session.get(Conta, id)
    if not conta:
        return jsonify({"status": "error", "message": "Conta não encontrada"}), 404

    dados = request.get_json(silent=True)
    if not dados:
        return jsonify({"status": "error", "message": "Dados inválidos"}), 400

    if "nome" in dados:
        conta.nome = dados["nome"].strip()

    if "valor" in dados:
        try:
            valor = float(dados["valor"])
            if valor <= 0:
                raise ValueError
            conta.valor = valor
        except (ValueError, TypeError):
            return jsonify({"status": "error", "message": "Valor deve ser um número positivo"}), 400

    if "data_vencimento" in dados:
        if dados["data_vencimento"]:
            data, err = _parse_date(dados["data_vencimento"], "data_vencimento")
            if err:
                return err
            conta.data_vencimento = data
        else:
            conta.data_vencimento = None

    if "fixa" in dados:
        conta.fixa = bool(dados["fixa"])

    if "periodicidade" in dados:
        if dados["periodicidade"]:
            try:
                conta.periodicidade = Periodicidade(dados["periodicidade"])
            except ValueError:
                opcoes = ", ".join(p.value for p in Periodicidade)
                return jsonify(
                    {"status": "error", "message": f"Periodicidade inválida. Opções: {opcoes}"}
                ), 400
        else:
            conta.periodicidade = None

    if "status" in dados:
        if dados["status"] not in ("pendente", "paga", "atrasada"):
            return jsonify({"status": "error", "message": "Status inválido"}), 400
        conta.status = dados["status"]

    if "observacoes" in dados:
        conta.observacoes = dados["observacoes"]

    if "categoria_id" in dados:
        categoria = db.session.get(Categoria, int(dados["categoria_id"]))
        if not categoria:
            return jsonify({"status": "error", "message": "Categoria não encontrada"}), 404
        conta.categoria_id = int(dados["categoria_id"])

    db.session.commit()
    return jsonify(
        {"status": "success", "message": "Conta atualizada com sucesso", "data": conta.to_dict()}
    )


@contas_bp.route("/<int:id>", methods=["DELETE"])
def excluir_conta(id):
    """Exclui uma conta."""
    conta = db.session.get(Conta, id)
    if not conta:
        return jsonify({"status": "error", "message": "Conta não encontrada"}), 404

    db.session.delete(conta)
    db.session.commit()
    return jsonify({"status": "success", "message": "Conta excluída com sucesso"})


@contas_bp.route("/<int:id>/pagar", methods=["POST"])
def pagar_conta(id):
    """Marca uma conta como paga e cria transação correspondente."""
    conta = db.session.get(Conta, id)
    if not conta:
        return jsonify({"status": "error", "message": "Conta não encontrada"}), 404

    if conta.status == "paga":
        return jsonify({"status": "error", "message": "Esta conta já está paga"}), 400

    dados = request.get_json(silent=True) or {}

    data_pagamento = date.today()
    if dados.get("data_pagamento"):
        data_pagamento, err = _parse_date(dados["data_pagamento"], "data_pagamento")
        if err:
            return err

    # Criar transação de saída
    transacao = Transacao(
        data=data_pagamento,
        valor=conta.valor,
        descricao=f"Pagamento: {conta.nome}",
        tipo="saida",  # BUG FIX: era 'saída' com acento, inconsistente com o modelo
        categoria_id=conta.categoria_id,
        fixa=conta.fixa,
    )
    db.session.add(transacao)
    db.session.flush()  # garante que transacao.id está disponível antes do commit

    conta.status = "paga"
    conta.transacao_id = transacao.id

    # Se conta fixa, criar próxima ocorrência
    if conta.fixa and conta.periodicidade and conta.data_vencimento:
        proxima_data = _proxima_data_vencimento(conta.data_vencimento, conta.periodicidade)
        if proxima_data:
            nova_conta = Conta(
                nome=conta.nome,
                valor=conta.valor,
                data_vencimento=proxima_data,
                fixa=True,
                periodicidade=conta.periodicidade,
                status="pendente",
                observacoes=conta.observacoes,
                categoria_id=conta.categoria_id,
            )
            db.session.add(nova_conta)

    db.session.commit()

    return jsonify(
        {
            "status": "success",
            "message": "Conta marcada como paga com sucesso",
            "data": {"conta": conta.to_dict(), "transacao": transacao.to_dict()},
        }
    )


@contas_bp.route("/vencidas", methods=["GET"])
def listar_contas_vencidas():
    """Lista contas vencidas e pendentes. Atualiza status para 'atrasada'."""
    hoje = date.today()

    contas = Conta.query.filter(
        Conta.data_vencimento < hoje,
        Conta.status == "pendente",
    ).order_by(Conta.data_vencimento).all()

    # MELHORIA: atualiza status automaticamente ao listar
    for conta in contas:
        conta.status = "atrasada"
    if contas:
        db.session.commit()

    return jsonify({"status": "success", "data": [c.to_dict() for c in contas]})


@contas_bp.route("/proximas", methods=["GET"])
def listar_proximas_contas():
    """Lista contas a vencer nos próximos N dias (padrão: 7)."""
    hoje = date.today()
    dias = request.args.get("dias", 7, type=int)
    data_limite = hoje + timedelta(days=dias)

    contas = Conta.query.filter(
        Conta.data_vencimento >= hoje,
        Conta.data_vencimento <= data_limite,
        Conta.status == "pendente",
    ).order_by(Conta.data_vencimento).all()

    return jsonify({"status": "success", "data": [c.to_dict() for c in contas]})
