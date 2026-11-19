import assert from 'node:assert/strict';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { isRecoveredCapture } from '../supabase/functions/edge-error-digest/recovered-capture.ts';

const id = '00000000-0000-4000-8000-000000000001';
const notification = {
  function_name: 'classify-notification-capture', fingerprint: '29b5540e', count: 1,
  sample_message: 'NOTIFICATION_CLASSIFICATION_TIMEOUT',
  sample_context: { stage: 'classification', attemptNumber: 1, eventId: id },
};
const wallet = {
  function_name: 'save-wallet-transaction', fingerprint: '5c5cec67', count: 1,
  sample_message: 'MODEL_OUTPUT_TRUNCATED',
  sample_context: { phase: 'ai_categorization', outcome: 'category_degraded', captureId: id },
};

function fixture(record, status = 200) {
  const requests = [];
  const db = createClient('https://example.test', 'test', { global: { fetch: async (url) => {
    requests.push(new URL(url));
    return Response.json(record ? [record] : [], { status });
  } } });
  return { db, requests };
}

test('only saved or ignored notification events silence the timeout', async () => {
  for (const status of ['saved', 'ignored', 'failed', 'processing']) {
    const { db, requests } = fixture({ status });
    assert.equal(await isRecoveredCapture(db, notification), ['saved', 'ignored'].includes(status));
    assert.equal(requests[0].pathname, '/rest/v1/notification_capture_classifications');
    assert.equal(requests[0].searchParams.get('id'), `eq.${id}`);
  }
});

test('wallet truncation needs a successful acknowledgement with a saved ID', async () => {
  for (const [record, recovered] of [[{ success: true, expense_id: id }, true],
    [{ success: false, expense_id: id }, false], [{ success: true }, false], [null, false]]) {
    const { db, requests } = fixture(record);
    assert.equal(await isRecoveredCapture(db, wallet), recovered);
    assert.equal(requests[0].pathname, '/rest/v1/idempotency_keys');
    assert.equal(requests[0].searchParams.get('id'), `eq.${id}`);
    assert.equal(requests[0].searchParams.get('select'), 'success:result->success,expense_id:result->data->>id');
  }
});

test('other errors and multi-event samples remain visible without a lookup', async () => {
  const { db, requests } = fixture(null);
  for (const row of [{ ...notification, count: 2 }, { ...wallet, sample_context: null },
    { ...notification, function_name: 'other' }, { ...wallet, sample_message: 'SAVE_FAILED' },
    { ...wallet, sample_context: { ...wallet.sample_context, outcome: 'failed' } },
    { ...notification, sample_context: { ...notification.sample_context, eventId: 'invalid' } }]) {
    assert.equal(await isRecoveredCapture(db, row), false);
  }
  assert.equal(requests.length, 0);
});

test('an unavailable recovery record never silences an alert', async () => {
  assert.equal(await isRecoveredCapture(fixture(null, 403).db, notification), false);
});
