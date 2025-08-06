import bcrypt from 'bcrypt';

/**
 * Seeder: Create default users (admin, moderator, user)
 */

const defaultUsers = [
    {
        email: 'admin@alumni.com',
        password: '107Rahat_Hello',
        name: 'System Administrator',
        roles: ['user', 'admin'],
        status: 'active',
        alumni_type: 'management',
        branch: 'Jamalkhan',
        phone: '+8801712345678',
        location: 'Chittagong, Bangladesh',
        blood_group: 'A+',
        joinedYear: 2000,
        isGraduated: true,
        graduation_year: 2005,
        provider: 'email',
        isProfileCompleted: true,
        isEmailVerified: true
    },
    {
        email: 'moderator@alumni.com',
        password: '107Rahat_Hello',
        name: 'System Moderator',
        roles: ['user', 'moderator'],
        status: 'active',
        alumni_type: 'teacher',
        branch: 'Patiya',
        phone: '+8801812345678',
        location: 'Chittagong, Bangladesh',
        blood_group: 'B+',
        joinedYear: 2005,
        isGraduated: true,
        graduation_year: 2010,
        provider: 'email',
        isProfileCompleted: true,
        isEmailVerified: true
    },
    {
        email: 'user@gmail.com',
        password: '107Rahat_Hello',
        name: 'Test User',
        roles: ['user'],
        status: 'active',
        alumni_type: 'student',
        branch: 'Jamalkhan',
        phone: '+8801912345678',
        location: 'Chittagong, Bangladesh',
        blood_group: 'O+',
        batch: '15',
        joinedYear: 2010,
        isGraduated: true,
        graduation_year: 2015,
        provider: 'email',
        isProfileCompleted: true,
        isEmailVerified: true
    }
];

export const seed = async (dataSource) => {
    // Get repository using TypeORM DataSource
    const userRepository = dataSource.getRepository('User');

    console.log('🌱 Seeding default users...');

    let createdCount = 0;
    let skippedCount = 0;

    for (const userData of defaultUsers) {
        try {
            // Check if user already exists
            const existingUser = await userRepository.findOne({
                where: { email: userData.email }
            });

            if (existingUser) {
                console.log(`ℹ️ User ${userData.email} already exists, skipping...`);
                skippedCount++;
                continue;
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(userData.password, 12);

            // Create user with TypeORM
            const user = userRepository.create({
                ...userData,
                password: hashedPassword
            });

            await userRepository.save(user);
            console.log(`✅ Created user: ${userData.email} with roles: ${userData.roles.join(', ')}`);
            createdCount++;

        } catch (error) {
            console.error(`❌ Error creating user ${userData.email}:`, error.message);
        }
    }

    console.log(`🌱 Default users seeding completed! Created: ${createdCount}, Skipped: ${skippedCount}`);
};

export const seederInfo = {
    name: '001_default_users',
    description: 'Create default admin, moderator, and user accounts',
    version: '1.0.0'
};
