/**
 * Creates the first admin, or promotes an existing user to admin (AC16).
 *
 *   npm run admin:create
 *
 * Prompts for the username and (for a new account) the password in the terminal; the password
 * is typed with echo off and is never accepted as an argument, environment variable or pipe.
 * Database access comes from the same env file the API uses.
 */
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';

if (process.argv.length > 2) {
  process.stderr.write(
    'admin:create takes no arguments: it asks for the username and password.\n',
  );
  process.exit(2);
}
if (!process.stdin.isTTY || !process.stdout.isTTY) {
  process.stderr.write('Run admin:create in an interactive terminal.\n');
  process.exit(2);
}

let muted = false;
const output = new Writable({
  write(chunk: Buffer | string, encoding, callback) {
    if (!muted) process.stdout.write(chunk, encoding);
    callback();
  },
});
const rl = createInterface({ input: process.stdin, output, terminal: true });

async function ask(question: string, hidden = false): Promise<string> {
  process.stdout.write(question);
  muted = hidden;
  const answer = await rl.question('');
  muted = false;
  if (hidden) process.stdout.write('\n');
  return answer;
}

const { NestFactory } = await import('@nestjs/core');
const { AppModule } = await import('../src/app.module.js');
const { AdminBootstrapService, BootstrapError } = await import(
  '../src/features/auth/admin-bootstrap.service.js'
);
const { DomainError } = await import('../src/common/errors/domain.error.js');

const app = await NestFactory.createApplicationContext(AppModule, {
  logger: ['error'],
});
let exitCode = 0;
try {
  const bootstrap = app.get(AdminBootstrapService);
  const username = bootstrap.checkUsername((await ask('Admin username: ')).trim());

  let password: string | null = null;
  if (await bootstrap.exists(username)) {
    const answer = await ask(
      `"${username}" already exists. Promote it to admin (password stays as is)? [y/N] `,
    );
    if (answer.trim().toLowerCase() !== 'y') {
      process.stdout.write('Nothing changed.\n');
      process.exit(0);
    }
  } else {
    password = await ask('Password (typing is hidden): ', true);
    if (password !== (await ask('Repeat password: ', true))) {
      throw new BootstrapError('The passwords do not match');
    }
  }

  const outcome = await bootstrap.createOrPromote(username, password);
  const message = {
    created: `Created admin "${outcome.username}".`,
    promoted: `Promoted "${outcome.username}" to admin.`,
    already_admin: `"${outcome.username}" is already an admin.`,
  }[outcome.kind];
  process.stdout.write(`${message}\n`);
} catch (error) {
  exitCode = 1;
  if (error instanceof BootstrapError || error instanceof DomainError) {
    process.stderr.write(`${error.message}\n`);
  } else {
    throw error;
  }
} finally {
  rl.close();
  await app.close();
}
process.exit(exitCode);
