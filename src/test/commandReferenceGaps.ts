/**
 * Reference examples that still print an error in the practice terminal
 * (commandReference.test.ts). The list may only shrink: fix the engine, then
 * delete the line. Commands listed in NOT_SIMULATED (commandExamples.ts) are
 * exempt, since the reference already tells the learner they are not simulated.
 *
 * Causes, by family:
 * - PowerShell cmdlets and parameters not simulated yet: Get-Date, Get-History,
 *   Get-Help, Set-Content, Get-ScheduledTask, tasklist, Get-Content -TotalCount / -Tail,
 *   `$env:Path +=`, `$env:USERNAME`.
 * - Unix options not simulated yet: `cat -n`, `grep -r` on a directory, ssh-copy-id.
 * - Git: `git commit -am` loses its message (engine bug), `git rebase -i` prints its
 *   warning as an error, cherry-pick examples name commits the practice repository does not have.
 *
 * Key: `<command id> [<env>] <example>`.
 */
export const KNOWN_REFERENCE_GAPS = new Set<string>([
  "cat [linux] cat -n documents/notes.txt",
  "cat [macos] cat -n documents/notes.txt",
  "head_tail [windows] Get-Content documents\\notes.txt -TotalCount 3",
  "head_tail [windows] Get-Content documents\\notes.txt -Tail 2",
  "grep [linux] grep -rn bash documents",
  "grep [macos] grep -rn bash documents",
  "date [windows] Get-Date",
  "date [windows] Get-Date -Format \"yyyy-MM-dd HH:mm\"",
  "history [windows] Get-History",
  "man [windows] Get-Help Get-ChildItem",
  "man [windows] Get-Help Get-ChildItem -Examples",
  "ps [windows] tasklist",
  "top_htop [windows] tasklist",
  "export [windows] $env:Path += \";C:\\outils\"",
  "env [windows] $env:USERNAME",
  "run_script [windows] Set-Content bonjour.ps1 'Write-Output \"Bonjour\"'",
  "run_script [windows] .\\bonjour.ps1",
  "crontab [windows] Get-ScheduledTask",
  "ssh [linux] ssh-copy-id user@serveur.example.com",
  "ssh [macos] ssh-copy-id user@serveur.example.com",
  "git_commit [linux] git commit -am \"fix: corrige le lien du menu\"",
  "git_commit [macos] git commit -am \"fix: corrige le lien du menu\"",
  "git_commit [windows] git commit -am \"fix: corrige le lien du menu\"",
  "git_rebase [linux] git rebase -i HEAD~3",
  "git_rebase [macos] git rebase -i HEAD~3",
  "git_rebase [windows] git rebase -i HEAD~3",
  "git_cherry_pick [linux] git cherry-pick a1b2c3d",
  "git_cherry_pick [linux] git cherry-pick a1b2c3d..e4f5a6b",
  "git_cherry_pick [macos] git cherry-pick a1b2c3d",
  "git_cherry_pick [macos] git cherry-pick a1b2c3d..e4f5a6b",
  "git_cherry_pick [windows] git cherry-pick a1b2c3d",
  "git_cherry_pick [windows] git cherry-pick a1b2c3d..e4f5a6b",
]);
