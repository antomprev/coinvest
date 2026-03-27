const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');
const authMiddleware = require('../middleware/auth');

// POST /ideas/:idea_id/like - Like an idea
router.post('/:idea_id/like', authMiddleware, async (req, res) => {
  try {
    const { idea_id } = req.params;
    const { user_id, role } = req.user;

    // Only investors can like
    if (role !== 'investor') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Only investors can like ideas'
        }
      });
    }

    // Check if idea exists
    const { data: idea, error: ideaError } = await supabase
      .from('ideas')
      .select('id')
      .eq('id', idea_id)
      .single();

    if (ideaError || !idea) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Idea not found'
        }
      });
    }

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('idea_id', idea_id)
      .eq('investor_id', user_id)
      .single();

    if (existingLike) {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'You already liked this idea'
        }
      });
    }

    // Create like
    const { data: like, error } = await supabase
      .from('likes')
      .insert([
        {
          idea_id,
          investor_id: user_id
        }
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message
        }
      });
    }

    // Increment like_count
    await supabase
      .from('ideas')
      .update({ like_count: supabase.rpc('increment', { amount: 1 }) })
      .eq('id', idea_id);

    return res.status(201).json(like);
  } catch (error) {
    console.error('Like error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

// DELETE /ideas/:idea_id/like - Unlike an idea
router.delete('/:idea_id/like', authMiddleware, async (req, res) => {
  try {
    const { idea_id } = req.params;
    const { user_id } = req.user;

    // Check if like exists
    const { data: like, error: likeError } = await supabase
      .from('likes')
      .select('id')
      .eq('idea_id', idea_id)
      .eq('investor_id', user_id)
      .single();

    if (likeError || !like) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Like not found'
        }
      });
    }

    // Delete like
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('id', like.id);

    if (error) {
      return res.status(400).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message
        }
      });
    }

    // Decrement like_count
    const { data: idea } = await supabase
      .from('ideas')
      .select('like_count')
      .eq('id', idea_id)
      .single();

    if (idea && idea.like_count > 0) {
      await supabase
        .from('ideas')
        .update({ like_count: idea.like_count - 1 })
        .eq('id', idea_id);
    }

    return res.status(204).send();
  } catch (error) {
    console.error('Unlike error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

// POST /ideas/:idea_id/favorite - Add to favorites
router.post('/:idea_id/favorite', authMiddleware, async (req, res) => {
  try {
    const { idea_id } = req.params;
    const { user_id, role } = req.user;

    // Only investors can favorite
    if (role !== 'investor') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Only investors can favorite ideas'
        }
      });
    }

    // Check if idea exists
    const { data: idea, error: ideaError } = await supabase
      .from('ideas')
      .select('id')
      .eq('id', idea_id)
      .single();

    if (ideaError || !idea) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Idea not found'
        }
      });
    }

    // Create favorite
    const { data: favorite, error } = await supabase
      .from('favorites')
      .insert([
        {
          idea_id,
          investor_id: user_id
        }
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        error: {
          code: 'CONFLICT',
          message: 'Already in favorites'
        }
      });
    }

    return res.status(201).json(favorite);
  } catch (error) {
    console.error('Favorite error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

// DELETE /ideas/:idea_id/favorite - Remove from favorites
router.delete('/:idea_id/favorite', authMiddleware, async (req, res) => {
  try {
    const { idea_id } = req.params;
    const { user_id } = req.user;

    // Check if favorite exists
    const { data: favorite, error: favError } = await supabase
      .from('favorites')
      .select('id')
      .eq('idea_id', idea_id)
      .eq('investor_id', user_id)
      .single();

    if (favError || !favorite) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Favorite not found'
        }
      });
    }

    // Delete favorite
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('id', favorite.id);

    if (error) {
      return res.status(400).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message
        }
      });
    }

    return res.status(204).send();
  } catch (error) {
    console.error('Remove favorite error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

// GET /users/me/favorites - Get user's favorites
router.get('/users/me/favorites', authMiddleware, async (req, res) => {
  try {
    const { user_id } = req.user;
    const { page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { data: favorites, count, error } = await supabase
      .from('favorites')
      .select('ideas(id, title, description, status, owner_id, view_count, like_count)', { count: 'exact' })
      .eq('investor_id', user_id)
      .range(offset, offset + parseInt(limit) - 1);

    if (error) {
      return res.status(400).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message
        }
      });
    }

    // Extract just the ideas
    const ideas = favorites.map(fav => fav.ideas).filter(Boolean);

    return res.status(200).json({
      data: ideas,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count
      }
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

module.exports = router;
