const express = require('express');
const stripe = require('stripe')("sk_test_51MywnDKL9hIJ3aoFj7ufDEeOXDySBcUCVviuJrMiZ4YlpFH2rEuaum37o3LJtzMmObURLMXa7czeinuY7hGYboLe00i8MtuDVa")
const { getFirestore, doc, setDoc } = require('firebase/firestore');
const { initializeApp } = require('firebase/app');
require('firebase/firestore');
const firebaseConfig = {
  apiKey: "AIzaSyD0swxWtYTjVQH33wzr0YMeewl6j_Omppc",
  authDomain: "term-project-371.firebaseapp.com",
  projectId: "term-project-371",
  storageBucket: "term-project-371.appspot.com",
  messagingSenderId: "986762358488",
  appId: "1:986762358488:web:49486344fd130afd8eb1ad",
  measurementId: "G-2B4LVY46VX"
};

initializeApp(firebaseConfig);
const db = getFirestore();
const app = express();
app.use(
  express.json({
    verify: function (req, res, buf) {
      if (req.originalUrl.startsWith('/webhook')) {
        req.rawBody = buf.toString();
      }
    },
  })
);

app.post('/webhook', async (req, res) => {
  let data;
  let eventType;
  // Check if webhook signing is configured.
  const webhookSecret = 'whsec_YeG8LEnXXApFv4W7B1fm3hoBhu3b9Hyo';

  if (webhookSecret) {
    // Retrieve the event by verifying the signature using the raw body and secret.
    let event;
    let signature = req.headers['stripe-signature'];

    try {
      event = stripe.webhooks.constructEvent(
        req['rawBody'],
        signature,
        webhookSecret
      );
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed.`);
      return res.sendStatus(400);
    }
    // Extract the object from the event.
    data = event.data;
    eventType = event.type;
  } else {
    // Webhook signing is recommended, but if the secret is not configured in `config.js`,
    // retrieve the event data directly from the request body.
    data = req.body.data;
    eventType = req.body.type;
  }

  switch (eventType) {
    case 'checkout.session.completed':
        const session = data.object;
        console.log(session);
        const docRef = doc(db,"orders",session.id);
        const date = new Date(session.created*1000);
        const pay_method = await stripe.paymentIntents.retrieve(session.payment_intent);
        const pay = await stripe.paymentMethods.retrieve(pay_method.payment_method);
        const items = await stripe.checkout.sessions.listLineItems(session.id);
        var cart = [];
        items.data.forEach((item) => {
            cart.push({ name: item.description, quantity: item.quantity });
        });
        await setDoc(docRef, {
    total: session.amount_total,
    subtotal: session.amount_subtotal,
    currency: session.currency,
    status: session.payment_status,
    email: session.customer_details.email,
    billing: session.customer_details.address,
    shipping: session.shipping_details,
    name: session.customer_details.name,
    userId: session.customer,
    date: date.toDateString(),
    last4: pay.card.last4,
    brand: pay.card.brand,
    item: cart,
  });
        break;
    default:


  }
   res.sendStatus(200);

});

app.listen(process.env.PORT || 4000, () => console.log('Server is running on port 4000'));
