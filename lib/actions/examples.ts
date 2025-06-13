/**
 * Knowledge Base Server Actions - Usage Examples
 * 
 * This file contains practical examples of how to use the KB server actions.
 * These examples can be used as reference or adapted for your specific use cases.
 */

import {
  listKbEntries,
  getKbEntryById,
  createKbEntry,
  updateKbEntry,
  deleteKbEntry,
  searchKbEntries,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  trackKbUsage,
  getKbAnalytics,
  getArticleAnalytics,
} from './index';

/**
 * Example 1: Setting up initial categories
 */
export async function setupInitialCategories() {
  const categories = [
    {
      name: 'API Documentation',
      description: 'REST API endpoints and usage examples'
    },
    {
      name: 'Troubleshooting',
      description: 'Common issues and their solutions'
    },
    {
      name: 'How-to Guides',
      description: 'Step-by-step instructions for common tasks'
    },
    {
      name: 'Best Practices',
      description: 'Recommended approaches and patterns'
    }
  ];

  const results = [];
  for (const category of categories) {
    const result = await createCategory(category);
    if (result.success) {
      results.push(result.data);
      console.log(`Created category: ${category.name}`);
    } else {
      console.error(`Failed to create category ${category.name}:`, result.error);
    }
  }

  return results;
}

/**
 * Example 2: Creating a comprehensive KB article
 */
export async function createComprehensiveArticle(categoryId: string) {
  const articleData = {
    title: 'Complete Guide to JWT Authentication',
    content: `
# JWT Authentication Implementation Guide

## Overview
JSON Web Tokens (JWT) provide a secure way to transmit information between parties as a JSON object.

## Implementation Steps

### 1. Install Dependencies
\`\`\`bash
npm install jsonwebtoken bcryptjs
\`\`\`

### 2. Create JWT Utility Functions
\`\`\`javascript
const jwt = require('jsonwebtoken');

function generateToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}
\`\`\`

### 3. Implement Authentication Middleware
\`\`\`javascript
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}
\`\`\`

## Security Considerations
- Always use HTTPS in production
- Set appropriate token expiration times
- Store JWT secrets securely
- Implement token refresh mechanisms

## Common Issues
- **Token Expiration**: Implement refresh token logic
- **Secret Management**: Use environment variables
- **CORS Issues**: Configure CORS properly for cross-origin requests
    `,
    summary: 'Complete implementation guide for JWT authentication including code examples, security considerations, and troubleshooting tips.',
    tags: JSON.stringify(['jwt', 'authentication', 'security', 'api', 'nodejs', 'middleware']),
    categoryId
  };

  const result = await createKbEntry(articleData);
  
  if (result.success) {
    console.log('Article created successfully:', result.data.title);
    
    // Track the creation event
    await trackKbUsage({
      articleId: result.data.id,
      action: 'view',
      metadata: { source: 'creation', type: 'comprehensive_guide' }
    });
    
    return result.data;
  } else {
    console.error('Failed to create article:', result.error);
    return null;
  }
}

/**
 * Example 3: Implementing smart search functionality
 */
export async function smartSearch(query: string, options: {
  categoryId?: string;
  tags?: string[];
  limit?: number;
} = {}) {
  console.log(`Searching for: "${query}"`);
  
  // Perform the search
  const searchResult = await searchKbEntries({
    query,
    categoryId: options.categoryId,
    tags: options.tags,
    limit: options.limit || 10,
    similarityThreshold: 0.6, // Lower threshold for broader results
    useVector: true
  });

  if (searchResult.success && searchResult.data) {
    const results = searchResult.data;
    console.log(`Found ${results.length} results`);
    
    // Track search events for each result
    for (const result of results) {
      await trackKbUsage({
        articleId: result.id,
        action: 'search',
        metadata: {
          query,
          similarity: result.similarity || 0,
          position: results.indexOf(result) + 1
        }
      });
    }
    
    return results;
  } else {
    console.error('Search failed:', searchResult.error);
    return [];
  }
}

/**
 * Example 4: Article feedback and analytics
 */
export async function handleArticleFeedback(articleId: string, isHelpful: boolean, sessionId?: string) {
  const action = isHelpful ? 'helpful' : 'not_helpful';
  
  const result = await trackKbUsage({
    articleId,
    action,
    metadata: { 
      feedback: isHelpful,
      timestamp: new Date().toISOString()
    },
    sessionId
  });

  if (result.success) {
    console.log(`Feedback recorded: ${action} for article ${articleId}`);
    
    // Get updated analytics for the article
    const analytics = await getArticleAnalytics(articleId);
    if (analytics.success) {
      const { summary } = analytics.data.analytics;
      console.log(`Article stats - Views: ${summary.totalViews}, Helpful: ${summary.helpfulVotes}, Not Helpful: ${summary.notHelpfulVotes}`);
    }
    
    return result.data;
  } else {
    console.error('Failed to record feedback:', result.error);
    return null;
  }
}

/**
 * Example 5: Analytics dashboard data
 */
export async function getDashboardAnalytics(days: number = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const endDate = new Date();
  
  const analyticsResult = await getKbAnalytics({
    startDate,
    endDate,
    limit: 1000
  });

  if (analyticsResult.success) {
    const analytics = analyticsResult.data;
    
    // Process the data for dashboard display
    const dashboardData = {
      overview: {
        totalViews: analytics.summary.totalViews,
        totalSearches: analytics.summary.totalSearches,
        helpfulnessRatio: Math.round(analytics.summary.helpfulnessRatio * 100),
        totalFeedback: analytics.summary.helpfulVotes + analytics.summary.notHelpfulVotes
      },
      topArticles: analytics.topArticles.slice(0, 5).map((article: any) => ({
        title: article.articleTitle,
        views: article.viewCount,
        id: article.articleId
      })),
      dailyTrends: analytics.usageTrends.reduce((acc: any, trend: any) => {
        if (!acc[trend.date]) {
          acc[trend.date] = { date: trend.date, views: 0, searches: 0 };
        }
        if (trend.action === 'view') acc[trend.date].views = trend.count;
        if (trend.action === 'search') acc[trend.date].searches = trend.count;
        return acc;
      }, {}),
      recentActivity: analytics.recentActivity.slice(0, 10)
    };
    
    console.log('Dashboard analytics generated successfully');
    return dashboardData;
  } else {
    console.error('Failed to get analytics:', analyticsResult.error);
    return null;
  }
}

/**
 * Example 6: Bulk operations
 */
export async function bulkUpdateArticles(updates: Array<{
  id: string;
  title?: string;
  content?: string;
  summary?: string;
  tags?: string;
  categoryId?: string;
}>) {
  const results = [];
  
  for (const update of updates) {
    const result = await updateKbEntry(update);
    results.push({
      id: update.id,
      success: result.success,
      error: result.error,
      data: result.data
    });
    
    if (result.success) {
      console.log(`Updated article: ${update.id}`);
    } else {
      console.error(`Failed to update article ${update.id}:`, result.error);
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  console.log(`Bulk update completed: ${successCount}/${updates.length} successful`);
  
  return results;
}

/**
 * Example 7: Category management with validation
 */
export async function manageCategories() {
  // List existing categories
  const categoriesResult = await listCategories();
  if (!categoriesResult.success) {
    console.error('Failed to list categories:', categoriesResult.error);
    return;
  }
  
  const existingCategories = categoriesResult.data || [];
  console.log(`Found ${existingCategories.length} existing categories`);
  
  // Create a new category if it doesn't exist
  const newCategoryName = 'Integration Guides';
  const existingCategory = existingCategories.find(cat => cat.name === newCategoryName);
  
  if (!existingCategory) {
    const createResult = await createCategory({
      name: newCategoryName,
      description: 'Third-party integration guides and examples'
    });
    
    if (createResult.success) {
      console.log(`Created new category: ${newCategoryName}`);
      return createResult.data;
    } else {
      console.error(`Failed to create category: ${createResult.error}`);
    }
  } else {
    console.log(`Category "${newCategoryName}" already exists`);
    return existingCategory;
  }
}

/**
 * Example 8: Error handling patterns
 */
export async function robustArticleCreation(articleData: any) {
  try {
    // Validate category exists first
    const categoriesResult = await listCategories();
    if (!categoriesResult.success) {
      throw new Error('Failed to validate categories');
    }
    
    const categoryExists = categoriesResult.data?.some(cat => cat.id === articleData.categoryId) || false;
    if (!categoryExists) {
      throw new Error('Invalid category ID');
    }
    
    // Create the article
    const createResult = await createKbEntry(articleData);
    if (!createResult.success) {
      throw new Error(`Article creation failed: ${createResult.error}`);
    }
    
    // Track the creation
    const trackResult = await trackKbUsage({
      articleId: createResult.data.id,
      action: 'view',
      metadata: { source: 'api_creation' }
    });
    
    if (!trackResult.success) {
      console.warn('Failed to track article creation:', trackResult.error);
      // Don't fail the entire operation for tracking issues
    }
    
    return {
      success: true,
      article: createResult.data,
      tracked: trackResult.success
    };
    
  } catch (error) {
    console.error('Robust article creation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}