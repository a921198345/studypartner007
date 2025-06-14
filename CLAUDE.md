# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Law Exam Assistant application (法考助手) built with Next.js 14, designed to help Chinese law students prepare for their legal qualification exams. The application uses AI-powered features to provide intelligent Q&A, knowledge maps, and exam practice.

## Key Architecture

### Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **UI Components**: Radix UI, Shadcn/ui components, Ant Design
- **State Management**: Zustand for chat state, Redux for legacy features
- **Backend**: Next.js API routes
- **Database**: MySQL (via mysql2)
- **AI Integration**: DeepSeek API for embeddings and chat
- **Authentication**: NextAuth.js with JWT
- **Deployment**: Configured for Baota Panel (宝塔面板) deployment

### Project Structure
- `/app` - Next.js 14 App Router pages and API routes
- `/components` - Reusable UI components organized by feature
- `/lib` - Core utilities, database connections, and API services
- `/hooks` - Custom React hooks
- `/public` - Static assets
- `/scripts` - Database initialization and utility scripts

## Development Commands

```bash
# Install dependencies
npm install

# Start development server with API key
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Initialize database
npm run init-db

# Run database migrations
npm run migrate

# Seed test data
npm run seed-data

# Test authentication
npm run test-auth

# Lint code (errors ignored in build)
npm run lint
```

## Environment Configuration

Create a `.env.local` file with:
```env
# DeepSeek API (required for AI features)
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_API_URL=https://api.openai.com/v1/embeddings

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=law_user
DB_PASSWORD=your_password
DB_NAME=law_exam_assistant

# NextAuth (for authentication)
NEXTAUTH_SECRET=your_secret_here
NEXTAUTH_URL=http://localhost:3000
```

## Critical Implementation Notes

### MySQL 5.7.18 Compatibility
- Avoid MySQL 8.0+ specific JSON functions
- Handle JSON data in JavaScript, not database queries
- Ensure binary data is properly converted to Buffer types

### Cross-Origin & Deployment
- All features must work both locally and on Baota Panel
- Ensure CORS is properly configured for all API routes
- Use absolute paths in production deployments

### Coding Standards
- Variable naming: Use underscore_case for variables
- Path naming: Use lowercase with hyphens for routes
- Always handle errors gracefully with user-friendly messages
- Follow existing patterns in the codebase

### AI Chat Implementation
The AI chat feature (`/app/ai-chat`) uses:
- Streaming responses via Server-Sent Events
- Message history stored in Zustand store
- Keyword extraction for knowledge map integration
- Save to notes functionality

### Question Bank System
- Questions stored in MySQL with proper indexing
- Support for multiple subjects (民法, 刑法, 行政法, etc.)
- Answer history tracking per user session
- Favorite questions functionality

### Knowledge Map Integration
- Mind maps use D3.js for visualization
- Searchable nodes with keyword highlighting
- Dynamic loading based on user permissions
- Integration with AI chat for context-aware responses

## Common Tasks

### Adding a New API Route
1. Create route file in `/app/api/[feature]/route.js`
2. Use consistent error handling pattern
3. Implement proper authentication checks
4. Add CORS headers if needed

### Working with the Database
- Use connection pool from `/lib/db.js`
- Always use parameterized queries
- Handle connection errors gracefully
- Use transactions for multi-step operations

### Debugging AI Features
- Check DeepSeek API key is valid
- Monitor API rate limits
- Use mock embeddings for testing (see env.example)
- Check `/lib/deepseek.js` for API integration

### Deployment Checklist
1. Update environment variables for production
2. Run database migrations
3. Build the application
4. Test all features work cross-origin
5. Verify Baota Panel nginx configuration

## Known Issues & Solutions

### Streaming Response Issues
- The app uses custom streaming implementation in `/app/api/ai/ask/stream/route.ts`
- Ensure proper cleanup of event streams
- Handle connection timeouts gracefully

### Database Connection Timeouts
- Connection timeout set to 30 seconds
- Use connection pooling with limit of 10
- Implement retry logic for critical operations

### File Upload Handling
- Question uploads support .docx format
- Files are parsed using Python scripts
- Temporary files stored in `/uploads` directory
- Clean up temporary files after processing