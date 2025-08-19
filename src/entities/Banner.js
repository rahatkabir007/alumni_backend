import { EntitySchema } from 'typeorm';

export const Banner = new EntitySchema({
    name: "Banner",
    tableName: "banners",
    columns: {
        id: {
            type: 'int',
            primary: true,
            generated: 'increment'
        },
        title: {
            type: 'varchar',
            length: 255,
            nullable: false,
        },
        subtitle: {
            type: 'varchar',
            length: 500,
            nullable: true,
        },
        description: {
            type: 'text',
            nullable: true,
        },
        image_url: {
            type: 'varchar',
            length: 500,
            nullable: true,
        },
        link_url: {
            type: 'varchar',
            length: 500,
            nullable: true,
        },
        button_text: {
            type: 'varchar',
            length: 100,
            nullable: true,
        },
        position: {
            type: 'int',
            default: 1,
            nullable: false,
        },
        is_active: {
            type: 'boolean',
            default: true,
            nullable: false,
        },
        banner_type: {
            type: 'varchar',
            length: 50,
            default: 'hero',
            nullable: false,
            comment: 'Banner type: hero, feature, event, opportunity, donation'
        },
        background_color: {
            type: 'varchar',
            length: 7,
            default: '#1e40af',
            nullable: true,
        },
        text_color: {
            type: 'varchar',
            length: 7,
            default: '#ffffff',
            nullable: true,
        },
        created_at: {
            type: 'timestamp',
            default: () => "CURRENT_TIMESTAMP",
        },
        updated_at: {
            type: 'timestamp',
            default: () => "CURRENT_TIMESTAMP",
            onUpdate: () => "CURRENT_TIMESTAMP",
        },
    },
    indices: [
        {
            name: 'IDX_BANNER_ACTIVE',
            columns: ['is_active']
        },
        {
            name: 'IDX_BANNER_TYPE',
            columns: ['banner_type']
        },
        {
            name: 'IDX_BANNER_POSITION',
            columns: ['position']
        },
        {
            name: 'IDX_BANNER_ACTIVE_POSITION',
            columns: ['is_active', 'position']
        }
    ]
});
