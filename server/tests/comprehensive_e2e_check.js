require('dotenv').config();
const http = require('http');

const API_BASE = 'http://localhost:5000/api';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE}${path}`);
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

function assert(condition, message) {
  if (!condition) {
    console.error(`  [FAIL] ${message}`);
    throw new Error(message);
  }
  console.log(`  [PASS] ${message}`);
}

async function run() {
  console.log('\n======================================================');
  console.log('   FLASHVARTA COMPREHENSIVE DELIVERABLES VERIFICATION');
  console.log('======================================================\n');

  // 1. Health check
  console.log('1. Server Health Check...');
  const health = await request('/health');
  assert(health.status === 200, 'Server responds on /api/health with 200');
  assert(health.body.app === 'FlashVarta', 'App identifier is FlashVarta');

  // 2. Public Contact Message Submission
  console.log('\n2. Testing Public Contact Message Submission...');
  const testSender = {
    name: 'Pooja Kulkarni',
    email: 'pooja.kulkarni@example.com',
    subject: 'Feedback on Mobile App & Coverage',
    message: 'Hello FlashVarta Editorial Desk, the new responsive mobile layout looks crisp and clean! Great work on Maharashtra stories.',
  };

  const submitRes = await request('/contact', {
    method: 'POST',
    body: testSender,
  });

  assert(submitRes.status === 201, 'Public visitor can submit contact message (201 Created)');
  assert(submitRes.body.success === true, 'Response contains success: true');
  assert(Boolean(submitRes.body.id), 'Response returns created message ID');
  const messageId = submitRes.body.id;

  // 3. Security Check: Public Visitors Cannot Access Admin Messages
  console.log('\n3. Security Check: Unauthenticated Visitors Blocked...');
  const unauthRes = await request('/contact/admin/messages');
  assert(unauthRes.status === 401, 'Unauthenticated visitor rejected with 401 Unauthorized');

  // 4. Admin Authentication & Password Non-Exposure Verification
  console.log('\n4. Admin Authentication & Password Non-Exposure Verification...');
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: {
      identifier: 'admin@123',
      password: process.env.PRIMARY_ADMIN_PASSWORD || 'Admin@FlashVarta2026!',
    },
  });

  assert(loginRes.status === 200, 'Primary Admin logs in successfully');
  assert(Boolean(loginRes.body.token), 'JWT token issued');
  assert(loginRes.body.user.role === 'primary_admin', 'Role is primary_admin');
  assert(loginRes.body.user.password === undefined, 'No password field in login user object');
  assert(!JSON.stringify(loginRes.body).includes('$2a$'), 'No bcrypt hash exposed in login response');
  assert(!JSON.stringify(loginRes.body).includes('$2b$'), 'No bcrypt hash exposed in login response');

  const adminToken = loginRes.body.token;
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  // 5. Admin Retrieves Messages List & Statistics
  console.log('\n5. Admin Messages Management System...');
  const messagesListRes = await request('/contact/admin/messages', {
    headers: adminHeaders,
  });

  assert(messagesListRes.status === 200, 'Admin can retrieve messages list (200 OK)');
  assert(Array.isArray(messagesListRes.body.messages), 'Messages returned as an array');
  assert(messagesListRes.body.total >= 1, `Total messages count >= 1 (found ${messagesListRes.body.total})`);
  assert(messagesListRes.body.stats !== undefined, 'Stats object included in response');
  assert(messagesListRes.body.stats.unread >= 1, `Unread count >= 1 (found ${messagesListRes.body.stats.unread})`);

  const foundMessage = messagesListRes.body.messages.find((m) => m._id === messageId);
  assert(Boolean(foundMessage), 'Submitted message by Pooja Kulkarni is found in Admin list');
  assert(foundMessage.name === testSender.name, 'Sender name matches Pooja Kulkarni');
  assert(foundMessage.email === testSender.email, 'Sender email matches pooja.kulkarni@example.com');
  assert(foundMessage.subject === testSender.subject, 'Subject matches');
  assert(foundMessage.isRead === false, 'Message defaults to isRead: false');

  // 6. View Individual Message Details
  console.log('\n6. Single Message Details Retrieval...');
  const singleMsgRes = await request(`/contact/admin/messages/${messageId}`, {
    headers: adminHeaders,
  });
  assert(singleMsgRes.status === 200, 'Admin can view single message details');
  assert(singleMsgRes.body.message.message === testSender.message, 'Full message content retrieved correctly');

  // 7. Mark Message as Read & Verify Unread Count Updates
  console.log('\n7. Read/Unread Status Toggle & Counters...');
  const initialUnread = messagesListRes.body.stats.unread;
  const markReadRes = await request(`/contact/admin/messages/${messageId}/read`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: { isRead: true },
  });
  assert(markReadRes.status === 200, 'PATCH read status succeeds');
  assert(markReadRes.body.message.isRead === true, 'Message status changed to isRead: true');

  const afterReadList = await request('/contact/admin/messages', {
    headers: adminHeaders,
  });
  assert(afterReadList.body.stats.unread === initialUnread - 1, 'Unread counter decremented by 1 in dashboard stats');

  // Mark back to unread
  const markUnreadRes = await request(`/contact/admin/messages/${messageId}/read`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: { isRead: false },
  });
  assert(markUnreadRes.body.message.isRead === false, 'Message toggled back to isRead: false');

  // 8. Search Messages
  console.log('\n8. Message Search Functionality...');
  const searchRes = await request(`/contact/admin/messages?search=Pooja`, {
    headers: adminHeaders,
  });
  assert(searchRes.body.messages.some((m) => m.name.includes('Pooja')), 'Search by name "Pooja" returns matching message');

  const searchSubjRes = await request(`/contact/admin/messages?search=Mobile+App`, {
    headers: adminHeaders,
  });
  assert(searchSubjRes.body.messages.some((m) => m.subject.includes('Mobile App')), 'Search by subject keyword returns matching message');

  // 9. Filter Messages by Status
  console.log('\n9. Message Status Filtering...');
  const unreadFilterRes = await request(`/contact/admin/messages?status=unread`, {
    headers: adminHeaders,
  });
  assert(unreadFilterRes.body.messages.every((m) => m.isRead === false), 'status=unread returns exclusively unread messages');

  // 10. User Management Password Non-Exposure Verification
  console.log('\n10. User Management & Password Privacy Verification...');
  const usersRes = await request('/admin/users', {
    headers: adminHeaders,
  });
  assert(usersRes.status === 200, 'Admin can view user accounts list');
  for (const user of usersRes.body.users) {
    assert(user.password === undefined, `User "${user.name}" has NO password exposed in user management API`);
  }
  assert(!JSON.stringify(usersRes.body).includes('$2a$'), 'No bcrypt hash exposed in User Management list');
  assert(!JSON.stringify(usersRes.body).includes('$2b$'), 'No bcrypt hash exposed in User Management list');

  // 11. Delete Message
  console.log('\n11. Message Deletion...');
  const deleteRes = await request(`/contact/admin/messages/${messageId}`, {
    method: 'DELETE',
    headers: adminHeaders,
  });
  assert(deleteRes.status === 200, 'Admin can delete message');
  assert(deleteRes.body.success === true, 'Delete confirmation returned');

  const verifyDeleteRes = await request(`/contact/admin/messages/${messageId}`, {
    headers: adminHeaders,
  });
  assert(verifyDeleteRes.status === 404, 'Deleted message cannot be retrieved (404 Not Found)');

  console.log('\n======================================================');
  console.log('   ALL DELIVERABLES VERIFIED AND CONFIRMED PASSING!');
  console.log('======================================================\n');
}

run().catch((err) => {
  console.error('\nVerification failed:', err);
  process.exit(1);
});
