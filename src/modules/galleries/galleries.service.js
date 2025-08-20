import { getDataSource } from "../../config/database.js";
import { Gallery } from "../../entities/Gallery.js";
import { User } from "../../entities/User.js";
import { GalleryValidator } from "../../validations/galleryValidation.js";

class GalleriesService {
    constructor() {
        this.dataSource = getDataSource();
        this.galleryRepository = this.dataSource.getRepository(Gallery);
        this.userRepository = this.dataSource.getRepository(User);
    }

    async createGallery(galleryData, userId) {
        const validatedData = GalleryValidator.validateGalleryCreation(galleryData, userId);
        const gallery = this.galleryRepository.create(validatedData);
        return await this.galleryRepository.save(gallery);
    }

    async getAllGalleries(queryParams = {}, userId = null) {
        const validated = GalleryValidator.validateQueryParams(queryParams);

        const queryBuilder = this.galleryRepository.createQueryBuilder('gallery')
            .leftJoinAndSelect('gallery.user', 'user');

        // Apply filters
        if (validated.status) queryBuilder.andWhere('gallery.status = :status', { status: validated.status });
        if (validated.year) queryBuilder.andWhere('gallery.year = :year', { year: validated.year });
        if (validated.userId) queryBuilder.andWhere('gallery.userId = :filterUserId', { filterUserId: validated.userId });

        queryBuilder.orderBy(`gallery.${validated.sortBy}`, validated.sortOrder);

        const totalItems = await queryBuilder.getCount();
        queryBuilder.skip(validated.offset).take(validated.limit);

        const galleries = await queryBuilder.getMany();

        // Batch check like status if user is authenticated
        const galleryLikes = userId ? await this.batchCheckLikes(userId, galleries.map(g => g.id)) : new Map();

        const processedGalleries = galleries.map(gallery => ({
            ...gallery,
            isLikedByCurrentUser: galleryLikes.has(gallery.id)
        }));

        return {
            galleries: processedGalleries,
            currentPage: validated.page,
            totalPages: Math.ceil(totalItems / validated.limit),
            totalItems,
            itemsPerPage: validated.limit,
            hasNextPage: validated.page < Math.ceil(totalItems / validated.limit),
            hasPrevPage: validated.page > 1
        };
    }

    async getGalleryById(id, includeDetails = false, userId = null) {
        const galleryId = typeof id === 'string' ? parseInt(id) : id;
        if (isNaN(galleryId) || galleryId <= 0) {
            throw new Error('Invalid gallery ID');
        }

        const gallery = await this.galleryRepository.findOne({
            where: { id: galleryId },
            relations: ['user']
        });

        if (!gallery) return null;

        // Check like status and get updated comment count
        const [isLikedByCurrentUser, totalCommentCount] = await Promise.all([
            userId ? this.checkUserLikeStatus(userId, galleryId) : false,
            this.getActualCommentCount(galleryId)
        ]);

        // Update comment count if different
        if (gallery.comment_count !== totalCommentCount) {
            await this.galleryRepository.update(galleryId, { comment_count: totalCommentCount });
            gallery.comment_count = totalCommentCount;
        }

        const processedGallery = {
            ...gallery,
            isLikedByCurrentUser,
            comment_count: totalCommentCount
        };

        if (includeDetails) {
            const { CommentsService } = await import('../comments/comments.service.js');
            const commentsService = new CommentsService();
            const commentsResult = await commentsService.getComments('gallery', galleryId, {
                includeReplies: true,
                maxDepth: 5
            }, userId);
            processedGallery.comments = commentsResult.comments || [];
        }

        return processedGallery;
    }

    async getUserGalleries(userId, queryParams = {}, currentUserId = null) {
        const userIdNum = GalleryValidator.validateUserId(userId);
        const params = { ...queryParams, userId: userIdNum };
        return await this.getAllGalleries(params, currentUserId);
    }

    // Helper methods
    async batchCheckLikes(userId, galleryIds) {
        if (!galleryIds.length) return new Map();

        try {
            const likes = await this.dataSource
                .getRepository('Likes')
                .createQueryBuilder('like')
                .select(['like.likeable_id'])
                .where('like.userId = :userId', { userId: parseInt(userId) })
                .andWhere('like.likeable_type = :type', { type: 'gallery' })
                .andWhere('like.likeable_id IN (:...galleryIds)', { galleryIds: galleryIds.map(id => parseInt(id)) })
                .getMany();

            const likesMap = new Map();
            likes.forEach(like => likesMap.set(like.likeable_id, true));
            return likesMap;
        } catch (error) {
            console.error('Batch check likes error:', error);
            return new Map(); // Return empty map on error to prevent crash
        }
    }

    async checkUserLikeStatus(userId, galleryId) {
        try {
            const like = await this.dataSource
                .getRepository('Likes')
                .findOne({
                    where: {
                        userId: parseInt(userId),
                        likeable_type: 'gallery',
                        likeable_id: parseInt(galleryId)
                    }
                });
            return !!like;
        } catch (error) {
            console.error('Check user like status error:', error);
            return false; // Return false on error to prevent crash
        }
    }

    async getActualCommentCount(galleryId) {
        try {
            const result = await this.dataSource.query(`
                SELECT COUNT(*) as total_count FROM (
                    SELECT id FROM comments 
                    WHERE commentable_type = 'gallery' AND commentable_id = $1 AND status = 'active'
                    
                    UNION ALL
                    
                    SELECT r.id FROM replies r
                    INNER JOIN comments c ON r.commentId = c.id
                    WHERE c.commentable_type = 'gallery' AND c.commentable_id = $1 
                    AND r.status = 'active' AND c.status = 'active'
                ) as combined
            `, [parseInt(galleryId)]);

            return parseInt(result[0].total_count) || 0;
        } catch (error) {
            console.error('Get actual comment count error:', error);
            return 0; // Return 0 on error to prevent crash
        }
    }

    async updateGallery(id, updateData, userId, userRoles = []) {
        const galleryId = GalleryValidator.validateUserId(id);
        const gallery = await this.galleryRepository.findOne({ where: { id: galleryId }, relations: ['user'] });

        if (!gallery) throw new Error('Gallery not found');

        const isOwner = gallery.userId === parseInt(userId);
        const isAdmin = userRoles.includes('admin');
        const isModerator = userRoles.includes('moderator');

        if (!isOwner && !isAdmin && !isModerator) {
            throw new Error('You do not have permission to update this gallery');
        }

        const validatedData = GalleryValidator.validateGalleryUpdate(updateData, isAdmin || isModerator);
        Object.assign(gallery, validatedData);

        return await this.galleryRepository.save(gallery);
    }

    async deleteGallery(id, userId, userRoles = []) {
        const galleryId = GalleryValidator.validateUserId(id);
        const gallery = await this.galleryRepository.findOne({ where: { id: galleryId } });

        if (!gallery) throw new Error('Gallery not found');

        const isOwner = gallery.userId === parseInt(userId);
        const isAdmin = userRoles.includes('admin');
        const isModerator = userRoles.includes('moderator');

        if (!isOwner && !isAdmin && !isModerator) {
            throw new Error('You do not have permission to delete this gallery');
        }

        const result = await this.galleryRepository.delete(galleryId);
        return result.affected > 0;
    }

    async updateGalleryStatus(id, status, userRoles = []) {
        if (!userRoles.includes('admin') && !userRoles.includes('moderator')) {
            throw new Error('You do not have permission to update gallery status');
        }

        const galleryId = GalleryValidator.validateUserId(id);
        const validatedStatus = GalleryValidator.validateStatus(status, true);
        const gallery = await this.galleryRepository.findOne({ where: { id: galleryId } });

        if (!gallery) throw new Error('Gallery not found');

        gallery.status = validatedStatus;
        return await this.galleryRepository.save(gallery);
    }
}

export { GalleriesService };