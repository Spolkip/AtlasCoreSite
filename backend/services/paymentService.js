// backend/services/paymentService.js
const paypal = require('paypal-rest-sdk');
require('dotenv').config();

paypal.configure({
  mode: 'sandbox', // Change to 'live' for production
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_SECRET
});

const paymentService = {
  createPayment: (amount, currency, description, transactionId) => { 
    return new Promise((resolve, reject) => {
      const formattedAmount = Number(amount).toFixed(2);

      const create_payment_json = {
        intent: 'sale',
        payer: {
          payment_method: 'paypal'
        },
        redirect_urls: {
          return_url: 'http://localhost:3000/payment/success',
          cancel_url: `http://localhost:3000/payment/cancel?transaction_id=${transactionId}`
        },
        transactions: [{
          item_list: {
            items: [{
              name: description,
              sku: 'item',
              price: formattedAmount,
              currency: currency,
              quantity: 1
            }]
          },
          amount: {
            currency: currency,
            total: formattedAmount
          },
          description: description,
          invoice_number: transactionId 
        }]
      };

      paypal.payment.create(create_payment_json, (error, payment) => {
        if (error) {
          if (error.response && error.response.httpStatusCode === 401) {
            return reject(new Error('PayPal authentication failed. Please check your API credentials.'));
          }
          reject(error);
        } else {
          resolve(payment);
        }
      });
    });
  },

  executePayment: (paymentId, payerId) => {
    return new Promise((resolve, reject) => {
      const execute_payment_json = {
        payer_id: payerId
      };

      paypal.payment.execute(paymentId, execute_payment_json, (error, payment) => {
        if (error) {
          reject(error);
        } else {
          resolve(payment);
        }
      });
    });
  },

  getPaymentDetails: (paymentId) => {
    return new Promise((resolve, reject) => {
        paypal.payment.get(paymentId, (error, payment) => {
            if (error) {
                reject(error);
            } else {
                resolve(payment);
            }
        });
    });
  },

  // NEW: Simulated Bank Transfer Payment
  processBankTransfer: (totalAmount, currency, description, transactionId) => {
    return new Promise(resolve => {
      console.log(`Simulating Bank Transfer for ${totalAmount} ${currency} (Order: ${transactionId})`);
      // Simulate a successful payment after a small delay
      setTimeout(() => {
        resolve({ success: true, message: 'Bank transfer simulated successfully.' });
      }, 1000);
    });
  },

  // NEW: Simulated Crypto Payment
  processCryptoPayment: (totalAmount, currency, description, transactionId) => {
    return new Promise(resolve => {
      console.log(`Simulating Crypto Payment for ${totalAmount} ${currency} (Order: ${transactionId})`);
      // Simulate a successful payment after a small delay
      setTimeout(() => {
        resolve({ success: true, message: 'Crypto payment simulated successfully.' });
      }, 1000);
    });
  }
};

module.exports = paymentService;
