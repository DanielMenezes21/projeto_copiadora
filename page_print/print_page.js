// =========================
// CONFIGURAÇÕES
// =========================
const API_SERVER = "http://localhost:3000";

// =========================
// FUNÇÃO: Buscar pedido pelo código
// =========================
async function buscarPedido(codigo) {
    const res = await fetch(`${API_SERVER}/api/historic`);
    const lista = await res.json();

    const pedido = lista.find(item => item.codigo == codigo);

    if (!pedido) {
        throw new Error("Código não encontrado no histórico");
    }

    return pedido;
}

// =========================
// FUNÇÃO: Selecionar impressora automaticamente
// =========================
async function selecionarImpressoraPorPedido(pedido) {
    const res = await fetch(`${API_SERVER}/api/printers/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            colorido: pedido.configuracoes.cor === "colorido",
            tamanho: pedido.configuracoes.tamanho
        })
    });

    if (!res.ok) {
        const erro = await res.json();
        throw new Error(erro.error || "Erro ao selecionar impressora");
    }

    const dados = await res.json();
    return dados;
}

// =========================
// FUNÇÃO: Processar impressão
// =========================
async function processarImpressao() {
    const codigoInput = document.getElementById("codigoImpressao");
    const codigo = codigoInput.value.trim();

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
    const codigoInput = document.getElementById("codigoImpressao");

    if (btnImprimir) {
        btnImprimir.addEventListener("click", (event) => {
            event.preventDefault();
            processarImpressao();
        });
    }

    // Permitir Enter para imprimir
    if (codigoInput) {
        codigoInput.addEventListener("keypress", (event) => {
            if (event.key === "Enter") {
                processarImpressao();
            }
        });
    }
});
