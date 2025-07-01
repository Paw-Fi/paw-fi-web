import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { getAllDashboardTemplates, createDashboardViewFromTemplate } from './lib/api/dashboard';

export default function TestDashboardAPI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [result, setResult] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
      }
    }
    checkAuth();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const templates = await getAllDashboardTemplates();
      setTemplates(templates || []);
      console.log('Templates:', templates);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createView = async (templateId) => {
    if (!userId) {
      setError('No user logged in');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await createDashboardViewFromTemplate(userId, {
        templateId,
        viewName: 'Test View ' + new Date().toISOString(),
      });
      setResult(response);
      console.log('Created view:', response);
    } catch (err) {
      console.error('Error creating view:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Dashboard API Test</h1>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">User Status</h2>
        {userId ? (
          <div className="p-4 bg-green-100 rounded">
            <p>Logged in as: {userId}</p>
          </div>
        ) : (
          <div className="p-4 bg-red-100 rounded">
            <p>Not logged in. Please log in to test the API.</p>
          </div>
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Dashboard Templates</h2>
        <button 
          onClick={fetchTemplates}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Fetch Templates'}
        </button>
        
        {error && (
          <div className="mt-4 p-4 bg-red-100 rounded">
            <p className="text-red-700">{error}</p>
          </div>
        )}
        
        {templates.length > 0 && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">Available Templates:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map(template => (
                <div key={template.id} className="border p-4 rounded">
                  <h4 className="font-bold">{template.name}</h4>
                  <p className="text-gray-600">{template.description}</p>
                  <button
                    onClick={() => createView(template.id)}
                    disabled={loading}
                    className="mt-2 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                  >
                    Create View from Template
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {result && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">API Result</h2>
          <div className="p-4 bg-gray-100 rounded">
            <pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
