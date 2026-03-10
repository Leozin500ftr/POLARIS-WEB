/* ============================================================
   POLARIS — LOGGER DE ATIVIDADES v2
   ============================================================ */
(function () {
    const STORAGE_KEY = 'polaris_logs';
    const MAX_LOGS    = 500;

    function log(categoria, acao, detalhes) {
        const usuario = localStorage.getItem('usuarioLogado') || 'anônimo';
        const entrada = {
            id:       Date.now() + '_' + Math.floor(Math.random() * 9999),
            ts:       Date.now(),
            usuario,
            categoria,
            acao,
            detalhes: detalhes || '',
            pagina:   window.location.pathname.split('/').pop() || 'index.html'
        };
        let logs = [];
        try { logs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(e) {}
        logs.unshift(entrada);
        if (logs.length > MAX_LOGS) logs = logs.slice(0, MAX_LOGS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    }
    window.PolarisLog = { log };

    function wrap(nome, fn) {
        if (typeof window[nome] !== 'function') return;
        const original = window[nome];
        window[nome] = function() {
            return fn.call(this, original, arguments);
        };
    }

    // LOGIN
    wrap('login', function(original, args) {
        const usuarioInput = (document.getElementById('usuario') || {}).value || '';
        const logadoBefore = localStorage.getItem('usuarioLogado');
        original.apply(this, args);
        setTimeout(function() {
            const logadoAfter = localStorage.getItem('usuarioLogado');
            if (!logadoBefore && logadoAfter) {
                log('auth', 'Login realizado com sucesso', 'Usuário: ' + logadoAfter);
            } else if (!logadoAfter) {
                log('erro', 'Tentativa de login falhou', 'Usuário: ' + usuarioInput.trim().toLowerCase());
            }
        }, 0);
    });

    // CRIAR USUÁRIO (cadastro.html)
    wrap('criarUsuario', function(original, args) {
        const nomeInput  = (document.getElementById('novoUsuario') || {}).value || '';
        const emailInput = (document.getElementById('novoEmail') || {}).value || '';
        const antes = (JSON.parse(localStorage.getItem('usuarios') || '[]')).length;
        original.apply(this, args);
        setTimeout(function() {
            const depois = (JSON.parse(localStorage.getItem('usuarios') || '[]')).length;
            if (depois > antes) {
                log('auth', 'Novo usuário cadastrado', 'Usuário: ' + nomeInput.trim().toLowerCase() + ' | E-mail: ' + emailInput.trim());
            } else {
                log('erro', 'Tentativa de cadastro falhou', 'Usuário: ' + nomeInput.trim().toLowerCase());
            }
        }, 0);
    });

    // LOGOUT
    wrap('logout', function(original, args) {
        const u = localStorage.getItem('usuarioLogado') || '?';
        log('auth', 'Logout realizado', 'Usuário: ' + u);
        original.apply(this, args);
    });

    // CADASTRAR (clientes, produtos, serviços)
    wrap('cadastrar', function(original, args) {
        const tipo  = args[0];
        const chave = 'polaris_' + tipo;
        const antes = (JSON.parse(localStorage.getItem(chave) || '[]')).length;
        original.apply(this, args);
        setTimeout(function() {
            const depois = JSON.parse(localStorage.getItem(chave) || '[]');
            if (depois.length > antes) {
                const novo = depois[depois.length - 1];
                const nome = novo.nome || novo.cliente || novo.produto || ('ID ' + novo.id);
                const singular = { clientes:'Cliente', produtos:'Produto', servicos:'Serviço' };
                log('cadastro', (singular[tipo] || tipo) + ' cadastrado', 'Nome: ' + nome);
            }
        }, 0);
    });

    // PEDIDO VINCULADO
    wrap('cadastrarPedidoVinculado', function(original, args) {
        const antes = (JSON.parse(localStorage.getItem('polaris_pedidos') || '[]')).length;
        original.apply(this, args);
        setTimeout(function() {
            const depois = JSON.parse(localStorage.getItem('polaris_pedidos') || '[]');
            if (depois.length > antes) {
                const novo = depois[depois.length - 1];
                log('pedido', 'Pedido registrado',
                    'Cliente: ' + (novo.cliente||'?') + ' | Produto: ' + (novo.produto||'?') +
                    ' | Valor: R$ ' + parseFloat(novo.valor||0).toFixed(2) + ' | Status: ' + (novo.status||'?'));
            }
        }, 0);
    });

    // EXCLUIR ITEM
    wrap('excluirItem', function(original, args) {
        const tipo  = args[0];
        const id    = args[1];
        const lista = JSON.parse(localStorage.getItem('polaris_' + tipo) || '[]');
        const item  = lista.find(function(r){ return String(r.id) === String(id); });
        const nome  = item ? (item.nome || item.cliente || item.produto || ('ID '+id)) : ('ID '+id);
        const singular = { clientes:'Cliente', produtos:'Produto', servicos:'Serviço', pedidos:'Pedido' };
        original.apply(this, args);
        log('exclusao', (singular[tipo]||tipo) + ' excluído', 'Nome: ' + nome);
    });

    // SALVAR EDIÇÃO
    wrap('salvarEdicao', function(original, args) {
        const tipo  = args[0];
        const id    = window._editandoId;
        const lista = JSON.parse(localStorage.getItem('polaris_' + tipo) || '[]');
        const item  = lista.find(function(r){ return String(r.id) === String(id); });
        const nome  = item ? (item.nome || item.cliente || item.produto || ('ID '+id)) : ('ID '+id);
        const singular = { clientes:'Cliente', produtos:'Produto', servicos:'Serviço', pedidos:'Pedido' };
        original.apply(this, args);
        log('edicao', (singular[tipo]||tipo) + ' editado', 'Nome: ' + nome);
    });

    // ALTERAR NOME
    wrap('alterarNome', function(original, args) {
        const nomeAtual = localStorage.getItem('usuarioLogado') || '?';
        original.apply(this, args);
        setTimeout(function() {
            const nomeAgora = localStorage.getItem('usuarioLogado') || '';
            if (nomeAgora && nomeAgora !== nomeAtual) {
                log('config', 'Nome de usuário alterado', 'De: ' + nomeAtual + ' → Para: ' + nomeAgora);
            }
        }, 0);
    });

    // ALTERAR SENHA
    wrap('alterarSenha', function(original, args) {
        const u = localStorage.getItem('usuarioLogado') || '?';
        const snapshot = localStorage.getItem('usuarios');
        original.apply(this, args);
        setTimeout(function() {
            if (localStorage.getItem('usuarios') !== snapshot) {
                log('config', 'Senha alterada', 'Usuário: ' + u);
            }
        }, 0);
    });

    // EXCLUIR CONTA
    wrap('excluirConta', function(original, args) {
        const u = localStorage.getItem('usuarioLogado') || '?';
        log('auth', 'Conta excluída', 'Usuário: ' + u);
        original.apply(this, args);
    });

    // DARK MODE
    wrap('alternarModo', function(original, args) {
        const before = localStorage.getItem('modo') || 'light';
        original.apply(this, args);
        const after = localStorage.getItem('modo') || 'light';
        if (before !== after) {
            log('sistema', 'Modo visual alterado', after === 'dark' ? 'Ativado: Modo Escuro' : 'Ativado: Modo Claro');
        }
    });

    // ESTOQUE
    wrap('alterarEstoque', function(original, args) {
        const produtoId = args[0];
        const delta     = args[1];
        const produtos  = JSON.parse(localStorage.getItem('polaris_produtos') || '[]');
        const prod      = produtos.find(function(p){ return String(p.id) === String(produtoId); });
        const nome      = prod ? prod.nome : ('ID ' + produtoId);
        const antes     = prod ? (parseInt(prod.estoque)||0) : '?';
        original.apply(this, args);
        if (delta !== 0) {
            const prodDepois = (JSON.parse(localStorage.getItem('polaris_produtos') || '[]'))
                .find(function(p){ return String(p.id) === String(produtoId); });
            const depois = prodDepois ? (parseInt(prodDepois.estoque)||0) : '?';
            log('estoque', 'Estoque ' + (delta < 0 ? 'reduzido (venda)' : 'reposto'),
                'Produto: ' + nome + ' | Antes: ' + antes + ' → Depois: ' + depois);
        }
    });

    // CADASTRAR CATEGORIA
    wrap('cadastrarCategoria', function(original, args) {
        const nome  = (document.getElementById('cat-nome') || {}).value || '';
        const antes = (JSON.parse(localStorage.getItem('polaris_categorias') || '[]')).length;
        original.apply(this, args);
        setTimeout(function() {
            const depois = (JSON.parse(localStorage.getItem('polaris_categorias') || '[]')).length;
            if (depois > antes) { log('cadastro', 'Categoria criada', 'Nome: ' + nome.trim()); }
        }, 0);
    });

    // EXCLUIR CATEGORIA
    wrap('excluirCategoria', function(original, args) {
        const id   = args[0];
        const cats = JSON.parse(localStorage.getItem('polaris_categorias') || '[]');
        const cat  = cats.find(function(c){ return String(c.id) === String(id); });
        original.apply(this, args);
        log('exclusao', 'Categoria excluída', 'Nome: ' + (cat ? cat.nome : ('ID '+id)));
    });

    // TROCAR USUÁRIO
    wrap('trocarUsuario', function(original, args) {
        const destino = args[0];
        const atual   = localStorage.getItem('usuarioLogado') || '?';
        log('auth', 'Troca de usuário iniciada', 'De: ' + atual + ' → Para: ' + destino);
        original.apply(this, args);
    });

    // PÁGINA ACESSADA
    var pagina = window.location.pathname.split('/').pop() || 'index.html';
    var nomePaginas = {
        'index.html':    'Tela de Login',
        'home.html':     'Dashboard',
        'cadastro.html': 'Cadastro de Usuário',
        'log.html':      'Visualizador de Logs'
    };
    function registrarPagina() {
        log('sistema', 'Página acessada', nomePaginas[pagina] || pagina);
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', registrarPagina);
    } else {
        registrarPagina();
    }

})();
