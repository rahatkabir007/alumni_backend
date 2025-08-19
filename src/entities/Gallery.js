import { EntitySchema } from 'typeorm';

export const Gallery = new EntitySchema({
    name: "Gallery",
    tableName: "galleries",
    columns: {
        id: {
            primary: true,
            type: 'int',
            generated: true
        },
        userId: {
            type: 'int',
            nullable: false
        },
        title: {
            type: 'varchar',
            length: 255,
            nullable: true
        },
        description: {
            type: 'text',
            nullable: true
        },
        year: {
            type: 'int',
            nullable: false
        },
        like_count: {
            type: 'int',
            default: 0,
            nullable: false
        },
        comment_count: {
            type: 'int',
            default: 0,
            nullable: false
        },
        image: {
            type: 'varchar',
            length: 500,
            nullable: false
        },
        status: {
            type: 'varchar',
            length: 50,
            default: 'pending_approval',
            nullable: false,
            comment: 'Gallery status: active, inactive, pending_approval'
        },
        createdAt: {
            type: 'timestamp',
            default: () => "CURRENT_TIMESTAMP"
        },
        updatedAt: {
            type: 'timestamp',
            default: () => "CURRENT_TIMESTAMP",
            onUpdate: () => "CURRENT_TIMESTAMP"
        }
    },
    relations: {
        user: {
            type: 'many-to-one',
            target: 'User',
            joinColumn: {
                name: 'userId',
                referencedColumnName: 'id'
            },
            onDelete: 'CASCADE'
        }
    },
    indices: [
        {
            name: 'IDX_GALLERY_USER',
            columns: ['userId']
        },
        {
            name: 'IDX_GALLERY_STATUS',
            columns: ['status']
        },
        {
            name: 'IDX_GALLERY_YEAR',
            columns: ['year']
        },
        {
            name: 'IDX_GALLERY_STATUS_YEAR',
            columns: ['status', 'year']
        },
        {
            name: 'IDX_GALLERY_USER_STATUS',
            columns: ['userId', 'status']
        },
        {
            name: 'IDX_GALLERY_CREATED_AT',
            columns: ['createdAt']
        }
    ]
});