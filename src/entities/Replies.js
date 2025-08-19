import { EntitySchema } from "typeorm";

export const Replies = new EntitySchema({
    name: "Replies",
    tableName: "replies",
    columns: {
        id: {
            type: 'int',
            primary: true,
            generated: 'increment'
        },
        commentId: {
            type: 'int',
            nullable: false,
        },
        userId: {
            type: 'int',
            nullable: false,
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
        status: {
            type: 'varchar',
            length: 50,
            default: 'active',
            nullable: false,
            comment: 'Reply status: active, hidden, deleted'
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
        comment: {
            type: 'many-to-one',
            target: 'Comments',
            joinColumn: {
                name: 'commentId',
                referencedColumnName: 'id'
            },
            onDelete: 'CASCADE'
        },
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
            name: 'IDX_COMMENT_REPLIES',
            columns: ['commentId']
        },
        {
            name: 'IDX_USER_REPLIES',
            columns: ['userId']
        }
    ]
});
