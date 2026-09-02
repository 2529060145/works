$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $projectRoot 'src\services\databaseService.ts'
$artifactDirectory = Join-Path $projectRoot 'test-artifacts'
$databasePath = Join-Path $artifactDirectory 'schema-smoke.db'
$sqlitePath = 'D:\Graduate_Reading_Tools\miniconda\Library\bin\sqlite3.exe'

if (-not (Test-Path -LiteralPath $sqlitePath)) {
  throw 'sqlite3.exe was not found.'
}

New-Item -ItemType Directory -Force -Path $artifactDirectory | Out-Null
if (Test-Path -LiteralPath $databasePath) {
  Remove-Item -LiteralPath $databasePath -Force
}

$source = Get-Content -Raw -LiteralPath $sourcePath
$block = [regex]::Match($source, '(?s)const migrations = \[(.*?)\]\r?\n\r?\nexport function').Groups[1].Value
$matches = [regex]::Matches($block, '(?s)`([^`]*)`|''([^'']*)''')
$statements = foreach ($match in $matches) {
  if ($match.Groups[1].Success) { $match.Groups[1].Value } else { $match.Groups[2].Value }
}

$smokeSql = @'
PRAGMA foreign_keys=ON;
INSERT INTO companies(company_name) VALUES('test-company');
INSERT INTO jobs(company_id,job_name,recruitment_count) VALUES(1,'test-job',1);
INSERT INTO applications(job_id,stage,result) VALUES(1,'APPLIED','PENDING');
SELECT 'before=' || (SELECT COUNT(*) FROM jobs) || ',' || (SELECT COUNT(*) FROM applications);
DELETE FROM companies WHERE id=1;
SELECT 'after=' || (SELECT COUNT(*) FROM jobs) || ',' || (SELECT COUNT(*) FROM applications);
'@

$sql = ($statements -join ";`n") + ";`n" + $smokeSql
$result = $sql | & $sqlitePath $databasePath
if ($LASTEXITCODE -ne 0) {
  throw 'SQLite schema smoke test failed.'
}

$result
if ($result -notcontains 'before=1,1' -or $result -notcontains 'after=0,0') {
  throw 'SQLite foreign-key cascade smoke test failed.'
}
