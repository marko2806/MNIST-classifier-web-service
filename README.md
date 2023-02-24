# MNIST Image Classifier
This is a web application that allows users to log in and authenticate using Node.js and Express.js. Once logged in, users can upload an image and receive a classification result using a pre-trained ResNet-18 model. The model was trained on the MNIST dataset and deployed on AWS using SageMaker.

## Accuracy Metrics
The image classification accuracy is evaluated using four metrics: accuracy, precision, recall, and confusion matrix. These metrics are calculated for each image that is uploaded by the user and displayed along with the classification result.

### Test Set Results
The pre-trained ResNet-18 model was evaluated on a separate test set of MNIST images. The following accuracy metrics were obtained:

- Accuracy: 99.39%
- Precision: 99.39%
- Recall: 99.37%
- Confusion Matrix:

![alt text](https://github.com/marko2806/MNIST-classifier-web-service/blob/main/classifier/confusion_matrix.png?raw=true)


## Deployment
The web application and database are both dockerized for easy deployment. The image classifier was trained on Google Colab and deployed on AWS using SageMaker. The database used in this application is PostgreSQL.

## Installation
To install and run this application locally, follow these steps:

- Clone the repository to your local machine.
- Install Docker and Docker Compose.
- Navigate to the project directory in a terminal window.
- Run docker-compose up to build and start the containers.
- Navigate to http://localhost:3000 in your web browser to access the application.

## Usage
To use this application, follow these steps:

- Navigate to http://localhost:3000 in your web browser.
- Create an account or log in with an existing account.
- Upload an image to receive a classification result.
- View the accuracy metrics for the classification result.

## Links

The following links are the links which users can access directly:

- http://localhost:3000/ - Home page (Needs authentication)
- http://localhost:3000/auth/login - Login page
- http://localhost:3000/auth/register - Register page
- http://localhost:3000/auth/forgot-password - Forgot password page
- http://localhost:3000/auth/logout - Logout page

