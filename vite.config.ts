import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import {
  checkFFmpegAvailable,
  startExportJob,
  activeJobs,
  generateAutoSubtitles
} from './src/server/ffmpeg-engine.ts';

function ffmpegApiPlugin(): Plugin {
  return {
    name: 'ffmpeg-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';

        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          return res.end();
        }

        // Endpoint: Check system capabilities
        if (url === '/api/capabilities' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({
            ffmpegAvailable: checkFFmpegAvailable(),
            version: 'FFmpeg 8.1 HW Accelerated',
            os: 'Windows x86_64'
          }));
        }

        // Endpoint: Start export
        if (url === '/api/export' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const data = JSON.parse(body);
              const jobId = `job_${Date.now()}`;
              startExportJob(jobId, data, process.cwd());
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ success: true, jobId }));
            } catch (err: any) {
              res.statusCode = 500;
              return res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // Endpoint: Progress of export
        if (url.startsWith('/api/export-progress/') && req.method === 'GET') {
          const jobId = url.replace('/api/export-progress/', '');
          const job = activeJobs.get(jobId);
          res.setHeader('Content-Type', 'application/json');
          if (!job) {
            return res.end(JSON.stringify({ status: 'not_found', progress: 0 }));
          }
          return res.end(JSON.stringify(job));
        }

        // Endpoint: AI auto-subtitles
        if (url === '/api/ai-transcribe' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}');
              const duration = data.duration || 10;
              const subtitles = generateAutoSubtitles(duration);
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ success: true, subtitles }));
            } catch (err: any) {
              res.statusCode = 500;
              return res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    ffmpegApiPlugin()
  ],
  server: {
    port: 5173,
    host: true
  }
});

