'use server';

import { auth } from '@/app/(auth)/auth';
import { 
  createKnowledgeBaseCategory,
  getKnowledgeBaseCategories,
} from '@/lib/db/kb-queries';

export async function createDefaultCategories() {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const existingCategories = await getKnowledgeBaseCategories();
  
  if (existingCategories.length === 0) {
    const defaultCategories = [
      {
        name: 'Troubleshooting',
        description: 'Common issues and their solutions',
      },
      {
        name: 'How-to Guides',
        description: 'Step-by-step instructions for common tasks',
      },
      {
        name: 'API Documentation',
        description: 'API endpoints and usage examples',
      },
      {
        name: 'System Configuration',
        description: 'Configuration guides and best practices',
      },
      {
        name: 'FAQ',
        description: 'Frequently asked questions',
      },
    ];

    for (const category of defaultCategories) {
      await createKnowledgeBaseCategory(category);
    }
  }

  return await getKnowledgeBaseCategories();
}