export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'FRND Audio Calling & Social Platform API',
    version: '1.0.0',
    description:
      'Interactive OpenAPI & Swagger documentation for the FRND real-time audio calling, virtual economy, chat, and matching backend.',
    contact: {
      name: 'FRND Support',
    },
  },
  servers: [
    {
      url: 'https://frnds-81d4.onrender.com',
      description: 'Production Cloud Deployment (Render)',
    },
    {
      url: 'http://localhost:5000',
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token obtained from /api/auth/verify-email or /api/auth/verify-otp',
      },
    },
    schemas: {
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: { type: 'object' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '6627a810b12c1a001e9a1122' },
          name: { type: 'string', example: 'Aarav Sharma' },
          email: { type: 'string', example: 'aarav@example.com' },
          phone: { type: 'string', example: '+919876543210' },
          role: { type: 'string', enum: ['male', 'female'], example: 'female' },
          avatar: { type: 'string', example: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330' },
          bio: { type: 'string', example: 'Love singing, music and fun conversations!' },
          age: { type: 'number', example: 22 },
          isOnline: { type: 'boolean', example: true },
          callRate: { type: 'number', example: 10 },
          coins: { type: 'number', example: 120 },
          earningsRupees: { type: 'number', example: 450.0 },
          interests: {
            type: 'array',
            items: { type: 'string' },
            example: ['Music', 'Dating', 'Late Night'],
          },
          languages: {
            type: 'array',
            items: { type: 'string' },
            example: ['Hindi', 'English'],
          },
        },
      },
      WalletSummary: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          coins: { type: 'number', example: 250 },
          earningsRupees: { type: 'number', example: 1450.5 },
          totalCalls: { type: 'number', example: 28 },
          totalTalkMinutes: { type: 'number', example: 84 },
          transactions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                type: { type: 'string', example: 'recharge' },
                amount: { type: 'number', example: 100 },
                currency: { type: 'string', example: 'COINS' },
                status: { type: 'string', example: 'completed' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
    },
  },
  paths: {
    '/': {
      get: {
        summary: 'Root API Info',
        description: 'Get service name, version, and primary endpoints.',
        tags: ['System'],
        responses: {
          200: { description: 'Service information' },
        },
      },
    },
    '/api/health': {
      get: {
        summary: 'Health Check',
        description: 'Checks backend process uptime and MongoDB connection state.',
        tags: ['System'],
        responses: {
          200: { description: 'Service is healthy and database is connected' },
          503: { description: 'Database disconnected or degraded' },
        },
      },
    },
    '/api/readiness': {
      get: {
        summary: 'Readiness Probe',
        description: 'Readiness probe for zero-downtime health checkers.',
        tags: ['System'],
        responses: {
          200: { description: 'Ready to receive traffic' },
          503: { description: 'Not ready' },
        },
      },
    },

    // ==================== MOBILE OTP SERVICE ====================
    '/api/otp/send': {
      post: {
        summary: 'Send Mobile OTP (SMS or WhatsApp)',
        description: 'Dispatches OTP to mobile number via configured SMS gateway (Fast2SMS/Twilio), personal WhatsApp gateway, or console.',
        tags: ['Mobile OTP Service'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['phone'],
                properties: {
                  phone: { type: 'string', example: '+919876543210' },
                  channel: { type: 'string', enum: ['sms', 'whatsapp'], default: 'sms' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'OTP dispatched successfully' },
          429: { description: 'Rate limit: please wait 45 seconds' },
        },
      },
    },
    '/api/otp/verify': {
      post: {
        summary: 'Verify Mobile OTP & Authenticate',
        description: 'Verifies the OTP code submitted by the user and returns JWT token & user profile.',
        tags: ['Mobile OTP Service'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['phone', 'otp'],
                properties: {
                  phone: { type: 'string', example: '+919876543210' },
                  otp: { type: 'string', example: '1234' },
                  name: { type: 'string', example: 'Pravin' },
                  role: { type: 'string', enum: ['male', 'female'], default: 'male' },
                  age: { type: 'number', example: 22 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'OTP verified, returns JWT and user profile' },
          400: { description: 'Invalid or expired OTP' },
        },
      },
    },

    // ==================== AUTH ====================
    '/api/auth/send-email-code': {
      post: {
        summary: 'Send Email Verification OTP',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'aarav@example.com' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Verification code sent (mock code: 123456 in dev/preview)' },
        },
      },
    },
    '/api/auth/verify-email': {
      post: {
        summary: 'Verify Email OTP & Login/Register',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'code'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'aarav@example.com' },
                  code: { type: 'string', example: '123456' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'User authenticated, returns JWT token & user profile' },
          400: { description: 'Invalid or expired code' },
        },
      },
    },
    '/api/auth/send-otp': {
      post: {
        summary: 'Send SMS OTP (Legacy)',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['phone'],
                properties: {
                  phone: { type: 'string', example: '+919876543210' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'SMS OTP sent (preview code: 1234)' },
        },
      },
    },
    '/api/auth/verify-otp': {
      post: {
        summary: 'Verify SMS OTP & Login',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['phone', 'otp'],
                properties: {
                  phone: { type: 'string', example: '+919876543210' },
                  otp: { type: 'string', example: '1234' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'User authenticated, returns JWT and user profile' },
          400: { description: 'Invalid OTP' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        summary: 'Get Authenticated User',
        tags: ['Authentication'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Current user profile' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/auth/profile/{id}': {
      put: {
        summary: 'Update User Profile',
        tags: ['Authentication'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'User ID',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Priya Sharma' },
                  bio: { type: 'string', example: 'Bollywood fan & late night chatter' },
                  avatar: { type: 'string' },
                  age: { type: 'number', example: 21 },
                  role: { type: 'string', enum: ['male', 'female'] },
                  interests: { type: 'array', items: { type: 'string' } },
                  languages: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Profile updated successfully' },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        summary: 'Logout User',
        tags: ['Authentication'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Logged out successfully' },
        },
      },
    },

    // ==================== USERS & MATCHING ====================
    '/api/users': {
      get: {
        summary: 'List Users & Creators',
        tags: ['Users & Matching'],
        parameters: [
          { name: 'role', in: 'query', schema: { type: 'string', enum: ['male', 'female'] }, description: 'Filter by role' },
          { name: 'isOnline', in: 'query', schema: { type: 'boolean' }, description: 'Filter by online status' },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by name or bio' },
        ],
        responses: {
          200: { description: 'List of matching users' },
        },
      },
      post: {
        summary: 'Create or Register User Profile',
        tags: ['Users & Matching'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'phone'],
                properties: {
                  name: { type: 'string', example: 'Yash Patil' },
                  phone: { type: 'string', example: '+919988776655' },
                  role: { type: 'string', enum: ['male', 'female'], default: 'male' },
                  avatar: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'User created' },
        },
      },
    },
    '/api/users/match': {
      get: {
        summary: '1-Tap Random Audio Match',
        description: 'Finds an available online opposite-role user with highest rating and lowest wait time.',
        tags: ['Users & Matching'],
        responses: {
          200: { description: 'Matched user or creator profile' },
          404: { description: 'No online users available right now' },
        },
      },
    },
    '/api/users/{id}': {
      get: {
        summary: 'Get User Profile by ID',
        tags: ['Users & Matching'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'User details' },
          404: { description: 'User not found' },
        },
      },
    },
    '/api/users/block': {
      post: {
        summary: 'Block a User',
        tags: ['Users & Matching'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['blockedUserId'],
                properties: {
                  blockedUserId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'User blocked' },
        },
      },
    },
    '/api/users/unblock': {
      post: {
        summary: 'Unblock a User',
        tags: ['Users & Matching'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['unblockedUserId'],
                properties: {
                  unblockedUserId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'User unblocked' },
        },
      },
    },
    '/api/users/blocked': {
      get: {
        summary: 'List Blocked Users',
        tags: ['Users & Matching'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Array of blocked users' },
        },
      },
    },
    '/api/users/report': {
      post: {
        summary: 'Report Inappropriate User',
        tags: ['Users & Matching'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['targetUserId', 'reason'],
                properties: {
                  targetUserId: { type: 'string' },
                  reason: { type: 'string', example: 'Harassment or abusive speech' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Report registered' },
        },
      },
    },

    // ==================== CALLS ====================
    '/api/calls/ice-servers': {
      get: {
        summary: 'Get WebRTC ICE / STUN Servers',
        tags: ['Voice Calls'],
        responses: {
          200: { description: 'STUN/TURN configuration array' },
        },
      },
    },
    '/api/calls/request': {
      post: {
        summary: 'Request 1-on-1 Voice Call',
        tags: ['Voice Calls'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['callerId', 'receiverId'],
                properties: {
                  callerId: { type: 'string' },
                  receiverId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Call initiated and broadcast to host' },
          400: { description: 'Insufficient coin balance' },
        },
      },
    },
    '/api/calls/{id}/accept': {
      post: {
        summary: 'Accept Incoming Voice Call',
        tags: ['Voice Calls'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Call accepted' },
        },
      },
    },
    '/api/calls/{id}/decline': {
      post: {
        summary: 'Decline Incoming Voice Call',
        tags: ['Voice Calls'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Call declined' },
        },
      },
    },
    '/api/calls/{id}/end': {
      post: {
        summary: 'End Voice Call & Process Billing',
        description: 'Calculates call duration, deducts coins from caller, and credits 70% INR earnings to the creator.',
        tags: ['Voice Calls'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  durationSeconds: { type: 'number', example: 185 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Call finalized with billing receipt' },
        },
      },
    },
    '/api/calls/{id}/rate': {
      post: {
        summary: 'Rate Call Experience',
        tags: ['Voice Calls'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['rating'],
                properties: {
                  rating: { type: 'number', minimum: 1, maximum: 5, example: 5 },
                  compliments: { type: 'array', items: { type: 'string' }, example: ['Polite', 'Great Voice'] },
                  feedback: { type: 'string', example: 'Awesome conversation!' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Rating recorded' },
        },
      },
    },
    '/api/calls/history': {
      get: {
        summary: 'Get Voice Call History',
        tags: ['Voice Calls'],
        parameters: [
          { name: 'userId', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Array of past voice calls' },
        },
      },
    },

    // ==================== CHATS & GIFTS ====================
    '/api/chats': {
      get: {
        summary: 'List User Chat Threads',
        tags: ['Chats & Gifts'],
        parameters: [
          { name: 'userId', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'List of active chats' },
        },
      },
    },
    '/api/chats/between/{user1}/{user2}': {
      get: {
        summary: 'Get or Create Chat Between Two Users',
        tags: ['Chats & Gifts'],
        parameters: [
          { name: 'user1', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'user2', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Chat thread' },
        },
      },
    },
    '/api/chats/{id}/messages': {
      get: {
        summary: 'Get Messages for a Chat',
        tags: ['Chats & Gifts'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Array of message objects' },
        },
      },
    },
    '/api/chats/messages': {
      post: {
        summary: 'Send Text Message or Virtual Gift',
        tags: ['Chats & Gifts'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['chatId', 'senderId', 'type'],
                properties: {
                  chatId: { type: 'string' },
                  senderId: { type: 'string' },
                  receiverId: { type: 'string' },
                  type: { type: 'string', enum: ['text', 'gift', 'audio'], example: 'text' },
                  text: { type: 'string', example: 'Hey there! How is your day?' },
                  giftName: { type: 'string', example: 'Rose' },
                  coinCost: { type: 'number', example: 20 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Message sent or gift delivered' },
          400: { description: 'Insufficient coins for gift' },
        },
      },
    },

    // ==================== WALLET & COINS ====================
    '/api/wallet/{userId}': {
      get: {
        summary: 'Get User Wallet Balance & Stats',
        tags: ['Wallet & Economy'],
        parameters: [
          { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Wallet summary',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/WalletSummary' },
              },
            },
          },
        },
      },
    },
    '/api/wallet/recharge': {
      post: {
        summary: 'Purchase Coin Pack',
        tags: ['Wallet & Economy'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userId', 'coins', 'amountRupees'],
                properties: {
                  userId: { type: 'string' },
                  coins: { type: 'number', example: 100 },
                  amountRupees: { type: 'number', example: 99 },
                  packId: { type: 'string', example: 'pack_100' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Coins added to wallet successfully' },
        },
      },
    },
    '/api/wallet/withdraw': {
      post: {
        summary: 'Withdraw Host INR Earnings to UPI',
        tags: ['Wallet & Economy'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userId', 'amount', 'upiId'],
                properties: {
                  userId: { type: 'string' },
                  amount: { type: 'number', example: 500 },
                  upiId: { type: 'string', example: 'priya@okhdfcbank' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Withdrawal initiated successfully' },
          400: { description: 'Insufficient balance or invalid UPI ID' },
        },
      },
    },
  },
};
