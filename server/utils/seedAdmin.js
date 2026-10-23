const User = require('../models/User');

/**
 * Creates or updates the single predefined Primary Administrator account.
 * Uses environment variables:
 * - PRIMARY_ADMIN_IDENTIFIER (e.g. admin@123)
 * - PRIMARY_ADMIN_EMAIL (e.g. admin@flashvarta.com)
 * - PRIMARY_ADMIN_PASSWORD (strong password stored as bcrypt hash in DB)
 * - PRIMARY_ADMIN_NAME (e.g. Rohit Chaudhari (Primary Admin))
 */
module.exports = async function seedAdmin() {
  const identifier = (process.env.PRIMARY_ADMIN_IDENTIFIER || 'admin@123').trim().toLowerCase();
  const email = (process.env.PRIMARY_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin@flashvarta.com')
    .trim()
    .toLowerCase();
  const password = process.env.PRIMARY_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'Admin@FlashVarta2026!';
  const name = process.env.PRIMARY_ADMIN_NAME || process.env.ADMIN_NAME || 'Rohit Chaudhari (Primary Admin)';

  try {
    // 1. Look for account with matching configured email
    let userByEmail = await User.findOne({ email }).select('+password');
    // 2. Look for account with matching loginIdentifier
    let userByIdentifier = await User.findOne({ loginIdentifier: identifier }).select('+password');
    // 3. Look for account that had identifier as its email (e.g. email: 'admin@123')
    let userByOldEmail = await User.findOne({ email: identifier }).select('+password');

    // If there were separate legacy records, clean up duplicate placeholder accounts
    if (userByEmail && userByIdentifier && String(userByEmail._id) !== String(userByIdentifier._id)) {
      await User.findByIdAndDelete(userByIdentifier._id);
    }
    if (userByEmail && userByOldEmail && String(userByEmail._id) !== String(userByOldEmail._id)) {
      await User.findByIdAndDelete(userByOldEmail._id);
    }

    let primaryAdmin = userByEmail || userByIdentifier || userByOldEmail;

    if (primaryAdmin) {
      primaryAdmin.name = name;
      primaryAdmin.email = email;
      primaryAdmin.loginIdentifier = identifier;
      primaryAdmin.role = 'primary_admin';
      primaryAdmin.isActive = true;

      // Check and update password hash if changed
      const matches = await primaryAdmin.matchPassword(password);
      if (!matches) {
        primaryAdmin.password = password; // Trigger pre('save') bcrypt hash
      }

      await primaryAdmin.save();
      console.log(`[Primary Admin] Verified and updated primary admin: identifier=${identifier}, email=${email}`);
    } else {
      primaryAdmin = await User.create({
        name,
        email,
        loginIdentifier: identifier,
        password,
        role: 'primary_admin',
        isActive: true,
      });
      console.log(`[Primary Admin] Created initial primary admin: identifier=${identifier}, email=${email}`);
    }

    // Ensure NO other account holds the 'primary_admin' role (strictly single primary admin)
    await User.updateMany(
      { _id: { $ne: primaryAdmin._id }, role: 'primary_admin' },
      { role: 'admin' }
    );

    return primaryAdmin;
  } catch (err) {
    console.error('[Primary Admin] Error seeding Primary Administrator:', err.message);
    throw err;
  }
};
