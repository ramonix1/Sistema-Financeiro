from src.db import db
from datetime import date
import enum


class Periodicidade(enum.Enum):
    DIARIA = "diaria"
    SEMANAL = "semanal"
    QUINZENAL = "quinzenal"
    MENSAL = "mensal"
    BIMESTRAL = "bimestral"
    TRIMESTRAL = "trimestral"
    SEMESTRAL = "semestral"
    ANUAL = "anual"


class Conta(db.Model):
    """Modelo para contas fixas e variáveis."""

    __tablename__ = "contas"

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(200), nullable=False)
    valor = db.Column(db.Float, nullable=False)
    data_vencimento = db.Column(db.Date, nullable=True)
    fixa = db.Column(db.Boolean, default=False)
    periodicidade = db.Column(db.Enum(Periodicidade), nullable=True)
    status = db.Column(db.String(20), default="pendente")  # pendente | paga | atrasada
    observacoes = db.Column(db.String(500), nullable=True)

    categoria_id = db.Column(
        db.Integer, db.ForeignKey("categorias.id"), nullable=False
    )
    categoria = db.relationship("Categoria", backref="contas")

    transacao_id = db.Column(
        db.Integer, db.ForeignKey("transacoes.id"), nullable=True
    )
    transacao = db.relationship("Transacao", backref="conta_origem")

    def __repr__(self):
        return f"<Conta {self.nome} - R${self.valor}>"

    def to_dict(self):
        return {
            "id": self.id,
            "nome": self.nome,
            "valor": self.valor,
            "data_vencimento": (
                self.data_vencimento.strftime("%Y-%m-%d")
                if self.data_vencimento
                else None
            ),
            "fixa": self.fixa,
            "periodicidade": self.periodicidade.value if self.periodicidade else None,
            "status": self.status,
            "observacoes": self.observacoes,
            "categoria_id": self.categoria_id,
            "categoria_nome": self.categoria.nome if self.categoria else None,
            "transacao_id": self.transacao_id,
        }
