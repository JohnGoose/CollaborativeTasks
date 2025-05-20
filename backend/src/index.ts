import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import http from 'http';
import { Server } from 'socket.io';


const prisma = new PrismaClient();
const app = express();

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// ─── HTTP + WebSocket Setup ────────────────────────────────────────────────────
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: 'http://localhost:3000' }
});

io.on('connection', (socket) => {
  console.log('⚡ Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('⚡ Client disconnected:', socket.id);
  });
});

// ─── REST Routes ────────────────────────────────────────────────────────────────

// Health check
app.get(
  '/api/health',
  (_req: Request, res: Response, next: NextFunction) => {
    res.json({ status: 'OK' });
  }
);

// ─ Tasks ─────────────────────────────────────────────────

// List tasks
app.get(
  '/api/tasks',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const tasks = await prisma.task.findMany();
      res.json(tasks);
    } catch (err) {
      next(err);
    }
  }
);

// Create task
app.post(
  '/api/tasks',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const task = await prisma.task.create({ data: req.body });
      io.emit('newTask', task);
      res.json(task);
    } catch (err) {
      next(err);
    }
  }
);

// Toggle task
app.patch(
  '/api/tasks/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await prisma.task.update({
        where: { id: Number(req.params.id) },
        data: req.body,
      });
      io.emit('updateTask', updated);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

// ─ Boards ─────────────────────────────────────────────────

// Create board
app.post(
  '/api/boards',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const board = await prisma.board.create({ data: req.body });
      io.emit('newBoard', board);
      res.json(board);
    } catch (err) {
      next(err);
    }
  }
);

// List boards (with lists)
app.get(
  '/api/boards',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const boards = await prisma.board.findMany({ include: { lists: true } });
      res.json(boards);
    } catch (err) {
      next(err);
    }
  }
);

// Get one board (with its lists and cards)

  // ————————————————————————————————————————————————————————————————
// Fetch one board (with its lists and cards)
// — Fetch one board (with its lists & cards) —————————————————
// — Fetch one board (with its lists & cards) ———————————————————————
const getBoardHandler: express.RequestHandler = async (req, res, next) => {
    try {
      const boardId = Number(req.params.id);
      const board = await prisma.board.findUnique({
        where: { id: boardId },
        include: {
          lists: {
            include: { cards: true },
            orderBy: { position: 'asc' },
          },
        },
      });
  
      if (!board) {
        // send the 404 and exit the handler
        res.status(404).json({ error: 'Board not found' });
        return;
      }
  
      // send the board — no `return` here
      res.json(board);
    } catch (err) {
      next(err);
    }
  };
  
  // Mount the route (no cast needed now)
  app.get('/api/boards/:id', getBoardHandler);
  

  // ————————————————————————————————————————————————————————————————
  
  

// Update board title
app.patch(
  '/api/boards/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const board = await prisma.board.update({
        where: { id: Number(req.params.id) },
        data: { title: req.body.title },
      });
      io.emit('updateBoard', board);
      res.json(board);
    } catch (err) {
      next(err);
    }
  }
);

// Delete board
app.delete(
  '/api/boards/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await prisma.board.delete({ where: { id: Number(req.params.id) } });
      io.emit('deleteBoard', { id: Number(req.params.id) });
      res.sendStatus(204);
    } catch (err) {
      next(err);
    }
  }
);

// ─ Lists ──────────────────────────────────────────────────

// Create list in a board
app.post(
  '/api/boards/:boardId/lists',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const list = await prisma.list.create({
        data: {
          title: req.body.title,
          position: req.body.position,
          boardId: Number(req.params.boardId),
        },
      });
      io.emit('newList', list);
      res.json(list);
    } catch (err) {
      next(err);
    }
  }
);

// Update list
app.patch(
  '/api/lists/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const list = await prisma.list.update({
        where: { id: Number(req.params.id) },
        data: {
          title: req.body.title,
          position: req.body.position,
        },
      });
      io.emit('updateList', list);
      res.json(list);
    } catch (err) {
      next(err);
    }
  }
);

// Delete list
app.delete(
  '/api/lists/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await prisma.list.delete({ where: { id: Number(req.params.id) } });
      io.emit('deleteList', { id: Number(req.params.id) });
      res.sendStatus(204);
    } catch (err) {
      next(err);
    }
  }
);

// ─ Cards ──────────────────────────────────────────────────

// Create card in a list
app.post(
  '/api/lists/:listId/cards',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const card = await prisma.card.create({
        data: {
          title: req.body.title,
          description: req.body.description,
          position: req.body.position,
          listId: Number(req.params.listId),
        },
      });
      io.emit('newCard', card);
      res.json(card);
    } catch (err) {
      next(err);
    }
  }
);

// Update card
app.patch(
  '/api/cards/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const card = await prisma.card.update({
        where: { id: Number(req.params.id) },
        data: {
          title: req.body.title,
          description: req.body.description,
          position: req.body.position,
          completed: req.body.completed,
        },
      });
      io.emit('updateCard', card);
      res.json(card);
    } catch (err) {
      next(err);
    }
  }
);

// Delete card
app.delete(
  '/api/cards/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await prisma.card.delete({ where: { id: Number(req.params.id) } });
      io.emit('deleteCard', { id: Number(req.params.id) });
      res.sendStatus(204);
    } catch (err) {
      next(err);
    }
  }
);

// ─── Start Server ────────────────────────────────────────────────────────────
const port = parseInt(process.env.PORT || '4000', 10);
httpServer.listen(port, '0.0.0.0', () => {
  console.log(`Backend + WS running on http://0.0.0.0:${port}`);
});
