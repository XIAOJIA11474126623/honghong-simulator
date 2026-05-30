'use client';

import { useEffect, useState } from 'react';

interface User {
  id: string;
  username: string;
  created_at: string;
}

interface GameRecord {
  id: string;
  scenario: string;
  final_score: number;
  result: string;
  played_at: string;
}

export default function DbAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [gameRecords, setGameRecords] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'games'>('users');

  useEffect(() => {
    async function loadData() {
      try {
        const [usersRes, gamesRes] = await Promise.all([
          fetch('/api/db-admin/users'),
          fetch('/api/db-admin/game-records'),
        ]);
        
        const usersData = await usersRes.json();
        const gamesData = await gamesRes.json();
        
        setUsers(usersData.users || []);
        setGameRecords(gamesData.records || []);
      } catch (error) {
        console.error('加载数据失败:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">正在加载数据库...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">📊 数据库管理</h1>
        
        {/* 标签页切换 */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'users'
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            👥 用户表 ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('games')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'games'
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            🎮 游戏记录表 ({gameRecords.length})
          </button>
        </div>

        {/* 用户表 */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">用户列表</h2>
            {users.length === 0 ? (
              <p className="text-gray-500">暂无用户，快去注册一个吧！</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-gray-600 font-medium">ID</th>
                      <th className="text-left py-3 px-4 text-gray-600 font-medium">用户名</th>
                      <th className="text-left py-3 px-4 text-gray-600 font-medium">创建时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-800">{user.id}</td>
                        <td className="py-3 px-4 text-gray-800 font-medium">{user.username}</td>
                        <td className="py-3 px-4 text-gray-600">{new Date(user.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 游戏记录表 */}
        {activeTab === 'games' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">游戏记录</h2>
            {gameRecords.length === 0 ? (
              <p className="text-gray-500">暂无游戏记录，快去玩一局吧！</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-gray-600 font-medium">场景</th>
                      <th className="text-left py-3 px-4 text-gray-600 font-medium">分数</th>
                      <th className="text-left py-3 px-4 text-gray-600 font-medium">结果</th>
                      <th className="text-left py-3 px-4 text-gray-600 font-medium">游玩时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gameRecords.map((record) => (
                      <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-800">{record.scenario}</td>
                        <td className="py-3 px-4">
                          <span className={`font-medium ${record.final_score >= 80 ? 'text-green-600' : 'text-orange-600'}`}>
                            {record.final_score}分
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-800">{record.result}</td>
                        <td className="py-3 px-4 text-gray-600">{new Date(record.played_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
