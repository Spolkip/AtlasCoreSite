// backend/models/PromoCode.js
const { FIREBASE_DB } = require('../config/firebase');
const { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where } = require('firebase/firestore');

const promoCodesCollection = collection(FIREBASE_DB, 'promo_codes');

class PromoCode {
  constructor(data) {
    this.id = data.id || null;
    this.code = data.code;
    this.discountType = data.discountType; // 'percentage' or 'fixed'
    this.discountValue = Number(data.discountValue);
    this.isActive = typeof data.isActive === 'boolean' ? data.isActive : true;
    this.uses = data.uses || 0;
    this.maxUses = data.maxUses ? Number(data.maxUses) : null;
    this.expiryDate = data.expiryDate ? new Date(data.expiryDate) : null;
    this.in_game_commands = data.in_game_commands || []; // Commands to run on use
    this.createdAt = data.createdAt || new Date();
  }

  async save() {
    const data = {
      code: this.code.toUpperCase(),
      discountType: this.discountType,
      discountValue: this.discountValue,
      isActive: this.isActive,
      uses: this.uses,
      maxUses: this.maxUses,
      expiryDate: this.expiryDate,
      in_game_commands: this.in_game_commands,
      createdAt: this.createdAt,
    };
    if (this.id) {
      await updateDoc(doc(promoCodesCollection, this.id), data);
    } else {
      data.createdAt = new Date();
      const docRef = await addDoc(promoCodesCollection, data);
      this.id = docRef.id;
    }
    return this;
  }

  static async findByCode(code) {
    const q = query(promoCodesCollection, where('code', '==', code.toUpperCase()));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }
    const docSnap = querySnapshot.docs[0];
    return new PromoCode({ id: docSnap.id, ...docSnap.data() });
  }
  
  static async findAll() {
    const querySnapshot = await getDocs(promoCodesCollection);
    return querySnapshot.docs.map(doc => new PromoCode({ id: doc.id, ...doc.data() }));
  }

  static async delete(id) {
    await deleteDoc(doc(promoCodesCollection, id));
  }
}

module.exports = PromoCode;
