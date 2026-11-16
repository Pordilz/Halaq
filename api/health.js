import { applyCors } from './_lib/cors.js';

export default function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
}
