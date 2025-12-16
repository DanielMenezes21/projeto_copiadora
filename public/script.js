// Seleciona os elementos do stepper
const steps = document.querySelectorAll(".step");
const contents = document.querySelectorAll(".step-content");

// Função para mudar de etapa
function goToStep(stepNumber) {
  steps.forEach((step, i) => {
    step.classList.toggle("active", i === stepNumber - 1);
  });
  contents.forEach((content, i) => {
    content.classList.toggle("active", i === stepNumber - 1);
  });
}

// --- Botões de voltar ---
const back2 = document.getElementById("back-2");
const back3 = document.getElementById("back-3");
const back4 = document.getElementById("back-4");

if (back2) back2.addEventListener("click", () => goToStep(1));
if (back3) back3.addEventListener("click", () => goToStep(2));
if (back4) back4.addEventListener("click", () => goToStep(3));

// ----------------------
// ETAPA 1: Upload
// ----------------------
const uploadBox = document.getElementById("upload-box");
const fileInput = document.getElementById("file-input");
const uploadText = document.getElementById("upload-text");
const next1 = document.getElementById("next-1");
const arquivoSelecionadoEl = document.getElementById("arquivo-selecionado");

let detectedPages = 1; // pages detected from uploaded file
const termoCheckbox = document.getElementById('aceito-termo');

function setNext1Enabled() {
  const fileSelected = fileInput.files && fileInput.files.length > 0;
  const accepted = termoCheckbox ? termoCheckbox.checked : false;
  next1.disabled = !(fileSelected && accepted);
}

uploadBox.addEventListener("click", () => fileInput.click());
document.querySelector(".select-file").addEventListener("click", (e) => {
  e.stopPropagation();
  fileInput.click();
});

fileInput.addEventListener("change", () => {
  if (fileInput.files.length > 0) validarArquivo(fileInput.files[0]);
});

uploadBox.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadBox.style.background = "#e6f2ff";
});

uploadBox.addEventListener("dragleave", () => {
  uploadBox.style.background = "";
});

uploadBox.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadBox.style.background = "";
  if (e.dataTransfer.files.length > 0) validarArquivo(e.dataTransfer.files[0]);
});

function validarArquivo(file) {
  const extensoesPermitidas = [".pdf", ".doc", ".docx"];
  const nomeArquivo = file.name.toLowerCase();
  const valido = extensoesPermitidas.some(ext => nomeArquivo.endsWith(ext));

  console.log("📁 Arquivo selecionado:", file.name, "- Válido:", valido);

  if (valido) {
    uploadText.innerHTML = `<strong>Arquivo selecionado:</strong><br><span class="file-name">${file.name}</span>`;
    
    if (arquivoSelecionadoEl) {
      arquivoSelecionadoEl.innerHTML = `Arquivo: <strong>${file.name}</strong> — Páginas: <span id="page-count">determinando...</span>`;
    }
    
    setNext1Enabled();
    
    // Detecta número de páginas (apenas para PDF)
    if (nomeArquivo.endsWith(".pdf")) {
      console.log("📄 Detectando páginas do PDF...");
      detectPages(file);
    } else {
      // Para Word, assume 1 página como padrão
      console.log("📝 Arquivo Word - usando 1 página como padrão");
      detectedPages = 1;
      const pageCountEl = document.getElementById('page-count');
      if (pageCountEl) pageCountEl.textContent = '1 (estimado)';
      atualizarValor();
    }
  } else {
    uploadText.innerHTML = `<span style="color: red; font-weight: bold;">❌ Arquivo inválido!</span><br>
      <small>Apenas PDF ou Word (.doc, .docx) são aceitos.</small>`;
    detectedPages = 1;
    setNext1Enabled();
  }
}

// Detecta número de páginas via endpoint server-side
async function detectPages(file) {
  const pageCountEl = document.getElementById('page-count');
  
  if (pageCountEl) pageCountEl.textContent = '⏳ detectando...';

  try {
    const form = new FormData();
    form.append('file', file);
    
    console.log("📤 Enviando arquivo para análise...");
    const res = await fetch('/api/parse-pages', { 
      method: 'POST', 
      body: form 
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log("✅ Resposta recebida:", data);
      
      if (data.pages && data.pages > 0) {
        detectedPages = parseInt(data.pages, 10) || 1;
        console.log("📖 Páginas detectadas:", detectedPages);
        if (pageCountEl) pageCountEl.textContent = detectedPages;
        atualizarValor();
      } else {
        console.warn("⚠️ Número de páginas indeterminado, usando padrão");
        detectedPages = 1;
        if (pageCountEl) pageCountEl.textContent = '1 (padrão)';
        atualizarValor();
      }
    } else {
      console.error("❌ Erro na resposta do servidor:", res.status);
      const err = await res.json().catch(() => ({}));
      console.error("Detalhes do erro:", err);
      
      detectedPages = 1;
      if (pageCountEl) pageCountEl.textContent = '1 (padrão)';
      atualizarValor();
    }
  } catch (e) {
    console.error('❌ Erro ao detectar páginas:', e);
    detectedPages = 1;
    if (pageCountEl) pageCountEl.textContent = '1 (erro)';
    atualizarValor();
  }
}

next1.addEventListener("click", () => goToStep(2));

// ----------------------
// ETAPA 2: Configurações de Impressão
// ----------------------
const copiasInput = document.getElementById("copias");
const corSelect = document.getElementById("cor");
const frenteVersoCheck = document.getElementById("frenteVerso");
const next2 = document.getElementById("next-2");
const tamanhoSelect = document.getElementById("tamanho");
// pages are detected automatically and stored in `detectedPages`

let configValores = null;
let valorImpressao = 0;

// Busca configurações do servidor
async function carregarConfig() {
  try {
    const res = await fetch("/api/config");
    configValores = await res.json();
  } catch {
    // Valores padrão (fallback)
    configValores = {
      a4PretoBranco: 0.5,
      a4Colorido: 1.5,
      a3PretoBranco: 1.0,
      a3Colorido: 2.0
    };
  }
  atualizarValor();
}



// Cálculo do valor
function atualizarValor() {
  if (!configValores) {
    console.warn("⚠️ Configurações não carregadas ainda");
    return;
  }

  const copias = parseInt(copiasInput.value) || 1;
  const cor = corSelect.value;
  const tamanho = tamanhoSelect.value;
  const paginas = detectedPages || 1;
  const frenteVerso = frenteVersoCheck.checked;
  const orientacao = document.getElementById('orientacao').value || 'retrato';

  console.log("💰 Calculando valor:", { copias, cor, tamanho, paginas, frenteVerso, orientacao });

  // Escolher o preço conforme tamanho e cor
  let precoBase = 0;
  if (tamanho === "a4") {
    precoBase = cor === "preto-branco" ? configValores.a4PretoBranco : configValores.a4Colorido;
  } else if (tamanho === "a3") {
    precoBase = cor === "preto-branco" ? configValores.a3PretoBranco : configValores.a3Colorido;
  }

  // Frente e verso oferece desconto de 5%
  if (frenteVerso) precoBase *= 0.95;

  // Calcula total
  const unitPrice = precoBase;
  const pricePerCopy = unitPrice * paginas;
  valorImpressao = pricePerCopy * copias;

  console.log("💵 Valor calculado: R$", valorImpressao.toFixed(2));

  // Atualiza elemento de valor na etapa 2
  let totalEl = document.getElementById("valor-impressao");
  if (!totalEl) {
    totalEl = document.createElement("p");
    totalEl.id = "valor-impressao";
    totalEl.className = "valor-box";
    const printConfig = document.getElementById("print-config");
    if (printConfig) printConfig.appendChild(totalEl);
  }
  totalEl.textContent = `Valor total: R$ ${valorImpressao.toFixed(2)}`;

  // Atualiza resumo na etapa 3
  const resumoValorEl = document.getElementById("resumo-valor");
  const resumoCopiasEl = document.getElementById("resumo-copias");
  const resumoCorEl = document.getElementById("resumo-cor");
  const resumoTamanhoEl = document.getElementById("resumo-tamanho");
  const resumoFrenteEl = document.getElementById("resumo-frente");
  const resumoArquivoEl = document.getElementById('resumo-arquivo');
  const resumoPaginasEl = document.getElementById('resumo-paginas');
  const resumoOrientacaoEl = document.getElementById('resumo-orientacao');
  const resumoUnitarioEl = document.getElementById('resumo-valor-unitario');
  const resumoPorCopiaEl = document.getElementById('resumo-valor-por-copia');

  if (resumoValorEl) resumoValorEl.textContent = `R$ ${valorImpressao.toFixed(2)}`;
  if (resumoCopiasEl) resumoCopiasEl.textContent = copias;
  if (resumoCorEl) resumoCorEl.textContent = cor === 'colorido' ? 'Colorido' : 'Preto e Branco';
  if (resumoTamanhoEl) resumoTamanhoEl.textContent = tamanho.toUpperCase();
  if (resumoFrenteEl) resumoFrenteEl.textContent = frenteVerso ? 'Sim' : 'Não';
  if (resumoArquivoEl) {
    const fi = fileInput.files && fileInput.files[0];
    resumoArquivoEl.textContent = fi ? fi.name : '-';
  }
  if (resumoPaginasEl) resumoPaginasEl.textContent = paginas;
  if (resumoOrientacaoEl) resumoOrientacaoEl.textContent = orientacao === 'paisagem' ? 'Paisagem' : 'Retrato';
  if (resumoUnitarioEl) resumoUnitarioEl.textContent = `R$ ${unitPrice.toFixed(2)}`;
  if (resumoPorCopiaEl) resumoPorCopiaEl.textContent = `R$ ${pricePerCopy.toFixed(2)}`;
}

// Eventos para recalcular
[copiasInput, corSelect, frenteVersoCheck, tamanhoSelect].forEach(el =>
  el && el.addEventListener("input", atualizarValor)
);

// Habilita/desabilita Next1 quando o checkbox muda
if (termoCheckbox) termoCheckbox.addEventListener('change', setNext1Enabled);

// Passa para etapa 3 (gera QR Code)
next2.addEventListener("click", () => {
  // Ir para a etapa de confirmação (agora etapa 3)
  goToStep(3);
  // Garante que o resumo esteja atualizado
  atualizarValor();
});

window.addEventListener("load", carregarConfig);

// Seleciona elementos (modal de termo) — só registra handlers se os elementos existirem
const modal = document.getElementById("modal-termo");
const btnAbrir = document.getElementById("abrir-termo");
const spanClose = document.querySelector(".modal .close");
const btnAceitar = document.getElementById("aceitar-termo");

if (modal) {
  if (btnAbrir) {
    btnAbrir.addEventListener("click", () => {
      modal.style.display = "block";
    });
  }

  if (spanClose) {
    spanClose.addEventListener("click", () => {
      modal.style.display = "none";
    });
  }

  // Fechar modal ao clicar fora do conteúdo
  window.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });

  if (btnAceitar) {
    btnAceitar.addEventListener("click", () => {
      // marcar checkbox e habilitar próxima etapa
      if (termoCheckbox) termoCheckbox.checked = true;
      setNext1Enabled();
      modal.style.display = "none";
    });
  }
}



// ----------------------
// ETAPA 3 -> ETAPA 4 (agora gera QR e vai para pagamento)
// ----------------------
const next3Btn = document.getElementById("next-3");
if (next3Btn) {
  next3Btn.addEventListener("click", () => {
    // Gera QR para pagamento com o valor atual e mostra na etapa de pagamento (step 4)
    const qrcodeContainer = document.getElementById("qrcode");
    const qrcodeLink = document.getElementById("qrcode-link");
    if (qrcodeContainer) qrcodeContainer.innerHTML = "";

    const valorPix = valorImpressao.toFixed(2);
    const pagamento = `00020126580014BR.GOV.BCB.PIX0136chavepix@seudominio.com5204000053039865406${valorPix}5802BR5920COPIADORA TESTE6009SAO PAULO62070503***6304ABCD`;

    if (qrcodeContainer) {
      new QRCode(qrcodeContainer, {
        text: pagamento,
        width: 200,
        height: 200,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
      });
    }

    if (qrcodeLink) qrcodeLink.innerHTML = `<strong>Código PIX (R$ ${valorPix}):</strong><br><span>${pagamento}</span>`;

    goToStep(4);
  });
}

// ----------------------
// ETAPA 4 -> ETAPA 5
// ----------------------
document.getElementById("finalizar").addEventListener("click", async () => {
  goToStep(5);
  const codigo = gerarCodigoImpressao();
  document.getElementById("codigo-gerado").innerText = codigo;

  try {
    const file = fileInput.files[0];
    if (!file) throw new Error("Arquivo não encontrado");

    // Enviar dados do pedido via JSON
    const response = await fetch("/api/historic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        codigo,
        datetime: new Date().toISOString(),
          documento: file.name,
        valor: valorImpressao,
        configuracoes: {
          copias: parseInt(copiasInput.value) || 1,
          cor: corSelect.value,
          tamanho: tamanhoSelect.value,
          paginas: detectedPages,
          frenteVerso: frenteVersoCheck.checked,
          orientacao: document.getElementById("orientacao").value || 'retrato'
        }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Erro ao salvar pedido");
    }

    const result = await response.json();
    console.log("✅ Pedido registrado:", result);

  } catch (err) {
    console.error("❌ Erro ao finalizar:", err);
    alert("Erro ao registrar pedido: " + err.message);
  }
});

// ----------------------
// ETAPA 5: Reiniciar
// ----------------------

document.getElementById("novo-pedido").addEventListener("click", () => {
  // Gera comprovante antes de reiniciar
  gerarComprovante();
  // Reinicia o fluxo normalmente
  alert("Novo pedido iniciado.");
  goToStep(1);
  fileInput.value = "";
  uploadText.innerHTML = `Arraste seu arquivo aqui ou <span class="select-file">clique para selecionar</span><br>
    <small>(Apenas PDF ou Word)</small>`;
  next1.disabled = true;
  if (termoCheckbox) termoCheckbox.checked = false;
  if (arquivoSelecionadoEl) arquivoSelecionadoEl.innerHTML = '';
  const pageCountEl = document.getElementById('page-count');
  if (pageCountEl) pageCountEl.textContent = '';
  detectedPages = 1;
  setNext1Enabled();
});

// Função para gerar comprovante HTML e abrir para impressão/download
function gerarComprovante() {
  // Dados do pedido
  const codigo = document.getElementById("codigo-gerado").innerText;
  const dataHora = new Date().toLocaleString();
  const arquivo = fileInput.files && fileInput.files[0] ? fileInput.files[0].name : '-';
  const valor = valorImpressao.toFixed(2);
  const copias = parseInt(copiasInput.value) || 1;
  const cor = corSelect.value === 'colorido' ? 'Colorido' : 'Preto e Branco';
  const tamanho = tamanhoSelect.value.toUpperCase();
  const paginas = detectedPages || 1;
  const frenteVerso = frenteVersoCheck.checked ? 'Sim' : 'Não';
  const orientacao = document.getElementById('orientacao').value === 'paisagem' ? 'Paisagem' : 'Retrato';

  const html = `<!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8">
    <title>Comprovante de Pedido</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f8fafc; color: #222; margin: 0; padding: 2em; }
      .comprovante-box { background: #fff; max-width: 480px; margin: 2em auto; border-radius: 12px; box-shadow: 0 2px 12px #0001; padding: 2em; }
      h1 { color: #2563eb; font-size: 1.5em; margin-bottom: 0.5em; }
      .info { margin-bottom: 1.2em; }
      .info strong { display: inline-block; width: 140px; color: #475569; }
      .linha { border-top: 1px solid #e2e8f0; margin: 1.5em 0; }
      .valor { font-size: 1.2em; color: #10b981; font-weight: bold; }
      .print-btn { margin-top: 1.5em; padding: 0.7em 2em; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-size: 1em; cursor: pointer; }
      .print-btn:hover { background: #1d4ed8; }
    </style>
  </head>
  <body>
    <div class="comprovante-box">
      <h1>Comprovante de Pedido</h1>
      <div class="info"><strong>Código:</strong> ${codigo}</div>
      <div class="info"><strong>Data/Hora:</strong> ${dataHora}</div>
      <div class="info"><strong>Arquivo:</strong> ${arquivo}</div>
      <div class="info"><strong>Valor Pago:</strong> <span class="valor">R$ ${valor}</span></div>
      <div class="linha"></div>
      <div class="info"><strong>Cópias:</strong> ${copias}</div>
      <div class="info"><strong>Páginas:</strong> ${paginas}</div>
      <div class="info"><strong>Cor:</strong> ${cor}</div>
      <div class="info"><strong>Tamanho:</strong> ${tamanho}</div>
      <div class="info"><strong>Frente/Verso:</strong> ${frenteVerso}</div>
      <div class="info"><strong>Orientação:</strong> ${orientacao}</div>
      <button class="print-btn" onclick="window.print()">Imprimir / Salvar PDF</button>
    </div>
  </body>
  </html>`;

  // Abre comprovante em nova janela
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  } else {
    alert('Não foi possível abrir o comprovante. Verifique o bloqueador de pop-ups.');
  }
}

// ----------------------
// Função: Código de Impressão
// ----------------------
function gerarCodigoImpressao() {
  const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numeros = Math.floor(1000 + Math.random() * 9000);
  const sufixo =
    letras.charAt(Math.floor(Math.random() * letras.length)) +
    letras.charAt(Math.floor(Math.random() * letras.length));
  return `IMP-${numeros}${sufixo}`;
}
