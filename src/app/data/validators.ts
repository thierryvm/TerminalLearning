import type { EnvId } from './curriculum';

export type ValidateFn = (command: string, env?: EnvId) => boolean;

export const validateOrientation: ValidateFn = (cmd) => cmd.trim().toLowerCase() === 'help';

export const validatePwd: ValidateFn = (cmd, env) => {
    const c = cmd.trim().toLowerCase();
    if (env === 'windows') return ['get-location', 'gl', 'pwd'].includes(c);
    return c === 'pwd';
  };

export const validateLs: ValidateFn = (cmd, env) => {
    const c = cmd.trim().toLowerCase();
    if (env === 'windows') return /^(get-childitem|gci|dir|ls)(\s.*)?$/.test(c);
    return /^ls(\s.*)?$/.test(c);
  };

export const validateLsLa: ValidateFn = (cmd, env) => {
    const c = cmd.trim().toLowerCase();
    if (env === 'windows') return /^(get-childitem|gci|dir)\s+(-force|-hidden)/.test(c) || /^ls\s+(-la|-al)$/.test(c);
    return /^ls\s+(-la|-al|-a -l|-l -a)$/.test(c);
  };

export const validateCd: ValidateFn = (cmd, env) => {
    const c = cmd.trim().toLowerCase();
    if (env === 'windows') return ['cd documents', 'set-location documents', 'sl documents'].includes(c);
    return c === 'cd documents';
  };

export const validateMkdir: ValidateFn = (cmd, env) => {
    const c = cmd.trim().toLowerCase();
    if (env === 'windows') return /^(mkdir|md|new-item|ni)\s+.*test/.test(c);
    return /^mkdir\s+(-p\s+)?test$/.test(c);
  };

export const validateTouch: ValidateFn = (cmd, env) => {
    const c = cmd.trim().toLowerCase();
    if (env === 'windows') return /^(new-item|ni)\s+.*memo\.txt/.test(c) || c === 'touch memo.txt';
    return c === 'touch memo.txt';
  };

export const validateCp: ValidateFn = (cmd, env) => {
    const c = cmd.trim().toLowerCase();
    if (env === 'windows') return /^(copy-item|cpi|copy|cp)\s+documents\/notes\.txt\s+documents\/notes-copy\.txt/.test(c);
    return c === 'cp documents/notes.txt documents/notes-copy.txt';
  };

export const validateMv: ValidateFn = (cmd, env) => {
    const c = cmd.trim().toLowerCase();
    if (env === 'windows') return /^(move-item|mi|move|mv)\s+documents\/rapport\.md\s+documents\/rapport-final\.md/.test(c);
    return c === 'mv documents/rapport.md documents/rapport-final.md';
  };

export const validateRm: ValidateFn = (cmd, env) => {
    const c = cmd.trim().toLowerCase();
    if (env === 'windows') return /^(remove-item|ri|del|erase|rm)\s+documents\/notes\.txt/.test(c);
    return c === 'rm documents/notes.txt';
  };

export const validateCat: ValidateFn = (cmd, env) => {
    const c = cmd.trim().toLowerCase();
    if (env === 'windows') return /^(get-content|gc|cat|type)\s+documents\/notes\.txt/.test(c);
    return c === 'cat documents/notes.txt';
  };

export const validateHeadTail: ValidateFn = (cmd, env) => {
    const c = cmd.trim().toLowerCase();
    if (env === 'windows') return /get-content.+rapport\.md.*select-object.*-first\s+3/.test(c) || c === 'head -n 3 documents/rapport.md';
    return c === 'head -n 3 documents/rapport.md';
  };

export const validateGrep: ValidateFn = (cmd, env) => {
    const c = cmd.trim().toLowerCase();
    if (env === 'windows') return /^(select-string|sls)\s+["']?important["']?\s+documents\/notes\.txt/.test(c) || /^grep\s+["']?important["']?\s+documents\/notes\.txt/.test(c);
    return /^grep\s+(-\w+\s+)*["']?important["']?\s+documents\/notes\.txt$/.test(c);
  };

export const validateWc: ValidateFn = (cmd, env) => {
    const c = cmd.trim().toLowerCase();
    if (env === 'windows') return /\(get-content.+rapport\.md\)\.count/.test(c) || c === 'wc -l documents/rapport.md';
    return c === 'wc -l documents/rapport.md';
  };

export const validateComprendrePermissions: ValidateFn = (cmd, env) => {
    const c = cmd.trim().toLowerCase();
    if (env === 'windows') return /^(get-acl|ls -l|icacls)/.test(c);
    return c === 'ls -l';
  };

export const validateChmod: ValidateFn = (cmd, env) => {
    const c = cmd.trim().toLowerCase();
    if (env === 'windows') return /^set-executionpolicy\s+(remotesigned|unrestricted|bypass)/.test(c) || /^chmod\s+(\+x|755)\s+projets\/script\.sh/.test(c);
    return /^chmod\s+(\+x|755|u\+x)\s+projets\/script\.sh$/.test(c);
  };

export const validateChown: ValidateFn = (cmd, env) => {
    const c = cmd.trim().toLowerCase();
    if (env === 'windows') return /^(get-acl|get-item)\s+/.test(c) || c === 'ls -la';
    return /^ls\s+(-la|-al)$/.test(c) || /^ls\s+-l/.test(c);
  };

export const validateSudo: ValidateFn = (cmd) => {
    const c = cmd.trim().toLowerCase();
    return c === 'whoami' || c === 'sudo whoami';
  };

export const validateSecurityPermissions: ValidateFn = (cmd, env) => {
    const c = cmd.trim().toLowerCase();
    if (env === 'windows') return /^(get-acl|icacls)\s+/.test(c) || c === 'ls -la';
    return /^ls(\s+(-la|-al|-l|-a))?/.test(c);
  };

export const validatePs: ValidateFn = (cmd, env) => {
    const c = cmd.trim().toLowerCase();
    if (env === 'windows') return /^(get-process|gps|tasklist|ps)(\s.*)?$/.test(c);
    return /^ps(\s+.*)?$/.test(c);
  };

export const validateKill: ValidateFn = (cmd, env) => {
    const c = cmd.trim().toLowerCase();
    if (env === 'windows') return /^(stop-process|spps|taskkill|get-process|gps|ps)(\s.*)?$/.test(c);
    return /^ps(\s+.*)?$/.test(c);
  };

export const validateTop: ValidateFn = (cmd, env) => {
    const c = cmd.trim().toLowerCase();
    if (env === 'windows') return /^get-process\s*\|/.test(c) || /^(get-process|gps|ps)\s/.test(c);
    if (env === 'macos') return /^ps\s+aux/.test(c) || /^top/.test(c);
    return /^ps\s+aux/.test(c) || /^top/.test(c);
  };

export const validateBackground: ValidateFn = (cmd, env) => {
    const c = cmd.trim().toLowerCase();
    if (env === 'windows') return c === 'get-job' || c === 'jobs';
    return c === 'jobs';
  };

export const validateRedirectionSortie: ValidateFn = (cmd, env) => {
    const c = cmd.trim();
    if (env === 'windows') return /^(write-output|write-host|echo)\s+["']?Bonjour le monde!?["']?\s*>\s*bonjour\.txt$/i.test(c);
    return /^echo\s+["']?Bonjour le monde!?["']?\s+>\s+bonjour\.txt$/.test(c);
  };

export const validatePipes: ValidateFn = (cmd, env) => {
    const c = cmd.trim().toLowerCase();
    if (env === 'windows') return /^(get-childitem|dir|ls)\s*\|\s*(measure-object|measure)/.test(c) || c === 'ls | wc -l';
    return c === 'ls | wc -l';
  };

export const validateStderr: ValidateFn = (cmd, env) => {
    const c = cmd.trim().toLowerCase();
    if (env === 'windows') return /2>\s*(erreurs|errors|err)/.test(c) || /2>\$null/.test(c);
    return /2>/.test(c);
  };

export const validateTee: ValidateFn = (cmd, env) => {
    const c = cmd.trim().toLowerCase();
    if (env === 'windows') return /tee-object/.test(c) || /\|\s*tee/.test(c);
    return /\|\s*tee/.test(c);
  };

export const validateEnvVars: ValidateFn = (cmd, env) => {
    const c = cmd.trim();
    if (env === 'windows') return /^\$env:[A-Za-z_]\w*\s*=\s*.+/.test(c);
    return /^export\s+[A-Za-z_]\w*=.+/.test(c);
  };

export const validatePathVariable: ValidateFn = (cmd, env) => {
    const c = cmd.trim().toLowerCase();
    if (env === 'windows') return c === 'echo $env:path' || c === '$env:path';
    return c === 'echo $path';
  };

export const validateShellConfig: ValidateFn = (cmd, env) => {
    const c = cmd.trim().toLowerCase();
    if (env === 'macos') return c === 'cat ~/.zshrc';
    if (env === 'windows') return /^(cat|get-content|gc)\s+\$profile$/i.test(c);
    return c === 'cat ~/.bashrc';
  };

export const validateDotenv: ValidateFn = (cmd, env) => {
    const c = cmd.trim().toLowerCase();
    if (env === 'windows') return /^(get-content|gc|cat)\s+\.env$/.test(c);
    return c === 'cat .env';
  };

export const validateScripts: ValidateFn = (cmd, env) => {
    const c = cmd.trim().toLowerCase();
    if (env === 'windows') return /^\.(\\|\/)script\.sh$/.test(c) || /^bash\s+script\.sh$/.test(c);
    return c === './script.sh' || c === 'bash script.sh';
  };

export const validateCron: ValidateFn = (cmd) => cmd.trim().toLowerCase() === 'crontab -l';

export const validatePing: ValidateFn = (cmd) => /^ping\s+.+/.test(cmd.trim().toLowerCase());

export const validateCurl: ValidateFn = (cmd, env) => {
    const c = cmd.trim().toLowerCase();
    if (env === 'windows') {
      return /^curl(\.exe)?\s+https?:\/\/.+/.test(c) || /^invoke-webrequest\s+-uri\s+https?:\/\/.+/.test(c);
    }
    return /^curl\s+.+/.test(c);
  };

export const validateWget: ValidateFn = (cmd, env) => {
    const c = cmd.trim().toLowerCase();
    if (env === 'windows') {
      return /^wget\s+https?:\/\/.+/.test(c) ||
        /^invoke-webrequest\s+(-uri\s+)?https?:\/\/.+/.test(c) ||
        /^iwr\s+https?:\/\/.+/.test(c);
    }
    return /^wget\s+https?:\/\/.+/.test(c);
  };

export const validateDns: ValidateFn = (cmd, env) => {
    const c = cmd.trim().toLowerCase();
    if (env === 'windows') {
      return /^nslookup\s+.+/.test(c) || /^resolve-dnsname\s+.+/.test(c) || /^dig\s+.+/.test(c);
    }
    return /^nslookup\s+.+/.test(c) || /^dig\s+.+/.test(c);
  };

export const validateSsh: ValidateFn = (cmd) => {
    const c = cmd.trim().toLowerCase();
    return /^ssh-keygen\s+.*-t\s+ed25519/.test(c) || /^ssh-keygen\s+-t\s+ed25519/.test(c);
  };

export const validateScp: ValidateFn = (cmd) => /^scp\s+.+\s+.+@.+:.+/.test(cmd.trim().toLowerCase());

export const validateGitInit: ValidateFn = (cmd) => /^git\s+init(\s+.*)?$/.test(cmd.trim().toLowerCase());

export const validateGitConfig: ValidateFn = (cmd) => /^git\s+config\s+(--list|--global\s+user\.)/.test(cmd.trim().toLowerCase());

export const validateGitAddCommit: ValidateFn = (cmd) => /^git\s+add\s+(\.|--all|-A|-p)/.test(cmd.trim().toLowerCase());

export const validateGitStatusLog: ValidateFn = (cmd) => /^git\s+status/.test(cmd.trim().toLowerCase());

export const validateGitDiffGitignore: ValidateFn = (cmd) => /^git\s+diff(\s+.*)?$/.test(cmd.trim().toLowerCase());

export const validateGitBranch: ValidateFn = (cmd) => {
    const c = cmd.trim().toLowerCase();
    return /^git\s+checkout\s+-b\s+\S+/.test(c) || /^git\s+switch\s+-c\s+\S+/.test(c);
  };

export const validateGitMerge: ValidateFn = (cmd) => /^git\s+merge\s+\S+/.test(cmd.trim().toLowerCase());

export const validateGitRemote: ValidateFn = (cmd) => /^git\s+remote\s+add\s+\S+\s+https?:\/\/\S+/.test(cmd.trim().toLowerCase());

export const validateGitPushPull: ValidateFn = (cmd) => /^git\s+push(\s+-u\s+\S+\s+\S+|\s+\S+\s+\S+|\s*)$/.test(cmd.trim().toLowerCase());

export const validateGitFetchClone: ValidateFn = (cmd) => /^git\s+clone\s+\S+/.test(cmd.trim().toLowerCase());

export const validatePullRequests: ValidateFn = (cmd) => {
    const c = cmd.trim().toLowerCase();
    return /^git\s+checkout\s+-b\s+feature\/\S+/.test(c) || /^git\s+switch\s+-c\s+feature\/\S+/.test(c);
  };

export const validateConflicts: ValidateFn = (cmd) => /^git\s+merge\s+\S+/.test(cmd.trim().toLowerCase());

export const validateGithubActions: ValidateFn = (cmd) => /^git\s+status/.test(cmd.trim().toLowerCase());
