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

    async getAllGalleries(queryParams = {}, userId = null) {
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

            // If user is authenticated, include like status
            if (userId) {
                queryBuilder.leftJoin(
                    'gallery.likes',
                    'userLike',
                    'userLike.likeable_type = :likeableType AND userLike.likeable_id = gallery.id AND userLike.userId = :userId',
                    { likeableType: 'gallery', userId: parseInt(userId) }
                );
                queryBuilder.addSelect('userLike.id as userLikeId');
            }

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

            // Post-process to add like status for authenticated users
            const processedGalleries = galleries.map(gallery => ({
                ...gallery,
                isLikedByCurrentUser: userId ? !!gallery.userLikeId : false
            }));

            // Calculate pagination metadata
            const totalPages = Math.ceil(totalItems / validated.limit);
            const hasNextPage = validated.page < totalPages;
            const hasPrevPage = validated.page > 1;

            return {
                galleries: processedGalleries,
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

    async getGalleryById(id, includeDetails = false, userId = null) {
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

            // If user is authenticated, include like status for gallery
            if (userId) {
                queryBuilder.leftJoin(
                    'gallery.likes',
                    'userLike',
                    'userLike.likeable_type = :likeableType AND userLike.likeable_id = gallery.id AND userLike.userId = :userId',
                    { likeableType: 'gallery', userId: parseInt(userId) }
                );
                queryBuilder.addSelect('userLike.id as userLikeId');
            }

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

                // Include like status for comments if user is authenticated
                if (userId) {
                    queryBuilder.leftJoin(
                        'comments.likes',
                        'commentUserLike',
                        'commentUserLike.likeable_type = :commentLikeableType AND commentUserLike.likeable_id = comments.id AND commentUserLike.userId = :userId',
                        { commentLikeableType: 'comment' }
                    );
                    queryBuilder.addSelect('commentUserLike.id as commentUserLikeId');
                }

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

                // Include like status for replies if user is authenticated
                if (userId) {
                    queryBuilder.leftJoin(
                        'replies.likes',
                        'replyUserLike',
                        'replyUserLike.likeable_type = :replyLikeableType AND replyUserLike.likeable_id = replies.id AND replyUserLike.userId = :userId',
                        { replyLikeableType: 'reply' }
                    );
                    queryBuilder.addSelect('replyUserLike.id as replyUserLikeId');
                }

                // Order comments and replies by creation date
                queryBuilder.addOrderBy('comments.createdAt', 'ASC');
                queryBuilder.addOrderBy('replies.createdAt', 'ASC');
            }

            queryBuilder.where('gallery.id = :id', { id: galleryId });

            const gallery = await queryBuilder.getOne();

            if (!gallery) {
                return null;
            }

            // Post-process to add like status
            const processedGallery = {
                ...gallery,
                isLikedByCurrentUser: userId ? !!gallery.userLikeId : false
            };

            // Process comments and replies for like status
            if (includeDetails && processedGallery.comments) {
                processedGallery.comments = processedGallery.comments.map(comment => ({
                    ...comment,
                    isLikedByCurrentUser: userId ? !!comment.commentUserLikeId : false,
                    replies: comment.replies ? comment.replies.map(reply => ({
                        ...reply,
                        isLikedByCurrentUser: userId ? !!reply.replyUserLikeId : false
                    })) : []
                }));
            }

            return processedGallery;
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

    async getUserGalleries(userId, queryParams = {}, currentUserId = null) {
        try {
            const userIdNum = GalleryValidator.validateUserId(userId);

            // Use getAllGalleries with userId filter
            const params = { ...queryParams, userId: userIdNum };
            return await this.getAllGalleries(params, currentUserId);
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