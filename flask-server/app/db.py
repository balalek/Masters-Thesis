# db.py
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi

# TODO remove this line after application is done
uri = "mongodb+srv://balalek2:94S1QEYE6sjzqJpQ@homequiz.vw2v2.mongodb.net/?retryWrites=true&w=majority&appName=HomeQuiz"
client = MongoClient(uri, server_api=ServerApi('1'))
db = client.quiz_db  # database name

# Test connection
try:
    client.admin.command('ping')
    print("Pinged your deployment. You successfully connected to MongoDB!")
except Exception as e:
    print(e)