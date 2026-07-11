const { spawn } = require('child_process');

const serviceName = process.env.RAILWAY_SERVICE_NAME || 'backend';
console.log(`Detected Railway Service Name: ${serviceName}`);

let command = 'npm';
let args = [];

if (serviceName.toLowerCase().includes('frontend')) {
  console.log('Starting frontend service (Next.js)...');
  args = ['run', 'start:frontend'];
} else {
  console.log('Starting backend service (Fastify)...');
  args = ['run', 'start:backend'];
}

const child = spawn(command, args, { 
  stdio: 'inherit',
  shell: true 
});

child.on('close', (code) => {
  process.exit(code);
});
