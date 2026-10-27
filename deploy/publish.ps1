# Publica site/ na pasta compartilhada Web do NAS (servida pelo Web Server do QNAP).
# Uso: powershell -ExecutionPolicy Bypass -File deploy\publish.ps1
# Copia/sobrescreve só os arquivos do portal. Não usa /MIR: o resto da pasta Web
# (por exemplo _antigo/) fica intacto. health/ (painel Saúde da Família, publicado
# por outro projeto) também fica intacta.
param([string]$Target = "\\grassinas\Web")

$ErrorActionPreference = "Stop"
$source = Join-Path (Split-Path -Parent $PSScriptRoot) "site"

if (-not (Test-Path $source)) {
    Write-Error "Pasta de origem não encontrada: $source"
    exit 1
}
if (-not (Test-Path $Target)) {
    Write-Error "Não consegui acessar $Target. O NAS está ligado e na rede/Tailscale?"
    exit 1
}

Write-Host "Publicando $source -> $Target"
robocopy $source $Target /E /XD _antigo health /NJH /NJS /NP /NDL
# robocopy: códigos 0-7 são sucesso (bit 8 ou mais = erro)
if ($LASTEXITCODE -ge 8) {
    Write-Error "robocopy falhou (código $LASTEXITCODE)."
    exit $LASTEXITCODE
}
Write-Host "Pronto. Abra http://grassinas"
exit 0
