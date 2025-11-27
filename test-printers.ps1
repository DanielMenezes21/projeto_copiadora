# ============================================================================
# TESTES DE API - Sistema de Impressoras (PowerShell)
# ============================================================================
# Execute este arquivo para testar a API de impressoras
# .\test-printers.ps1

$SERVER = "http://localhost:3000"

Write-Host "🖨️  TESTES DE API - GERENCIAMENTO DE IMPRESSORAS" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Obter todas as impressoras
Write-Host "1️⃣  Obtendo todas as impressoras..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$SERVER/api/printers" -UseBasicParsing
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Erro: $_" -ForegroundColor Red
}
Write-Host ""
Write-Host "---" -ForegroundColor Gray
Write-Host ""

# 2. Obter status (verificar quais estão online)
Write-Host "2️⃣  Verificando status de todas as impressoras..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$SERVER/api/printers/status" -UseBasicParsing
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Erro: $_" -ForegroundColor Red
}
Write-Host ""
Write-Host "---" -ForegroundColor Gray
Write-Host ""

# 3. Obter uma impressora específica
Write-Host "3️⃣  Obtendo detalhes da impressora ID 1..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$SERVER/api/printers/1" -UseBasicParsing
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Erro: $_" -ForegroundColor Red
}
Write-Host ""
Write-Host "---" -ForegroundColor Gray
Write-Host ""

# 4. Selecionar impressora para documento colorido A4
Write-Host "4️⃣  Selecionando impressora para: Colorido em A4, papel comum, 90g..." -ForegroundColor Yellow
try {
    $body = @{
        colorido = $true
        tamanho = "a4"
        tipo_papel = "comum"
        gramatura = "90g"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$SERVER/api/printers/select" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -UseBasicParsing
    
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Erro: $_" -ForegroundColor Red
}
Write-Host ""
Write-Host "---" -ForegroundColor Gray
Write-Host ""

# 5. Selecionar impressora para documento em preto e branco A4
Write-Host "5️⃣  Selecionando impressora para: Preto e branco em A4..." -ForegroundColor Yellow
try {
    $body = @{
        colorido = $false
        tamanho = "a4"
        tipo_papel = "comum"
        gramatura = "90g"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$SERVER/api/printers/select" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -UseBasicParsing
    
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Erro: $_" -ForegroundColor Red
}
Write-Host ""
Write-Host "---" -ForegroundColor Gray
Write-Host ""

# 6. Selecionar impressora para documento fotográfico A3
Write-Host "6️⃣  Selecionando impressora para: Colorido em A3, papel fotográfico, 200g..." -ForegroundColor Yellow
try {
    $body = @{
        colorido = $true
        tamanho = "a3"
        tipo_papel = "fotografico"
        gramatura = "200g"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$SERVER/api/printers/select" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -UseBasicParsing
    
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Erro: $_" -ForegroundColor Red
}
Write-Host ""
Write-Host "---" -ForegroundColor Gray
Write-Host ""

# 7. Verificar compatibilidade - Impressora 1 com documento A3
Write-Host "7️⃣  Verificando compatibilidade: Impressora 1 com documento A3 fotográfico..." -ForegroundColor Yellow
try {
    $body = @{
        pedido = @{
            colorido = $true
            tamanho = "a3"
            tipo_papel = "fotografico"
            gramatura = "200g"
        }
        impressoraId = 1
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$SERVER/api/printers/verify" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -UseBasicParsing
    
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Erro: $_" -ForegroundColor Red
}
Write-Host ""
Write-Host "---" -ForegroundColor Gray
Write-Host ""

# 8. Verificar compatibilidade - Impressora 2 com documento A3 (deve falhar)
Write-Host "8️⃣  Verificando compatibilidade: Impressora 2 (LaserJet) com A3 (deve falhar)..." -ForegroundColor Yellow
try {
    $body = @{
        pedido = @{
            colorido = $true
            tamanho = "a3"
            tipo_papel = "fotografico"
            gramatura = "200g"
        }
        impressoraId = 2
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$SERVER/api/printers/verify" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -UseBasicParsing
    
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Erro: $_" -ForegroundColor Red
}
Write-Host ""
Write-Host "---" -ForegroundColor Gray
Write-Host ""

# 9. Atualizar nível de toner da impressora 1
Write-Host "9️⃣  Atualizando nível de toner da impressora 1 para 50%..." -ForegroundColor Yellow
try {
    $body = @{
        toner_level = 50
        papel_restante = 70
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$SERVER/api/printers/1" `
        -Method PUT `
        -ContentType "application/json" `
        -Body $body `
        -UseBasicParsing
    
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Erro: $_" -ForegroundColor Red
}
Write-Host ""
Write-Host "---" -ForegroundColor Gray
Write-Host ""

# 10. Adicionar nova impressora
Write-Host "🔟 Adicionando nova impressora (Xerox Alto Production)..." -ForegroundColor Yellow
try {
    $body = @{
        nome = "Xerox AltaLink C8145"
        modelo = "Xerox AltaLink C8145"
        tipo = "impressora_producao"
        ip = "192.168.1.15"
        puerto = 9100
        ativa = $true
        capacidades = @{
            colorido = $true
            preto_branco = $true
            tamanhos = @("a4", "a3")
            tipos_papel = @("comum", "fotografico", "glossy", "couche")
            gramaturas = @("75g", "90g", "120g", "150g")
            duplex = $true
            velocidade_ppm = 45
        }
        status = "online"
        toner_level = 95
        papel_restante = 95
    } | ConvertTo-Json -Depth 10
    
    $response = Invoke-WebRequest -Uri "$SERVER/api/printers" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -UseBasicParsing
    
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Erro: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "✅ TESTES CONCLUÍDOS!" -ForegroundColor Green
