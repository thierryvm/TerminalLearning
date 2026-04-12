import type { TerminalState, CommandOutput } from './types';

export function handleNetwork(cmd: string, args: string[], newState: TerminalState): CommandOutput {
  switch (cmd) {
    case 'ping': {
      const host = args.find((a) => !a.startsWith('-') && isNaN(Number(a))) ?? '';
      if (!host) return { lines: [{ text: 'Usage: ping <hostname>', type: 'error' }], newState };
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

    case 'ssh-keygen': {
      const tIdx = args.indexOf('-t');
      const keyType = tIdx >= 0 ? (args[tIdx + 1] ?? 'rsa') : 'rsa';
      return {
        lines: [
          { text: `Generating public/private ${keyType} key pair.`, type: 'output' },
          { text: `Enter file in which to save the key (/home/user/.ssh/id_${keyType}): (simulé)`, type: 'output' },
          { text: `Your identification has been saved in /home/user/.ssh/id_${keyType}`, type: 'success' },
          { text: `Your public key has been saved in /home/user/.ssh/id_${keyType}.pub`, type: 'success' },
          { text: `+--[${keyType.toUpperCase()}]--+`, type: 'output' },
          { text: '|     .o+.        |', type: 'output' },
          { text: '+----[SHA256]-----+', type: 'output' },
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
  'nslookup', 'dig', 'resolve-dnsname', 'ssh', 'ssh-keygen', 'scp',
]);
