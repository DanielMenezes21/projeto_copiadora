const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require('multer');
const pdf = require('pdf-parse');
const printerManager = require('./printer-manager');

// Definição de caminhos
const CONFIG_PATH = path.join(__dirname, "config.json");
const HISTORIC_PATH = path.join(__dirname, "private", "historic.json");
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Criar diretório de uploads se não existir
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

// Configurar multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Mantém o nome ORIGINAL
    const originalName = file.originalname;
    cb(null, originalName);
  }
});

const upload = multer({ storage });

// Inicializar Express
const app = express();

// Middlewares
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/private", express.static(path.join(__dirname, "private")));

// --- Rota para obter valores de configuração ---
app.get("/api/config", (req, res) => {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    res.json(config);
  } catch (err) {
    console.error("Erro ao ler config.json:", err);
    res.status(500).json({ error: "Erro ao ler o arquivo de configuração" });
  }
});

// --- Rota para atualizar valores de configuração ---
app.post("/api/config", (req, res) => {
  const { a4PretoBranco, a4Colorido, a3PretoBranco, a3Colorido } = req.body;

  if (
    a4PretoBranco == null ||
    a4Colorido == null ||
    a3PretoBranco == null ||
    a3Colorido == null
  ) {
    return res.status(400).json({ error: "Campos obrigatórios faltando." });
  }

  const config = { a4PretoBranco, a4Colorido, a3PretoBranco, a3Colorido };

  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    res.json({ message: "Configurações atualizadas com sucesso!", config });
  } catch (err) {
    console.error("Erro ao salvar config.json:", err);
    res.status(500).json({ error: "Erro ao salvar o arquivo de configuração" });
  }
});

// --- Rotas para histórico ---
// Retorna lista de registros de histórico
app.get("/api/historic", (req, res) => {
  try {
    if (!fs.existsSync(HISTORIC_PATH)) {
      fs.writeFileSync(HISTORIC_PATH, JSON.stringify([], null, 2));
    }
    const data = JSON.parse(fs.readFileSync(HISTORIC_PATH, "utf-8"));
    res.json(data);
  } catch (err) {
    console.error("Erro ao ler historic.json:", err);
    res.status(500).json({ error: "Erro ao ler o arquivo de histórico" });
  }
});

// Adiciona um novo registro no histórico
app.post("/api/historic", (req, res) => {
  try {
    console.log('Dados recebidos:', req.body); // Log para debug

    // Validação básica
    if (!req.body || !req.body.codigo || !req.body.datetime) {
      return res.status(400).json({ 
        error: "Dados inválidos ou incompletos",
        received: req.body 
      });
    }

    // Garantir que o arquivo existe
    if (!fs.existsSync(HISTORIC_PATH)) {
      fs.writeFileSync(HISTORIC_PATH, JSON.stringify([], null, 2));
    }

    // Ler dados existentes
    let data = [];
    try {
      const raw = fs.readFileSync(HISTORIC_PATH, "utf-8").trim();
      data = raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.warn("historic.json estava corrompido ou vazio. Recriando arquivo...");
      data = [];
    }
    const nextId = data.length > 0 ? Math.max(...data.map(d => d.id)) + 1 : 1;

    // Criar entrada garantindo todos os campos
    const entry = {
      id: nextId,
      codigo: req.body.codigo,
      datetime: req.body.datetime,
      documento: req.body.documento || 'Sem nome',
      valor: parseFloat(req.body.valor) || 0,
      configuracoes: {
        copias: parseInt(req.body.configuracoes?.copias) || 1,
        cor: req.body.configuracoes?.cor || 'preto-branco',
        tamanho: req.body.configuracoes?.tamanho || 'a4',
        paginas: parseInt(req.body.configuracoes?.paginas) || 1,
        frenteVerso: Boolean(req.body.configuracoes?.frenteVerso),
        orientacao: req.body.configuracoes?.orientacao || 'retrato'
      }
    };

    // Adicionar e salvar
    data.push(entry);
    fs.writeFileSync(HISTORIC_PATH, JSON.stringify(data, null, 2));
    
    console.log('Entrada salva:', entry); // Log para debug
    res.json({ message: "Registro adicionado", entry });
  } catch (err) {
    console.error("Erro ao salvar histórico:", err);
    res.status(500).json({ error: "Erro ao salvar o histórico" });
  }
});

// --- Endpoint: conta páginas (aceita upload multipart/form-data, campo 'file') ---
app.post('/api/parse-pages', upload.single('file'), async (req, res) => {
  try {
    // Verifica se recebeu arquivo
    if (!req.file) {
      return res.status(400).json({ 
        error: 'Arquivo não recebido ou formato inválido. Apenas PDFs são aceitos.' 
      });
    }

    // Le o arquivo
    const dataBuffer = fs.readFileSync(req.file.path);
    const data = await pdf(dataBuffer);
    const pages = data.numpages || data.numPages || (data.pages ? data.pages.length : null);

    // remove arquivo temporário
    // try { fs.unlinkSync(req.file.path); } catch (e) {}

    return res.json({ pages: pages || 0 });
  } catch (err) {
    console.error('Erro ao processar PDF:', err);
    try { if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); } catch (e) {}
    return res.status(500).json({ error: 'Erro ao processar o arquivo' });
  }
});

// --- Rota da página de administração ---
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "private", "admin.html"));
});

// --- Rota da página de gerenciamento de impressoras ---
app.get("/admin/printers", (req, res) => {
  res.sendFile(path.join(__dirname, "private", "printer-admin", "admin-printers.html"));
});

// --- Rota da página de impressão ---
app.get("/print", (req, res) => {
  res.sendFile(path.join(__dirname, "page_print", "print_page.html"));
});

// ============================================================================
// ROTAS DE GERENCIAMENTO DE IMPRESSORAS
// ============================================================================

// --- GET: Obter todas as impressoras ---
app.get("/api/printers", (req, res) => {
  try {
    const config = printerManager.carregarConfiguracaoImpressoras();
    if (!config) {
      return res.status(500).json({ error: "Erro ao carregar configuração de impressoras" });
    }
    res.json(config.impressoras);
  } catch (err) {
    console.error("Erro ao obter impressoras:", err);
    res.status(500).json({ error: "Erro ao obter impressoras" });
  }
});

// --- GET: Obter relatório de status ---
app.get("/api/printers/status", async (req, res) => {
  try {
    await printerManager.atualizarStatusTodas();
    const relatorio = printerManager.obterRelatorioPrinters();
    res.json(relatorio);
  } catch (err) {
    console.error("Erro ao atualizar status:", err);
    res.status(500).json({ error: "Erro ao atualizar status das impressoras" });
  }
});

// --- GET: Obter impressora específica ---
app.get("/api/printers/:id", (req, res) => {
  try {
    const config = printerManager.carregarConfiguracaoImpressoras();
    if (!config) {
      return res.status(500).json({ error: "Erro ao carregar configuração" });
    }
    const impressora = config.impressoras.find(imp => imp.id === parseInt(req.params.id));
    if (!impressora) {
      return res.status(404).json({ error: "Impressora não encontrada" });
    }
    res.json(impressora);
  } catch (err) {
    console.error("Erro ao obter impressora:", err);
    res.status(500).json({ error: "Erro ao obter impressora" });
  }
});

// --- POST: Selecionar melhor impressora para um pedido ---
app.post("/api/printers/select", (req, res) => {
  try {
    const pedido = req.body;
    const impressora = printerManager.selecionarMelhorImpressora(pedido);
    
    if (!impressora) {
      return res.status(400).json({ 
        error: "Nenhuma impressora compatível encontrada",
        criterios: pedido
      });
    }
    
    res.json({
      mensagem: "Impressora selecionada",
      impressora: impressora.nome,
      detalhes: impressora
    });
  } catch (err) {
    console.error("Erro ao selecionar impressora:", err);
    res.status(500).json({ error: "Erro ao selecionar impressora" });
  }
});

// --- POST: Verificar compatibilidade ---
app.post("/api/printers/verify", (req, res) => {
  try {
    const { pedido, impressoraId } = req.body;
    
    if (!pedido || !impressoraId) {
      return res.status(400).json({ error: "Dados incompletos" });
    }
    
    const resultado = printerManager.verificarCompatibilidade(pedido, impressoraId);
    res.json(resultado);
  } catch (err) {
    console.error("Erro ao verificar compatibilidade:", err);
    res.status(500).json({ error: "Erro ao verificar compatibilidade" });
  }
});

// --- POST: Adicionar nova impressora ---
app.post("/api/printers", (req, res) => {
  try {
    const novaImpressora = req.body;
    
    if (!novaImpressora.nome || !novaImpressora.ip) {
      return res.status(400).json({ error: "Nome e IP são obrigatórios" });
    }
    
    const resultado = printerManager.adicionarImpressora(novaImpressora);
    res.json(resultado);
  } catch (err) {
    console.error("Erro ao adicionar impressora:", err);
    res.status(500).json({ error: "Erro ao adicionar impressora" });
  }
});

// --- PUT: Atualizar configuração de uma impressora ---
app.put("/api/printers/:id", (req, res) => {
  try {
    const impressoraId = req.params.id;
    const atualizacoes = req.body;
    
    const resultado = printerManager.atualizarImpressora(impressoraId, atualizacoes);
    res.json(resultado);
  } catch (err) {
    console.error("Erro ao atualizar impressora:", err);
    res.status(500).json({ error: "Erro ao atualizar impressora" });
  }
});

// --- DELETE: Remover uma impressora ---
app.delete("/api/printers/:id", (req, res) => {
  try {
    const impressoraId = req.params.id;
    const resultado = printerManager.removerImpressora(impressoraId);
    res.json(resultado);
  } catch (err) {
    console.error("Erro ao remover impressora:", err);
    res.status(500).json({ error: "Erro ao remover impressora" });
  }
});

// ============================================================================
// FIM DAS ROTAS DE GERENCIAMENTO DE IMPRESSORAS
// ============================================================================

// --- Inicialização do servidor ---
const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
