const fs = require("fs");
const path = require("path");
const net = require("net");

// Caminho do arquivo de configuração das impressoras
const PRINTERS_CONFIG_PATH = path.join(__dirname, "page_print", "printers.json");

/**
 * Carrega configuração das impressoras
 */
function carregarConfiguracaoImpressoras() {
    try {
        const dados = fs.readFileSync(PRINTERS_CONFIG_PATH, "utf-8");
        return JSON.parse(dados);
    } catch (err) {
        console.error("Erro ao carregar printers.json:", err);
        return null;
    }
}

/**
 * Salva configuração das impressoras
 */
function salvarConfiguracaoImpressoras(config) {
    try {
        fs.writeFileSync(PRINTERS_CONFIG_PATH, JSON.stringify(config, null, 2));
        return true;
    } catch (err) {
        console.error("Erro ao salvar printers.json:", err);
        return false;
    }
}

/**
 * Verifica se uma impressora está online (teste de conectividade)
 */
async function verificarStatusImpressora(ip, porta = 9100) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const timeout = 3000; // 3 segundos

        socket.setTimeout(timeout);

        socket.on("connect", () => {
            socket.destroy();
            resolve(true);
        });

        socket.on("timeout", () => {
            socket.destroy();
            resolve(false);
        });

        socket.on("error", () => {
            resolve(false);
        });

        socket.connect(porta, ip);
    });
}

/**
 * Atualiza o status de todas as impressoras
 */
async function atualizarStatusTodas() {
    const config = carregarConfiguracaoImpressoras();
    if (!config) return null;

    for (const impressora of config.impressoras) {
        const online = await verificarStatusImpressora(impressora.ip, impressora.puerto);
        impressora.status = online ? "online" : "offline";
    }

    salvarConfiguracaoImpressoras(config);
    return config;
}

/**
 * Seleciona a melhor impressora para um pedido
 * Critérios: compatibilidade com cor, tamanho e disponibilidade
 */
function selecionarMelhorImpressora(pedido) {
    const config = carregarConfiguracaoImpressoras();
    if (!config) return null;

    const candidatas = config.impressoras.filter((imp) => {
        // Verificar se está ativa e online
        if (!imp.ativa || imp.status !== "online") return false;

        // Verificar suporte a cores
        if (pedido.colorido && !imp.capacidades.colorido) return false;
        if (!pedido.colorido && !imp.capacidades.preto_branco) return false;

        // Verificar suporte ao tamanho
        if (!imp.capacidades.tamanhos.includes(pedido.tamanho)) return false;

        return true;
    });

    if (candidatas.length === 0) return null;

    // Priorizar por: 1) mais toner, 2) mais papel, 3) mais rápida
    candidatas.sort((a, b) => {
        if (a.toner_level !== b.toner_level) {
            return b.toner_level - a.toner_level;
        }
        if (a.papel_restante !== b.papel_restante) {
            return b.papel_restante - a.papel_restante;
        }
        return b.capacidades.velocidade_ppm - a.capacidades.velocidade_ppm;
    });

    return candidatas[0];
}

/**
 * Verifica compatibilidade entre pedido e impressora
 */
function verificarCompatibilidade(pedido, impressoraId) {
    const config = carregarConfiguracaoImpressoras();
    if (!config) return { compativel: false, motivo: "Erro ao carregar configuração" };

    const impressora = config.impressoras.find(imp => imp.id === parseInt(impressoraId));
    if (!impressora) {
        return { compativel: false, motivo: "Impressora não encontrada" };
    }

    if (!impressora.ativa) {
        return { compativel: false, motivo: "Impressora desativada" };
    }

    if (impressora.status !== "online") {
        return { compativel: false, motivo: "Impressora offline" };
    }

    // Validações de capacidade
    const erros = [];

    if (pedido.colorido && !impressora.capacidades.colorido) {
        erros.push("Impressora não suporta impressão colorida");
    }

    if (!pedido.colorido && !impressora.capacidades.preto_branco) {
        erros.push("Impressora não suporta impressão em preto e branco");
    }

    if (!impressora.capacidades.tamanhos.includes(pedido.tamanho)) {
        erros.push(`Tamanho ${pedido.tamanho} não suportado`);
    }

    if (erros.length > 0) {
        return { compativel: false, motivo: erros.join("; ") };
    }

    return { compativel: true, motivo: "Compatível" };
}

/**
 * Adiciona uma nova impressora
 */
function adicionarImpressora(novaImpressora) {
    const config = carregarConfiguracaoImpressoras();
    if (!config) return { sucesso: false, erro: "Erro ao carregar configuração" };

    const novoId = Math.max(...config.impressoras.map(imp => imp.id), 0) + 1;
    novaImpressora.id = novoId;

    config.impressoras.push(novaImpressora);

    if (salvarConfiguracaoImpressoras(config)) {
        return { sucesso: true, mensagem: "Impressora adicionada", impressora: novaImpressora };
    } else {
        return { sucesso: false, erro: "Erro ao salvar configuração" };
    }
}

/**
 * Atualiza uma impressora existente
 */
function atualizarImpressora(impressoraId, dadosAtualizacao) {
    const config = carregarConfiguracaoImpressoras();
    if (!config) return { sucesso: false, erro: "Erro ao carregar configuração" };

    const impressora = config.impressoras.find(imp => imp.id === parseInt(impressoraId));
    if (!impressora) {
        return { sucesso: false, erro: "Impressora não encontrada" };
    }

    Object.assign(impressora, dadosAtualizacao);

    if (salvarConfiguracaoImpressoras(config)) {
        return { sucesso: true, mensagem: "Impressora atualizada", impressora };
    } else {
        return { sucesso: false, erro: "Erro ao salvar configuração" };
    }
}

/**
 * Remove uma impressora
 */
function removerImpressora(impressoraId) {
    const config = carregarConfiguracaoImpressoras();
    if (!config) return { sucesso: false, erro: "Erro ao carregar configuração" };

    const indice = config.impressoras.findIndex(imp => imp.id === parseInt(impressoraId));
    if (indice === -1) {
        return { sucesso: false, erro: "Impressora não encontrada" };
    }

    const removida = config.impressoras.splice(indice, 1)[0];

    if (salvarConfiguracaoImpressoras(config)) {
        return { sucesso: true, mensagem: "Impressora removida", impressora: removida };
    } else {
        return { sucesso: false, erro: "Erro ao salvar configuração" };
    }
}

/**
 * Obtém relatório de status de todas as impressoras
 */
function obterRelatorioPrinters() {
    const config = carregarConfiguracaoImpressoras();
    if (!config) return null;

    return config.impressoras.map(imp => ({
        id: imp.id,
        nome: imp.nome,
        modelo: imp.modelo,
        status: imp.status,
        ativa: imp.ativa,
        toner_level: imp.toner_level,
        papel_restante: imp.papel_restante,
        capacidades: imp.capacidades
    }));
}

// Exportar funções
module.exports = {
    carregarConfiguracaoImpressoras,
    salvarConfiguracaoImpressoras,
    verificarStatusImpressora,
    atualizarStatusTodas,
    selecionarMelhorImpressora,
    verificarCompatibilidade,
    adicionarImpressora,
    atualizarImpressora,
    removerImpressora,
    obterRelatorioPrinters
};
