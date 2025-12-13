const request = require('supertest');
const app = require('../../server');

describe('Forbidden access for regular user', () => {
  let userToken;

  beforeAll(async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ login: 'user', password: 'user123' });

    userToken = res.body.token;
  });

  test('POST /mountains as user -> 403', async () => {
    const res = await request(app)
      .post('/mountains')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Forbidden Peak',
        height_m: 1234,
        country: 'Nowhere'
      });

    expect(res.statusCode).toBe(403);
  });
});
