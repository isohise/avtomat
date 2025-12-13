const request = require('supertest');
const app = require('../../server');

describe('Authentication flow', () => {
  let token;

  test('login with valid credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ login: 'admin', password: 'admin123' });

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
    token = res.body.token;
  });

  test('access /auth/me with token', async () => {
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.login).toBe('admin');
  });

  test('logout', async () => {
    const res = await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(204);
  });

  test('access /auth/me without token -> 401', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.statusCode).toBe(401);
  });
});
