const { FIREBASE_DB } = require('../config/firebase');
// IMPORTANT: Ensure 'Timestamp' is imported here
const { collection, doc, addDoc, query, where, getDocs, orderBy, limit, serverTimestamp, Timestamp, updateDoc } = require('firebase/firestore');

const chatsCollection = collection(FIREBASE_DB, 'chats');

class Chat {
  constructor(data) {
    this.id = data.id || null;
    this.userId = data.userId;
    this.message = data.message;
    this.sender = data.sender; // 'user' or 'admin'
    // Correctly handle timestamp from Firestore (which is a Timestamp object)
    // or set a new Date for consistency if it's missing (e.g., from old data or new client-side instances)
    this.timestamp = data.timestamp instanceof Timestamp
                     ? data.timestamp.toDate() 
                     : (data.timestamp || new Date()); 
    // NEW: Add status and claimedBy
    this.status = data.status || 'active'; // 'active', 'claimed', 'closed'
    this.claimedBy = data.claimedBy || null; // User ID of the admin who claimed the chat
    this.claimedByUsername = data.claimedByUsername || null; // Username of admin who claimed
  }

  async save() {
    // Prepare data for Firestore.
    // If this.timestamp is already a JS Date object (from a fetched instance being re-saved/updated),
    // convert it back to a Firestore Timestamp.
    // If it's a new instance without an explicitly set timestamp (i.e., created from incoming request data),
    // use `serverTimestamp()` so Firestore sets the timestamp on the server.
    const chatData = {
      userId: this.userId,
      message: this.message,
      sender: this.sender,
      timestamp: this.timestamp instanceof Date ? Timestamp.fromDate(this.timestamp) : serverTimestamp(),
      status: this.status, // Include new fields
      claimedBy: this.claimedBy, // Include new fields
      claimedByUsername: this.claimedByUsername, // Include new fields
    };

    if (this.id) {
      // If it's an existing document, update it.
      await updateDoc(doc(chatsCollection, this.id), chatData);
    } else {
      // If it's a new document, always use serverTimestamp to ensure consistency and server-side generation.
      chatData.timestamp = serverTimestamp(); 
      const newChatRef = await addDoc(chatsCollection, chatData);
      this.id = newChatRef.id;
    }
    return this;
  }

  // NEW: Update method for existing documents
  async update(fieldsToUpdate) {
    if (!this.id) throw new Error("Cannot update a chat document without an ID.");
    const updatedData = { ...fieldsToUpdate };
    // Ensure timestamp is properly handled if updated (though usually not updated directly)
    if (updatedData.timestamp && updatedData.timestamp instanceof Date) {
        updatedData.timestamp = Timestamp.fromDate(updatedData.timestamp);
    }
    await updateDoc(doc(chatsCollection, this.id), updatedData);
    Object.assign(this, updatedData); // Update current instance fields
    return this;
  }


  static async findByUserId(userId) {
    // Modify query to only include 'active' or 'claimed' messages for the specific user in history
    // This assumes chat history itself can show messages from closed sessions too.
    // If not, then an OR query would be needed: where('status', 'in', ['active', 'claimed'])
    const q = query(chatsCollection, where('userId', '==', userId), orderBy('timestamp', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => new Chat({ id: doc.id, ...doc.data() }));
  }

  static async findActiveSessions() {
    // Only fetch sessions that are 'active' or 'claimed'
    const q = query(chatsCollection, orderBy('timestamp', 'desc')); // Order by descending timestamp to get latest message for session status
    const querySnapshot = await getDocs(q);
    
    const sessions = {};
    querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        const tempChat = new Chat({ ...data, id: doc.id }); 
        
        // We need the *latest* message for each userId to determine the session status
        // and avoid showing multiple entries for the same user if they have multiple messages.
        // So, if a user has multiple messages, the first one encountered (due to orderBy desc)
        // will be the latest one.
        if (!sessions[data.userId]) { // Only process the latest message for each user
            sessions[data.userId] = {
                userId: data.userId,
                lastMessage: data.message,
                lastMessageTimestamp: tempChat.timestamp,
                status: data.status || 'active', // Ensure status is part of the session info
                claimedBy: data.claimedBy || null, // Ensure claimedBy is part of the session info
                claimedByUsername: data.claimedByUsername || null, // Ensure claimedByUsername is part of the session info
            };
        }
    });

    // Filter out 'closed' sessions from the active sessions list for the admin view
    return Object.values(sessions).filter(session => session.status !== 'closed');
  }

  // NEW STATIC METHODS
  static async findLatestMessageByUserId(userId) {
    // This query *requires* the new composite index for orderBy('timestamp', 'desc')
    const q = query(chatsCollection, where('userId', '==', userId), orderBy('timestamp', 'desc'), limit(1));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    const doc = querySnapshot.docs[0];
    return new Chat({ id: doc.id, ...doc.data() });
  }
}

module.exports = Chat;