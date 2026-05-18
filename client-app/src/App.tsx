import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Services from './pages/Services';
import Store from './pages/Store';
import Profile from './pages/Profile';
import ClientOnboarding from './pages/ClientOnboarding';
import Layout from './components/Layout';

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const checkOnboarding = async (user: any) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single();
      
      if (profile && !profile.onboarding_completed) {
        setShowOnboarding(true);
      } else {
        setShowOnboarding(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        checkOnboarding(session.user);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        checkOnboarding(session.user);
      } else {
        setShowOnboarding(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#e8e2d4] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-magenta-500/20 border-t-magenta-500 rounded-full animate-spin shadow-[0_0_15px_rgba(236,_72,_153,_0.3)]"></div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  if (showOnboarding) {
    return <ClientOnboarding user={session.user} onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onLogout={handleLogout}
      user={session.user}
    >
      {activeTab === 'dashboard' && <Dashboard user={session.user} setActiveTab={setActiveTab} />}
      {activeTab === 'services' && <Services clientId={session.user.id} />}
      {activeTab === 'store' && <Store />}
      {activeTab === 'profile' && <Profile user={session.user} onLogout={handleLogout} />}
    </Layout>
  );
}

export default App;
