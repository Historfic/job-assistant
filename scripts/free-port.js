// Frees port 3000 before `next dev` starts.
//
// On Windows, a killed terminal/session can leave an orphaned node process
// listening on the port. Next.js then silently drifts to 3001/3002 while the
// browser keeps talking to the stale zombie — which serves broken pages
// (404s, missing CSS). Running this as `predev` guarantees the newest
// `npm run dev` always owns port 3000.
//
// Safety: only kills processes whose image name is node — anything else
// holding the port is reported and left alone.
const { execSync } = require('node:child_process');

const PORT = process.env.PORT || '3000';
const win = process.platform === 'win32';

function pidsOnPort(port) {
  try {
    if (win) {
      const out = execSync(`netstat -ano -p tcp`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      return [...new Set(
        out.split('\n')
          .filter(l => l.includes(`:${port}`) && l.includes('LISTENING'))
          .map(l => l.trim().split(/\s+/).pop())
          .filter(pid => pid && pid !== '0'),
      )];
    }
    const out = execSync(`lsof -ti tcp:${port} -s tcp:listen`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return out.split('\n').map(s => s.trim()).filter(Boolean);
  } catch {
    return []; // nothing listening — the common case
  }
}

function isNode(pid) {
  try {
    const out = win
      ? execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, { encoding: 'utf8' })
      : execSync(`ps -p ${pid} -o comm=`, { encoding: 'utf8' });
    return /node/i.test(out);
  } catch {
    return false;
  }
}

for (const pid of pidsOnPort(PORT)) {
  if (!isNode(pid)) {
    console.warn(`[free-port] port ${PORT} held by non-node PID ${pid} — leaving it alone`);
    continue;
  }
  try {
    if (win) execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
    else process.kill(Number(pid), 'SIGKILL');
    console.log(`[free-port] cleared orphaned node process ${pid} from port ${PORT}`);
  } catch {
    console.warn(`[free-port] could not kill PID ${pid} — start may fall back to another port`);
  }
}
