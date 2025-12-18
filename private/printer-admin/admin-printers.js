// =========================
// CONFIGURAÇÕES DE SEGURANÇA
// =========================
const SENHA_ADMIN = "admin123"; // ⚠️ MUDE ISSO EM PRODUÇÃO!
let autenticado = false;
let editandoId = null;

// =========================
// FUNÇÃO: Autenticar
// =========================
function autenticar() {
    const senha = document.getElementById("senhaAdmin").value;

    if (senha === SENHA_ADMIN) {
        autenticado = true;
        document.getElementById("authSection").style.display = "none";
        document.getElementById("printerSection").style.display = "block";
        document.getElementById("senhaAdmin").value = "";
        carregarImpressoras();
    } else {
        alert("❌ Senha incorreta!");
        document.getElementById("senhaAdmin").value = "";
        document.getElementById("senhaAdmin").focus();
    }
}

// =========================
// FUNÇÃO: Logout
// =========================
function logout() {
    autenticado = false;
    editandoId = null;
    document.getElementById("senhaAdmin").value = "";
    document.getElementById("authSection").style.display = "block";
    document.getElementById("printerSection").style.display = "none";
    document.getElementById("senhaAdmin").focus();
}

// =========================
// FUNÇÃO: Carregar Impressoras
// =========================
async function carregarImpressoras() {
    try {
        const response = await fetch("/api/printers");
        if (!response.ok) throw new Error("Erro ao carregar impressoras");

        const impressoras = await response.json();
        exibirImpressoras(impressoras);
    } catch (err) {
        mostrarMensagem("❌ Erro ao carregar impressoras: " + err.message, "error");
    }
}

// =========================
// FUNÇÃO: Exibir Impressoras
// =========================
function exibirImpressoras(impressoras) {
    const container = document.getElementById("impressorasList");
    
    if (impressoras.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; color: #999; padding: 40px;">
                <p>Nenhuma impressora cadastrada. Clique em "Adicionar Nova Impressora" para começar.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = impressoras.map(imp => `
        <div class="printer-card">
            <h3>🖨️ ${imp.nome}</h3>
            
            <div class="printer-info">
                <strong>Modelo:</strong> ${imp.modelo}
            </div>
            <div class="printer-info">
                <strong>IP:</strong> ${imp.ip}:${imp.puerto}
            </div>
            <div class="printer-info">
                <strong>Tipo:</strong> ${imp.tipo}
            </div>
            
            <div class="printer-info">
                <strong>Capacidades:</strong><br>
                ${imp.capacidades.colorido ? "✅ Colorido" : "❌ Sem Colorido"} | 
                ${imp.capacidades.preto_branco ? "✅ P&B" : "❌ Sem P&B"}<br>
                ${imp.capacidades.tamanhos.join(", ").toUpperCase()}
            </div>
            
            <div class="printer-info">
                <strong>Velocidade:</strong> ${imp.capacidades.velocidade_ppm} PPM
            </div>
            
            <div class="printer-info">
                <strong>Recursos:</strong><br>
                🔋 Toner: ${imp.toner_level}% | 📄 Papel: ${imp.papel_restante}%
            </div>
            
            <div class="printer-status ${imp.status === 'online' ? 'status-online' : 'status-offline'}">
                ${imp.status === 'online' ? '🟢 Online' : '🔴 Offline'}
            </div>
            
            <div class="printer-actions">
                <button class="btn-edit" onclick="editarImpressora(${imp.id})">✏️ Editar</button>
                <button class="btn-pdf" style="background:#ff9800;color:white;" onclick="imprimirPDFGenerico(${imp.id})">📄 Imprimir PDF Genérico</button>
                <button class="btn-delete" onclick="deletarImpressora(${imp.id})">🗑️ Deletar</button>
            </div>
        </div>
    `).join("");
}

// =========================
// FUNÇÃO: Abrir Formulário
// =========================
function abrirFormulario() {
    if (!autenticado) {
        alert("Você precisa estar autenticado!");
        return;
    }

    editandoId = null;
    document.getElementById("modalTitle").textContent = "Adicionar Impressora";
    document.getElementById("printerForm").reset();
    document.getElementById("printerForm").dataset.id = "";
    document.getElementById("printerModal").style.display = "block";
}

// =========================
// FUNÇÃO: Editar Impressora
// =========================
async function editarImpressora(id) {
    if (!autenticado) {
        alert("Você precisa estar autenticado!");
        return;
    }

    try {
        const response = await fetch(`/api/printers/${id}`);
        if (!response.ok) throw new Error("Erro ao carregar impressora");

        const imp = await response.json();
        
        editandoId = id;
        document.getElementById("modalTitle").textContent = "Editar Impressora";
        
        document.getElementById("nome").value = imp.nome;
        document.getElementById("modelo").value = imp.modelo;
        document.getElementById("ip").value = imp.ip;
        document.getElementById("puerto").value = imp.puerto;
        document.getElementById("tipo").value = imp.tipo;
        document.getElementById("colorido").checked = imp.capacidades.colorido;
        document.getElementById("pretoBranco").checked = imp.capacidades.preto_branco;
        document.getElementById("tamanhoA3").checked = imp.capacidades.tamanhos.includes("a3");
        document.getElementById("tamanhoA4").checked = imp.capacidades.tamanhos.includes("a4");
        document.getElementById("velocidade").value = imp.capacidades.velocidade_ppm;
        document.getElementById("toner").value = imp.toner_level;
        document.getElementById("papel").value = imp.papel_restante;
        document.getElementById("ativa").checked = imp.ativa;
        
        document.getElementById("printerForm").dataset.id = id;
        document.getElementById("printerModal").style.display = "block";
    } catch (err) {
        mostrarMensagem("❌ Erro ao carregar impressora: " + err.message, "error");
    }
}

// =========================
// FUNÇÃO: Fechar Formulário
// =========================
function fecharFormulario() {
    document.getElementById("printerModal").style.display = "none";
    editandoId = null;
    document.getElementById("printerForm").reset();
}

// =========================
// FUNÇÃO: Salvar Impressora
// =========================
async function salvarImpressora(event) {
    event.preventDefault();

    if (!autenticado) {
        alert("Você precisa estar autenticado!");
        return;
    }

    const tamanhos = [];
    if (document.getElementById("tamanhoA4").checked) tamanhos.push("a4");
    if (document.getElementById("tamanhoA3").checked) tamanhos.push("a3");

    if (tamanhos.length === 0) {
        alert("Selecione pelo menos um tamanho!");
        return;
    }

    const dados = {
        nome: document.getElementById("nome").value,
        modelo: document.getElementById("modelo").value,
        tipo: document.getElementById("tipo").value,
        ip: document.getElementById("ip").value,
        puerto: parseInt(document.getElementById("puerto").value),
        ativa: document.getElementById("ativa").checked,
        capacidades: {
            colorido: document.getElementById("colorido").checked,
            preto_branco: document.getElementById("pretoBranco").checked,
            tamanhos: tamanhos,
            duplex: true,
            velocidade_ppm: parseInt(document.getElementById("velocidade").value)
        },
        status: "online",
        toner_level: parseInt(document.getElementById("toner").value),
        papel_restante: parseInt(document.getElementById("papel").value)
    };

    try {
        let response;
        let metodo = "POST";
        let url = "/api/printers";

        if (editandoId) {
            metodo = "PUT";
            url = `/api/printers/${editandoId}`;
        }

        response = await fetch(url, {
            method: metodo,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dados)
        });

        if (!response.ok) {
            const erro = await response.json();
            throw new Error(erro.error || "Erro ao salvar");
        }

        const resultado = await response.json();
        
        if (editandoId) {
            mostrarMensagem("✅ Impressora atualizada com sucesso!", "success");
        } else {
            mostrarMensagem("✅ Impressora adicionada com sucesso!", "success");
        }

        fecharFormulario();
        setTimeout(() => carregarImpressoras(), 1000);
    } catch (err) {
        mostrarMensagem("❌ Erro: " + err.message, "error");
    }
}

// =========================
// FUNÇÃO: Deletar Impressora
// =========================
async function deletarImpressora(id) {
    if (!autenticado) {
        alert("Você precisa estar autenticado!");
        return;
    }

    if (!confirm("⚠️ Tem certeza que deseja deletar esta impressora?")) {
        return;
    }

    try {
        const response = await fetch(`/api/printers/${id}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            const erro = await response.json();
            throw new Error(erro.error || "Erro ao deletar");
        }

        mostrarMensagem("✅ Impressora deletada com sucesso!", "success");
        setTimeout(() => carregarImpressoras(), 1000);
    } catch (err) {
        mostrarMensagem("❌ Erro: " + err.message, "error");
    }
}

// =========================
// FUNÇÃO: Mostrar Mensagem
// =========================
function mostrarMensagem(texto, tipo) {
    const msg = document.getElementById("mensagem");
    msg.textContent = texto;
    msg.className = `message ${tipo}`;
    msg.style.display = "block";

    setTimeout(() => {
        msg.style.display = "none";
    }, 5000);
}

// =========================
// EVENTO: Enter na autenticação
// =========================
document.addEventListener("DOMContentLoaded", () => {
    const senhaInput = document.getElementById("senhaAdmin");
    if (senhaInput) {
        senhaInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") autenticar();
        });
    }

    // Fechar modal ao clicar fora
    window.onclick = function(event) {
        const modal = document.getElementById("printerModal");
        if (event.target === modal) {
            fecharFormulario();
        }
    };

    // Foco no campo de senha
    senhaInput.focus();
});
