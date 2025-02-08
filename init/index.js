const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../model/schema.js");

const MONGO_URL = process.env.ATLAS_URI;

main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(MONGO_URL);
}

const initDB = async () => {
  await Listing.deleteMany({});
  initData.data = initData.data.map((obj) => ({
    ...obj,
    owner: "671245429239ef5355c0ea65",
  }));
  await Listing.insertMany(initData.data);
  console.log("data was initialized");
};

initDB();
