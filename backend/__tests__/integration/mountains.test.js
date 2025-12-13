const request = require('supertest');
const app = require('../../server');

describe('GET /mountains', () => {
  it('returns 200 and array', async () => {
    const res = await request(app).get('/mountains');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
