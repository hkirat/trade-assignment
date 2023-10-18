import { app, TICKER } from "../";
import request from "supertest";

describe("Can create a bid", () => {
  beforeAll(async () => {
    await request(app).post("/order").send({
      type: "limit",
      side: "bid",
      price: 1400.1,
      quantity: 1, userId: "1"
    });

    await request(app).post("/order").send({
      tyGpe: "limit",
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

  });

  it("Can get the right quote", async () => {
    let res = await request(app).post("/quote/").send({
      side: "bid",
      quantity: 2,
      userId: "1"
    });

    expect(res.body.quote).toBe(1400.9 * 2);
  });

});
