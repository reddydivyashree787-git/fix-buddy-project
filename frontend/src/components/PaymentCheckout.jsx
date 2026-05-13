import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ChevronRight, AlertCircle, Check, Lock } from 'lucide-react';
import API from '../api';

// Razorpay Checkout Form
const RazorpayCheckoutForm = ({ razorpayData, onPaymentSuccess, onPaymentError }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const razorpayContainerRef = useRef(null);
  const razorpayInstanceRef = useRef(null);

  useEffect(() => {
    if (!razorpayData?.razorpay_order_id || !razorpayData?.key_id) {
      return;
    }

    // Load Razorpay SDK
    const loadRazorpay = () => {
      return new Promise((resolve, reject) => {
        if (window.Razorpay) {
          resolve(window.Razorpay);
          return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(window.Razorpay);
        script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
        document.body.appendChild(script);
      });
    };

    const initRazorpay = async () => {
      try {
        const Razorpay = await loadRazorpay();
        
        const options = {
          key: razorpayData.key_id,
          name: 'HomeServices',
          description: 'Payment for booking',
          order_id: razorpayData.razorpay_order_id,
          amount: Math.round(razorpayData.amount * 100), // Amount in paise
          currency: 'INR',
          prefill: {
            name: razorpayData.customer_name || '',
            email: razorpayData.customer_email || '',
            contact: razorpayData.customer_phone || '',
          },
          theme: {
            color: '#2563eb',
          },
          handler: (response) => {
            // Payment successful
            verifyPayment(response.razorpay_payment_id, response.razorpay_signature);
          },
        };

        razorpayInstanceRef.current = new Razorpay(options);
        
        // Don't auto-open, let user click the pay button
      } catch (error) {
        console.error('Error initializing Razorpay:', error);
        setErrorMessage('Failed to load payment gateway. Please try again.');
      }
    };

    initRazorpay();

    return () => {
      if (razorpayInstanceRef.current) {
        razorpayInstanceRef.current.close();
      }
    };
  }, [razorpayData]);

  const handlePayClick = () => {
    if (razorpayInstanceRef.current) {
      razorpayInstanceRef.current.open();
    } else {
      setErrorMessage('Payment gateway is not initialized. Please ensure your Razorpay keys are configured.');
    }
  };

  const verifyPayment = (paymentId, signature) => {
    API.post('/payments/payments/verify-payment/', {
      razorpay_order_id: razorpayData.razorpay_order_id,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    })
      .then((response) => {
        setIsProcessing(false);
        if (onPaymentSuccess) {
          onPaymentSuccess(response.data);
        }
      })
      .catch((error) => {
        setIsProcessing(false);
        const errorMsg = error.response?.data?.error || 'Payment verification failed';
        setErrorMessage(errorMsg);
        if (onPaymentError) {
          onPaymentError(errorMsg);
        }
      });
  };

  return (
    <div className="border-t border-slate-200 pt-6">
      <h3 className="font-semibold text-slate-900 mb-4">Payment Method</h3>
      
      {errorMessage && (
        <div className="bg-rose-50 rounded-lg p-3 border border-rose-200 mt-4 flex gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <div className="text-sm text-rose-900">{errorMessage}</div>
        </div>
      )}
      
      <button
        onClick={handlePayClick}
        disabled={isProcessing}
        className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-2xl hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Processing...
          </>
        ) : (
          <>
            <Lock className="w-4 h-4" />
            Pay ₹{parseFloat(razorpayData.amount).toFixed(2)} securely
          </>
        )}
      </button>
    </div>
  );
};


const PaymentCheckout = ({ bookingId, onPaymentSuccess, onPaymentError }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [razorpayData, setRazorpayData] = useState(null);

  // Fetch booking details
  const { data: bookingData } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => API.get(`/bookings/${bookingId}/`),
    enabled: !!bookingId,
  });

  const booking = bookingData?.data;

  // Initiate payment mutation - creates Razorpay order
  const initiatePaymentMutation = useMutation({
    mutationFn: (bookingId) =>
      API.post('/payments/payments/initiate-payment/', { booking_id: bookingId }),
    onSuccess: (response) => {
      const data = response.data;
      // Add customer info for prefill
      const enrichedData = {
        ...data,
        customer_name: booking?.customer?.full_name || booking?.customer?.first_name || '',
        customer_email: booking?.customer?.email || '',
        customer_phone: booking?.customer?.phone || '',
      };
      setRazorpayData(enrichedData);
      setLoading(false);
    },
    onError: (error) => {
      setLoading(false);
      const errorMessage = error.response?.data?.error || 'Failed to initiate payment';
      setError(errorMessage);
      if (onPaymentError) onPaymentError(errorMessage);
    },
  });

  const handleInitiatePayment = () => {
    setError(null);
    setLoading(true);
    initiatePaymentMutation.mutate(bookingId);
  };

  if (!booking) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-200 rounded w-3/4"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const amount = parseFloat(booking.final_price || booking.quoted_price) || 0;
  const platformFee = Math.round(amount * 0.15 * 100) / 100; // 15% commission example
  const totalAmount = amount;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
        <h2 className="text-xl font-bold text-slate-900">Payment Summary</h2>
        <p className="text-sm text-slate-500 mt-1">Review and confirm your payment details</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Service Details */}
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
          <h3 className="font-semibold text-slate-900 mb-3">Service Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Service:</span>
              <span className="font-medium text-slate-900">{booking.subcategory?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Provider:</span>
              <span className="font-medium text-slate-900">{booking.provider?.user?.full_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Date & Time:</span>
              <span className="font-medium text-slate-900">
                {new Date(booking.booking_date).toLocaleDateString()} at {booking.booking_time}
              </span>
            </div>
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200">
          <h3 className="font-semibold text-slate-900 mb-3">Price Breakdown</h3>
          <div className="space-y-2 text-sm mb-3">
            <div className="flex justify-between">
              <span className="text-slate-600">Service Amount:</span>
              <span className="font-medium text-slate-900">₹{parseFloat(amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-amber-700">
              <span>Platform Fee (15%):</span>
              <span className="font-medium">₹{platformFee.toFixed(2)}</span>
            </div>
          </div>
          <div className="border-t border-emerald-200 pt-3 flex justify-between">
            <span className="font-semibold text-slate-900">Total Amount:</span>
            <span className="text-lg font-bold text-emerald-700">₹{totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-rose-50 rounded-2xl p-4 border border-rose-200 flex gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-rose-900">{error}</div>
          </div>
        )}

        {/* Action Buttons or Razorpay Checkout */}
        {!razorpayData ? (
          <button
            onClick={handleInitiatePayment}
            disabled={loading}
            className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-2xl hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Initializing...
              </>
            ) : (
              <>
                Proceed to Secure Payment
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        ) : (
          <RazorpayCheckoutForm 
            razorpayData={razorpayData} 
            onPaymentSuccess={onPaymentSuccess} 
            onPaymentError={onPaymentError} 
          />
        )}

        {/* Trust Badges */}
        <div className="flex justify-center gap-4 pt-4 border-t border-slate-200">
          <div className="text-center">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Lock className="w-4 h-4 text-slate-600" />
            </div>
            <span className="text-xs text-slate-600">Secure Payment</span>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
              ✓
            </div>
            <span className="text-xs text-slate-600">Verified Provider</span>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
              💬
            </div>
            <span className="text-xs text-slate-600">24/7 Support</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentCheckout;
