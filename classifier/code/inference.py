import logging
import torch
import json
from PIL import Image
import requests
import torchvision.transforms as transforms
import os
from model import resnet18
import base64
import io

logger = logging.getLogger(__name__)





def model_fn(model_dir):
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    logger.info('Loading the model.')
    model = resnet18()
    with open(os.path.join(model_dir, 'model.pt'), 'rb') as f:
        model = torch.jit.load(f, map_location=torch.device(device))
    model.eval()
    logger.info('Done loading model')
    return model


def input_fn(request_body, content_type='application/json'):
    logger.info('Deserializing the input data.')
    if content_type == 'application/json':
        input_data = json.loads(request_body)
        url = input_data['url']
        logger.info(f'Image url: {url}')
        try:
            image_data = Image.open(requests.get(url, stream=True).raw)
        except:
            image = base64.b64decode(url.split("base64,")[1]) 
            image_data = Image.open(io.BytesIO(image))
        finally:
            if image_data is None:
                raise Exception(f'Invalid request')

        image_transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Resize((28, 28)),
            transforms.Grayscale(),
            transforms.Normalize((0.1307,), (0.3081,))
        ])

        return image_transform(image_data)
    raise Exception(f'Requested unsupported ContentType in content_type {content_type}')


def predict_fn(input_data, model):
    logger.info('Generating prediction based on input parameters.')
    if torch.cuda.is_available():
        input_data = input_data.view(1, 1, 28, 28).to(device="cuda")
    else:
        input_data = input_data.view(1, 1, 28, 28)
    with torch.no_grad():
        model.eval()
        out = model(input_data)
        ps = out
    return ps


def output_fn(prediction_output, accept='application/json'):
    logger.info('Serializing the generated output.')
    classes = {0: '0', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9'}

    topk, topclass = prediction_output.topk(10, dim=1)
    result = []

    for i in range(10):
        pred = {'prediction': classes[topclass.cpu().numpy()[0][i]], 'score': f'{topk.cpu().numpy()[0][i]}'}
        logger.info(f'Adding pediction: {pred}')
        result.append(pred)

    if accept == 'application/json':
        return json.dumps(result), accept
    raise Exception(f'Requested unsupported ContentType in Accept:{accept}')


if __name__ == "__main__":
    model = model_fn("../")
    print("Model")
    input = input_fn('{"url": "https://machinelearningmastery.com/wp-content/uploads/2019/02/sample_image.png"}')
    prediction = predict_fn(input, model)
    output = output_fn(prediction)
    print(output)
