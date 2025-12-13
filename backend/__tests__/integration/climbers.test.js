const request = require('supertest');
const app = require('../../server');

describe('Climbers API', () => {
  let adminToken;

  beforeAll(async () => {
    const login = await request(app)
      .post('/auth/login')
      .send({ login: 'admin', password: 'admin123' });
    adminToken = login.body.token;
  });

  test('POST /climbers as admin', async () => {
    const res = await request(app)
      .post('/climbers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ full_name: 'John Doe', address: 'Secret street' });

    expect(res.statusCode).toBe(201);
  });

  test('GET /climbers hides address for non-admin', async () => {
    const res = await request(app).get('/climbers');
    expect(res.statusCode).toBe(200);
    expect(res.body[0].address).toBe('скрыто');
  });
});
