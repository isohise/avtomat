const request = require('supertest');
const app = require('../../server');

describe('Groups API', () => {
  let adminToken;
  let mountainId;

  beforeAll(async () => {
    // admin login
    const login = await request(app)
      .post('/auth/login')
      .send({ login: 'admin', password: 'admin123' });
    adminToken = login.body.token;

    // create mountain
    const m = await request(app)
      .post('/mountains')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'TestMountain', height_m: 1000, country: 'Test' });

    mountainId = m.body.id;
  });

  test('POST /groups as admin', async () => {
    const res = await request(app)
      .post('/groups')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Group A',
        mountain_id: mountainId,
        start_date: '2024-01-01'
      });

    expect(res.statusCode).toBe(201);
  });

  test('GET /groups', async () => {
    const res = await request(app).get('/groups');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
