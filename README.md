# Simple Razorpay Test Checkout

A small React + Node.js checkout demo using Razorpay test mode.

## Setup

1. Install Node.js, then run `npm install`.
2. Copy `.env.example` to `.env`.
3. Add your Razorpay **test** Key ID and Key Secret from the Razorpay Dashboard to `.env`.
4. Run `npm run dev` and open the Vite URL shown in the terminal (usually `http://localhost:5173`).

The project uses Rollup's WebAssembly build so Vite can run in environments where Windows blocks native Node.js modules.

The product page offers three demo options. The server owns the product prices, creates orders through `POST /api/create-order`, and verifies payment signatures through `POST /api/verify-payment`; the Key Secret is never sent to the browser. Checkout requests a UPI block and retains Razorpay's default payment-method blocks. Which payment methods are available is controlled by the methods enabled for your Razorpay account and test mode; enable UPI and other desired methods in the Razorpay Dashboard if they do not appear. Use Razorpay's test payment details in Checkout.

## Host a demo on Render

This repository includes a `render.yaml` Blueprint. To deploy:

1. Push the project to a GitHub repository. Do not commit `.env`; it is ignored by `.gitignore`.
2. In Render, choose **New → Blueprint**, connect the repository, and deploy the `simple-payment-demo` web service.
3. In the service's **Environment** settings, add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` using newly generated Razorpay **test-mode** credentials. Keep the secret in Render only, never in frontend variables.
4. Open the Render URL and test the product selection and Razorpay test checkout. Free services may take a little time to wake up after inactivity.

The Express server serves the Vite production build and the `/api` endpoints from the same origin. Render supplies the `PORT` environment variable automatically.

## Production note

This is a demo, not a production payment implementation. For production, also validate payment status with Razorpay's API or webhooks and add appropriate order persistence, authentication, and error monitoring. Never expose the Key Secret in frontend code.
