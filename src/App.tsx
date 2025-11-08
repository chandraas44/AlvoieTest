import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import ExpenseSubmissions from './components/ExpenseSubmissions';
import type { User } from '@supabase/supabase-js';

type Page = 'dashboard' | 'expenses';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (currentPage === 'expenses') {
    return (
      <ExpenseSubmissions
        user={user}
        onNavigateHome={() => setCurrentPage('dashboard')}
      />
    );
  }

  return (
    <Dashboard
      user={user}
      onNavigateToExpenses={() => setCurrentPage('expenses')}
    />
  );
}

export default App;
