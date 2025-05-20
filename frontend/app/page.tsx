'use client';

import { useState, useEffect, FormEvent } from 'react';
import io from 'socket.io-client';
import { Plus, Edit3, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface Board { id: number; title: string; }

type Socket = ReturnType<typeof io>;
const socket: Socket = io('http://localhost:4000');

export default function HomePage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Fetch and subscribe to boards
  useEffect(() => {
    fetch('http://localhost:4000/api/boards')
      .then(res => res.json())
      .then(setBoards)
      .catch(console.error);

    socket.on('newBoard', (board: Board) => setBoards(prev => [...prev, board]));
    socket.on('updateBoard', (upd: Board) => setBoards(prev => prev.map(b => b.id === upd.id ? upd : b)));
    socket.on('deleteBoard', ({ id }: { id: number }) => setBoards(prev => prev.filter(b => b.id !== id)));

    return () => {
      socket.off('newBoard');
      socket.off('updateBoard');
      socket.off('deleteBoard');
      socket.disconnect();
    };
  }, []);

  // Create new board
  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setLoading(true);
    try {
      await fetch('http://localhost:4000/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      setNewTitle('');
      // newBoard event updates state
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // UI
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-4xl font-extrabold text-center mb-6">Your Boards</h1>

        <form onSubmit={handleCreate} className="flex mb-8">
          <input
            type="text"
            placeholder="New board title"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            className="flex-1 border border-gray-300 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!newTitle.trim() || loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-r-lg flex items-center"
          >
            <Plus size={20} className="mr-2" />
            {loading ? 'Creating…' : 'Create'}
          </button>
        </form>

        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <AnimatePresence>
            {boards.map(board => (
              <motion.li
                key={board.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-gray-100 p-6 rounded-xl shadow cursor-pointer hover:bg-gray-200"
              >
                <h2
                  className="text-2xl font-semibold text-gray-900"
                  onClick={() => router.push(`/boards/${board.id}`)}
                >
                  {board.title}
                </h2>
                <div className="absolute top-3 right-3 flex space-x-2">
                  <button onClick={() => router.push(`/boards/${board.id}`)}>
                    <Edit3 size={18} className="text-gray-600 hover:text-gray-800" />
                  </button>
                  <button onClick={() => {/* TODO: delete handler */}}>
                    <Trash2 size={18} className="text-gray-600 hover:text-gray-800" />
                  </button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
          {boards.length === 0 && (
            <li className="text-center text-gray-400 col-span-full">
              No boards yet – create one above.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
