import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Razorpay from "razorpay";

const app = express();
const port = Number(process.env.PORT) || 5000;
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const currency = "INR";
const products = [
  {
    id: "starter",
    name: "Starter Pack",
    description: "A simple option to get started.",
    amount: 19900,
  },
  {
    id: "everyday",
    name: "Everyday Essentials",
    description: "A little more for everyday use.",
    amount: 49900,
  },
  {
    id: "complete",
    name: "Complete Bundle",
    description: "The full bundle at the best value.",
    amount: 99900,
  },
];

app.use(express.json());

function getRazorpay() {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay test credentials are not configured.");
  }

  return new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });
}

app.get("/api/config", (req, res) => {
  if (!process.env.RAZORPAY_KEY_ID) {
    return res.status(503).json({ error: "Razorpay test credentials are not configured." });
  }
  res.json({ keyId: process.env.RAZORPAY_KEY_ID });
});

app.get("/api/products", (req, res) => {
  res.json(
    products.map(({ id, name, description, amount }) => ({
      id,
      name,
      description,
      amount,
      currency,
    })),
  );
});

app.post("/api/create-order", async (req, res) => {
  const product = products.find(({ id }) => id === req.body?.productId);
  if (!product) {
    return res.status(400).json({ error: "Select a valid product before checkout." });
  }
  if (!Number.isInteger(product.amount) || product.amount < 100) {
    return res.status(400).json({ error: "The payment amount must be at least 100 paise." });
  }

  try {
    const order = await getRazorpay().orders.create({
      amount: product.amount,
      currency,
      receipt: `demo_${Date.now()}`,
      notes: { productId: product.id },
    });

    res.status(201).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
      },
    });
  } catch (error) {
    const statusCode = error?.statusCode === 401 ? 401 : 500;
    console.error("Could not create Razorpay order:", error?.error?.description || error?.message || "Unknown error");
    res.status(statusCode).json({
      error: statusCode === 401
        ? "Razorpay authentication failed. Check your test credentials."
        : "Could not create a payment order. Check your credentials and try again.",
    });
  }
});

app.post("/api/verify-payment", (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body ?? {};
  if (
    typeof razorpay_order_id !== "string" ||
    typeof razorpay_payment_id !== "string" ||
    typeof razorpay_signature !== "string"
  ) {
    return res.status(400).json({ error: "Payment verification details are incomplete." });
  }

  try {
    const { RAZORPAY_KEY_SECRET } = process.env;
    if (!RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay test credentials are not configured.");
    }

    const expectedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
    const expected = Buffer.from(expectedSignature, "hex");
    const received = Buffer.from(razorpay_signature, "hex");

    if (
      expected.length !== received.length ||
      !crypto.timingSafeEqual(expected, received)
    ) {
      return res.status(400).json({ error: "Payment signature is invalid." });
    }

    res.json({ verified: true, paymentId: razorpay_payment_id });
  } catch (error) {
    console.error("Could not verify Razorpay payment:", error.message);
    res.status(500).json({ error: "Payment verification could not be completed." });
  }
});

app.use("/api", (req, res) => {
  res.status(404).json({ error: "API endpoint not found." });
});

app.use(express.static(path.join(projectRoot, "dist")));
app.get("*", (req, res, next) => {
  res.sendFile(path.join(projectRoot, "dist", "index.html"), (error) => {
    if (error) next(error);
  });
});

app.listen(port, () => {
  console.log(`Payment API listening on http://localhost:${port}`);
});
