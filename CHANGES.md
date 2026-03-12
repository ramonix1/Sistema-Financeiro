# Refatoração — Sistema Financeiro

## Bugs Corrigidos

### 🔴 Críticos (causavam falhas funcionais)

1. **Inconsistência `saida` vs `saída`** (causa raiz de vários bugs)
   - O modelo `Categoria` armazenava `tipo = 'saída'` (com acento)
   - As rotas de transação validavam contra `'saida'` (sem acento)
   - Resultado: a comparação `categoria.tipo != tipo` nunca era satisfeita corretamente, impedindo criar transações de saída com validação de categoria
   - **Fix:** padronizado para `'saida'` sem acento em todos os modelos, rotas e frontend

2. **Import circular** (`routes` importavam `db` de `src.main`)
   - `categorias.py`, `contas.py` e `transacoes.py` importavam `db` de `src.main`
   - Isso causava circular import quando `main.py` importava os blueprints
   - **Fix:** todas as rotas agora importam `db` de `src.db`

3. **`SECRET_KEY` regenerada a cada restart**
   - `app.config['SECRET_KEY'] = os.urandom(24)` era avaliado no import, gerando uma chave nova a cada vez o servidor reiniciava — invalidando todas as sessões
   - **Fix:** usa variável de ambiente `SECRET_KEY` com fallback fixo para desenvolvimento

4. **Data padrão de `Transacao` avaliada uma única vez no import**
   - `default=datetime.now().date` era avaliado no import do módulo, não na criação de cada objeto
   - Todas as transações sem data explícita recebiam a data do momento do primeiro import
   - **Fix:** `default=date.today` (callable, avaliado por instância)

5. **`resumo/mensal` não retornava breakdown por categoria**
   - `dashboard.js` e `relatorios.js` acessavam `resumo.categorias` que era `undefined`
   - O gráfico de categorias ficava em branco e jogava erros no console
   - **Fix:** `resumo_mensal()` agora inclui o campo `categorias` no JSON de resposta

6. **Parâmetro `?limit=5` ignorado no endpoint de transações**
   - O dashboard enviava `/api/transacoes/?limit=5` mas a rota ignorava o parâmetro, retornando todas as transações e depois sliceando no JS
   - **Fix:** o parâmetro `limit` é aplicado no nível da query SQL

7. **Aritmética de meses para contas fixas**
   - O código original calculava próxima data manualmente com lista de dias, podendo gerar datas inválidas (ex: 31/fev) e tinha bug em anos bissextos
   - **Fix:** usa `dateutil.relativedelta` para cálculo correto

8. **`setTimeout(300)` para selecionar categoria no modal de edição**
   - O código original usava um setTimeout frágil para aguardar o carregamento async das categorias antes de selecionar a categoria atual
   - **Fix:** categorias carregadas uma vez em `_todasCategorias` e filtradas sincronamente; seleção imediata

9. **Conversão de fuso horário em datas**
   - `new Date('2024-01-15')` interpreta como UTC, causando off-by-one em fusos UTC-3 e outros negativos
   - **Fix:** strings de data são parseadas manualmente (`split('-')`) em vez de passadas para `new Date()`

10. **`.query.get()` depreciado no SQLAlchemy 2**
    - **Fix:** substituído por `db.session.get(Model, id)` em todas as rotas

### 🟡 Médios (comportamento incorreto)

11. **Status de contas vencidas não atualizado automaticamente**
    - Contas passadas da data de vencimento ficavam com status `'pendente'` indefinidamente
    - **Fix:** `GET /api/contas/vencidas` atualiza para `'atrasada'` automaticamente

12. **`models/user.py` criava instância própria de SQLAlchemy**
    - O modelo `User` tinha seu próprio `db = SQLAlchemy()` em vez de importar de `src.db`, causando dois bancos separados
    - **Fix:** `User` removido (não estava integrado à aplicação; pode ser readicionado corretamente depois)

13. **Formulário de contas: botão "Pagar" ausente para contas atrasadas**
    - O JS só mostrava o botão de pagar para `status === 'pendente'`, não para `'atrasada'`
    - **Fix:** botão exibido para `pendente` e `atrasada`

### 🟢 Melhorias

- **Toasts substituem `alert()`**: substituídos todos os `alert()` e `confirm()` nativos por notificações toast não-bloqueantes
- **`async/await`**: todo o JavaScript convertido para `async/await` (mais legível, sem callback hell)
- **`URLSearchParams`**: construção de query strings usa `URLSearchParams` em vez de concatenação manual
- **Spinners de carregamento** nos estados de loading das tabelas
- **Handlers globais de erro** no Flask (404, 405, 500) retornam JSON em vez de HTML
- **Validação de valor positivo** nas rotas de transação e conta
- **`get_json(silent=True)`** em todas as rotas para evitar erro 400 não tratado
- **`db.session.flush()`** antes de `commit()` na rota `pagar_conta` para garantir `transacao.id` disponível
- **`pool_pre_ping`** habilitado para reconexão automática com o banco
- **CSS**: adicionados estilos de toast, melhorias de tipografia e hover states
- **`requirements.txt`**: adicionado `python-dateutil`, removida dependência de MySQL (opcional)
