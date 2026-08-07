param (
    [string]$message = "Actualización de código"
)

$env:PATH = "C:\Users\user\MinGit\cmd;$env:PATH"
Set-Location "C:\CODE\minfra-kiro"

Write-Host "1. Guardando cambios y enviando a GitHub..." -ForegroundColor Cyan
git add .
git commit -m $message
git push origin main

Write-Host "2. Conectando a Oracle Cloud (129.80.183.198) y actualizando..." -ForegroundColor Cyan
ssh -i "$env:USERPROFILE\.ssh\ky.key" ubuntu@129.80.183.198 "bash /home/ubuntu/sdd-project/jota.sh"

Write-Host "✅ ¡Despliegue completado con éxito!" -ForegroundColor Green
