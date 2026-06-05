const { connectDB, pool } = require('../config/db');
const User = require('../models/user.model');
const userController = require('../controllers/user.controller');

// Mock request-response helper
const mockCall = async (controllerFn, reqOpts = {}) => {
    const req = {
        user: reqOpts.user || {},
        body: reqOpts.body || {},
        params: reqOpts.params || {},
        query: reqOpts.query || {}
    };

    let responseCode = 200;
    let responseBody = null;

    const res = {
        status(code) {
            responseCode = code;
            return this;
        },
        json(data) {
            responseBody = data;
            return this;
        }
    };

    await controllerFn(req, res);
    return { status: responseCode, body: responseBody };
};

const runValidation = async () => {
    console.log('--- START HIERARCHY VALIDATION TESTS ---');
    await connectDB();

    let manager1Id = null;
    let manager2Id = null;
    let teamUser1Id = null;
    let otherUserId = null;

    try {
        // Clean up any old validation test records
        await pool.query("DELETE FROM users WHERE username IN ('mgr_val_1', 'mgr_val_2', 'team_usr_1', 'other_usr')");

        // 1. Create two test managers
        console.log('Creating Test Manager 1...');
        manager1Id = await User.create({
            username: 'mgr_val_1',
            email: 'mgr_1@val.com',
            password: 'password123',
            role: 'manager',
            status: 'active'
        });

        console.log('Creating Test Manager 2...');
        manager2Id = await User.create({
            username: 'mgr_val_2',
            email: 'mgr_2@val.com',
            password: 'password123',
            role: 'manager',
            status: 'active'
        });

        const mockManager1 = { id: manager1Id, role: 'manager' };
        const mockManager2 = { id: manager2Id, role: 'manager' };

        // Test A: Manager registers standard user -> should succeed and auto-assign manager_id
        console.log('\nTest A: Manager 1 creates a user...');
        const createResult = await mockCall(userController.createUser, {
            user: mockManager1,
            body: {
                username: 'team_usr_1',
                email: 'team_usr_1@val.com',
                password: 'password123',
                role: 'user'
            }
        });

        if (createResult.status !== 201 || !createResult.body.success) {
            throw new Error(`Test A Failed: Expected 201 but got ${createResult.status} with message: ${JSON.stringify(createResult.body)}`);
        }

        teamUser1Id = createResult.body.user.id;
        console.log(`✓ Test A Passed: User created with ID: ${teamUser1Id}`);

        // Verify manager_id was auto-assigned to Manager 1
        const createdUser = await User.findById(teamUser1Id);
        if (createdUser.manager_id !== manager1Id) {
            throw new Error(`Test A Verification Failed: Expected manager_id = ${manager1Id} but got ${createdUser.manager_id}`);
        }
        console.log('✓ Test A Verification Passed: manager_id correctly mapped to registering Manager.');

        // Test B: Manager registers an Admin or Manager -> should fail with 403
        console.log('\nTest B: Manager 1 attempts to create a manager role...');
        const failCreateResult = await mockCall(userController.createUser, {
            user: mockManager1,
            body: {
                username: 'other_usr',
                email: 'other_usr@val.com',
                password: 'password123',
                role: 'manager'
            }
        });

        if (failCreateResult.status !== 403) {
            throw new Error(`Test B Failed: Expected 403 Forbidden but got ${failCreateResult.status}`);
        }
        console.log('✓ Test B Passed: Manager blocked from creating administrative roles.');

        // Admin registers other user under Manager 2 for testing boundaries
        otherUserId = await User.create({
            username: 'other_usr',
            email: 'other_usr@val.com',
            password: 'password123',
            role: 'user',
            status: 'active',
            manager_id: manager2Id
        });

        // Test C: Manager 1 edits team user -> should succeed
        console.log('\nTest C: Manager 1 updates their team user status...');
        const updateResult = await mockCall(userController.updateUser, {
            user: mockManager1,
            params: { id: teamUser1Id },
            body: { status: 'hold' }
        });

        if (updateResult.status !== 200 || !updateResult.body.success) {
            throw new Error(`Test C Failed: Expected 200 but got ${updateResult.status}`);
        }
        console.log('✓ Test C Passed: Manager updated their own team user.');

        // Test D: Manager 1 edits user NOT on their team -> should fail with 403
        console.log('\nTest D: Manager 1 attempts to update a user belonging to Manager 2...');
        const failUpdateResult = await mockCall(userController.updateUser, {
            user: mockManager1,
            params: { id: otherUserId },
            body: { status: 'hold' }
        });

        if (failUpdateResult.status !== 403) {
            throw new Error(`Test D Failed: Expected 403 Forbidden but got ${failUpdateResult.status}`);
        }
        console.log('✓ Test D Passed: Manager blocked from editing users outside their team.');

        // Test E: Manager 1 deletes user NOT on their team -> should fail with 403
        console.log('\nTest E: Manager 1 attempts to delete a user belonging to Manager 2...');
        const failDeleteResult = await mockCall(userController.deleteUser, {
            user: mockManager1,
            params: { id: otherUserId }
        });

        if (failDeleteResult.status !== 403) {
            throw new Error(`Test E Failed: Expected 403 Forbidden but got ${failDeleteResult.status}`);
        }
        console.log('✓ Test E Passed: Manager blocked from deleting users outside their team.');

        // Test F: Manager 1 deletes team user -> should succeed
        console.log('\nTest F: Manager 1 deletes their team user...');
        const deleteResult = await mockCall(userController.deleteUser, {
            user: mockManager1,
            params: { id: teamUser1Id }
        });

        if (deleteResult.status !== 200 || !deleteResult.body.success) {
            throw new Error(`Test F Failed: Expected 200 but got ${deleteResult.status}`);
        }
        console.log('✓ Test F Passed: Manager successfully deleted their team user.');
        teamUser1Id = null; // Cleared

    } catch (err) {
        console.error('\n❌ Validation Test Failed:', err.message);
        process.exitCode = 1;
    } finally {
        console.log('\nCleaning up validation data...');
        if (teamUser1Id) await User.delete(teamUser1Id);
        if (otherUserId) await User.delete(otherUserId);
        if (manager1Id) await User.delete(manager1Id);
        if (manager2Id) await User.delete(manager2Id);
        console.log('✓ Cleanup completed.');
        console.log('--- END HIERARCHY VALIDATION TESTS ---');
        pool.end();
    }
};

runValidation();
