'use client';

import { motion } from 'framer-motion';
import { Shield, Zap, Globe, CreditCard, Award, Lock } from 'lucide-react';

const features = [
  {
    icon: CreditCard,
    title: 'Fiat to Crypto',
    description: 'Buy USDC instantly with your credit card via Stripe. No exchange account needed.',
    color: 'text-green-500',
  },
  {
    icon: Globe,
    title: 'Cross-Chain',
    description: 'Bridge assets between Polygon, Arbitrum, and Ethereum using Chainlink CCIP.',
    color: 'text-blue-500',
  },
  {
    icon: Lock,
    title: 'Secure Escrow',
    description: 'Funds locked in smart contracts until delivery confirmed. Dispute resolution built-in.',
    color: 'text-yellow-500',
  },
  {
    icon: Award,
    title: 'Soulbound Badges',
    description: 'Earn non-transferable reputation tokens. Your credibility is permanent and verifiable.',
    color: 'text-purple-500',
  },
  {
    icon: Shield,
    title: 'KYC via Stripe',
    description: 'Identity verification handled by Stripe. Trade with confidence knowing users are verified.',
    color: 'text-red-500',
  },
  {
    icon: Zap,
    title: 'Fast & Cheap',
    description: 'Sub-second finality on Polygon and Arbitrum. Near-zero gas fees for all transactions.',
    color: 'text-orange-500',
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20 bg-secondary/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything You Need to Trade with Trust
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Built for the next generation of peer-to-peer commerce, combining the best of 
            traditional finance with Web3 innovation.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="p-6 rounded-xl bg-card border hover:border-primary/50 transition-colors group"
            >
              <div className={`inline-flex p-3 rounded-lg bg-background ${feature.color} mb-4`}>
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
