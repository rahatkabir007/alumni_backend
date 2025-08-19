/**
 * Migration: Fix comments table constraints and add polymorphic fields
 */

export const up = async (queryRunner) => {
    console.log('🔄 Fixing comments table constraints...');

    // Drop existing comments table if it exists (to avoid constraint conflicts)
    const hasCommentsTable = await queryRunner.hasTable('comments');
    if (hasCommentsTable) {
        console.log('ℹ️ Dropping existing comments table to recreate with proper structure...');
        await queryRunner.query(`DROP TABLE IF EXISTS comments CASCADE`);
    }

    // Create comments table with proper polymorphic structure
    await queryRunner.query(`
        CREATE TABLE comments (
            id SERIAL PRIMARY KEY,
            "userId" INTEGER NOT NULL,
            commentable_type VARCHAR(50) NOT NULL,
            commentable_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            like_count INTEGER DEFAULT 0 NOT NULL,
            reply_count INTEGER DEFAULT 0 NOT NULL,
            status VARCHAR(50) DEFAULT 'active' NOT NULL,
            "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "FK_comments_user" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Create indices for better performance
    await queryRunner.query(`
        CREATE INDEX "IDX_COMMENTABLE" ON comments (commentable_type, commentable_id)
    `);

    await queryRunner.query(`
        CREATE INDEX "IDX_USER_COMMENTS" ON comments ("userId")
    `);

    console.log('✅ Comments table recreated with proper structure');
};

export const down = async (queryRunner) => {
    const hasTable = await queryRunner.hasTable('comments');
    if (hasTable) {
        await queryRunner.query(`DROP TABLE comments CASCADE`);
        console.log('✅ Dropped comments table');
    }
};

export const migrationInfo = {
    name: '002_fix_comments_constraints',
    description: 'Fix comments table constraints and add polymorphic structure',
    version: '1.0.0'
};
