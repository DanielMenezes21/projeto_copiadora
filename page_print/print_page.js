// =========================
// CONFIGURAÇÕES
// =========================
const API_SERVER = "https://projeto-copiadora.onrender.com"; // Sempre tenta o remoto primeiro
const API_SERVER_LOCAL = "http://localhost:3000";

// =========================
// FUNÇÃO: Buscar pedido pelo código
// =========================
async function buscarPedido(codigo) {
    let lista = [];
    console.log('[LOG] buscarPedido: Iniciando busca do pedido', codigo);
    // Tenta buscar no Render
    try {
        console.log('[LOG] buscarPedido: Buscando no Render...');
        const res = await fetch("https://projeto-copiadora.onrender.com/api/historic");
        lista = await res.json();
        console.log('[LOG] buscarPedido: Sucesso Render, itens:', lista.length);
    } catch (e) {
        console.warn('[LOG] buscarPedido: Falha Render, tentando localhost...');
        try {
            const resLocal = await fetch("http://localhost:3000/api/historic");
            lista = await resLocal.json();
            console.log('[LOG] buscarPedido: Sucesso Localhost, itens:', lista.length);
        } catch (err) {
            console.error('[LOG] buscarPedido: Falha Localhost', err);
            throw new Error("Não foi possível buscar pedidos no servidor.");
        }
    }
    const pedido = lista.find(item => item.codigo == codigo);
    if (!pedido) {
        console.warn('[LOG] buscarPedido: Código não encontrado', codigo);
        throw new Error("Código não encontrado no histórico");
    }
    console.log('[LOG] buscarPedido: Pedido encontrado', pedido);
    return pedido;
}

// =========================
// FUNÇÃO: Selecionar impressora automaticamente
// =========================
async function selecionarImpressoraPorPedido(pedido) {
    console.log('[LOG] selecionarImpressoraPorPedido: Enviando pedido para seleção', pedido);
    let res, erro;
    // Tenta no servidor remoto
    try {
        res = await fetch(`${API_SERVER}/api/printers/select`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                colorido: pedido.configuracoes.cor === "colorido",
                tamanho: pedido.configuracoes.tamanho
            })
        });
        if (!res.ok) throw new Error('Remote server error');
    } catch (e) {
        console.warn('[LOG] selecionarImpressoraPorPedido: Falha no remoto, tentando localhost...');
        try {
            res = await fetch(`${API_SERVER_LOCAL}/api/printers/select`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    colorido: pedido.configuracoes.cor === "colorido",
                    tamanho: pedido.configuracoes.tamanho
                })
            });
            if (!res.ok) throw new Error('Localhost error');
        } catch (err) {
            erro = err;
        }
    }
    if (!res || !res.ok) {
        erro = erro || (await res.json());
        console.error('[LOG] selecionarImpressoraPorPedido: Erro', erro);
        throw new Error(erro.error || erro.message || "Erro ao selecionar impressora");
    }
    const dados = await res.json();
    console.log('[LOG] selecionarImpressoraPorPedido: Impressora selecionada', dados);
    return dados;
}

// =========================
// FUNÇÃO: Enviar para impressora
// =========================
async function enviarParaImpressora(impressoraId, documento, copias) {
    console.log('[LOG] enviarParaImpressora: Enviando para impressora', { impressoraId, documento, copias });
    let res, erro;
    // Tenta no servidor remoto
    try {
        res = await fetch(`${API_SERVER}/api/print`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                impressoraId: impressoraId,
                documento: documento,
                copias: copias
            })
        });
        if (!res.ok) throw new Error('Remote server error');
    } catch (e) {
        console.warn('[LOG] enviarParaImpressora: Falha no remoto, tentando localhost...');
        try {
            res = await fetch(`${API_SERVER_LOCAL}/api/print`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    impressoraId: impressoraId,
                    documento: documento,
                    copias: copias
                })
            });
            if (!res.ok) throw new Error('Localhost error');
        } catch (err) {
            erro = err;
        }
    }
    if (!res || !res.ok) {
        erro = erro || (await res.json());
        console.error('[LOG] enviarParaImpressora: Erro', erro);
        throw new Error(erro.error || erro.message || "Erro ao enviar para impressora");
    }
    const dados = await res.json();
    console.log('[LOG] enviarParaImpressora: Resposta', dados);
    return dados;
}

// =========================
// FUNÇÃO: Processar impressão
// =========================
async function processarImpressao() {
    const codigoInput = document.getElementById("codigoImpressao");
    const codigo = codigoInput.value.trim();

    console.log('[LOG] processarImpressao: Início', { codigo });
    if (!codigo) {
        alert("❌ Por favor, insira um código de impressão");
        codigoInput.focus();
        return;
    }

    try {
        console.log("📋 Buscando pedido...");
        const pedido = await buscarPedido(codigo);

        console.log("🖨️ Selecionando impressora compatível...");
        const resultado = await selecionarImpressoraPorPedido(pedido);

        if (!resultado.detalhes) {
            console.warn('[LOG] processarImpressao: Falha ao selecionar impressora', resultado);
            alert("❌ Erro ao selecionar impressora");
            return;
        }

        const impressora = resultado.detalhes;
        const detalhes = `
📍 Impressora: ${impressora.nome}
📊 Modelo: ${impressora.modelo}
🔋 Toner: ${impressora.toner_level}%
📄 Papel: ${impressora.papel_restante}%
⚡ Velocidade: ${impressora.capacidades.velocidade_ppm} PPM

Configurações do Pedido:
• Cor: ${pedido.configuracoes.cor}
• Tamanho: ${pedido.configuracoes.tamanho.toUpperCase()}
• Cópias: ${pedido.configuracoes.copias}
`;

        alert("✅ Pedido selecionado para impressão!\n" + detalhes);

        // Enviar para impressora
        console.log("📤 Enviando para impressora...");
        const resultadoImpressao = await enviarParaImpressora(
            impressora.id,
            pedido.documento,
            pedido.configuracoes.copias
        );

        console.log('[LOG] processarImpressao: Impressão enviada', resultadoImpressao);
        alert("✅ " + resultadoImpressao.mensagem);

        // Limpar campo e manter foco
        codigoInput.value = "";
        codigoInput.focus();

    } catch (err) {
        console.error("❌ Erro:", err);
        alert("❌ Erro: " + err.message);
        codigoInput.focus();
    }
}

// =========================
// EVENTO: DOMContentLoaded
// =========================
document.addEventListener("DOMContentLoaded", () => {
    const btnImprimir = document.getElementById("btnImprimir");
    const btnBuscar = document.getElementById("btnBuscar");
    const codigoInput = document.getElementById("codigoImpressao");
    const conteudoPedido = document.getElementById("conteudoPedido");
    const orderDetails = document.getElementById("orderDetails");
    const loadingState = document.getElementById("loadingState");
    const emptyState = conteudoPedido.querySelector('.empty-state');

    // Função para exibir dados do pedido
    async function buscarEDisplayPedido() {
        const codigo = codigoInput.value.trim();
        if (!codigo) {
            alert("❌ Por favor, insira um código de impressão");
            codigoInput.focus();
            return;
        }
        // Mostra loading
        if (loadingState) loadingState.style.display = 'flex';
        if (orderDetails) orderDetails.style.display = 'none';
        if (emptyState) emptyState.style.display = 'none';
        try {
            const pedido = await buscarPedido(codigo);
            // Monta HTML dos detalhes
            const html = `
                <div class="order-header">
                    <div class="order-info">
                        <h3>Pedido: ${pedido.codigo}</h3>
                        <div class="order-meta">
                            <span><strong>Data:</strong> ${new Date(pedido.datetime).toLocaleString()}</span>
                            <span><strong>Arquivo:</strong> ${pedido.documento}</span>
                        </div>
                    </div>
                </div>
                <div class="order-details-grid">
                    <div class="detail-item"><div class="detail-header">Valor</div><div class="detail-value">R$ ${pedido.valor.toFixed(2)}</div></div>
                    <div class="detail-item"><div class="detail-header">Cópias</div><div class="detail-value">${pedido.configuracoes.copias}</div></div>
                    <div class="detail-item"><div class="detail-header">Cor</div><div class="detail-value">${pedido.configuracoes.cor === 'colorido' ? 'Colorido' : 'Preto e Branco'}</div></div>
                    <div class="detail-item"><div class="detail-header">Tamanho</div><div class="detail-value">${pedido.configuracoes.tamanho.toUpperCase()}</div></div>
                    <div class="detail-item"><div class="detail-header">Páginas</div><div class="detail-value">${pedido.configuracoes.paginas}</div></div>
                    <div class="detail-item"><div class="detail-header">Frente/Verso</div><div class="detail-value">${pedido.configuracoes.frenteVerso ? 'Sim' : 'Não'}</div></div>
                    <div class="detail-item"><div class="detail-header">Orientação</div><div class="detail-value">${pedido.configuracoes.orientacao === 'paisagem' ? 'Paisagem' : 'Retrato'}</div></div>
                </div>
            `;
            orderDetails.innerHTML = html;
            orderDetails.style.display = 'block';
            // Habilita o botão de imprimir
            if (btnImprimir) btnImprimir.disabled = false;
        } catch (err) {
            orderDetails.innerHTML = '';
            if (emptyState) {
                emptyState.style.display = 'block';
                emptyState.querySelector('h3').textContent = 'Pedido não encontrado';
                emptyState.querySelector('p').textContent = 'Verifique o código digitado.';
            }
            // Desabilita o botão de imprimir
            if (btnImprimir) btnImprimir.disabled = true;
        } finally {
            if (loadingState) loadingState.style.display = 'none';
        }
    }

    if (btnBuscar) {
        btnBuscar.addEventListener("click", (event) => {
            event.preventDefault();
            buscarEDisplayPedido();
        });
    }

    // Permitir Enter para buscar
    if (codigoInput) {
        codigoInput.addEventListener("keypress", (event) => {
            if (event.key === "Enter") {
                buscarEDisplayPedido();
            }
        });
    }

    // Imprimir continua igual
    if (btnImprimir) {
        btnImprimir.addEventListener("click", (event) => {
            event.preventDefault();
            processarImpressao();
        });
    }
});
