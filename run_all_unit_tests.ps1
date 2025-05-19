<#
.SYNOPSIS
    Runs pytest unit tests for all specified microservices.

.DESCRIPTION
    This script iterates through a list of service directories,
    navigates into each, and executes pytest.
    It assumes each service has its own 'tests' directory and pytest setup.
    The script will output a summary of total passed and failed tests across all services.
#>

$ErrorActionPreference = "Stop" # Exit on error

# Define service directories that contain unit tests
$serviceDirectories = @(
    "auth_service",
    "candidate_service",
    "hr_service",
    "admin_service",
    "interview_service"
    # Add other service directories here as they get unit tests
)

$overallSummary = @{
    TotalServicesRun = 0
    TotalServicesWithFailures = 0
    TotalTestsRun = 0
    TotalTestsPassed = 0
    TotalTestsFailed = 0
    ServicesWithFailures = [System.Collections.ArrayList]::new()
}

$rootDir = Get-Location

foreach ($serviceDir in $serviceDirectories) {
    $fullServicePath = Join-Path -Path $rootDir -ChildPath $serviceDir
    if (-not (Test-Path -Path $fullServicePath -PathType Container)) {
        Write-Warning "Service directory '$serviceDir' not found. Skipping."
        continue
    }

    Write-Output "`n===== Running tests for: $serviceDir =====" -ForegroundColor Cyan
    # No need to Push-Location, docker-compose exec works from project root
    # Ensure Docker services are running before executing this script.
    # The service name in docker-compose.yml should match $serviceDir or be mapped.
    # Example: auth_service, candidate_service etc.

    # Command to run pytest inside the container
    # Assumes pytest is installed in the container's Python environment
    # and that the working directory inside the container is /app (as per Dockerfiles)
    # The paths to tests and pytest.ini are relative to /app in the container
    $dockerComposeExecCommand = "docker-compose exec -T $serviceDir pytest -v -c /app/pytest.ini /app/tests"
    
    Write-Output "Executing in container $serviceDir : $dockerComposeExecCommand"
    
    $output = ""
    $errors = ""
    $exitCode = 0

    try {
        # Execute docker-compose exec and capture its output and exit code
        $processInfo = New-Object System.Diagnostics.ProcessStartInfo
        $processInfo.FileName = "docker-compose"
        $processInfo.Arguments = "exec -T $serviceDir pytest -v -c /app/pytest.ini /app/tests"
        $processInfo.RedirectStandardOutput = $true
        $processInfo.RedirectStandardError = $true
        $processInfo.UseShellExecute = $false
        $processInfo.CreateNoWindow = $true
        
        $process = New-Object System.Diagnostics.Process
        $process.StartInfo = $processInfo
        $process.Start() | Out-Null
        
        $output = $process.StandardOutput.ReadToEnd()
        $errors = $process.StandardError.ReadToEnd()
        
        $process.WaitForExit()
        $exitCode = $process.ExitCode
    } catch {
        Write-Warning "Failed to execute docker-compose exec for $serviceDir : $($_.Exception.Message)"
        $errors += "$($_.Exception.Message)"
        $exitCode = -1 # Indicate a script-level failure
    }

    Write-Output $output
    if ($errors) {
        Write-Output "Standard Error from ${serviceDir}:" -ForegroundColor Red
        Write-Output $errors -ForegroundColor Red
    }

    $overallSummary.TotalServicesRun++

    # Try to parse pytest summary
    $serviceTestsPassed = 0
    $serviceTestsFailed = 0
    $serviceTestsSkipped = 0
    $serviceTestsErrored = 0 # Pytest reports errors separately from failures

    # More robust parsing of pytest summary line
    # Example: "======== 1 failed, 5 passed, 1 skipped, 1 error in 0.12s ========="
    # Or: "1 error, 5 passed"
    # Or: "short test summary info" at the end
    
    # Look for the "short test summary info" line or the final summary line
    $summaryLine = $output | Select-String -Pattern "(\d+ failed)?(?:, )?(\d+ passed)?(?:, )?(\d+ skipped)?(?:, )?(\d+ error)?(?:, )?(\d+ warnings?)? in ([\d\.]+)s" | Select-Object -Last 1
    
    if ($summaryLine -and $summaryLine.Matches.Count -gt 0) {
        $match = $summaryLine.Matches[0]
        if ($match.Groups[1].Success) { $serviceTestsFailed = [int]$match.Groups[1].Value.Split(" ")[0] }
        if ($match.Groups[2].Success) { $serviceTestsPassed = [int]$match.Groups[2].Value.Split(" ")[0] }
        if ($match.Groups[3].Success) { $serviceTestsSkipped = [int]$match.Groups[3].Value.Split(" ")[0] }
        if ($match.Groups[4].Success) { $serviceTestsErrored = [int]$match.Groups[4].Value.Split(" ")[0] }
    } elseif ($output -match "(\d+) passed") { # Fallback for simpler "X passed"
        $serviceTestsPassed = [int]$Matches[1]
        if ($output -match "(\d+) failed") { $serviceTestsFailed = [int]$Matches[1] }
        if ($output -match "(\d+) skipped") { $serviceTestsSkipped = [int]$Matches[1] }
        if ($output -match "(\d+) error") { $serviceTestsErrored = [int]$Matches[1] }
    } elseif ($output -match "no tests ran") {
        Write-Output "No tests ran for $serviceDir." -ForegroundColor Yellow
    } else {
        Write-Warning "Could not parse pytest summary for $serviceDir. Relying on exit code."
    }
    
    $serviceTotalTestsAttempted = $serviceTestsPassed + $serviceTestsFailed + $serviceTestsSkipped + $serviceTestsErrored
    $overallSummary.TotalTestsRun += $serviceTotalTestsAttempted
    $overallSummary.TotalTestsPassed += $serviceTestsPassed
    $overallSummary.TotalTestsFailed += ($serviceTestsFailed + $serviceTestsErrored) # Count errors as failures for summary

    # Pytest exit codes: 0 = all passed, 1 = tests failed, 2 = interrupted, 3 = internal error, 4 = usage error, 5 = no tests collected
    if ($exitCode -eq 0) {
        Write-Output "All tests PASSED for $serviceDir" -ForegroundColor Green
    } elseif ($exitCode -eq 1) {
        Write-Output "Some tests FAILED for $serviceDir" -ForegroundColor Red
        $overallSummary.TotalServicesWithFailures++
        [void]$overallSummary.ServicesWithFailures.Add($serviceDir)
    } elseif ($exitCode -eq 5) {
        Write-Output "No tests collected for $serviceDir. Ensure tests exist and pytest.ini is correct." -ForegroundColor Yellow
        # If no tests are expected yet for some services, this might not be a "failure"
        # For now, let's not count it as a service failure unless tests were expected.
    } else { # Includes script-level errors or other pytest errors
        Write-Output "Pytest execution for $serviceDir resulted in an error, interruption, or did not run as expected (Exit Code: $exitCode). Check logs." -ForegroundColor Red
        $overallSummary.TotalServicesWithFailures++
        [void]$overallSummary.ServicesWithFailures.Add("$serviceDir (execution error)")
    }
    # No Pop-Location needed as we are not changing directory anymore
    Write-Output "========================================"
}

Write-Output "`nMake sure Docker services are running via 'docker-compose up -d --build' before running this script." -ForegroundColor Magenta
Write-Output "This script assumes service names in docker-compose.yml match: $($serviceDirectories -join ', ')" -ForegroundColor Magenta

Write-Output "`n========== OVERALL UNIT TEST SUMMARY ==========" -ForegroundColor White
Write-Output "Total Services Tested: $($overallSummary['TotalServicesRun'])"
Write-Output "Services with Failures: $($overallSummary['TotalServicesWithFailures'])"
if ($overallSummary['TotalServicesWithFailures'] -gt 0) {
    Write-Output "  Failed Services: $($overallSummary['ServicesWithFailures'] -join ', ')" -ForegroundColor Yellow
}
Write-Output "-------------------------------------------"
Write-Output "Total Tests Run: $($overallSummary['TotalTestsRun'])"
Write-Output "Total Tests PASSED: $($overallSummary['TotalTestsPassed'])" -ForegroundColor Green
Write-Output "Total Tests FAILED: $($overallSummary['TotalTestsFailed'])" -ForegroundColor Red
Write-Output "==========================================="

if ($overallSummary['TotalTestsFailed'] -gt 0 -or $overallSummary['TotalServicesWithFailures'] -gt 0) {
    Write-Output "Some unit tests failed." -ForegroundColor Red
    # exit 1 # Optionally exit with error code for CI/CD
} else {
    Write-Output "All unit tests passed across all services!" -ForegroundColor Green
}
