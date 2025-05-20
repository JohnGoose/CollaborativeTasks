'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DroppableProvided,
  DraggableProvided,
} from '@hello-pangea/dnd';

// Types
interface Card { id: number; title: string; completed: boolean; position: number; }
interface List { id: number; title: string; position: number; cards: Card[]; }
interface Board { id: number; title: string; lists: List[]; }

export default function BoardPage() {
  const { boardId } = useParams();
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);

  // New List state
  const [newListTitle, setNewListTitle] = useState('');
  const [creatingList, setCreatingList] = useState(false);

  // New Card state (per-list)
  const [creatingCardFor, setCreatingCardFor] = useState<number | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');

  // Fetch board with lists/cards
  useEffect(() => {
    if (!boardId) return;
    setLoading(true);
    fetch(`http://localhost:4000/api/boards/${boardId}?include=lists.cards`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch board');
        return res.json();
      })
      .then((data: Board) => setBoard(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [boardId]);

  // Add new list
  const handleAddList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListTitle.trim() || !board) return;
    const position = board.lists.length > 0
      ? Math.max(...board.lists.map(l => l.position ?? 0)) + 1
      : 1;
    try {
      const res = await fetch(`http://localhost:4000/api/boards/${board.id}/lists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newListTitle.trim(), position }),
      });
      if (!res.ok) throw new Error('Failed to add list');
      const newList: List = await res.json();
      setBoard(prev => prev ? { ...prev, lists: [...prev.lists, { ...newList, cards: [] }] } : prev);
      setNewListTitle('');
      setCreatingList(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Add new card to a list
  const handleAddCard = async (listId: number) => {
    if (!newCardTitle.trim() || !board) return;
    // Find the target list
    const list = board.lists.find(l => l.id === listId);
    const position =
      list && list.cards.length > 0
        ? Math.max(...list.cards.map(c => c.position ?? 0)) + 1
        : 1;
    try {
      const res = await fetch(`http://localhost:4000/api/lists/${listId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newCardTitle.trim(), position }),
      });
      if (!res.ok) throw new Error('Failed to add card');
      const newCard: Card = await res.json();
      setBoard(prev =>
        prev
          ? {
              ...prev,
              lists: prev.lists.map(l =>
                l.id === listId
                  ? { ...l, cards: [...l.cards, newCard] }
                  : l
              ),
            }
          : prev
      );
      setNewCardTitle('');
      setCreatingCardFor(null);
    } catch (err) {
      console.error(err);
    }
  };

  // DRAG & DROP handler
  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination || !board) return;

    // No change
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const sourceListId = Number(source.droppableId);
    const destListId = Number(destination.droppableId);
    const cardId = Number(draggableId);

    // Find the card being moved
    const sourceList = board.lists.find(l => l.id === sourceListId);
    if (!sourceList) return;
    const movedCard = sourceList.cards[source.index];
    if (!movedCard) return;

    // Optimistically update UI
    setBoard(prev => {
      if (!prev) return prev;

      // Remove card from source
      const listsCopy = prev.lists.map(l => ({ ...l, cards: [...l.cards] }));
      const srcListIdx = listsCopy.findIndex(l => l.id === sourceListId);
      const dstListIdx = listsCopy.findIndex(l => l.id === destListId);

      // Remove card
      const [removed] = listsCopy[srcListIdx].cards.splice(source.index, 1);

      // Insert card into dest
      listsCopy[dstListIdx].cards.splice(destination.index, 0, removed);

      // Recalculate positions for destination list
      listsCopy[dstListIdx].cards = listsCopy[dstListIdx].cards.map((card, i) => ({
        ...card,
        position: i + 1,
      }));

      // Also update positions in source list if same list
      if (srcListIdx === dstListIdx) {
        listsCopy[srcListIdx].cards = listsCopy[srcListIdx].cards.map((card, i) => ({
          ...card,
          position: i + 1,
        }));
      } else {
        listsCopy[srcListIdx].cards = listsCopy[srcListIdx].cards.map((card, i) => ({
          ...card,
          position: i + 1,
        }));
      }

      return { ...prev, lists: listsCopy };
    });

    // Persist move in backend
    await fetch(`http://localhost:4000/api/cards/${cardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listId: destListId,
        position: destination.index + 1,
      }),
    });
  };

  if (loading) {
    return <div className="p-8">Loading board…</div>;
  }
  if (!board) {
    return <div className="p-8 text-red-500">Board not found.</div>;
  }

return (
  <div className="min-h-screen bg-gradient-to-br from-gray-100 via-blue-50 to-gray-200 py-10">
    <div className="px-8">
      <h1 className="text-4xl font-extrabold mb-8 tracking-tight text-gray-900 drop-shadow">
        {board.title}
      </h1>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex space-x-8 overflow-x-auto pb-8">
          {/* Lists */}
          {board.lists.map((list, listIdx) => (
            <Droppable droppableId={list.id.toString()} key={list.id}>
  {(provided: DroppableProvided) => (
    <div
      ref={provided.innerRef}
      {...provided.droppableProps}
      className="w-72 min-w-[18rem] bg-white bg-opacity-90 rounded-2xl shadow-xl flex-shrink-0 border border-blue-100 relative transition-all"
      style={{ backdropFilter: "blur(2px)" }}
    >
      {/* List Header with color bar */}
      <div
        className="h-2 w-full rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, #6366f1 ${40 + (listIdx * 25) % 60}%, #60a5fa)` }}
      />
      <h2 className="font-bold text-lg mt-3 mb-4 px-4 text-gray-800 tracking-tight">
        {list.title}
      </h2>
      {/* Cards with padding only here */}
      <ul className="space-y-3 px-4 pb-3 min-h-[24px]">
        {list.cards.map((card, idx) => (
          <Draggable
            draggableId={card.id.toString()}
            index={idx}
            key={card.id}
          >
            {(provided: DraggableProvided, snapshot) => (
              <li
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
                className={`p-4 rounded-xl bg-gray-50 border border-blue-100 shadow transition-all cursor-pointer
                  ${snapshot.isDragging ? "scale-105 bg-blue-50 shadow-2xl z-10" : "hover:bg-blue-50"}
                  ${card.completed ? "line-through text-gray-400" : ""}
                `}
                style={{
                  ...provided.draggableProps.style,
                }}
              >
                <span>
                  {card.title}
                </span>
              </li>
            )}
          </Draggable>
        ))}
        {provided.placeholder}
      </ul>
      {/* Add Card form - padding only here */}
      <div className="px-4 pb-4">
        {creatingCardFor === list.id ? (
          <form
            className="mt-2 flex flex-col space-y-2"
            onSubmit={e => {
              e.preventDefault();
              handleAddCard(list.id);
            }}
          >
            <input
              className="border border-blue-200 rounded px-3 py-2 focus:ring-2 focus:ring-blue-400"
              placeholder="Card title"
              value={newCardTitle}
              onChange={e => setNewCardTitle(e.target.value)}
              autoFocus
            />
            <div className="flex space-x-2">
              <button
                type="submit"
                className="bg-indigo-500 text-white px-4 py-1 rounded-lg hover:bg-indigo-600 shadow"
              >
                Add
              </button>
              <button
                type="button"
                className="text-gray-600 hover:underline"
                onClick={() => { setCreatingCardFor(null); setNewCardTitle(''); }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            className="w-full py-2 mt-2 text-indigo-600 bg-indigo-50 rounded-xl font-semibold hover:bg-indigo-100 transition shadow border border-indigo-100"
            onClick={() => setCreatingCardFor(list.id)}
          >
            + Add Card
          </button>
        )}
      </div>
    </div>
  )}
</Droppable>

          ))}

          {/* Add List form */}
          <div className="w-72 min-w-[18rem] flex-shrink-0 flex items-center">
            {creatingList ? (
              <form onSubmit={handleAddList} className="w-full bg-white bg-opacity-80 p-6 rounded-2xl shadow-xl space-y-2 border border-blue-100">
                <input
                  type="text"
                  className="w-full border border-blue-200 rounded px-3 py-2 focus:ring-2 focus:ring-blue-400"
                  placeholder="List title"
                  value={newListTitle}
                  onChange={e => setNewListTitle(e.target.value)}
                  autoFocus
                />
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="bg-indigo-600 text-white px-4 py-1 rounded-lg hover:bg-indigo-700 shadow"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    className="text-gray-600 hover:underline"
                    onClick={() => { setCreatingList(false); setNewListTitle(''); }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                className="w-full py-3 px-2 bg-indigo-50 text-indigo-700 rounded-2xl font-bold border border-indigo-100 hover:bg-indigo-100 shadow transition"
                onClick={() => setCreatingList(true)}
              >
                + Add List
              </button>
            )}
          </div>
        </div>
      </DragDropContext>
    </div>
  </div>
);

}
