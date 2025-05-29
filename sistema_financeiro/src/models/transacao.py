from src.db import db
from datetime import datetime

class Transacao(db.Model):
    """
    Modelo para transações financeiras (entradas e saídas).
    """
    __tablename__ = 'transacoes'
    
    id = db.Column(db.Integer, primary_key=True)
    data = db.Column(db.Date, nullable=False, default=datetime.now().date)
    valor = db.Column(db.Float, nullable=False)
    descricao = db.Column(db.String(200), nullable=False)
    tipo = db.Column(db.String(20), nullable=False)  # 'entrada' ou 'saída'
    fixa = db.Column(db.Boolean, default=False)  # indica se é uma transação fixa ou variável
    
    # Relacionamento com categoria
    categoria_id = db.Column(db.Integer, db.ForeignKey('categorias.id'), nullable=False)
    categoria = db.relationship('Categoria', backref='transacoes')
    
    def __repr__(self):
        return f'<Transacao {self.descricao} - R${self.valor}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'data': self.data.strftime('%Y-%m-%d'),
            'valor': self.valor,
            'descricao': self.descricao,
            'tipo': self.tipo,
            'fixa': self.fixa,
            'categoria_id': self.categoria_id,
            'categoria_nome': self.categoria.nome if self.categoria else None
        }
