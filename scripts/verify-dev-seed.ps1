param(
    [string]$BaseUrl = "http://localhost:8080"
)

$ErrorActionPreference = "Stop"

# Windows PowerShell 5.1 콘솔 UTF-8 출력
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$OutputEncoding = [Console]::OutputEncoding


# --------------------------------------------------
# 공통 Assert
# --------------------------------------------------

function Assert-Equal(
    $Actual,
    $Expected,
    [string]$Message
) {
    if ($Actual -ne $Expected) {
        throw "$Message (expected=$Expected, actual=$Actual)"
    }
}

function Assert-True(
    [bool]$Condition,
    [string]$Message
) {
    if (-not $Condition) {
        throw $Message
    }
}


# --------------------------------------------------
# UTF-8 JSON 요청
# Windows PowerShell 5.1 Invoke-RestMethod 한글 깨짐 방지
# --------------------------------------------------

function Invoke-Utf8Json {
    param(
        [string]$Uri,
        [string]$Method = "GET",
        $Body = $null,
        $Headers = @{}
    )

    $client = New-Object System.Net.WebClient

    try {
        $client.Encoding = [System.Text.Encoding]::UTF8

        foreach ($key in $Headers.Keys) {
            $client.Headers[$key] = $Headers[$key]
        }

        if ($Body -ne $null) {
            $client.Headers["Content-Type"] =
                "application/json; charset=utf-8"

            $response = $client.UploadString(
                $Uri,
                $Method,
                $Body
            )
        }
        else {
            $response = $client.DownloadString($Uri)
        }

        if ([string]::IsNullOrWhiteSpace($response)) {
            return $null
        }

        return $response | ConvertFrom-Json
    }
    finally {
        $client.Dispose()
    }
}


Write-Host ""
Write-Host "=== Bapjul dev seed verification ==="
Write-Host "Base URL: $BaseUrl"
Write-Host ""


# ==================================================
# 1. 대표 손님 로그인
# ==================================================

$loginBody = @{
    email = "customer1@example.test"
    password = "Demo1234!"
} | ConvertTo-Json

$login = Invoke-Utf8Json `
    -Uri "$BaseUrl/api/auth/login" `
    -Method "POST" `
    -Body $loginBody

Assert-Equal `
    $login.user.email `
    "customer1@example.test" `
    "대표 손님 이메일 불일치"

Assert-Equal `
    $login.user.nickname `
    "밥줄손님" `
    "대표 손님 닉네임 불일치"

Assert-Equal `
    $login.user.role `
    "CUSTOMER" `
    "대표 손님 역할 불일치"

Write-Host "[PASS] 로그인"


# ==================================================
# 2. /api/auth/me
# ==================================================

$me = Invoke-Utf8Json `
    -Uri "$BaseUrl/api/auth/me" `
    -Headers @{
        Authorization = "Bearer $($login.accessToken)"
    }

Assert-Equal `
    $me.nickname `
    "밥줄손님" `
    "/api/auth/me 닉네임 불일치"

Assert-Equal `
    $me.role `
    "CUSTOMER" `
    "/api/auth/me 역할 불일치"

Write-Host "[PASS] /api/auth/me"
Write-Host "       nickname = $($me.nickname)"
Write-Host ""


# ==================================================
# 3. 식당 목록
# ==================================================

$restaurants = Invoke-Utf8Json `
    -Uri "$BaseUrl/api/restaurants"

# ConvertFrom-Json 결과가 배열인지 단일 객체인지 상관없이 배열화
$restaurants = @($restaurants)

Assert-Equal `
    $restaurants.Count `
    8 `
    "전체 식당 수 불일치"

$seedRestaurants = $restaurants

Write-Host "API에서 받은 식당:"

$seedRestaurants | ForEach-Object {
    Write-Host " - id=$($_.id), name=[$($_.name)]"
}

Write-Host ""


# ==================================================
# 4. 예상 혼잡도
# ==================================================

$expected = [ordered]@{
    "국밥집" = "AVAILABLE"
    "월계한상" = "AVAILABLE"
    "오늘김밥" = "FEW_SEATS"
    "광운대앞든든한집밥그리고제육볶음" = "FEW_SEATS"
    "면" = "LONG_WAIT"
    "매운닭갈비연구소" = "LONG_WAIT"
    "소담" = "UNKNOWN"
    "밤샘분식과따뜻한우동" = "UNKNOWN"
}


# ==================================================
# 5. 국밥 검색용 데이터 확인
# ==================================================

$gukbapRestaurants = @(
    $seedRestaurants |
        Where-Object {
            $_.name -like "*국밥*"
        }
)

Assert-True `
    ($gukbapRestaurants.Count -ge 1) `
    "'국밥' 검색 대상 식당이 없습니다."

Write-Host "[PASS] 식당 8개"
Write-Host "[PASS] 국밥 검색 데이터"

Write-Host "       검색 결과:"

$gukbapRestaurants | ForEach-Object {
    Write-Host "       - $($_.name)"
}

Write-Host ""


# ==================================================
# 6. 혼잡도 / 프로모션 / 차트 검증
# ==================================================

$rows = @()

$activePromotionTotal = 0

$chartTargets = @(
    "국밥집",
    "월계한상",
    "오늘김밥",
    "광운대앞든든한집밥그리고제육볶음"
)

foreach ($restaurant in $seedRestaurants) {

    # ----------------------------------------------
    # 현재 혼잡도
    # ----------------------------------------------

    $crowd = Invoke-Utf8Json `
        -Uri "$BaseUrl/api/restaurants/$($restaurant.id)/crowd"

    Assert-Equal `
        $crowd.level `
        $expected[$restaurant.name] `
        "현재 혼잡도 불일치: $($restaurant.name)"


    # ----------------------------------------------
    # 활성 프로모션
    # ----------------------------------------------

    $promotionResponse = Invoke-Utf8Json `
        -Uri "$BaseUrl/api/restaurants/$($restaurant.id)/promotions"

    if ($null -eq $promotionResponse) {
        $promotions = @()
    }
    else {
        $promotions = @($promotionResponse)
    }

    $promotionCount = $promotions.Count

    $activePromotionTotal += $promotionCount


    # ----------------------------------------------
    # 24시간 차트
    # ----------------------------------------------

    if ($chartTargets -contains $restaurant.name) {

        $chart = Invoke-Utf8Json `
            -Uri "$BaseUrl/api/restaurants/$($restaurant.id)/crowd/chart?hours=24"

        if ($null -eq $chart.data) {
            $chartData = @()
        }
        else {
            $chartData = @($chart.data)
        }

        Assert-Equal `
            $chartData.Count `
            24 `
            "24시간 차트 버킷 수 불일치: $($restaurant.name)"

        $distinctLevels = @(
            $chartData |
                Select-Object -ExpandProperty level -Unique
        )

        Assert-True `
            ($distinctLevels.Count -ge 3) `
            "차트에 세 혼잡 상태 패턴이 충분히 포함되지 않았습니다: $($restaurant.name)"
    }


    # ----------------------------------------------
    # 출력용 행 저장
    # ----------------------------------------------

    $rows += [pscustomobject]@{
        id = $restaurant.id
        name = $restaurant.name
        expectedCrowd = $expected[$restaurant.name]
        actualCrowd = $crowd.level
        recentReportCount = $crowd.reportCount
        activePromotions = $promotionCount
    }
}


Write-Host "[PASS] 현재 혼잡도"
Write-Host "[PASS] 24시간 차트"


# ==================================================
# 7. 활성 프로모션 총 3개 확인
# ==================================================

Assert-Equal `
    $activePromotionTotal `
    3 `
    "손님 API에 노출되는 활성 프로모션 총합 불일치"

Write-Host "[PASS] 활성 프로모션 3개"
Write-Host ""


# ==================================================
# 8. 활성 프로모션 이름 출력
# ==================================================

$activeNames = @()

foreach ($restaurant in $seedRestaurants) {

    $promotionResponse = Invoke-Utf8Json `
        -Uri "$BaseUrl/api/restaurants/$($restaurant.id)/promotions"

    if ($null -ne $promotionResponse) {

        $promotionList = @($promotionResponse)

        foreach ($promotion in $promotionList) {
            $activeNames +=
                "$($restaurant.name): $($promotion.title)"
        }
    }
}


# ==================================================
# 9. 최종 결과
# ==================================================

Write-Host ""
Write-Host "============================================"
Write-Host " Bapjul dev seed verification: PASS" `
    -ForegroundColor Green
Write-Host "============================================"
Write-Host ""

Write-Host "Base URL:"
Write-Host "  $BaseUrl"

Write-Host ""
Write-Host "Representative login:"
Write-Host "  customer1@example.test / Demo1234!"

Write-Host ""
Write-Host "Nickname:"
Write-Host "  $($me.nickname)"

Write-Host ""
Write-Host "Restaurant count:"
Write-Host "  $($seedRestaurants.Count)"

Write-Host ""
Write-Host "Active promotions:"
Write-Host "  $activePromotionTotal"

Write-Host ""
Write-Host "Restaurants:"

$rows |
    Sort-Object id |
    Format-Table `
        id,
        name,
        expectedCrowd,
        actualCrowd,
        recentReportCount,
        activePromotions `
        -AutoSize

Write-Host ""
Write-Host "Active promotion rows:"

foreach ($name in $activeNames) {
    Write-Host " - $name"
}

Write-Host ""
Write-Host "NOTE:"
Write-Host "Chart API omits hours with no reports."
Write-Host "It does not synthesize UNKNOWN buckets."
Write-Host ""