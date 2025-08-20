import { getDataSource } from "../../config/database.js";
import { Gallery } from "../../entities/Gallery.js";
import { User } from "../../entities/User.js";
import { GalleryValidator } from "../../validations/galleryValidation.js";

class GalleriesService {
    constructor() {
        try {
            this.dataSource = getDataSource();
            this.galleryRepository = this.dataSource.getRepository(Gallery);
            this.userRepository = this.dataSource.getRepository(User);
        } catch (error) {
            console.error('Error initializing GalleriesService:', error);
            throw error;
        }
    }

    async createGallery(galleryData, userId) {
        try {
            // Use centralized validation
            const validatedData = GalleryValidator.validateGalleryCreation(galleryData, userId);

            // Create gallery entry
            const gallery = this.galleryRepository.create(validatedData);
            const savedGallery = await this.galleryRepository.save(gallery);

            return savedGallery;
        } catch (error) {
            console.error('Create gallery error:', error);
            throw error;
        }
    }

    async getAllGalleries(queryParams = {}) {
        try {
            // Use centralized validation for query parameters
            const validated = GalleryValidator.validateQueryParams(queryParams);

            // Build query
            const queryBuilder = this.galleryRepository.createQueryBuilder('gallery');

            // Use leftJoin and manually select specific user fields only
            queryBuilder.leftJoin('gallery.user', 'user');
            queryBuilder.addSelect([
                'user.id',
                'user.name',
                'user.email',
                'user.profilePhoto'
            ]);

            // Apply filters
            if (validated.status) {
                queryBuilder.andWhere('gallery.status = :status', { status: validated.status });
            }

            if (validated.year) {
                queryBuilder.andWhere('gallery.year = :year', { year: validated.year });
            }

            if (validated.userId) {
                queryBuilder.andWhere('gallery.userId = :userId', { userId: validated.userId });
            }

            // Apply sorting
            queryBuilder.orderBy(`gallery.${validated.sortBy}`, validated.sortOrder);

            // Get total count for pagination
            const totalItems = await queryBuilder.getCount();

            // Apply pagination
            queryBuilder.skip(validated.offset).take(validated.limit);

            const galleries = await queryBuilder.getMany();

            // Calculate pagination metadata
            const totalPages = Math.ceil(totalItems / validated.limit);
            const hasNextPage = validated.page < totalPages;
            const hasPrevPage = validated.page > 1;

            return {
                galleries,
                currentPage: validated.page,
                totalPages,
                totalItems,
                itemsPerPage: validated.limit,
                hasNextPage,
                hasPrevPage,
            };
        } catch (error) {
            console.error('Get galleries error:', error);
            throw error;
        }
    }

    async getGalleryById(id, includeDetails = false) {
        try {
            // Fix: Handle both string and number types for gallery ID
            let galleryId;
            if (typeof id === 'string') {
                galleryId = parseInt(id);
            } else if (typeof id === 'number') {
                galleryId = id;
            } else {
                throw new Error('Invalid gallery ID type');
            }

            if (isNaN(galleryId) || galleryId <= 0) {
                throw new Error('Invalid gallery ID');
            }

            const queryBuilder = this.galleryRepository.createQueryBuilder('gallery');

            // Use leftJoin and manually select specific user fields only
            queryBuilder.leftJoin('gallery.user', 'user');
            queryBuilder.addSelect([
                'user.id',
                'user.name',
                'user.email',
                'user.profilePhoto'
            ]);

            // Include additional details if requested
            if (includeDetails) {
                // Include comments with specific user info only
                queryBuilder.leftJoin('gallery.comments', 'comments', 'comments.status = :commentStatus', { commentStatus: 'active' });
                queryBuilder.leftJoin('comments.user', 'commentUser');
                queryBuilder.addSelect([
                    'comments.id',
                    'comments.content',
                    'comments.like_count',
                    'comments.reply_count',
                    'comments.createdAt',
                    'comments.updatedAt',
                    'commentUser.id',
                    'commentUser.name',
                    'commentUser.email',
                    'commentUser.profilePhoto'
                ]);

                // Include replies to comments with specific user info only
                queryBuilder.leftJoin('comments.replies', 'replies', 'replies.status = :replyStatus', { replyStatus: 'active' });
                queryBuilder.leftJoin('replies.user', 'replyUser');
                queryBuilder.addSelect([
                    'replies.id',
                    'replies.content',
                    'replies.like_count',
                    'replies.createdAt',
                    'replies.updatedAt',
                    'replyUser.id',
                    'replyUser.name',
                    'replyUser.email',
                    'replyUser.profilePhoto'
                ]);

                // Order comments and replies by creation date
                queryBuilder.addOrderBy('comments.createdAt', 'ASC');
                queryBuilder.addOrderBy('replies.createdAt', 'ASC');
            }

            queryBuilder.where('gallery.id = :id', { id: galleryId });

            const gallery = await queryBuilder.getOne();

            if (!gallery) {
                return null;
            }

            return gallery;
        } catch (error) {
            console.error('Get gallery by ID error:', error);
            throw error;
        }
    }

    async updateGallery(id, updateData, userId, userRoles = []) {
        try {
            const galleryId = GalleryValidator.validateUserId(id);

            const gallery = await this.galleryRepository.findOne({
                where: { id: galleryId },
                relations: ['user']
            });

            if (!gallery) {
                throw new Error('Gallery not found');
            }

            // Check permissions: only owner, admin, or moderator can update
            const isOwner = gallery.userId === parseInt(userId);
            const isAdmin = userRoles.includes('admin');
            const isModerator = userRoles.includes('moderator');

            if (!isOwner && !isAdmin && !isModerator) {
                throw new Error('You do not have permission to update this gallery');
            }

            // Use centralized validation
            const validatedData = GalleryValidator.validateGalleryUpdate(updateData, isAdmin || isModerator);

            // Apply updates
            Object.assign(gallery, validatedData);
            const updatedGallery = await this.galleryRepository.save(gallery);

            return updatedGallery;
        } catch (error) {
            console.error('Update gallery error:', error);
            throw error;
        }
    }

    async deleteGallery(id, userId, userRoles = []) {
        try {
            const galleryId = GalleryValidator.validateUserId(id);

            const gallery = await this.galleryRepository.findOne({
                where: { id: galleryId }
            });

            if (!gallery) {
                throw new Error('Gallery not found');
            }

            // Check permissions: only owner, admin, or moderator can delete
            const isOwner = gallery.userId === parseInt(userId);
            const isAdmin = userRoles.includes('admin');
            const isModerator = userRoles.includes('moderator');

            if (!isOwner && !isAdmin && !isModerator) {
                throw new Error('You do not have permission to delete this gallery');
            }

            // Delete the gallery (CASCADE will handle related comments/likes)
            const result = await this.galleryRepository.delete(galleryId);
            return result.affected > 0;
        } catch (error) {
            console.error('Delete gallery error:', error);
            throw error;
        }
    }

    async getUserGalleries(userId, queryParams = {}) {
        try {
            const userIdNum = GalleryValidator.validateUserId(userId);

            // Use getAllGalleries with userId filter
            const params = { ...queryParams, userId: userIdNum };
            return await this.getAllGalleries(params);
        } catch (error) {
            console.error('Get user galleries error:', error);
            throw error;
        }
    }

    async updateGalleryStatus(id, status, userRoles = []) {
        try {
            // Only admin/moderator can update status
            if (!userRoles.includes('admin') && !userRoles.includes('moderator')) {
                throw new Error('You do not have permission to update gallery status');
            }

            const galleryId = GalleryValidator.validateUserId(id);
            const validatedStatus = GalleryValidator.validateStatus(status, true);

            const gallery = await this.galleryRepository.findOne({
                where: { id: galleryId }
            });

            if (!gallery) {
                throw new Error('Gallery not found');
            }

            gallery.status = validatedStatus;
            const updatedGallery = await this.galleryRepository.save(gallery);

            return updatedGallery;
        } catch (error) {
            console.error('Update gallery status error:', error);
            throw error;
        }
    }
}

export { GalleriesService };