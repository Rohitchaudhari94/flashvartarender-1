# FlashVarta - Fast, Reliable & Independent News

A modern MERN-stack digital news platform created by **Rohit Chaudhari**. Readers explore breaking headlines from India, Maharashtra, and across the globe, while authorized editors and administrators publish original reporting directly from the FlashVarta news desk.

---

## ⚡ Tech Stack

- **Frontend:** React 18, Vite, React Router 6, Vanilla CSS design system (warm editorial aesthetic, dark mode support)
- **Backend:** Node.js, Express, Mongoose (MongoDB ODM)
- **Database:** MongoDB Atlas (with indexed schemas for Users, News, and AuditLogs)
- **Security:** bcrypt password hashing (12 rounds), JWT tokens, Helmet headers, Rate limiting, input sanitization, and strict server-side role validation

---

## 🔐 Role-Based Access Control (RBAC)

FlashVarta implements a 3-tier role hierarchy:

1. **👑 Primary Admin (`primary_admin`)**
   - Single predefined, protected account initialized via controlled seed script (`PRIMARY_ADMIN_IDENTIFIER=admin@123`).
   - Login identifier: `admin@123` (or configured admin email) with separate secure bcrypt password.
   - Protected from deletion, demotion, or deactivation.
   - Exclusive privileges: Promote eligible users to `admin`, demote secondary admins, deactivate/reactivate accounts, and permanently delete accounts.
   - Every administrative action is logged to the `AuditLog` collection.

2. **🛡️ Administrator (`admin`)**
   - Editorial desk privileges: Create, edit, publish, draft, and delete news articles.
   - View overview dashboard statistics and registered user directory.
   - Cannot promote users, demote/modify the Primary Admin, or delete user accounts.

3. **👤 Registered User / Reader (`user`)**
   - Public self-registration always assigns the `user` role on the server.
   - Read published articles in the feed and full article stories.
   - Strictly forbidden from accessing administrative APIs (returns HTTP 403).

---

## 📁 Project Structure

```
flashvarta/
├── package.json               # Root scripts (install-all, dev, build, start)
├── client/
│   ├── index.html             # HTML entry point with metadata
│   ├── vite.config.js         # Vite configuration with proxy to :5000
│   └── src/
│       ├── App.jsx            # Routing, Shell layout, and Route guards
│       ├── api.js             # Fetch wrapper with JWT headers and 401/403 handlers
│       ├── main.jsx           # React DOM root with AuthProvider
│       ├── styles.css         # Custom editorial CSS design system & tokens
│       ├── utils.js           # Categories, time formatting, greetings
│       ├── components/
│       │   ├── Footer.jsx     # 4-Column responsive footer with creator info
│       │   ├── Logo.jsx       # FlashVarta brand with lightning icon
│       │   ├── Navbar.jsx     # Sticky header with user profile & role badge
│       │   ├── NewsCard.jsx   # Article card with thumbnail and metadata
│       │   └── ProtectedRoute.jsx # Client route guards for authentication and admin
│       ├── context/
│       │   └── AuthContext.jsx # React auth state management
│       └── pages/
│           ├── About.jsx      # About FlashVarta and Creator Rohit Chaudhari
│           ├── Admin.jsx      # Tabbed Admin Desk (Overview, Articles, Users)
│           ├── Article.jsx    # Single article detail view
│           ├── AuthPage.jsx   # Split-screen Login / Registration with footer
│           ├── Contact.jsx    # Contact channels & contact form
│           ├── Home.jsx       # News feed with search, categories, and live articles
│           ├── Privacy.jsx    # Privacy policy page
│           └── Terms.jsx      # Terms & conditions page
└── server/
    ├── server.js              # Express app, security headers, database connection
    ├── config/
    │   └── db.js              # MongoDB Atlas connection
    ├── middleware/
    │   └── auth.js            # protect, optionalProtect, adminOnly, primaryAdminOnly
    ├── models/
    │   ├── User.js            # User schema with loginIdentifier & bcrypt pre-save
    │   ├── News.js            # News schema with categories, slug, & timestamps
    │   └── AuditLog.js        # Audit trail schema for administrative actions
    ├── routes/
    │   ├── auth.js            # /api/auth (register, login, logout, me)
    │   ├── news.js            # /api/news (feed, single story, admin CRUD)
    │   └── admin.js           # /api/admin (stats, news management, users, audit-logs)
    ├── scripts/
    │   └── seed.js            # Controlled standalone Primary Admin seed script
    ├── tests/
    │   └── auth_roles.test.js # Automated backend integration test suite (24 tests)
    └── utils/
        ├── categories.js      # Supported editorial & syndication categories
        ├── newsdata.js        # NewsData.io API integration with in-memory caching
        ├── sanitize.js        # XSS sanitization for editorial content
        └── seedAdmin.js       # Idempotent primary admin initialization logic
```

---

## ⚙️ Environment Variables

Create `server/.env` (or copy from `server/.env.example`):

```ini
PORT=5000

# MongoDB Atlas connection string (URL-encode special characters in password, e.g. @ -> %40)
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/flashvarta?retryWrites=true&w=majority&appName=Cluster0

# JWT token signing secret
JWT_SECRET=your_super_strong_random_secret_string_here
JWT_EXPIRES_IN=7d

# NewsData.io API Key for live external news syndication
NEWSDATA_API_KEY=pub_xxxxxxxxxxxxxxxxxxxxxxxx

# Primary Administrator Credentials
PRIMARY_ADMIN_IDENTIFIER=admin@123
PRIMARY_ADMIN_NAME=Rohit Chaudhari (Primary Admin)
PRIMARY_ADMIN_EMAIL=admin@flashvarta.com
PRIMARY_ADMIN_PASSWORD=Admin@FlashVarta2026!

# Allowed client origin for CORS
CLIENT_URL=http://localhost:5173
```

---

## 🚀 Local Development Quickstart

### 1. Install All Dependencies
```bash
# From the root directory:
npm run install-all
```

### 2. Initialize the Primary Administrator
```bash
# Run the controlled seed script to ensure the primary admin exists in MongoDB:
npm run seed:admin --prefix server
```

### 3. Run Automated Tests
```bash
# Runs the 24-point backend authentication and role security test suite:
npm test --prefix server
```

### 4. Start the Application
```bash
# Starts both Express API (:5000) and Vite React (:5173) concurrently:
npm run dev
```

Visit **http://localhost:5173** in your browser.

---

## 🔑 Administrator Credentials

| Field | Configuration | Default Value |
| ----- | ------------- | ------------- |
| **Login Identifier** | `PRIMARY_ADMIN_IDENTIFIER` | `admin@123` |
| **Admin Email** | `PRIMARY_ADMIN_EMAIL` | `admin@flashvarta.com` |
| **Admin Password** | `PRIMARY_ADMIN_PASSWORD` | `Admin@FlashVarta2026!` (bcrypt hashed) |

You can log in using either the identifier `admin@123` or `admin@flashvarta.com`.

---

## 📡 REST API Reference

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Public account registration (role strictly set to `user`).
- `POST /api/auth/login` - Login with email or `admin@123` identifier.
- `POST /api/auth/logout` - Logout.
- `GET /api/auth/me` - Authenticated user profile.

### News & Articles (`/api/news`)
- `GET /api/news` - Public published stories feed + live external headlines.
- `GET /api/news/:id` - Single published article details.
- `POST /api/news` - Create article (*Requires Admin*).
- `PUT /api/news/:id` - Edit article (*Requires Admin*).
- `PATCH /api/news/:id/status` - Toggle publish/draft (*Requires Admin*).
- `DELETE /api/news/:id` - Delete article (*Requires Admin*).

### Admin Desk (`/api/admin`)
- `GET /api/admin/stats` - Calculated counts for Articles, Drafts, Users, and Admins (*Requires Admin*).
- `GET /api/admin/news` - Desk article search and filtering (*Requires Admin*).
- `GET /api/admin/users` - Paginated user directory with search and role filters (*Requires Admin*).
- `PATCH /api/admin/users/:id/role` - Promote to Admin / Demote to User (*Primary Admin Only*).
- `PATCH /api/admin/users/:id/status` - Deactivate / Activate user (*Primary Admin Only*).
- `DELETE /api/admin/users/:id` - Permanently delete user (*Primary Admin Only*).
- `GET /api/admin/audit-logs` - Administrative audit log history (*Primary Admin Only*).

---

## ☁️ Production Deployment on AWS (Without Exposing Secrets)

### Recommended Architecture: AWS EC2 / Elastic Beanstalk / ECS + AWS Systems Manager Parameter Store

1. **Store Secrets in AWS Systems Manager (SSM) Parameter Store or AWS Secrets Manager:**
   - Store `MONGO_URI`, `JWT_SECRET`, `NEWSDATA_API_KEY`, and `PRIMARY_ADMIN_PASSWORD` as `SecureString` parameters (e.g. `/flashvarta/prod/MONGO_URI`).
   - Never commit `.env` or paste secrets into Git repositories.

2. **Build the Production Bundle:**
   ```bash
   npm run build
   ```
   This compiles the React SPA into `client/dist/`, which Express serves statically in production.

3. **Start the Production Server with PM2:**
   ```bash
   cd server
   NODE_ENV=production PORT=5000 node server.js
   ```
   Or using PM2 for automatic restarts:
   ```bash
   pm2 start server.js --name "flashvarta-api"
   ```

4. **Nginx Reverse Proxy & SSL (Certbot):**
   - Route incoming port 80/443 traffic to `http://localhost:5000`.
   - Install free SSL using Let's Encrypt:
     ```bash
     sudo certbot --nginx -d flashvarta.com -d www.flashvarta.com
     ```
"# FlashVarta" 
