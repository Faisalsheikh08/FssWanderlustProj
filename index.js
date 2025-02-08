// requiring all packages
if (process.env.NODE_ENV != "production") {
  require("dotenv").config();
}
// console.log(process.env.SECRETE);
const express = require("express");
const mongoose = require("mongoose");
const Listing = require("./model/schema");
const Review = require("./model/review");
const path = require("path");
const methodOverride = require("method-override");
const ejs_mate = require("ejs-mate");
const app = express();
const asyncWrap = require("./utils/asyncWrap.js");
const errorHandler = require("./utils/errorHandler.js");
const { listingSchema, reviewSchema } = require("./schema.js");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./model/user");
const {
  isLoggedIn,
  saveRedirectUrl,
  isOwner,
  isReviewAuthor,
} = require("./middleware.js");
const listingController = require("./controllers/listing.js");
const reviewController = require("./controllers/review.js");
const userController = require("./controllers/user.js");
const multer = require("multer");
const { storage } = require("./cloudConfig.js");
const upload = multer({ storage });
const Mongodb_Url = process.env.ATLAS_URI;
// setting engine and path
app.engine("ejs", ejs_mate);
app.use(methodOverride("_method"));
app.set("view engin", "ejs");
app.set("views", path.join(__dirname, "/views"));
app.use(express.static(path.join(__dirname, "/public")));
app.use(express.urlencoded({ extended: true }));
// middlewares

const store = MongoStore.create({
  mongoUrl: Mongodb_Url,
  crypto: {
    secret: process.env.SECRET,
  },
  touchAfter: 24 * 3600,
});

store.on("error", function (e) {
  console.log("session store error", e);
});

app.use(
  session({
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
    },
  })
);

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  res.locals.successMsg = req.flash("success");
  res.locals.errorMsg = req.flash("error");
  res.locals.currUser = req.user;
  next();
});

// validate listings and review
const validateListing = (req, res, next) => {
  let { error } = listingSchema.validate(req.body);
  // console.log(result);
  if (error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new errorHandler(404, errMsg);
  } else {
    next();
  }
};

const validateReview = (req, res, next) => {
  let { error } = reviewSchema.validate(req.body);
  // console.log(result);
  if (error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new errorHandler(404, errMsg);
  } else {
    next();
  }
};

// connection with db
main()
  .then(() => {
    console.log("connected with database");
  })
  .catch((err) => console.log(err));

async function main() {
  await mongoose.connect(Mongodb_Url);
}
// routes:
// fake user route
// app.get("/fakeuser", async (req, res) => {
//   let fakeUser = new User({
//     email: "student@gmail.com",
//     username: "fssBhau",
//   });
//   let registerUser = await User.register(fakeUser, "fss@123");
//   console.log(registerUser);
// });

// home route:
// app.get("/", (req, res) => {
//   res.send("I am home route");
// });
// index route
app.get("/listings", asyncWrap(listingController.index));
// creating new listing get route
app.get(
  "/listings/new",
  isLoggedIn,
  asyncWrap(listingController.renderNewForm)
);
// displaying listing in detail
app.get("/listings/:id", asyncWrap(listingController.showListings));
// creating new listing and adding database
app.post(
  "/listings",
  isLoggedIn,
  upload.single("listing[image]"),
  validateListing,
  asyncWrap(listingController.createListings)
);

// edit route for listings
app.get(
  "/listings/:id/edit",
  isLoggedIn,
  isOwner,
  asyncWrap(listingController.renderEditForm)
);
// updating edited data in data base
app.put(
  "/listings/:id",
  isLoggedIn,
  isOwner,
  upload.single("listing[image]"),
  validateListing,
  asyncWrap(listingController.updateListings)
);
// delete route
app.delete(
  "/listings/:id",
  isLoggedIn,
  isOwner,
  asyncWrap(listingController.destroyListings)
);

// for adding review in dbs
app.post(
  "/listings/:id/reviews",
  isLoggedIn,
  validateReview,
  asyncWrap(reviewController.createReview)
);

app.delete(
  "/listings/:id/reviews/:reviewId",
  isLoggedIn,
  isReviewAuthor,
  asyncWrap(reviewController.destroyReview)
);

// for user signup
app.get("/signup", userController.renderSignupForm);
app.post("/signup", asyncWrap(userController.signup));
// for user login
app.get("/login", userController.renderLoginForm);
app.post(
  "/login",
  saveRedirectUrl,
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  userController.login
);
// for user logged out
app.get("/logout", userController.logout);

// error handling middlewares
app.all("*", (req, res, next) => {
  next(new errorHandler(404, "Page not found"));
});

app.use((err, req, res, next) => {
  let { message = "some Error", status = 500 } = err;
  console.log("error encountred");
  // res.status(status).send(message);
  res.status(status).render("listings/error.ejs", { message });
});

// server started
app.listen(8081, () => {
  console.log("server is listening on 8081 ");
});
