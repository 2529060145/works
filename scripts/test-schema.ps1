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
UPDATE applications SET result='FAILED',result_reason='written-test-failed' WHERE job_id=1;
SELECT 'reason=' || result || ',' || result_reason FROM applications WHERE job_id=1;
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
SELECT 'case11=' || COALESCE(SUM(
  CASE WHEN company.limit_type='LIMITED'
    THEN MIN(company.pending_count,MAX(0,company.max_applications-company.applied_count))
    ELSE company.pending_count END),0)
FROM (
  SELECT c.id,c.application_limit_type AS limit_type,COALESCE(c.max_applications,1) AS max_applications,
    SUM(CASE WHEN j.id IS NOT NULL AND COALESCE(a.stage,'TO_APPLY')='TO_APPLY' THEN 1 ELSE 0 END) AS pending_count,
    SUM(CASE WHEN j.id IS NOT NULL AND (a.application_date IS NOT NULL OR COALESCE(a.stage,'TO_APPLY')<>'TO_APPLY') THEN 1 ELSE 0 END) AS applied_count
  FROM companies c LEFT JOIN jobs j ON j.company_id=c.id LEFT JOIN applications a ON a.job_id=j.id
  WHERE c.company_name='limit-one' GROUP BY c.id,c.application_limit_type,c.max_applications
) company;
SELECT 'case12=' || COALESCE(SUM(
  CASE WHEN company.limit_type='LIMITED'
    THEN MIN(company.pending_count,MAX(0,company.max_applications-company.applied_count))
    ELSE company.pending_count END),0)
FROM (
  SELECT c.id,c.application_limit_type AS limit_type,COALESCE(c.max_applications,1) AS max_applications,
    SUM(CASE WHEN j.id IS NOT NULL AND COALESCE(a.stage,'TO_APPLY')='TO_APPLY' THEN 1 ELSE 0 END) AS pending_count,
    SUM(CASE WHEN j.id IS NOT NULL AND (a.application_date IS NOT NULL OR COALESCE(a.stage,'TO_APPLY')<>'TO_APPLY') THEN 1 ELSE 0 END) AS applied_count
  FROM companies c LEFT JOIN jobs j ON j.company_id=c.id LEFT JOIN applications a ON a.job_id=j.id
  GROUP BY c.id,c.application_limit_type,c.max_applications
) company;

INSERT INTO companies(company_name) VALUES('workflow-company');
INSERT INTO jobs(company_id,job_name) VALUES((SELECT id FROM companies WHERE company_name='workflow-company'),'workflow-job');
INSERT INTO applications(job_id,stage,application_date,submitted_at,result)
  VALUES((SELECT id FROM jobs WHERE job_name='workflow-job'),'PROCESS','2026-09-03','2026-09-03 09:20:00','PENDING');
SELECT 'workflow-empty=' || COUNT(*) FROM written_tests WHERE job_id=(SELECT id FROM jobs WHERE job_name='workflow-job');
BEGIN;
INSERT INTO written_tests(job_id,sequence_no,scheduled_at,time_tbd,form,status,result)
  VALUES((SELECT id FROM jobs WHERE job_name='workflow-job'),1,'2026-09-10 19:00:00',0,'ONLINE','SCHEDULED','PENDING');
COMMIT;
UPDATE written_tests SET status='COMPLETED',result='PASSED' WHERE job_id=(SELECT id FROM jobs WHERE job_name='workflow-job');
INSERT INTO written_tests(job_id,sequence_no,scheduled_at,time_tbd,form,status,result)
  SELECT (SELECT id FROM jobs WHERE job_name='workflow-job'),COALESCE(MAX(sequence_no),0)+1,'2026-09-12 00:00:00',1,'ONLINE','SCHEDULED','PENDING'
  FROM written_tests WHERE job_id=(SELECT id FROM jobs WHERE job_name='workflow-job');
SELECT 'workflow-written=' || COUNT(*) || ',' || MAX(sequence_no) FROM written_tests WHERE job_id=(SELECT id FROM jobs WHERE job_name='workflow-job');
UPDATE written_tests SET status='COMPLETED',result='PASSED' WHERE job_id=(SELECT id FROM jobs WHERE job_name='workflow-job') AND sequence_no=2;
INSERT INTO interviews(job_id,round,scheduled_at,time_tbd,form,status,result)
  VALUES((SELECT id FROM jobs WHERE job_name='workflow-job'),'SECOND','2026-09-15 14:00:00',0,'OFFLINE','SCHEDULED','PENDING');
BEGIN;
UPDATE interviews SET status='COMPLETED',result='FAILED' WHERE job_id=(SELECT id FROM jobs WHERE job_name='workflow-job');
UPDATE applications SET stage='REJECTED',result='FAILED',result_reason='second-interview-failed' WHERE job_id=(SELECT id FROM jobs WHERE job_name='workflow-job');
COMMIT;
SELECT 'workflow-failed=' || a.stage || ',' || a.result || ',' || a.result_reason FROM applications a JOIN jobs j ON j.id=a.job_id WHERE j.job_name='workflow-job';
SELECT 'workflow-history=' || ((SELECT COUNT(*) FROM written_tests WHERE job_id=j.id)+(SELECT COUNT(*) FROM interviews WHERE job_id=j.id)) FROM jobs j WHERE j.job_name='workflow-job';
BEGIN;
UPDATE interviews SET status='COMPLETED',result='PENDING' WHERE job_id=(SELECT id FROM jobs WHERE job_name='workflow-job') AND result='FAILED';
UPDATE applications SET stage='PROCESS',result='PENDING',result_reason=NULL WHERE job_id=(SELECT id FROM jobs WHERE job_name='workflow-job') AND stage='REJECTED';
COMMIT;
SELECT 'workflow-undone=' || a.stage || ',' || a.result || ',' || i.status || ',' || i.result
  FROM applications a JOIN jobs j ON j.id=a.job_id JOIN interviews i ON i.job_id=j.id WHERE j.job_name='workflow-job';
BEGIN;
UPDATE interviews SET status='CANCELLED',result='CANCELLED' WHERE job_id=(SELECT id FROM jobs WHERE job_name='workflow-job') AND (status IN ('SCHEDULED','ONGOING') OR result IN ('PENDING','FAILED'));
UPDATE applications SET stage='APPLIED',result='PENDING',result_reason=NULL WHERE job_id=(SELECT id FROM jobs WHERE job_name='workflow-job');
COMMIT;
SELECT 'workflow-restored=' || a.stage || ',' || i.status || ',' || i.result
  FROM applications a JOIN jobs j ON j.id=a.job_id JOIN interviews i ON i.job_id=j.id WHERE j.job_name='workflow-job';

INSERT INTO companies(company_name) VALUES('today-schedule-company');
INSERT INTO jobs(company_id,job_name) VALUES((SELECT id FROM companies WHERE company_name='today-schedule-company'),'today-interview-job');
INSERT INTO jobs(company_id,job_name) VALUES((SELECT id FROM companies WHERE company_name='today-schedule-company'),'today-written-job');
INSERT INTO interviews(job_id,round,scheduled_at,status,result) VALUES((SELECT id FROM jobs WHERE job_name='today-interview-job'),'FIRST',datetime('now','localtime','-2 hour'),'SCHEDULED','PENDING');
INSERT INTO written_tests(job_id,sequence_no,scheduled_at,status,result) VALUES((SELECT id FROM jobs WHERE job_name='today-written-job'),1,datetime('now','localtime','-2 hour'),'SCHEDULED','PENDING');
SELECT 'today-upcoming=' || SUM("eventType"='INTERVIEW') || ',' || SUM("eventType"='WRITTEN_TEST') FROM (
  SELECT 'INTERVIEW' AS "eventType",i.scheduled_at AS "scheduledAt" FROM interviews i JOIN jobs j ON j.id=i.job_id JOIN companies c ON c.id=j.company_id WHERE c.company_name='today-schedule-company' AND i.status IN ('WAITING','SCHEDULED')
  UNION ALL SELECT 'WRITTEN_TEST',w.scheduled_at FROM written_tests w JOIN jobs j ON j.id=w.job_id JOIN companies c ON c.id=j.company_id WHERE c.company_name='today-schedule-company' AND w.status IN ('WAITING','SCHEDULED')
) WHERE date("scheduledAt") BETWEEN date('now','localtime') AND date('now','localtime','+14 day');

SELECT 'profile-tables=' || COUNT(*) FROM sqlite_master WHERE type='table' AND name IN (
  'profile_basic','education_experiences','work_experiences','project_experiences','academic_achievements',
  'certificates','language_abilities','honors','family_members','emergency_contacts','profile_evaluation',
  'profile_hobbies','proof_materials'
);
SELECT 'profile-option-columns=' || ((SELECT COUNT(*) FROM pragma_table_info('profile_basic') WHERE name='work_status') +
  (SELECT COUNT(*) FROM pragma_table_info('certificates') WHERE name IN ('validity_type','valid_from')));
INSERT INTO profile_basic(name,phone,email) VALUES('profile-user','13800138000','profile@example.com');
UPDATE profile_basic SET name='updated-user',updated_at=CURRENT_TIMESTAMP WHERE id=1;
INSERT INTO education_experiences(school_name,education_level,sort_order) VALUES('test-university','master',0);
INSERT INTO project_experiences(project_name,role,sort_order) VALUES('test-project','owner',0);
INSERT INTO profile_evaluation(content) VALUES('responsible');
INSERT INTO profile_hobbies(tags,description) VALUES('coding' || char(10) || 'sports','keep-learning');
INSERT INTO proof_materials(display_name,original_name,file_path,file_extension,file_size,category)
  VALUES('cet4-certificate','cet4.pdf','F:/portable/data/proof_materials/cet4.pdf','pdf',1024,'certificate');
SELECT 'profile-crud=' || (SELECT name FROM profile_basic WHERE id=1) || ',' ||
  (SELECT COUNT(*) FROM education_experiences) || ',' || (SELECT COUNT(*) FROM project_experiences) || ',' ||
  (SELECT display_name FROM proof_materials WHERE id=1);
DELETE FROM proof_materials WHERE id=1;
SELECT 'proof-delete=' || COUNT(*) FROM proof_materials;
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
if ($result -notcontains 'reason=FAILED,written-test-failed') {
  throw 'Application result reason smoke test failed.'
}

$expected = @('case1=5','case2=0','case3=4','case4=2','case5=0','case6=2','case7=2','case8=blocked','case9=5','case10=9','case11=1','case12=5')
foreach ($line in $expected) {
  if ($result -notcontains $line) {
    throw "Application limit acceptance test failed: expected $line"
  }
}

$workflowExpected = @('workflow-empty=0','workflow-written=2,2','workflow-failed=REJECTED,FAILED,second-interview-failed','workflow-history=3','workflow-undone=PROCESS,PENDING,COMPLETED,PENDING','workflow-restored=APPLIED,CANCELLED,CANCELLED','today-upcoming=1,1')
foreach ($line in $workflowExpected) {
  if ($result -notcontains $line) {
    throw "Recruitment workflow acceptance test failed: expected $line"
  }
}

$profileExpected = @('profile-tables=13','profile-option-columns=3','profile-crud=updated-user,1,1,cet4-certificate','proof-delete=0')
foreach ($line in $profileExpected) {
  if ($result -notcontains $line) {
    throw "Personal profile acceptance test failed: expected $line"
  }
}
