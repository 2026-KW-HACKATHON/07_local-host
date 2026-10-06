param([string]$BaseUrl = "http://localhost:8080")
$ErrorActionPreference = "Stop"
# 합성 관측값입니다. 실제 앱에서는 Location 콜백의 좌표와 시각을 보내세요.
$samples = @(0..20 | ForEach-Object {
    @{
        latitude = 37.6195
        longitude = 127.0598
        accuracyMeters = 8.0
        elapsedRealtimeMillis = 1000000 + ($_ * 15000)
    }
})
$body = @{
    capturedAt = [DateTimeOffset]::UtcNow.ToString("o")
    samples = $samples
} | ConvertTo-Json -Depth 5 -Compress
$result = Invoke-RestMethod -Method Post `
    -Uri ($BaseUrl.TrimEnd('/') + "/api/v1/location/stays/recommendations") `
    -ContentType "application/json; charset=utf-8" -Body $body
$result | ConvertTo-Json -Depth 5
