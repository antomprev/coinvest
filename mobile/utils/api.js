// Mock API Layer - Swap this with real API calls later

const mockIdeas = [
  {
    idea_id: '1',
    owner_id: 'user1',
    title: 'AI-powered HR Platform',
    description: 'A platform that uses AI to streamline HR processes, from recruitment to employee management.',
    stage: 'MVP',
    target_audience: 'Mid-market companies (50-500 employees)',
    funding_requested: 50000,
    status: 'screened',
    view_count: 12,
    like_count: 3,
    pitch_request_count: 2,
    created_at: '2024-01-15T11:30:00Z'
  },
  {
    idea_id: '2',
    owner_id: 'user2',
    title: 'Sustainable Packaging Solution',
    description: 'Eco-friendly packaging made from 100% recycled materials with zero plastic.',
    stage: 'Early Stage',
    target_audience: 'E-commerce businesses, retailers',
    funding_requested: 100000,
    status: 'screened',
    view_count: 8,
    like_count: 5,
    pitch_request_count: 1,
    created_at: '2024-01-14T09:20:00Z'
  },
  {
    idea_id: '3',
    owner_id: 'user3',
    title: 'Mobile Fitness Coaching App',
    description: 'AI-powered personal fitness coach that adapts to your goals and fitness level.',
    stage: 'MVP',
    target_audience: 'Fitness enthusiasts, gym goers',
    funding_requested: 30000,
    status: 'screened',
    view_count: 25,
    like_count: 7,
    pitch_request_count: 3,
    created_at: '2024-01-13T14:45:00Z'
  }
];

const mockUser = {
  user_id: 'current-user-id',
  email: 'investor@example.com',
  role: 'investor',
  status: 'approved',
  first_name: 'John',
  last_name: 'Doe',
  token: 'mock_jwt_token_here'
};

export const api = {
  // Auth
  signup: async (email, password, role, first_name, last_name) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ ...mockUser, email, role });
      }, 500);
    });
  },

  login: async (email, password) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockUser);
      }, 500);
    });
  },

  // Ideas
  getIdeas: async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: mockIdeas,
          pagination: { page: 1, limit: 10, total: 3 }
        });
      }, 500);
    });
  },

  getIdeaById: async (ideaId) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const idea = mockIdeas.find(i => i.idea_id === ideaId);
        resolve(idea);
      }, 300);
    });
  },

  createIdea: async (title, description, stage, target_audience, funding_requested) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newIdea = {
          idea_id: String(mockIdeas.length + 1),
          owner_id: mockUser.user_id,
          title,
          description,
          stage,
          target_audience,
          funding_requested,
          status: 'submitted',
          view_count: 0,
          like_count: 0,
          pitch_request_count: 0,
          created_at: new Date().toISOString()
        };
        resolve(newIdea);
      }, 500);
    });
  },

  // Likes & Favorites
  likeIdea: async (ideaId) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ like_id: 'like-id', idea_id: ideaId });
      }, 300);
    });
  },

  unlikeIdea: async (ideaId) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true });
      }, 300);
    });
  },

  addToFavorites: async (ideaId) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ favorite_id: 'fav-id', idea_id: ideaId });
      }, 300);
    });
  },

  removeFromFavorites: async (ideaId) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true });
      }, 300);
    });
  },

  getFavorites: async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: mockIdeas.slice(0, 1),
          pagination: { page: 1, limit: 10, total: 1 }
        });
      }, 500);
    });
  },

  // Pitch Requests
  requestPitch: async (ideaId) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ pitch_request_id: 'pitch-id', idea_id: ideaId, status: 'pending' });
      }, 300);
    });
  }
};

export default api;
