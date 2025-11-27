# 🖨️ Guia de Gerenciamento de Impressoras

## 📋 Visão Geral

Este sistema permite:
1. **Configurar impressoras** com suas capacidades (tipos de papel, cores, tamanhos)
2. **Verificar status** de impressoras em tempo real
3. **Selecionar automaticamente** a melhor impressora para cada pedido
4. **Validar compatibilidade** entre pedidos e impressoras

---

## 🗂️ Arquivos Principais

### 1. `page_print/printers.json`
Configuração de todas as impressoras da rede. Contém:
- **Dados da impressora**: nome, modelo, IP, porta
- **Capacidades**: tipos de papel, tamanhos, cores, gramaturas
- **Status**: online/offline, nível de toner, papel restante

### 2. `printer-manager.js`
Módulo Node.js com funções para gerenciar impressoras:
- Carregar/salvar configurações
- Verificar status online
- Selecionar melhor impressora
- Validar compatibilidade
- Adicionar/atualizar/remover impressoras

### 3. `server.js`
Routes HTTP para integração com o frontend

---

## 🚀 Como Usar

### Adicionar uma Nova Impressora

**Via HTTP (POST):**
```bash
curl -X POST http://localhost:3000/api/printers \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Lexmark Pro",
    "modelo": "Lexmark MS826de",
    "tipo": "impressora_laser",
    "ip": "192.168.1.20",
    "puerto": 9100,
    "ativa": true,
    "capacidades": {
      "colorido": false,
      "preto_branco": true,
      "tamanhos": ["a4"],
      "tipos_papel": ["comum", "couche"],
      "gramaturas": ["75g", "90g", "120g"],
      "duplex": true,
      "velocidade_ppm": 50
    },
    "status": "online",
    "toner_level": 100,
    "papel_restante": 100
  }'
```

### Obter Status de Todas as Impressoras

```bash
curl http://localhost:3000/api/printers/status
```

Exemplo de resposta:
```json
[
  {
    "id": 1,
    "nome": "Xerox WorkCentre 5335",
    "modelo": "Xerox WorkCentre 5335",
    "status": "online",
    "ativa": true,
    "toner_level": 85,
    "papel_restante": 90,
    "capacidades": { ... }
  }
]
```

### Selecionar Impressora para um Pedido

**Via HTTP (POST):**
```bash
curl -X POST http://localhost:3000/api/printers/select \
  -H "Content-Type: application/json" \
  -d '{
    "colorido": true,
    "tamanho": "a4",
    "tipo_papel": "fotografico",
    "gramatura": "200g"
  }'
```

O sistema retornará a impressora **mais adequada** considerando:
1. Compatibilidade com configurações
2. Nível de toner
3. Papel disponível
4. Velocidade de impressão

### Verificar Compatibilidade

```bash
curl -X POST http://localhost:3000/api/printers/verify \
  -H "Content-Type: application/json" \
  -d '{
    "pedido": {
      "colorido": true,
      "tamanho": "a3",
      "tipo_papel": "glossy",
      "gramatura": "150g"
    },
    "impressoraId": 1
  }'
```

### Atualizar Nível de Toner/Papel

```bash
curl -X PUT http://localhost:3000/api/printers/1 \
  -H "Content-Type: application/json" \
  -d '{
    "toner_level": 45,
    "papel_restante": 60,
    "status": "online"
  }'
```

### Remover uma Impressora

```bash
curl -X DELETE http://localhost:3000/api/printers/2
```

---

## 📝 Estrutura de um Pedido (para seleção de impressora)

```json
{
  "colorido": true|false,           // Se é colorido
  "tamanho": "a3|a4|a5|a6",        // Tamanho do papel
  "tipo_papel": "comum|fotografico|glossy|couche|bond",
  "gramatura": "75g|90g|120g|150g|200g"
}
```

---

## 🔧 Configurar Tipos de Papel

No `printers.json`, você pode definir quais tipos de papel cada impressora suporta:

```json
"tipos_papel": [
  "comum",        // Sulfite branco padrão
  "fotografico",  // Papel fotográfico brilhante
  "glossy",       // Couché brilhante
  "couche",       // Couché fosco
  "bond"          // Cartolina
]
```

---

## 🎨 Tipos de Papel Padrões

| Tipo | Descrição | Gramaturas Suportadas |
|------|-----------|------------------------|
| comum | Papel sulfite branco | 75g, 90g, 120g |
| fotografico | Papel fotográfico brilhante | 150g, 200g, 240g |
| glossy | Papel couché brilhante | 120g, 150g, 200g |
| couche | Papel couché fosco | 90g, 120g, 150g, 200g |
| bond | Cartolina | 150g, 200g, 240g |

---

## 🔌 Integração com Hardware Real

Para conectar com impressoras reais, você precisará:

### Opção 1: CUPS (Linux/Mac)
```javascript
const { execSync } = require('child_process');

function imprimirCups(arquivo, impressora) {
  try {
    execSync(`lp -d ${impressora} "${arquivo}"`);
    return true;
  } catch (err) {
    return false;
  }
}
```

### Opção 2: Print Spooler (Windows)
```javascript
const { execSync } = require('child_process');

function imprimirWindows(arquivo, impressora) {
  try {
    execSync(`print /d:"${impressora}" "${arquivo}"`);
    return true;
  } catch (err) {
    return false;
  }
}
```

### Opção 3: API REST da Impressora
Muitas impressoras modernas têm API REST própria para controle:

```javascript
async function obterStatusRest(ip, porta = 80) {
  const res = await fetch(`http://${ip}:${porta}/api/device`);
  return res.json(); // Contém toner, papel, etc
}
```

---

## 💾 Salvar/Carregar Configuração

### Via JavaScript (Node.js):
```javascript
const printerManager = require('./printer-manager');

// Carregar
const config = printerManager.carregarConfiguracaoImpressoras();

// Atualizar impressora
printerManager.atualizarImpressora(1, {
  toner_level: 50,
  status: "online"
});

// Salvar automaticamente
```

---

## ⚠️ Tratamento de Erros

O sistema retorna mensagens claras quando há problemas:

```json
{
  "compativel": false,
  "motivo": "Tamanho a3 não suportado; Tipo de papel 'bond' não suportado"
}
```

---

## 🎯 Fluxo Completo de Impressão

1. **Usuário insere código do pedido** em `page_print`
2. **Sistema busca pedido** no histórico
3. **Extrai configurações**: cor, tamanho, papel, gramatura
4. **Chama `/api/printers/select`** com essas configurações
5. **Backend seleciona impressora** mais adequada
6. **Valida compatibilidade** e status (online, papel, toner)
7. **Retorna impressora escolhida** com detalhes
8. **Exibe mensagem de sucesso** ou erro para o usuário

---

## 📊 Exemplos de Pedidos

### Pedido 1: Documento colorido em A4
```json
{
  "colorido": true,
  "tamanho": "a4",
  "tipo_papel": "comum",
  "gramatura": "90g"
}
```
✅ Será selecionada: **Xerox WorkCentre 5335** (suporta tudo e está online)

### Pedido 2: Brochura fotográfica em A3
```json
{
  "colorido": true,
  "tamanho": "a3",
  "tipo_papel": "fotografico",
  "gramatura": "200g"
}
```
✅ Será selecionada: **Xerox WorkCentre 5335** (suporta A3 e fotográfico)
❌ **HP LaserJet** não suporta (só A4 e preto-branco)

### Pedido 3: Documento simples em preto e branco
```json
{
  "colorido": false,
  "tamanho": "a4",
  "tipo_papel": "comum",
  "gramatura": "75g"
}
```
✅ Será selecionada: Qualquer uma (todas suportam). **HP** é mais rápida (40 PPM).

---

## 🔄 Próximos Passos

1. **Integrar com drivers** das impressoras reais
2. **Adicionar monitoramento** de nível de toner/papel
3. **Criar fila de impressão** para gerenciar múltiplos pedidos
4. **Adicionar log de impressões** com timestamp
5. **Implementar alertas** quando toner/papel acabar
6. **Criar interface** de administração para gerenciar impressoras
