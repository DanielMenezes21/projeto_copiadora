// =========================
// CONFIGURAÇÕES LOCAIS
// =========================

// Caminho do arquivo printers.json local (máquina específica)
const PRINTERS_URL = "/page_print/printers.json";

// Endereço do servidor central de pedidos
const API_SERVER = "http://localhost:3000";  // ajuste conforme seu backend


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
// FUNÇÃO: Buscar impressoras locais
// =========================
async function carregarImpressoras() {
    const res = await fetch(PRINTERS_URL);

    if (!res.ok) {
        throw new Error("Falha ao carregar configuração das impressoras locais.");
    }

    return res.json();
}


// =========================
// FUNÇÃO: Verificar compatibilidade
// =========================
function selecionarImpressora(pedido, impressoras) {

    for (const nome in impressoras) {
        const imp = impressoras[nome];

        const suportaCor = pedido.colorido ? imp.colorido : true;
        const suportaTamanho = imp.tamanhos.includes(pedido.tamanho);

        if (suportaCor && suportaTamanho) {
            return nome;     // Achou!
        }
    }

    return null; // Nenhuma impressora compatível
}


// =========================
// FUNÇÃO: Realizar a impressão (chama o backend local do Node)
// =========================
//async function enviarParaImpressao(codigo, impressora) {
//    const res = await fetch(`${API_SERVER}/api/imprimir`, {
//        method: "POST",
//        headers: { "Content-Type": "application/json"},
//        body: JSON.stringify({ codigo, impressora })
//    });

//    const data = await res.json();

//    if (!res.ok) {
//        throw new Error(data.erro || "Erro ao enviar para impressão.");
//    }

//    return data;
//}

async function enviarParaImpressao(codigo, impressora) {
    console.log("ENVIANDO PARA IMPRESSORA:", impressora, "com código", codigo);

    return { ok: true };
}


// =========================
// EVENTO: clique no botão "Imprimir"
// =========================
async function processarImpressao() {
    const codigo = prompt("Digite o código de impressão:");

    if (!codigo) return;

    try {
        // 1. Carrega pedido do servidor central
        const pedido = await buscarPedido(codigo);

        // 2. Carrega impressoras locais
        const impressoras = await carregarImpressoras();

        // 3. Valida compatibilidade
        const impressoraEscolhida = selecionarImpressora(pedido, impressoras);

        if (!impressoraEscolhida) {
            alert("⚠ Nenhuma impressora desta máquina suporta este pedido:\n" +
                `• Colorido: ${pedido.colorido}\n` +
                `• Tamanho: ${pedido.tamanho}`);
            return;
        }

        // 4. Envia para impressão
        const resultado = await enviarParaImpressao(codigo, impressoraEscolhida);

        alert(`✅ Pedido enviado para a impressora: ${impressoraEscolhida}`);

    } catch (err) {
        console.error(err);
        alert("Erro: " + err.message);
    }
}


// =========================
// Conectar botão ao script
// =========================
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.querySelector("button");

    if (!btn) return;

    btn.addEventListener("click", (event) => {
        event.preventDefault(); // impede o print normal do navegador
        processarImpressao();
    });
});

// --- NOVA ROTA: Upload de arquivo + salvar dados no histórico ---
app.post("/api/historic/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado." });
    }

    const {
      codigo,
      datetime,
      valor,
      copias,
      cor,
      tamanho,
      paginas,
      frenteVerso,
      orientacao
    } = req.body;

    // Validação mínima
    if (!codigo || !datetime) {
      return res.status(400).json({ error: "Dados obrigatórios faltando." });
    }

    // Garantir que o arquivo JSON existe
    if (!fs.existsSync(HISTORIC_PATH)) {
      fs.writeFileSync(HISTORIC_PATH, JSON.stringify([], null, 2));
    }

    let data = JSON.parse(fs.readFileSync(HISTORIC_PATH, "utf-8"));

    const nextId = data.length > 0 ? Math.max(...data.map(d => d.id)) + 1 : 1;

    const entry = {
      id: nextId,
      codigo,
      datetime,
      documento: req.file.filename, // nome do arquivo salvo
      valor: parseFloat(valor) || 0,

      configuracoes: {
        copias: parseInt(copias) || 1,
        cor: cor || "preto-branco",
        tamanho: tamanho || "a4",
        paginas: parseInt(paginas) || 1,
        frenteVerso: frenteVerso === "true",
        orientacao: orientacao || "retrato"
      }
    };

    data.push(entry);

    fs.writeFileSync(HISTORIC_PATH, JSON.stringify(data, null, 2));

    res.json({
      message: "Upload concluído e dados salvos",
      entry
    });

  } catch (err) {
    console.error("Erro no upload:", err);
    res.status(500).json({ error: "Erro ao salvar o pedido" });
  }
});

