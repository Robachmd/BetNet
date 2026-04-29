# Build a debug APK that points at this PC's LAN IP (for a physical phone on the same Wi-Fi).
# Django must listen on all interfaces: python manage.py runserver 0.0.0.0:8000
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$candidates = @(
  Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.IPAddress -notlike '127.*' -and
      $_.IPAddress -notlike '169.254.*'
    } |
    Sort-Object InterfaceMetric
)

if ($candidates.Count -eq 0) {
  Write-Error 'No LAN IPv4 found. Connect Wi-Fi or Ethernet, or set BETNET_API_BASE manually.'
}

$ip = $candidates[0].IPAddress
$base = "http://${ip}:8000"
Write-Host "Using BETNET_API_BASE=$base"
flutter pub get
flutter build apk --debug --dart-define=BETNET_API_BASE=$base
Write-Host "APK: $root\build\app\outputs\flutter-apk\app-debug.apk"
