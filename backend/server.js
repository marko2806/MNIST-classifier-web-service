require('dotenv').config();

const express = require('express');
const sessions = require('express-session');
const bodyParser = require('body-parser');

const {
  SageMakerRuntimeClient,
  InvokeEndpointCommand
} = require("@aws-sdk/client-sagemaker-runtime")

const app = express();
const router = express.Router();
const port = process.env.APP_PORT;

const {sequelize, Images} = require('./models/models')



// set jade as view engine for rendering pages
app.set("view engine", process.env.APP_VIEW_ENGINE);



app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(process.env.APP_STATIC_FILES_PATH,express.static('static'))

//session middleware
app.use(sessions({
  secret: process.env.SESSION_SECRET,
  saveUninitialized: true,
  cookie: {
    maxAge: process.env.COOKIE_AGE
  },
  resave: false
}));

// inject authentication routes defined in /routes/auth.js
const auth = require("./routes/auth");
app.use("/auth", auth);

let sessionChecker = (req, res, next) => {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.redirect('/auth/login');
  }
};

app.use(router);


// function for converting BLOB object to base64 string
function blobToBase64(blob) {
  return blob.toString('base64');
}

// function for retreiving mnist images and converting image data to base64 format
async function getMnistImages(take, skip){
  let images = await Images.findAll({
    order: sequelize.random(),
    limit: take,
    offset: skip
  });
  for (let image of images) {
    image.image_data = await blobToBase64(image.image_data);
  }
  return images;
}

// home page
router.get('/', sessionChecker, async (req, res) => {
  let skip = req.query.skip;
  if(!skip){
    skip = 0;
  }
  let take = req.query.take;
  if(!take){
    take = process.env.MNIST_DEFAULT_IMAGE_LIST_SIZE;
  }
  let images = await getMnistImages(take, skip);
  res.render('home',{mnistImages: images});
});


// handler for sending selected image to classification model deployed on AWS
router.post('/', sessionChecker, async (req, res) => {
  let image_url = req.body['selected-image-url']
  if(image_url){
    
    // client for accessing deployed model
    const client = new SageMakerRuntimeClient({
      region: process.env.AWS_REGION,
      credentials:{
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      },
    });
    const params = {
      EndpointName: process.env.AWS_ENDPOINT_NAME,
      Body: JSON.stringify({
        url: image_url
      }),
      Accept: 'application/json',
      ContentType: 'application/json'
    };
    const command = new InvokeEndpointCommand(params);

    // excecution of API call on AWS deployed model.
    client.send(command)
      .then(async (data) => {
        // process received data.
        let byteData = new TextDecoder().decode(data.Body);
        let results = JSON.parse(byteData);
        res.render('home', {
          results: results,
          mnistImages: await getMnistImages(process.env.MNIST_DEFAULT_IMAGE_LIST_SIZE, 0),
        });
      })
      .catch(async () => {
        res.render('home', {
          mnistImages: await getMnistImages(process.env.MNIST_DEFAULT_IMAGE_LIST_SIZE, 0),
          error: 'Something went wrong while performing classification'
        });
      });
  }
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});