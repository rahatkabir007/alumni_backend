/**
 * Seeder: Create default banners for the alumni system
 */

const defaultBanners = [
    {
        title: 'Welcome to Alumni Network',
        subtitle: 'Connect with your fellow graduates and build lasting relationships',
        image_url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&h=400&fit=crop',
        link_url: '/about',
        position: 1,
        is_active: true,
        banner_type: 'hero',
        description: 'Join thousands of alumni who are already part of our growing network. Share experiences, find opportunities, and give back to the community.',
        button_text: 'Learn More',
        background_color: '#1e40af',
        text_color: '#ffffff'
    },
    {
        title: 'Alumni Success Stories',
        subtitle: 'Discover inspiring journeys of our graduates',
        image_url: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200&h=400&fit=crop',
        link_url: '/stories',
        position: 2,
        is_active: true,
        banner_type: 'feature',
        description: 'Read about the achievements and career milestones of our distinguished alumni across various fields and industries.',
        button_text: 'Read Stories',
        background_color: '#059669',
        text_color: '#ffffff'
    },
    {
        title: 'Upcoming Alumni Events',
        subtitle: 'Join us for networking and reunion events',
        image_url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&h=400&fit=crop',
        link_url: '/events',
        position: 3,
        is_active: true,
        banner_type: 'event',
        description: 'Stay updated with the latest events, reunions, and networking opportunities. Connect with old friends and make new ones.',
        button_text: 'View Events',
        background_color: '#dc2626',
        text_color: '#ffffff'
    },
    {
        title: 'Career Opportunities',
        subtitle: 'Explore job openings shared by alumni',
        image_url: 'https://images.unsplash.com/photo-1486312338219-ce68e2c54b45?w=1200&h=400&fit=crop',
        link_url: '/jobs',
        position: 4,
        is_active: true,
        banner_type: 'opportunity',
        description: 'Find career opportunities posted by fellow alumni and companies within our network. Your next career move is just a click away.',
        button_text: 'Find Jobs',
        background_color: '#7c3aed',
        text_color: '#ffffff'
    },
    {
        title: 'Give Back to Your Alma Mater',
        subtitle: 'Support current students and future generations',
        image_url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&h=400&fit=crop',
        link_url: '/donate',
        position: 5,
        is_active: false, // Inactive by default
        banner_type: 'donation',
        description: 'Help shape the future by contributing to scholarships, infrastructure, and programs that benefit current and future students.',
        button_text: 'Contribute',
        background_color: '#ea580c',
        text_color: '#ffffff'
    }
];

export const seed = async (dataSource) => {
    // Get repository using TypeORM DataSource
    const bannerRepository = dataSource.getRepository('Banner');

    console.log('🌱 Seeding default banners...');

    let createdCount = 0;
    let skippedCount = 0;

    for (const bannerData of defaultBanners) {
        try {
            // Check if banner already exists by title
            const existingBanner = await bannerRepository.findOne({
                where: { title: bannerData.title }
            });

            if (existingBanner) {
                console.log(`ℹ️ Banner "${bannerData.title}" already exists, skipping...`);
                skippedCount++;
                continue;
            }

            // Create banner with TypeORM
            const banner = bannerRepository.create({
                ...bannerData,
                created_at: new Date(),
                updated_at: new Date()
            });

            await bannerRepository.save(banner);
            console.log(`✅ Created banner: "${bannerData.title}" (${bannerData.banner_type})`);
            createdCount++;

        } catch (error) {
            console.error(`❌ Error creating banner "${bannerData.title}":`, error.message);
        }
    }

    console.log(`🌱 Default banners seeding completed! Created: ${createdCount}, Skipped: ${skippedCount}`);
};

export const seederInfo = {
    name: '002_default_banners',
    description: 'Create default banners for hero sections, features, and events',
    version: '1.0.0'
};
