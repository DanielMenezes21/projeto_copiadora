# 📐 Arquitetura do Sistema de Impressoras

## 🏗️ Diagrama Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                      PÁGINA DE IMPRESSÃO                        │
│                   (page_print/print_page.html)                  │
│                                                                 │
│   [Código] → [Imprimir] → print_page.js → API                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
         ┌───────────────────────────────┐
         │    SERVIDOR NODE.JS           │
         │       (server.js)             │
         │                               │
         │  HTTP Routes:                 │
         │  GET  /api/printers           │
         │  POST /api/printers/select    │
         │  POST /api/printers/verify    │
         │  PUT  /api/printers/:id       │
         │  DELETE /api/printers/:id     │
         └───────────┬───────────────────┘
                     │
                     ↓
         ┌───────────────────────────────┐
         │  PRINTER MANAGER              │
         │  (printer-manager.js)         │
         │                               │
         │  - Carregar config            │
         │  - Verificar status           │
         │  - Selecionar impressora      │
         │  - Validar compatibilidade    │
         └───────────┬───────────────────┘
                     │
                     ↓
         ┌───────────────────────────────┐
         │   CONFIGURAÇÃO                │
         │   (printers.json)             │
         │                               │
         │   - Xerox WorkCentre          │
         │   - HP LaserJet               │
         │   - Canon imagePRESS          │
         └───────────────────────────────┘
```

---

## 🔄 Fluxo de Impressão Detalhado

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USUÁRIO CLICA "IMPRIMIR"                                     │
└─────────────────────┬───────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. SISTEMA BUSCA PEDIDO NO HISTÓRICO                            │
│    GET /api/historic                                            │
│    Extrai: cor, tamanho, papel, gramatura                       │
└─────────────────────┬───────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. CHAMA API DE SELEÇÃO                                         │
│    POST /api/printers/select                                    │
│    Envia: { colorido, tamanho, tipo_papel, gramatura }          │
└─────────────────────┬───────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. PRINTER MANAGER VALIDA CADA IMPRESSORA                       │
│                                                                 │
│    Para cada impressora:                                        │
│    ✓ Está online?                                              │
│    ✓ Suporta cor?                                              │
│    ✓ Suporta tamanho?                                          │
│    ✓ Suporta tipo de papel?                                    │
│    ✓ Suporta gramatura?                                        │
└─────────────────────┬───────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. PRIORIZA POR RECURSOS                                        │
│                                                                 │
│    1º: Mais toner                                              │
│    2º: Mais papel                                              │
│    3º: Mais rápida                                             │
└─────────────────────┬───────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. RETORNA MELHOR IMPRESSORA                                    │
│                                                                 │
│    {                                                            │
│      nome: "Xerox WorkCentre 5335"                             │
│      modelo: "Xerox WorkCentre 5335"                           │
│      toner_level: 85,                                          │
│      papel_restante: 90,                                       │
│      velocidade: 35 PPM                                        │
│    }                                                            │
└─────────────────────┬───────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. EXIBE RESULTADO PARA USUÁRIO                                 │
│                                                                 │
│    ✅ Pedido enviado para impressora: Xerox                    │
│    📍 Modelo: Xerox WorkCentre 5335                            │
│    🔋 Toner: 85%                                               │
│    📄 Papel: 90%                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Estrutura de Dados

### Impressora (printers.json)
```json
{
  "id": 1,                          ← ID único
  "nome": "Xerox WorkCentre 5335",  ← Nome amigável
  "modelo": "...",                  ← Modelo exato
  "tipo": "multifuncional",         ← Tipo
  "ip": "192.168.1.10",             ← IP na rede
  "puerto": 9100,                   ← Porta padrão
  "ativa": true,                    ← Ativada?
  "capacidades": {
    "colorido": true,               ← Suporta cor?
    "preto_branco": true,           ← Suporta P&B?
    "tamanhos": ["a3", "a4", "a5"], ← Tamanhos
    "tipos_papel": [...],           ← Tipos de papel
    "gramaturas": [...],            ← Gramaturas
    "duplex": true,                 ← Frente/verso?
    "velocidade_ppm": 35            ← PPM
  },
  "status": "online",               ← Online/offline
  "toner_level": 85,                ← % toner
  "papel_restante": 90              ← % papel
}
```

### Pedido (para seleção)
```json
{
  "colorido": true,                 ← Quer colorido?
  "tamanho": "a4",                  ← Que tamanho?
  "tipo_papel": "comum",            ← Que papel?
  "gramatura": "90g"                ← Que gramatura?
}
```

### Compatibilidade (resposta)
```json
{
  "compativel": true|false,         ← Pode imprimir?
  "motivo": "string"                ← Por quê?
}
```

---

## 🔌 Endpoints da API

### GET /api/printers
```
Retorna: Array de todas as impressoras
Exemplo:
[
  { id: 1, nome: "Xerox ...", ... },
  { id: 2, nome: "HP ...", ... }
]
```

### GET /api/printers/status
```
Retorna: Array com status atualizado (online/offline)
Verifica: Conectividade com cada impressora
```

### GET /api/printers/:id
```
Retorna: Detalhes de uma impressora específica
```

### POST /api/printers/select
```
Entrada: { colorido, tamanho, tipo_papel, gramatura }
Retorna: { impressora com maior pontuação }
Lógica: Valida compatibilidade + prioriza recursos
```

### POST /api/printers/verify
```
Entrada: { pedido, impressoraId }
Retorna: { compativel, motivo }
Lógica: Valida apenas compatibilidade (sem priorização)
```

### POST /api/printers
```
Entrada: { nome, ip, capacidades, ... }
Retorna: { impressora criada com novo ID }
Ação: Adiciona à printers.json
```

### PUT /api/printers/:id
```
Entrada: { campos a atualizar }
Retorna: { impressora atualizada }
Ação: Atualiza toner, papel, status, etc
```

### DELETE /api/printers/:id
```
Retorna: { impressora removida }
Ação: Remove de printers.json
```

---

## 🎛️ Funções do printer-manager.js

```
┌─────────────────────────────────────────────────────┐
│        PRINTER MANAGER (printer-manager.js)         │
├─────────────────────────────────────────────────────┤
│                                                     │
│ I/O:                                               │
│ ├─ carregarConfiguracaoImpressoras()               │
│ └─ salvarConfiguracaoImpressoras(config)           │
│                                                     │
│ Status:                                            │
│ ├─ verificarStatusImpressora(ip, porta)            │
│ ├─ atualizarStatusTodas()                          │
│ └─ obterRelatorioPrinters()                        │
│                                                     │
│ Seleção:                                           │
│ └─ selecionarMelhorImpressora(pedido)              │
│                                                     │
│ Validação:                                         │
│ └─ verificarCompatibilidade(pedido, id)            │
│                                                     │
│ CRUD:                                              │
│ ├─ adicionarImpressora(nova)                       │
│ ├─ atualizarImpressora(id, dados)                  │
│ └─ removerImpressora(id)                           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🔀 Integração Frontend-Backend

```
print_page.html
    │
    └─→ onclick="processarImpressao()"
           │
           └─→ print_page.js
                  │
                  ├─ buscarPedido(codigo)
                  │  └─→ GET /api/historic
                  │
                  ├─ selecionarImpressoraPorPedido(pedido)
                  │  └─→ POST /api/printers/select
                  │
                  └─ alert(resultado)

FLUXO:
print_page.js → API routes (server.js) → printer-manager.js → printers.json
```

---

## 💾 Persistência de Dados

```
printers.json (Disco)
    │
    ├─ Leitura: carregarConfiguracaoImpressoras()
    │           ↓
    │           Objeto JavaScript
    │           ↓
    │           Memória (processamento)
    │           ↓
    │           Objeto JavaScript
    │           ↓
    │ Escrita: salvarConfiguracaoImpressoras(config)
    │           ↓
    │           Volta para Disco
    │
    └─ Sincronizado via FS (fs.readFileSync/writeFileSync)
```

---

## 🚦 Fluxo de Decisão (Seleção)

```
            ┌─ Impressora 1
            │  ├─ Online? → Sim
            │  ├─ Compatível? → Sim (85 pontos)
            │
Pedido A ──┤
            │  ├─ Impressora 2
            │  │  ├─ Online? → Sim
            │  │  ├─ Compatível? → Sim (70 pontos)
            │  │
            │  └─ Impressora 3
               ├─ Online? → Não ✗
               ├─ Descartada

RESULTADO: Impressora 1 (85 > 70)
```

---

## 📊 Diagrama de Validação

```
Entrada: { colorido: true, tamanho: "a3", tipo_papel: "fotografico" }
          │
          ├─ Impressora 1
          │  ├─ Colorido suportado? ✅ Sim
          │  ├─ Tamanho A3 suportado? ✅ Sim
          │  ├─ Papel "fotografico"? ✅ Sim
          │  └─ COMPATÍVEL ✅
          │
          ├─ Impressora 2
          │  ├─ Colorido suportado? ❌ Não
          │  └─ NÃO COMPATÍVEL ❌
          │
          └─ Impressora 3
             ├─ Colorido suportado? ✅ Sim
             ├─ Tamanho A3 suportado? ✅ Sim
             ├─ Papel "fotografico"? ✅ Sim
             ├─ Status: offline ❌
             └─ OFFLINE ❌

RESULTADO: Impressora 1 é a única válida e está online
```

---

**Versão:** 1.0  
**Criado:** Novembro 2025
