/**
 * The command(s) a learner types to solve each lesson, per environment — the
 * ones the lesson itself tells them to type (instruction or hint).
 *
 * Used by lessonFidelity.test.ts. Each command must appear verbatim in the
 * lesson's instruction or hint for that environment (the test enforces it), so
 * this table cannot drift away from what the learner actually reads. A
 * multi-step exercise lists one command per step, in order.
 *
 * Derived from the browser census of 23 September 2026 (198 lesson × env).
 */
import type { EnvId } from '../app/data/curriculum';

export type Solution = Partial<Record<EnvId | 'all', string[]>>;

export const LESSON_SOLUTIONS: Record<string, Solution> = {
  // ── navigation ──
  'navigation/orientation': { all: ['help'] },
  'navigation/pwd': { all: ['pwd'], windows: ['Get-Location'] },
  'navigation/ls': { all: ['ls'], windows: ['Get-ChildItem'] },
  'navigation/ls-la': { all: ['ls -la'], windows: ['Get-ChildItem -Force'] },
  'navigation/command-anatomy': { all: ['man ls'], windows: ['Get-Help Get-ChildItem'] },
  'navigation/cd': { all: ['cd documents'], windows: ['Set-Location documents'] },
  // ── fichiers ──
  'fichiers/mkdir': { all: ['mkdir test'], windows: ['New-Item -ItemType Directory -Name test'] },
  'fichiers/touch': { all: ['touch memo.txt'], windows: ['New-Item -ItemType File -Name memo.txt'] },
  'fichiers/cp': {
    all: ['cp documents/notes.txt documents/notes-copy.txt'],
    windows: ['Copy-Item documents/notes.txt documents/notes-copy.txt'],
  },
  'fichiers/mv': {
    all: ['mv documents/rapport.md documents/rapport-final.md'],
    windows: ['Move-Item documents/rapport.md documents/rapport-final.md'],
  },
  'fichiers/rm': { all: ['rm documents/notes.txt'], windows: ['Remove-Item documents/notes.txt'] },
  // ── lecture ──
  'lecture/cat': { all: ['cat documents/notes.txt'], windows: ['Get-Content documents/notes.txt'] },
  'lecture/head-tail': {
    all: ['head -n 3 documents/rapport.md'],
    windows: ['Get-Content documents/rapport.md | Select-Object -First 3'],
  },
  'lecture/grep': {
    all: ['grep important documents/notes.txt'],
    windows: ['Select-String "important" documents/notes.txt'],
  },
  'lecture/wc': { all: ['wc -l documents/rapport.md'], windows: ['(Get-Content documents/rapport.md).Count'] },
  // ── permissions ──
  'permissions/comprendre-permissions': { all: ['ls -l'], windows: ['Get-Acl documents/notes.txt'] },
  'permissions/chmod': { all: ['chmod +x projets/script.sh'], windows: ['Set-ExecutionPolicy RemoteSigned'] },
  'permissions/chown': { all: ['ls -la'], windows: ['Get-Acl documents/notes.txt | Select-Object Owner'] },
  'permissions/sudo': { all: ['whoami'] },
  'permissions/security-permissions': { all: ['ls -la ~/.ssh'], windows: ['Get-Acl $HOME | Format-List'] },
  // ── processus ──
  'processus/ps': { all: ['ps'], windows: ['Get-Process'] },
  'processus/kill': {
    all: ['ps aux'],
    windows: ['Get-Process | Sort-Object CPU -Descending | Select-Object -First 5'],
  },
  'processus/top': {
    linux: ['ps aux --sort=-%mem | head -5'],
    macos: ['ps aux | sort -k3rn | head -5'],
    windows: ['Get-Process | Sort-Object WorkingSet -Descending | Select-Object -First 5'],
  },
  'processus/background': { all: ['jobs'], windows: ['Get-Job'] },
  // ── redirection ──
  'redirection/redirection-sortie': {
    all: ['echo "Bonjour le monde!" > bonjour.txt'],
    windows: ['Write-Output "Bonjour le monde!" > bonjour.txt'],
  },
  'redirection/pipes': { all: ['ls | wc -l'], windows: ['Get-ChildItem | Measure-Object'] },
  'redirection/stderr': {
    all: ['ls fichier-inexistant 2> erreurs.txt'],
    windows: ['Get-Item fichier-inexistant 2> erreurs.txt'],
  },
  'redirection/tee': {
    all: ['ls | tee ma-liste.txt'],
    windows: ['Get-ChildItem | Tee-Object -FilePath ma-liste.txt'],
  },
  // ── variables ──
  'variables/env-vars': { all: ['export GREETING=Hello'], windows: ['$env:GREETING = "Hello"'] },
  'variables/path-variable': { all: ['echo $PATH'], windows: ['echo $env:PATH'] },
  'variables/shell-config': { linux: ['cat ~/.bashrc'], macos: ['cat ~/.zshrc'], windows: ['cat $PROFILE'] },
  'variables/dotenv': { all: ['cd projets', 'cat .env'], windows: ['cd projets', 'Get-Content .env'] },
  'variables/scripts': { all: ['cd projets', './script.sh'], windows: ['cd projets', 'bash script.sh'] },
  'variables/cron': { all: ['crontab -l'], windows: ['Get-ScheduledTask'] },
  // ── réseau ──
  'reseau/ping': { all: ['ping google.com'] },
  'reseau/curl': { all: ['curl https://api.github.com'] },
  'reseau/wget': {
    all: ['wget https://example.com/fichier.zip'],
    windows: ['Invoke-WebRequest -Uri https://example.com/fichier.zip -OutFile fichier.zip'],
  },
  'reseau/dns': { all: ['nslookup google.com'] },
  'reseau/ssh': { all: ['ssh-keygen -t ed25519'] },
  'reseau/scp': { all: ['scp fichier.txt user@serveur.example.com:/home/user/'] },
  // ── git ──
  'git/git-init': { all: ['mkdir mon-projet', 'cd mon-projet', 'git init'] },
  'git/git-config': { all: ['git config --list'] },
  'git/git-add-commit': { all: ['git status', 'git add .', 'git commit -m "feat: premier commit"'] },
  'git/git-status-log': { all: ['git status'] },
  'git/git-diff-gitignore': { all: ['git diff', 'git add README.md', 'git diff --staged', 'git commit -m "docs: précise le README"'] },
  'git/git-branch': {
    all: ['git checkout -b feature/ma-feature', 'echo "Nouvelle fonctionnalité" > feature.txt', 'git add feature.txt', 'git commit -m "feat: ajoute feature.txt"', 'git switch main'],
    windows: ['git checkout -b feature/ma-feature', 'Set-Content feature.txt "Nouvelle fonctionnalité"', 'git add feature.txt', 'git commit -m "feat: ajoute feature.txt"', 'git switch main'],
  },
  'git/git-merge': { all: ['git merge feature/ma-feature', 'git branch -d feature/ma-feature'] },
  // ── github-collaboration ──
  'github-collaboration/git-remote': {
    all: ['git remote add origin https://github.com/user/mon-projet.git', 'git remote -v', 'git remote set-url origin git@github.com:user/mon-projet.git'],
  },
  'github-collaboration/git-push-pull': {
    all: ['git pull', 'echo "Contact" > contact.html', 'git add contact.html', 'git commit -m "feat: ajoute la page contact"', 'git push'],
    windows: ['git pull', 'Set-Content contact.html "Contact"', 'git add contact.html', 'git commit -m "feat: ajoute la page contact"', 'git push'],
  },
  'github-collaboration/git-fetch-clone': { all: ['git fetch', 'git log HEAD..origin/main --oneline', 'git merge origin/main'] },
  'github-collaboration/pull-requests': {
    all: ['git switch -c feature/contact', 'echo "Contact" > contact.html', 'git add contact.html', 'git commit -m "feat: ajoute la page contact"', 'git push -u origin feature/contact'],
    windows: ['git switch -c feature/contact', 'Set-Content contact.html "Contact"', 'git add contact.html', 'git commit -m "feat: ajoute la page contact"', 'git push -u origin feature/contact'],
  },
  'github-collaboration/merge-strategies': { all: ['git merge --no-ff --no-edit feature/ma-feature', 'git branch -d feature/ma-feature'] },
  'github-collaboration/conflicts': {
    all: ['git merge feature/nouvelle-feature', 'cat index.html', 'git checkout --theirs index.html', 'git add index.html', 'git commit --no-edit'],
    windows: ['git merge feature/nouvelle-feature', 'Get-Content index.html', 'git checkout --theirs index.html', 'git add index.html', 'git commit --no-edit'],
  },
  'github-collaboration/github-actions': {
    all: ['mkdir -p .github/workflows', 'mv ci.yml .github/workflows/', 'git add .github', 'git commit -m "ci: ajoute le workflow de vérification"', 'git push'],
    windows: ['New-Item -ItemType Directory .github/workflows', 'Move-Item ci.yml .github/workflows/', 'git add .github', 'git commit -m "ci: ajoute le workflow de vérification"', 'git push'],
  },
  // ── ia-dev ──
  'ia-dev/ia-dev-intro': { all: ['ai-help'] },
  'ia-dev/ia-dev-capacites': { all: ['ai-help capabilities'] },
  'ia-dev/ia-dev-limites': { all: ['ai-help limits'] },
  'ia-dev/ia-dev-prompts-basics': { all: ['ai-help prompts'] },
  'ia-dev/ia-dev-prompts-avances': { all: ['ai-help context'] },
  'ia-dev/ia-dev-valider': { all: ['ai-help validate'] },
  'ia-dev/ia-dev-debug': { all: ['ai-help debug'] },
  'ia-dev/ia-dev-securite': { all: ['ai-help security'] },
  'ia-dev/ia-dev-claude-cli': { all: ['ai-help claude-cli'] },
  'ia-dev/ia-dev-metiers': { all: ['ai-help careers'] },
  'ia-dev/ia-dev-posture': { all: ['ai-help senior'] },
  'ia-dev/ia-dev-workflow': { all: ['ai-help workflow'] },
};
