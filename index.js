const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.j0hxo.mongodb.net/?retryWrites=true&w=majority`;

// MongoDB Client Configuration
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Main Function to Run Server
async function run() {
  try {
    // await client.connect();
    console.log("Connected to MongoDB successfully!");

    const database = client.db("globalVisaHubDB").collection("visas");


    // Fetch Latest 6 Visa Cards
    app.get("/latestCards", async (req, res) => {
      const visas = await database.find().sort({ _id: -1 }).limit(6).toArray();
      res.json(visas);
    });

    // Fetch All Visas
    app.get("/visas", async (req, res) => {
      const visas = await database.find().sort({ _id: -1 }).toArray();
      res.json(visas);
    });

    // Fetch Visa by ID
    app.get("/visas/id/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const visa = await database.findOne({ _id: new ObjectId(id) });
        if (!visa) {
          return res.status(404).json({ message: "Visa not found" });
        }
        res.json(visa);
      } catch (error) {
        res.status(500).json({ message: "Server error" });
      }
    });

    // Add a New Visa
    app.post("/addVisa", async (req, res) => {
      const visa = req.body;
      console.log(visa);
      try {
        if (!visa.email) {
          return res.status(400).json({ message: "Email is required" });
        }
        await database.insertOne(visa); // Save to global collection
        const userVisaCollection = client.db("userSpecific").collection(visa.email);
        await userVisaCollection.insertOne(visa); // Save to user-specific collection
        res.json({ status: "ok", message: "Visa added successfully" });
      } catch (error) {
        res.status(500).json({ message: "Failed to add visa" });
      }
    });


    // Apply for a Visa button
    app.post("/applyVisa", async (req, res) => {
      const applicationData = req.body;
      try {
        if (!applicationData.email) {
          return res.status(400).json({ message: "Email is required" });
        }
        // Save only in the user's specific collection
        const userVisaCollection = client.db("userApplicationsDB").collection(applicationData.email);
        await userVisaCollection.insertOne(applicationData); // Save to user's specific collection
        res.json({ status: "ok", message: "Visa application submitted" });
      } catch (error) {
        res.status(500).json({ message: "Failed to apply for visa" });
      }
    });

    // Get User's my Visa Applications page
    app.get("/visas/apply/email/:email", async (req, res) => {
      const { email } = req.params;
      try {
        const userVisaCollection = client.db("userApplicationsDB").collection(email);
        const applications = await userVisaCollection.find().toArray();
        if (applications.length === 0) {
          return res.status(404).json({ message: "No applications found" });
        }
        res.json(applications);
      } catch (error) {
        res.status(500).json({ message: "Server error" });
      }
    });

    //get all visas posted by a specific user my added visas page
	  app.get('/visas/:email', async(req, res) =>{
		const email = req.params.email;
		const query = { email: email};
		const result = await database.find(query).toArray();
		res.send(result);
	  })

    //my added visas page card delete
    app.delete('/visa/:id', async(req, res) =>{
      const id = req.params.id;
      const query = { _id: new ObjectId(id)}
      const result = await database.deleteOne(query);
      res.send(result);
    })

    //my added visas page card update
    app.put('/update-visa/:id', async(req, res) =>{
      const id = req.params.id;
      const visaData = req.body;
      const updated = {
        $set: visaData,
      }
      const query = { _id: new ObjectId(id)}
      const options = { upsert: true}
      const result = await database.updateOne(query, updated, options);
      console.log(result);
      res.send(result);
    })


       //delete my application page visa card
       app.delete('/deleteVisa/:id', async (req, res) => {
        const id = req.params.id;
        const email = req.query.email;
        try {
          const userVisaCollection = client.db("userApplicationsDB").collection(email);
          const query = { _id: new ObjectId(id) };
          const result = await userVisaCollection.deleteOne(query);
      
          if (result.deletedCount === 0) {
            res.status(404).json({ acknowledged: false, message: "Visa not found" });
          } else {
            res.json({ acknowledged: true, message: "Visa deleted successfully" });
          }
        } catch (error) {
          console.error(error);
          res.status(500).json({ acknowledged: false, message: "Server error" });
        }
      });




    // Confirm MongoDB Connection
    // await client.db("admin").command({ ping: 1 });
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

run().catch(console.error());

  // Root Route
  app.get("/", (req, res) => {
    res.send("Visa Navigating Server is Running!");
  });

// Start the Server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


