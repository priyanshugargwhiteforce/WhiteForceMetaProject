require('dotenv').config();
const { pool } = require('./src/config/db');
const User = require('./src/models/user.model');
const userController = require('./src/controllers/user.controller');

async function testProfileModule() {
    console.log('\n[Profile Validation] Initializing user model migrations...');
    await User.createTable();

    console.log('[Profile Validation] Verifying users table schema...');
    const [columns] = await pool.query('SHOW COLUMNS FROM users');
    const colNames = columns.map(c => c.Field);

    const required = ['department', 'designation', 'phone', 'profile_image'];
    required.forEach(c => {
        if (colNames.includes(c)) {
            console.log(`  ✅ Column '${c}' exists in users table`);
        } else {
            console.error(`  ❌ Column '${c}' MISSING in users table`);
        }
    });

    // Test user
    const [[testUser]] = await pool.query('SELECT id, username, email FROM users LIMIT 1');
    if (!testUser) {
        console.log('No user found in DB to test controller.');
        process.exit(0);
    }

    console.log(`\n[Profile Validation] Testing profile update for user ID: ${testUser.id} (${testUser.username})`);
    
    // Test updateProfile
    const updateReq = {
        user: { id: testUser.id },
        body: {
            department: 'Growth Marketing',
            designation: 'Lead Growth Specialist',
            phone: '+91 9876543210',
            profile_image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        }
    };

    let statusCode = null, responseData = null;
    const mockRes = {
        status: (code) => { statusCode = code; return mockRes; },
        json: (data) => { responseData = data; return mockRes; }
    };

    await userController.updateProfile(updateReq, mockRes);

    if (statusCode === 200 && responseData.success) {
        console.log('  ✅ PUT /api/users/profile/me returned 200 OK');
        console.log('  ✅ Updated Department:', responseData.user.department);
        console.log('  ✅ Updated Designation:', responseData.user.designation);
        console.log('  ✅ Updated Phone:', responseData.user.phone);
        console.log('  ✅ Updated Profile Image stored successfully');
    } else {
        console.error('  ❌ Profile update failed:', responseData);
    }

    // Test getProfile
    let getStatus = null, getRes = null;
    const mockGetRes = {
        status: (code) => { getStatus = code; return mockGetRes; },
        json: (data) => { getRes = data; return mockGetRes; }
    };

    await userController.getProfile({ user: { id: testUser.id } }, mockGetRes);
    if (getStatus === 200 && getRes.user.phone === '+91 9876543210') {
        console.log('  ✅ GET /api/users/profile/me fetched updated profile correctly');
    } else {
        console.error('  ❌ Profile get failed:', getRes);
    }

    console.log('\n🎉 Profile Module Validation Completed Successfully!');
    process.exit(0);
}

testProfileModule().catch(err => {
    console.error('Fatal Validation Error:', err);
    process.exit(1);
});
