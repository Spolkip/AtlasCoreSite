module.exports = {
  validateEmail: (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },
  generateRandomString: (length) => {
    return [...Array(length)].map(() => Math.random().toString(36)[2]).join('');
  }
};
