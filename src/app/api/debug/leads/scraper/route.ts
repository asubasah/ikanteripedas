import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const PID_FILE = path.join(process.cwd(), 'data', 'scraper_pid.txt');
const LOG_FILE = path.join(process.cwd(), 'data', 'scraper_log.txt');

export async function GET() {
  try {
    let pid = null;
    let isRunning = false;
    let logs = '';

    if (fs.existsSync(PID_FILE)) {
      pid = parseInt(fs.readFileSync(PID_FILE, 'utf8'));
      try {
        process.kill(pid, 0); // Check if process exists
        isRunning = true;
      } catch (e) {
        // Process is not running
        isRunning = false;
      }
    }

    if (fs.existsSync(LOG_FILE)) {
       // get the last 5000 chars for safety
       const allLogs = fs.readFileSync(LOG_FILE, 'utf8');
       logs = allLogs.slice(-5000);
    }

    return NextResponse.json({
      isRunning,
      pid: isRunning ? pid : null,
      logs
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read status' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { action, keywords } = await request.json();

    if (action === 'stop') {
      if (fs.existsSync(PID_FILE)) {
        const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8'));
        try {
          // Graceful termination
          process.kill(pid); 
          // Check for tree kill in UNIX if needed, but standard kill should work for single process
          fs.appendFileSync(LOG_FILE, '\n❌ Mematikan paksa scraper...');
        } catch (e) {}
      }
      return NextResponse.json({ success: true, message: 'Scraper dihentikan' });
    }

    if (action === 'start') {
      // Create data dir if not exists
      if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
        fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
      }

      // Clear logs
      fs.writeFileSync(LOG_FILE, '🚀 Menyiapkan Scraper Engine...\n');

      // Check if already running
      if (fs.existsSync(PID_FILE)) {
        const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8'));
        try {
          process.kill(pid, 0);
          return NextResponse.json({ error: 'Scraper is already running' }, { status: 400 });
        } catch (e) {}
      }

      let envParams = { ...process.env };
      if (keywords && Array.isArray(keywords)) {
         envParams.SCRAPE_KEYWORDS = JSON.stringify(keywords);
      }

      const logStream = fs.openSync(LOG_FILE, 'a');

      // Detach the sub-process
      let cmd = 'npx';
      let args = ['tsx', 'scripts/scraper-maps.ts'];

      // On Windows, npx requires .cmd extension if we're calling spawn directly.
      if (process.platform === 'win32') {
         cmd = 'npx.cmd';
      }

      const child = spawn(cmd, args, {
        cwd: process.cwd(),
        env: envParams,
        stdio: ['ignore', logStream, logStream],
        detached: true
      });

      child.unref(); // allow the main loop to exit

      if (child.pid) {
         fs.writeFileSync(PID_FILE, child.pid.toString());
      }

      return NextResponse.json({ success: true, message: 'Scraper started' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('API /leads/scraper Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
