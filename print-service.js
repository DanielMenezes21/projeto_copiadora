const net = require("net");
const fs = require("fs");
const path = require("path");

/**
 * Envia um arquivo de impressão para uma impressora de rede via protocolo RAW
 * @param {string} ip - IP da impressora
 * @param {number} porta - Porta da impressora (geralmente 9100)
 * @param {Buffer} dados - Dados do arquivo a imprimir
 * @param {number} copias - Número de cópias
 * @returns {Promise} Resolve se sucesso, rejeita se erro
 */
function enviarParaImpressora(ip, porta, dados, copias = 1) {
    return new Promise((resolve, reject) => {
        const socket = new net.Socket();
        const timeout = 10000; // 10 segundos

        socket.setTimeout(timeout);

        // Repetir o dados para cada cópia
        let dadosCompletos = Buffer.alloc(0);
        for (let i = 0; i < copias; i++) {
            dadosCompletos = Buffer.concat([dadosCompletos, dados]);
        }

        socket.on("connect", () => {
            console.log(`✅ Conectado à impressora ${ip}:${porta}`);
            socket.write(dadosCompletos, (err) => {
                if (err) {
                    socket.destroy();
                    reject(new Error(`Erro ao enviar dados: ${err.message}`));
                } else {
                    console.log("✅ Dados enviados com sucesso");
                    socket.destroy();
                    resolve("Impressão enviada com sucesso");
                }
            });
        });

        socket.on("timeout", () => {
            socket.destroy();
            reject(new Error("Timeout: Impressora não respondeu"));
        });

        socket.on("error", (err) => {
            reject(new Error(`Erro de conexão: ${err.message}`));
        });

        socket.on("close", () => {
            console.log("✅ Conexão fechada");
        });

        socket.connect(porta, ip);
    });
}

/**
 * Lê um arquivo PDF e envia para impressora
 */
async function imprimirArquivo(ip, porta, caminhoArquivo, copias = 1) {
    try {
        // Verificar se arquivo existe
        if (!fs.existsSync(caminhoArquivo)) {
            throw new Error(`Arquivo não encontrado: ${caminhoArquivo}`);
        }

        // Ler arquivo
        const dados = fs.readFileSync(caminhoArquivo);
        console.log(`📄 Arquivo lido: ${caminhoArquivo} (${dados.length} bytes)`);

        // Enviar para impressora
        const resultado = await enviarParaImpressora(ip, porta, dados, copias);
        return resultado;
    } catch (erro) {
        throw new Error(`Erro ao imprimir: ${erro.message}`);
    }
}

module.exports = {
    enviarParaImpressora,
    imprimirArquivo
};
