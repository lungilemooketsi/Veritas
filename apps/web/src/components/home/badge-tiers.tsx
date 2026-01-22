'use client';

import { motion } from 'framer-motion';
import { Award } from 'lucide-react';

const tiers = [
  {
    name: 'Bronze',
    trades: 10,
    rating: '4.0+',
    color: 'from-amber-600 to-amber-800',
    textColor: 'text-amber-900',
    bgColor: 'bg-amber-100',
    description: 'Emerging trader with a solid foundation',
    perks: ['Basic verification badge', 'Access to standard trades'],
  },
  {
    name: 'Silver',
    trades: 25,
    rating: '4.5+',
    color: 'from-gray-300 to-gray-500',
    textColor: 'text-gray-900',
    bgColor: 'bg-gray-100',
    description: 'Reliable marketplace participant',
    perks: ['Enhanced visibility', 'Priority support', 'Silver badge on profile'],
  },
  {
    name: 'Gold',
    trades: 50,
    rating: '4.8+',
    color: 'from-yellow-400 to-yellow-600',
    textColor: 'text-yellow-900',
    bgColor: 'bg-yellow-50',
    description: 'Trusted community member',
    perks: ['Featured listings', 'Reduced fees (2%)', 'Gold verification mark'],
    featured: true,
  },
  {
    name: 'Platinum',
    trades: 100,
    rating: '4.9+',
    color: 'from-gray-100 to-gray-300',
    textColor: 'text-gray-800',
    bgColor: 'bg-slate-50',
    description: 'Elite marketplace veteran',
    perks: ['VIP support', 'Lowest fees (1.5%)', 'Exclusive access', 'Platinum NFT'],
  },
  {
    name: 'Diamond',
    trades: 250,
    rating: '4.95+',
    color: 'from-cyan-200 to-blue-400',
    textColor: 'text-blue-900',
    bgColor: 'bg-cyan-50',
    description: 'Legendary status achieved',
    perks: ['Custom profile', 'Zero platform fees', 'Governance rights', 'Diamond aura'],
  },
];

export function BadgeTiersSection() {
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
            Soulbound Badge Tiers
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Your reputation is permanent. Earn non-transferable badges that prove your 
            trustworthiness to anyone in the Web3 ecosystem.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
          {tiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative rounded-xl border overflow-hidden ${
                tier.featured ? 'ring-2 ring-primary lg:-mt-4 lg:mb-4' : ''
              }`}
            >
              {tier.featured && (
                <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-xs text-center py-1">
                  Most Popular
                </div>
              )}
              
              {/* Badge Icon */}
              <div className={`p-6 bg-gradient-to-br ${tier.color} ${tier.featured ? 'pt-8' : ''}`}>
                <div className="flex justify-center">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                    <Award className="h-8 w-8 text-white" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white text-center mt-3">
                  {tier.name}
                </h3>
              </div>

              {/* Requirements */}
              <div className={`p-4 ${tier.bgColor}`}>
                <div className="grid grid-cols-2 gap-2 text-center mb-3">
                  <div>
                    <div className={`text-lg font-bold ${tier.textColor}`}>{tier.trades}+</div>
                    <div className="text-xs text-muted-foreground">Trades</div>
                  </div>
                  <div>
                    <div className={`text-lg font-bold ${tier.textColor}`}>{tier.rating}</div>
                    <div className="text-xs text-muted-foreground">Rating</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {tier.description}
                </p>
              </div>

              {/* Perks */}
              <div className="p-4 bg-card">
                <ul className="space-y-2">
                  {tier.perks.map((perk, i) => (
                    <li key={i} className="flex items-center text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>

        {/* EIP-5192 Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm">
            <Award className="h-4 w-4 mr-2 text-primary" />
            <span>
              Badges use <strong>EIP-5192</strong> – they can never be sold or transferred
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
