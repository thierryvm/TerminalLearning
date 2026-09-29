import type { TerminalState, TerminalEnv, CommandOutput } from './types';

/** A stable address per host, so the output reads like the lessons. */
function fakeIp(host: string): string {
  return host === 'google.com' ? '142.250.74.46' : '93.184.216.34';
}

export function handleNetwork(cmd: string, args: string[], newState: TerminalState, env: TerminalEnv = 'linux'): CommandOutput {
  switch (cmd) {
    case 'ping': {
      const host = args.find((a) => !a.startsWith('-') && isNaN(Number(a))) ?? '';
      if (!host) return { lines: [{ text: 'Usage: ping <hostname>', type: 'error' }], newState };
      if (env === 'windows') {
        // Windows ping: 4 echo requests, its own wording.
        const ip = fakeIp(host);
        return {
          lines: [
            { text: `Pinging ${host} [${ip}] with 32 bytes of data:`, type: 'output' },
            ...[12, 11, 12, 13].map((ms) => ({ text: `Reply from ${ip}: bytes=32 time=${ms}ms TTL=117`, type: 'output' as const })),
            { text: '', type: 'output' },
            { text: `Ping statistics for ${ip}:`, type: 'output' },
            { text: '    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),', type: 'success' },
          ],
          newState,
        };
      }
      return {
        lines: [
          { text: `PING ${host}: 56 data bytes`, type: 'output' },
          { text: `64 bytes from ${host}: icmp_seq=0 ttl=54 time=12.3 ms`, type: 'output' },
          { text: `64 bytes from ${host}: icmp_seq=1 ttl=54 time=11.8 ms`, type: 'output' },
          { text: `64 bytes from ${host}: icmp_seq=2 ttl=54 time=12.1 ms`, type: 'output' },
          { text: `--- ${host} ping statistics ---`, type: 'output' },
          { text: '3 packets transmitted, 3 received, 0% packet loss', type: 'success' },
        ],
        newState,
      };
    }

    case 'curl': {
      const url = args.find((a) => !a.startsWith('-')) ?? '';
      if (!url) return { lines: [{ text: 'Usage: curl [options] <url>', type: 'error' }], newState };
      const urlHost = url.replace(/^https?:\/\//, '').split('/')[0] ?? 'server';
      if (args[0] === '-I' || args[0] === '--head') {
        return {
          lines: [
            { text: 'HTTP/2 200', type: 'success' },
            { text: 'content-type: application/json; charset=utf-8', type: 'output' },
            { text: `server: ${urlHost}`, type: 'output' },
            { text: 'x-content-type-options: nosniff', type: 'output' },
          ],
          newState,
        };
      }
      return { lines: [{ text: `{"url":"${url}","status":"ok"}`, type: 'output' }], newState };
    }

    case 'wget': {
      const url = args.find((a) => !a.startsWith('-')) ?? '';
      if (!url) return { lines: [{ text: 'Usage: wget <url>', type: 'error' }], newState };
      const filename = url.split('/').pop() || 'index.html';
      return {
        lines: [
          { text: `Connecting to ${url.split('/')[2] ?? 'host'}... connected.`, type: 'output' },
          { text: 'HTTP request sent, awaiting response... 200 OK', type: 'success' },
          { text: `Saving to: '${filename}'`, type: 'output' },
          { text: `'${filename}' saved [1024]`, type: 'success' },
        ],
        newState,
      };
    }

    case 'invoke-webrequest':
    case 'iwr': {
      const url = args.find((a) => !a.startsWith('-')) ?? '';
      if (!url) return { lines: [{ text: 'Usage: Invoke-WebRequest -Uri <url>', type: 'error' }], newState };
      const outFile = (() => { const i = args.indexOf('-OutFile'); return i >= 0 ? args[i + 1] : null; })();
      if (outFile) {
        return {
          lines: [
            { text: `Downloading ${url}...`, type: 'output' },
            { text: `Content saved to '${outFile}'`, type: 'success' },
          ],
          newState,
        };
      }
      return {
        lines: [
          { text: 'StatusCode        : 200', type: 'output' },
          { text: 'StatusDescription : OK', type: 'output' },
          { text: `Content           : {"url":"${url}","status":"ok"}`, type: 'output' },
        ],
        newState,
      };
    }

    case 'nslookup': {
      const host = args[0] ?? '';
      if (!host) return { lines: [{ text: 'Usage: nslookup <hostname>', type: 'error' }], newState };
      return {
        lines: [
          { text: 'Server:  8.8.8.8', type: 'output' },
          { text: 'Address: 8.8.8.8#53', type: 'output' },
          { text: 'Non-authoritative answer:', type: 'output' },
          { text: `Name: ${host}`, type: 'output' },
          { text: 'Address: 142.250.74.46', type: 'output' },
        ],
        newState,
      };
    }

    case 'dig': {
      const host = args.find((a) => !a.startsWith('+') && !a.startsWith('@')) ?? '';
      if (!host) return { lines: [{ text: 'Usage: dig <hostname>', type: 'error' }], newState };
      return {
        lines: [
          { text: `; <<>> DiG 9.18.1 <<>> ${host}`, type: 'output' },
          { text: ';; ANSWER SECTION:', type: 'output' },
          { text: `${host}. 299 IN A 142.250.74.46`, type: 'output' },
          { text: ';; Query time: 12 msec', type: 'output' },
          { text: ';; SERVER: 8.8.8.8#53', type: 'output' },
        ],
        newState,
      };
    }

    case 'resolve-dnsname': {
      const host = args.find((a) => !a.startsWith('-')) ?? '';
      if (!host) return { lines: [{ text: 'Usage: Resolve-DnsName <hostname>', type: 'error' }], newState };
      return {
        lines: [
          { text: 'Name                           Type TTL  Section IPAddress', type: 'output' },
          { text: '----                           ---- ---  ------- ---------', type: 'output' },
          { text: `${host.padEnd(31)}A    299  Answer  142.250.74.46`, type: 'output' },
        ],
        newState,
      };
    }

    case 'ssh': {
      const target = args.find((a) => !a.startsWith('-')) ?? '';
      if (!target) return { lines: [{ text: 'Usage: ssh user@hostname', type: 'error' }], newState };
      return {
        lines: [
          { text: `ssh: connexion simulée vers ${target}`, type: 'info' },
          { text: '(Dans un vrai terminal, vous seriez connecté à l\'hôte distant)', type: 'info' },
        ],
        newState,
      };
    }

    case 'ssh-copy-id': {
      // A shell script shipped with OpenSSH on Linux and macOS, not with Windows' OpenSSH.
      if (env === 'windows') {
        return { lines: [{ text: "ssh-copy-id: The term 'ssh-copy-id' is not recognized as a name of a cmdlet, function, script file, or executable program.", type: 'error' }], newState };
      }
      const target = args.find((a) => !a.startsWith('-') && a.includes('@')) ?? args.find((a) => !a.startsWith('-'));
      if (!target) return { lines: [{ text: 'Usage: /usr/bin/ssh-copy-id [-i [identity_file]] [-p port] [user@]hostname', type: 'error' }], newState };
      return {
        lines: [
          { text: '/usr/bin/ssh-copy-id: INFO: Source of key(s) to be installed: "/home/user/.ssh/id_ed25519.pub"', type: 'output' },
          { text: '/usr/bin/ssh-copy-id: INFO: attempting to log in with the new key(s), to filter out any that are already installed', type: 'output' },
          { text: '/usr/bin/ssh-copy-id: INFO: 1 key(s) remain to be installed -- if you are prompted now it is to install the new keys', type: 'output' },
          { text: `${target}'s password: (simulé)`, type: 'output' },
          { text: '', type: 'output' },
          { text: 'Number of key(s) added: 1', type: 'success' },
          { text: '', type: 'output' },
          { text: `Now try logging into the machine, with: "ssh '${target}'"`, type: 'output' },
          { text: 'and check to make sure that only the key(s) you wanted were added.', type: 'output' },
        ],
        newState,
      };
    }

    case 'scp': {
      if (args.length < 2) return { lines: [{ text: 'Usage: scp <source> user@host:<dest>', type: 'error' }], newState };
      const src = args.find((a) => !a.startsWith('-') && !a.includes('@')) ?? args[0];
      return { lines: [{ text: `${src}      100%  1024   512.0KB/s   00:00`, type: 'success' }], newState };
    }

    default:
      return { lines: [{ text: `${cmd}: commande introuvable.`, type: 'error' }], newState };
  }
}

export const NETWORK_COMMANDS = new Set([
  'ping', 'curl', 'wget', 'invoke-webrequest', 'iwr',
  'nslookup', 'dig', 'resolve-dnsname', 'ssh', 'ssh-keygen', 'ssh-copy-id', 'scp',
]);
