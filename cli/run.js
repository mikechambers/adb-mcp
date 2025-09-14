#!/usr/bin/env node

const fs = require('fs');

const { io } = require('socket.io-client');

// CLI tool that connects to the running proxy server
class ProxyCLI {
  constructor() {
    this.socket = null;
    this.serverUrl = 'http://localhost:3001';
  }

  async connect() {
    return new Promise((resolve, reject) => {
      console.log(`Connecting to proxy server at ${this.serverUrl}...`);
      
      this.socket = io(this.serverUrl, {
        transports: ['websocket'],
        timeout: 5000
      });

      this.socket.on('connect', () => {
        console.log('Connected to proxy server');
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection failed:', error.message);
        reject(error);
      });
    });
  }

  async sendCommand(application, command) {
    if (!this.socket || !this.socket.connected) {
      throw new Error('Not connected to proxy server');
    }

    return new Promise((resolve, reject) => {
      console.log(`Sending command to ${application}:`, command);
      
      const responseHandler = (packet) => {
        console.log('Command executed successfully');
        resolve(packet);
      };

      const timeoutId = setTimeout(() => {
        this.socket.off('packet_response', responseHandler);
        reject(new Error('Command timeout - no response received'));
      }, 10000);

      this.socket.once('packet_response', (packet) => {
        clearTimeout(timeoutId);
        responseHandler(packet);
      });

      this.socket.emit('command_packet', { application, command });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const ret = {
    application: null,
    command: {},
    help: false
  };

  function getOptionsFromFile(filePath) {
    if (fs.existsSync(filePath)) {
        try {
          ret.options = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (e) {
          console.error('Error parsing options:', e);
          process.exit(1);
        }
      } else {
        console.error('Options file does not exist:', filePath);
        process.exit(1);
      }
    return ret.options;
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '-a':
      case '--application':
        ret.application = args[++i];
        break;
      case '-x':
      case '--action':
        ret.command.action = args[++i];
        break;
      case '-o':
      case '--options':
        ret.command.options = getOptionsFromFile(args[++i]);
        break;
      case '-h':
      case '--help':
        ret.help = true;
        break;
      default:
        if (!ret.application) {
          ret.application = arg;
        } else if (!ret.command.action) {
          ret.command.action = arg;
        } else if (!ret.command.options) {
          ret.command.options = getOptionsFromFile(arg);
        }
        break;
    }
  }

  return ret;
}

function showHelp() {
  console.log(`
📡 ADB-MCP Proxy CLI Tool

Usage: node run.js [application] [action] [options]

Options:
  -a, --application <app> Target application (photoshop, illustrator, etc.)
  -x, --action <action>   Name of the action to execute
  -o, --options <file>    Path to JSON options file to pass to action
  -h, --help              Show this help message

Examples:
  node run.js -a photoshop -x getActiveDocument -o options.json

Positional arguments:
  application             Target application name
  command                 Name of the action to execute
  options                 Path to JSON options file to pass to action
`);
}

async function runProxyCLI() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  if (!options.application || !options.command) {
    console.error('Both application and command are required. Use --help for usage information.');
    process.exit(1);
  }

  const cli = new ProxyCLI();

  try {
    await cli.connect();

    let command;
    try {
      command = JSON.parse(options.command);
    } catch {
      command = options.command;
    }

    const response = await cli.sendCommand(options.application, command);
    console.log('Command completed successfully');
    console.log('Response:', JSON.stringify(response, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    cli.disconnect();
  }
}

if (require.main === module) {
  runProxyCLI();
}
