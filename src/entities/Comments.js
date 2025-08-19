import { EntitySchema } from "typeorm";

export const Comments = new EntitySchema({
    name: "Comments",
    tableName: "comments",
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
        // Polymorphic relationship fields
        commentable_type: {
            type: 'varchar',
            length: 50,
            nullable: false,
            comment: 'Type of entity being commented on: gallery, blog'
        },
        commentable_id: {
            type: 'int',
            nullable: false,
            comment: 'ID of the entity being commented on'
        },
        content: {
            type: 'text',
            nullable: false,
        },
        like_count: {
            type: 'int',
            default: 0,
            nullable: false,
        },
        reply_count: {
            type: 'int',
            default: 0,
            nullable: false,
        },
        status: {
            type: 'varchar',
            length: 50,
            default: 'active',
            nullable: false,
            comment: 'Comment status: active, hidden, deleted'
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
        },
        replies: {
            type: 'one-to-many',
            target: 'Replies',
            inverseSide: 'comment'
        }
    },
    indices: [
        {
            name: 'IDX_COMMENTABLE',
            columns: ['commentable_type', 'commentable_id']
        },
        {
            name: 'IDX_USER_COMMENTS',
            columns: ['userId']
        }
    ]
})