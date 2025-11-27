#!/bin/bash
# ============================================================================
# TESTES DE API - Sistema de Impressoras
# ============================================================================
# Execute este arquivo para testar a API de impressoras
# chmod +x test-printers.sh
# ./test-printers.sh

SERVER="http://localhost:3000"

echo "🖨️  TESTES DE API - GERENCIAMENTO DE IMPRESSORAS"
echo "=================================================="
echo ""

# 1. Obter todas as impressoras
echo "1️⃣  Obtendo todas as impressoras..."
curl -s "$SERVER/api/printers" | jq '.' 
echo ""
echo "---"
echo ""

# 2. Obter status (verificar quais estão online)
echo "2️⃣  Verificando status de todas as impressoras..."
curl -s "$SERVER/api/printers/status" | jq '.' 
echo ""
echo "---"
echo ""

# 3. Obter uma impressora específica
echo "3️⃣  Obtendo detalhes da impressora ID 1..."
curl -s "$SERVER/api/printers/1" | jq '.'
echo ""
echo "---"
echo ""

# 4. Selecionar impressora para documento colorido A4
echo "4️⃣  Selecionando impressora para: Colorido em A4, papel comum, 90g..."
curl -s -X POST "$SERVER/api/printers/select" \
  -H "Content-Type: application/json" \
  -d '{
    "colorido": true,
    "tamanho": "a4",
    "tipo_papel": "comum",
    "gramatura": "90g"
  }' | jq '.'
echo ""
echo "---"
echo ""

# 5. Selecionar impressora para documento em preto e branco A4
echo "5️⃣  Selecionando impressora para: Preto e branco em A4..."
curl -s -X POST "$SERVER/api/printers/select" \
  -H "Content-Type: application/json" \
  -d '{
    "colorido": false,
    "tamanho": "a4",
    "tipo_papel": "comum",
    "gramatura": "90g"
  }' | jq '.'
echo ""
echo "---"
echo ""

# 6. Selecionar impressora para documento fotográfico A3
echo "6️⃣  Selecionando impressora para: Colorido em A3, papel fotográfico, 200g..."
curl -s -X POST "$SERVER/api/printers/select" \
  -H "Content-Type: application/json" \
  -d '{
    "colorido": true,
    "tamanho": "a3",
    "tipo_papel": "fotografico",
    "gramatura": "200g"
  }' | jq '.'
echo ""
echo "---"
echo ""

# 7. Verificar compatibilidade - Impressora 1 com documento A3
echo "7️⃣  Verificando compatibilidade: Impressora 1 com documento A3 fotográfico..."
curl -s -X POST "$SERVER/api/printers/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "pedido": {
      "colorido": true,
      "tamanho": "a3",
      "tipo_papel": "fotografico",
      "gramatura": "200g"
    },
    "impressoraId": 1
  }' | jq '.'
echo ""
echo "---"
echo ""

# 8. Verificar compatibilidade - Impressora 2 com documento A3 (deve falhar)
echo "8️⃣  Verificando compatibilidade: Impressora 2 (LaserJet) com A3 (deve falhar)..."
curl -s -X POST "$SERVER/api/printers/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "pedido": {
      "colorido": true,
      "tamanho": "a3",
      "tipo_papel": "fotografico",
      "gramatura": "200g"
    },
    "impressoraId": 2
  }' | jq '.'
echo ""
echo "---"
echo ""

# 9. Atualizar nível de toner da impressora 1
echo "9️⃣  Atualizando nível de toner da impressora 1 para 50%..."
curl -s -X PUT "$SERVER/api/printers/1" \
  -H "Content-Type: application/json" \
  -d '{
    "toner_level": 50,
    "papel_restante": 70
  }' | jq '.'
echo ""
echo "---"
echo ""

# 10. Adicionar nova impressora
echo "🔟 Adicionando nova impressora (Xerox Alto Production)..."
curl -s -X POST "$SERVER/api/printers" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Xerox AltaLink C8145",
    "modelo": "Xerox AltaLink C8145",
    "tipo": "impressora_producao",
    "ip": "192.168.1.15",
    "puerto": 9100,
    "ativa": true,
    "capacidades": {
      "colorido": true,
      "preto_branco": true,
      "tamanhos": ["a4", "a3"],
      "tipos_papel": ["comum", "fotografico", "glossy", "couche"],
      "gramaturas": ["75g", "90g", "120g", "150g"],
      "duplex": true,
      "velocidade_ppm": 45
    },
    "status": "online",
    "toner_level": 95,
    "papel_restante": 95
  }' | jq '.'
echo ""

echo "=================================================="
echo "✅ TESTES CONCLUÍDOS!"
