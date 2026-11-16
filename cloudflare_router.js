import express from 'express';
import { spawn } from 'node:child_process';

const app = express();
const PORT = 6944;
const FORWARD_URL = 'http://localhost:3000';
const MIRROR_COUNT = 3;                 // 3 active dynamic mirrors in the pool
const ROTATE_INTERVAL_MS = 4 * 60_000;  // Rotate every 4 minutes (within 3-5 min window)
const STARTUP_DELAY_MS = 5_000;        // 20s stagger between initial tunnel requests
const RATE_LIMIT_COOLDOWN_MS = 4 * 60_000; // Wait 4 minutes if a 429 occurs

let mirrors = []; // Array of { link: string, proc: ChildProcess }
let isRotating = false;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function launchMirror() {
    return new Promise((resolve, reject) => {
        const proc = spawn('cloudflared', [
            'tunnel',
            '--metrics', 'localhost:0',
            '--no-autoupdate',
            '--url', FORWARD_URL,
        ]);

        let resolved = false;
        let errorLogs = '';

        proc.stderr.on('data', (data) => {
            const text = data.toString();
            errorLogs += text;

            if (resolved) return;

            for (const line of text.split('\n')) {
                if (line.includes('https://') && line.includes('trycloudflare')) {
                    const match = line.match(/https:\/\/[^\s]+trycloudflare\.com/);
                    if (match) {
                        resolved = true;
                        resolve({ link: match[0], proc });
                    }
                }
            }
        });

        proc.on('error', (err) => {
            if (!resolved) reject(err);
        });

        proc.on('close', (code) => {
            if (!resolved) {
                const isRateLimited = errorLogs.includes('429');
                const err = new Error(isRateLimited ? 'RATE_LIMITED_429' : `Exit code ${code}: ${errorLogs}`);
                err.isRateLimited = isRateLimited;
                reject(err);
            }
        });
    });
}

// Retries with a 4-minute cooldown if Cloudflare returns 429
async function launchWithRetry(maxRetries = 5) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await launchMirror();
        } catch (err) {
            if (err.isRateLimited && attempt < maxRetries) {
                console.warn(`[Mirrors] Hit 429 rate limit. Cooling down for 4 mins (attempt ${attempt}/${maxRetries})...`);
                await sleep(RATE_LIMIT_COOLDOWN_MS);
            } else {
                throw err;
            }
        }
    }
}

async function rotateMirrors() {
    if (isRotating) return;
    isRotating = true;

    try {
        const freshMirror = await launchWithRetry();
        mirrors.push(freshMirror);

        while (mirrors.length > MIRROR_COUNT) {
            const oldestMirror = mirrors.shift();
            if (oldestMirror?.proc) {
                oldestMirror.proc.kill('SIGTERM');
            }
        }

        console.log('[Mirrors] Active pool:', mirrors.map((m) => m.link));
    } catch (err) {
        console.error('[Mirrors] Rotation skipped due to error:', err.message);
    } finally {
        isRotating = false;
    }
}

async function start() {
    for (let i = 0; i < MIRROR_COUNT; i++) {
        try {
            const mirror = await launchWithRetry();
            mirrors.push(mirror);
            console.log(`[Mirrors] Started (${mirrors.length}/${MIRROR_COUNT}): ${mirror.link}`);

            if (i < MIRROR_COUNT - 1) await sleep(STARTUP_DELAY_MS);
        } catch (err) {
            console.error(`Failed to launch mirror ${i + 1}:`, err.message);
        }
    }

    if (mirrors.length > 0) {
        console.log('[Mirrors] Revolving pool active (4-minute interval).');
        setInterval(rotateMirrors, ROTATE_INTERVAL_MS);
    }
}

app.get('/mirrors', (req, res) => {
    if (mirrors.length === 0) {
        return res.status(503).json({ error: 'Mirrors not ready' });
    }

    res.json({
        primary: mirrors[0].link,
        mirrors: mirrors.map((m) => m.link),
    });
});

process.on('SIGINT', () => {
    for (const m of mirrors) m.proc?.kill('SIGTERM');
    process.exit(0);
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    start();
});
