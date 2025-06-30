import { supabase } from './lib/supabase';
import { getAllDashboardTemplates, createDashboardViewFromTemplate } from './lib/api/dashboard';

// Test function to verify the API calls
async function testDashboardAPI() {
  try {
    // Get the current user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('No active session. Please log in first.');
      return;
    }

    const userId = session.user.id;
    console.log('Current user ID:', userId);

    // Test getting all templates
    console.log('Fetching all dashboard templates...');
    const templates = await getAllDashboardTemplates();
    console.log('Templates:', templates);

    // Test creating a view from a template
    if (templates && templates.length > 0) {
      console.log(`Creating a view from template ${templates[0].id}...`);
      const result = await createDashboardViewFromTemplate(userId, {
        templateId: templates[0].id,
        viewName: 'Test View',
        isDefault: true
      });
      console.log('Created view:', result);
    } else {
      console.log('No templates available to create a view from.');
    }
  } catch (error) {
    console.error('Error testing dashboard API:', error);
  }
}

// Export the test function
export { testDashboardAPI };
