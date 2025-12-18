const express = require("express");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const path = require("path");
const multer = require('multer');
const pdf = require('pdf-parse');
const printerManager = require('./printer-manager');
const printService = require('./print-service');

const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

const client = new MercadoPagoConfig({
  accessToken: 'TEST-3891197388635513-121815-14f3126b4a3e94fed2bba14ab2d7431c-3077287732'
});

const payment = new Payment(client);

const CONFIG_PATH = path.join(__dirname, "config.json");
const HISTORIC_PATH = path.join(__dirname, "private", "historic.json");
const UPLOAD_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

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
app.use(cookieParser());

// Middlewares
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));
app.use("/page_print", express.static(path.join(__dirname, "page_print")));

// Middleware de autenticação para admin
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123"; // Troque a senha aqui
function requireAdminAuth(req, res, next) {
  if (req.cookies && req.cookies.admin_auth === "ok") {
    return next();
  }
  // Se não autenticado, redireciona para login
  res.redirect("/admin/login");
}

// Servir arquivos privados apenas se autenticado
app.use("/private", requireAdminAuth, express.static(path.join(__dirname, "private")));

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


// --- Rota de login do admin ---
app.get("/admin/login", (req, res) => {
  res.send(`<!DOCTYPE html>
  <html lang='pt-BR'>
  <head>
    <meta charset='UTF-8'>
    <title>Login Admin</title>
    <style>
      body { background: #f8fafc; font-family: Arial,sans-serif; }
      .login-box { max-width: 340px; margin: 80px auto; background: #fff; border-radius: 10px; box-shadow: 0 2px 12px #0001; padding: 2em; }
      h2 { color: #2563eb; text-align: center; }
      label { font-weight: bold; }
      input[type=password] { width: 100%; padding: 0.7em; margin: 1em 0; border-radius: 6px; border: 1px solid #cbd5e1; }
      button { width: 100%; background: #2563eb; color: #fff; border: none; border-radius: 6px; padding: 0.7em; font-size: 1em; cursor: pointer; }
      button:hover { background: #1d4ed8; }
      .msg { color: #ef4444; text-align: center; margin-bottom: 1em; }
    </style>
  </head>
  <body>
    <form class='login-box' method='POST' action='/admin/login'>
      <h2>Login Admin</h2>
      <div class='msg'>${req.query.error ? "Senha incorreta!" : ""}</div>
      <label for='senha'>Senha de administrador:</label>
      <input type='password' id='senha' name='senha' required autofocus autocomplete='current-password'>
      <button type='submit'>Entrar</button>
    </form>
  </body>
  </html>`);
});

app.post("/admin/login", express.urlencoded({ extended: true }), (req, res) => {
  const senha = req.body.senha;
  if (senha === ADMIN_PASSWORD) {
    res.cookie("admin_auth", "ok", { httpOnly: true });
    return res.redirect("/admin");
  }
  res.redirect("/admin/login?error=1");
});

// --- Rota da página de administração ---
app.get("/admin", requireAdminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "private", "admin.html"));
});

// --- Rota da página de gerenciamento de impressoras ---
app.get("/admin/printers", requireAdminAuth, (req, res) => {
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
// ROTA DE IMPRESSÃO - Enviar documento para impressora
// ============================================================================

app.post("/api/print", async (req, res) => {
  try {
    const { documento, copias = 1, frenteVerso = false } = req.body;

    if (!documento) {
      return res.status(400).json({ error: "Documento é obrigatório" });
    }

    // Carregar configuração das impressoras
    const config = printerManager.carregarConfiguracaoImpressoras();
    if (!config) {
      return res.status(500).json({ error: "Erro ao carregar configuração de impressoras" });
    }

    // Filtrar impressoras ativas e online
    const impressorasValidas = config.impressoras.filter(imp => imp.ativa && imp.status === "online");
    if (!impressorasValidas.length) {
      return res.status(400).json({ error: "Nenhuma impressora ativa e online disponível" });
    }

    // Construir caminho do arquivo
    const caminhoArquivo = path.join(__dirname, "uploads", documento);
    if (!fs.existsSync(caminhoArquivo)) {
      return res.status(404).json({ error: "Arquivo não encontrado: " + documento });
    }

    console.log(`\n📤 Tentando imprimir em ${impressorasValidas.length} impressora(s):`);
    impressorasValidas.forEach(imp => {
      console.log(` - ${imp.nome} (${imp.ip}:${imp.puerto})`);
    });
    console.log(`   Arquivo: ${documento}`);
    console.log(`   Cópias: ${copias}`);
    console.log(`   Duplex (Frente/Verso): ${frenteVerso ? 'Sim' : 'Não'}`);

    // Tentar imprimir em todas, na ordem, até uma funcionar
    const resultado = await printService.imprimirEmLista(
      impressorasValidas,
      caminhoArquivo,
      copias,
      frenteVerso
    );

    console.log(`✅ Impressão concluída!\n`);

    res.json({
      sucesso: true,
      mensagem: resultado
    });

  } catch (err) {
    console.error("❌ Erro ao imprimir:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// ROTAS DE PAGAMENTO MERCADO PAGO
// ============================================================================

// POST /api/pagamento/qrcode - Cria pagamento PIX e retorna QR code dinâmico
app.post('/api/pagamento/qrcode', async (req, res) => {
  try {
    const { valor, descricao, codigo } = req.body;
    if (!valor || !descricao || !codigo) {
      return res.status(400).json({ error: 'Campos obrigatórios: valor, descricao, codigo' });
    }

    // Novo SDK: criar pagamento PIX
    const paymentPayload = {
      transaction_amount: parseFloat(valor),
      description: descricao,
      payment_method_id: 'pix',
      external_reference: codigo,
      payer: {
        email: `pagador+${Date.now()}@example.com` // email fake, obrigatório
      }
    };

    const result = await payment.create({
      body: paymentPayload
    });

    if (!result || !result.point_of_interaction) {
      throw new Error('Resposta inválida do Mercado Pago');
    }

    const payment_id = result.id;
    const qr_data = result.point_of_interaction.transaction_data.qr_code;

    res.json({ payment_id, qr_data });
  } catch (err) {
    console.error('Erro ao criar pagamento Mercado Pago:', err);
    res.status(500).json({ error: 'Erro ao criar pagamento Mercado Pago' });
  }
});
// GET /api/pagamento/status/:id - Consulta status do pagamento
app.get('/api/pagamento/status/:id', async (req, res) => {
  try {
    const paymentId = req.params.id;
    if (!paymentId) {
      return res.status(400).json({ error: 'ID do pagamento não informado' });
    }

    const result = await payment.get({ id: paymentId });

    res.json({
      status: result.status,
      status_detail: result.status_detail
    });

  } catch (err) {
    console.error('Erro ao consultar status Mercado Pago:', err);
    res.status(500).json({ error: 'Erro ao consultar status Mercado Pago' });
  }
});

// --- Inicialização do servidor ---
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});