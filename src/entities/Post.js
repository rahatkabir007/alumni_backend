import { EntitySchema } from 'typeorm';

export const Post = new EntitySchema({
    name: "Post",
    tableName: "posts",
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
        body: {
            type: 'text',
            nullable: false,
            comment: 'Main content of the post'
        },
        images: {
            type: 'json',
            default: () => "'[]'",
            nullable: false,
            comment: 'Array of image URLs for the post'
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
        status: {
            type: 'varchar',
            length: 50,
            default: 'pending_approval',
            nullable: false,
            comment: 'Post status: active, inactive, pending_approval, rejected'
        },
        published_at: {
            type: 'timestamp',
            nullable: true,
            comment: 'When the post was approved and published'
        },
        tags: {
            type: 'json',
            default: () => "'[]'",
            nullable: false,
            comment: 'Array of tags for categorization'
        },
        visibility: {
            type: 'varchar',
            length: 20,
            default: 'public',
            nullable: false,
            comment: 'Post visibility: public, private, alumni_only'
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
            name: 'IDX_POST_USER',
            columns: ['userId']
        },
        {
            name: 'IDX_POST_STATUS',
            columns: ['status']
        },
        {
            name: 'IDX_POST_PUBLISHED',
            columns: ['published_at']
        },
        {
            name: 'IDX_POST_VISIBILITY',
            columns: ['visibility']
        },
        {
            name: 'IDX_POST_STATUS_VISIBILITY',
            columns: ['status', 'visibility']
        },
        {
            name: 'IDX_POST_USER_STATUS',
            columns: ['userId', 'status']
        },
        {
            name: 'IDX_POST_CREATED_AT',
            columns: ['createdAt']
        }
    ]
});
