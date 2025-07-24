import { EntitySchema } from 'typeorm';

export const ManagementProfile = new EntitySchema({
    name: 'ManagementProfile',
    tableName: 'management_profiles',
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
        designation: {
            type: 'varchar',
            length: 100,
            nullable: true,
        },
        department: {
            type: 'varchar',
            length: 100,
            nullable: true,
        },
        period: {
            type: 'varchar',
            length: 50,
            nullable: true,
        },
        subject: {
            type: 'varchar',
            length: 100,
            nullable: true,
        },
        specialization: {
            type: 'varchar',
            length: 200,
            nullable: true,
        },
        quote: {
            type: 'text',
            nullable: true,
        },
        officeHours: {
            type: 'varchar',
            length: 100,
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
            inverseSide: 'managementProfile',
        },
    },
});
