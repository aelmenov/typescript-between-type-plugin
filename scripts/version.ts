import { writeFile } from 'node:fs/promises';
import { format } from 'prettier';
import config from '../prettier.config.js';

const { npm_package_name: name, npm_package_version: version } = process.env;

if (!name || !version) {
  throw new Error('Run this script through npm version.');
}

const source = `export const pluginMeta = ${JSON.stringify({ name, version })};\n`;
const formatted = await format(source, { ...config, parser: 'typescript' });

await writeFile(new URL('../src/plugin.constants.ts', import.meta.url), formatted);
