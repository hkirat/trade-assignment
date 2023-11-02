import express from "express";
// import bodyParser from "body-parser";

export const app = express();
const PORT=3000
app.use(express.json());
app.use(express.urlencoded());

interface Balances {
  [key: string]: number;
}

interface User {
  id: string;
  balances: Balances;
};

interface Order {
  userId: string;
  price: number;
  quantity: number;
}

export const TICKER = 'GOOGLE';

const users: User[] = [{
  id: '1',
  balances: {
    GOOGLE: 10,
    USD: 50000,
  }
}, {
  id: '2',
  balances: {
    GOOGLE: 10,
    USD: 50000,
  }
}];

const bids: Order[] = [];
const asks: Order[] = [];

// Home route

app.get("/", (req: any,res: any) => {
  res.send(`Hello Trader`)
})

// Place a limit order
app.post("/order", (req: any, res: any) => {
  const side: 'bid' | 'ask' = req.body.side;
  const price: number = req.body.price;
  const quantity: number = req.body.quantity;
  const userId: string = req.body.userId;
  const FoK: boolean | null = req.body.FoK

  if(FoK) {
  const canFulfill = checkOrders(side,price,quantity,userId)
    if(!canFulfill) return res.json({"Error": "Cannot fulfill at current price."})
  }
  const remainingQty = fillOrders(side, price, quantity, userId);

  if (remainingQty === 0) {
    res.json({ filledQuantity: quantity });
    return;
  }
  console.log("FoK!!! this shouldnt print")
  console.log("Remaining qty:", remainingQty)
  if (side === 'bid') {
    bids.push({
      userId: userId,
      price: Number(price),
      quantity: Number(remainingQty)
    });
    bids.sort((a, b) => a.price < b.price ? -1 : 1);
  } else {
    asks.push({
      userId: userId,
      price: Number(price),
      quantity: Number(remainingQty)
    })
    asks.sort((a, b) => a.price < b.price ? 1 : -1);
  }

  console.log(asks);
  console.log(bids);

  res.json({
    filledQuantity: quantity - remainingQty,
  })
})

app.get("/depth", (req: any, res: any) => {
  const depth: {
    [price: string]: {
      type: "bid" | "ask",
      quantity: number,
    }
  } = {};

  for (let i = 0; i < asks.length; i++) {
    if (!depth[asks[i].price]) {
      depth[asks[i].price] = {
        quantity: asks[i].quantity,
        type: "ask"
      }
    } else {
      depth[asks[i].price].quantity += asks[i].quantity;
    }
  }


  for (let i = 0; i < bids.length; i++) {
    if (!depth[bids[i].price]) {
      depth[bids[i].price] = {
        quantity: bids[i].quantity,
        type: "bid"
      };
    } else {
      depth[bids[i].price].quantity += bids[i].quantity;
    }
  }

  res.json({
    depth
  })
})

app.get("/balance/:userId", (req, res) => {
  const userId = req.params.userId;
  const user = users.find(x => x.id === userId);
  if (!user) {
    return res.json({
      USD: 0,
      [TICKER]: 0
    })
  }
  res.json({ balances: user.balances });
})

app.post("/quote", (req, res) => {
  // TODO: Assignment
  // 1. User sends the amount of stocks he would like to buy/sell.
  const userId: string = req.body.userId;
  const quantity: number = req.body.quantity;
  const side: string = req.body.side;

  // 2. Check if order can be fulfilled with 1 ask/bid.
  let remainingQty = Number(quantity);
  let totalCost = 0;
  if(side === "bid") {
    for(let i = asks.length - 1; i >= 0; i--) {
  // 3. Check that buyer and seller are different users
      if(asks[i].userId === userId) {
        continue;
      }
      if(asks[i].quantity >= remainingQty) {
        totalCost += remainingQty * Number(asks[i].price);
        let averagePrice = totalCost / Number(quantity);

        res.json({"Quantity": quantity,"@averagePrice": averagePrice}) 
        return;
      } else {
  // 4. If not calculate the average price of the N stocks from M asks/bids.
        remainingQty -= Number(asks[i].quantity);
        totalCost += Number(asks[i].quantity) * Number(asks[i].price);
        continue;
      }
    }
  } else {
    for(let i = 0 ; i < bids.length; i++) {
          if(bids[i].userId === userId) {
            continue;
          }
          if(bids[i].quantity >= remainingQty) {
            totalCost += remainingQty * Number(bids[i].price);
            let averagePrice = totalCost / Number(quantity);
    
            res.json({"Quantity": quantity,"@averagePrice": averagePrice}) 
            return;
          } else {
            remainingQty -= Number(bids[i].quantity);
            totalCost += Number(bids[i].quantity) * Number(bids[i].price);
            continue;
          }
        }
  }
  res.json({"Error": "Insufficient liquidity"})
  // 5. The user will then use this price to POST order function with FoK(Fulfill or Kill).
});

function flipBalance(userId1: string, userId2: string, quantity: number, price: number) {
  let user1 = users.find((x) => x.id === userId1);
  let user2 = users.find((x) => x.id === userId2);
  // if (!user1 || !user2) {
  //   console.log("Users not found")
  //   return;
  // }

  if(!user2) {
    console.log("User 2 not found")
    return;
  }
  if(!user1) {
    console.log("User 1 not found")
    return;
  }

  user1.balances[TICKER] -= quantity;
  user2.balances[TICKER] += quantity;
  user1.balances['USD'] += (quantity * price);
  user2.balances['USD'] -= (quantity * price);
}

function fillOrders(side: string, price: number, quantity: number, userId: string): number {
  let remainingQuantity = quantity;

  if (side === "bid") {
    for (let i = asks.length - 1; i >= 0; i--) {
      if (asks[i].price > price) {
        break;
      }
      console.log("Ask qty:",asks[i].quantity);
      console.log("Order qty:",remainingQuantity);
      if (asks[i].quantity > remainingQuantity) {
        asks[i].quantity -= remainingQuantity;
        flipBalance(asks[i].userId, userId, remainingQuantity, asks[i].price);
        return 0;
      } else {
        remainingQuantity -= asks[i].quantity;
        flipBalance(asks[i].userId, userId, asks[i].quantity, asks[i].price);
        asks.pop();
      }
    }
  } else {
    for (let i = 0; i < bids.length; i++) {
      if (bids[i].price > price) {
        break;
      }
      if (bids[i].quantity > remainingQuantity) {
        bids[i].quantity -= remainingQuantity;
        flipBalance(userId, bids[i].userId, remainingQuantity, price);
        return 0;
      } else {
        remainingQuantity -= bids[i].quantity;
        flipBalance(userId, bids[i].userId, bids[i].quantity, price);
        bids.shift();
        i--;  // As the array should stay within bounds after removing from the end.
      }
    }
  }
  return remainingQuantity;
}

const checkOrders = (side: string, price: number, quantity: number, userId: string): boolean => {
  let remainingQuantity = quantity;
  if (side === "bid") {
    for (let i = asks.length - 1; i >= 0; i--) {
      if (asks[i].price > price) {
        break;
      }
      if (asks[i].quantity > remainingQuantity) {
        return true;
      } else {
        remainingQuantity -= asks[i].quantity;
        continue;
      }
    }
  } else {
    for (let i = 0; i < bids.length; i++) {
      if (bids[i].price > price) {
        break;
      }
      if (bids[i].quantity > remainingQuantity) {
        return true;
        
      } else {
        remainingQuantity -= bids[i].quantity;
        continue;
      }
    }
  }
  return false;
}

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`)
})