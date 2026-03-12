import os
import sys
from flask import Flask, render_template

# Configuração do caminho do sistema
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Inicialização do aplicativo Flask
app = Flask(__name__, 
            static_folder='static',
            template_folder='static')
app.config['SECRET_KEY'] = os.urandom(24)

# Configuração do banco de dados
app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:///financeiro.db"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Importar e inicializar o banco de dados
from src.db import db, init_db

# Importação dos blueprints
from src.routes.categorias import categorias_bp
from src.routes.transacoes import transacoes_bp
from src.routes.contas import contas_bp

# Registro dos blueprints
app.register_blueprint(categorias_bp, url_prefix='/api/categorias')
app.register_blueprint(transacoes_bp, url_prefix='/api/transacoes')
app.register_blueprint(contas_bp, url_prefix='/api/contas')

# Blueprint para as rotas de visualização (frontend)
from flask import Blueprint
views_bp = Blueprint('views', __name__)

@views_bp.route('/')
def index():
    return render_template('index.html')

@views_bp.route('/transacoes')
def transacoes():
    return render_template('transacoes.html')

@views_bp.route('/contas')
def contas():
    return render_template('contas.html')

@views_bp.route('/relatorios')
def relatorios():
    return render_template('relatorios.html')

app.register_blueprint(views_bp)

if __name__ == '__main__':
    # Inicializar o banco de dados
    init_db(app)
    
    # Iniciar o servidor
    app.run(host='0.0.0.0', port=5000, debug=True)
