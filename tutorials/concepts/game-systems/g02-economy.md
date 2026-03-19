# Economy System

## What Is It?

An economy system manages earning, spending, and balancing an in-game currency. Think of it like a bank account for your game: enemies drop gold, the player spends gold on towers or upgrades, and the system keeps track of the balance. A well-designed economy creates meaningful choices -- "Do I save for an expensive upgrade or buy two cheap ones now?"

The economy is the backbone of strategy in tower defense, city builders, and RPGs. Too much money makes the game trivial; too little makes it frustrating.

## How It Works

```
Core operations:
  earn(amount)     →  balance += amount
  spend(amount)    →  if (balance >= amount) balance -= amount; return true
  canAfford(cost)  →  return balance >= cost
  refund(amount)   →  balance += amount * refundRate  (e.g., 75%)

Balance flow:
  ┌─────────┐    kill enemy    ┌──────────┐
  │  Earn   │ ───────────────→ │ Balance  │
  └─────────┘                  └──────────┘
                                    │
  ┌─────────┐    buy tower     ┌───┴──────┐
  │  Spend  │ ←─────────────── │ Balance  │
  └─────────┘                  └──────────┘
                                    │
  ┌─────────┐    sell tower    ┌───┴──────┐
  │ Refund  │ ───────────────→ │ Balance  │
  └─────────┘                  └──────────┘

Difficulty tuning levers:
  - Starting gold
  - Gold per kill (flat, scaled, or random range)
  - Tower/upgrade costs
  - Refund percentage (50-80%)
  - Interest (bonus gold per wave based on savings)
```

## Code Example

```typescript
class EconomySystem {
  private balance: number;
  private totalEarned: number = 0;
  private totalSpent: number = 0;
  private refundRate: number;

  constructor(startingBalance: number, refundRate = 0.75) {
    this.balance = startingBalance;
    this.refundRate = refundRate;
  }

  getBalance(): number {
    return this.balance;
  }

  canAfford(cost: number): boolean {
    return this.balance >= cost;
  }

  earn(amount: number, reason?: string): void {
    this.balance += amount;
    this.totalEarned += amount;
  }

  spend(amount: number): boolean {
    if (!this.canAfford(amount)) return false;
    this.balance -= amount;
    this.totalSpent += amount;
    return true;
  }

  refund(originalCost: number): number {
    const refundAmount = Math.floor(originalCost * this.refundRate);
    this.balance += refundAmount;
    return refundAmount;
  }

  getStats() {
    return {
      balance: this.balance,
      totalEarned: this.totalEarned,
      totalSpent: this.totalSpent,
    };
  }
}

// Usage
const economy = new EconomySystem(100); // start with 100 gold
economy.earn(25);                       // enemy killed
economy.spend(80);                      // buy tower (80 gold)
economy.refund(80);                     // sell tower (get 60 back)
console.log(economy.getBalance());      // 105
```

## Used In These Games

- **Tower Defense**: Gold earned from killing enemies is spent on placing and upgrading towers. The `EconomySystem` in `src/games/tower-defense/systems/EconomySystem.ts` tracks balance and validates purchases.
- **City Builder**: Revenue from taxes and buildings funds new construction. The `EconomySystem` in `src/games/city-builder/systems/EconomySystem.ts` handles income/expense flows.
- **Snake**: Score acts as a simple economy -- eating food increases it, but there is nothing to spend it on. A shop variant could let the player buy power-ups.

## Common Pitfalls

- **Infinite money exploit**: If selling returns 100% of the cost, players can buy and sell freely to reposition without penalty. Use a refund rate below 100% (typically 50-80%).
- **Economy too generous**: If the player can afford everything easily, decisions do not matter. Track average gold-per-wave and ensure costs force trade-offs.
- **No visual feedback on transactions**: The player needs to see "+25 gold" float up when they earn and see their balance flash or animate when spending. Silent number changes are easy to miss.
- **Negative balance bugs**: Always check `canAfford()` before `spend()`. Race conditions or double-clicks can cause spending more than available if not guarded.
