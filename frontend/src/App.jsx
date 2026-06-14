import React, { useState, useEffect, useCallback } from 'react';
import BookList from './pages/BookList';
import BorrowRecords from './pages/BorrowRecords';
import MyFavorites from './pages/MyFavorites';
import Login from './components/Login';
import NotificationDropdown from './components/NotificationDropdown';

function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('books');
  const [notificationBookId, setNotificationBookId] = useState(null);
  const [bookListRefreshKey, setBookListRefreshKey] = useState(0);

  const handleNavigateToBook = useCallback((bookId) => {
    setCurrentPage('books');
    setNotificationBookId(bookId);
    setBookListRefreshKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
        try {
            setUser(JSON.parse(storedUser));
        } catch (e) {
            localStorage.removeItem('user');
        }
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const navItems = [
    { key: 'books', label: '图书管理', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
    { key: 'favorites', label: '我的收藏', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
    { key: 'records', label: '借阅记录', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col">
       <div className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
            <div className="flex items-center gap-8">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 rounded-lg p-1.5">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                    <div>
                         <h1 className="text-xl font-bold text-gray-800 tracking-tight leading-none">图书管理系统</h1>
                         <p className="text-[10px] text-gray-400 font-medium tracking-wider uppercase mt-0.5">Library Management</p>
                    </div>
                </div>
                <nav className="hidden md:flex items-center gap-1">
                    {navItems.map(item => (
                        <button
                            key={item.key}
                            onClick={() => setCurrentPage(item.key)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                currentPage === item.key
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                            </svg>
                            {item.label}
                        </button>
                    ))}
                </nav>
            </div>
            
            <div className="flex items-center gap-3">
                <NotificationDropdown onNavigateToBook={handleNavigateToBook} />
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-[10px] text-white font-bold">
                        {user.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-600 font-medium">{user.username}</span>
                </div>
                <button 
                    onClick={handleLogout}
                    className="text-gray-500 hover:text-red-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
                    title="退出登录"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </button>
            </div>
        </div>
        <div className="md:hidden border-t border-gray-100 flex">
            {navItems.map(item => (
                <button
                    key={item.key}
                    onClick={() => setCurrentPage(item.key)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-all ${
                        currentPage === item.key
                            ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                            : 'text-gray-500'
                    }`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                    </svg>
                    {item.label}
                </button>
            ))}
        </div>
       </div>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {currentPage === 'books' && (
                <BookList 
                    user={user} 
                    key={bookListRefreshKey}
                    initialBookId={notificationBookId}
                    onNotificationBookCleared={() => setNotificationBookId(null)}
                />
            )}
            {currentPage === 'favorites' && <MyFavorites user={user} />}
            {currentPage === 'records' && <BorrowRecords user={user} />}
        </main>
    </div>
  );
}

export default App;
