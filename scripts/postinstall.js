/**
 * Postinstall script
 * 
 * Checks if the native binary exists and provides instructions if not
 */

import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const binPath = join(__dirname, '..', 'bin', 'win-native-toast.exe');

if (!existsSync(binPath)) {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                     win-native-toast                            ║
╠════════════════════════════════════════════════════════════════╣
║  Native binary not found!                                       ║
║                                                                 ║
║  To build the native component, run:                            ║
║                                                                 ║
║    npm run build:native                                         ║
║                                                                 ║
║  Requirements:                                                  ║
║    - .NET 8.0 SDK (https://dotnet.microsoft.com/download)       ║
║    - Windows 10/11                                              ║
╚════════════════════════════════════════════════════════════════╝
`);
}
