import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut 
} from 'firebase/auth';
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    query, 
    where, 
    getDocs,
    onSnapshot
} from 'firebase/firestore';

// --- IMPORTANT: YOUR FIREBASE CONFIG IS PASTED HERE ---
const firebaseConfig = {
  apiKey: "AIzaSyDnoNV3izJ9X4TwrogvMSlbihCkdRZ5oSE",
  authDomain: "ai-sales-manger.firebaseapp.com",
  projectId: "ai-sales-manger",
  storageBucket: "ai-sales-manger.firebasestorage.app",
  messagingSenderId: "904811391901",
  appId: "1:904811391901:web:e9c02c892746e478f95d74",
  measurementId: "G-EZ7W0PSNNG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Helper Function & Data ---
const getWorkingDays = (startDate, endDate) => {
    let count = 0;
    const curDate = new Date(startDate.getTime());
    while (curDate <= endDate) {
        const dayOfWeek = curDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
        curDate.setDate(curDate.getDate() + 1);
    }
    return count;
};

const ALL_ROLES_CONFIG = {
    salesperson: {
        title: "Salesperson",
        dailyGoals: { calls: 30, texts: 30, appointmentsSet: 10, facebookPosts: 10, tiktokVideos: 1, carsSold: 2 }
    },
    serviceWriter: {
        title: "Service Writer",
        dailyGoals: { customerCars: 1, lotCars: 3, lotCarGross: 1000, techEfficiency: 90, csiScore: 95, eodTransfer: 1 }
    },
    documentSpecialist: {
        title: "Document Specialist",
        dailyGoals: { bdcCalls: 30, dealsReworked: 5, dealsCaptured: 1, googleReviews: 1, backendSoldPercent: 50, facebookPosts: 10 }
    }
};

// --- Main App Component ---
const App = () => {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' or 'leaderboard'

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
            if (authUser) {
                const userDocRef = doc(db, "users", authUser.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    setUserData(userDocSnap.data());
                }
                setUser(authUser);
            } else {
                setUser(null);
                setUserData(null);
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen bg-gray-100"><div className="text-xl font-semibold">Loading...</div></div>;
    }

    const renderDashboard = () => {
        if (currentView === 'leaderboard') {
            return <LeaderboardDashboard setCurrentView={setCurrentView} />;
        }
        
        const role = userData?.role;
        switch (role) {
            case 'manager': return <ManagerDashboard user={user} setCurrentView={setCurrentView} />;
            case 'salesperson': return <GenericDashboard user={user} roleConfig={ALL_ROLES_CONFIG.salesperson} setCurrentView={setCurrentView} />;
            case 'serviceWriter': return <GenericDashboard user={user} roleConfig={ALL_ROLES_CONFIG.serviceWriter} setCurrentView={setCurrentView} />;
            case 'documentSpecialist': return <GenericDashboard user={user} roleConfig={ALL_ROLES_CONFIG.documentSpecialist} setCurrentView={setCurrentView} />;
            default: return <LoginPage />;
        }
    };

    return <div>{!user ? <LoginPage /> : renderDashboard()}</div>;
};

// --- Login/Signup Page ---
const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [isSignup, setIsSignup] = useState(false);
    const [role, setRole] = useState('salesperson');
    const [error, setError] = useState('');

    const handleAuth = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (isSignup) {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await setDoc(doc(db, "users", userCredential.user.uid), { 
                    email: userCredential.user.email, 
                    role: role,
                    firstName: firstName,
                    lastName: lastName
                });
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
            <div className="bg-white shadow-md rounded-lg p-8 max-w-md w-full">
                <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">{isSignup ? 'Create Account' : 'Welcome Back'}</h1>
                {error && <p className="text-red-500 text-center mb-4">{error}</p>}
                <form onSubmit={handleAuth}>
                    {isSignup && (
                        <>
                            <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First Name" className="w-full p-3 mb-4 border rounded-md" required />
                            <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last Name" className="w-full p-3 mb-4 border rounded-md" required />
                        </>
                    )}
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full p-3 mb-4 border rounded-md" required />
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full p-3 mb-4 border rounded-md" required />
                    {isSignup && (
                        <select value={role} onChange={e => setRole(e.target.value)} className="w-full p-3 mb-4 border rounded-md bg-white">
                            <option value="salesperson">Salesperson</option>
                            <option value="serviceWriter">Service Writer</option>
                            <option value="documentSpecialist">Document Specialist</option>
                            <option value="manager">Manager</option>
                        </select>
                    )}
                    <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 font-semibold">{isSignup ? 'Sign Up' : 'Log In'}</button>
                </form>
                <button onClick={() => setIsSignup(!isSignup)} className="w-full mt-4 text-center text-blue-600 hover:underline">
                    {isSignup ? 'Already have an account? Log In' : 'Need an account? Sign Up'}
                </button>
            </div>
        </div>
    );
};

// --- Generic Dashboard for All Roles ---
const GenericDashboard = ({ user, roleConfig, setCurrentView }) => {
    const [view, setView] = useState('today');
    const [kpis, setKpis] = useState({});
    const [goals, setGoals] = useState({});
    const [isChatbotOpen, setIsChatbotOpen] = useState(true);

    useEffect(() => {
        const today = new Date();
        let startDate, endDate;
        if (view === 'today') {
            startDate = new Date(today); startDate.setHours(0,0,0,0);
            endDate = new Date(today); endDate.setHours(23,59,59,999);
        } else if (view === 'month') {
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today);
        } else {
            startDate = new Date(today.getFullYear(), 0, 1);
            endDate = new Date(today);
        }
        
        const numWorkingDays = view === 'today' ? 1 : getWorkingDays(startDate, endDate);
        const periodGoals = {};
        Object.keys(roleConfig.dailyGoals).forEach(key => {
            periodGoals[key] = roleConfig.dailyGoals[key] * numWorkingDays;
        });
        setGoals(periodGoals);

        const q = query(collection(db, "kpis"), where("userId", "==", user.uid));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const aggregatedKpis = {};
            querySnapshot.forEach((doc) => {
                const docDate = new Date(doc.data().date + 'T00:00:00');
                if (docDate >= startDate && docDate <= endDate) {
                    const data = doc.data().kpiData;
                    Object.keys(data).forEach(key => {
                        aggregatedKpis[key] = (aggregatedKpis[key] || 0) + (data[key] || 0);
                    });
                }
            });
            setKpis(aggregatedKpis);
        });
        return () => unsubscribe();
    }, [user.uid, view, roleConfig.dailyGoals]);

    const updateKpi = async (kpi, value) => {
        if (view !== 'today') return;
        const todayStr = new Date().toISOString().slice(0, 10);
        const kpiDocRef = doc(db, "kpis", `${user.uid}_${todayStr}`);
        const docSnap = await getDoc(kpiDocRef);
        const existingKpis = docSnap.exists() ? docSnap.data().kpiData : {};
        const updatedKpis = { ...existingKpis, [kpi]: value };
        await setDoc(kpiDocRef, { userId: user.uid, date: todayStr, kpiData: updatedKpis }, { merge: true });
    };

    return (
        <div className="bg-gray-100 min-h-screen font-sans">
            <header className="bg-white shadow-md">
                <div className="container mx-auto px-4 py-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">{roleConfig.title} KPI Tracker</h1>
                    </div>
                    <div>
                        <button onClick={() => setCurrentView('leaderboard')} className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 mr-4">Monthly Leaderboard</button>
                        <button onClick={() => signOut(auth)} className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600">Log Out</button>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-8">
                <ViewSelector view={view} setView={setView} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                    {Object.keys(roleConfig.dailyGoals).map(key => (
                         <KpiCard key={key} title={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} value={kpis[key] || 0} goal={goals[key] || 0} onUpdate={(value) => updateKpi(key, value)} isEditable={view === 'today'} kpiKey={key} allKpis={kpis} />
                    ))}
                </div>
            </main>
            <button onClick={() => setIsChatbotOpen(p => !p)} className="fixed bottom-8 right-8 bg-blue-600 text-white p-4 rounded-full shadow-lg z-30"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg></button>
            {isChatbotOpen && <AiChatbot onClose={() => setIsChatbotOpen(false)} kpis={kpis} kpiGoals={goals} />}
        </div>
    );
};

// --- Manager Dashboard ---
const ManagerDashboard = ({ user, setCurrentView }) => {
    const [view, setView] = useState('today');
    const [teamData, setTeamData] = useState({ sales: [], service: [], docs: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [aiBriefing, setAiBriefing] = useState("Analyzing team performance...");

    useEffect(() => {
        const fetchAndAnalyzeData = async () => {
            setIsLoading(true);
            const today = new Date();
            let startDate, endDate;
            if (view === 'today') {
                startDate = new Date(today); startDate.setHours(0,0,0,0);
                endDate = new Date(today); endDate.setHours(23,59,59,999);
            } else if (view === 'month') {
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today);
            } else {
                startDate = new Date(today.getFullYear(), 0, 1);
                endDate = new Date(today);
            }
            
            const usersQuery = query(collection(db, "users"));
            const usersSnapshot = await getDocs(usersQuery);
            const allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const kpisQuery = collection(db, "kpis");
            const kpisSnapshot = await getDocs(kpisQuery);
            const aggregatedKpis = {};
            kpisSnapshot.forEach(doc => {
                const data = doc.data();
                const docDate = new Date(data.date + 'T00:00:00');
                if (docDate >= startDate && docDate <= endDate) {
                    if (!aggregatedKpis[data.userId]) aggregatedKpis[data.userId] = {};
                    Object.keys(data.kpiData).forEach(key => {
                        aggregatedKpis[data.userId][key] = (aggregatedKpis[data.userId][key] || 0) + (data.kpiData[key] || 0);
                    });
                }
            });
            
            const finalTeamData = { sales: [], service: [], docs: [] };
            allUsers.filter(u => u.role !== 'manager').forEach(user => {
                const roleConfig = ALL_ROLES_CONFIG[user.role];
                if (!roleConfig) return;

                const numWorkingDays = view === 'today' ? 1 : getWorkingDays(startDate, endDate);
                const periodGoals = {};
                Object.keys(roleConfig.dailyGoals).forEach(key => { periodGoals[key] = roleConfig.dailyGoals[key] * numWorkingDays; });

                const kpis = aggregatedKpis[user.id] || {};
                let totalGoal = Object.values(periodGoals).reduce((sum, goal) => sum + goal, 0);
                if (user.role === 'documentSpecialist' && (kpis.dealsCaptured || 0) === 0) {
                    totalGoal -= periodGoals.backendSoldPercent;
                }
                const totalCompleted = Object.keys(periodGoals).reduce((sum, key) => sum + Math.min(kpis[key] || 0, periodGoals[key]), 0);
                const completionPercentage = totalGoal > 0 ? Math.round((totalCompleted / totalGoal) * 100) : 0;
                const userData = { ...user, kpis, completionPercentage };

                if (user.role === 'salesperson') finalTeamData.sales.push(userData);
                else if (user.role === 'serviceWriter') finalTeamData.service.push(userData);
                else if (user.role === 'documentSpecialist') finalTeamData.docs.push(userData);
            });

            setTeamData(finalTeamData);
            setIsLoading(false);
        };
        fetchAndAnalyzeData();
    }, [view]);

    return (
        <div className="bg-gray-100 min-h-screen font-sans">
            <header className="bg-white shadow-md">
                <div className="container mx-auto px-4 py-6 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-800">Manager Dashboard</h1>
                     <div>
                        <button onClick={() => setCurrentView('leaderboard')} className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 mr-4">Monthly Leaderboard</button>
                        <button onClick={() => signOut(auth)} className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600">Log Out</button>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-8 space-y-8">
                <ViewSelector view={view} setView={setView} />
                <div className="space-y-8">
                    <TeamPerformanceSection title="Sales Team" data={teamData.sales} />
                    <TeamPerformanceSection title="Service Writers" data={teamData.service} />
                    <TeamPerformanceSection title="Document Specialists" data={teamData.docs} />
                </div>
            </main>
        </div>
    );
};

// --- New Leaderboard Dashboard ---
const LeaderboardDashboard = ({ setCurrentView }) => {
    const [leaderboardData, setLeaderboardData] = useState({ topPerformer: null, topSalesperson: null, totalCarsSold: 0, salesRace: [] });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboardData = async () => {
            setIsLoading(true);
            const today = new Date();
            const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            const endDate = new Date(today);

            const usersQuery = query(collection(db, "users"));
            const usersSnapshot = await getDocs(usersQuery);
            const allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const kpisQuery = collection(db, "kpis");
            const kpisSnapshot = await getDocs(kpisQuery);
            const aggregatedKpis = {};
            kpisSnapshot.forEach(doc => {
                const data = doc.data();
                const docDate = new Date(data.date + 'T00:00:00');
                if (docDate >= startDate && docDate <= endDate) {
                    if (!aggregatedKpis[data.userId]) aggregatedKpis[data.userId] = {};
                    Object.keys(data.kpiData).forEach(key => {
                        aggregatedKpis[data.userId][key] = (aggregatedKpis[data.userId][key] || 0) + (data.kpiData[key] || 0);
                    });
                }
            });

            const processedData = allUsers.filter(u => u.role !== 'manager').map(user => {
                const roleConfig = ALL_ROLES_CONFIG[user.role];
                if (!roleConfig) return null;
                const numWorkingDays = getWorkingDays(startDate, endDate);
                const periodGoals = {};
                Object.keys(roleConfig.dailyGoals).forEach(key => { periodGoals[key] = roleConfig.dailyGoals[key] * numWorkingDays; });
                const kpis = aggregatedKpis[user.id] || {};
                let totalGoal = Object.values(periodGoals).reduce((sum, goal) => sum + goal, 0);
                if (user.role === 'documentSpecialist' && (kpis.dealsCaptured || 0) === 0) {
                    totalGoal -= periodGoals.backendSoldPercent;
                }
                const totalCompleted = Object.keys(periodGoals).reduce((sum, key) => sum + Math.min(kpis[key] || 0, periodGoals[key]), 0);
                const completionPercentage = totalGoal > 0 ? Math.round((totalCompleted / totalGoal) * 100) : 0;
                return { ...user, kpis, completionPercentage };
            }).filter(Boolean);

            const topPerformer = processedData.sort((a, b) => b.completionPercentage - a.completionPercentage)[0] || null;
            const salesTeam = processedData.filter(u => u.role === 'salesperson');
            const topSalesperson = salesTeam.sort((a, b) => (b.kpis.carsSold || 0) - (a.kpis.carsSold || 0))[0] || null;
            const totalCarsSold = salesTeam.reduce((sum, sp) => sum + (sp.kpis.carsSold || 0), 0);
            const salesRace = salesTeam.sort((a, b) => (b.kpis.carsSold || 0) - (a.kpis.carsSold || 0));

            setLeaderboardData({ topPerformer, topSalesperson, totalCarsSold, salesRace });
            setIsLoading(false);
        };
        fetchLeaderboardData();
    }, []);

    return (
        <div className="bg-gray-100 min-h-screen font-sans">
            <header className="bg-white shadow-md">
                <div className="container mx-auto px-4 py-6 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-800">Monthly Leaderboard</h1>
                    <button onClick={() => setCurrentView('dashboard')} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Back to Dashboard</button>
                </div>
            </header>
            <main className="container mx-auto px-4 py-8 space-y-8">
                {isLoading ? <p>Loading leaderboard...</p> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <LeaderboardCard title="Top Performer (KPI %)" value={`${leaderboardData.topPerformer?.firstName || 'N/A'} ${leaderboardData.topPerformer?.lastName || ''}`} metric={`${leaderboardData.topPerformer?.completionPercentage || 0}%`} />
                        <LeaderboardCard title="Top Salesperson" value={`${leaderboardData.topSalesperson?.firstName || 'N/A'} ${leaderboardData.topSalesperson?.lastName || ''}`} metric={`${leaderboardData.topSalesperson?.kpis.carsSold || 0} Cars`} />
                        <LeaderboardCard title="Total Cars Sold (Month)" value={leaderboardData.totalCarsSold} metric="Cars" />
                    </div>
                )}
                <div className="bg-white shadow-md rounded-lg p-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">The Sales Race</h2>
                    <ul className="space-y-4">
                        {leaderboardData.salesRace.map((sp, index) => (
                            <li key={sp.id} className="flex items-center justify-between p-2 rounded-md">
                                <span className="font-bold text-lg">{index + 1}. {sp.firstName} {sp.lastName}</span>
                                <span className="text-lg">{sp.kpis.carsSold || 0} Cars</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </main>
        </div>
    );
};

// --- Reusable Components ---
const ViewSelector = ({ view, setView }) => (
    <div className="flex justify-center space-x-2 bg-gray-200 p-1 rounded-lg">
        <button onClick={() => setView('today')} className={`px-4 py-2 rounded-md font-semibold ${view === 'today' ? 'bg-white text-blue-600 shadow' : 'text-gray-600'}`}>Today</button>
        <button onClick={() => setView('month')} className={`px-4 py-2 rounded-md font-semibold ${view === 'month' ? 'bg-white text-blue-600 shadow' : 'text-gray-600'}`}>This Month</button>
        <button onClick={() => setView('ytd')} className={`px-4 py-2 rounded-md font-semibold ${view === 'ytd' ? 'bg-white text-blue-600 shadow' : 'text-gray-600'}`}>YTD</button>
    </div>
);

const TeamPerformanceSection = ({ title, data }) => (
    <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{title}</h2>
        <TeamPerformanceChart data={data} />
    </div>
);

const TeamPerformanceChart = ({ data }) => {
    const sortedData = [...data].sort((a, b) => b.completionPercentage - a.completionPercentage);
    return (
        <div className="space-y-4">
            {sortedData.length > 0 ? sortedData.map(member => (
                <div key={member.id}>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">{member.firstName} {member.lastName}</span>
                        <span className="text-sm font-medium text-gray-500">{member.completionPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4"><div className="bg-blue-600 h-4 rounded-full" style={{ width: `${member.completionPercentage}%` }}></div></div>
                </div>
            )) : <p className="text-center text-gray-500 py-4">No activity to display for this team.</p>}
        </div>
    );
};

const KpiCard = ({ title, value, goal, onUpdate, isEditable, kpiKey, allKpis }) => {
  const isBackendKpi = kpiKey === 'backendSoldPercent';
  const dealsCaptured = allKpis?.dealsCaptured || 0;
  const isBackendDisabled = isBackendKpi && dealsCaptured === 0;

  const percentage = goal > 0 ? Math.round((value / goal) * 100) : 0;
  
  if (kpiKey === 'eodTransfer') {
    return (
        <div className="bg-white rounded-lg shadow-md p-6 flex flex-col justify-between">
            <h2 className="text-xl font-semibold text-gray-700">{title}</h2>
            <div className="flex items-center justify-center mt-4">
                <input type="checkbox" checked={value === 1} onChange={(e) => onUpdate(e.target.checked ? 1 : 0)} disabled={!isEditable} className="w-8 h-8 text-blue-600 rounded focus:ring-blue-500"/>
            </div>
        </div>
    );
  }

  const formatValue = (val) => {
    if (kpiKey && kpiKey.toLowerCase().includes('gross')) return `$${val}`;
    if (kpiKey && (kpiKey.toLowerCase().includes('percent') || kpiKey.toLowerCase().includes('efficiency') || kpiKey.toLowerCase().includes('csiscore'))) return `${val}%`;
    return val;
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 flex flex-col ${isBackendDisabled ? 'opacity-50' : ''}`}>
      <h2 className="text-xl font-semibold text-gray-700">{title}</h2>
      {isBackendDisabled && <p className="text-xs text-gray-500 mt-1">Capture a deal to enable.</p>}
      <div className="flex items-center justify-between mt-4">
        <input type="number" min="0" value={value} onChange={(e) => onUpdate(parseInt(e.target.value) || 0)} className="text-3xl font-bold text-gray-900 w-24 bg-gray-100 rounded-md p-2 border-transparent focus:border-blue-500 focus:ring-0" disabled={!isEditable || isBackendDisabled} />
        <div className="text-lg text-gray-600">/ {formatValue(goal)}</div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4"><div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${percentage > 100 ? 100 : percentage}%` }}></div></div>
      <div className="text-right text-sm text-gray-500 mt-2">{percentage}% Complete</div>
    </div>
  );
};

const AiChatbot = ({ onClose, kpis, kpiGoals }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    useEffect(scrollToBottom, [messages]);
    
    useEffect(() => {
        let initialMessageText = "How can I help you hit your numbers today?";
        setMessages([{ text: initialMessageText, sender: 'bot' }]);
    }, []);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;
        const userMessage = { text: input, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const prompt = `You are a high-energy, world-class Car Sales Manager AI. Your responses must be short, direct, and extremely motivating. No fluff. Get straight to the point and fire up the salesperson. User's request: "${input}"`;
            const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
            const apiKey = "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error(`API call failed`);
            const result = await response.json();
            const botResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || "Wasting time. Ask again, make it clear.";
            setMessages(prev => [...prev, { text: botResponse, sender: 'bot' }]);
        } catch (error) {
            setMessages(prev => [...prev, { text: "Connection error. Get back to the floor, try again later.", sender: 'bot' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-24 right-4 sm:right-8 w-full sm:w-96 max-w-[calc(100vw-2rem)] h-[70vh] max-h-[40rem] bg-white rounded-lg shadow-2d flex flex-col z-20">
            <header className="bg-blue-600 text-white p-4 flex justify-between items-center rounded-t-lg flex-shrink-0">
                <h3 className="font-bold">AI Sales Manager</h3>
                <button onClick={onClose} className="text-white text-3xl leading-none h-8 w-8 flex items-center justify-center rounded-full hover:bg-blue-700 focus:outline-none">&times;</button>
            </header>
            <div className="flex-1 p-4 overflow-y-auto">
                {messages.map((msg, index) => (
                    <div key={index} className={`my-2 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}><span className={`inline-block p-2 rounded-lg max-w-xs break-words ${msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>{msg.text}</span></div>
                ))}
                {isLoading && <div className="my-2 flex justify-start"><span className="inline-block p-2 rounded-lg bg-gray-200 text-gray-800">...</span></div>}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-gray-200 mt-auto flex-shrink-0">
                <div className="flex">
                    <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} placeholder="What do you need?" className="flex-1 p-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isLoading} />
                    <button onClick={handleSend} className="bg-blue-600 text-white p-2 rounded-r-md hover:bg-blue-700 disabled:bg-blue-300" disabled={isLoading}>Send</button>
                </div>
            </div>
        </div>
    );
};

const LeaderboardCard = ({ title, value, metric }) => (
    <div className="bg-white shadow-md rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold text-gray-600">{title}</h3>
        <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        <p className="text-md text-gray-500">{metric}</p>
    </div>
);

export default App;
