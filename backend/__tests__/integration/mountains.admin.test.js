const request = require('supertest');
const app = require('../../server');

describe('Admin access to mountains', () => {
  let adminToken;

  beforeAll(async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ login: 'admin', password: 'admin123' });

    adminToken = res.body.token;
  });

  test('POST /mountains without token -> 401', async () => {
    const res = await request(app).post('/mountains').send({
      name: 'Test Mountain',
      height_m: 1000,
      country: 'Testland'
    });

    expect(res.statusCode).toBe(401);
  });

  test('POST /mountains with admin token -> 201', async () => {
    const res = await request(app)
      .post('/mountains')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Everest',
        height_m: 8848,
        country: 'Nepal'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('Everest');
  });
});
