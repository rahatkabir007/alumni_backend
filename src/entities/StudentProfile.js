import { EntitySchema } from 'typeorm';

export const StudentProfile = new EntitySchema({
    name: 'StudentProfile',
    tableName: 'student_profiles',
    columns: {
        id: {
            type: 'int',
            primary: true,
            generated: true,
        },
        userId: {
            type: 'int',
            unique: true,
        },
        class: {
            type: 'varchar',
            length: 10,
            nullable: true,
        },
        currentPosition: {
            type: 'varchar',
            length: 200,
            nullable: true,
        },
        organization: {
            type: 'varchar',
            length: 200,
            nullable: true,
        },
        joinedYear: {
            type: 'int',
            nullable: true,
        },
        graduatedYear: {
            type: 'int',
            nullable: true,
        },
        quotes: {
            type: 'text',
            nullable: true,
        },
        socialMedia: {
            type: 'json',
            nullable: true,
        },
        created_at: {
            type: 'timestamp',
            default: () => 'CURRENT_TIMESTAMP',
        },
        updated_at: {
            type: 'timestamp',
            default: () => 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
        },
    },
    relations: {
        user: {
            type: 'one-to-one',
            target: 'User',
            joinColumn: { name: 'userId' },
            inverseSide: 'studentProfile',
        },
    },
});
