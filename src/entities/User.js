// filepath: f:\alumni\alumni_backend\src\entities\User.js
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
            nullable: true, // Make nullable for OAuth users
        },
        name: {
            type: 'varchar',
            length: 255,
            nullable: true,
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
            default: 'email', // 'email', 'google', 'facebook'
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