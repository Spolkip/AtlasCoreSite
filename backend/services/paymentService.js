// backend/services/paymentService.js (UPDATED)
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
  }
};

module.exports = paymentService;
