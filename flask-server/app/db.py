# db.py
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
import os

uri = os.getenv('MONGODB_URI')
if not uri:
    raise ValueError("MONGODB_URI environment variable is not set")

client = MongoClient(uri, server_api=ServerApi('1'))
db = client.quiz_db

# Test connection
try:
    client.admin.command('ping')
    print("Pinged your deployment. You successfully connected to MongoDB!")
except Exception as e:
    print(e)