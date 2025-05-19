# PowerShell Script for API Endpoint Testing
Clear-Content -Path $Global:LogFilePath -ErrorAction SilentlyContinue
# --- Configuration ---
$Global:BaseUrlAuth = "http://localhost:8001/api/v1/auth"
$Global:BaseUrlCandidate = "http://localhost:8002/api/v1/candidate"
$Global:BaseUrlInterview = "http://localhost:8003/api/v1/interview"
$Global:BaseUrlAdmin = "http://localhost:8004/api/v1/admin"
$Global:BaseUrlHr = "http://localhost:8005/api/v1/hr"

$Global:DefaultPassword = "SecurePassword123!"

# Store tokens and created user details globally for sequential tests
$Global:TestRunId = (Get-Date -Format "yyyyMMddHHmmss")
$Global:LogFilePath = "api_.log"
$Global:AdminUser = @{}
$Global:HrUser = @{}
$Global:CandidateUser = @{}

# Interview-specific variables
$Global:ScheduledInterviewId = $null
$Global:ScheduledInterviewDbId = $null
$Global:ScheduledInterviewQuestions = @()
$Global:SubmittedResponses = @() 

$Global:PassedTests = 0
$Global:FailedTests = 0

# --- Helper Functions ---
function Invoke-ApiRequest {
    param (
        [string]$Method,
        [string]$Uri,
        [object]$Body,
        [string]$Token,
        [switch]$AllowError = $false,
        [string]$TestNameForLog = "API Request"
    )
    $actualResponse = $null 
    $webResponseObject = $null 

    try {
        $headers = @{ "Content-Type" = "application/json" }
        if ($Token) {
            $headers.Add("Authorization", "Bearer $Token")
        }

        $params = @{
            Method  = $Method
            Uri     = $Uri
            Headers = $headers
        }
        if ($PSVersionTable.PSVersion.Major -ge 6) {
            $params.PassThru = $true 
        }

        if ($AllowError) {
            $params.ErrorAction = "SilentlyContinue" 
        }
        else {
            $params.ErrorAction = "Stop" 
        }

        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10) 
        }
        
        Write-Host "[$TestNameForLog] Executing: $Method $Uri" -ForegroundColor Gray
        if ($Body) { Write-Host "[$TestNameForLog] Body: $($params.Body)" -ForegroundColor Gray }

        $rawResponse = Invoke-RestMethod @params
        
        $statusCode = 200 
        $isSuccessStatusCode = $true

        if ($rawResponse -is [Microsoft.PowerShell.Commands.WebResponseObject]) { 
            $webResponseObject = $rawResponse
            $statusCode = $webResponseObject.StatusCode
            $isSuccessStatusCode = ($statusCode -ge 200 -and $statusCode -le 299)
            if ($webResponseObject.Content) {
                try { $actualResponse = $webResponseObject.Content | ConvertFrom-Json -ErrorAction SilentlyContinue } 
                catch { $actualResponse = $webResponseObject.Content } 
            }
            else {
                $actualResponse = $null 
            }
        }
        else { 
            $actualResponse = $rawResponse 
        }
        
        return @{ Body = $actualResponse; StatusCode = $statusCode; IsSuccessStatusCode = $isSuccessStatusCode; WebResponse = $webResponseObject }
    }
    catch {
        Write-Host "[$TestNameForLog] ERROR: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $statusCode = $_.Exception.Response.StatusCode.value__
            $responseBody = ""
            try {
                $stream = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($stream)
                $responseBody = $reader.ReadToEnd()
                $reader.Close(); $stream.Close()
            }
            catch { $responseBody = "Could not read error response body." }
            Write-Host "[$TestNameForLog] Status Code: $statusCode" -ForegroundColor Red
            Write-Host "[$TestNameForLog] Response Body: $responseBody" -ForegroundColor Red
            if ($AllowError) {
                $parsedBody = $null
                if ($_.Exception.Response.ContentType -match "application/json" -and $responseBody) {
                    try { $parsedBody = ConvertFrom-Json -InputObject $responseBody -ErrorAction SilentlyContinue } catch {}
                }
                return @{ StatusCode = $statusCode; ResponseBody = $responseBody; ParsedResponseBody = $parsedBody; ErrorRecord = $_; IsSuccessStatusCode = $false }
            }
        }
        elseif ($AllowError) {
            return @{ StatusCode = "N/A"; ResponseBody = "No HTTP response, client-side error: $($_.Exception.Message)"; ErrorRecord = $_; IsSuccessStatusCode = $false }
        }
        return $null 
    }
}

function Log-TestResult {
    param (
        [string]$TestName,
        [bool]$Success,
        [string]$Message = "",
        [object]$ResponseDetails = $null 
    )
    $logString = ""; $consoleColor = "White"; $loggedResponse = $ResponseDetails
    if ($ResponseDetails -is [hashtable]) {
        if ($ResponseDetails.ContainsKey('IsSuccessStatusCode') -and $ResponseDetails.IsSuccessStatusCode -eq $false) {
            $loggedResponse = $ResponseDetails.ParsedResponseBody; if ($null -eq $loggedResponse) { $loggedResponse = $ResponseDetails.ResponseBody }
        }
        elseif ($ResponseDetails.ContainsKey('Body')) { $loggedResponse = $ResponseDetails.Body }
    }
    if ($Success) { $logString += "PASSED: $TestName"; if ($Message -and $Message -notmatch "PASSED:") { $logString += "`n  Detail: $Message" }; $consoleColor = "Green"; $Global:PassedTests++ }
    else {
        $logString += "FAILED: $TestName"; $consoleColor = "Red"; $Global:FailedTests++; if ($Message) { $logString += "`n  Reason: $Message" }
        if ($loggedResponse) { $logString += "`n  Response Details: $($loggedResponse | ConvertTo-Json -Depth 3 -Compress -WarningAction SilentlyContinue)" } 
        elseif ($ResponseDetails -is [hashtable] -and $ResponseDetails.ContainsKey('ErrorRecord')) { $logString += "`n  Error Details: $($ResponseDetails.ErrorRecord.ToString())" } 
        elseif ($ResponseDetails) { $logString += "`n  Raw Response Details: $($ResponseDetails | Out-String)" }
    }
    $logString += "`n--------------------------------------------------"; try { Add-Content -Path $Global:LogFilePath -Value $logString -ErrorAction Stop } catch { Write-Warning "Failed to write to log file $($Global:LogFilePath): $($_.Exception.Message)" }
    if ($Success) { Write-Host "PASSED: $TestName" -Fg $consoleColor; if ($Message -and $Message -notmatch "PASSED:") { Write-Host "  Detail: $Message" -Fg Cyan } }
    else { Write-Host "FAILED: $TestName" -Fg $consoleColor; if ($Message) { Write-Host "  Reason: $Message" -Fg Yellow }; if ($loggedResponse) { Write-Host "  Response Details: $($loggedResponse | ConvertTo-Json -Depth 3 -Compress -WarningAction SilentlyContinue)" -Fg DarkYellow } elseif ($ResponseDetails -is [hashtable] -and $ResponseDetails.ContainsKey('ErrorRecord')) { Write-Host "  Error Details: $($ResponseDetails.ErrorRecord.ToString())" -Fg DarkYellow } elseif ($ResponseDetails) { Write-Host "  Raw Response Details: $($ResponseDetails | Out-String)" -Fg DarkYellow } }
    Write-Host "--------------------------------------------------"
}
function Get-UniqueData { param([string]$Prefix) return "${Prefix}_$($Global:TestRunId)_$(Get-Random -Minimum 1000 -Maximum 9999)" }

# --- Test Suites ---
Write-Host "`n===== TESTING AUTH SERVICE =====" -ForegroundColor Cyan
$Global:AdminUser.Username = Get-UniqueData -Prefix "testadmin"; $Global:AdminUser.Email = "$($Global:AdminUser.Username)@example.com"; $adminPayload = @{ username = $Global:AdminUser.Username; email = $Global:AdminUser.Email; password = $Global:DefaultPassword; role = "admin" }
$response = Invoke-ApiRequest -Method POST -Uri "$($Global:BaseUrlAuth)/register" -Body $adminPayload -AllowError -TestNameForLog "Register Admin"; Log-TestResult "Register Admin User" ($response -ne $null -and $response.IsSuccessStatusCode -and $response.Body.email -eq $Global:AdminUser.Email) "Expected email $($Global:AdminUser.Email)" $response
$Global:HrUser.Username = Get-UniqueData -Prefix "testhr"; $Global:HrUser.Email = "$($Global:HrUser.Username)@example.com"; $hrPayload = @{ username = $Global:HrUser.Username; email = $Global:HrUser.Email; password = $Global:DefaultPassword; role = "hr" }
$response = Invoke-ApiRequest -Method POST -Uri "$($Global:BaseUrlAuth)/register" -Body $hrPayload -AllowError -TestNameForLog "Register HR"; if ($response -ne $null -and $response.IsSuccessStatusCode -and $response.Body.email -eq $Global:HrUser.Email -and $response.Body.id) { $Global:HrUser.id = $response.Body.id; Log-TestResult "Register HR User" $true "" $response } else { Log-TestResult "Register HR User" $false "Failed to register HR user or get ID." $response }
$Global:CandidateUser.Username = Get-UniqueData -Prefix "testcand"; $Global:CandidateUser.Email = "$($Global:CandidateUser.Username)@example.com"; $candidatePayload = @{ username = $Global:CandidateUser.Username; email = $Global:CandidateUser.Email; password = $Global:DefaultPassword; role = "candidate" }
$response = Invoke-ApiRequest -Method POST -Uri "$($Global:BaseUrlAuth)/register" -Body $candidatePayload -AllowError -TestNameForLog "Register Candidate"; if ($response -ne $null -and $response.IsSuccessStatusCode -and $response.Body.email -eq $Global:CandidateUser.Email -and $response.Body.id) { $Global:CandidateUser.id = $response.Body.id; Log-TestResult "Register Candidate User" $true "" $response } else { Log-TestResult "Register Candidate User" $false "Failed to register Candidate user or get ID." $response }
$response = Invoke-ApiRequest -Method POST -Uri "$($Global:BaseUrlAuth)/register" -Body $adminPayload -AllowError -TestNameForLog "Register Duplicate Email"; Log-TestResult "Register Duplicate Admin Email" ($response -ne $null -and -not $response.IsSuccessStatusCode -and $response.StatusCode -eq 400) "Expected 400" $response
$loginFormAdmin = @{ username = $Global:AdminUser.Email; password = $Global:DefaultPassword }; $responseLoginAdmin = Invoke-RestMethod -Method POST -Uri "$($Global:BaseUrlAuth)/login" -Body $loginFormAdmin -ContentType "application/x-www-form-urlencoded" -ErrorAction SilentlyContinue; if ($responseLoginAdmin -ne $null -and $responseLoginAdmin.access_token) { $Global:AdminUser.Token = $responseLoginAdmin.access_token; Log-TestResult "Login Admin User" $true } else { $errDetails = "Unknown login error."; if ($Error[0] -and $Error[0].Exception.Response) { $errStream = $Error[0].Exception.Response.GetResponseStream(); $errReader = New-Object System.IO.StreamReader($errStream); $errDetails = $errReader.ReadToEnd(); $errReader.Close(); $errStream.Close() }; Log-TestResult "Login Admin User" $false "Login failed. Details: $errDetails" $responseLoginAdmin }
$loginFormHr = @{ username = $Global:HrUser.Email; password = $Global:DefaultPassword }; $responseLoginHr = Invoke-RestMethod -Method POST -Uri "$($Global:BaseUrlAuth)/login" -Body $loginFormHr -ContentType "application/x-www-form-urlencoded" -ErrorAction SilentlyContinue; if ($responseLoginHr -ne $null -and $responseLoginHr.access_token) { $Global:HrUser.Token = $responseLoginHr.access_token; Log-TestResult "Login HR User" $true } else { $errDetails = "Unknown login error."; if ($Error[0] -and $Error[0].Exception.Response) { $errStream = $Error[0].Exception.Response.GetResponseStream(); $errReader = New-Object System.IO.StreamReader($errStream); $errDetails = $errReader.ReadToEnd(); $errReader.Close(); $errStream.Close() }; Log-TestResult "Login HR User" $false "Login failed. Details: $errDetails" $responseLoginHr }
$loginFormCandidate = @{ username = $Global:CandidateUser.Email; password = $Global:DefaultPassword }; $responseLoginCand = Invoke-RestMethod -Method POST -Uri "$($Global:BaseUrlAuth)/login" -Body $loginFormCandidate -ContentType "application/x-www-form-urlencoded" -ErrorAction SilentlyContinue; if ($responseLoginCand -ne $null -and $responseLoginCand.access_token) { $Global:CandidateUser.Token = $responseLoginCand.access_token; Log-TestResult "Login Candidate User" $true } else { $errDetails = "Unknown login error."; if ($Error[0] -and $Error[0].Exception.Response) { $errStream = $Error[0].Exception.Response.GetResponseStream(); $errReader = New-Object System.IO.StreamReader($errStream); $errDetails = $errReader.ReadToEnd(); $errReader.Close(); $errStream.Close() }; Log-TestResult "Login Candidate User" $false "Login failed. Details: $errDetails" $responseLoginCand }
if ($Global:AdminUser.Token) { $response = Invoke-ApiRequest -Method GET -Uri "$($Global:BaseUrlAuth)/me" -Token $Global:AdminUser.Token -AllowError -TestNameForLog "Get Admin /me"; Log-TestResult "Get Current User (Admin)" ($response -ne $null -and $response.IsSuccessStatusCode -and $response.Body.email -eq $Global:AdminUser.Email) "Expected email $($Global:AdminUser.Email)" $response } else { Log-TestResult "Get Current User (Admin)" $false "Admin token not available." }
if ($Global:HrUser.Token) { $response = Invoke-ApiRequest -Method GET -Uri "$($Global:BaseUrlAuth)/me" -Token $Global:HrUser.Token -AllowError -TestNameForLog "Get HR /me"; Log-TestResult "Get Current User (HR)" ($response -ne $null -and $response.IsSuccessStatusCode -and $response.Body.email -eq $Global:HrUser.Email) "Expected email $($Global:HrUser.Email)" $response } else { Log-TestResult "Get Current User (HR)" $false "HR token not available." }
if ($Global:CandidateUser.Token) { $response = Invoke-ApiRequest -Method GET -Uri "$($Global:BaseUrlAuth)/me" -Token $Global:CandidateUser.Token -AllowError -TestNameForLog "Get Candidate /me"; Log-TestResult "Get Current User (Candidate)" ($response -ne $null -and $response.IsSuccessStatusCode -and $response.Body.email -eq $Global:CandidateUser.Email) "Expected email $($Global:CandidateUser.Email)" $response } else { Log-TestResult "Get Current User (Candidate)" $true "Skipped: Candidate token not available." }

Write-Host "`n===== TESTING CANDIDATE SERVICE =====" -ForegroundColor Cyan
if ($Global:CandidateUser.Token) {
    $response = Invoke-ApiRequest -Method GET -Uri "$($Global:BaseUrlCandidate)/profile" -Token $Global:CandidateUser.Token -AllowError -TestNameForLog "Get Candidate Profile"; Log-TestResult "Get Candidate Profile" ($response -ne $null -and $response.IsSuccessStatusCode -and $response.Body.email -eq $Global:CandidateUser.Email) "Expected email $($Global:CandidateUser.Email)" $response
    $profileUpdatePayload = @{ full_name = "Test Candidate Full Name"; phone_number = "1234567890"; linkedin_profile = "https://linkedin.com/in/$($Global:CandidateUser.Username)" }; $response = Invoke-ApiRequest -Method PUT -Uri "$($Global:BaseUrlCandidate)/profile" -Body $profileUpdatePayload -Token $Global:CandidateUser.Token -AllowError -TestNameForLog "Update Candidate Profile"; Log-TestResult "Update Candidate Profile" ($response -ne $null -and $response.IsSuccessStatusCode -and $response.Body.full_name -eq "Test Candidate Full Name") "Expected full_name 'Test Candidate Full Name'" $response
    $response = Invoke-ApiRequest -Method POST -Uri "$($Global:BaseUrlCandidate)/resume" -Body @{} -Token $Global:CandidateUser.Token -AllowError -TestNameForLog "Candidate Upload Resume (Check Auth/Existence)"; Log-TestResult "Candidate Upload Resume (Endpoint Auth Check)" ($response -ne $null -and (-not $response.IsSuccessStatusCode) -and ($response.StatusCode -eq 422 -or $response.StatusCode -eq 400)) "Expected 422 or 400" $response; Write-Host "NOTE: Full resume upload not implemented." -Fg Yellow
    $Error.Clear(); $responseGetCandMessages = Invoke-ApiRequest -Method GET -Uri "$($Global:BaseUrlCandidate)/messages" -Token $Global:CandidateUser.Token -AllowError -TestNameForLog "Get Candidate Messages"; $isCandMessagesSuccess = $false; $candMessagesReason = "Default"; $responseForLogCandMsg = $responseGetCandMessages; if ($responseGetCandMessages -ne $null -and -not $responseGetCandMessages.IsSuccessStatusCode -and $responseGetCandMessages.StatusCode -eq 404) { $isCandMessagesSuccess = $true; $candMessagesReason = "PASSED: API returned 404 for no messages." } elseif ($responseGetCandMessages -ne $null -and $responseGetCandMessages.IsSuccessStatusCode) { if ($responseGetCandMessages.Body -is [array]) { $isCandMessagesSuccess = $true; $candMessagesReason = "PASSED: Received array."; if ($responseGetCandMessages.Body.Count -eq 0) { $candMessagesReason += " (Empty)" } } elseif ($responseGetCandMessages.Body -eq $null) { $isCandMessagesSuccess = $true; $candMessagesReason = "PASSED: Response body null (empty [] from API)." } else { $candMessagesReason = "FAILED: Expected array, got $($responseGetCandMessages.Body.GetType().FullName)" } } else { $candMessagesReason = "FAILED: Unexpected response." }; Log-TestResult "Get Candidate Messages" $isCandMessagesSuccess $candMessagesReason $responseForLogCandMsg
    $Global:CandidateUser.FirstMessageId = $null; if ($responseGetCandMessages -ne $null -and $responseGetCandMessages.IsSuccessStatusCode -and $responseGetCandMessages.Body -is [array] -and $responseGetCandMessages.Body.Count -gt 0) { $Global:CandidateUser.FirstMessageId = $responseGetCandMessages.Body[0].id }
    if ($Global:CandidateUser.FirstMessageId) { $markReadPayload = @{ message_ids = @($Global:CandidateUser.FirstMessageId) }; $response = Invoke-ApiRequest -Method POST -Uri "$($Global:BaseUrlCandidate)/messages/mark-read" -Body $markReadPayload -Token $Global:CandidateUser.Token -AllowError -TestNameForLog "Mark Message Read"; Log-TestResult "Mark Message Read" ($response -ne $null -and $response.IsSuccessStatusCode -and $response.Body.modified_count -ge 0) "Expected modified_count >= 0" $response } else { Log-TestResult "Mark Message Read" $true "Skipped: No messages found." }
    if ($Global:CandidateUser.FirstMessageId) { $markUnreadPayload = @{ message_ids = @($Global:CandidateUser.FirstMessageId) }; $response = Invoke-ApiRequest -Method POST -Uri "$($Global:BaseUrlCandidate)/messages/mark-unread" -Body $markUnreadPayload -Token $Global:CandidateUser.Token -AllowError -TestNameForLog "Mark Message Unread"; Log-TestResult "Mark Message Unread" ($response -ne $null -and $response.IsSuccessStatusCode -and $response.Body.modified_count -ge 0) "Expected modified_count >= 0" $response } else { Log-TestResult "Mark Message Unread" $true "Skipped: No messages found." }
}
else { Write-Host "Skipping Candidate Service tests." -Fg Yellow }

Write-Host "`n===== TESTING HR SERVICE =====" -ForegroundColor Cyan
if ($Global:HrUser.Token) {
    $response = Invoke-ApiRequest -Method POST -Uri "$($Global:BaseUrlHr)/profile-details" -Body @{} -Token $Global:HrUser.Token -AllowError -TestNameForLog "HR Profile Details (POST Check)"; $isSuccessHRProfile = $false; $failureMessageHRProfile = "Unexpected response"; if ($response -ne $null) { if (-not $response.IsSuccessStatusCode -and $response.StatusCode -eq 422) { $isSuccessHRProfile = $true; $failureMessageHRProfile = "Received 422 for empty body." } elseif ($response.IsSuccessStatusCode -and $response.Body.email -eq $Global:HrUser.Email) { $isSuccessHRProfile = $true; $failureMessageHRProfile = "Received 2xx with valid profile." } else { $failureMessageHRProfile = "Unexpected status $($response.StatusCode) or body." } }; Log-TestResult "HR Profile Details (POST Endpoint Check)" $isSuccessHRProfile $failureMessageHRProfile $response; Write-Host "NOTE: HR /profile-details POST with empty body returns profile (200 OK)." -Fg Yellow
    $hrProfileUpdatePayload = @{ company = "Test HR Company Inc."; years_of_experience = 5 }; $response = Invoke-ApiRequest -Method POST -Uri "$($Global:BaseUrlHr)/profile-details" -Body $hrProfileUpdatePayload -Token $Global:HrUser.Token -AllowError -TestNameForLog "Update HR Profile"; $isUpdateHrProfileSuccess = ($response -ne $null -and $response.IsSuccessStatusCode -and $response.Body.company -eq "Test HR Company Inc." -and $response.Body.years_of_experience -eq 5 -and $response.Body.hr_status -eq "profile_complete"); $updateHrProfileReason = "Expected company, YoE, and hr_status 'profile_complete'."; if (-not $isUpdateHrProfileSuccess -and $response -ne $null -and $response.Body) { $updateHrProfileReason += " Got company: $($response.Body.company), YoE: $($response.Body.years_of_experience), status: $($response.Body.hr_status)." }; Log-TestResult "Update HR Profile" $isUpdateHrProfileSuccess $updateHrProfileReason $response
    $Error.Clear(); $responseGetHrMessages = Invoke-ApiRequest -Method GET -Uri "$($Global:BaseUrlHr)/messages" -Token $Global:HrUser.Token -AllowError -TestNameForLog "Get HR Messages"; $isSuccessGetHrMessages = $false; $hrMessagesFailureReason = "Default"; $responseForLogHrMsg = $responseGetHrMessages; if ($responseGetHrMessages -ne $null -and -not $responseGetHrMessages.IsSuccessStatusCode -and $responseGetHrMessages.StatusCode -eq 404) { $isSuccessGetHrMessages = $true; $hrMessagesFailureReason = "PASSED: API returned 404 for no messages." } elseif ($responseGetHrMessages -ne $null -and $responseGetHrMessages.IsSuccessStatusCode) { if ($responseGetHrMessages.Body -is [array]) { $isSuccessGetHrMessages = $true; $hrMessagesFailureReason = "PASSED: Received array."; if ($responseGetHrMessages.Body.Count -eq 0) { $hrMessagesFailureReason += " (Empty)" } } elseif ($responseGetHrMessages.Body -eq $null) { $isSuccessGetHrMessages = $true; $hrMessagesFailureReason = "PASSED: Response body null (empty [] from API)." } else { $hrMessagesFailureReason = "FAILED: Expected array, got $($responseGetHrMessages.Body.GetType().FullName)" } } else { $hrMessagesFailureReason = "FAILED: Unexpected response." }; Log-TestResult "Get HR Messages" $isSuccessGetHrMessages $hrMessagesFailureReason $responseForLogHrMsg
    $Global:HrUser.FirstMessageId = $null; if ($responseGetHrMessages -ne $null -and $responseGetHrMessages.IsSuccessStatusCode -and $responseGetHrMessages.Body -is [array] -and $responseGetHrMessages.Body.Count -gt 0) { $Global:HrUser.FirstMessageId = $responseGetHrMessages.Body[0].id }
    if ($Global:HrUser.FirstMessageId) { $markReadPayloadHr = @{ message_ids = @($Global:HrUser.FirstMessageId) }; $response = Invoke-ApiRequest -Method POST -Uri "$($Global:BaseUrlHr)/messages/mark-read" -Body $markReadPayloadHr -Token $Global:HrUser.Token -AllowError -TestNameForLog "Mark HR Message Read"; Log-TestResult "Mark HR Message Read" ($response -ne $null -and $response.IsSuccessStatusCode -and $response.Body.modified_count -ge 0) "Expected modified_count >= 0" $response } else { Log-TestResult "Mark HR Message Read" $true "Skipped: No HR messages." }
    if ($Global:HrUser.FirstMessageId) { $markUnreadPayloadHr = @{ message_ids = @($Global:HrUser.FirstMessageId) }; $response = Invoke-ApiRequest -Method POST -Uri "$($Global:BaseUrlHr)/messages/mark-unread" -Body $markUnreadPayloadHr -Token $Global:HrUser.Token -AllowError -TestNameForLog "Mark HR Message Unread"; Log-TestResult "Mark HR Message Unread" ($response -ne $null -and $response.IsSuccessStatusCode -and $response.Body.modified_count -ge 0) "Expected modified_count >= 0" $response } else { Log-TestResult "Mark HR Message Unread" $true "Skipped: No HR messages." }
    $response = Invoke-ApiRequest -Method POST -Uri "$($Global:BaseUrlHr)/resume" -Body @{} -Token $Global:HrUser.Token -AllowError -TestNameForLog "HR Upload Resume (Check Auth/Existence)"; Log-TestResult "HR Upload Resume (Endpoint Auth Check)" ($response -ne $null -and (-not $response.IsSuccessStatusCode) -and ($response.StatusCode -eq 422 -or $response.StatusCode -eq 400)) "Expected 422 or 400" $response; Write-Host "NOTE: Full resume upload not implemented." -Fg Yellow
    $responseListAdmins = Invoke-ApiRequest -Method GET -Uri "$($Global:BaseUrlHr)/admins" -Token $Global:HrUser.Token -AllowError -TestNameForLog "HR List Admins"; $isListAdminsSuccess = $false; $listAdminsReason = "Default"; $Global:AdminUser.IdFromList = $null; if ($responseListAdmins -ne $null -and $responseListAdmins.IsSuccessStatusCode -and $responseListAdmins.Body -is [array]) { if ($responseListAdmins.Body.Count -gt 0) { $foundAdminInList = $responseListAdmins.Body | Where-Object { $_.email -eq $Global:AdminUser.Email }; if ($foundAdminInList) { $Global:AdminUser.IdFromList = $foundAdminInList[0].id; $isListAdminsSuccess = $true; $listAdminsReason = "PASSED: Test admin '$($Global:AdminUser.Email)' found with ID '$($Global:AdminUser.IdFromList)'."; Write-Host "Captured Admin ID: $($Global:AdminUser.IdFromList)" -Fg DarkCyan } else { $listAdminsReason = "FAILED: Test admin '$($Global:AdminUser.Email)' NOT found." } } else { $listAdminsReason = "FAILED: Admin list empty." } } else { $listAdminsReason = "FAILED: Expected array, got something else or error." }; Log-TestResult "HR List Admins" $isListAdminsSuccess $listAdminsReason $responseListAdmins

    $Error.Clear()
    if ($Global:AdminUser.IdFromList) {
        $adminIdToApply = $Global:AdminUser.IdFromList
        $responseApply = Invoke-ApiRequest -Method POST -Uri "$($Global:BaseUrlHr)/apply/$adminIdToApply" -Token $Global:HrUser.Token -AllowError -TestNameForLog "HR Apply to Admin"
        $isApplySuccess = $false; $applyReason = "Default"
        Write-Host "[DEBUG HR Apply] Response StatusCode: $($responseApply.StatusCode), IsSuccess: $($responseApply.IsSuccessStatusCode)" -ForegroundColor Magenta
        if ($responseApply.Body) { Write-Host "[DEBUG HR Apply] Body Status: $($responseApply.Body.status), Requester: $($responseApply.Body.requester_id)" -ForegroundColor Magenta }

        if ($responseApply -ne $null -and $responseApply.IsSuccessStatusCode -and $responseApply.StatusCode -eq 202) {
            if ($responseApply.Body -ne $null -and $responseApply.Body.status -eq 'pending' -and $responseApply.Body.requester_id -eq $Global:HrUser.id) {
                $isApplySuccess = $true; $applyReason = "PASSED: Application submitted (202 Accepted), status 'pending', correct requester."
            }
            else { $applyReason = "FAILED: Got 202, but response body content mismatch. Expected status 'pending' and requester_id '$($Global:HrUser.id)'. Got status '$($responseApply.Body.status)' and requester_id '$($responseApply.Body.requester_id)'." }
        }
        elseif ($responseApply -ne $null -and -not $responseApply.IsSuccessStatusCode) { 
            $applyReason = "FAILED: API returned error $($responseApply.StatusCode)."
        }
        else { $applyReason = "FAILED: Unexpected response for HR Apply to Admin (e.g., null response or non-202 success)." }
        Log-TestResult "HR Apply to Admin" $isApplySuccess $applyReason $responseApply
    }
    else { Log-TestResult "HR Apply to Admin" $true "Skipped: Admin ID not available." }
    
    Write-Host "Re-logging in HR user before Unmap test..." -ForegroundColor Cyan
    $loginFormHrRelogin = @{ username = $Global:HrUser.Email; password = $Global:DefaultPassword }
    $responseLoginHrRelogin = Invoke-RestMethod -Method POST -Uri "$($Global:BaseUrlAuth)/login" -Body $loginFormHrRelogin -ContentType "application/x-www-form-urlencoded" -ErrorAction SilentlyContinue
    if ($responseLoginHrRelogin -ne $null -and $responseLoginHrRelogin.access_token) { 
        $Global:HrUser.Token = $responseLoginHrRelogin.access_token
        Write-Host "HR user re-logged in successfully for Unmap test." -ForegroundColor Green
        # After re-login, fetch the latest HR profile to update $Global:HrUser object, especially admin_manager_id
        $hrProfileAfterRelogin = Invoke-ApiRequest -Method GET -Uri "$($Global:BaseUrlHr)/me/profile" -Token $Global:HrUser.Token -AllowError -TestNameForLog "Fetch HR Profile for Unmap"
        if ($hrProfileAfterRelogin -ne $null -and $hrProfileAfterRelogin.IsSuccessStatusCode -and $hrProfileAfterRelogin.Body) {
            $Global:HrUser.hr_status = $hrProfileAfterRelogin.Body.hr_status
            $Global:HrUser.admin_manager_id = $hrProfileAfterRelogin.Body.admin_manager_id
            Write-Host "Updated Global:HrUser for Unmap test: Status '$($Global:HrUser.hr_status)', AdminManagerID '$($Global:HrUser.admin_manager_id)'" -ForegroundColor Cyan
        }
        else { Write-Host "Failed to fetch/update HR profile in Global:HrUser before Unmap." -ForegroundColor Yellow }
    }
    else { Write-Host "HR user re-login FAILED before Unmap test." -ForegroundColor Red }

    if ($Global:HrUser.Token) { $response = Invoke-ApiRequest -Method POST -Uri "$($Global:BaseUrlHr)/unmap" -Body @{} -Token $Global:HrUser.Token -AllowError -TestNameForLog "HR Unmap"; Log-TestResult "HR Unmap" ($response -ne $null -and $response.IsSuccessStatusCode -and ($response.Body.hr_status -eq 'profile_complete' -or $response.Body.message -match "unmapped")) "Expected success or updated HR status" $response } else { Log-TestResult "HR Unmap" $true "Skipped: HR token not available for Unmap." }
    if ($Global:HrUser.Token) { $response = Invoke-ApiRequest -Method GET -Uri "$($Global:BaseUrlHr)/search-candidates?keyword=test" -Token $Global:HrUser.Token -AllowError -TestNameForLog "HR Search Candidates"; Log-TestResult "HR Search Candidates" ($response -ne $null -and $response.IsSuccessStatusCode -and $response.Body -is [array]) "Expected an array" $response } else { Log-TestResult "HR Search Candidates" $true "Skipped: HR token not available." }
    if ($Global:CandidateUser.id -and $Global:HrUser.Token) { $candidateIdToInvite = $Global:CandidateUser.id; $invitationMessage = @{ subject = "Interview Invitation"; content = "We'd like to invite you to an interview." }; $response = Invoke-ApiRequest -Method POST -Uri "$($Global:BaseUrlHr)/candidate-invitations/$candidateIdToInvite" -Body $invitationMessage -Token $Global:HrUser.Token -AllowError -TestNameForLog "HR Send Candidate Invitation"; Log-TestResult "HR Send Candidate Invitation" ($response -ne $null -and $response.IsSuccessStatusCode -and ($response.Body.message -match "sent" -or $response.StatusCode -eq 200 -or $response.StatusCode -eq 201)) "Expected success message or 200/201" $response } else { Log-TestResult "HR Send Candidate Invitation" $true "Skipped: Candidate ID or HR token not available." }
}
else { Write-Host "Skipping HR Service tests." -Fg Yellow }

Write-Host "`n===== TESTING ADMIN SERVICE =====" -ForegroundColor Cyan
if ($Global:AdminUser.Token) {
    $response = Invoke-ApiRequest -Method GET -Uri "$($Global:BaseUrlAdmin)/users" -Token $Global:AdminUser.Token -AllowError -TestNameForLog "Admin Get All Users"; Log-TestResult "Admin Get All Users" ($response -ne $null -and $response.IsSuccessStatusCode -and $response.Body -is [array]) "Expected an array" $response
    $response = Invoke-ApiRequest -Method GET -Uri "$($Global:BaseUrlAdmin)/stats" -Token $Global:AdminUser.Token -AllowError -TestNameForLog "Admin Get System Stats"; Log-TestResult "Admin Get System Stats" ($response -ne $null -and $response.IsSuccessStatusCode -and $response.Body.total_users -ge 3) "Expected at least 3 users" $response
    if ($Global:HrUser.id) { $hrUserIdToFetch = $Global:HrUser.id; $responseGetUser = Invoke-ApiRequest -Method GET -Uri "$($Global:BaseUrlAdmin)/users/$hrUserIdToFetch" -Token $Global:AdminUser.Token -AllowError -TestNameForLog "Admin Get Specific HR User"; Log-TestResult "Admin Get Specific HR User" ($responseGetUser -ne $null -and $responseGetUser.IsSuccessStatusCode -and $responseGetUser.Body.email -eq $Global:HrUser.Email) "Expected HR user details" $responseGetUser } else { Log-TestResult "Admin Get Specific HR User" $true "Skipped: HR User ID not captured." }
    
    $Error.Clear()
    $responsePendingReqs = Invoke-ApiRequest -Method GET -Uri "$($Global:BaseUrlAdmin)/hr-applications" -Token $Global:AdminUser.Token -AllowError -TestNameForLog "Admin Get Pending HR Mapping Requests"
    $isPendingReqSuccess = $false; $pendingReqReason = "Default"; $responseForLogPending = $responsePendingReqs
    if ($responsePendingReqs -ne $null -and -not $responsePendingReqs.IsSuccessStatusCode) { 
        $pendingReqReason = "FAILED: HTTP error $($responsePendingReqs.StatusCode)"
    }
    elseif ($responsePendingReqs -ne $null -and $responsePendingReqs.IsSuccessStatusCode) {
        if ($responsePendingReqs.Body -is [array]) { $isPendingReqSuccess = $true; $pendingReqReason = "PASSED: Received array."; if ($responsePendingReqs.Body.Count -eq 0) { $pendingReqReason += " (Empty)" } }
        elseif ($responsePendingReqs.Body -eq $null) { $isPendingReqSuccess = $true; $pendingReqReason = "PASSED: Response body null (empty [] from API)." }
        elseif ($responsePendingReqs.Body -is [System.Management.Automation.PSCustomObject]) { $isPendingReqSuccess = $true; $pendingReqReason = "PASSED: Received single application object." }
        else { $pendingReqReason = "FAILED: Expected array or single object, got $($responsePendingReqs.Body.GetType().FullName)" }
    }
    else { $pendingReqReason = "FAILED: Unexpected response or null." }
    Log-TestResult "Admin Get Pending HR Mapping Requests" $isPendingReqSuccess $pendingReqReason $responseForLogPending

    $Global:HrUser.MappingRequestId = $null; $actualPendingData = $null
    if ($responsePendingReqs -ne $null -and $responsePendingReqs.IsSuccessStatusCode) {
        if ($responsePendingReqs.Body -is [array] -and $responsePendingReqs.Body.Count -gt 0) { $actualPendingData = $responsePendingReqs.Body[0] }
        elseif ($responsePendingReqs.Body -is [System.Management.Automation.PSCustomObject]) { $actualPendingData = $responsePendingReqs.Body }
    }
    $hrUserIdStr = [string]$Global:HrUser.id 
    Write-Host "[DEBUG AdminGetPending] Comparing HR User ID (string): '$($hrUserIdStr)' with Actual Requester ID: '$($actualPendingData.requester_id)' (Type: $($actualPendingData.requester_id.GetType().FullName))" -ForegroundColor Gray
    Write-Host "[DEBUG AdminGetPending] Actual Pending Data _id: '$($actualPendingData._id)' (Type: $($actualPendingData._id.GetType().FullName))" -ForegroundColor Gray
    
    if ($actualPendingData -ne $null -and $actualPendingData.requester_id -eq $hrUserIdStr) {
        $Global:HrUser.MappingRequestId = $actualPendingData._id 
        Write-Host "Captured HR Mapping Request ID: '$($Global:HrUser.MappingRequestId)' for HR '$($Global:HrUser.Email)'" -ForegroundColor DarkCyan
    }
    elseif ($isPendingReqSuccess) { 
        Write-Host "Could not find/extract pending mapping request for HR ID '$($hrUserIdStr)' (Email: $($Global:HrUser.Email)). Actual Requester ID in response: '$($actualPendingData.requester_id)'" -ForegroundColor Yellow 
    }

    if ($Global:HrUser.MappingRequestId) { $requestIdToAccept = $Global:HrUser.MappingRequestId; $acceptUri = "$($Global:BaseUrlAdmin)/hr-applications/$requestIdToAccept/accept"; Write-Host "[DEBUG] Admin Accept HR URI: $acceptUri" -Fg Cyan; $responseAcceptRequest = Invoke-ApiRequest -Method POST -Uri $acceptUri -Token $Global:AdminUser.Token -AllowError -TestNameForLog "Admin Accept HR Mapping Request"; Write-Host "[DEBUG] Admin Accept HR Response: $($responseAcceptRequest | ConvertTo-Json -Depth 5)" -Fg Cyan; $isAcceptSuccess = ($responseAcceptRequest -ne $null -and $responseAcceptRequest.IsSuccessStatusCode -and $responseAcceptRequest.Body.message -match "accepted"); Log-TestResult "Admin Accept HR Mapping Request" $isAcceptSuccess "Expected successful acceptance" $responseAcceptRequest } 
    else { Log-TestResult "Admin Accept HR Mapping Request" $true "Skipped: No pending HR request ID." }
    
    $loginFormHr = @{ username = $Global:HrUser.Email; password = $Global:DefaultPassword }
    $responseLoginHr2 = Invoke-RestMethod -Method POST -Uri "$($Global:BaseUrlAuth)/login" -Body $loginFormHr -ContentType "application/x-www-form-urlencoded" -ErrorAction SilentlyContinue
    if ($responseLoginHr2 -ne $null -and $responseLoginHr2.access_token) { $Global:HrUser.Token = $responseLoginHr2.access_token; Log-TestResult "Login HR User" $true "" $responseLoginHr2 } else { $errDetails = "Unknown login error."; if ($Error[0] -and $Error[0].Exception.Response) { $errStream = $Error[0].Exception.Response.GetResponseStream(); $errReader = New-Object System.IO.StreamReader($errStream); $errDetails = $errReader.ReadToEnd(); $errReader.Close(); $errStream.Close() }; Log-TestResult "Login HR User" $false "Failed to login. Details: $errDetails" $responseLoginHr2 }
    
    if ($Global:HrUser.Token) { 
        $responseHrProfile = Invoke-ApiRequest -Method GET -Uri "$($Global:BaseUrlHr)/me/profile" -Token $Global:HrUser.Token -AllowError -TestNameForLog "Get HR Profile After Re-Login"
        if ($responseHrProfile -ne $null -and $responseHrProfile.IsSuccessStatusCode -and $responseHrProfile.Body) {
            # Update global HR user object with latest fetched details
            $Global:HrUser.hr_status = $responseHrProfile.Body.hr_status
            $Global:HrUser.admin_manager_id = $responseHrProfile.Body.admin_manager_id
            Write-Host "[DEBUG HR Status Check] Updated Global:HrUser: Status '$($Global:HrUser.hr_status)', AdminManagerID '$($Global:HrUser.admin_manager_id)'" -ForegroundColor Cyan
        }
        if ($responseHrProfile -ne $null -and $responseHrProfile.IsSuccessStatusCode -and $responseHrProfile.Body.hr_status -eq "mapped") { 
            Log-TestResult "HR Status Check After Re-Login" $true "HR status is 'mapped'." $responseHrProfile 
        }
        else { 
            $statusMsg = if ($responseHrProfile -ne $null -and $responseHrProfile.Body) { $responseHrProfile.Body.hr_status } elseif ($responseHrProfile -ne $null -and -not $responseHrProfile.IsSuccessStatusCode) { $responseHrProfile.StatusCode } else { "null response" }; 
            Log-TestResult "HR Status Check After Re-Login" $false "HR status is NOT 'mapped'. Status: $statusMsg" $responseHrProfile 
        } 
    }
    else { Log-TestResult "HR Status Check After Re-Login" $false "HR token not available." }
    Write-Host "Placeholder: Add Admin Reject HR Mapping Request test." -ForegroundColor Magenta
    
    $Error.Clear()
    if ($Global:AdminUser.Token) {
        $responseSearchHr = Invoke-ApiRequest -Method GET -Uri "$($Global:BaseUrlAdmin)/search-hr?keyword=test" -Token $Global:AdminUser.Token -AllowError -TestNameForLog "Admin Search HR"
        $isSearchHrSuccess = $false; $searchHrReason = "Default"; $responseForLogSearch = $responseSearchHr
        if ($responseSearchHr -ne $null -and -not $responseSearchHr.IsSuccessStatusCode) { $searchHrReason = "FAILED: HTTP error $($responseSearchHr.StatusCode)"; }
        elseif ($responseSearchHr -ne $null -and $responseSearchHr.IsSuccessStatusCode) {
            if ($responseSearchHr.Body -is [array]) { $isSearchHrSuccess = $true; $searchHrReason = "PASSED: Received array."; if ($responseSearchHr.Body.Count -eq 0) { $searchHrReason += " (Empty)" } }
            elseif ($responseSearchHr.Body -eq $null) { $isSearchHrSuccess = $true; $searchHrReason = "PASSED: Response body null (empty [] from API)." }
            else { $searchHrReason = "FAILED: Expected array, got $($responseSearchHr.Body.GetType().FullName)" }
        }
        else { $searchHrReason = "FAILED: Unexpected response or null." }
        Log-TestResult "Admin Search HR" $isSearchHrSuccess $searchHrReason $responseForLogSearch
    }
    else { Log-TestResult "Admin Search HR" $true "Skipped: Admin token not available." }
    Write-Host "Placeholder: Admin Delete User test." -ForegroundColor Magenta
}
else { Write-Host "Skipping Admin Service tests." -Fg Yellow }

# Add Test: Admin Assign HR to Candidate (before Schedule Interview)
Write-Host "`n===== TESTING CANDIDATE ASSIGNMENT (ADMIN) =====" -ForegroundColor Cyan
if ($Global:AdminUser.Token -and $Global:HrUser.id -and $Global:CandidateUser.id) {
    $hrUserForAssignmentCheck = Invoke-ApiRequest -Method GET -Uri "$($Global:BaseUrlHr)/me/profile" -Token $Global:HrUser.Token -AllowError -TestNameForLog "Pre-Assign Check HR Status"
    if ($hrUserForAssignmentCheck -ne $null -and $hrUserForAssignmentCheck.IsSuccessStatusCode -and $hrUserForAssignmentCheck.Body.hr_status -eq "mapped") {
        Write-Host "HR $($Global:HrUser.Email) is confirmed 'mapped'. Proceeding with candidate assignment." -ForegroundColor Green
        $assignPayload = @{ hr_id = $Global:HrUser.id }
        $assignUri = "$($Global:BaseUrlAdmin)/candidates/$($Global:CandidateUser.id)/assign-hr"
        $responseAssign = Invoke-ApiRequest -Method POST -Uri $assignUri -Body $assignPayload -Token $Global:AdminUser.Token -AllowError -TestNameForLog "Admin Assign HR to Candidate"
        
        $isAssignSuccess = $false; $assignReason = "Default"
        if ($responseAssign -ne $null -and $responseAssign.IsSuccessStatusCode) {
            if ($responseAssign.Body.assigned_hr_id -eq $Global:HrUser.id -and $responseAssign.Body.mapping_status -eq "assigned") {
                $isAssignSuccess = $true; $assignReason = "PASSED: Candidate successfully assigned to HR."
                $Global:CandidateUser.mapping_status = "assigned" 
                $Global:CandidateUser.assigned_hr_id = $Global:HrUser.id
            }
            else { $assignReason = "FAILED: Assignment response body did not match expected. Got assigned_hr_id '$($responseAssign.Body.assigned_hr_id)' and mapping_status '$($responseAssign.Body.mapping_status)'." }
        }
        elseif ($responseAssign -ne $null -and -not $responseAssign.IsSuccessStatusCode) { 
            $assignReason = "FAILED: API error during assignment. Status: $($responseAssign.StatusCode). Detail: $($responseAssign.ParsedResponseBody.detail)" 
        }
        else { $assignReason = "FAILED: Unexpected null response during assignment." }
        Log-TestResult "Admin Assign HR to Candidate" $isAssignSuccess $assignReason $responseAssign
    }
    else {
        $statusMsg = if ($hrUserForAssignmentCheck.Body) { $hrUserForAssignmentCheck.Body.hr_status } else { $hrUserForAssignmentCheck.StatusCode }
        Log-TestResult "Admin Assign HR to Candidate" $false "Skipped: HR User '$($Global:HrUser.Email)' is not 'mapped' (status: $statusMsg). Cannot assign to candidate." $hrUserForAssignmentCheck
    }
}
else {
    Log-TestResult "Admin Assign HR to Candidate" $true "Skipped: Admin/HR/Candidate info missing for assignment."
}

Write-Host "`n===== TESTING INTERVIEW SERVICE =====" -ForegroundColor Cyan
if ($Global:CandidateUser.Token -and $Global:HrUser.Token) {
    $response = Invoke-ApiRequest -Method GET -Uri "$($Global:BaseUrlInterview)/default-questions" -AllowError -TestNameForLog "Get Default Questions"; $isSuccess = ($response -ne $null -and $response.IsSuccessStatusCode -and ($response.Body -is [array] -or $response.Body -eq $null)); $errorMessage = "Expected array."; if ($response -ne $null -and $response.IsSuccessStatusCode -and -not ($response.Body -is [array]) -and $response.Body -ne $null) { $errorMessage += " Got $($response.Body.GetType().FullName)." } elseif ($response -ne $null -and $response.IsSuccessStatusCode -and $response.Body -eq $null) { $errorMessage += " (Null body from API)" }; Log-TestResult "Get Default Questions" $isSuccess $errorMessage $response
    if ($Global:CandidateUser.id -and $Global:AdminUser.Token) { $schedulePayload = @{ candidate_id = $Global:CandidateUser.id; job_title = "Test Developer Role"; job_description = "Develop and maintain test scripts."; role = "Software Engineer"; tech_stack = @("PowerShell", "API Testing") }; $responseSchedule = Invoke-ApiRequest -Method POST -Uri "$($Global:BaseUrlInterview)/schedule" -Body $schedulePayload -Token $Global:AdminUser.Token -AllowError -TestNameForLog "Schedule Interview (Admin)"; if ($responseSchedule -ne $null -and $responseSchedule.IsSuccessStatusCode -and $responseSchedule.Body.id -and $responseSchedule.Body.interview_id -and $responseSchedule.Body.questions -is [array] -and $responseSchedule.Body.questions.Count -gt 0) { $Global:ScheduledInterviewId = $responseSchedule.Body.interview_id; $Global:ScheduledInterviewDbId = $responseSchedule.Body.id; $Global:ScheduledInterviewQuestions = $responseSchedule.Body.questions; Log-TestResult "Schedule Interview (Admin)" $true "Scheduled ID: $($Global:ScheduledInterviewId)" $responseSchedule } else { Log-TestResult "Schedule Interview (Admin)" $false "Failed to schedule." $responseSchedule } } else { Log-TestResult "Schedule Interview (Admin)" $true "Skipped." }
    if ($Global:ScheduledInterviewId -and $Global:CandidateUser.Token -and $Global:ScheduledInterviewQuestions.Count -gt 0) { $firstQuestion = $Global:ScheduledInterviewQuestions[0]; $singleAnswerPayload = @{ interview_id = $Global:ScheduledInterviewId; question_id = $firstQuestion.question_id; answer = "Test answer." }; $responseSubmitSingle = Invoke-ApiRequest -Method POST -Uri "$($Global:BaseUrlInterview)/submit-response" -Body $singleAnswerPayload -Token $Global:CandidateUser.Token -AllowError -TestNameForLog "Submit Single Interview Response"; Log-TestResult "Submit Single Interview Response" ($responseSubmitSingle -ne $null -and $responseSubmitSingle.IsSuccessStatusCode -and ($responseSubmitSingle.Body.answer -eq $singleAnswerPayload.answer -or $responseSubmitSingle.Body.message -match "success")) "Expected success" $responseSubmitSingle; if ($responseSubmitSingle -ne $null -and $responseSubmitSingle.IsSuccessStatusCode -and $responseSubmitSingle.Body.id) { $Global:SubmittedResponses += $responseSubmitSingle.Body } } else { Log-TestResult "Submit Single Interview Response" $true "Skipped." }
    if ($Global:ScheduledInterviewId -and $Global:CandidateUser.Token -and $Global:ScheduledInterviewQuestions.Count -gt 0) { $answers = @(); foreach ($q in $Global:ScheduledInterviewQuestions) { $answers += @{ question_id = $q.question_id; answer_text = "Ans for $($q.text)" } }; $allAnswersPayload = @{ interview_id = $Global:ScheduledInterviewId; answers = $answers }; $responseSubmitAll = Invoke-ApiRequest -Method POST -Uri "$($Global:BaseUrlInterview)/submit-all" -Body $allAnswersPayload -Token $Global:CandidateUser.Token -AllowError -TestNameForLog "Submit All Interview Responses"; Log-TestResult "Submit All Interview Responses" ($responseSubmitAll -ne $null -and $responseSubmitAll.IsSuccessStatusCode -and ($responseSubmitAll.Body.message -match "submitted successfully" -or $responseSubmitAll.StatusCode -eq 200)) "Expected success" $responseSubmitAll } else { Log-TestResult "Submit All Interview Responses" $true "Skipped." }
    if ($Global:CandidateUser.Token) { $responseMyInterviews = Invoke-ApiRequest -Method GET -Uri "$($Global:BaseUrlInterview)/candidate/me" -Token $Global:CandidateUser.Token -AllowError -TestNameForLog "Get Candidate's Own Interviews"; $isSuccess = ($responseMyInterviews -ne $null -and $responseMyInterviews.IsSuccessStatusCode -and ($responseMyInterviews.Body -is [array] -or $responseMyInterviews.Body -eq $null)); $message = "Expected an array of interviews."; if ($Global:ScheduledInterviewId -and $responseMyInterviews -ne $null -and $responseMyInterviews.IsSuccessStatusCode -and $responseMyInterviews.Body -is [array]) { $foundScheduled = $responseMyInterviews.Body | Where-Object { $_.interview_id -eq $Global:ScheduledInterviewId }; if ($foundScheduled) { $message += " Found scheduled interview." } else { $isSuccess = $false; $message += " Scheduled interview $($Global:ScheduledInterviewId) not found." } } elseif ($responseMyInterviews -ne $null -and $responseMyInterviews.IsSuccessStatusCode -and $responseMyInterviews.Body -eq $null) { $message += " (Empty list)" }; Log-TestResult "Get Candidate's Own Interviews" $isSuccess $message $responseMyInterviews } else { Log-TestResult "Get Candidate's Own Interviews" $true "Skipped: Candidate token not available." }
    if ($Global:CandidateUser.Token) { $responseMyHistory = Invoke-ApiRequest -Method GET -Uri "$($Global:BaseUrlInterview)/candidate/history" -Token $Global:CandidateUser.Token -AllowError -TestNameForLog "Get Candidate's Interview History"; $isSuccess = ($responseMyHistory -ne $null -and $responseMyHistory.IsSuccessStatusCode -and ($responseMyHistory.Body -is [array] -or $responseMyHistory.Body -eq $null)); $message = "Expected an array of interview history."; if ($Global:ScheduledInterviewId -and $responseMyHistory -ne $null -and $responseMyHistory.IsSuccessStatusCode -and $responseMyHistory.Body -is [array]) { $foundCompleted = $responseMyHistory.Body | Where-Object { $_.interview_id -eq $Global:ScheduledInterviewId }; if ($foundCompleted) { $message += " Found completed interview." } else { $isSuccess = $false; $message += " Completed interview $($Global:ScheduledInterviewId) not found." } } elseif ($responseMyHistory -ne $null -and $responseMyHistory.IsSuccessStatusCode -and $responseMyHistory.Body -eq $null) { $message += " (Empty list)" }; Log-TestResult "Get Candidate's Interview History" $isSuccess $message $responseMyHistory } else { Log-TestResult "Get Candidate's Interview History" $true "Skipped: Candidate token not available." }
    if ($Global:AdminUser.Token -or $Global:HrUser.Token) { $token = if ($Global:AdminUser.Token) { $Global:AdminUser.Token } else { $Global:HrUser.Token }; $responseAllInterviews = Invoke-ApiRequest -Method GET -Uri "$($Global:BaseUrlInterview)/all" -Token $token -AllowError -TestNameForLog "Get All Interviews (Admin/HR)"; $isSuccess = ($responseAllInterviews -ne $null -and $responseAllInterviews.IsSuccessStatusCode -and ($responseAllInterviews.Body -is [array] -or $responseAllInterviews.Body -eq $null)); $message = "Expected an array of interviews."; if ($Global:ScheduledInterviewId -and $responseAllInterviews -ne $null -and $responseAllInterviews.IsSuccessStatusCode -and $responseAllInterviews.Body -is [array]) { $foundScheduled = $responseAllInterviews.Body | Where-Object { $_.interview_id -eq $Global:ScheduledInterviewId }; if ($foundScheduled) { $message += " Found scheduled/completed interview." } else { $isSuccess = $false; $message += " Scheduled/completed interview $($Global:ScheduledInterviewId) not found." } } elseif ($responseAllInterviews -ne $null -and $responseAllInterviews.IsSuccessStatusCode -and $responseAllInterviews.Body -eq $null) { $message += " (Empty list)" }; Log-TestResult "Get All Interviews (Admin/HR)" $isSuccess $message $responseAllInterviews } else { Log-TestResult "Get All Interviews (Admin/HR)" $true "Skipped: Admin or HR token not available." }
    if ($Global:ScheduledInterviewId -and ($Global:AdminUser.Token -or $Global:HrUser.Token -or $Global:CandidateUser.Token)) { $token = if ($Global:AdminUser.Token) { $Global:AdminUser.Token } elseif ($Global:HrUser.Token) { $Global:HrUser.Token } else { $Global:CandidateUser.Token }; $responseInterviewDetails = Invoke-ApiRequest -Method GET -Uri "$($Global:BaseUrlInterview)/$($Global:ScheduledInterviewId)" -Token $token -AllowError -TestNameForLog "Get Interview Details (by ID)"; Log-TestResult "Get Interview Details (by ID)" ($responseInterviewDetails -ne $null -and $responseInterviewDetails.IsSuccessStatusCode -and $responseInterviewDetails.Body.interview_id -eq $Global:ScheduledInterviewId) "Expected interview details for ID $($Global:ScheduledInterviewId)" $responseInterviewDetails } else { Log-TestResult "Get Interview Details (by ID)" $true "Skipped: Scheduled Interview ID or any user token not available." }
    if ($Global:ScheduledInterviewId -and ($Global:AdminUser.Token -or $Global:HrUser.Token -or $Global:CandidateUser.Token)) { $token = if ($Global:AdminUser.Token) { $Global:AdminUser.Token } elseif ($Global:HrUser.Token) { $Global:HrUser.Token } else { $Global:CandidateUser.Token }; $responseAllResponsesForInterview = Invoke-ApiRequest -Method GET -Uri "$($Global:BaseUrlInterview)/$($Global:ScheduledInterviewId)/responses" -Token $token -AllowError -TestNameForLog "Get All Responses for Interview (by ID)"; $isSuccess = ($responseAllResponsesForInterview -ne $null -and $responseAllResponsesForInterview.IsSuccessStatusCode -and ($responseAllResponsesForInterview.Body -is [array] -or $responseAllResponsesForInterview.Body -eq $null)); $message = "Expected an array of responses."; if ($Global:ScheduledInterviewQuestions.Count -gt 0 -and $responseAllResponsesForInterview -ne $null -and $responseAllResponsesForInterview.IsSuccessStatusCode -and $responseAllResponsesForInterview.Body -is [array]) { if ($responseAllResponsesForInterview.Body.Count -ge $Global:ScheduledInterviewQuestions.Count) { $message += " Found at least $($Global:ScheduledInterviewQuestions.Count) responses." } else { $isSuccess = $false; $message += " Expected at least $($Global:ScheduledInterviewQuestions.Count) responses, but found $($responseAllResponsesForInterview.Body.Count)." } } elseif ($responseAllResponsesForInterview -ne $null -and $responseAllResponsesForInterview.IsSuccessStatusCode -and $responseAllResponsesForInterview.Body -eq $null) { $message += " (Empty list)" }; Log-TestResult "Get All Responses for Interview (by ID)" $isSuccess $message $responseAllResponsesForInterview; if ($responseAllResponsesForInterview -ne $null -and $responseAllResponsesForInterview.IsSuccessStatusCode -and $responseAllResponsesForInterview.Body -is [array] -and $responseAllResponsesForInterview.Body.Count -gt 0) { $Global:SubmittedResponses = $responseAllResponsesForInterview.Body } else { $Global:SubmittedResponses = @() } } else { Log-TestResult "Get All Responses for Interview (by ID)" $true "Skipped: Scheduled Interview ID or any user token not available." }
    if ($Global:SubmittedResponses.Count -gt 0 -and ($Global:AdminUser.Token -or $Global:HrUser.Token)) { $token = if ($Global:AdminUser.Token) { $Global:AdminUser.Token } else { $Global:HrUser.Token }; $responseIdToEvaluate = $Global:SubmittedResponses[0].id; $responseAIEval = Invoke-ApiRequest -Method POST -Uri "$($Global:BaseUrlInterview)/responses/$responseIdToEvaluate/evaluate" -Body @{} -Token $token -AllowError -TestNameForLog "Trigger AI Evaluation"; Log-TestResult "Trigger AI Evaluation" ($responseAIEval -ne $null -and $responseAIEval.IsSuccessStatusCode -and $responseAIEval.Body.score -ne $null -and $responseAIEval.Body.feedback -ne $null) "Expected evaluated response" $responseAIEval } else { Log-TestResult "Trigger AI Evaluation" $true "Skipped: No submitted responses or Admin/HR token." }
    if ($Global:ScheduledInterviewId -and ($Global:AdminUser.Token -or $Global:HrUser.Token)) { $token = if ($Global:AdminUser.Token) { $Global:AdminUser.Token } else { $Global:HrUser.Token }; $overallResultPayload = @{ overall_score = 4.5; overall_feedback = "Good performance overall." }; $responseSubmitOverall = Invoke-ApiRequest -Method POST -Uri "$($Global:BaseUrlInterview)/$($Global:ScheduledInterviewId)/results" -Body $overallResultPayload -Token $token -AllowError -TestNameForLog "Submit Overall Interview Results"; Log-TestResult "Submit Overall Interview Results" ($responseSubmitOverall -ne $null -and $responseSubmitOverall.IsSuccessStatusCode -and ($responseSubmitOverall.Body.overall_score -eq 4.5 -or $responseSubmitOverall.Body.message -match "success" -or $responseSubmitOverall.StatusCode -eq 200)) "Expected success or updated interview object" $responseSubmitOverall } else { Log-TestResult "Submit Overall Interview Results" $true "Skipped: Scheduled Interview ID or Admin/HR token." }
    if ($Global:ScheduledInterviewId -and ($Global:AdminUser.Token -or $Global:HrUser.Token -or $Global:CandidateUser.Token)) { $token = if ($Global:AdminUser.Token) { $Global:AdminUser.Token } elseif ($Global:HrUser.Token) { $Global:HrUser.Token } else { $Global:CandidateUser.Token }; $responseSingleResult = Invoke-ApiRequest -Method GET -Uri "$($Global:BaseUrlInterview)/results/$($Global:ScheduledInterviewId)" -Token $token -AllowError -TestNameForLog "Get Single Interview Result (by ID)"; Log-TestResult "Get Single Interview Result (by ID)" ($responseSingleResult -ne $null -and $responseSingleResult.IsSuccessStatusCode -and $responseSingleResult.Body.interview_id -eq $Global:ScheduledInterviewId -and $responseSingleResult.Body.overall_score -ne $null) "Expected result object" $responseSingleResult } else { Log-TestResult "Get Single Interview Result (by ID)" $true "Skipped: Scheduled Interview ID or any user token." }
    if ($Global:AdminUser.Token -or $Global:HrUser.Token) { $token = if ($Global:AdminUser.Token) { $Global:AdminUser.Token } else { $Global:HrUser.Token }; $responseAllResults = Invoke-ApiRequest -Method GET -Uri "$($Global:BaseUrlInterview)/results/all" -Token $token -AllowError -TestNameForLog "Get All Completed Results (Admin/HR)"; $isSuccess = ($responseAllResults -ne $null -and $responseAllResults.IsSuccessStatusCode -and ($responseAllResults.Body -is [array] -or $responseAllResults.Body -eq $null)); $message = "Expected an array of results."; if ($Global:ScheduledInterviewId -and $responseAllResults -ne $null -and $responseAllResults.IsSuccessStatusCode -and $responseAllResults.Body -is [array]) { $foundResult = $responseAllResults.Body | Where-Object { $_.interview_id -eq $Global:ScheduledInterviewId }; if ($foundResult) { $message += " Found result." } else { $isSuccess = $false; $message += " Result for $($Global:ScheduledInterviewId) not found." } } elseif ($responseAllResults -ne $null -and $responseAllResults.IsSuccessStatusCode -and $responseAllResults.Body -eq $null) { $message += " (Empty list)" }; Log-TestResult "Get All Completed Results (Admin/HR)" $isSuccess $message $responseAllResults } else { Log-TestResult "Get All Completed Results (Admin/HR)" $true "Skipped: Admin or HR token." }
}
else { Write-Host "Skipping some Interview Service tests." -Fg Yellow }

Write-Host "`n===== TESTING COMPLETE =====" -ForegroundColor Green
Write-Host "Remember to check service logs for more details on any failures."
Write-Host "Created users for this test run (if successful):"
Write-Host "  Admin: $($Global:AdminUser.Email)"
Write-Host "  HR: $($Global:HrUser.Email)"
Write-Host "  Candidate: $($Global:CandidateUser.Email)"

Write-Host "`n"
Write-Host "========== TEST SUMMARY ==========" -ForegroundColor White
Write-Host "PASSED TESTS: $Global:PassedTests" -ForegroundColor Green
Write-Host "FAILED TESTS: $Global:FailedTests" -ForegroundColor Red
Write-Host "================================" -ForegroundColor White
