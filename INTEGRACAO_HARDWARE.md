# 🔌 Integração com Hardware Real - Exemplos

Este arquivo mostra como integrar com impressoras físicas reais em diferentes plataformas.

---

## 📋 Índice

1. [Linux (CUPS)](#linux-cups)
2. [Windows (Print Spooler)](#windows-print-spooler)
3. [Impressoras com API REST](#impressoras-com-api-rest)
4. [Monitoramento de Recursos](#monitoramento-de-recursos)

---

## Linux (CUPS)

### Instalação
```bash
# Debian/Ubuntu
sudo apt-get install cups lpadmin

# RHEL/CentOS
sudo yum install cups

# Iniciar CUPS
sudo service cups start
```

### Integração Node.js

#### Arquivo: `printer-hardware.js`

```javascript
const { execSync } = require('child_process');
const fs = require('fs');

/**
 * Listar todas as impressoras disponíveis (CUPS)
 */
function listarImpressorasCUPS() {
    try {
        const output = execSync('lpstat -p -d', { encoding: 'utf-8' });
        const linhas = output.split('\n');
        
        return linhas
            .filter(linha => linha.startsWith('printer'))
            .map(linha => {
                const match = linha.match(/printer (\S+)/);
                return match ? match[1] : null;
            })
            .filter(Boolean);
    } catch (err) {
        console.error("Erro ao listar impressoras CUPS:", err);
        return [];
    }
}

/**
 * Obter status de uma impressora (CUPS)
 */
function obterStatusImpressoraCUPS(nomePrinter) {
    try {
        const output = execSync(`lpstat -l -p ${nomePrinter}`, { encoding: 'utf-8' });
        
        return {
            nome: nomePrinter,
            ativa: output.includes('is idle'),
            ocupada: output.includes('processing')
        };
    } catch (err) {
        console.error(`Erro ao obter status de ${nomePrinter}:`, err);
        return { nome: nomePrinter, ativa: false, ocupada: false };
    }
}

/**
 * Enviar arquivo para impressão (CUPS)
 */
function imprimirCUPS(arquivo, nomePrinter, opcoes = {}) {
    try {
        const {
            copias = 1,
            lado = '-o sides=two-sided-long-edge',  // ou one-sided
            cores = '-o ColorModel=RGB'              // ou Gray
        } = opcoes;

        const comando = `lp -d ${nomePrinter} -n ${copias} ${lado} ${cores} "${arquivo}"`;
        
        const resultado = execSync(comando, { encoding: 'utf-8' });
        
        return {
            sucesso: true,
            mensagem: resultado.trim(),
            arquivo: arquivo,
            impressora: nomePrinter
        };
    } catch (err) {
        console.error("Erro ao imprimir:", err);
        return {
            sucesso: false,
            erro: err.message,
            arquivo: arquivo,
            impressora: nomePrinter
        };
    }
}

/**
 * Cancelar trabalho de impressão
 */
function cancelarTrabalho(jobId) {
    try {
        execSync(`cancel ${jobId}`);
        return { sucesso: true, mensagem: `Trabalho ${jobId} cancelado` };
    } catch (err) {
        return { sucesso: false, erro: err.message };
    }
}

/**
 * Obter informações de toner/papel (via SNMP - requer snmp-utils)
 */
function obterInformacoesToner(ipPrinter) {
    try {
        // Requer: sudo apt-get install snmp
        const toner = execSync(`snmpget -v 2c -c public ${ipPrinter} 1.3.6.1.2.1.43.11.1.1.9.1.1`, 
                             { encoding: 'utf-8' });
        
        return parseInt(toner.match(/(\d+)/)[1]) || 0;
    } catch (err) {
        console.error("Erro ao obter toner via SNMP:", err);
        return null;
    }
}

module.exports = {
    listarImpressorasCUPS,
    obterStatusImpressoraCUPS,
    imprimirCUPS,
    cancelarTrabalho,
    obterInformacoesToner
};
```

#### Uso em server.js

```javascript
const printerHardware = require('./printer-hardware');

// Sincronizar impressoras CUPS com printers.json
app.post("/api/sync-cups-printers", (req, res) => {
    try {
        const impressorasCUPS = printerHardware.listarImpressorasCUPS();
        const config = printerManager.carregarConfiguracaoImpressoras();
        
        // Atualizar status de todas
        for (const impressora of config.impressoras) {
            const status = printerHardware.obterStatusImpressoraCUPS(impressora.nome);
            impressora.status = status.ativa ? "online" : "offline";
        }
        
        printerManager.salvarConfiguracaoImpressoras(config);
        
        res.json({
            mensagem: "Sincronizado com CUPS",
            impressoras: config.impressoras
        });
    } catch (err) {
        console.error("Erro ao sincronizar CUPS:", err);
        res.status(500).json({ error: "Erro ao sincronizar" });
    }
});

// Enviar para impressão real
app.post("/api/print-job", (req, res) => {
    try {
        const { codigo, impressora_id, arquivo } = req.body;
        
        const config = printerManager.carregarConfiguracaoImpressoras();
        const impressora = config.impressoras.find(imp => imp.id === impressora_id);
        
        if (!impressora) {
            return res.status(404).json({ error: "Impressora não encontrada" });
        }
        
        // Imprimir
        const resultado = printerHardware.imprimirCUPS(arquivo, impressora.nome, {
            copias: 1,
            lado: '-o sides=two-sided-long-edge',
            cores: '-o ColorModel=RGB'
        });
        
        res.json(resultado);
    } catch (err) {
        console.error("Erro ao enviar para impressão:", err);
        res.status(500).json({ error: err.message });
    }
});
```

---

## Windows (Print Spooler)

### Integração Node.js

#### Arquivo: `printer-hardware-windows.js`

```javascript
const { execSync } = require('child_process');
const { iconv } = require('iconv-lite');

/**
 * Listar todas as impressoras (Windows)
 */
function listarImpressorasWindows() {
    try {
        const output = execSync('wmic logicalprinter list brief', { encoding: 'utf-8' });
        const linhas = output.split('\n');
        
        return linhas
            .slice(1)  // Pular cabeçalho
            .map(linha => linha.trim().split(/\s+/)[0])
            .filter(nome => nome && nome !== 'Name');
    } catch (err) {
        console.error("Erro ao listar impressoras Windows:", err);
        return [];
    }
}

/**
 * Obter status de impressora (Windows)
 */
function obterStatusImpressoraWindows(nomePrinter) {
    try {
        const output = execSync(
            `wmic logicalprinter where name='${nomePrinter}' get PrinterStatus`,
            { encoding: 'utf-8' }
        );
        
        const status = output.includes('0') ? 'online' : 'offline';
        
        return { nome: nomePrinter, status };
    } catch (err) {
        return { nome: nomePrinter, status: 'offline' };
    }
}

/**
 * Enviar arquivo para impressão (Windows)
 */
function imprimirWindows(arquivo, nomePrinter, opcoes = {}) {
    try {
        const comando = `print /d:"${nomePrinter}" "${arquivo}"`;
        
        execSync(comando);
        
        return {
            sucesso: true,
            mensagem: `Enviado para ${nomePrinter}`,
            arquivo: arquivo,
            impressora: nomePrinter
        };
    } catch (err) {
        console.error("Erro ao imprimir:", err);
        return {
            sucesso: false,
            erro: err.message,
            arquivo: arquivo,
            impressora: nomePrinter
        };
    }
}

/**
 * Obter informações de toner (PowerShell)
 */
function obterInformacoesPrinterWindows(nomePrinter) {
    try {
        const script = `
            Get-WmiObject -Class Win32_PrinterConfiguration -Filter "Name='${nomePrinter}'" | 
            Select-Object TonerLow, TonerOutOfPaper
        `;
        
        const output = execSync(`powershell "${script}"`, { encoding: 'utf-8' });
        
        return {
            tonerBaixo: output.includes('True'),
            semPapel: output.includes('True')
        };
    } catch (err) {
        return { tonerBaixo: null, semPapel: null };
    }
}

module.exports = {
    listarImpressorasWindows,
    obterStatusImpressoraWindows,
    imprimirWindows,
    obterInformacoesPrinterWindows
};
```

#### Uso em server.js (Windows)

```javascript
const printerHardwareWindows = require('./printer-hardware-windows');

app.post("/api/sync-windows-printers", (req, res) => {
    try {
        const impressorasWindows = printerHardwareWindows.listarImpressorasWindows();
        const config = printerManager.carregarConfiguracaoImpressoras();
        
        for (const impressora of config.impressoras) {
            const status = printerHardwareWindows.obterStatusImpressoraWindows(impressora.nome);
            impressora.status = status.status;
        }
        
        printerManager.salvarConfiguracaoImpressoras(config);
        
        res.json({
            mensagem: "Sincronizado com Windows",
            impressoras: config.impressoras
        });
    } catch (err) {
        console.error("Erro ao sincronizar Windows:", err);
        res.status(500).json({ error: "Erro ao sincronizar" });
    }
});
```

---

## Impressoras com API REST

Muitas impressoras modernas (Canon, Xerox, HP, Konica Minolta) têm API REST.

### Exemplo: Xerox com API REST

```javascript
const axios = require('axios');

/**
 * Obter status de impressora Xerox via API REST
 */
async function obterStatusXerox(ipPrinter) {
    try {
        const response = await axios.get(
            `http://${ipPrinter}:80/api/v2/device`,
            { timeout: 5000 }
        );
        
        return {
            modelo: response.data.deviceInformation.modelName,
            status: response.data.status.systemStatus,
            toner: response.data.supplies.toner.tonerLevelPercent,
            papel: response.data.trays.tray1.paperLevelPercent
        };
    } catch (err) {
        console.error("Erro ao conectar com Xerox:", err);
        return null;
    }
}

/**
 * Enviar trabalho de impressão para Xerox
 */
async function imprimirXerox(ipPrinter, arquivo, opcoes = {}) {
    try {
        const formData = new FormData();
        formData.append('document', arquivo);
        formData.append('copies', opcoes.copias || 1);
        formData.append('colorMode', opcoes.colorido ? 'Color' : 'BlackAndWhite');
        
        const response = await axios.post(
            `http://${ipPrinter}:80/api/v2/print`,
            formData,
            {
                headers: { 'Content-Type': 'multipart/form-data' }
            }
        );
        
        return { sucesso: true, jobId: response.data.jobId };
    } catch (err) {
        console.error("Erro ao imprimir em Xerox:", err);
        return { sucesso: false, erro: err.message };
    }
}

module.exports = {
    obterStatusXerox,
    imprimirXerox
};
```

---

## Monitoramento de Recursos

### Arquivo: `monitor-printers.js`

```javascript
const printerManager = require('./printer-manager');

/**
 * Monitorar todas as impressoras a cada 5 minutos
 */
function iniciarMonitoramento() {
    setInterval(async () => {
        console.log("[MONITOR] Verificando status das impressoras...");
        
        const config = printerManager.carregarConfiguracaoImpressoras();
        
        for (const impressora of config.impressoras) {
            // Verificar status
            const online = await printerManager.verificarStatusImpressora(
                impressora.ip, 
                impressora.puerto
            );
            
            impressora.status = online ? "online" : "offline";
            
            // Alertas
            if (impressora.toner_level < 20) {
                console.warn(`⚠️  ALERTA: Toner baixo em ${impressora.nome} (${impressora.toner_level}%)`);
            }
            
            if (impressora.papel_restante < 15) {
                console.warn(`⚠️  ALERTA: Papel baixo em ${impressora.nome} (${impressora.papel_restante}%)`);
            }
            
            if (!online && impressora.status === "online") {
                console.error(`❌ ERRO: ${impressora.nome} ficou offline!`);
            }
        }
        
        printerManager.salvarConfiguracaoImpressoras(config);
    }, 5 * 60 * 1000);  // A cada 5 minutos
}

/**
 * Enviar alerta via email (opcional)
 */
async function enviarAlertaEmail(assunto, mensagem) {
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
    
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: 'admin@empresa.com',
            subject: assunto,
            text: mensagem
        });
    } catch (err) {
        console.error("Erro ao enviar email:", err);
    }
}

module.exports = {
    iniciarMonitoramento,
    enviarAlertaEmail
};
```

#### Usar em server.js

```javascript
const monitor = require('./monitor-printers');

// Iniciar monitoramento ao ligar o servidor
monitor.iniciarMonitoramento();

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log("✅ Monitoramento de impressoras ativado");
});
```

---

## 🎯 Próximas Etapas

1. **Escolha sua plataforma** (Linux/Windows/Cloud)
2. **Instale as dependências** (cups, snmp, etc)
3. **Adapte o código** para sua situação
4. **Teste com uma impressora** antes de usar em produção
5. **Monitore constantemente** para detectar problemas

---

**Documentação:** Hardware Integration  
**Criado:** Novembro 2025
