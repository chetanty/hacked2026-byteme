import Dexie from "dexie";

const db = new Dexie("CognifyDB");

db.version(1).stores({
  chats: "++id, createdAt, updatedAt",
  messages: "++id, chatId, createdAt",
  uploads: "++id, chatId, uploadedAt",
});

export async function createChat() {
  return db.chats.add({
    title: "New Chat",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    correctCount: 0,
    totalEvaluated: 0,
  });
}

export async function updateChat(id, updates) {
  await db.chats.update(id, { ...updates, updatedAt: Date.now() });
}

export async function getChat(id) {
  return db.chats.get(id);
}

export async function getAllChats() {
  return db.chats.orderBy("updatedAt").reverse().toArray();
}

export async function getChatsWithCounts() {
  const chats = await getAllChats();
  const withCounts = await Promise.all(
    chats.map(async (chat) => {
      const [messages, uploads] = await Promise.all([
        db.messages.where("chatId").equals(chat.id).count(),
        db.uploads.where("chatId").equals(chat.id).count(),
      ]);
      return { ...chat, messageCount: messages, uploadCount: uploads };
    })
  );
  return withCounts;
}

export async function addMessage(chatId, role, text) {
  await db.messages.add({
    chatId,
    role,
    text,
    createdAt: Date.now(),
  });
  await updateChat(chatId, {});
}

export async function getMessages(chatId) {
  return db.messages.where("chatId").equals(chatId).sortBy("createdAt");
}

export async function addUpload(chatId, { fileName, pdfText, chapters }) {
  await db.uploads.add({
    chatId,
    fileName: fileName || "document.pdf",
    pdfText: pdfText || "",
    chapters: chapters || [],
    uploadedAt: Date.now(),
  });
  await updateChat(chatId, {});
}

export async function getUploads(chatId) {
  return db.uploads.where("chatId").equals(chatId).sortBy("uploadedAt");
}

export async function updateChatProgress(chatId, { correct }) {
  const chat = await db.chats.get(chatId);
  if (!chat) return;
  const correctCount = (chat.correctCount ?? 0) + (correct ? 1 : 0);
  const totalEvaluated = (chat.totalEvaluated ?? 0) + 1;
  await db.chats.update(chatId, {
    correctCount,
    totalEvaluated,
    updatedAt: Date.now(),
  });
}

export async function deleteChat(id) {
  await db.messages.where("chatId").equals(id).delete();
  await db.uploads.where("chatId").equals(id).delete();
  await db.chats.delete(id);
}

export { db };
