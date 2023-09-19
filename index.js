const express = require('express');
const cors = require('cors');
const SSLCommerzPayment = require('sslcommerz-lts')
const jwt = require('jsonwebtoken');
const {
  MongoClient,
  ServerApiVersion,
  ObjectId
} = require('mongodb');
require('dotenv').config()
const app = express()
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000;

const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASS;
const is_live = false //true for live, false for sandbox


//middleware
app.use(cors());
app.use(express.json());


const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization
  if (!authorization) {
    return res.status(401).send({
      error: true,
      message: 'unauthorized access'
    })
  }
  //bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({
        error: true,
        message: 'unauthorized access'
      })
    }
    req.decoded = decoded
    next()
  })
}


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
    const answerCollection = client.db('RunTheStack').collection('answer')
    const paymentCollection = client.db("RunTheStack").collection("payments");
    const cartCollection = client.db("RunTheStack").collection("carts");
    const classCollection = client.db("RunTheStack").collection("class")

    // // for class

    app.get('/class', async (req, res) => {
      const result = await classCollection.find().toArray()
      res.send(result)
    })


    app.post('/class', async (req, res) => {
      const newClass = req.body
      const result = await classCollection.insertOne(newClass)
      res.send(result)

    })

    app.patch('/class/approved/:id', async (req, res) => {

      const id = req.params.id
      const filter = {
        _id: new ObjectId(id)
      }
      const updateDoc = {
        $set: {
          statusbar: 'approved'
        }
      }
      const result = await classCollection.updateOne(filter, updateDoc)
      res.send(result)

    })
    app.patch('/class/deny/:id', async (req, res) => {
      const id = req.params.id;
      const {
        feedback
      } = req.body;

      const filter = {
        _id: new ObjectId(id)
      };
      const updateDoc = {
        $set: {
          statusbar: 'deny',
          feedback: feedback
        }
      };

      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });



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


    // answer
    app.get('/answer', async (req, res) => {
      const cursor = answerCollection.find()
      const result = await cursor.toArray()
      res.send(result)
    })

    app.post('/answer', async (req, res) => {
      const newAnswer = req.body
      const result = await answerCollection.insertOne(newAnswer)
      res.send(result)
    })


    //all the user collection

    app.get('/users', async (req, res) => {
      const cursor = usersCollection.find()
      const result = await cursor.toArray()
      res.send(result)
    })
    app.get('/users/:id', async (req, res) => {
      const id = req.params.id
      console.log(id);
      const query = {
        _id: new ObjectId(id)
      }
      const result = await usersCollection.findOne(query)
      console.log(result);
      res.send(result)
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      console.log(user);
      const query = {
        email: user.email
      }
      const existingUser = await usersCollection.findOne(query)
      console.log('existingUser:', existingUser);
      if (existingUser) {
        return res.send({
          message: 'User Already Exist'
        })
      }
      const result = await usersCollection.insertOne(user)
      res.send(result)
    })




    //check instuctor
    app.get('/users/instuctor/:email', async (req, res) => {
      const email = req.params.email

      const query = {
        email: email
      }
      const user = await usersCollection.findOne(query)
      const result = {
        instuctor: user ?.role === 'instuctor'
      }
      res.send(result)
    })


    // instuctor bananor jnnw

    app.patch('/users/instuctor/:id', async (req, res) => {

      const id = req.params.id
      const filter = {
        _id: new ObjectId(id)
      }
      const updateDoc = {
        $set: {
          role: 'instuctor'
        }
      }
      const result = await usersCollection.updateOne(filter, updateDoc)
      res.send(result)

    })




    //check admin
    app.get('/users/admin/:email', async (req, res) => {
      const email = req.params.email
      const query = {
        email: email
      }
      const user = await usersCollection.findOne(query)
      const result = {
        admin: user ?.role === 'admin'
      }
      res.send(result)
    })

    // for cart collection apis
    app.get('/carts', async (req, res) => {
      const email = req.query.email
      // console.log(email);
      if (!email) {
        res.send([])
      }
      const query = {
        email: email
      }
      const result = await cartCollection.find(query).toArray()
      res.send(result)
    })




    app.post('/carts', async (req, res) => {
      const item = req.body;
      console.log(item);
      const result = await cartCollection.insertOne(item)
      res.send(result)
    })

    // for delete
    app.delete('/carts/:id', async (req, res) => {

      const id = req.params.id
      const query = {
        _id: new ObjectId(id)
      }
      const result = await cartCollection.deleteOne(query)
      res.send(result)

    })


    // create payment intent
    app.post('/create-payment-intent', async (req, res) => {
      const {
        price
      } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })


    // payment related api
    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const insertedResult = await paymentCollection.insertOne(payment);
      const query = {
        _id: {
          $in: payment.classItems.map(id => new ObjectId(id))
        }
      }
      const deleteResult = await cartCollection.deleteOne(query)

      res.send({
        insertedResult,
        deleteResult
      });
    })

    app.get('/payments', async (req, res) => {
      const result = await paymentCollection.find().toArray()
      res.send(result)
    })

    app.post('/order', async (req, res) => {
      
    })

    // admin

    app.patch('/users/admin/:id', async (req, res) => {

      const id = req.params.id
      const filter = {
        _id: new ObjectId(id)
      };
      const updateDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(filter, updateDoc)
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