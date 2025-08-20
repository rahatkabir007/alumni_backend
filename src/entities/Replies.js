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
        parentReplyId: {
            type: 'int',
            nullable: true,
            comment: 'ID of parent reply if this is a nested reply'
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
        reply_count: {
            type: 'int',
            default: 0,
            nullable: false,
            comment: 'Number of nested replies to this reply'
        },
        depth: {
            type: 'int',
            default: 0,
            nullable: false,
            comment: 'Nesting level: 0 = direct reply to comment, 1 = reply to reply, etc.'
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
        },
        parentReply: {
            type: 'many-to-one',
            target: 'Replies',
            joinColumn: {
                name: 'parentReplyId',
                referencedColumnName: 'id'
            },
            onDelete: 'CASCADE'
        },
        childReplies: {
            type: 'one-to-many',
            target: 'Replies',
            inverseSide: 'parentReply'
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
        },
        {
            name: 'IDX_REPLY_STATUS',
            columns: ['status']
        },
        {
            name: 'IDX_PARENT_REPLY',
            columns: ['parentReplyId']
        },
        {
            name: 'IDX_COMMENT_REPLY_STATUS',
            columns: ['commentId', 'status']
        },
        {
            name: 'IDX_REPLY_CREATED_AT',
            columns: ['createdAt']
        },
        {
            name: 'IDX_REPLY_DEPTH',
            columns: ['depth']
        }
    ]
});
