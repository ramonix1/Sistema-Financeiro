from src.main import db

# Não importar os blueprints aqui para evitar importação circular
# Os blueprints serão importados diretamente no main.py

# Esta função será chamada pelo main.py após a inicialização do app
def register_blueprints(app):
    pass  # Esta função não é mais necessária, mantida apenas para compatibilidade
