import { app, TICKER } from "../";
import request from "supertest";

describe("Basic tests", () => {

  it("verify initial balances", async () => {
    let res = await request(app).get("/balance/1").send();
    expect(res.body.balances[TICKER]).toBe(10);
    res = await request(app).get("/balance/2").send();
    expect(res.body.balances[TICKER]).toBe(10);
  })

  it("Can create tests", async () => {
    await request(app).post("/order").send({
      type: "limit",
      side: "bid",
      price: 1400.1,
      quantity: 1,
      userId: "1"
    });

    await request(app).post("/order").send({
      type: "limit",
      side: "ask",
      price: 1400.9,
      quantity: 10,
      userId: "2"
    });

    await request(app).post("/order").send({
      type: "limit",
      side: "ask",
      price: 1501,
      quantity: 5,
      userId: "2"
    })
    let res = await request(app).get("/depth").send();
    expect(res.status).toBe(200);
    expect(res.body.depth["1501"].quantity).toBe(5);
  });

  it("ensures balances are still the same", async () => {
    let res = await request(app).get("/balance/1").send();
    expect(res.body.balances[TICKER]).toBe(10);
  })

  it("Places an order that fills", async () => {
    let res = await request(app).post("/order").send({
      type: "limit",
      side: "bid",
      price: 1502,
      quantity: 2,
      userId: "1"
    })
    expect(res.body.filledQuantity).toBe(2);
  });

  it("Ensures orderbook updates", async () => {
    let res = await request(app).get("/depth").send();
    expect(res.body.depth["1400.9"]?.quantity).toBe(8);
  })

  it("Ensures balances update", async () => {
    let res = await request(app).get("/balance/1").send();
    expect(res.body.balances[TICKER]).toBe(12);
    expect(res.body.balances["USD"]).toBe(50000 - 2 * 1400.9);

    res = await request(app).get("/balance/2").send();
    expect(res.body.balances[TICKER]).toBe(8);
    expect(res.body.balances["USD"]).toBe(50000 + 2 * 1400.9);
  })

})

