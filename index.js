const express = require('express');
const cors = require('cors');
const {
  MongoClient,
  ServerApiVersion
} = require('mongodb');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000;


//middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.d2bgkkq.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    //   await client.connect();

    const courseCollection = client.db("RunTheStack").collection("courses")
    const usersCollection = client.db("RunTheStack").collection("users")

    const questionCollection = client.db('RunTheStack').collection('question')

    // get question data from mongodb
    app.get('/question', async (req, res) => {
      const cursor = questionCollection.find()
      const result = await cursor.toArray()
      res.send(result)
    })

    app.post('/question', async (req, res) => {
      const item = req.body;
      console.log(item);
      const result = await questionCollection.insertOne(item)
      res.send(result)
    })

    //all the user collection

    app.get('/users', async (req, res) => {
      const cursor = usersCollection.find()
      const result = await cursor.toArray()
      res.send(result)
    })

    app.put('/users/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const query = {
        email: email
      }
      const options = {
        upsert: true
      }
      const updateDoc = {
        $set: user,
      }
      const result = await usersCollection.updateOne(query, updateDoc, options)
      console.log(result);
      res.send(result)
    })


    app.get('/courses', async (req, res) => {
      const cursor = courseCollection.find()
      const result = await cursor.toArray()
      res.send(result)
    })

    //save room in database
    app.post('/rooms', async (req, res) => {
      const room = req.body;
      console.log(room);
      const result = await roomsCollection.insertOne(room)
      res.send(result)
    })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({
      ping: 1
    });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);





app.get('/', (req, res) => {
  res.send('Stack Server is Running')
})

app.listen(port, () => {
  console.log(`Stack Server is running on port ${port}`);
})