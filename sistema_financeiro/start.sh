#!/bin/bash

echo "🚀 Iniciando sistema financeiro..."

# Instalar venv caso não exista
if [ ! -d "venv" ]; then
    echo "📦 Criando ambiente virtual..."
    python3 -m venv venv
fi

# Ativar ambiente
echo "🔧 Ativando ambiente virtual..."
source venv/bin/activate

# Instalar dependências
echo "📚 Instalando dependências..."
pip install flask flask_sqlalchemy pymysql

# Entrar na pasta do sistema
cd src

# Iniciar servidor
echo "🌐 Iniciando servidor..."
python main.py
