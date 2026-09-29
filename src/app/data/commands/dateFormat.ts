/**
 * Date formatting as the real tools do it, in the C / en-US locale the rest of
 * the simulator uses: `date +FORMAT` (strftime, GNU and BSD date) and
 * `Get-Date -Format` (.NET custom format strings).
 */

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const pad = (n: number, width = 2, fill = '0') => String(n).padStart(width, fill);

/**
 * Short time zone name of the learner's machine as the browser gives it: CEST in
 * Europe, but often an offset such as GMT-4 elsewhere (no locale has every
 * abbreviation), UTC when unknown.
 */
function zoneName(d: Date): string {
  const part = new Intl.DateTimeFormat('en-GB', { timeZoneName: 'short' }).formatToParts(d).find((p) => p.type === 'timeZoneName');
  return part?.value ?? 'UTC';
}

function dayOfYear(d: Date): number {
  // Calendar days in UTC, so a daylight-saving change cannot shift the count.
  return (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 1)) / 86_400_000 + 1;
}

/** strftime subset: the conversions a learner meets (%Y %m %d %H %M %S %a %A %b %B %e %j %y %Z %F %T %s %%). */
export function strftime(d: Date, format: string): string {
  return format.replace(/%([a-zA-Z%])/g, (whole, c: string) => {
    switch (c) {
      case 'Y': return String(d.getFullYear());
      case 'y': return pad(d.getFullYear() % 100);
      case 'm': return pad(d.getMonth() + 1);
      case 'd': return pad(d.getDate());
      case 'e': return pad(d.getDate(), 2, ' ');
      case 'H': return pad(d.getHours());
      case 'M': return pad(d.getMinutes());
      case 'S': return pad(d.getSeconds());
      case 'a': return DAYS[d.getDay()].slice(0, 3);
      case 'A': return DAYS[d.getDay()];
      case 'b': return MONTHS[d.getMonth()].slice(0, 3);
      case 'B': return MONTHS[d.getMonth()];
      case 'j': return pad(dayOfYear(d), 3);
      case 'Z': return zoneName(d);
      case 'F': return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      case 'T': return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      case 's': return String(Math.floor(d.getTime() / 1000));
      case '%': return '%';
      default: return whole;
    }
  });
}

/**
 * .NET custom date format (Get-Date -Format "yyyy-MM-dd HH:mm"). Tokens are the
 * longest run of one letter; text in quotes and other characters pass through.
 */
export function dotnetDateFormat(d: Date, format: string): string {
  const hours12 = d.getHours() % 12 || 12;
  const token = (t: string): string => {
    const n = t.length;
    switch (t[0]) {
      case 'y': return n <= 2 ? pad(d.getFullYear() % 100, n) : pad(d.getFullYear(), n);
      case 'M': return n === 1 ? String(d.getMonth() + 1) : n === 2 ? pad(d.getMonth() + 1) : n === 3 ? MONTHS[d.getMonth()].slice(0, 3) : MONTHS[d.getMonth()];
      case 'd': return n === 1 ? String(d.getDate()) : n === 2 ? pad(d.getDate()) : n === 3 ? DAYS[d.getDay()].slice(0, 3) : DAYS[d.getDay()];
      case 'H': return n === 1 ? String(d.getHours()) : pad(d.getHours());
      case 'h': return n === 1 ? String(hours12) : pad(hours12);
      case 'm': return n === 1 ? String(d.getMinutes()) : pad(d.getMinutes());
      case 's': return n === 1 ? String(d.getSeconds()) : pad(d.getSeconds());
      case 't': return n === 1 ? (d.getHours() < 12 ? 'A' : 'P') : d.getHours() < 12 ? 'AM' : 'PM';
      default: return t;
    }
  };
  let out = '';
  for (let i = 0; i < format.length; ) {
    const c = format[i];
    if (c === "'" || c === '"') {
      const end = format.indexOf(c, i + 1);
      out += format.slice(i + 1, end === -1 ? undefined : end);
      i = end === -1 ? format.length : end + 1;
    } else if ('yMdHhmst'.includes(c)) {
      let j = i;
      while (format[j] === c) j++;
      out += token(format.slice(i, j));
      i = j;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

/** What `Get-Date` prints without a format, in the en-US culture: "Saturday, September 26, 2026 9:24:25 PM". */
export function psDefaultDate(d: Date): string {
  return dotnetDateFormat(d, 'dddd, MMMM d, yyyy h:mm:ss tt');
}
