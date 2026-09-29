import assert from 'node:assert/strict';
import test from 'node:test';
import { selectFirestoreDatabase } from '../src/services/firestore/database.js';

test('Firestore selection uses default database when databaseId is absent', () => {
  const calls: unknown[][] = [];
  const app = { id: 'fake-app' };

  const selected = selectFirestoreDatabase(
    app,
    undefined,
    ((...args: unknown[]) => {
      calls.push(args);
      return 'default-db';
    }) as {
      (app: typeof app): string;
      (app: typeof app, databaseId: string): string;
    },
  );

  assert.equal(selected, 'default-db');
  assert.deepEqual(calls, [[app]]);
});

test('Firestore selection uses named database when databaseId is configured', () => {
  const calls: unknown[][] = [];
  const app = { id: 'fake-app' };

  const selected = selectFirestoreDatabase(
    app,
    ' test-database ',
    ((...args: unknown[]) => {
      calls.push(args);
      return 'named-db';
    }) as {
      (app: typeof app): string;
      (app: typeof app, databaseId: string): string;
    },
  );

  assert.equal(selected, 'named-db');
  assert.deepEqual(calls, [[app, 'test-database']]);
});
