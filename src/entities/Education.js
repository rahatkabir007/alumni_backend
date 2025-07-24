import { EntitySchema } from 'typeorm';

export const Education = new EntitySchema({
    name: 'Education',
    tableName: 'education',
    columns: {
        id: {
            type: 'int',
            primary: true,
            generated: true,
        },
        userId: {
            type: 'int',
        },
        degree: {
            type: 'varchar',
            length: 200,
        },
        institution: {
            type: 'varchar',
            length: 200,
        },
        year: {
            type: 'int',
        },
        grade: {
            type: 'varchar',
            length: 50,
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
            inverseSide: 'education',
        },
    },
});
