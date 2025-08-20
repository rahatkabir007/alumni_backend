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

            // Apply filters
            if (validated.status) {
                queryBuilder.andWhere('gallery.status = :status', { status: validated.status });
            }

            if (validated.year) {
                queryBuilder.andWhere('gallery.year = :year', { year: validated.year });
            }

            if (validated.userId) {
                queryBuilder.andWhere('gallery.userId = :filterUserId', { filterUserId: validated.userId });
            }

            // Apply sorting
            queryBuilder.orderBy(`gallery.${validated.sortBy}`, validated.sortOrder);

            // Get total count for pagination
            const totalItems = await queryBuilder.getCount();

            // Apply pagination
            queryBuilder.skip(validated.offset).take(validated.limit);

            const galleries = await queryBuilder.getMany();

            // If user is authenticated, batch check like status for all galleries
            let galleryLikes = new Map();
            if (userId && galleries.length > 0) {
                const galleryIds = galleries.map(g => g.id);
                const likeRecords = await this.dataSource
                    .getRepository('Likes')
                    .createQueryBuilder('like')
                    .select(['like.likeable_id'])
                    .where('like.userId = :userId', { userId: parseInt(userId) })
                    .andWhere('like.likeable_type = :type', { type: 'gallery' })
                    .andWhere('like.likeable_id IN (:...galleryIds)', { galleryIds })
                    .getMany();

                // Create a map for O(1) lookup
                likeRecords.forEach(like => {
                    galleryLikes.set(like.likeable_id, true);
                });
            }

            // Add like status to each gallery
            const processedGalleries = galleries.map(gallery => ({
                ...gallery,
                isLikedByCurrentUser: userId ? galleryLikes.has(gallery.id) : false
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
            // Handle both string and number types for gallery ID
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

            // Get the gallery with user info
            const gallery = await this.galleryRepository.findOne({
                where: { id: galleryId },
                relations: ['user'],
                select: {
                    id: true,
                    userId: true,
                    title: true,
                    description: true,
                    year: true,
                    like_count: true,
                    comment_count: true,
                    image: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                    user: {
                        id: true,
                        name: true,
                        email: true,
                        profilePhoto: true
                    }
                }
            });

            if (!gallery) {
                return null;
            }

            // Check if current user liked this gallery
            let isLikedByCurrentUser = false;
            if (userId) {
                const like = await this.dataSource
                    .getRepository('Likes')
                    .findOne({
                        where: {
                            userId: parseInt(userId),
                            likeable_type: 'gallery',
                            likeable_id: galleryId
                        }
                    });
                isLikedByCurrentUser = !!like;
            }

            // Calculate total comment count including replies
            const commentCountQuery = `
                SELECT 
                    (SELECT COUNT(*) FROM comments WHERE commentable_type = 'gallery' AND commentable_id = $1 AND status = 'active') +
                    (SELECT COUNT(*) FROM replies r 
                     JOIN comments c ON r.commentId = c.id 
                     WHERE c.commentable_type = 'gallery' AND c.commentable_id = $1 AND r.status = 'active') as total_count
            `;
            const commentCountResult = await this.dataSource.query(commentCountQuery, [galleryId]);
            const totalCommentCount = parseInt(commentCountResult[0].total_count) || 0;

            const processedGallery = {
                ...gallery,
                comment_count: totalCommentCount,
                isLikedByCurrentUser
            };

            // Include detailed comments if requested
            if (includeDetails) {
                const commentsService = new (await import('../comments/comments.service.js')).CommentsService();
                const commentsResult = await commentsService.getComments('gallery', galleryId, {
                    includeReplies: true,
                    maxDepth: 5
                }, userId);

                processedGallery.comments = commentsResult.comments || [];
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