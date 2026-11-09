import { useEffect, useState } from "react";

async function readResponse(response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Something went wrong. Please try again.");
  }
  return data;
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [page, setPage] = useState("products");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const selectedProduct = products.find(({ id }) => id === selectedProductId);

  useEffect(() => {
    let active = true;
    fetch("/api/products")
      .then(readResponse)
      .then((availableProducts) => {
        if (active) {
          setProducts(availableProducts);
          setSelectedProductId(availableProducts[0]?.id ?? "");
        }
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      });

    return () => {
      active = false;
    };
  }, []);

  async function startPayment() {
    if (!selectedProduct) {
      setError("Select a product before continuing.");
      return;
    }

    setLoading(true);
    setError("");
    setStatus("");

    try {
      if (!window.Razorpay) {
        throw new Error("Razorpay Checkout could not be loaded. Check your internet connection.");
      }

      const [config, order] = await Promise.all([
        fetch("/api/config").then(readResponse),
        fetch("/api/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: selectedProduct.id }),
        }).then(readResponse),
      ]);

      const checkout = new window.Razorpay({
        key: config.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Simple Payment",
        description: order.product.name,
        order_id: order.order_id,
        config: {
          display: {
            blocks: {
              upi: {
                name: "Pay using UPI",
                instruments: [{ method: "upi" }],
              },
            },
            sequence: ["block.upi"],
            preferences: { show_default_blocks: true },
          },
        },
        handler: async (payment) => {
          setLoading(true);
          try {
            await readResponse(
              await fetch("/api/verify-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payment),
              }),
            );
            setStatus(`Payment verified. Payment ID: ${payment.razorpay_payment_id}`);
          } catch (verificationError) {
            setError(verificationError.message);
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
        theme: { color: "#3157d5" },
      });

      checkout.on("payment.failed", (payment) => {
        setError(payment.error?.description || "Payment failed. Please try again.");
        setLoading(false);
      });
      checkout.open();
    } catch (paymentError) {
      setError(paymentError.message);
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <section className={page === "products" ? "catalog-card" : "checkout-card"} aria-labelledby="page-title">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span>simplepay</span>
        </div>

        {page === "products" ? (
          <>
            <div className="intro">
              <p className="eyebrow">PICK YOUR PLAN</p>
              <h1 id="page-title">Choose what works for you</h1>
              <p className="subheading">Select an option to see your order before checkout.</p>
            </div>

            {products.length > 0 ? (
              <div className="product-grid">
                {products.map((product, index) => (
                  <button
                    className={`product-option${selectedProductId === product.id ? " selected" : ""}`}
                    type="button"
                    key={product.id}
                    aria-pressed={selectedProductId === product.id}
                    onClick={() => {
                      setSelectedProductId(product.id);
                      setError("");
                    }}
                  >
                    <span className="option-number">0{index + 1}</span>
                    <span className="option-name">{product.name}</span>
                    <span className="option-description">{product.description}</span>
                    <strong className="option-price">
                      ₹{(product.amount / 100).toLocaleString("en-IN")}
                    </strong>
                    <span className="option-choice">
                      {selectedProductId === product.id ? "Selected" : "Select"}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="subheading">{error ? "Products could not be loaded." : "Loading products..."}</p>
            )}

            <button
              className="pay-button continue-button"
              type="button"
              disabled={!selectedProduct || loading}
              onClick={() => {
                setError("");
                setPage("checkout");
              }}
            >
              Continue with {selectedProduct?.name ?? "selected option"}
              <span aria-hidden="true">→</span>
            </button>
          </>
        ) : (
          <>
            <button className="back-button" type="button" onClick={() => setPage("products")}>
              <span aria-hidden="true">←</span> Change product
            </button>
            <div className="intro">
              <p className="eyebrow">SECURE CHECKOUT</p>
              <h1 id="page-title">Complete your payment</h1>
              <p className="subheading">Review your order and continue to Razorpay.</p>
            </div>

            <div className="order">
              <div className="product-icon" aria-hidden="true">✦</div>
              <div className="product-info">
                <h2>{selectedProduct?.name}</h2>
                <p>{selectedProduct?.description}</p>
              </div>
              <strong>₹{((selectedProduct?.amount ?? 0) / 100).toLocaleString("en-IN")}</strong>
            </div>

            <div className="total">
              <span>Total payable</span>
              <strong>₹{((selectedProduct?.amount ?? 0) / 100).toLocaleString("en-IN")}</strong>
            </div>

            <button className="pay-button" type="button" onClick={startPayment} disabled={loading}>
              {loading
                ? "Processing..."
                : `Pay ₹${((selectedProduct?.amount ?? 0) / 100).toLocaleString("en-IN")}`}
              {!loading && <span aria-hidden="true">→</span>}
            </button>

            {error && <p className="message error" role="alert">{error}</p>}
            {status && <p className="message success" role="status">{status}</p>}

            <div className="secure-note">
              <span aria-hidden="true">▣</span>
              <span>Test mode · No real payment will be charged</span>
            </div>
          </>
        )}
      </section>
      {page === "checkout" && <footer>Payments securely processed by Razorpay</footer>}
    </main>
  );
}
