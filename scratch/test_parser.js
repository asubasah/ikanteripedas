const { parseWebhook } = require('./src/lib/waUtils/waParser');

const gowaPayload = {
  "event": "message",
  "device_id": "628123456789@s.whatsapp.net",
  "payload": {
    "id": "3EB0C0A6B4B8F8D7E9F1",
    "from": "628987654321@s.whatsapp.net",
    "pushName": "John Doe",
    "from_me": false,
    "message": {
      "conversation": "Hello GoWA"
    }
  }
};

const wahaPayload = {
  "event": "message",
  "session": "default",
  "payload": {
    "id": "WAHA-123",
    "from": "628555555555@c.us",
    "body": "Hello WAHA",
    "fromMe": false,
    "pushName": "Jane Doe"
  }
};

async function test() {
  console.log("Testing GoWA Payload...");
  const resGowa = await parseWebhook(gowaPayload);
  console.log(JSON.stringify(resGowa, null, 2));

  console.log("\nTesting WAHA Payload...");
  const resWaha = await parseWebhook(wahaPayload);
  console.log(JSON.stringify(resWaha, null, 2));
}

// Mocking fetch and process.env for the test script
global.fetch = () => Promise.resolve({ ok: false, text: () => Promise.resolve("") });
process.env.WAHA_URL = "http://mock";
process.env.GOWA_URL = "http://mock";

test();
