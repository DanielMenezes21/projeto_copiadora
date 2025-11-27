# 🔐 Gerenciador de Impressoras - Admin

## 📍 Como Acessar

### URL:
```
http://localhost:3000/admin/printers
```

### Autenticação:
- **Senha padrão:** `admin123`
- ⚠️ **IMPORTANTE:** Mude a senha em produção!

---

## 🔒 Segurança

A página está protegida por autenticação com senha. Para alterá-la, edite `private/admin-printers.js`:

```javascript
const SENHA_ADMIN = "admin123"; // ← MUDE ISSO
```

### Recomendações de Segurança:
1. ✅ Mude a senha padrão
2. ✅ Use HTTPS em produção
3. ✅ Implemente autenticação mais robusta (JWT, OAuth, etc)
4. ✅ Adicione log de ações
5. ✅ Restrinja acesso por IP (opcional)

---

## 🖨️ Como Adicionar uma Impressora

### Método 1: Interface Web (Recomendado)

1. **Acesse:** `http://localhost:3000/admin/printers`
2. **Autentique:** Digite a senha
3. **Clique:** "Adicionar Nova Impressora"
4. **Preencha os campos:**
   - **Nome:** Ex: "Xerox Sala 201"
   - **Modelo:** Ex: "Xerox WorkCentre 5335"
   - **IP:** Ex: "192.168.1.10" *(IP da impressora na rede)*
   - **Porta:** Padrão: 9100
   - **Tipo:** Multifuncional, Laser, ou Jato de Tinta
   - **Colorido:** ✅ ou ❌
   - **Preto e Branco:** ✅ ou ❌
   - **Tamanhos:** A3, A4 (ou ambos)
   - **Velocidade:** PPM (ex: 35)
   - **Toner:** % (ex: 100)
   - **Papel:** % (ex: 100)
   - **Ativa:** ✅ para ativar
5. **Clique:** "Salvar Impressora"

### Método 2: API REST

```bash
curl -X POST http://localhost:3000/api/printers \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Xerox WorkCentre",
    "modelo": "Xerox WorkCentre 5335",
    "tipo": "multifuncional",
    "ip": "192.168.1.10",
    "puerto": 9100,
    "ativa": true,
    "capacidades": {
      "colorido": true,
      "preto_branco": true,
      "tamanhos": ["a3", "a4"],
      "duplex": true,
      "velocidade_ppm": 35
    },
    "status": "online",
    "toner_level": 100,
    "papel_restante": 100
  }'
```

---

## 📝 Campos Obrigatórios

- ✅ **Nome** - Nome da impressora
- ✅ **Modelo** - Modelo exato
- ✅ **IP** - IP na rede (ex: 192.168.1.10)
- ✅ **Velocidade (PPM)** - Páginas por minuto

---

## 🎯 Campos Opcionais

- ⚪ **Porta** - Padrão: 9100
- ⚪ **Tipo** - Padrão: Multifuncional
- ⚪ **Colorido** - Padrão: ✅
- ⚪ **Preto e Branco** - Padrão: ✅
- ⚪ **Tamanhos** - Padrão: A4
- ⚪ **Toner** - Padrão: 100%
- ⚪ **Papel** - Padrão: 100%
- ⚪ **Ativa** - Padrão: ✅

---

## ✏️ Como Editar uma Impressora

1. Acesse o gerenciador
2. Autentique
3. Clique em **"✏️ Editar"** na impressora desejada
4. Altere os campos
5. Clique **"Salvar Impressora"**

---

## 🗑️ Como Deletar uma Impressora

1. Acesse o gerenciador
2. Autentique
3. Clique em **"🗑️ Deletar"** na impressora desejada
4. Confirme a exclusão

---

## 🔍 Entendendo os Campos

### Nome
O nome amigável da impressora. Ex: "Xerox Sala 201", "HP Marketing"

### Modelo
O modelo exato da impressora. Ex: "Xerox WorkCentre 5335", "HP LaserJet Pro M404n"

### IP
Endereço IP da impressora na rede local. Como descobrir:
- Acesse o painel da impressora
- Procure por "Rede" ou "Network"
- Anote o IPv4

### Porta
Porta de comunicação. Geralmente **9100** para impressoras de rede

### Tipo
Categoria da impressora:
- **Multifuncional** - Imprime, copia, escaneia
- **Laser** - Impressora laser
- **Jato de Tinta** - Impressora jato de tinta

### Colorido/Preto e Branco
Marque os tipos de impressão suportados

### Tamanhos
Papéis suportados:
- **A4** - Padrão (21 x 29,7 cm)
- **A3** - Grande (29,7 x 42 cm)

### Velocidade (PPM)
Páginas por minuto. Ex: 35 PPM = 35 páginas por minuto

### Toner/Papel
Percentual de suprimentos disponíveis (0-100%)

### Status
- 🟢 **Online** - Impressora conectada e funcionando
- 🔴 **Offline** - Impressora desconectada

### Ativa
Marque para ativar a impressora no sistema

---

## 🚀 Exemplo Prático

### Adicionando uma Xerox WorkCentre 5335

1. **Nome:** Xerox Sala 201
2. **Modelo:** Xerox WorkCentre 5335
3. **IP:** 192.168.1.10
4. **Porta:** 9100
5. **Tipo:** Multifuncional
6. **Colorido:** ✅
7. **Preto e Branco:** ✅
8. **Tamanhos:** ✅ A4, ✅ A3
9. **Velocidade:** 35 PPM
10. **Toner:** 85%
11. **Papel:** 90%
12. **Ativa:** ✅

### Resultado:
Quando um usuário tenta imprimir um documento **A3 colorido**, o sistema escolherá automaticamente esta Xerox!

---

## 🔄 Fluxo de Seleção Automática

```
Usuário quer imprimir
         ↓
Sistema verifica:
  ├─ Qual impressora está online?
  ├─ Qual suporta cores?
  ├─ Qual suporta tamanho A3?
  ├─ Qual tem mais toner?
  ├─ Qual tem mais papel?
  └─ Qual é mais rápida?
         ↓
Sistema seleciona a MELHOR
         ↓
Impressão realizada com sucesso!
```

---

## 📊 Monitorar Impressoras

A página mostra em tempo real:
- ✅ Status (Online/Offline)
- ✅ Nível de Toner
- ✅ Papel Restante
- ✅ Capacidades

---

## 🆘 Troubleshooting

### "Impressora não aparece na lista"
- Verifique se foi salva corretamente
- Verifique se está marcada como "Ativa"

### "Impressora está offline"
- Verifique se o IP está correto
- Verifique se a impressora está ligada
- Verifique se a rede está conectada

### "Sistema não seleciona minha impressora"
- Verifique se ela está Online
- Verifique se suporta o tamanho (A3/A4)
- Verifique se suporta a cor (colorido/P&B)

### "Senha não funciona"
- Redefinir senha em `admin-printers.js`
- Consulte o administrador

---

## 🔐 Alterar Senha

Edite `private/admin-printers.js`:

```javascript
// Linha 3:
const SENHA_ADMIN = "sua_nova_senha_aqui";
```

Depois reinicie o servidor.

---

## 📋 Checklist de Impressoras

Antes de considerar uma impressora pronta, verifique:

- [ ] Nome inserido
- [ ] Modelo correto
- [ ] IP acessível
- [ ] Marcada como "Ativa"
- [ ] Capacidades configuradas
- [ ] Status "Online"
- [ ] Percentual de toner > 0%
- [ ] Percentual de papel > 0%

---

**Versão:** 1.0  
**Data:** Novembro 2025  
**Status:** ✅ Pronto para usar
