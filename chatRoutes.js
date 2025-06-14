import express from 'express';
import admin from 'firebase-admin';
import fs from 'fs';

const router = express.Router();

const serviceAccount = JSON.parse(
  fs.readFileSync('./firebaseServiceKey.json', 'utf8')
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

router.post('/startSession', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId가 필요합니다' });

  try {
    const sessionRef = await db
      .collection('users')
      .doc(String(userId))
      .collection('sessions')
      .add({
        createdAt: new Date(),
        updatedAt: new Date(),
        title: '새로운 대화',
        isDeleted: false,
      });

    res.status(200).json({ sessionId: sessionRef.id });
  } catch (error) {
    res.status(500).json({ error: '세션 생성 실패' });
  }
});

router.post('/:userId/sessions/:sessionId/message', async (req, res) => {
  const { userId, sessionId } = req.params;
  const { text, isUser } = req.body;

  if (!text || typeof isUser !== 'boolean') {
    return res.status(400).json({ error: '필수 항목 누락' });
  }

  try {
    const sessionRef = db
      .collection('users')
      .doc(String(userId))
      .collection('sessions')
      .doc(sessionId);

    await sessionRef.update({ updatedAt: new Date() });

    await sessionRef.collection('messages').add({
      text,
      isUser,
      timestamp: new Date(),
    });

    res.status(200).json({ success: true, sessionId });
  } catch (error) {
    res.status(500).json({ error: '메시지 저장 실패' });
  }
});

router.get('/:userId/sessions/:sessionId/messages', async (req, res) => {
  const { userId, sessionId } = req.params;

  try {
    const snapshot = await db
      .collection('users')
      .doc(String(userId))
      .collection('sessions')
      .doc(sessionId)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .get();

    const messages = snapshot.docs.map((doc) => ({
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || null,
    }));

    res.status(200).json({ messages });
  } catch (error) {
    res.status(500).json({ error: '메시지 조회 실패' });
  }
});

export default router;
