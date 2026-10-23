const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const ContactMessage = require('../models/ContactMessage');
const seedAdmin = require('../utils/seedAdmin');

const app = express();
app.use(express.json());
app.use('/api/auth', require('../routes/auth'));
app.use('/api/news', require('../routes/news'));
app.use('/api/admin', require('../routes/admin'));
app.use('/api/contact', require('../routes/contact'));

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
  console.log('   FLASHVARTA CONTACT MESSAGES & SECURITY TESTS');
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

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        console.log(`Test server started on port ${port}\n`);
        resolve();
      });
    });

    // Clean up past test messages
    await ContactMessage.deleteMany({ email: /@test-fv-contact\.com$/i });

    // 1. Authenticate Admin
    console.log('1. Admin Authentication...');
    const adminLogin = await request('/api/auth/login', {
      method: 'POST',
      body: {
        identifier: 'admin@123',
        password: process.env.PRIMARY_ADMIN_PASSWORD || 'Admin@FlashVarta2026!',
      },
    });
    assert(adminLogin.status === 200, 'Admin successfully logs in');
    const adminToken = adminLogin.body.token;

    // Verify admin login response DOES NOT expose password or hash
    assert(!adminLogin.body.user.password, 'Admin login response contains NO password');
    assert(JSON.stringify(adminLogin.body).indexOf('$2a$') === -1, 'Admin login response contains NO bcrypt hash');

    // 2. Register Regular Reader User
    console.log('\n2. Regular User Setup & Security Checks...');
    const readerEmail = `reader_${Date.now()}@test-fv-contact.com`;
    const regRes = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Regular Reader',
        email: readerEmail,
        password: 'Password123!',
      },
    });
    assert(regRes.status === 201, 'Regular user registered');
    const userToken = regRes.body.token;
    assert(!regRes.body.user.password, 'Registration response contains NO password');
    assert(JSON.stringify(regRes.body).indexOf('$2a$') === -1, 'Registration response contains NO bcrypt hash');

    // Verify /api/auth/me has no password
    const meRes = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(meRes.status === 200, 'User profile retrieved');
    assert(!meRes.body.user.password, 'User profile response contains NO password');
    assert(JSON.stringify(meRes.body).indexOf('$2a$') === -1, 'User profile response contains NO bcrypt hash');

    // 3. Contact Message Validation on POST /api/contact
    console.log('\n3. Public Message Submission Validation...');
    const emptySub = await request('/api/contact', {
      method: 'POST',
      body: {},
    });
    assert(emptySub.status === 400, 'Submitting empty contact form rejected with 400');

    const invalidEmail = await request('/api/contact', {
      method: 'POST',
      body: {
        name: 'Rohit Fan',
        email: 'not-an-email',
        subject: 'Inquiry',
        message: 'This is a long enough message for testing.',
      },
    });
    assert(invalidEmail.status === 400, 'Invalid email format rejected with 400');

    // 4. Honeypot Spam Protection
    console.log('\n4. Spam Protection (Honeypot)...');
    const botSubmission = await request('/api/contact', {
      method: 'POST',
      body: {
        name: 'Bot Spammer',
        email: 'bot@spam.com',
        subject: 'Spam Subject',
        message: 'Buy cheap watches now at this link http://spam.xyz',
        hp_website: 'http://spam.xyz', // Bot fills invisible trap field
      },
    });
    assert(botSubmission.status === 200, 'Honeypot submission silently absorbed');
    const botInDb = await ContactMessage.findOne({ email: 'bot@spam.com' });
    assert(!botInDb, 'Spam message was NOT saved to MongoDB');

    // 5. Valid Message Submission & XSS Sanitization
    console.log('\n5. Valid Message Submission & XSS Protection...');
    const validMessage = {
      name: 'Aditi Sharma',
      email: 'aditi@test-fv-contact.com',
      subject: 'News Tip regarding Pune Tech Park',
      message: 'Hello Rohit,\n\nWe have a ground report on the upcoming semiconductor cluster.<script>alert("xss")</script>',
    };
    const submitRes = await request('/api/contact', {
      method: 'POST',
      body: validMessage,
    });
    assert(submitRes.status === 201, 'Valid contact message accepted with 201');
    assert(submitRes.body.success === true, 'Success flag returned');
    assert(Boolean(submitRes.body.id), 'Created message ID returned');

    // Verify MongoDB storage & XSS sanitization
    const savedMsg = await ContactMessage.findById(submitRes.body.id);
    assert(Boolean(savedMsg), 'Message found in MongoDB');
    assert(savedMsg.name === 'Aditi Sharma', 'Name matches in database');
    assert(savedMsg.email === 'aditi@test-fv-contact.com', 'Email matches in database');
    assert(savedMsg.isRead === false, 'Message defaults to isRead: false');
    assert(!savedMsg.message.includes('<script>'), 'XSS script tags stripped by sanitizer');

    // Submit a 2nd message
    const msg2 = await request('/api/contact', {
      method: 'POST',
      body: {
        name: 'Suresh Patil',
        email: 'suresh@test-fv-contact.com',
        subject: 'Collaboration with Marathi Rohit YouTube channel',
        message: 'Namaskar Rohit ji, would love to discuss a documentary collaboration on Maharashtra history.',
      },
    });
    assert(msg2.status === 201, 'Second message submitted successfully');

    // 6. Access Control: Public & Regular User Restricted
    console.log('\n6. Administrative Access Control Verification...');
    const guestAdminReq = await request('/api/contact/admin/messages');
    assert(guestAdminReq.status === 401, 'Unauthenticated visitor blocked from admin messages (401)');

    const readerAdminReq = await request('/api/contact/admin/messages', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(readerAdminReq.status === 403, 'Regular reader blocked from admin messages (403)');

    // 7. Admin Queries: List, Search, Filter, Sort, Pagination
    console.log('\n7. Admin Messages Management (List, Search, Filter, Pagination)...');
    const adminListRes = await request('/api/contact/admin/messages', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminListRes.status === 200, 'Admin retrieves messages list');
    assert(Array.isArray(adminListRes.body.messages), 'Messages returned as an array');
    assert(typeof adminListRes.body.total === 'number', 'Total count returned');
    assert(typeof adminListRes.body.stats.unread === 'number', 'Unread stats returned');
    assert(typeof adminListRes.body.stats.read === 'number', 'Read stats returned');

    // Search by sender name
    const searchRes = await request('/api/contact/admin/messages?search=Aditi', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(searchRes.status === 200, 'Search query executed successfully');
    assert(searchRes.body.messages.some((m) => m.name === 'Aditi Sharma'), 'Search returns matching message for Aditi');

    // Filter by unread
    const unreadRes = await request('/api/contact/admin/messages?status=unread', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(unreadRes.status === 200, 'Unread filter query executed');
    assert(unreadRes.body.messages.every((m) => m.isRead === false), 'All returned messages have isRead: false');

    // 8. View Single Message
    console.log('\n8. Single Message Retrieval & Read Status Toggle...');
    const singleMsgRes = await request(`/api/contact/admin/messages/${savedMsg._id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(singleMsgRes.status === 200, 'Single message retrieved by ID');
    assert(singleMsgRes.body.message.subject === 'News Tip regarding Pune Tech Park', 'Subject matches in details');

    // Mark as Read via PATCH
    const markReadRes = await request(`/api/contact/admin/messages/${savedMsg._id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { isRead: true },
    });
    assert(markReadRes.status === 200, 'PATCH read status succeeds');
    assert(markReadRes.body.message.isRead === true, 'Message marked as read');

    // Mark back to Unread
    const markUnreadRes = await request(`/api/contact/admin/messages/${savedMsg._id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { isRead: false },
    });
    assert(markUnreadRes.status === 200, 'PATCH unread status succeeds');
    assert(markUnreadRes.body.message.isRead === false, 'Message marked back as unread');

    // 9. Delete Message
    console.log('\n9. Message Deletion...');
    const delRes = await request(`/api/contact/admin/messages/${savedMsg._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(delRes.status === 200, 'Delete message succeeds');
    const afterDelete = await ContactMessage.findById(savedMsg._id);
    assert(!afterDelete, 'Deleted message removed from MongoDB');

    // 10. Clean up remaining test data
    await ContactMessage.deleteMany({ email: /@test-fv-contact\.com$/i });
    await User.deleteOne({ email: readerEmail });

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
