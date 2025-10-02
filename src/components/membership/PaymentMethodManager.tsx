import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useManagePaymentMethod } from "@/hooks/use-payment-method";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Plus, Trash2, ExternalLink, Loader2, AlertCircle, CheckCircle2, Shield } from "lucide-react";

interface PaymentMethodManagerProps {
  paymentMethod: any;
  customerId: string; // Required: Stripe customer ID from active subscription
  userId: string; // Required: User ID for payment method operations
}

export function PaymentMethodManager({
  paymentMethod,
  customerId,
  userId,
}: PaymentMethodManagerProps) {
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [cardElement, setCardElement] = useState<any>(null);
  const [stripeElements, setStripeElements] = useState<any>(null);
  const [stripeInstance, setStripeInstance] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [setupIntentSecret, setSetupIntentSecret] = useState<string | null>(null);

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

  // Cleanup function for Stripe Elements
  React.useEffect(() => {
    return () => {
      if (cardElement) {
        cardElement.unmount();
      }
    };
  }, [cardElement]);

  const handleAddCard = async () => {
    setIsAddingCard(true);
    setError(null);

    try {
      // Validate Stripe publishable key exists
      const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      if (!publishableKey) {
        throw new Error('Stripe publishable key is not configured');
      }

      // Load Stripe.js dynamically and store the instance
      const { loadStripe } = await import('@stripe/stripe-js');
      const stripe = await loadStripe(publishableKey);

      if (!stripe) {
        throw new Error('Failed to load Stripe.js. Please check your internet connection.');
      }

      // Store the Stripe instance for later use
      setStripeInstance(stripe);

      // Create a setup intent
      const { client_secret, setup_intent_id } = await createSetupIntent();

      if (!client_secret) {
        throw new Error('Failed to create setup intent. Please try again.');
      }

      setSetupIntentSecret(client_secret);

      // Create Elements instance with styling
      const elements = stripe.elements({
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#7458FF',
          },
        },
      });

      setStripeElements(elements);

      // Create card element with enhanced configuration
      const card = elements.create('card', {
        style: {
          base: {
            fontSize: '16px',
            color: '#424770',
            '::placeholder': {
              color: '#aab7c4',
            },
          },
          invalid: {
            color: '#9e2146',
          },
        },
        hidePostalCode: false,
      });

      // Add event listeners for real-time validation
      card.on('change', (event) => {
        if (event.error) {
          setError(event.error.message);
        } else {
          setError(null);
        }
      });

      card.mount('#card-element');
      setCardElement(card);

    } catch (err: any) {
      console.error('Error setting up payment method:', err);
      setError(err.message || 'An error occurred while setting up payment method');
      setIsAddingCard(false);
    }
  };

  const handleSubmitPaymentMethod = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!cardElement || !setupIntentSecret || !stripeInstance) {
      setError('Payment form is not properly initialized');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use the SAME Stripe instance that was used to create the Element
      const { error, setupIntent } = await stripeInstance.confirmCardSetup(setupIntentSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            // Add billing details if needed
          },
        },
      });

      if (error) {
        // Handle specific error types
        if (error.type === 'card_error' || error.type === 'validation_error') {
          setError(error.message || 'Your card was declined. Please try a different card.');
        } else {
          setError('An unexpected error occurred. Please try again.');
        }
        setIsLoading(false);
      } else if (setupIntent && setupIntent.status === 'succeeded') {
        // Payment method successfully attached
        // Clean up and refresh
        if (cardElement) {
          cardElement.clear();
          cardElement.unmount();
          setCardElement(null);
        }
        setIsAddingCard(false);
        setIsLoading(false);
        setSetupIntentSecret(null);
        setStripeInstance(null);

        // Trigger a refetch of payment methods
        window.location.reload();
      } else {
        setError('Payment method setup did not complete. Please try again.');
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('Error confirming card setup:', err);
      setError(err.message || 'An unexpected error occurred');
      setIsLoading(false);
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

  const getCardIcon = (brand: string) => {
    // For now, using a generic credit card icon
    // Could expand this to show specific brand icons
    return <CreditCard className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-xl text-foreground">
                <Shield className="mr-3 h-5 w-5 text-muted-foreground" />
                Payment Methods
              </CardTitle>
              
              {/* <Button
                onClick={handleOpenPortal}
                variant="outline"
                size="sm"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Billing Portal
              </Button> */}
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">

            {isLoadingMethods ? (
              <div className="flex items-center justify-center py-8">
                <motion.div 
                  className="text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">Loading payment methods...</p>
                </motion.div>
              </div>
            ) : methodsError ? (
              <div className="flex items-center justify-center py-8">
                <motion.div 
                  className="text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <AlertCircle className="mx-auto h-6 w-6 text-red-500 dark:text-red-400" />
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{methodsError}</p>
                </motion.div>
              </div>
            ) : paymentMethods && paymentMethods.length > 0 ? (
              <div className="space-y-4">
                <AnimatePresence>
                  {paymentMethods.map((method: any, index: number) => (
                    <motion.div
                      key={method.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between rounded-xl border bg-gradient-to-r from-background/50 to-card/80 p-4 transition-all hover:shadow-sm"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-card shadow-sm">
                          {getCardIcon(method.brand)}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-foreground">
                              {method.brand?.toUpperCase()} •••• {method.last4}
                            </p>
                            <Badge variant="secondary" className="text-xs">
                              Default
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Expires {method.exp_month.toString().padStart(2, '0')}/{method.exp_year}
                          </p>
                        </div>
                      </div>
                      
                      {!method.is_default && (
                        <Button
                          onClick={() => detachPaymentMethod(method.id)}
                          disabled={isMutating}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/20 dark:hover:text-red-300"
                        >
                          {isMutating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CreditCard className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-3 text-sm font-medium text-muted-foreground">No payment methods</p>
                <p className="text-sm text-muted-foreground/70">Add a card to manage your subscription</p>
              </div>
            )}

            <Separator />

            {/* Add New Card Section */}
            <AnimatePresence>
              {!isAddingCard ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Button
                    onClick={handleAddCard}
                    variant="outline"
                    className="w-full border-dashed"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Payment Method
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="rounded-xl border bg-muted/50 p-6"
                >
                  <div className="mb-4 flex items-center space-x-2">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <h4 className="font-medium text-foreground">
                      Add New Payment Method
                    </h4>
                  </div>
                  
                  <form id="payment-form" onSubmit={handleSubmitPaymentMethod} className="space-y-4">
                    <div className="rounded-lg border bg-card p-4 shadow-sm">
                      <div id="card-element" className="h-6"></div>
                    </div>
                    
                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center space-x-2 text-sm text-red-600 dark:text-red-400"
                      >
                        <AlertCircle className="h-4 w-4" />
                        <span>{error}</span>
                      </motion.div>
                    )}
                    
                    <div className="flex space-x-3">
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Save Card
                          </>
                        )}
                      </Button>
                      
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsAddingCard(false);
                          setError(null);
                          setSetupIntentSecret(null);
                          setStripeInstance(null);
                          if (cardElement) {
                            cardElement.destroy();
                          }
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
