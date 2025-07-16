import { EntitySchema } from 'typeorm';

export const User = new EntitySchema({
    name: 'User',
    tableName: 'users',
    columns: {
        id: {
            type: 'int',
            primary: true,
            generated: 'increment',
        },
        email: {
            type: 'varchar',
            length: 255,
            unique: true,
        },
        password: {
            type: 'varchar',
            length: 255,
            nullable: true,
        },
        name: {
            type: 'varchar',
            length: 255,
            nullable: true,
        },
        phone: {
            type: 'varchar',
            length: 20,
            nullable: true,
            comment: 'User phone number'
        },
        location: {
            type: 'varchar',
            length: 500,
            nullable: true,
            comment: 'User address/location'
        },
        profession: {
            type: 'varchar',
            length: 255,
            nullable: true,
            comment: 'User current profession/job'
        },
        graduation_year: {
            type: 'int',
            nullable: true,
            comment: 'Year of graduation from school'
        },
        batch: {
            type: 'varchar',
            length: 100,
            nullable: true,
            comment: 'Student batch/class identifier'
        },
        bio: {
            type: 'text',
            nullable: true,
            comment: 'User biography/description'
        },
        isActive: {
            type: 'boolean',
            default: true,
            nullable: false,
            comment: 'Admin controlled active status'
        },
        isGraduated: {
            type: 'boolean',
            default: true,
            nullable: false,
            comment: 'Whether user graduated or left school'
        },
        left_at: {
            type: 'int',
            nullable: true,
            comment: 'Year when user left school (if not graduated)'
        },
        profilePhoto: {
            type: 'varchar',
            length: 500,
            default: '',
            nullable: false,
        },
        profilePhotoSource: {
            type: 'varchar',
            length: 50,
            nullable: true,
            comment: 'Source of profile photo: google, facebook, manual, or null'
        },
        roles: {
            type: 'json',
            default: () => "'[\"user\"]'",
            nullable: false,
        },
        googleId: {
            type: 'varchar',
            length: 255,
            nullable: true,
        },
        facebookId: {
            type: 'varchar',
            length: 255,
            nullable: true,
        },
        provider: {
            type: 'varchar',
            length: 50,
            default: 'email',
        },
        created_at: {
            type: 'timestamp',
            createDate: true,
        },
        updated_at: {
            type: 'timestamp',
            updateDate: true,
        },
    },
});