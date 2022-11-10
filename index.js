const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

//middle wares
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.3nhngvm.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri);
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
// jwt verify token
function verifyJWT(req, res, next) {
  const authHeader = req?.headers?.authorization;

  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  // console.log(req.headers.authorization);
  const token = authHeader?.split(" ")?.[1];
  if (token) {
    try {
      jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET,
        function (err, decoded) {
          if (err) {
            return res.status(403).send({ message: "Forbidden Access" });
          }

          req.decoded = decoded;
          next();
        }
      );
    } catch (e) {
      return res.status(401).send({ message: "Unauthorized access" });
    }
  } else {
    return res.status(401).send({ message: "Unauthorized access" });
  }
}

async function run() {
  try {
    //collections
    const serviceCollection = client
      .db("shutterBlender")
      .collection("services");
    const reviewCollection = client.db("shutterBlender").collection("reviews");

    //jwt api
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1d",
      });
      res.send({ token });
    });

    //all service api
    app.get("/services", async (req, res) => {
      let query = {};
      if (req.query.email) {
        query = {
          email: req.query.email,
        };
      }
      const limit = +req.query.limit || 0;
      const cursor = serviceCollection
        .find(query)
        .limit(limit)
        .sort({ _id: -1 });
      const services = await cursor.toArray();
      res.send(services);
    });

    //service create
    app.post("/services", async (req, res) => {
      const service = req.body;
      const result = await serviceCollection.insertOne(service);
      res.send(result);
    });
    //specific service api
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const service = await serviceCollection.findOne(query);
      res.send(service);
    });
    //all reviews
    app.get("/allReviews", async (req, res) => {
      let query = {};
      if (req.query.service) {
        query = {
          service: req.query.service,
        };
      }
      const cursor = reviewCollection
        .find(query)
        .sort({ created_at: -1, _id: -1 });
      const allReviews = await cursor.toArray();
      res.send(allReviews);
    });

    // my review api
    app.get("/reviews", verifyJWT, async (req, res) => {
      // console.log(req.headers.authorization);
      const decoded = req.decoded;
      // console.log("inside reviews api", decoded);
      if (decoded?.email !== req.query.email) {
        res.status(403).send({ message: "forbidden access" });
      }

      let query = {};
      if (req?.query?.email) {
        query = {
          email: req.query.email,
        };
      } else if (req.query.service) {
        query = {
          service: req.query.service,
        };
      }

      const cursor = reviewCollection
        .find(query)
        .sort({ created_at: -1, _id: -1 });
      const reviews = await cursor.toArray();
      res.send(reviews);
    });

    app.post("/allReviews", async (req, res) => {
      const review = req.body;
      console.log(req.body);
      review.created_at = new Date();
     try{
      const result = await reviewCollection.insertOne(review);
      res.send(result);
     }catch(e){
      res.status(500).json({message:'failed to save.'})
     }
    });
    // specific review
    app.get("/reviews/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const service = await reviewCollection.findOne(query);
      res.send(service);
    });
    //update
    app.put("/reviews/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      try {
        const result = await reviewCollection.updateOne(query, {
          $set: req.body,
        });
        res.send(result);
      } catch (error) {
        res.status(500).json(error);
      }
    });

    //DELETE
    app.delete("/reviews/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await reviewCollection.deleteOne(query);
      res.send(result);
    });
  } finally {
  }
}
run().catch((err) => console.error(err));

app.get("/", (req, res) => {
  res.send("shutter blender server is running");
});

app.listen(port, () => {
  console.log(`Shutter Blender server is running on ${port}`);
});
