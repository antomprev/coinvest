const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../utils/supabase');
const authMiddleware = require('../middleware/auth');

// POST /auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, role, first_name, last_name } = req.body;

    // Validation
    if (!email || !password || !role) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: email, password, role'
        }
      });
    }

    if (role !== 'idea_holder' && role !== 'investor') {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Role must be "idea_holder" or "investor"'
        }
      });
    }

    if (password.length < 6) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Password must be at least 6 characters'
        }
      });
    }

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Email already exists'
        }
      });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert([
        {
          email,
          password_hash,
          role,
          status: 'pending',
          first_name,
          last_name
        }
      ])
      .select()
      .single();

    if (userError) {
      return res.status(400).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: userError.message
        }
      });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        user_id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      user_id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      status: newUser.status,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      token
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: email, password'
        }
      });
    }

    // Find user by email
    const { data: user, error: queryError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (queryError || !user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials'
        }
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials'
        }
      });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        user_id: user.id,
        email: user.email,
        role: user.role,
        status: user.status
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      user_id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      first_name: user.first_name,
      last_name: user.last_name,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

// POST /auth/logout
router.post('/logout', authMiddleware, (req, res) => {
  // In JWT, logout is client-side (delete token)
  // Server just confirms the action
  return res.status(204).send();
});

module.exports = router;
