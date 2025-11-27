# 📚 Índice - Sistema de Impressoras

## 📋 Resumo Executivo

**Problema Resolvido:**
- ✅ Como conectar impressoras ao sistema
- ✅ Como configurar tipos de papel suportados
- ✅ Como detectar se impressora está online
- ✅ Como selecionar impressora automaticamente

---

## 📁 Arquivos Criados

### 1. **RESUMO_IMPRESSORAS.md** ⭐ COMECE AQUI
Resumo executivo com exemplos rápidos e estrutura básica. Leia isto primeiro!

### 2. **PRINTER_GUIDE.md** 📖 DOCUMENTAÇÃO COMPLETA
Documentação detalhada com:
- Explicação de cada função
- Exemplos de uso de API
- Tratamento de erros
- Próximos passos

### 3. **printer-manager.js** 💻 CÓDIGO BACKEND
Módulo Node.js com todas as funções:
- `carregarConfiguracaoImpressoras()`
- `verificarStatusImpressora(ip, porta)`
- `selecionarMelhorImpressora(pedido)`
- `verificarCompatibilidade(pedido, id)`
- `adicionarImpressora(nova)`
- `atualizarImpressora(id, dados)`
- `removerImpressora(id)`
- `obterRelatorioPrinters()`

### 4. **page_print/printers.json** 📊 BANCO DE DADOS
Configuração de todas as impressoras com:
- 3 exemplos pré-configurados
- Tipos de papel suportados
- Capacidades de cada uma

### 5. **server.js** (MODIFICADO) 🔌 API HTTP
Novas rotas adicionadas:
- `GET /api/printers` - listar todas
- `GET /api/printers/status` - verificar online
- `GET /api/printers/:id` - detalhes
- `POST /api/printers/select` - escolher melhor
- `POST /api/printers/verify` - validar
- `POST /api/printers` - adicionar
- `PUT /api/printers/:id` - atualizar
- `DELETE /api/printers/:id` - remover

### 6. **page_print/print_page.js** (MODIFICADO) 🖨️ FRONTEND
Funções atualizadas:
- `obterStatusImpressoras()`
- `selecionarImpressoraPorPedido(pedido)`
- `processarImpressao()` - fluxo completo

### 7. **test-printers.sh** 🧪 TESTES (Linux/Mac)
Script bash para testar a API

### 8. **test-printers.ps1** 🧪 TESTES (Windows)
Script PowerShell para testar a API

---

## 🚀 Como Começar

### Passo 1: Ler a Documentação
1. Comece com `RESUMO_IMPRESSORAS.md` (visão geral)
2. Depois leia `PRINTER_GUIDE.md` (detalhes)

### Passo 2: Entender a Estrutura
```
page_print/
├── print_page.html      (interface)
├── print_page.js        (lógica atualizada)
├── print_page.css       (estilo)
└── printers.json        (configuração de impressoras)

printer-manager.js       (backend - funções principais)
server.js               (API HTTP - rotas)
```

### Passo 3: Testar a API
```bash
# Windows
.\test-printers.ps1

# Linux/Mac
./test-printers.sh
```

---

## 🎯 Exemplos Rápidos

### Adicionar Impressora
```javascript
POST /api/printers
{
  "nome": "HP Color LaserJet",
  "ip": "192.168.1.30",
  "capacidades": {
    "colorido": true,
    "tamanhos": ["a4"],
    "tipos_papel": ["comum", "glossy"]
  }
}
```

### Selecionar Impressora
```javascript
POST /api/printers/select
{
  "colorido": true,
  "tamanho": "a4",
  "tipo_papel": "comum",
  "gramatura": "90g"
}
```

### Verificar Status
```javascript
GET /api/printers/status
// Retorna todas com status online/offline
```

---

## 📊 Fluxo de Funcionamento

```
User clica "Imprimir"
         ↓
Insere código do pedido
         ↓
Sistema busca pedido e configurações
         ↓
Chama POST /api/printers/select
         ↓
Backend verifica TODAS as impressoras
    - Status online?
    - Suporta cor?
    - Suporta tamanho?
    - Suporta tipo de papel?
    - Suporta gramatura?
         ↓
Seleciona a MELHOR (mais recursos disponíveis)
         ↓
Exibe resultado ao usuário
```

---

## 🔧 Customizações Possíveis

### 1. Adicionar Novo Tipo de Papel
Em `page_print/printers.json`:
```json
"papel_padroes": {
  "meu_tipo": {
    "descricao": "Descrição",
    "gramaturas_suportadas": ["75g", "90g"]
  }
}
```

### 2. Modificar Critério de Seleção
Em `printer-manager.js`, função `selecionarMelhorImpressora()`:
```javascript
// Mudar ordem de prioridade
// 1) Mais toner
// 2) Mais papel
// 3) Mais rápida
```

### 3. Integrar com Hardware Real
Em `printer-manager.js`, adicionar:
```javascript
// CUPS (Linux)
execSync(`lp -d ${impressora} "${arquivo}"`);

// Print Spooler (Windows)
execSync(`print /d:"${impressora}" "${arquivo}"`);
```

---

## 📞 Suporte e Dúvidas

| Dúvida | Arquivo | Função |
|--------|---------|--------|
| Visão geral? | RESUMO_IMPRESSORAS.md | - |
| Detalhes técnicos? | PRINTER_GUIDE.md | - |
| Como adicionar? | printer-manager.js | adicionarImpressora() |
| Como selecionar? | printer-manager.js | selecionarMelhorImpressora() |
| Como validar? | printer-manager.js | verificarCompatibilidade() |
| Como testar? | test-printers.ps1 | - |

---

## ✅ Checklist de Implementação

- [x] Carregar configuração de impressoras
- [x] Verificar status online/offline
- [x] Selecionar impressora por critérios
- [x] Validar compatibilidade
- [x] Adicionar/Atualizar/Remover impressoras
- [x] API HTTP completa
- [x] Integração com frontend
- [x] Exemplos de testes
- [x] Documentação

---

## 🎓 Próximos Passos (Futuros)

1. **Integração com hardware real**
   - CUPS API (Linux)
   - Print Spooler (Windows)
   - Impressoras network com API REST

2. **Monitoramento automático**
   - Poll de status a cada 5 minutos
   - Alertas quando toner/papel acabar

3. **Fila de impressão**
   - Gerenciar múltiplos pedidos
   - Priorização
   - Retry automático

4. **Dashboard de administração**
   - Interface web para gerenciar impressoras
   - Gráficos de uso
   - Histórico de impressões

5. **Integração com histórico**
   - Registrar qual impressora foi usada
   - Custos por impressora
   - Relatórios de uso

---

## 📌 Notas Importantes

- **printers.json** é o "banco de dados" de configuração - edite aqui para adicionar impressoras
- **printer-manager.js** é o "cérebro" - contém toda a lógica
- **server.js** é a "interface" - rotas HTTP para comunicação
- **print_page.js** é a "aplicação" - chama a API

---

**Versão:** 1.0  
**Data:** Novembro 2025  
**Status:** ✅ Pronto para uso
