// backend/models/Order.js
const { FIREBASE_DB } = require('../config/firebase');
const { collection, doc, getDoc, updateDoc, deleteDoc, addDoc, getDocs, query, where } = require('firebase/firestore');

const ordersCollection = collection(FIREBASE_DB, 'orders');

class Order {
  constructor(data) {
    this.id = data.id || null;
    this.userId = data.userId;
    this.products = data.products || [];
    this.totalAmount = data.totalAmount;
    this.status = data.status || 'pending';
    this.paymentIntentId = data.paymentIntentId || null;
    this.currency = data.currency || 'USD';
    this.processedAmount = data.processedAmount || null;
    this.processedCurrency = data.processedCurrency || null;
    this.promoCode = data.promoCode || null;
    this.discountAmount = data.discountAmount || 0;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  async save() {
    const orderData = {
      userId: this.userId,
      products: this.products,
      totalAmount: this.totalAmount,
      status: this.status,
      paymentIntentId: this.paymentIntentId,
      currency: this.currency,
      processedAmount: this.processedAmount,
      processedCurrency: this.processedCurrency,
      promoCode: this.promoCode,
      discountAmount: this.discountAmount,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    };
    if (this.id) {
      await updateDoc(doc(ordersCollection, this.id), orderData);
    } else {
      const newOrderRef = await addDoc(ordersCollection, orderData);
      this.id = newOrderRef.id;
    }
    return this;
  }

  async update(fieldsToUpdate) {
    if (!this.id) throw new Error("Cannot update an order without an ID.");
    const updatedData = { ...fieldsToUpdate, updatedAt: new Date() };
    await updateDoc(doc(ordersCollection, this.id), updatedData);
    Object.assign(this, updatedData);
    return this;
  }
}

// Static Methods
Order.findById = async function(id) {
  const orderDocSnap = await getDoc(doc(ordersCollection, id));
  return orderDocSnap.exists() ? new Order({ id: orderDocSnap.id, ...orderDocSnap.data() }) : null;
};

Order.findByUserId = async function(userId) {
  const q = query(ordersCollection, where('userId', '==', userId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => new Order({ id: doc.id, ...doc.data() }));
};

Order.findAll = async function() {
  const querySnapshot = await getDocs(ordersCollection);
  return querySnapshot.docs.map(doc => new Order({ id: doc.id, ...doc.data() }));
};

Order.delete = async function(id) {
  await deleteDoc(doc(ordersCollection, id));
  return true;
};

Order.findByPaymentIntentId = async function(paymentIntentId) {
    const q = query(ordersCollection, where('paymentIntentId', '==', paymentIntentId));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    const orderDoc = querySnapshot.docs[0];
    return new Order({ id: orderDoc.id, ...orderDoc.data() });
};

module.exports = Order;
