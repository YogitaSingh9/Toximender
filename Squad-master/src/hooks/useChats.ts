import { ChatDataType } from './../types/chatData.type';
import { 
  doc, 
  onSnapshot, 
  DocumentData, 
  collection, 
  query, 
  where, 
  getDocs,
  addDoc,
  updateDoc
} from 'firebase/firestore';
import React from "react"
import { auth, db } from '../firebase';

export const useChats = () => {
  const [chats, setChats] = React.useState<ChatDataType[] | DocumentData>([]);

  async function getChats() {
    if (!auth.currentUser?.uid) return;
    
    const userChatsRef = doc(db, 'userChats', auth.currentUser.uid);
    const unsubscribe = onSnapshot(userChatsRef, (doc) => {
      if (doc.exists()) {
        setChats(doc.data());
      }
    });

    return unsubscribe;
  }

  async function startNewChat(receiverId: string) {
    if (!auth.currentUser?.uid) return null;
    
    // Check for existing chat
    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef, 
      where('participants', 'array-contains', auth.currentUser.uid)
    );
    
    const querySnapshot = await getDocs(q);
    const existingChat = querySnapshot.docs.find(doc => 
      doc.data().participants.includes(receiverId)
    );

    if (existingChat) return existingChat.id;

    // Create new chat
    const newChatRef = await addDoc(chatsRef, {
      participants: [auth.currentUser.uid, receiverId],
      createdAt: new Date()
    });

    // Update userChats for both users
    await updateDoc(doc(db, 'userChats', auth.currentUser.uid), {
      [newChatRef.id]: {
        userInfo: { uid: receiverId },
        date: new Date()
      }
    });

    await updateDoc(doc(db, 'userChats', receiverId), {
      [newChatRef.id]: {
        userInfo: { uid: auth.currentUser.uid },
        date: new Date()
      }
    });

    return newChatRef.id;
  }

  React.useEffect(() => {
    let unsubscribe: () => void;
    const setup = async () => {
      const unsub = await getChats();
      if (unsub) unsubscribe = unsub;
    };
    setup();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [auth.currentUser?.uid]);

}
