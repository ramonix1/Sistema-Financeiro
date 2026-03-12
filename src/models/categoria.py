from src.db import db


class Categoria(db.Model):
    """
    Modelo para categorias de transações financeiras.
    tipo: 'entrada' ou 'saida' (sem acento para consistência com o frontend)
    """

    __tablename__ = "categorias"

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    # BUG FIX: padronizado para 'saida' sem acento — o código original misturava
    # 'saída' (com acento) no modelo e 'saida' (sem acento) nas rotas de transação,
    # causando falha na validação categoria.tipo != tipo.
    tipo = db.Column(db.String(20), nullable=False)  # 'entrada' ou 'saida'

    __table_args__ = (
        db.UniqueConstraint("nome", "tipo", name="uq_categoria_nome_tipo"),
    )

    def __repr__(self):
        return f"<Categoria {self.nome}>"

    def to_dict(self):
        return {
            "id": self.id,
            "nome": self.nome,
            "tipo": self.tipo,
        }
