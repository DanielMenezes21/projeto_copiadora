const a4PretoBranco = document.getElementById("a4PretoBranco");
const a4Colorido = document.getElementById("a4Colorido");
const a3PretoBranco = document.getElementById("a3PretoBranco");
const a3Colorido = document.getElementById("a3Colorido");
const salvarBtn = document.getElementById("salvar");
const statusMsg = document.getElementById("statusMsg");

// Navegação entre seções
const navLinks = document.querySelectorAll('nav a');
const sections = {
  'config': document.querySelector('.card'),
  'reports': document.getElementById('reports-section')
};

navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const section = link.getAttribute('data-section');
    
    // Atualiza links ativos
    navLinks.forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    
    // Mostra seção correspondente
    Object.entries(sections).forEach(([key, el]) => {
      if (el) el.style.display = key === section ? 'block' : 'none';
    });
  });
});

// Carrega os valores atuais ao abrir o painel
async function carregarConfig() {
  try {
    const res = await fetch("/api/config");
    if (!res.ok) throw new Error("Falha ao carregar");
    const data = await res.json();
    a4PretoBranco.value = data.a4PretoBranco;
    a4Colorido.value = data.a4Colorido;
    a3PretoBranco.value = data.a3PretoBranco;
    a3Colorido.value = data.a3Colorido;
  } catch (err) {
    console.error(err);
    statusMsg.textContent = "Erro ao carregar configurações.";
    statusMsg.style.color = "red";
  }
}

// Salva as novas configurações
async function salvarConfig() {
  const config = {
    a4PretoBranco: parseFloat(a4PretoBranco.value),
    a4Colorido: parseFloat(a4Colorido.value),
    a3PretoBranco: parseFloat(a3PretoBranco.value),
    a3Colorido: parseFloat(a3Colorido.value),
  };

  if (Object.values(config).some(v => isNaN(v))) {
    statusMsg.textContent = "Preencha todos os campos corretamente.";
    statusMsg.style.color = "red";
    return;
  }

  try {
    const res = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });

    const result = await res.json();
    statusMsg.textContent = result.message || "Configurações atualizadas!";
    statusMsg.style.color = "green";

    // Recarrega o arquivo JSON no servidor
    await carregarConfig();
  } catch (err) {
    console.error(err);
    statusMsg.textContent = "Erro ao salvar configurações.";
    statusMsg.style.color = "red";
  }
}

window.addEventListener("load", carregarConfig);
salvarBtn.addEventListener("click", salvarConfig);
