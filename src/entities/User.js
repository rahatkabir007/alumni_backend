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