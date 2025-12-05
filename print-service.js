const net = require("net");
const fs = require("fs");
const path = require("path");

/**
 * Envia um arquivo de impressão para uma impressora de rede via protocolo RAW
 * @param {string} ip - IP da impressora
 * @param {number} porta - Porta da impressora (geralmente 9100)
 * @param {Buffer} dados - Dados do arquivo a imprimir
 * @param {number} copias - Número de cópias
 * @param {boolean} frenteVerso - Se true, imprime frente e verso (duplex)
 * @returns {Promise} Resolve se sucesso, rejeita se erro
 */
function enviarParaImpressora(ip, porta, dados, copias = 1, frenteVerso = false) {
    return new Promise((resolve, reject) => {
        const socket = new net.Socket();
        const timeout = 10000; // 10 segundos

        socket.setTimeout(timeout);

        // Comando PCL para configurar duplex (frente/verso)
        // ESC & l 1 S = frente/verso (long edge)
        // ESC & l 0 S = frente/verso (short edge)
        const duplexCommand = frenteVerso ? Buffer.from('\x1B&l1S') : Buffer.alloc(0);

        // Repetir o dados para cada cópia
        let dadosCompletos = Buffer.alloc(0);
        
        // Enviar comando de duplex uma vez no início
        if (frenteVerso) {
            dadosCompletos = Buffer.concat([dadosCompletos, duplexCommand]);
        }
        
        for (let i = 0; i < copias; i++) {
            dadosCompletos = Buffer.concat([dadosCompletos, dados]);
        }

        socket.on("connect", () => {
            console.log(`✅ Conectado à impressora ${ip}:${porta}`);
            if (frenteVerso) {
                console.log("📄 Modo: FRENTE/VERSO (Duplex)");
            }
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
async function imprimirArquivo(ip, porta, caminhoArquivo, copias = 1, frenteVerso = false) {
    try {
        // Verificar se arquivo existe
        if (!fs.existsSync(caminhoArquivo)) {
            throw new Error(`Arquivo não encontrado: ${caminhoArquivo}`);
        }

        // Ler arquivo
        const dados = fs.readFileSync(caminhoArquivo);
        console.log(`📄 Arquivo lido: ${caminhoArquivo} (${dados.length} bytes)`);

        // Enviar para impressora
        const resultado = await enviarParaImpressora(ip, porta, dados, copias, frenteVerso);
        return resultado;
    } catch (erro) {
        throw new Error(`Erro ao imprimir: ${erro.message}`);
    }
}

module.exports = {
    enviarParaImpressora,
    imprimirArquivo
};
