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

INSERT INTO companies(company_name,application_limit_type,max_applications) VALUES
  ('limit-one','LIMITED',1),('limit-three','LIMITED',3),('unlimited','UNLIMITED',NULL),('unknown','UNKNOWN',NULL);
INSERT INTO jobs(company_id,job_name) SELECT c.id,'one-job-'||value FROM companies c, json_each('[1,2,3,4,5]') WHERE c.company_name='limit-one';
INSERT INTO jobs(company_id,job_name) SELECT c.id,'three-job-'||value FROM companies c, json_each('[1,2,3,4]') WHERE c.company_name='limit-three';
INSERT INTO jobs(company_id,job_name) SELECT c.id,'unlimited-job-'||value FROM companies c, json_each('[1,2]') WHERE c.company_name='unlimited';
INSERT INTO jobs(company_id,job_name) SELECT c.id,'unknown-job-'||value FROM companies c, json_each('[1,2]') WHERE c.company_name='unknown';
INSERT INTO applications(job_id,stage,result) SELECT id,'TO_APPLY','PENDING' FROM jobs;

SELECT 'case1=' || COUNT(*) FROM jobs j JOIN companies c ON c.id=j.company_id JOIN applications a ON a.job_id=j.id
  WHERE c.company_name='limit-one' AND a.stage='TO_APPLY';
UPDATE applications SET stage='APPLIED',application_date='2026-09-03' WHERE job_id=(SELECT MIN(j.id) FROM jobs j JOIN companies c ON c.id=j.company_id WHERE c.company_name='limit-one');
SELECT 'case2=' || COUNT(*) FROM jobs j JOIN companies c ON c.id=j.company_id JOIN applications a ON a.job_id=j.id
  WHERE c.company_name='limit-one' AND a.stage='TO_APPLY'
    AND (SELECT COUNT(*) FROM jobs j2 JOIN applications a2 ON a2.job_id=j2.id WHERE j2.company_id=c.id AND a2.application_date IS NOT NULL)<c.max_applications;
SELECT 'case3=' || COUNT(*) FROM jobs j JOIN companies c ON c.id=j.company_id JOIN applications a ON a.job_id=j.id
  WHERE c.company_name='limit-one' AND a.stage='TO_APPLY';

UPDATE applications SET stage='APPLIED',application_date='2026-09-03' WHERE job_id IN
  (SELECT j.id FROM jobs j JOIN companies c ON c.id=j.company_id WHERE c.company_name='limit-three' ORDER BY j.id LIMIT 2);
SELECT 'case4=' || COUNT(*) FROM jobs j JOIN companies c ON c.id=j.company_id JOIN applications a ON a.job_id=j.id
  WHERE c.company_name='limit-three' AND a.stage='TO_APPLY'
    AND (SELECT COUNT(*) FROM jobs j2 JOIN applications a2 ON a2.job_id=j2.id WHERE j2.company_id=c.id AND a2.application_date IS NOT NULL)<c.max_applications;
UPDATE applications SET stage='APPLIED',application_date='2026-09-03' WHERE job_id=
  (SELECT j.id FROM jobs j JOIN companies c ON c.id=j.company_id JOIN applications a ON a.job_id=j.id WHERE c.company_name='limit-three' AND a.application_date IS NULL ORDER BY j.id LIMIT 1);
SELECT 'case5=' || COUNT(*) FROM jobs j JOIN companies c ON c.id=j.company_id JOIN applications a ON a.job_id=j.id
  WHERE c.company_name='limit-three' AND a.stage='TO_APPLY'
    AND (SELECT COUNT(*) FROM jobs j2 JOIN applications a2 ON a2.job_id=j2.id WHERE j2.company_id=c.id AND a2.application_date IS NOT NULL)<c.max_applications;
SELECT 'case6=' || COUNT(*) FROM jobs j JOIN companies c ON c.id=j.company_id JOIN applications a ON a.job_id=j.id WHERE c.company_name='unlimited' AND a.stage='TO_APPLY';
SELECT 'case7=' || COUNT(*) FROM jobs j JOIN companies c ON c.id=j.company_id JOIN applications a ON a.job_id=j.id WHERE c.company_name='unknown' AND a.stage='TO_APPLY';
SELECT 'case8=' || CASE WHEN
  (SELECT COUNT(*) FROM jobs j JOIN applications a ON a.job_id=j.id JOIN companies c ON c.id=j.company_id WHERE c.company_name='limit-one' AND a.application_date IS NOT NULL)
  >= (SELECT max_applications FROM companies WHERE company_name='limit-one') THEN 'blocked' ELSE 'allowed' END;
UPDATE applications SET stage='TO_APPLY',application_date=NULL WHERE job_id=(SELECT MIN(j.id) FROM jobs j JOIN companies c ON c.id=j.company_id WHERE c.company_name='limit-one');
SELECT 'case9=' || COUNT(*) FROM jobs j JOIN companies c ON c.id=j.company_id JOIN applications a ON a.job_id=j.id
  WHERE c.company_name='limit-one' AND a.stage='TO_APPLY'
    AND (SELECT COUNT(*) FROM jobs j2 JOIN applications a2 ON a2.job_id=j2.id WHERE j2.company_id=c.id AND a2.application_date IS NOT NULL)<c.max_applications;
SELECT 'case10=' || COUNT(*) FROM jobs j JOIN companies c ON c.id=j.company_id JOIN applications a ON a.job_id=j.id
  WHERE a.stage='TO_APPLY' AND (c.application_limit_type<>'LIMITED' OR
    (SELECT COUNT(*) FROM jobs j2 JOIN applications a2 ON a2.job_id=j2.id WHERE j2.company_id=c.id AND a2.application_date IS NOT NULL)<c.max_applications);
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

$expected = @('case1=5','case2=0','case3=4','case4=2','case5=0','case6=2','case7=2','case8=blocked','case9=5','case10=9')
foreach ($line in $expected) {
  if ($result -notcontains $line) {
    throw "Application limit acceptance test failed: expected $line"
  }
}
