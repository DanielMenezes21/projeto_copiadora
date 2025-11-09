const tableBody = document.querySelector('#historicTable tbody');
const emptyMsg = document.getElementById('emptyMsg');
const btnRefresh = document.getElementById('btnRefresh');
const modal = document.getElementById('modalDetalhes');
const modalContent = document.getElementById('detalhesConteudo');
const closeBtn = document.querySelector('.modal .close');

// Fecha o modal quando clica no X
if (closeBtn) {
  closeBtn.onclick = function() {
    modal.style.display = "none";
  }
}

// Fecha o modal quando clica fora dele
window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}

function mostrarDetalhes(config) {
  // Garante que config existe
  config = config || {};
  
  modalContent.innerHTML = `
    <div class="detalhes-grid">
      <p><strong>Número de Cópias:</strong> ${config.copias || 1}</p>
      <p><strong>Cor:</strong> ${(config.cor === 'colorido' ? 'Colorido' : 'Preto e Branco')}</p>
      <p><strong>Tamanho do Papel:</strong> ${(config.tamanho || 'A4').toUpperCase()}</p>
      <p><strong>Número de Páginas:</strong> ${config.paginas || 1}</p>
      <p><strong>Frente e Verso:</strong> ${config.frenteVerso ? 'Sim' : 'Não'}</p>
      <p><strong>Orientação:</strong> ${config.orientacao === 'paisagem' ? 'Paisagem' : 'Retrato'}</p>
    </div>
  `;
  modal.style.display = "block";
}

async function loadHistoric() {
  try {
    const res = await fetch('/api/historic');
    if (!res.ok) throw new Error('Falha ao buscar histórico');
    const data = await res.json();

    tableBody.innerHTML = '';
    if (!Array.isArray(data) || data.length === 0) {
      emptyMsg.style.display = 'block';
      return;
    }

    emptyMsg.style.display = 'none';
    data.forEach(item => {
      const tr = document.createElement('tr');
      
      // ID
      const tdId = document.createElement('td');
      tdId.textContent = item.id || '';
      
      // Código
      const tdCodigo = document.createElement('td');
      tdCodigo.textContent = item.codigo || '';
      
      // Documento
      const tdDoc = document.createElement('td');
      tdDoc.textContent = item.documento || '(Sem nome)';
      
      // Valor
      const tdValor = document.createElement('td');
      const valor = item.valor ? parseFloat(item.valor) : 0;
      tdValor.textContent = isNaN(valor) ? 'R$ 0,00' : `R$ ${valor.toFixed(2)}`;
      
      // Data/Hora
      const tdDatetime = document.createElement('td');
      const d = new Date(item.datetime || '');
      tdDatetime.textContent = isNaN(d.getTime()) ? '-' : d.toLocaleString();
      
      // Botão de Detalhes
      const tdAcoes = document.createElement('td');
      if (item.configuracoes) {
        const btnDetalhes = document.createElement('button');
        btnDetalhes.textContent = 'Ver Detalhes';
        btnDetalhes.className = 'btn-detalhes';
        btnDetalhes.onclick = () => mostrarDetalhes(item.configuracoes);
        tdAcoes.appendChild(btnDetalhes);
      }

      tr.appendChild(tdId);
      tr.appendChild(tdCodigo);
      tr.appendChild(tdDoc);
      tr.appendChild(tdValor);
      tr.appendChild(tdDatetime);
      tr.appendChild(tdAcoes);
      tableBody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    emptyMsg.textContent = 'Erro ao carregar histórico.';
    emptyMsg.style.display = 'block';
  }
}

btnRefresh.addEventListener('click', loadHistoric);
window.addEventListener('load', loadHistoric);
