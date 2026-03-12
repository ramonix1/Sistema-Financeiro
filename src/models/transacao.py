from src.db import db
from datetime import date


class Transacao(db.Model):
    """Modelo para transações financeiras (entradas e saídas)."""

    __tablename__ = "transacoes"

    id = db.Column(db.Integer, primary_key=True)
    # BUG FIX: datetime.now().date avaliado apenas uma vez no import.
    # Usando callable (date.today) para avaliar na criação de cada objeto.
    data = db.Column(db.Date, nullable=False, default=date.today)
    valor = db.Column(db.Float, nullable=False)
    descricao = db.Column(db.String(200), nullable=False)
    # BUG FIX: padronizado para 'saida' sem acento (consistência com Categoria.tipo)
    tipo = db.Column(db.String(20), nullable=False)  # 'entrada' ou 'saida'
    fixa = db.Column(db.Boolean, default=False)

    categoria_id = db.Column(
        db.Integer, db.ForeignKey("categorias.id"), nullable=False
    )
    categoria = db.relationship("Categoria", backref="transacoes")

    def __repr__(self):
        return f"<Transacao {self.descricao} - R${self.valor}>"

    def to_dict(self):
        return {
            "id": self.id,
            "data": self.data.strftime("%Y-%m-%d"),
            "valor": self.valor,
            "descricao": self.descricao,
            "tipo": self.tipo,
            "fixa": self.fixa,
            "categoria_id": self.categoria_id,
            "categoria_nome": self.categoria.nome if self.categoria else None,
        }
