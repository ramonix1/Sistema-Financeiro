from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def init_db(app):
    """Inicializa o banco de dados e cria as tabelas com dados padrão."""
    db.init_app(app)

    with app.app_context():
        from src.models.categoria import Categoria
        from src.models.conta import Conta
        from src.models.transacao import Transacao

        db.create_all()

        if Categoria.query.count() == 0:
            categorias_padrao = [
                Categoria(nome="Salário", tipo="entrada"),
                Categoria(nome="Freelance", tipo="entrada"),
                Categoria(nome="Investimentos", tipo="entrada"),
                Categoria(nome="Outros Rendimentos", tipo="entrada"),
                Categoria(nome="Alimentação", tipo="saida"),
                Categoria(nome="Moradia", tipo="saida"),
                Categoria(nome="Transporte", tipo="saida"),
                Categoria(nome="Saúde", tipo="saida"),
                Categoria(nome="Educação", tipo="saida"),
                Categoria(nome="Lazer", tipo="saida"),
                Categoria(nome="Vestuário", tipo="saida"),
                Categoria(nome="Contas Fixas", tipo="saida"),
                Categoria(nome="Outros Gastos", tipo="saida"),
            ]
            db.session.bulk_save_objects(categorias_padrao)
            db.session.commit()
