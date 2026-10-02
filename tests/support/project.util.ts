import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

export async function createProject(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'between-tests-'));
}

export async function writeProjectFile(
  directory: string,
  filename: string,
  contents: string,
): Promise<void> {
  const path = join(directory, filename);

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents);
}

export async function removeProject(directory: string): Promise<void> {
  await rm(directory, { recursive: true, force: true });
}
