import { EntitySchema } from "typeorm";

export const Likes = new EntitySchema({
    name: "Likes",
    tableName: "likes",
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
        likeable_type: {
            type: 'varchar',
            length: 50,
            nullable: false,
            comment: 'Type of entity being liked: gallery, blog, comment, reply'
        },
        likeable_id: {
            type: 'int',
            nullable: false,
            comment: 'ID of the entity being liked'
        },
        createdAt: {
            type: 'timestamp',
            default: () => "CURRENT_TIMESTAMP",
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
        gallery: {
            type: 'many-to-one',
            target: 'Gallery',
            joinColumn: [
                { name: 'likeable_id', referencedColumnName: 'id' }
            ],
            createForeignKeyConstraints: false // Since we use polymorphic relations
        }
    },
    indices: [
        {
            name: 'IDX_LIKEABLE',
            columns: ['likeable_type', 'likeable_id']
        },
        {
            name: 'IDX_USER_LIKES',
            columns: ['userId']
        },
        {
            name: 'IDX_UNIQUE_LIKE',
            columns: ['userId', 'likeable_type', 'likeable_id'],
            unique: true
        },
        {
            name: 'IDX_LIKE_CREATED_AT',
            columns: ['createdAt']
        }
    ]
});
