import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import AdAccountDetail from './components/AdAccountDetail';
import AdAnalyzer from './components/AdAnalyzer';
import SingleAdAnalyzer from './components/SingleAdAnalyzer';
import MetaDashboard from './components/MetaDashboard';
import GoogleDashboard from './components/GoogleDashboard';
import GoogleCampaigns from './components/GoogleCampaigns';
import GooglePerformance from './components/GooglePerformance';
import GoogleInsights from './components/GoogleInsights';
import YoutubeAds from './components/YoutubeAds';
import YoutubeAdDetail from './components/YoutubeAdDetail';
import Overview from './components/Overview';
import WhatsAppManager from './components/whatsapp/WhatsAppManager';
import WATemplates from './components/whatsapp/WATemplates';
import SendMessage from './components/whatsapp/SendMessage';
import WAContacts from './components/whatsapp/WAContacts';
import WAChannels from './components/whatsapp/WAChannels';
import WATemplateBuilder from './components/whatsapp/WATemplateBuilder';
import WAAnalytics from './components/whatsapp/WAAnalytics';
import WACampaigns from './components/whatsapp/WACampaigns';
import WASchedules from './components/whatsapp/WASchedules';
import UserManagement from './components/UserManagement';
import AllLeads from './components/AllLeads';
import LinkedInManager from './components/linkedin/LinkedInManager';
import LinkedInCampaigns from './components/linkedin/LinkedInCampaigns';
import LinkedInAnalytics from './components/linkedin/LinkedInAnalytics';
import LinkedInLeads from './components/linkedin/LinkedInLeads';
import MetaSettings from './components/MetaSettings';
import WhatsAppSettings from './components/WhatsAppSettings';
import AdOwner from './components/AdOwner';
import TaskManager from './components/TaskManager';
import './App.css';

import Layout from './components/Layout';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-[#0f172a]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
    );
    if (!user) return <Navigate to="/login" />;
    return <Layout>{children}</Layout>;
};

const PermissionRoute = ({ children, permission }) => {
    const { user, loading } = useAuth();
    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-[#0f172a]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
    );
    if (!user) return <Navigate to="/login" />;

    let hasAccess = false;
    if (user?.role === 'admin') {
        hasAccess = true;
    } else if (permission === 'admin') {
        hasAccess = false;
    } else if (permission && (user?.[permission] === 1 || user?.[permission] === true)) {
        hasAccess = true;
    }

    if (!hasAccess) {
        return <Navigate to="/" replace />;
    }

    return children;
};

const ManagerOrAdminRoute = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-[#0f172a]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
    );
    if (!user) return <Navigate to="/login" />;

    if (user?.role === 'admin' || user?.role === 'manager') {
        return children;
    }
    return <Navigate to="/" replace />;
};

import { ThemeProvider } from './context/ThemeContext';

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <Router>
                    <Routes>
                        <Route 
                            path="/" 
                            element={
                                <ProtectedRoute>
                                    <Overview />
                                </ProtectedRoute>
                            } 
                        />
                        <Route 
                            path="/ad-accounts" 
                            element={
                                <ProtectedRoute>
                                    <PermissionRoute permission="meta_access">
                                        <Dashboard />
                                    </PermissionRoute>
                                </ProtectedRoute>
                            } 
                        />
                        <Route 
                            path="/ad-account/:id" 
                            element={
                                <ProtectedRoute>
                                    <PermissionRoute permission="meta_access">
                                        <AdAccountDetail />
                                    </PermissionRoute>
                                </ProtectedRoute>
                            } 
                        />
                        <Route 
                            path="/ad-analyzer" 
                            element={
                                <ProtectedRoute>
                                    <PermissionRoute permission="meta_access">
                                        <AdAnalyzer />
                                    </PermissionRoute>
                                </ProtectedRoute>
                            } 
                        />
                        <Route 
                            path="/single-ad-analyzer" 
                            element={
                                <ProtectedRoute>
                                    <PermissionRoute permission="meta_access">
                                        <SingleAdAnalyzer />
                                    </PermissionRoute>
                                </ProtectedRoute>
                            } 
                        />
                        <Route 
                            path="/insights" 
                            element={
                                <ProtectedRoute>
                                    <PermissionRoute permission="meta_access">
                                        <MetaDashboard />
                                    </PermissionRoute>
                                </ProtectedRoute>
                            } 
                        />
                        <Route 
                            path="/google-dashboard" 
                            element={
                                <ProtectedRoute>
                                    <PermissionRoute permission="google_access">
                                        <GoogleDashboard />
                                    </PermissionRoute>
                                </ProtectedRoute>
                            } 
                        />
                        <Route 
                            path="/google-campaigns" 
                            element={
                                <ProtectedRoute>
                                    <PermissionRoute permission="google_access">
                                        <GoogleCampaigns />
                                    </PermissionRoute>
                                </ProtectedRoute>
                            } 
                        />
                        <Route 
                            path="/google-performance" 
                            element={
                                <ProtectedRoute>
                                    <PermissionRoute permission="google_access">
                                        <GooglePerformance />
                                    </PermissionRoute>
                                </ProtectedRoute>
                            } 
                        />
                        <Route 
                            path="/google-insights" 
                            element={
                                <ProtectedRoute>
                                    <PermissionRoute permission="google_access">
                                        <GoogleInsights />
                                    </PermissionRoute>
                                </ProtectedRoute>
                            } 
                        />
                        <Route 
                            path="/youtube-ads" 
                            element={
                                <ProtectedRoute>
                                    <PermissionRoute permission="google_access">
                                        <YoutubeAds />
                                    </PermissionRoute>
                                </ProtectedRoute>
                            } 
                        />
                        <Route 
                            path="/youtube-ad/:id" 
                            element={
                                <ProtectedRoute>
                                    <PermissionRoute permission="google_access">
                                        <YoutubeAdDetail />
                                    </PermissionRoute>
                                </ProtectedRoute>
                            } 
                        />
                        <Route 
                            path="/whatsapp-manager" 
                            element={
                                <ProtectedRoute>
                                    <PermissionRoute permission="whatsapp_access">
                                        <WhatsAppManager />
                                    </PermissionRoute>
                                </ProtectedRoute>
                            } 
                        />
                        <Route 
                            path="/wa-channels" 
                            element={
                                <ProtectedRoute>
                                    <PermissionRoute permission="whatsapp_access">
                                        <WAChannels />
                                    </PermissionRoute>
                                </ProtectedRoute>
                            } 
                        />
                        <Route 
                            path="/wa-templates" 
                            element={
                                <ProtectedRoute>
                                    <PermissionRoute permission="whatsapp_access">
                                        <WATemplates />
                                    </PermissionRoute>
                                </ProtectedRoute>
                            } 
                        />
                        <Route 
                            path="/wa-templates/new" 
                            element={
                                <ProtectedRoute>
                                    <PermissionRoute permission="whatsapp_access">
                                        <WATemplateBuilder />
                                    </PermissionRoute>
                                </ProtectedRoute>
                            } 
                        />
                        <Route 
                            path="/wa-analytics" 
                            element={
                                <ProtectedRoute>
                                    <PermissionRoute permission="whatsapp_access">
                                        <WAAnalytics />
                                    </PermissionRoute>
                                </ProtectedRoute>
                            } 
                        />
                        <Route 
                            path="/send-message" 
                            element={
                                <ProtectedRoute>
                                    <PermissionRoute permission="whatsapp_access">
                                        <SendMessage />
                                    </PermissionRoute>
                                </ProtectedRoute>
                            } 
                        />
                        <Route 
                            path="/wa-contacts" 
                            element={
                                <ProtectedRoute>
                                    <PermissionRoute permission="whatsapp_access">
                                        <WAContacts />
                                    </PermissionRoute>
                                </ProtectedRoute>
                            } 
                        />
                        <Route 
                            path="/wa-campaigns" 
                            element={
                                <ProtectedRoute>
                                    <PermissionRoute permission="whatsapp_access">
                                        <WACampaigns />
                                    </PermissionRoute>
                                </ProtectedRoute>
                            } 
                        />
                        <Route 
                            path="/wa-schedules" 
                            element={
                                <ProtectedRoute>
                                    <PermissionRoute permission="whatsapp_access">
                                        <WASchedules />
                                    </PermissionRoute>
                                </ProtectedRoute>
                            } 
                        />
                        <Route 
                            path="/users" 
                            element={
                                <ProtectedRoute>
                                    <ManagerOrAdminRoute>
                                        <UserManagement />
                                    </ManagerOrAdminRoute>
                                </ProtectedRoute>
                            } 
                        />
                        <Route 
                            path="/settings/meta" 
                            element={
                                <ProtectedRoute>
                                    <PermissionRoute permission="admin">
                                        <MetaSettings />
                                    </PermissionRoute>
                                </ProtectedRoute>
                            } 
                        />
                        <Route 
                            path="/settings/whatsapp" 
                            element={
                                <ProtectedRoute>
                                    <PermissionRoute permission="admin">
                                        <WhatsAppSettings />
                                    </PermissionRoute>
                                </ProtectedRoute>
                            } 
                        />
                        <Route 
                            path="/all-leads" 
                            element={
                                <ProtectedRoute>
                                    <PermissionRoute permission="meta_access">
                                        <AllLeads />
                                    </PermissionRoute>
                                </ProtectedRoute>
                            } 
                        />
                        <Route 
                            path="/ad-owners" 
                            element={
                                <ProtectedRoute>
                                    <PermissionRoute permission="meta_access">
                                        <AdOwner />
                                    </PermissionRoute>
                                </ProtectedRoute>
                            } 
                        />
                        <Route 
                            path="/tasks" 
                            element={
                                <ProtectedRoute>
                                    <TaskManager />
                                </ProtectedRoute>
                            } 
                        />
                        <Route 
                            path="/linkedin-manager" 
                            element={
                                <ProtectedRoute>
                                    <PermissionRoute permission="linkedin_access">
                                        <LinkedInManager />
                                    </PermissionRoute>
                                </ProtectedRoute>
                            } 
                        />
                        <Route 
                            path="/linkedin-campaigns" 
                            element={
                                <ProtectedRoute>
                                    <PermissionRoute permission="linkedin_access">
                                        <LinkedInCampaigns />
                                    </PermissionRoute>
                                </ProtectedRoute>
                            } 
                        />
                        <Route 
                            path="/linkedin-analytics" 
                            element={
                                <ProtectedRoute>
                                    <PermissionRoute permission="linkedin_access">
                                        <LinkedInAnalytics />
                                    </PermissionRoute>
                                </ProtectedRoute>
                            } 
                        />
                        <Route 
                            path="/linkedin-leads" 
                            element={
                                <ProtectedRoute>
                                    <PermissionRoute permission="linkedin_access">
                                        <LinkedInLeads />
                                    </PermissionRoute>
                                </ProtectedRoute>
                            } 
                        />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                    </Routes>
                </Router>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
