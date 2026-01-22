'use client';

import { motion } from 'framer-motion';
import { UserPlus, CreditCard, ShoppingBag, Lock, CheckCircle, Award } from 'lucide-react';

const steps = [
  {
    icon: UserPlus,
    number: '01',
    title: 'Connect Wallet',
    description: 'Connect your MetaMask, WalletConnect, or Coinbase wallet to get started.',
  },
  {
    icon: CreditCard,
    number: '02',
    title: 'Fund Your Wallet',
    description: 'Buy USDC with your credit card through our secure Stripe integration.',
  },
  {
    icon: ShoppingBag,
    number: '03',
    title: 'Create or Accept Trade',
    description: 'Browse listings or create your own. Funds are locked in smart contract escrow.',
  },
  {
    icon: Lock,
    number: '04',
    title: 'Deliver & Confirm',
    description: 'Seller delivers goods/services. Buyer confirms receipt to release funds.',
  },
  {
    icon: CheckCircle,
    number: '05',
    title: 'Rate Each Other',
    description: 'Both parties rate the transaction. Ratings are stored on-chain forever.',
  },
  {
    icon: Award,
    number: '06',
    title: 'Earn Your Badge',
    description: 'Hit milestones to automatically receive soulbound reputation badges.',
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-20">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How It Works
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            From wallet connection to earning your first badge, 
            the process is simple and secure.
          </p>
        </motion.div>

        <div className="relative">
          {/* Connection line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/20 via-primary to-primary/20 -translate-y-1/2 z-0" />

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative"
              >
                <div className="bg-card rounded-xl p-6 border relative z-10 h-full">
                  {/* Step number */}
                  <div className="absolute -top-4 left-6 bg-primary text-primary-foreground text-sm font-bold px-3 py-1 rounded-full">
                    {step.number}
                  </div>
                  
                  <div className="pt-4">
                    <div className="inline-flex p-3 rounded-lg bg-primary/10 text-primary mb-4">
                      <step.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
