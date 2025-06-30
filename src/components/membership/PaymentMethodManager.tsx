import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCreditCard,
  faPlus,
  faTrash,
  faCheckCircle,
  faSpinner,
  faExclamationCircle,
  faExternalLinkAlt,
} from "@fortawesome/free-solid-svg-icons";
import { useManagePaymentMethod } from "@/hooks/use-payment-method";

interface PaymentMethodManagerProps {
  paymentMethod: any;
  customerId: string;
  userId: string;
}

export function PaymentMethodManager({
  paymentMethod,
  customerId,
  userId,
}: PaymentMethodManagerProps) {
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [cardElement, setCardElement] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { 
    paymentMethods,
    isLoading: isLoadingMethods,
    error: methodsError,
    createSetupIntent,
    updateDefaultPaymentMethod,
    detachPaymentMethod,
    createPortalSession,
    isMutating
  } = useManagePaymentMethod(userId);

  const handleAddCard = async () => {
    setIsAddingCard(true);
    setError(null);
    
    try {
      // Load Stripe.js dynamically
      const { loadStripe } = await import('@stripe/stripe-js');
      const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
      
      if (!stripe) {
        throw new Error('Failed to load Stripe.js');
      }
      
      // Create a setup intent
      const { client_secret } = await createSetupIntent();
      
      if (!client_secret) {
        throw new Error('Failed to create setup intent');
      }
      
      // Create Elements instance
      const elements = stripe.elements();
      
      // Create card element
      const cardElement = elements.create('card');
      cardElement.mount('#card-element');
      setCardElement(cardElement);
      
      // Handle form submission
      const form = document.getElementById('payment-form');
      form?.addEventListener('submit', async (event) => {
        event.preventDefault();
        setIsLoading(true);
        
        const { error, setupIntent } = await stripe.confirmCardSetup(client_secret, {
          payment_method: {
            card: cardElement,
          },
        });
        
        if (error) {
          setError(error.message || 'An error occurred');
          setIsLoading(false);
        } else {
          // Refresh payment methods
          window.location.reload();
        }
      });
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };
  
  const handleOpenPortal = async () => {
    try {
      const { url } = await createPortalSession();
      if (url) {
        window.location.href = url;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to open billing portal');
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Payment Method */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Payment Methods
          </h3>
          
          <button
            onClick={handleOpenPortal}
            className="inline-flex items-center rounded-md border border-transparent bg-primary px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <FontAwesomeIcon icon={faExternalLinkAlt} className="mr-2 h-4 w-4" />
            Stripe Billing Portal
          </button>
        </div>

        <div className="mt-4">
          {isLoadingMethods ? (
            <div className="flex items-center justify-center py-4">
              <FontAwesomeIcon
                icon={faSpinner}
                className="mr-2 h-5 w-5 animate-spin text-primary"
              />
              <span className="text-sm text-gray-500">Loading payment methods...</span>
            </div>
          ) : methodsError ? (
            <div className="flex items-center justify-center py-4 text-sm text-red-500">
              <FontAwesomeIcon
                icon={faExclamationCircle}
                className="mr-2 h-5 w-5"
              />
              {methodsError}
            </div>
          ) : paymentMethods && paymentMethods.length > 0 ? (
            <div className="space-y-4">
              {paymentMethods.map((method: any) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="flex items-center">
                    <div className="flex h-10 w-16 items-center justify-center rounded-md border border-gray-200 bg-white">
                      <FontAwesomeIcon
                        icon={faCreditCard}
                        className="h-5 w-5 text-gray-400"
                      />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">
                        {method.brand?.toUpperCase()} •••• {method.last4}
                      </p>
                      <p className="text-xs text-gray-500">
                        Expires {method.exp_month}/{method.exp_year}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {method.is_default && (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        <FontAwesomeIcon
                          icon={faCheckCircle}
                          className="mr-1 h-3 w-3"
                        />
                        Default
                      </span>
                    )}
                    {!method.is_default && (
                      <button
                        onClick={() => updateDefaultPaymentMethod(method.id)}
                        disabled={isMutating}
                        className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        {isMutating ? (
                          <FontAwesomeIcon
                            icon={faSpinner}
                            className="mr-1 h-3 w-3 animate-spin"
                          />
                        ) : (
                          "Set Default"
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => detachPaymentMethod(method.id)}
                      disabled={isMutating}
                      className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-red-600 hover:bg-gray-50"
                    >
                      <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-4 text-sm text-gray-500">
              No payment methods found
            </div>
          )}
        </div>

        {/* Add New Card */}
        {!isAddingCard ? (
          <div className="mt-4">
            <button
              onClick={handleAddCard}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <FontAwesomeIcon icon={faPlus} className="mr-2 h-4 w-4" />
              Add Payment Method
            </button>
          </div>
        ) : (
          <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h4 className="mb-4 text-sm font-medium text-gray-900">
              Add New Payment Method
            </h4>
            <form id="payment-form" className="space-y-4">
              <div className="rounded-md border border-gray-300 bg-white p-3">
                <div id="card-element" className="h-10"></div>
              </div>
              {error && (
                <div className="text-sm text-red-600">{error}</div>
              )}
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  {isLoading ? (
                    <>
                      <FontAwesomeIcon
                        icon={faSpinner}
                        className="mr-2 h-4 w-4 animate-spin"
                      />
                      Processing...
                    </>
                  ) : (
                    "Save Card"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCard(false);
                    if (cardElement) {
                      cardElement.destroy();
                    }
                  }}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
