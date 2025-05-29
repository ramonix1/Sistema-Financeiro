from src.db import db

class Categoria(db.Model):
    """
    Modelo para categorias de transações financeiras.
    Exemplos: Alimentação, Transporte, Salário, etc.
    """
    __tablename__ = 'categorias'
    
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    tipo = db.Column(db.String(20), nullable=False)  # 'entrada' ou 'saída'
    
    def __repr__(self):
        return f'<Categoria {self.nome}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'tipo': self.tipo
        }
