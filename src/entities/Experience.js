import { EntitySchema } from 'typeorm';

export const Experience = new EntitySchema({
    name: 'Experience',
    tableName: 'experience',
    columns: {
        id: {
            type: 'int',
            primary: true,
            generated: true,
        },
        userId: {
            type: 'int',
        },
        position: {
            type: 'varchar',
            length: 200,
        },
        organization: {
            type: 'varchar',
            length: 200,
            nullable: true,
        },
        institution: {
            type: 'varchar',
            length: 200,
            nullable: true,
        },
        period: {
            type: 'varchar',
            length: 100,
        },
        description: {
            type: 'text',
            nullable: true,
        },
        created_at: {
            type: 'timestamp',
            default: () => 'CURRENT_TIMESTAMP',
        },
    },
    relations: {
        user: {
            type: 'many-to-one',
            target: 'User',
            joinColumn: { name: 'userId' },
            inverseSide: 'experience',
        },
    },
});
