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

  if (valido) {
    uploadText.innerHTML = `<strong>Arquivo selecionado:</strong><br><span class="file-name">${file.name}</span>`;
    // show selected file info and pages placeholder
    if (arquivoSelecionadoEl) arquivoSelecionadoEl.innerHTML = `Arquivo: <strong>${file.name}</strong> — Páginas: <span id="page-count">determinando...</span>`;
  // enable next only if checkbox is checked too
  setNext1Enabled();
    // tenta detectar número de páginas automaticamente (PDF)
    if (typeof detectPages === 'function') detectPages(file);
  } else {
    uploadText.innerHTML = `<span style="color: red; font-weight: bold;">Arquivo inválido!</span><br>
      <small>Apenas PDF ou Word são aceitos.</small>`;
    setNext1Enabled();
  }
}

// Detecta número de páginas via endpoint server-side
async function detectPages(file) {
  const pageCountEl = document.getElementById('page-count');
  if (pageCountEl) pageCountEl.textContent = 'determinando...';

  try {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/parse-pages', { method: 'POST', body: form });
    if (res.ok) {
      const data = await res.json();
      if (data.pages && data.pages > 0) {
        detectedPages = parseInt(data.pages, 10) || 1;
        if (pageCountEl) pageCountEl.textContent = detectedPages;
        atualizarValor();
      } else {
        detectedPages = 1;
        if (pageCountEl) pageCountEl.textContent = detectedPages;
      }
    } else {
      const err = await res.json().catch(() => ({}));
      console.log('parse-pages error', err);
      if (pageCountEl) pageCountEl.textContent = 'n/a';
    }
  } catch (e) {
    console.error('Erro detectPages:', e);
    if (pageCountEl) pageCountEl.textContent = 'erro';
    detectedPages = 1;
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
  if (!configValores) return;

  const copias = parseInt(copiasInput.value) || 1;
  const cor = corSelect.value;
  const tamanho = document.getElementById("tamanho").value;
  const paginas = detectedPages || 1;
  const frenteVerso = frenteVersoCheck.checked;
  const tamanhoSelect = document.getElementById("tamanho");
  const orientacao = document.getElementById('orientacao') ? document.getElementById('orientacao').value : 'retrato';

  // Escolher o campo correto conforme o tamanho e cor
  let precoBase = 0;
  if (tamanho === "a4") {
    precoBase = cor === "preto-branco" ? configValores.a4PretoBranco : configValores.a4Colorido;
  } else if (tamanho === "a3") {
    precoBase = cor === "preto-branco" ? configValores.a3PretoBranco : configValores.a3Colorido;
  }

  // Frente e verso pode custar um pouco menos
  if (frenteVerso) precoBase *= 0.95;

  // Calcula o total (considerando número de páginas por cópia)
  const unitPrice = precoBase; // preço por folha já com ajuste frente/verso
  const pricePerCopy = unitPrice * paginas;
  valorImpressao = pricePerCopy * copias;

  // Cria ou atualiza o elemento de exibição
  let totalEl = document.getElementById("valor-impressao");
  if (!totalEl) {
    totalEl = document.createElement("p");
    totalEl.id = "valor-impressao";
    totalEl.style.textAlign = "center";
    totalEl.style.color = "#007bff";
    totalEl.style.fontWeight = "bold";
    document.getElementById("print-config").appendChild(totalEl);
  }

  totalEl.textContent = `Valor total: R$ ${valorImpressao.toFixed(2)}`;

  // Atualiza resumo (se a tela de confirmação estiver visível)
  const resumoValorEl = document.getElementById("resumo-valor");
  const resumoCopiasEl = document.getElementById("resumo-copias");
  const resumoCorEl = document.getElementById("resumo-cor");
  const resumoTamanhoEl = document.getElementById("resumo-tamanho");
  const resumoFrenteEl = document.getElementById("resumo-frente");
  if (resumoValorEl) resumoValorEl.textContent = `R$ ${valorImpressao.toFixed(2)}`;
  if (resumoCopiasEl) resumoCopiasEl.textContent = copias;
  if (resumoCorEl) resumoCorEl.textContent = cor === 'colorido' ? 'Colorido' : 'Preto e Branco';
  if (resumoTamanhoEl) resumoTamanhoEl.textContent = tamanho.toUpperCase();
  if (resumoFrenteEl) resumoFrenteEl.textContent = frenteVerso ? 'Sim' : 'Não';
  // pages shown with the uploaded file; no manual pages input
  const resumoArquivoEl = document.getElementById('resumo-arquivo');
  const resumoPaginasEl = document.getElementById('resumo-paginas');
  const resumoOrientacaoEl = document.getElementById('resumo-orientacao');
  const resumoUnitarioEl = document.getElementById('resumo-valor-unitario');
  const resumoPorCopiaEl = document.getElementById('resumo-valor-por-copia');
  if (resumoArquivoEl) {
    // show file name if available
    const fi = fileInput.files && fileInput.files[0];
    resumoArquivoEl.textContent = fi ? fi.name : '-';
  }
  if (resumoPaginasEl) resumoPaginasEl.textContent = paginas;
  if (resumoOrientacaoEl) resumoOrientacaoEl.textContent = orientacao === 'paisagem' ? 'Paisagem' : 'Retrato';
  if (resumoUnitarioEl) resumoUnitarioEl.textContent = `R$ ${unitPrice.toFixed(2)}`;
  if (resumoPorCopiaEl) resumoPorCopiaEl.textContent = `R$ ${pricePerCopy.toFixed(2)}`;
  // pages shown with the uploaded file; no manual pages input
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

    // FormData — envia arquivo + dados
    const formData = new FormData();
    formData.append("file", file); // PDF/DOCX real

    formData.append("codigo", codigo);
    formData.append("datetime", new Date().toISOString());
    formData.append("valor", valorImpressao.toFixed(2));

    formData.append("copias", copiasInput.value);
    formData.append("cor", corSelect.value);
    formData.append("tamanho", tamanhoSelect.value);
    formData.append("paginas", detectedPages);
    formData.append("frenteVerso", frenteVersoCheck.checked);
    formData.append("orientacao", document.getElementById("orientacao").value);

    const response = await fetch("/api/historic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
          codigo,
          datetime: new Date().toISOString(),
          valor: valorImpressao,
          configuracoes: {
              copias: copiasInput.value,
              cor: corSelect.value,
              tamanho: tamanhoSelect.value,
              paginas: detectedPages,
              frenteVerso: frenteVersoCheck.checked,
              orientacao: orientacao.value
          }
      })
  });

    console.log("Arquivo e dados salvos:", result);

  } catch (err) {
    console.error("Erro finalização:", err);
    alert("Erro ao registrar pedido: " + err.message);
  }
});

    const response = await fetch("/api/historic/upload", {
      method: "POST",
      body: formData
    });

    const result = await response.json();  // <-- necessário
    if (!response.ok) throw new Error(result.error || "Erro ao salvar");

// ----------------------
// ETAPA 5: Reiniciar
// ----------------------
document.getElementById("novo-pedido").addEventListener("click", () => {
  alert("Novo pedido iniciado.");
  goToStep(1);
  fileInput.value = "";
  uploadText.innerHTML = `Arraste seu arquivo aqui ou <span class="select-file">clique para selecionar</span><br>
    <small>(Apenas PDF ou Word)</small>`;
  next1.disabled = true;
  // reset termo checkbox and file info
  if (termoCheckbox) termoCheckbox.checked = false;
  if (arquivoSelecionadoEl) arquivoSelecionadoEl.innerHTML = '';
  const pageCountEl = document.getElementById('page-count');
  if (pageCountEl) pageCountEl.textContent = '';
  detectedPages = 1;
  setNext1Enabled();
});

console.log("RECEBIDO NO BACKEND:", req.body);
console.log('Dados recebidos:', req.body);


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
