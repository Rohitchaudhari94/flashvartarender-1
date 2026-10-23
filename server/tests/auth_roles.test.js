const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const seedAdmin = require('../utils/seedAdmin');

// Set up express test app
const app = express();
app.use(express.json());
app.use('/api/auth', require('../routes/auth'));
app.use('/api/news', require('../routes/news'));
app.use('/api/admin', require('../routes/admin'));

let server;
let baseUrl;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(body);
          } catch {
            json = body;
          }
          resolve({ status: res.statusCode, body: json });
        });
      }
    );
    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('\n=============================================');
  console.log('   FLASHVARTA AUTH & ROLE SECURITY TESTS');
  console.log('=============================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    await connectDB();
    await seedAdmin();

    // Start ephemeral server
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        console.log(`Test server started on port ${port}\n`);
        resolve();
      });
    });

    // TEST 1: Primary admin login with loginIdentifier 'admin@123'
    console.log('Testing Primary Admin Login...');
    const adminLoginRes = await request('/api/auth/login', {
      method: 'POST',
      body: {
        identifier: 'admin@123',
        password: process.env.PRIMARY_ADMIN_PASSWORD || 'Admin@FlashVarta2026!',
      },
    });
    assert(adminLoginRes.status === 200, 'Primary Admin logs in successfully using identifier "admin@123"');
    assert(adminLoginRes.body.user.role === 'primary_admin', 'Primary Admin role is "primary_admin"');
    assert(adminLoginRes.body.user.loginIdentifier === 'admin@123', 'Primary Admin loginIdentifier is "admin@123"');
    assert(Boolean(adminLoginRes.body.token), 'JWT token returned on Primary Admin login');
    const primaryAdminToken = adminLoginRes.body.token;
    const primaryAdminId = adminLoginRes.body.user.id;

    // TEST 2: Primary admin login with email
    const emailLoginRes = await request('/api/auth/login', {
      method: 'POST',
      body: {
        identifier: 'admin@flashvarta.com',
        password: process.env.PRIMARY_ADMIN_PASSWORD || 'Admin@FlashVarta2026!',
      },
    });
    assert(emailLoginRes.status === 200, 'Primary Admin can also log in using official email');

    // TEST 3: Public registration strictly assigns 'user' role even if client submits role: 'admin'
    console.log('\nTesting Public Registration & Role Enforcement...');
    const testUserEmail = `testuser_${Date.now()}@example.com`;
    const regRes = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Regular Test Reader',
        email: testUserEmail,
        password: 'Password123!',
        role: 'primary_admin', // Malicious attempt to elevate role
      },
    });
    assert(regRes.status === 201, 'Public user registration succeeds');
    assert(regRes.body.user.role === 'user', 'Public registration forces "user" role, ignoring client injection');
    const userToken = regRes.body.token;
    const testUserId = regRes.body.user.id;

    // TEST 4: Regular user cannot access admin APIs
    console.log('\nTesting Regular User Access Restrictions...');
    const userStatsRes = await request('/api/admin/stats', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(userStatsRes.status === 403, 'Regular user denied access to GET /api/admin/stats (403)');

    const userUsersRes = await request('/api/admin/users', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(userUsersRes.status === 403, 'Regular user denied access to GET /api/admin/users (403)');

    const userCreateNewsRes = await request('/api/news', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: { title: 'Unauthorized news', description: 'Testing' },
    });
    assert(userCreateNewsRes.status === 403, 'Regular user denied article publishing on POST /api/news (403)');

    // TEST 5: Create a secondary admin account for testing secondary admin boundaries
    console.log('\nTesting Role Elevation & Secondary Admin Boundaries...');
    const secondaryAdminEmail = `secondary_${Date.now()}@example.com`;
    const secRegRes = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Secondary Admin Candidate',
        email: secondaryAdminEmail,
        password: 'Password123!',
      },
    });
    const secondaryUserId = secRegRes.body.user.id;

    // Primary admin promotes candidate to admin
    const promoteRes = await request(`/api/admin/users/${secondaryUserId}/role`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${primaryAdminToken}` },
      body: { role: 'admin' },
    });
    assert(promoteRes.status === 200, 'Primary Admin successfully promotes user to "admin"');
    assert(promoteRes.body.user.role === 'admin', 'Promoted user role updated to "admin" in database');

    // Login as secondary admin
    const secLoginRes = await request('/api/auth/login', {
      method: 'POST',
      body: { identifier: secondaryAdminEmail, password: 'Password123!' },
    });
    const secondaryAdminToken = secLoginRes.body.token;

    // Secondary admin CAN view stats and users
    const secStatsRes = await request('/api/admin/stats', {
      headers: { Authorization: `Bearer ${secondaryAdminToken}` },
    });
    assert(secStatsRes.status === 200, 'Secondary admin can view dashboard statistics');

    // Secondary admin CANNOT promote other users
    const secTryPromoteRes = await request(`/api/admin/users/${testUserId}/role`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${secondaryAdminToken}` },
      body: { role: 'admin' },
    });
    assert(secTryPromoteRes.status === 403, 'Secondary admin denied from promoting users (403)');

    // Secondary admin CANNOT demote or delete Primary Admin
    const secTryDemoteAdmin = await request(`/api/admin/users/${primaryAdminId}/role`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${secondaryAdminToken}` },
      body: { role: 'user' },
    });
    assert(secTryDemoteAdmin.status === 403, 'Secondary admin blocked from demoting Primary Admin (403)');

    // Primary Admin CANNOT be demoted even by Primary Admin self-action
    const selfDemoteRes = await request(`/api/admin/users/${primaryAdminId}/role`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${primaryAdminToken}` },
      body: { role: 'user' },
    });
    assert(selfDemoteRes.status === 403 || selfDemoteRes.status === 400, 'Primary Admin is protected from demotion');

    // Primary Admin CANNOT be deleted
    const deletePrimaryRes = await request(`/api/admin/users/${primaryAdminId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${primaryAdminToken}` },
    });
    assert(deletePrimaryRes.status === 403 || deletePrimaryRes.status === 400, 'Primary Admin is protected from deletion');

    // TEST 6: User Deactivation and Session Invalidation
    console.log('\nTesting Account Deactivation & Session Invalidation...');
    const deactivateRes = await request(`/api/admin/users/${testUserId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${primaryAdminToken}` },
      body: { isActive: false },
    });
    assert(deactivateRes.status === 200, 'Primary Admin deactivates regular user account');

    // Deactivated user cannot log in
    const deactLoginRes = await request('/api/auth/login', {
      method: 'POST',
      body: { identifier: testUserEmail, password: 'Password123!' },
    });
    assert(deactLoginRes.status === 403, 'Deactivated user blocked from logging in (403)');

    // Existing token of deactivated user is immediately rejected
    const deactTokenRes = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(deactTokenRes.status === 403, 'Existing session token of deactivated user is immediately rejected (403)');

    // TEST 7: Audit Log Verification
    console.log('\nTesting Audit Trail...');
    const auditLogsRes = await request('/api/admin/audit-logs', {
      headers: { Authorization: `Bearer ${primaryAdminToken}` },
    });
    assert(auditLogsRes.status === 200, 'Primary Admin can retrieve administrative audit logs');
    assert(Array.isArray(auditLogsRes.body.logs) && auditLogsRes.body.logs.length > 0, 'Audit logs recorded administrative operations');
    const actions = auditLogsRes.body.logs.map((l) => l.action);
    assert(actions.includes('MAKE_ADMIN'), 'Audit log contains MAKE_ADMIN entry');
    assert(actions.includes('DEACTIVATE_USER'), 'Audit log contains DEACTIVATE_USER entry');

    // Clean up test accounts
    await User.findByIdAndDelete(testUserId);
    await User.findByIdAndDelete(secondaryUserId);

    console.log(`\n=============================================`);
    console.log(`   ALL TESTS PASSED (${passed}/${total})`);
    console.log(`=============================================\n`);
  } finally {
    if (server) {
      server.close();
    }
    await mongoose.connection.close();
  }
}

runTests().catch((err) => {
  console.error('\nTests failed with error:', err);
  process.exit(1);
});
