from flask_sqlalchemy import SQLAlchemy

# Inicialização do SQLAlchemy
db = SQLAlchemy()

def init_db(app):
    """
    Inicializa o banco de dados e cria as tabelas.
    """
    db.init_app(app)
    
    with app.app_context():
        db.create_all()
        
        # Importar aqui para evitar importação circular
        from src.models.categoria import Categoria
        
        # Adiciona categorias padrão se não existirem
        if not Categoria.query.first():
            categorias_padrao = [
                # Categorias de entrada
                Categoria(nome="Salário", tipo="entrada"),
                Categoria(nome="Freelance", tipo="entrada"),
                Categoria(nome="Investimentos", tipo="entrada"),
                Categoria(nome="Outros Rendimentos", tipo="entrada"),
                
                # Categorias de saída
                Categoria(nome="Alimentação", tipo="saída"),
                Categoria(nome="Moradia", tipo="saída"),
                Categoria(nome="Transporte", tipo="saída"),
                Categoria(nome="Saúde", tipo="saída"),
                Categoria(nome="Educação", tipo="saída"),
                Categoria(nome="Lazer", tipo="saída"),
                Categoria(nome="Vestuário", tipo="saída"),
                Categoria(nome="Contas Fixas", tipo="saída"),
                Categoria(nome="Outros Gastos", tipo="saída")
            ]
            
            for categoria in categorias_padrao:
                db.session.add(categoria)
            
            db.session.commit()
