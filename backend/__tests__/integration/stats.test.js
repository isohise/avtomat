const request = require('supertest');
const app = require('../../server');

describe('Stats API', () => {
  test('GET /stats/unique-climbers-per-mountain', async () => {
    const res = await request(app)
      .get('/stats/unique-climbers-per-mountain');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
