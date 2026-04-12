import { describe, it, expect } from 'vitest';
import {
  validateOrientation,
  validatePwd,
  validateLs,
  validateLsLa,
  validateCd,
  validateMkdir,
  validateTouch,
  validateCp,
  validateMv,
  validateRm,
  validateCat,
  validateHeadTail,
  validateGrep,
  validateWc,
  validateComprendrePermissions,
  validateChmod,
  validateChown,
  validateSudo,
  validateSecurityPermissions,
  validatePs,
  validateKill,
  validateTop,
  validateBackground,
  validateRedirectionSortie,
  validatePipes,
  validateStderr,
  validateTee,
  validateEnvVars,
  validatePathVariable,
  validateShellConfig,
  validateDotenv,
  validateScripts,
  validateCron,
  validatePing,
  validateCurl,
  validateWget,
  validateDns,
  validateSsh,
  validateScp,
  validateGitInit,
  validateGitConfig,
  validateGitAddCommit,
  validateGitStatusLog,
  validateGitDiffGitignore,
  validateGitBranch,
  validateGitMerge,
  validateGitRemote,
  validateGitPushPull,
  validateGitFetchClone,
  validatePullRequests,
  validateConflicts,
  validateGithubActions,
} from '../app/data/validators';

// ── helpers ──────────────────────────────────────────────────────────────────
const linux = 'linux' as const;
const macos = 'macos' as const;
const win   = 'windows' as const;

// ── Navigation ────────────────────────────────────────────────────────────────
describe('validateOrientation', () => {
  it('accepts "help"', () => expect(validateOrientation('help')).toBe(true));
  it('accepts "HELP" (case insensitive)', () => expect(validateOrientation('HELP')).toBe(true));
  it('rejects empty string', () => expect(validateOrientation('')).toBe(false));
  it('rejects "ls"', () => expect(validateOrientation('ls')).toBe(false));
});

describe('validatePwd', () => {
  it('accepts "pwd" on linux', () => expect(validatePwd('pwd', linux)).toBe(true));
  it('accepts "pwd" on macos', () => expect(validatePwd('pwd', macos)).toBe(true));
  it('accepts "Get-Location" on windows', () => expect(validatePwd('Get-Location', win)).toBe(true));
  it('accepts "gl" on windows', () => expect(validatePwd('gl', win)).toBe(true));
  it('accepts "pwd" on windows (alias)', () => expect(validatePwd('pwd', win)).toBe(true));
  it('rejects "ls" on linux', () => expect(validatePwd('ls', linux)).toBe(false));
  it('rejects extra args on linux', () => expect(validatePwd('pwd /home', linux)).toBe(false));
});

describe('validateLs', () => {
  it('accepts "ls"', () => expect(validateLs('ls', linux)).toBe(true));
  it('accepts "ls -l"', () => expect(validateLs('ls -l', linux)).toBe(true));
  it('accepts "ls documents"', () => expect(validateLs('ls documents', linux)).toBe(true));
  it('accepts "Get-ChildItem" on windows', () => expect(validateLs('Get-ChildItem', win)).toBe(true));
  it('accepts "dir" on windows', () => expect(validateLs('dir', win)).toBe(true));
  it('accepts "gci" on windows', () => expect(validateLs('gci', win)).toBe(true));
  it('rejects "pwd"', () => expect(validateLs('pwd', linux)).toBe(false));
});

describe('validateLsLa', () => {
  it('accepts "ls -la"', () => expect(validateLsLa('ls -la', linux)).toBe(true));
  it('accepts "ls -al"', () => expect(validateLsLa('ls -al', linux)).toBe(true));
  it('accepts "ls -a -l"', () => expect(validateLsLa('ls -a -l', linux)).toBe(true));
  it('accepts "ls -l -a"', () => expect(validateLsLa('ls -l -a', linux)).toBe(true));
  it('accepts "Get-ChildItem -Force" on windows', () => expect(validateLsLa('Get-ChildItem -Force', win)).toBe(true));
  it('accepts "dir -Force" on windows', () => expect(validateLsLa('dir -Force', win)).toBe(true));
  it('rejects bare "ls"', () => expect(validateLsLa('ls', linux)).toBe(false));
  it('rejects "ls -l" (no -a)', () => expect(validateLsLa('ls -l', linux)).toBe(false));
});

describe('validateCd', () => {
  it('accepts "cd documents"', () => expect(validateCd('cd documents', linux)).toBe(true));
  it('accepts "Set-Location documents" on windows', () => expect(validateCd('Set-Location documents', win)).toBe(true));
  it('accepts "sl documents" on windows', () => expect(validateCd('sl documents', win)).toBe(true));
  it('accepts "cd documents" on windows', () => expect(validateCd('cd documents', win)).toBe(true));
  it('rejects "cd downloads"', () => expect(validateCd('cd downloads', linux)).toBe(false));
  it('rejects bare "cd"', () => expect(validateCd('cd', linux)).toBe(false));
});

// ── Fichiers ──────────────────────────────────────────────────────────────────
describe('validateMkdir', () => {
  it('accepts "mkdir test"', () => expect(validateMkdir('mkdir test', linux)).toBe(true));
  it('accepts "mkdir -p test"', () => expect(validateMkdir('mkdir -p test', linux)).toBe(true));
  it('accepts "New-Item ... test" on windows', () => expect(validateMkdir('New-Item -ItemType Directory -Name test', win)).toBe(true));
  it('accepts "md test" on windows', () => expect(validateMkdir('md test', win)).toBe(true));
  it('rejects "mkdir other"', () => expect(validateMkdir('mkdir other', linux)).toBe(false));
});

describe('validateTouch', () => {
  it('accepts "touch memo.txt"', () => expect(validateTouch('touch memo.txt', linux)).toBe(true));
  it('accepts "New-Item -ItemType File -Name memo.txt" on windows', () => expect(validateTouch('New-Item -ItemType File -Name memo.txt', win)).toBe(true));
  it('accepts "touch memo.txt" on windows (alias)', () => expect(validateTouch('touch memo.txt', win)).toBe(true));
  it('rejects "touch other.txt"', () => expect(validateTouch('touch other.txt', linux)).toBe(false));
});

describe('validateCp', () => {
  it('accepts exact cp command', () => expect(validateCp('cp documents/notes.txt documents/notes-copy.txt', linux)).toBe(true));
  it('accepts "copy-item ..." on windows', () => expect(validateCp('copy-item documents/notes.txt documents/notes-copy.txt', win)).toBe(true));
  it('rejects "cp other.txt"', () => expect(validateCp('cp other.txt dest.txt', linux)).toBe(false));
});

describe('validateMv', () => {
  it('accepts exact mv command', () => expect(validateMv('mv documents/rapport.md documents/rapport-final.md', linux)).toBe(true));
  it('rejects wrong filename', () => expect(validateMv('mv documents/notes.txt documents/notes2.txt', linux)).toBe(false));
});

describe('validateRm', () => {
  it('accepts "rm documents/notes.txt"', () => expect(validateRm('rm documents/notes.txt', linux)).toBe(true));
  it('accepts "del documents/notes.txt" on windows', () => expect(validateRm('del documents/notes.txt', win)).toBe(true));
  it('rejects "rm other.txt"', () => expect(validateRm('rm other.txt', linux)).toBe(false));
});

// ── Lecture ───────────────────────────────────────────────────────────────────
describe('validateCat', () => {
  it('accepts "cat documents/notes.txt"', () => expect(validateCat('cat documents/notes.txt', linux)).toBe(true));
  it('accepts "Get-Content documents/notes.txt" on windows', () => expect(validateCat('Get-Content documents/notes.txt', win)).toBe(true));
  it('accepts "type documents/notes.txt" on windows', () => expect(validateCat('type documents/notes.txt', win)).toBe(true));
  it('rejects "cat other.txt"', () => expect(validateCat('cat other.txt', linux)).toBe(false));
});

describe('validateHeadTail', () => {
  it('accepts "head -n 3 documents/rapport.md"', () => expect(validateHeadTail('head -n 3 documents/rapport.md', linux)).toBe(true));
  it('accepts "head -n 3 documents/rapport.md" on macos', () => expect(validateHeadTail('head -n 3 documents/rapport.md', macos)).toBe(true));
  it('accepts windows pipeline with Get-Content + Select-Object', () => expect(validateHeadTail('Get-Content documents/rapport.md | Select-Object -First 3', win)).toBe(true));
  it('rejects "head documents/rapport.md" (no -n)', () => expect(validateHeadTail('head documents/rapport.md', linux)).toBe(false));
});

describe('validateGrep', () => {
  it('accepts "grep important documents/notes.txt"', () => expect(validateGrep('grep important documents/notes.txt', linux)).toBe(true));
  it('accepts "grep -i important documents/notes.txt"', () => expect(validateGrep('grep -i important documents/notes.txt', linux)).toBe(true));
  it('accepts "Select-String important documents/notes.txt" on windows', () => expect(validateGrep('Select-String important documents/notes.txt', win)).toBe(true));
  it('rejects "grep other file.txt"', () => expect(validateGrep('grep other file.txt', linux)).toBe(false));
});

describe('validateWc', () => {
  it('accepts "wc -l documents/rapport.md"', () => expect(validateWc('wc -l documents/rapport.md', linux)).toBe(true));
  it('accepts windows (.content).Count pattern', () => expect(validateWc('(Get-Content documents/rapport.md).Count', win)).toBe(true));
  it('rejects "wc documents/rapport.md" (no -l)', () => expect(validateWc('wc documents/rapport.md', linux)).toBe(false));
  it('rejects "wc -l other.txt"', () => expect(validateWc('wc -l other.txt', linux)).toBe(false));
});

// ── Permissions ───────────────────────────────────────────────────────────────
describe('validateComprendrePermissions', () => {
  it('accepts "ls -l"', () => expect(validateComprendrePermissions('ls -l', linux)).toBe(true));
  it('accepts "Get-Acl" on windows', () => expect(validateComprendrePermissions('Get-Acl', win)).toBe(true));
  it('accepts "icacls" on windows', () => expect(validateComprendrePermissions('icacls /', win)).toBe(true));
  it('rejects "ls"', () => expect(validateComprendrePermissions('ls', linux)).toBe(false));
});

describe('validateChmod', () => {
  it('accepts "chmod +x projets/script.sh"', () => expect(validateChmod('chmod +x projets/script.sh', linux)).toBe(true));
  it('accepts "chmod 755 projets/script.sh"', () => expect(validateChmod('chmod 755 projets/script.sh', linux)).toBe(true));
  it('accepts "chmod u+x projets/script.sh"', () => expect(validateChmod('chmod u+x projets/script.sh', linux)).toBe(true));
  it('accepts "Set-ExecutionPolicy RemoteSigned" on windows', () => expect(validateChmod('Set-ExecutionPolicy RemoteSigned', win)).toBe(true));
  it('rejects "chmod +x other.sh"', () => expect(validateChmod('chmod +x other.sh', linux)).toBe(false));
});

describe('validateChown', () => {
  it('accepts "ls -la"', () => expect(validateChown('ls -la', linux)).toBe(true));
  it('accepts "ls -al"', () => expect(validateChown('ls -al', linux)).toBe(true));
  it('accepts "ls -l"', () => expect(validateChown('ls -l something', linux)).toBe(true));
  it('accepts "Get-Acl" on windows', () => expect(validateChown('Get-Acl path', win)).toBe(true));
  it('rejects "ls"', () => expect(validateChown('ls', linux)).toBe(false));
});

describe('validateSudo', () => {
  it('accepts "whoami"', () => expect(validateSudo('whoami')).toBe(true));
  it('accepts "sudo whoami"', () => expect(validateSudo('sudo whoami')).toBe(true));
  it('rejects "sudo ls"', () => expect(validateSudo('sudo ls')).toBe(false));
});

describe('validateSecurityPermissions', () => {
  it('accepts "ls"', () => expect(validateSecurityPermissions('ls', linux)).toBe(true));
  it('accepts "ls -la"', () => expect(validateSecurityPermissions('ls -la', linux)).toBe(true));
  it('accepts "Get-Acl path" on windows', () => expect(validateSecurityPermissions('Get-Acl /etc', win)).toBe(true));
  it('accepts "icacls path" on windows', () => expect(validateSecurityPermissions('icacls /etc', win)).toBe(true));
  it('rejects "cat file"', () => expect(validateSecurityPermissions('cat file', linux)).toBe(false));
});

// ── Processus ─────────────────────────────────────────────────────────────────
describe('validateTop', () => {
  it('accepts "ps aux"', () => expect(validateTop('ps aux', linux)).toBe(true));
  it('accepts "top"', () => expect(validateTop('top', linux)).toBe(true));
  it('accepts "ps aux" on macos', () => expect(validateTop('ps aux', macos)).toBe(true));
  it('accepts "top" on macos', () => expect(validateTop('top', macos)).toBe(true));
  it('accepts "Get-Process | Sort-Object" on windows', () => expect(validateTop('Get-Process | Sort-Object', win)).toBe(true));
  it('rejects "ls"', () => expect(validateTop('ls', linux)).toBe(false));
});

describe('validateBackground', () => {
  it('accepts "jobs"', () => expect(validateBackground('jobs', linux)).toBe(true));
  it('accepts "jobs" on macos', () => expect(validateBackground('jobs', macos)).toBe(true));
  it('accepts "Get-Job" on windows', () => expect(validateBackground('Get-Job', win)).toBe(true));
  it('rejects "ps"', () => expect(validateBackground('ps', linux)).toBe(false));
});

describe('validatePs', () => {
  it('accepts "ps"', () => expect(validatePs('ps', linux)).toBe(true));
  it('accepts "ps aux"', () => expect(validatePs('ps aux', linux)).toBe(true));
  it('accepts "Get-Process" on windows', () => expect(validatePs('Get-Process', win)).toBe(true));
  it('accepts "tasklist" on windows', () => expect(validatePs('tasklist', win)).toBe(true));
  it('rejects "ls"', () => expect(validatePs('ls', linux)).toBe(false));
});

describe('validateKill', () => {
  it('accepts "ps" on linux (show to kill)', () => expect(validateKill('ps', linux)).toBe(true));
  it('accepts "ps aux" on linux', () => expect(validateKill('ps aux', linux)).toBe(true));
  it('accepts "Stop-Process -Id 1234" on windows', () => expect(validateKill('Stop-Process -Id 1234', win)).toBe(true));
  it('rejects "ls"', () => expect(validateKill('ls', linux)).toBe(false));
});

// ── Redirection ───────────────────────────────────────────────────────────────
describe('validateRedirectionSortie', () => {
  it('accepts basic echo redirect', () => expect(validateRedirectionSortie('echo "Bonjour le monde!" > bonjour.txt', linux)).toBe(true));
  it('accepts without quotes', () => expect(validateRedirectionSortie("echo Bonjour le monde! > bonjour.txt", linux)).toBe(true));
  it('accepts Write-Output on windows', () => expect(validateRedirectionSortie('Write-Output "Bonjour le monde!" > bonjour.txt', win)).toBe(true));
  it('rejects "echo hello > other.txt"', () => expect(validateRedirectionSortie('echo hello > other.txt', linux)).toBe(false));
});

describe('validatePipes', () => {
  it('accepts "ls | wc -l"', () => expect(validatePipes('ls | wc -l', linux)).toBe(true));
  it('accepts "Get-ChildItem | Measure-Object" on windows', () => expect(validatePipes('Get-ChildItem | Measure-Object', win)).toBe(true));
  it('rejects "ls"', () => expect(validatePipes('ls', linux)).toBe(false));
});

describe('validateStderr', () => {
  it('accepts "ls 2> erreurs"', () => expect(validateStderr('ls 2> erreurs', linux)).toBe(true));
  it('accepts "ls 2>/dev/null"', () => expect(validateStderr('ls 2>/dev/null', linux)).toBe(true));
  it('accepts "ls 2>$null" on windows', () => expect(validateStderr('ls 2>$null', win)).toBe(true));
  it('rejects "ls"', () => expect(validateStderr('ls', linux)).toBe(false));
});

describe('validateTee', () => {
  it('accepts "ls | tee output.txt"', () => expect(validateTee('ls | tee output.txt', linux)).toBe(true));
  it('accepts "ls | tee-object output.txt" on windows', () => expect(validateTee('ls | Tee-Object output.txt', win)).toBe(true));
  it('rejects "ls > file.txt"', () => expect(validateTee('ls > file.txt', linux)).toBe(false));
  it('rejects bare "ls"', () => expect(validateTee('ls', linux)).toBe(false));
});

// ── Variables ─────────────────────────────────────────────────────────────────
describe('validateEnvVars', () => {
  it('accepts "export MY_VAR=value"', () => expect(validateEnvVars('export MY_VAR=value', linux)).toBe(true));
  it('accepts "$env:MY_VAR = value" on windows', () => expect(validateEnvVars('$env:MY_VAR = value', win)).toBe(true));
  it('rejects "MY_VAR=value" (no export)', () => expect(validateEnvVars('MY_VAR=value', linux)).toBe(false));
});

describe('validatePathVariable', () => {
  it('accepts "echo $PATH"', () => expect(validatePathVariable('echo $PATH', linux)).toBe(true));
  it('accepts "echo $PATH" on macos', () => expect(validatePathVariable('echo $PATH', macos)).toBe(true));
  it('accepts "echo $env:PATH" on windows', () => expect(validatePathVariable('echo $env:PATH', win)).toBe(true));
  it('accepts "$env:PATH" on windows', () => expect(validatePathVariable('$env:PATH', win)).toBe(true));
  it('rejects "cat ~/.bashrc"', () => expect(validatePathVariable('cat ~/.bashrc', linux)).toBe(false));
});

describe('validateDotenv', () => {
  it('accepts "cat .env"', () => expect(validateDotenv('cat .env', linux)).toBe(true));
  it('accepts "Get-Content .env" on windows', () => expect(validateDotenv('Get-Content .env', win)).toBe(true));
  it('accepts "gc .env" on windows', () => expect(validateDotenv('gc .env', win)).toBe(true));
  it('rejects "cat .envrc"', () => expect(validateDotenv('cat .envrc', linux)).toBe(false));
});

describe('validateScripts', () => {
  it('accepts "./script.sh"', () => expect(validateScripts('./script.sh', linux)).toBe(true));
  it('accepts "bash script.sh"', () => expect(validateScripts('bash script.sh', linux)).toBe(true));
  it('accepts "./script.sh" on macos', () => expect(validateScripts('./script.sh', macos)).toBe(true));
  it('accepts ".\\script.sh" on windows', () => expect(validateScripts('.\\script.sh', win)).toBe(true));
  it('rejects "sh other.sh"', () => expect(validateScripts('sh other.sh', linux)).toBe(false));
});

describe('validateShellConfig', () => {
  it('accepts "cat ~/.bashrc" on linux', () => expect(validateShellConfig('cat ~/.bashrc', linux)).toBe(true));
  it('accepts "cat ~/.zshrc" on macos', () => expect(validateShellConfig('cat ~/.zshrc', macos)).toBe(true));
  it('accepts "cat $PROFILE" on windows', () => expect(validateShellConfig('cat $PROFILE', win)).toBe(true));
  it('rejects "cat ~/.bashrc" on macos (wrong file)', () => expect(validateShellConfig('cat ~/.bashrc', macos)).toBe(false));
});

describe('validateCron', () => {
  it('accepts "crontab -l"', () => expect(validateCron('crontab -l')).toBe(true));
  it('rejects "crontab -e"', () => expect(validateCron('crontab -e')).toBe(false));
});

// ── Réseau ────────────────────────────────────────────────────────────────────
describe('validatePing', () => {
  it('accepts "ping google.com"', () => expect(validatePing('ping google.com')).toBe(true));
  it('accepts "ping 8.8.8.8"', () => expect(validatePing('ping 8.8.8.8')).toBe(true));
  it('rejects bare "ping"', () => expect(validatePing('ping')).toBe(false));
});

describe('validateCurl', () => {
  it('accepts "curl https://example.com"', () => expect(validateCurl('curl https://example.com', linux)).toBe(true));
  it('accepts "Invoke-WebRequest -Uri https://example.com" on windows', () => expect(validateCurl('Invoke-WebRequest -Uri https://example.com', win)).toBe(true));
  it('rejects bare "curl"', () => expect(validateCurl('curl', linux)).toBe(false));
});

describe('validateWget', () => {
  it('accepts "wget https://example.com/file"', () => expect(validateWget('wget https://example.com/file', linux)).toBe(true));
  it('accepts "Invoke-WebRequest https://example.com" on windows', () => expect(validateWget('Invoke-WebRequest https://example.com', win)).toBe(true));
  it('accepts "iwr https://example.com" on windows', () => expect(validateWget('iwr https://example.com', win)).toBe(true));
  it('rejects bare "wget"', () => expect(validateWget('wget', linux)).toBe(false));
});

describe('validateDns', () => {
  it('accepts "nslookup google.com"', () => expect(validateDns('nslookup google.com', linux)).toBe(true));
  it('accepts "dig google.com"', () => expect(validateDns('dig google.com', linux)).toBe(true));
  it('accepts "Resolve-DnsName google.com" on windows', () => expect(validateDns('Resolve-DnsName google.com', win)).toBe(true));
  it('accepts "nslookup google.com" on windows', () => expect(validateDns('nslookup google.com', win)).toBe(true));
  it('rejects "ping google.com"', () => expect(validateDns('ping google.com', linux)).toBe(false));
});

describe('validateSsh', () => {
  it('accepts "ssh-keygen -t ed25519"', () => expect(validateSsh('ssh-keygen -t ed25519')).toBe(true));
  it('accepts "ssh-keygen -C email -t ed25519"', () => expect(validateSsh('ssh-keygen -C me@mail.com -t ed25519')).toBe(true));
  it('rejects "ssh user@host"', () => expect(validateSsh('ssh user@host')).toBe(false));
});

describe('validateScp', () => {
  it('accepts valid scp command', () => expect(validateScp('scp file.txt user@host:/path')).toBe(true));
  it('rejects "scp file.txt"', () => expect(validateScp('scp file.txt')).toBe(false));
});

// ── Git ───────────────────────────────────────────────────────────────────────
describe('validateGitInit', () => {
  it('accepts "git init"', () => expect(validateGitInit('git init')).toBe(true));
  it('accepts "git init my-project"', () => expect(validateGitInit('git init my-project')).toBe(true));
  it('rejects "git status"', () => expect(validateGitInit('git status')).toBe(false));
});

describe('validateGitConfig', () => {
  it('accepts "git config --list"', () => expect(validateGitConfig('git config --list')).toBe(true));
  it('accepts "git config --global user.name"', () => expect(validateGitConfig('git config --global user.name "Test"')).toBe(true));
  it('rejects "git config color.ui"', () => expect(validateGitConfig('git config color.ui')).toBe(false));
});

describe('validateGitAddCommit', () => {
  it('accepts "git add ."', () => expect(validateGitAddCommit('git add .')).toBe(true));
  it('accepts "git add --all"', () => expect(validateGitAddCommit('git add --all')).toBe(true));
  it('accepts "git add -A"', () => expect(validateGitAddCommit('git add -A')).toBe(true));
  it('rejects "git add file.txt" (specific file)', () => expect(validateGitAddCommit('git add file.txt')).toBe(false));
});

describe('validateGitStatusLog', () => {
  it('accepts "git status"', () => expect(validateGitStatusLog('git status')).toBe(true));
  it('accepts "git status --short"', () => expect(validateGitStatusLog('git status --short')).toBe(true));
  it('accepts "git status -s"', () => expect(validateGitStatusLog('git status -s')).toBe(true));
  it('accepts "git status -v"', () => expect(validateGitStatusLog('git status -v')).toBe(true));
  it('rejects "git log"', () => expect(validateGitStatusLog('git log')).toBe(false));
  it('rejects arbitrary args (git status foo bar)', () => expect(validateGitStatusLog('git status foo bar')).toBe(false));
});

describe('validateGitDiffGitignore', () => {
  it('accepts "git diff"', () => expect(validateGitDiffGitignore('git diff')).toBe(true));
  it('accepts "git diff HEAD"', () => expect(validateGitDiffGitignore('git diff HEAD')).toBe(true));
  it('accepts "git diff --staged"', () => expect(validateGitDiffGitignore('git diff --staged')).toBe(true));
  it('rejects "git status"', () => expect(validateGitDiffGitignore('git status')).toBe(false));
});

describe('validateGitBranch', () => {
  it('accepts "git checkout -b feature/test"', () => expect(validateGitBranch('git checkout -b feature/test')).toBe(true));
  it('accepts "git switch -c feature/test"', () => expect(validateGitBranch('git switch -c feature/test')).toBe(true));
  it('rejects "git branch"', () => expect(validateGitBranch('git branch')).toBe(false));
  it('rejects "git checkout main"', () => expect(validateGitBranch('git checkout main')).toBe(false));
});

describe('validateGitMerge', () => {
  it('accepts "git merge feature/test"', () => expect(validateGitMerge('git merge feature/test')).toBe(true));
  it('rejects bare "git merge"', () => expect(validateGitMerge('git merge')).toBe(false));
});

describe('validateGitRemote', () => {
  it('accepts "git remote add origin https://github.com/user/repo"', () => expect(validateGitRemote('git remote add origin https://github.com/user/repo')).toBe(true));
  it('accepts "git remote add upstream https://github.com/org/repo"', () => expect(validateGitRemote('git remote add upstream https://github.com/org/repo')).toBe(true));
  it('rejects "git remote -v"', () => expect(validateGitRemote('git remote -v')).toBe(false));
});

describe('validateGitPushPull', () => {
  it('accepts "git push"', () => expect(validateGitPushPull('git push')).toBe(true));
  it('accepts "git push -u origin main"', () => expect(validateGitPushPull('git push -u origin main')).toBe(true));
  it('accepts "git push origin main"', () => expect(validateGitPushPull('git push origin main')).toBe(true));
  it('rejects "git pull"', () => expect(validateGitPushPull('git pull')).toBe(false));
});

describe('validateGitFetchClone', () => {
  it('accepts "git clone https://github.com/user/repo"', () => expect(validateGitFetchClone('git clone https://github.com/user/repo')).toBe(true));
  it('rejects "git fetch"', () => expect(validateGitFetchClone('git fetch')).toBe(false));
});

// ── GitHub Collaboration ──────────────────────────────────────────────────────
describe('validatePullRequests', () => {
  it('accepts "git checkout -b feature/my-pr"', () => expect(validatePullRequests('git checkout -b feature/my-pr')).toBe(true));
  it('accepts "git switch -c feature/my-pr"', () => expect(validatePullRequests('git switch -c feature/my-pr')).toBe(true));
  it('rejects "git checkout -b fix/bug"', () => expect(validatePullRequests('git checkout -b fix/bug')).toBe(false));
});

describe('validateConflicts', () => {
  it('accepts "git merge feature/conflict"', () => expect(validateConflicts('git merge feature/conflict')).toBe(true));
  it('rejects "git status"', () => expect(validateConflicts('git status')).toBe(false));
});

describe('validateGithubActions', () => {
  it('accepts "git status"', () => expect(validateGithubActions('git status')).toBe(true));
  it('rejects "git push"', () => expect(validateGithubActions('git push')).toBe(false));
});

// ── Security: injection attempts ──────────────────────────────────────────────
describe('security — injection attempts on validators', () => {
  it('rejects script injection in pwd', () => expect(validatePwd('<script>alert(1)</script>', linux)).toBe(false));
  it('rejects SQL injection in ls', () => expect(validateLs("'; DROP TABLE users; --", linux)).toBe(false));
  it('rejects path traversal in cat', () => expect(validateCat('cat ../../etc/passwd', linux)).toBe(false));
  it('rejects command chaining in mkdir', () => expect(validateMkdir('mkdir test && rm -rf /', linux)).toBe(false));
  it('rejects null byte in git init', () => expect(validateGitInit('git init\x00evil', linux)).toBe(false));
  it('rejects overly long input (DoS)', () => expect(validatePwd('p'.repeat(10000), linux)).toBe(false));
  it('rejects empty string everywhere', () => {
    expect(validatePwd('', linux)).toBe(false);
    expect(validateGitInit('')).toBe(false);
    expect(validatePing('')).toBe(false);
  });
});
