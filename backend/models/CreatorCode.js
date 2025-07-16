// backend/models/CreatorCode.js
const { FIREBASE_DB } = require('../config/firebase');
const { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where } = require('firebase/firestore');

const creatorCodesCollection = collection(FIREBASE_DB, 'creator_codes');

class CreatorCode {
  constructor(data) {
    this.id = data.id || null;
    this.code = data.code;
    this.creatorId = data.creatorId || null; // The ID of the user who is the creator/affiliate
    this.discountType = data.discountType || 'percentage'; // 'percentage' or 'fixed'
    this.discountValue = data.discountValue ? Number(data.discountValue) : 0;
    this.isActive = typeof data.isActive === 'boolean' ? data.isActive : true;
    this.referralCount = data.referralCount || 0; // Tracks successful referrals/uses
    this.maxUses = data.maxUses ? Number(data.maxUses) : null;
    this.expiryDate = data.expiryDate ? new Date(data.expiryDate) : null;
    this.createdAt = data.createdAt || new Date();
  }

  async save() {
    const data = {
      code: this.code.toUpperCase(),
      creatorId: this.creatorId,
      discountType: this.discountType,
      discountValue: this.discountValue,
      isActive: this.isActive,
      referralCount: this.referralCount,
      maxUses: this.maxUses,
      expiryDate: this.expiryDate,
      createdAt: this.createdAt,
    };
    if (this.id) {
      await updateDoc(doc(creatorCodesCollection, this.id), data);
    } else {
      data.createdAt = new Date();
      const docRef = await addDoc(creatorCodesCollection, data);
      this.id = docRef.id;
    }
    return this;
  }

  async update(fieldsToUpdate) {
    if (!this.id) throw new Error("Cannot update a creator code without an ID.");
    const updatedData = { ...fieldsToUpdate };
    // Ensure numeric fields are correctly parsed if they are passed as strings (e.g. from form inputs)
    if (updatedData.discountValue !== undefined && updatedData.discountValue !== null) {
      updatedData.discountValue = Number(updatedData.discountValue);
    }
    if (updatedData.maxUses !== undefined && updatedData.maxUses !== null && updatedData.maxUses !== '') {
      updatedData.maxUses = Number(updatedData.maxUses);
    } else if (updatedData.maxUses === '') {
      updatedData.maxUses = null; // Treat empty string as null for infinite uses
    }
    if (updatedData.expiryDate !== undefined && updatedData.expiryDate !== null && updatedData.expiryDate !== '') {
        updatedData.expiryDate = new Date(updatedData.expiryDate);
    } else if (updatedData.expiryDate === '') {
        updatedData.expiryDate = null; // Treat empty string as null for no expiry
    }

    await updateDoc(doc(creatorCodesCollection, this.id), updatedData);
    Object.assign(this, updatedData);
    return this;
  }

  static async findByCode(code) {
    const q = query(creatorCodesCollection, where('code', '==', code.toUpperCase()));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }
    const docSnap = querySnapshot.docs[0];
    return new CreatorCode({ id: docSnap.id, ...docSnap.data() });
  }
  
  static async findAll() {
    const querySnapshot = await getDocs(creatorCodesCollection);
    return querySnapshot.docs.map(doc => new CreatorCode({ id: doc.id, ...doc.data() }));
  }

  static async delete(id) {
    await deleteDoc(doc(creatorCodesCollection, id));
  }
}

module.exports = CreatorCode;