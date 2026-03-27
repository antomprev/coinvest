const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');
const authMiddleware = require('../middleware/auth');

// POST /ideas - Create new idea
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, stage, target_audience, funding_requested } = req.body;
    const { user_id, role } = req.user;

    // Only idea holders can create ideas
    if (role !== 'idea_holder') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Only idea holders can create ideas'
        }
      });
    }

    // Validation
    if (!title || !description) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: title, description'
        }
      });
    }

    // Create idea
    const { data: idea, error } = await supabase
      .from('ideas')
      .insert([
        {
          owner_id: user_id,
          title,
          description,
          stage,
          target_audience,
          funding_requested,
          status: 'submitted'
        }
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        error: {
          code: 'CONFLICT',
          message: error.message
        }
      });
    }

    return res.status(201).json(idea);
  } catch (error) {
    console.error('Create idea error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

// GET /ideas - List ideas
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { user_id, role, status: userStatus } = req.user;
    const { page = 1, limit = 10, search, stage, sort_by = 'created_at' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase.from('ideas').select('*', { count: 'exact' });

    // Apply role-based filtering
    if (role === 'idea_holder') {
      // Idea holders see only their own ideas
      query = query.eq('owner_id', user_id);
    } else if (role === 'investor') {
      // Investors see screened ideas (if they're approved)
      if (userStatus === 'approved') {
        query = query.eq('status', 'screened');
      } else {
        // Not approved yet - no ideas
        query = query.eq('status', 'screened').eq('owner_id', 'null');
      }
    } else if (role === 'admin') {
      // Admin sees all ideas
    }

    // Apply filters
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (stage) {
      query = query.eq('stage', stage);
    }

    // Apply sorting
    const orderBy = sort_by === 'like_count' ? 'like_count' : sort_by;
    query = query.order(orderBy, { ascending: false });

    // Apply pagination
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: ideas, error, count } = await query;

    if (error) {
      return res.status(400).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message
        }
      });
    }

    return res.status(200).json({
      data: ideas,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count
      }
    });
  } catch (error) {
    console.error('List ideas error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

// GET /ideas/:id - Get single idea
router.get('/:idea_id', authMiddleware, async (req, res) => {
  try {
    const { idea_id } = req.params;
    const { user_id, role, status: userStatus } = req.user;

    // Get idea
    const { data: idea, error } = await supabase
      .from('ideas')
      .select('*')
      .eq('id', idea_id)
      .single();

    if (error || !idea) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Idea not found'
        }
      });
    }

    // Check access
    if (role === 'idea_holder' && idea.owner_id !== user_id) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You can only view your own ideas'
        }
      });
    }

    if (role === 'investor' && idea.status !== 'screened') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You can only view screened ideas'
        }
      });
    }

    if (role === 'investor' && userStatus !== 'approved') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You must be approved to view ideas'
        }
      });
    }

    // Increment view count
    await supabase
      .from('ideas')
      .update({ view_count: idea.view_count + 1 })
      .eq('id', idea_id);

    idea.view_count += 1;

    return res.status(200).json(idea);
  } catch (error) {
    console.error('Get idea error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

// PUT /ideas/:id - Update idea
router.put('/:idea_id', authMiddleware, async (req, res) => {
  try {
    const { idea_id } = req.params;
    const { user_id } = req.user;
    const { title, description, stage, target_audience, funding_requested } = req.body;

    // Get idea
    const { data: idea, error: getError } = await supabase
      .from('ideas')
      .select('*')
      .eq('id', idea_id)
      .single();

    if (getError || !idea) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Idea not found'
        }
      });
    }

    // Check ownership
    if (idea.owner_id !== user_id) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You can only update your own ideas'
        }
      });
    }

    // Update idea
    const { data: updatedIdea, error } = await supabase
      .from('ideas')
      .update({
        title: title || idea.title,
        description: description || idea.description,
        stage: stage || idea.stage,
        target_audience: target_audience || idea.target_audience,
        funding_requested: funding_requested !== undefined ? funding_requested : idea.funding_requested,
        updated_at: new Date().toISOString()
      })
      .eq('id', idea_id)
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

    return res.status(200).json(updatedIdea);
  } catch (error) {
    console.error('Update idea error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

// DELETE /ideas/:id - Delete idea
router.delete('/:idea_id', authMiddleware, async (req, res) => {
  try {
    const { idea_id } = req.params;
    const { user_id, role } = req.user;

    // Get idea
    const { data: idea, error: getError } = await supabase
      .from('ideas')
      .select('*')
      .eq('id', idea_id)
      .single();

    if (getError || !idea) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Idea not found'
        }
      });
    }

    // Check ownership or admin
    if (idea.owner_id !== user_id && role !== 'admin') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You can only delete your own ideas'
        }
      });
    }

    // Delete idea
    const { error } = await supabase
      .from('ideas')
      .delete()
      .eq('id', idea_id);

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
    console.error('Delete idea error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

module.exports = router;
