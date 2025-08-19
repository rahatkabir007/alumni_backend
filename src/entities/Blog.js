import { EntitySchema } from 'typeorm';

export const Blog = new EntitySchema({
    name: "Blog",
    tableName: "blogs",
    columns: {
        id: {
            type: 'int',
            primary: true,
            generated: 'increment'
        },
        userId: {
            type: 'int',
            nullable: false,
        },
        title: {
            type: 'varchar',
            length: 255,
            nullable: false,
        },
        content: {
            type: 'text',
            nullable: false,
        },
        excerpt: {
            type: 'text',
            nullable: true,
            comment: 'Short summary of the blog post'
        },
        featured_image: {
            type: 'varchar',
            length: 500,
            nullable: true,
        },
        slug: {
            type: 'varchar',
            length: 255,
            unique: true,
            nullable: false,
            comment: 'URL-friendly version of title'
        },
        like_count: {
            type: 'int',
            default: 0,
            nullable: false,
        },
        comment_count: {
            type: 'int',
            default: 0,
            nullable: false,
        },
        view_count: {
            type: 'int',
            default: 0,
            nullable: false,
        },
        status: {
            type: 'varchar',
            length: 50,
            default: 'draft',
            nullable: false,
            comment: 'Blog status: draft, published, archived'
        },
        published_at: {
            type: 'timestamp',
            nullable: true,
        },
        createdAt: {
            type: 'timestamp',
            default: () => "CURRENT_TIMESTAMP",
        },
        updatedAt: {
            type: 'timestamp',
            default: () => "CURRENT_TIMESTAMP",
            onUpdate: () => "CURRENT_TIMESTAMP",
        },
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
            name: 'IDX_BLOG_USER',
            columns: ['userId']
        },
        {
            name: 'IDX_BLOG_STATUS',
            columns: ['status']
        },
        {
            name: 'IDX_BLOG_SLUG',
            columns: ['slug']
        }
    ]
});
