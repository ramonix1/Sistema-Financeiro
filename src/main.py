import os
from flask import Flask, render_template, jsonify
from src.db import db, init_db


def create_app():
    app = Flask(__name__, static_folder="static", template_folder="static")

    # BUG FIX: os.urandom(24) gera nova chave a cada restart, invalidando sessões.
    # Agora usa variável de ambiente com fallback seguro para desenvolvimento.
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-mude-em-producao-123!")
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
        "DATABASE_URL", "sqlite:///financeiro.db"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_pre_ping": True,  # verifica conexão antes de usar
    }

    # BUG FIX: importações movidas para dentro do factory para evitar imports circulares
    from src.routes.categorias import categorias_bp
    from src.routes.transacoes import transacoes_bp
    from src.routes.contas import contas_bp

    app.register_blueprint(categorias_bp, url_prefix="/api/categorias")
    app.register_blueprint(transacoes_bp, url_prefix="/api/transacoes")
    app.register_blueprint(contas_bp, url_prefix="/api/contas")

    # Rotas de views
    from flask import Blueprint

    views_bp = Blueprint("views", __name__)

    @views_bp.route("/")
    def index():
        return render_template("index.html")

    @views_bp.route("/transacoes")
    def transacoes():
        return render_template("transacoes.html")

    @views_bp.route("/contas")
    def contas():
        return render_template("contas.html")

    @views_bp.route("/relatorios")
    def relatorios():
        return render_template("relatorios.html")

    app.register_blueprint(views_bp)

    # Handler global de erros JSON
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"status": "error", "message": "Recurso não encontrado"}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"status": "error", "message": "Método não permitido"}), 405

    @app.errorhandler(500)
    def internal_error(e):
        db.session.rollback()
        return jsonify({"status": "error", "message": "Erro interno do servidor"}), 500

    init_db(app)
    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
