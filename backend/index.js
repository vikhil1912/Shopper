import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import userAuth from "./mongoDb/models/userAuth.js";
import mongoose, { mongo } from "mongoose";
import session from "express-session";
import passport from "passport";
import "./config/passport.js";
import MongoStore from "connect-mongo";
import { Strategy as LocalStrategy } from "passport-local";
import { Next } from "react-bootstrap/esm/PageItem.js";
import cartModel from "./mongoDb/models/cartModel.js";
import profileModel from "./mongoDb/models/userProfile.js";

const port = 3000;
const server = express();
server.use(
  session({
    secret: "TOPSECRET",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: "mongodb://127.0.0.1:27017/shopper",
      collectionName: "sessions",
    }),
    cookie: { maxAge: 24 * 60 * 60 * 1000, sameSite: "lax", secure: false },
  })
);
server.use(
  cors({
    origin: "http://localhost:4000", // Specify the frontend URL (replace with your React app's URL)
    credentials: true, // Allow credentials (cookies) to be sent
  })
);
server.use(express.json());
server.use(passport.initialize());
server.use(passport.session());
server.set("view engine", "ejs");
server.use(express.urlencoded({ extended: true }));
server.use(express.static("public"));
const saltRounds = 10;
var mydb;
async function connectDB() {
  try {
    mydb = await mongoose.connect("mongodb://127.0.0.1:27017/shopper");
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
  }
}
connectDB();

server.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

server.get("/login", (req, res) => {
  res.render("login.ejs");
});

server.get("/signup", (req, res) => {
  res.render("signup.ejs");
});

server.get("/api/auth", async (req, res) => {
  console.log(req.isAuthenticated());
  if (req.isAuthenticated()) {
    console.log(req.user.id);

    res.status(201).json({ authenticated: true, userid: req.user.id });
  } else res.status(401).json({ authenticated: false });
});

server.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    successRedirect: "http://localhost:4000/",
    failureRedirect: "/login",
  })
);

server.get("/protected", (req, res) => {
  if (req.isAuthenticated()) res.send("protected");
  else res.redirect("/login");
});

server.post(
  "/login",
  passport.authenticate("local", { successRedirect: "http://localhost:4000/" })
);

server.post("/signup", async (req, res) => {
  const user = await userAuth.findOne({ email: req.body.email });
  // console.log(user);

  if (user && user.email === req.body.email) {
    res.send("email already exists");
  } else {
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
    bcrypt.hash(password, saltRounds, async function (err, hash) {
      if (err) console.log(err.message);
      else {
        const newuser = new userAuth({
          username: username,
          email: email,
          password: hash,
        });
        await newuser.save();
        const prof = new profileModel({
          userid: newuser.id,
          imgurl: null,
          email: newuser.email,
          name: newuser.username,
        });
        prof.save();
        const userCart = new cartModel({
          userid: newuser._id,
          item: [],
          proPrice: 0,
          shipPrice: 0,
          checkPrice: 0,
        });
        await userCart.save();
        res.send("registered successfully");
      }
    });
  }
});

server.get("/logout", function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.clearCookie("connect.sid");
    console.log("loggedout");
    res.status(201).json({ message: "loggedout" });
  });
});

const isConnected = async (req, res, next) => {
  console.log(req.isAuthenticated());

  if (req.isAuthenticated()) return next();
  res.send("please login");
};

server.post("/api/store/userdata", isConnected, async (req, res) => {
  const userData = await cartModel.findOne({ userid: req.user.id });
  console.log(req.body.count);

  if (!userData) {
    var usercart = new cartModel({
      userid: req.body.userid,
      item: req.body.item,
      proPrice: req.body.proPrice,
      checkPrice: req.body.checkPrice,
      shipPrice: req.body.shipPrice,
      count: req.body.count,
    });
    console.log("hii");

    await usercart.save();
  } else {
    const x = await cartModel.updateOne(
      { userid: req.user.id },
      {
        $set: {
          userid: req.body.userid,
          item: req.body.item,
          proPrice: req.body.proPrice,
          checkPrice: req.body.checkPrice,
          shipPrice: req.body.shipPrice,
          count: req.body.count,
        },
      }
    );
    console.log(x);
  }

  console.log("user data saved successfully");
  res.status(201).json({ message: "user data saved" });
});

server.get("/api/store/userdata", async (req, res) => {
  try {
    const userData = await cartModel.findOne({ userid: req.user.id });
    console.log("user data retrieved successfully");
    console.log(userData);

    res.status(200).send(userData);
  } catch {
    console.log("error in retreiving user data");
  }
});

server.get("/api/profile", async (req, res) => {
  const userProf = await profileModel.findOne({ userid: req.user.id });
  res.status(200).json(userProf);
});

server.listen(port);
